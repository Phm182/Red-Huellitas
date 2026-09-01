<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para postularte', 403);
}

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
$respuestasInput = $_POST['respuestas'] ?? [];

if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}
if (!is_array($respuestasInput)) {
    json_error('Formato de respuestas inválido');
}

$stmt = $conn->prepare("SELECT UserId, Nombre FROM Adopcion WHERE AdopcionId = ? AND Estado = 'A'");
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion) {
    json_error('Publicación de adopción no encontrada', 404);
}
if ((int) $adopcion['UserId'] === $userId) {
    json_error('No podés postularte a tu propia publicación');
}

$stmt = $conn->prepare('SELECT AdopcionPostulacionId FROM AdopcionPostulacion WHERE AdopcionId = ? AND UserId = ?');
$stmt->bind_param('ii', $adopcionId, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya te postulaste a esta publicación', 409);
}
$stmt->close();

// Traer las preguntas del listado (con sus opciones válidas) para validar las respuestas.
$stmt = $conn->prepare('SELECT AdopcionPreguntaId, Tipo FROM AdopcionPregunta WHERE AdopcionId = ?');
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$result = $stmt->get_result();
$preguntas = [];
while ($row = $result->fetch_assoc()) {
    $preguntas[(int) $row['AdopcionPreguntaId']] = $row['Tipo'];
}
$stmt->close();

$respuestasPorPregunta = [];
foreach ($respuestasInput as $r) {
    $preguntaId = (int) ($r['preguntaId'] ?? 0);
    if ($preguntaId > 0) {
        $respuestasPorPregunta[$preguntaId] = $r;
    }
}

$respuestasValidadas = [];
foreach ($preguntas as $preguntaId => $tipo) {
    $r = $respuestasPorPregunta[$preguntaId] ?? null;
    if ($r === null) {
        json_error("Falta responder una de las preguntas del formulario");
    }

    if ($tipo === 'texto') {
        $texto = trim((string) ($r['texto'] ?? ''));
        if ($texto === '') {
            json_error('Una de las respuestas de texto está vacía');
        }
        $respuestasValidadas[] = ['preguntaId' => $preguntaId, 'texto' => $texto, 'opcionId' => null];
    } elseif ($tipo === 'si_no') {
        $texto = $r['texto'] ?? '';
        if (!in_array($texto, ['si', 'no'], true)) {
            json_error("Una respuesta de sí/no debe ser 'si' o 'no'");
        }
        $respuestasValidadas[] = ['preguntaId' => $preguntaId, 'texto' => $texto, 'opcionId' => null];
    } else { // opcion_multiple
        $opcionId = (int) ($r['opcionId'] ?? 0);
        if ($opcionId <= 0) {
            json_error('Falta elegir una opción en una de las preguntas');
        }
        $stmt = $conn->prepare('SELECT AdopcionPreguntaOpcionId FROM AdopcionPreguntaOpcion WHERE AdopcionPreguntaOpcionId = ? AND AdopcionPreguntaId = ?');
        $stmt->bind_param('ii', $opcionId, $preguntaId);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) {
            $stmt->close();
            json_error('La opción elegida no corresponde a esa pregunta');
        }
        $stmt->close();
        $respuestasValidadas[] = ['preguntaId' => $preguntaId, 'texto' => null, 'opcionId' => $opcionId];
    }
}

$stmt = $conn->prepare('INSERT INTO AdopcionPostulacion (AdopcionId, UserId) VALUES (?, ?)');
$stmt->bind_param('ii', $adopcionId, $userId);
$stmt->execute();
$postulacionId = (int) $stmt->insert_id;
$stmt->close();

foreach ($respuestasValidadas as $r) {
    $stmt = $conn->prepare(
        'INSERT INTO AdopcionRespuesta (AdopcionPostulacionId, AdopcionPreguntaId, RespuestaTexto, AdopcionPreguntaOpcionId)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('iisi', $postulacionId, $r['preguntaId'], $r['texto'], $r['opcionId']);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$yo = $stmt->get_result()->fetch_assoc();
$stmt->close();
$nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

rh_notificar(
    $conn,
    [(int) $adopcion['UserId']],
    'adopcion_postulacion',
    'Nueva postulación',
    "$nombreYo se postuló para adoptar a {$adopcion['Nombre']}",
    '/(app)/adopcion/' . $adopcionId . '/postulaciones',
    ['actorUserId' => $userId]
);

json_success(['adopcionPostulacionId' => $postulacionId], 'Postulación enviada', 201);
