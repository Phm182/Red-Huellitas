<?php
/**
 * Quién vio una historia.
 *
 * SÓLO EL AUTOR. Es el dato más sensible del módulo: saber quién miró tu
 * historia está bien, pero saber quién miró la de otro no. El chequeo va
 * contra Historia.UserId, no contra un parámetro del cliente.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$historiaId = (int) ($_GET['historiaId'] ?? 0);
if ($historiaId <= 0) {
    json_error('Falta historiaId');
}

$stmt = $conn->prepare('SELECT UserId FROM Historia WHERE HistoriaId = ?');
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$historia) {
    json_error('Historia no encontrada', 404);
}
if ((int) $historia['UserId'] !== $userId) {
    json_error('Sólo el autor puede ver quién miró su historia', 403);
}

$stmt = $conn->prepare(
    'SELECT Usuario.UserId, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            HistoriaVista.CreatedAt
     FROM HistoriaVista
     JOIN Usuario ON Usuario.UserId = HistoriaVista.UserId
     WHERE HistoriaVista.HistoriaId = ?
     ORDER BY HistoriaVista.CreatedAt DESC'
);
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$result = $stmt->get_result();

$vistas = [];
while ($row = $result->fetch_assoc()) {
    $vistas[] = array_merge(rh_usuario_resumen($row), ['vistaEn' => $row['CreatedAt']]);
}
$stmt->close();

json_success(['vistas' => $vistas, 'total' => count($vistas)]);
