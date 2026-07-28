<?php
/**
 * Inscripción a una campaña.
 *
 * Tres cosas que antes no hacía: valida el formulario que armó quien organiza,
 * y si el cupo está lleno **no rechaza** sino que anota en lista de espera —
 * decirle "no hay lugar" a alguien que igual iría es perder gente que después
 * entra cuando otro se da de baja.
 *
 * `respuestas` viaja como JSON:
 *   [{ "campaniaPreguntaId": 3, "texto": "..." },
 *    { "campaniaPreguntaId": 4, "campaniaPreguntaOpcionId": 9 }]
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania.php';
require_once __DIR__ . '/../../funciones/campania_inscripcion.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_POST['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare("SELECT * FROM Campania WHERE CampaniaId = ? AND Estado = 'A'");
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}
if ((int) $campania['RequiereInscripcion'] !== 1) {
    json_error('Esta campaña no requiere inscripción previa');
}
if ((int) $campania['UserId'] === $userId) {
    json_error('Sos quien organiza esta campaña', 400);
}

// Una inscripción cancelada no bloquea: la persona se puede volver a anotar,
// pero entra con posición nueva (perdió su lugar en la fila al darse de baja).
$stmt = $conn->prepare(
    "SELECT CampaniaInscripcionId, Estado FROM CampaniaInscripcion
     WHERE CampaniaId = ? AND UserId = ? AND Estado <> 'cancelada'"
);
$stmt->bind_param('ii', $campaniaId, $userId);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya estás inscripto en esta campaña', 409);
}
$stmt->close();

// --- Validar el formulario -------------------------------------------------
$preguntas = rh_campania_preguntas($conn, $campaniaId);
$crudo = trim($_POST['respuestas'] ?? '');
$respuestas = $crudo !== '' ? json_decode($crudo, true) : [];
if (!is_array($respuestas)) {
    json_error('respuestas inválido');
}

$porPregunta = [];
foreach ($respuestas as $r) {
    if (is_array($r) && isset($r['campaniaPreguntaId'])) {
        $porPregunta[(int) $r['campaniaPreguntaId']] = $r;
    }
}

foreach ($preguntas as $p) {
    if (!$p['obligatoria']) {
        continue;
    }
    $r = $porPregunta[$p['campaniaPreguntaId']] ?? null;
    $tieneTexto = $r !== null && trim((string) ($r['texto'] ?? '')) !== '';
    $tieneOpcion = $r !== null && !empty($r['campaniaPreguntaOpcionId']);
    if (!$tieneTexto && !$tieneOpcion) {
        json_error('Falta responder: ' . $p['texto']);
    }
}

// --- Cupo ------------------------------------------------------------------
$cupo = $campania['CupoMaximo'] !== null ? (int) $campania['CupoMaximo'] : null;
$enEspera = false;
if ($cupo !== null && rh_campania_confirmadas($conn, $campaniaId) >= $cupo) {
    $enEspera = true;
}

$estado = $enEspera ? 'lista_espera' : 'confirmada';
$posicion = rh_campania_proxima_posicion($conn, $campaniaId);

$stmt = $conn->prepare(
    'INSERT INTO CampaniaInscripcion (CampaniaId, UserId, Estado, Posicion) VALUES (?, ?, ?, ?)'
);
$stmt->bind_param('iisi', $campaniaId, $userId, $estado, $posicion);
$stmt->execute();
$inscripcionId = (int) $stmt->insert_id;
$stmt->close();

// --- Guardar respuestas ----------------------------------------------------
$validas = array_column($preguntas, 'campaniaPreguntaId');
foreach ($porPregunta as $preguntaId => $r) {
    if (!in_array($preguntaId, $validas, true)) {
        continue; // pregunta de otra campaña: se ignora
    }
    $texto = isset($r['texto']) ? trim((string) $r['texto']) : null;
    $opcionId = !empty($r['campaniaPreguntaOpcionId']) ? (int) $r['campaniaPreguntaOpcionId'] : null;

    $stmt = $conn->prepare(
        'INSERT INTO CampaniaRespuesta (CampaniaInscripcionId, CampaniaPreguntaId, RespuestaTexto, CampaniaPreguntaOpcionId)
         VALUES (?, ?, ?, ?)'
    );
    $stmt->bind_param('iisi', $inscripcionId, $preguntaId, $texto, $opcionId);
    $stmt->execute();
    $stmt->close();
}

// --- Avisar a quien organiza ----------------------------------------------
try {
    require_once __DIR__ . '/../../funciones/notificaciones.php';
    rh_notificar(
        $conn,
        [(int) $campania['UserId']],
        'campania_inscripcion',
        $enEspera ? 'Nueva persona en lista de espera' : 'Nueva inscripción',
        'En "' . $campania['Titulo'] . '".',
        '/(app)/campanias/' . $campaniaId . '/administrar',
        ['actorUserId' => $userId]
    );
} catch (Throwable $e) {
    // La inscripción ya quedó; el aviso es secundario.
}

json_success(
    [
        'campaniaInscripcionId' => $inscripcionId,
        'estado' => $estado,
        'posicion' => $posicion,
        'enListaEspera' => $enEspera,
        'mensajeAviso' => $campania['MensajeAviso'],
    ],
    $enEspera
        ? 'El cupo está completo: quedaste en lista de espera y te avisamos si se libera un lugar'
        : 'Inscripción confirmada',
    201
);
