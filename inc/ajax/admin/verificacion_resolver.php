<?php
/**
 * Aprueba o rechaza una verificación de identidad. Aprobarla es lo que
 * destraba mascotas, publicaciones, adopción, productos y el minijuego para
 * ese usuario (rh_usuario_verificado).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

$adminId = rh_require_admin($conn);

$userId = (int) ($_POST['userId'] ?? 0);
$estado = trim($_POST['estado'] ?? '');
$motivo = trim($_POST['motivo'] ?? '') ?: null;

if ($userId <= 0) {
    json_error('Falta userId');
}
if (!in_array($estado, ['aprobado', 'rechazado'], true)) {
    json_error('estado inválido (aprobado o rechazado)');
}
if ($estado === 'rechazado' && $motivo === null) {
    // Sin motivo el usuario no sabe qué corregir y vuelve a subir lo mismo.
    json_error('El motivo es obligatorio al rechazar');
}

$stmt = $conn->prepare('SELECT VerificacionId FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$verificacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$verificacion) {
    json_error('Ese usuario no envió documentación', 404);
}

// Al aprobar se limpia el motivo de un rechazo anterior, para no dejar
// colgado un texto que ya no aplica.
$motivoFinal = $estado === 'aprobado' ? null : $motivo;

$stmt = $conn->prepare(
    'UPDATE UsuarioVerificacion
     SET EstadoRevision = ?, MotivoRechazo = ?, RevisadoPor = ?, RevisadoEn = NOW()
     WHERE UserId = ?'
);
$stmt->bind_param('ssii', $estado, $motivoFinal, $adminId, $userId);
$stmt->execute();
$stmt->close();

json_success(['userId' => $userId, 'estadoRevision' => $estado], 'Verificación actualizada');
