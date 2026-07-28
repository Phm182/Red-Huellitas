<?php
/**
 * Marcar un tránsito como acordado o volverlo a disponible (sólo el dueño).
 *
 * Es un toggle explícito y reversible: mientras está 'acordado' la publicación
 * no se puede editar (ver rh_transito_motivo_bloqueo_edicion), y si el acuerdo
 * se cae el dueño la libera y recupera la edición.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$transitoId = (int) ($_POST['transitoId'] ?? 0);
if ($transitoId <= 0) {
    json_error('Falta transitoId');
}

$estado = $_POST['estadoTransito'] ?? '';
if (!in_array($estado, ['disponible', 'acordado'], true)) {
    json_error("estadoTransito debe ser 'disponible' o 'acordado'");
}

$stmt = $conn->prepare("SELECT UserId FROM Transito WHERE TransitoId = ? AND Estado = 'A'");
$stmt->bind_param('i', $transitoId);
$stmt->execute();
$transito = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$transito) {
    json_error('Publicación no encontrada', 404);
}
if ((int) $transito['UserId'] !== $userId) {
    json_error('No tenés permiso para modificar esta publicación', 403);
}

$stmt = $conn->prepare('UPDATE Transito SET EstadoTransito = ? WHERE TransitoId = ?');
$stmt->bind_param('si', $estado, $transitoId);
$stmt->execute();
$stmt->close();

json_success(['estadoTransito' => $estado], 'Estado actualizado');
