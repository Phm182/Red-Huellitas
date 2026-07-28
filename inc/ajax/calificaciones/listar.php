<?php
/**
 * Las calificaciones que recibió alguien (persona o equipo), con su promedio.
 *
 * Es lo que se mira antes de decidir si anotarse a una campaña de un equipo
 * desconocido, y del otro lado, lo que ve un organizador cuando revisa a
 * quién le da un cupo.
 */

require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/calificacion.php';

rh_require_auth($conn);

$paraTipo = trim($_GET['paraTipo'] ?? '');
$paraId = (int) ($_GET['paraId'] ?? 0);
$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 30;
$limite = max(1, min(100, $limite));

if (!in_array($paraTipo, ['usuario', 'equipo'], true)) {
    json_error("paraTipo debe ser 'usuario' o 'equipo'");
}
if ($paraId <= 0) {
    json_error('Falta paraId');
}

$stmt = $conn->prepare(
    "SELECT * FROM Calificacion
     WHERE ParaTipo = ? AND ParaId = ? AND Estado = 'A'
     ORDER BY CreatedAt DESC
     LIMIT ?"
);
$stmt->bind_param('sii', $paraTipo, $paraId, $limite);
$stmt->execute();
$res = $stmt->get_result();

$calificaciones = [];
while ($row = $res->fetch_assoc()) {
    $calificaciones[] = rh_calificacion_publica($conn, $row);
}
$stmt->close();

$data = [
    'reputacion' => rh_reputacion($conn, $paraTipo, $paraId),
    'calificaciones' => $calificaciones,
];

// El historial de asistencia sólo tiene sentido para personas: es lo que
// responde "¿este se anotó cinco veces y no vino ninguna?".
if ($paraTipo === 'usuario') {
    $data['asistencias'] = rh_usuario_asistencias($conn, $paraId);
}

json_success($data);
