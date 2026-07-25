<?php
/**
 * Marca un reporte de mejora/falla como resuelto o descartado.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';

$adminId = rh_require_admin($conn);

$reporteId = (int) ($_POST['reporteId'] ?? 0);
$estado = trim($_POST['estado'] ?? '');
$nota = trim($_POST['nota'] ?? '') ?: null;

if ($reporteId <= 0) {
    json_error('Falta reporteId');
}
if (!in_array($estado, ['resuelto', 'descartado'], true)) {
    json_error('estado inválido (resuelto o descartado)');
}

$stmt = $conn->prepare('SELECT ReporteId FROM ReporteSolicitud WHERE ReporteId = ?');
$stmt->bind_param('i', $reporteId);
$stmt->execute();
$existe = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$existe) {
    json_error('Reporte no encontrado', 404);
}

$stmt = $conn->prepare(
    'UPDATE ReporteSolicitud
     SET EstadoRevision = ?, NotaAdmin = ?, ResueltoPorUserId = ?, ResueltoEn = NOW()
     WHERE ReporteId = ?'
);
$stmt->bind_param('ssii', $estado, $nota, $adminId, $reporteId);
$stmt->execute();
$stmt->close();

json_success(['reporteId' => $reporteId, 'estadoRevision' => $estado], 'Reporte actualizado');
