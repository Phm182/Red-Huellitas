<?php
/**
 * Cambiar el rol de un miembro o sacarlo del equipo.
 *
 * El dueño es el único que puede repartir roles: si un admin pudiera
 * ascender a otros admins o degradar al dueño, cualquiera con permisos
 * podría quedarse con el equipo.
 */

require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$equipoMiembroId = (int) ($_POST['equipoMiembroId'] ?? 0);
$rol = trim($_POST['rol'] ?? '');
$quitar = filter_var($_POST['quitar'] ?? false, FILTER_VALIDATE_BOOLEAN);

if ($equipoMiembroId <= 0) {
    json_error('Falta equipoMiembroId');
}
if (!$quitar && !in_array($rol, ['admin', 'miembro'], true)) {
    json_error("rol debe ser 'admin' o 'miembro'");
}

$stmt = $conn->prepare(
    'SELECT m.*, e.Nombre AS EquipoNombre FROM EquipoMiembro m
     JOIN Equipo e ON e.EquipoId = m.EquipoId
     WHERE m.EquipoMiembroId = ?'
);
$stmt->bind_param('i', $equipoMiembroId);
$stmt->execute();
$miembro = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$miembro) {
    json_error('Miembro no encontrado', 404);
}

$equipoId = (int) $miembro['EquipoId'];

if (rh_equipo_rol($conn, $equipoId, $userId) !== 'dueno') {
    json_error('Sólo el dueño del equipo puede cambiar roles o quitar miembros', 403);
}
if ($miembro['Rol'] === 'dueno') {
    json_error('No se puede modificar al dueño del equipo', 409);
}
if ($miembro['Estado'] !== 'activo') {
    json_error('Ese miembro no está activo', 409);
}

if ($quitar) {
    $stmt = $conn->prepare(
        "UPDATE EquipoMiembro SET Estado = 'salio', ResueltoEn = NOW(), ResueltoPorUserId = ?
         WHERE EquipoMiembroId = ?"
    );
    $stmt->bind_param('ii', $userId, $equipoMiembroId);
    $stmt->execute();
    $stmt->close();

    rh_notificar(
        $conn,
        [(int) $miembro['UserId']],
        'equipo_baja',
        $miembro['EquipoNombre'],
        'Ya no formás parte de este equipo.',
        '/(app)/equipos/' . $equipoId,
        ['actorUserId' => $userId]
    );

    json_success(null, 'Miembro dado de baja');
}

$stmt = $conn->prepare('UPDATE EquipoMiembro SET Rol = ? WHERE EquipoMiembroId = ?');
$stmt->bind_param('si', $rol, $equipoMiembroId);
$stmt->execute();
$stmt->close();

json_success(null, 'Rol actualizado');
