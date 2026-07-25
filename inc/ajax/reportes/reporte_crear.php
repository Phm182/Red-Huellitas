<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$tipo = $_POST['tipo'] ?? '';
$detalle = trim($_POST['detalle'] ?? '');
$pantallaOrigen = trim($_POST['pantallaOrigen'] ?? '') ?: null;

if (!in_array($tipo, ['mejora', 'falla'], true)) {
    json_error("El tipo debe ser 'mejora' o 'falla'");
}
if ($detalle === '') {
    json_error('El detalle es obligatorio');
}

$stmt = $conn->prepare(
    'INSERT INTO ReporteSolicitud (UserId, Tipo, Detalle, PantallaOrigen) VALUES (?, ?, ?, ?)'
);
$stmt->bind_param('isss', $userId, $tipo, $detalle, $pantallaOrigen);
$stmt->execute();
$reporteId = (int) $stmt->insert_id;
$stmt->close();

json_success(['reporteId' => $reporteId], 'Reporte enviado', 201);
