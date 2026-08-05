<?php
/**
 * Pide vincular una tutela. La puede iniciar cualquiera de los dos lados:
 * el menor buscando a su adulto, o el adulto buscando al menor.
 *
 * Quien la inicia NO la acepta: siempre confirma el otro. Por eso se guarda
 * `IniciadaPor`, que es lo que después decide a quién mostrarle el botón.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$identificador = trim($_POST['usuario'] ?? '');
$rol = trim($_POST['rol'] ?? ''); // 'tutor' = yo soy el tutor del otro

if ($identificador === '') {
    json_error('Indicá el email o el usuario de la otra persona');
}
if (!in_array($rol, ['menor', 'tutor'], true)) {
    json_error('Rol inválido');
}

// Se busca por email o por @usuario para que sirva en los dos flujos.
$identificador = ltrim($identificador, '@');
$stmt = $conn->prepare(
    "SELECT UserId, NombreCompleto, Username FROM Usuario
      WHERE (Email = ? OR Username = ?) AND Estado = 'A' LIMIT 1"
);
$stmt->bind_param('ss', $identificador, $identificador);
$stmt->execute();
$otro = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$otro) {
    json_error('No encontramos esa cuenta', 404);
}

$otroId = (int) $otro['UserId'];
if ($otroId === $userId) {
    json_error('No podés vincularte con vos mismo');
}

// `rol` describe quién soy YO respecto del otro.
$menorId = $rol === 'tutor' ? $otroId : $userId;
$tutorId = $rol === 'tutor' ? $userId : $otroId;

// El tutor tiene que ser mayor de edad declarada. Sin fecha cargada no se
// puede afirmar que lo sea, y dejar que un menor sin fecha "tutele" a otro
// menor vaciaría la protección entera.
$edadTutor = rh_edad_de($conn, $tutorId);
if ($edadTutor === null) {
    json_error('El adulto responsable tiene que cargar su fecha de nacimiento antes de aceptar la tutela');
}
if ($edadTutor < 18) {
    json_error('El adulto responsable tiene que ser mayor de 18');
}

// Un vínculo ya aceptado no se pisa: primero hay que revocarlo.
$stmt = $conn->prepare('SELECT TutelaId, Estado FROM Tutela WHERE UserIdMenor = ? AND UserIdTutor = ?');
$stmt->bind_param('ii', $menorId, $tutorId);
$stmt->execute();
$previa = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($previa && $previa['Estado'] === 'aceptada') {
    json_error('Ese vínculo ya está activo');
}
if ($previa && $previa['Estado'] === 'pendiente') {
    json_error('Ya hay una solicitud esperando respuesta');
}

$iniciadaPor = $rol === 'tutor' ? 'tutor' : 'menor';

if ($previa) {
    // Rechazada o revocada antes: se reabre la misma fila en vez de duplicar.
    $stmt = $conn->prepare(
        "UPDATE Tutela SET Estado = 'pendiente', IniciadaPor = ?, CreatedAt = NOW(), ResueltaEn = NULL
          WHERE TutelaId = ?"
    );
    $stmt->bind_param('si', $iniciadaPor, $previa['TutelaId']);
    $stmt->execute();
    $stmt->close();
    $tutelaId = (int) $previa['TutelaId'];
} else {
    $stmt = $conn->prepare(
        'INSERT INTO Tutela (UserIdMenor, UserIdTutor, Estado, IniciadaPor) VALUES (?, ?, \'pendiente\', ?)'
    );
    $stmt->bind_param('iis', $menorId, $tutorId, $iniciadaPor);
    $stmt->execute();
    $tutelaId = (int) $stmt->insert_id;
    $stmt->close();
}

// Avisa al que tiene que confirmar, que es el que NO inició.
$destinatario = $iniciadaPor === 'menor' ? $tutorId : $menorId;
$stmt = $conn->prepare('SELECT NombreCompleto, Username FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$yo = $stmt->get_result()->fetch_assoc();
$stmt->close();
$nombreYo = !empty($yo['Username']) ? '@' . $yo['Username'] : ($yo['NombreCompleto'] ?? 'Alguien');

rh_notificar(
    $conn,
    [$destinatario],
    'tutela_solicitud',
    'Solicitud de vínculo familiar',
    $iniciadaPor === 'menor'
        ? "$nombreYo te pide ser su adulto responsable"
        : "$nombreYo quiere ser tu adulto responsable",
    '/(app)/configuracion',
    ['actorUserId' => $userId]
);

json_success([
    'tutelaId' => $tutelaId,
    'menorUserId' => $menorId,
    'tutorUserId' => $tutorId,
    'estado' => 'pendiente',
    'iniciadaPor' => $iniciadaPor,
], 'Solicitud enviada', 201);
