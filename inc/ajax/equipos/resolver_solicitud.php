<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$equipoMiembroId = (int) ($_POST['equipoMiembroId'] ?? 0);
$accion = trim($_POST['accion'] ?? '');

if ($equipoMiembroId <= 0) {
    json_error('Falta equipoMiembroId');
}
if (!in_array($accion, ['aceptar', 'rechazar'], true)) {
    json_error("accion debe ser 'aceptar' o 'rechazar'");
}

$stmt = $conn->prepare(
    'SELECT m.*, e.Nombre AS EquipoNombre
     FROM EquipoMiembro m
     JOIN Equipo e ON e.EquipoId = m.EquipoId
     WHERE m.EquipoMiembroId = ?'
);
$stmt->bind_param('i', $equipoMiembroId);
$stmt->execute();
$solicitud = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$solicitud) {
    json_error('Solicitud no encontrada', 404);
}

$equipoId = (int) $solicitud['EquipoId'];

if (!rh_equipo_puede_administrar($conn, $equipoId, $userId)) {
    json_error('Sólo el dueño o un admin del equipo puede resolver esto', 403);
}
if ($solicitud['Estado'] !== 'pendiente') {
    json_error('Esa solicitud ya estaba resuelta', 409);
}

$nuevoEstado = $accion === 'aceptar' ? 'activo' : 'rechazado';

$stmt = $conn->prepare(
    "UPDATE EquipoMiembro
     SET Estado = ?, ResueltoEn = NOW(), ResueltoPorUserId = ?
     WHERE EquipoMiembroId = ? AND Estado = 'pendiente'"
);
$stmt->bind_param('sii', $nuevoEstado, $userId, $equipoMiembroId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    // Alguien resolvió la misma solicitud entre el SELECT y el UPDATE.
    json_error('Esa solicitud ya estaba resuelta', 409);
}

rh_notificar(
    $conn,
    [(int) $solicitud['UserId']],
    'equipo_solicitud_resuelta',
    $solicitud['EquipoNombre'],
    $accion === 'aceptar'
        ? 'Te sumaron al equipo. Ya podés publicar en su nombre.'
        : 'No aprobaron tu pedido para unirte al equipo.',
    '/(app)/equipos/' . $equipoId,
    ['actorUserId' => $userId]
);

json_success(null, $accion === 'aceptar' ? 'Miembro agregado' : 'Pedido rechazado');
