<?php
/**
 * Cierra una denuncia: 'revisada' (se le dio curso) o 'desestimada'.
 * La acción sobre el usuario denunciado, si corresponde, va aparte por
 * admin/usuario_suspender.php.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

$adminId = rh_require_admin($conn);

$denunciaId = (int) ($_POST['denunciaId'] ?? 0);
$estado = trim($_POST['estado'] ?? '');
$nota = trim($_POST['nota'] ?? '') ?: null;

if ($denunciaId <= 0) {
    json_error('Falta denunciaId');
}
if (!in_array($estado, ['revisada', 'desestimada'], true)) {
    json_error('estado inválido (revisada o desestimada)');
}

$stmt = $conn->prepare('SELECT DenunciaId FROM Denuncia WHERE DenunciaId = ?');
$stmt->bind_param('i', $denunciaId);
$stmt->execute();
$existe = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$existe) {
    json_error('Denuncia no encontrada', 404);
}

$stmt = $conn->prepare(
    'UPDATE Denuncia
     SET EstadoRevision = ?, NotaAdmin = ?, ResueltoPorUserId = ?, ResueltoEn = NOW()
     WHERE DenunciaId = ?'
);
$stmt->bind_param('ssii', $estado, $nota, $adminId, $denunciaId);
$stmt->execute();
$stmt->close();

json_success(['denunciaId' => $denunciaId, 'estadoRevision' => $estado], 'Denuncia resuelta');
