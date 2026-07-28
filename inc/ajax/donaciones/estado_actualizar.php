<?php
/**
 * Marcar una donación como acordada o volverla a disponible (sólo el dueño).
 *
 * Toggle explícito y reversible, igual que en Tránsito: mientras está
 * 'acordada' no se puede editar, y liberarla devuelve la edición.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$donacionId = (int) ($_POST['donacionId'] ?? 0);
if ($donacionId <= 0) {
    json_error('Falta donacionId');
}

$estado = $_POST['estadoDonacion'] ?? '';
if (!in_array($estado, ['disponible', 'acordado'], true)) {
    json_error("estadoDonacion debe ser 'disponible' o 'acordado'");
}

$stmt = $conn->prepare("SELECT UserId FROM Donacion WHERE DonacionId = ? AND Estado = 'A'");
$stmt->bind_param('i', $donacionId);
$stmt->execute();
$donacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$donacion) {
    json_error('Publicación no encontrada', 404);
}
if ((int) $donacion['UserId'] !== $userId) {
    json_error('No tenés permiso para modificar esta publicación', 403);
}

$stmt = $conn->prepare('UPDATE Donacion SET EstadoDonacion = ? WHERE DonacionId = ?');
$stmt->bind_param('si', $estado, $donacionId);
$stmt->execute();
$stmt->close();

json_success(['estadoDonacion' => $estado], 'Estado actualizado');
