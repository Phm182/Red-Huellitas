<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/adopcion.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
$estadoAdopcion = $_POST['estadoAdopcion'] ?? '';

if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}
if (!in_array($estadoAdopcion, ['disponible', 'en_proceso', 'adoptado'], true)) {
    json_error("estadoAdopcion debe ser 'disponible', 'en_proceso' o 'adoptado'");
}

$stmt = $conn->prepare("SELECT UserId FROM Adopcion WHERE AdopcionId = ? AND Estado = 'A'");
$stmt->bind_param('i', $adopcionId);
$stmt->execute();
$adopcion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$adopcion) {
    json_error('Publicación de adopción no encontrada', 404);
}
if ((int) $adopcion['UserId'] !== $userId) {
    json_error('No tenés permiso para modificar esta publicación', 403);
}

$stmt = $conn->prepare('UPDATE Adopcion SET EstadoAdopcion = ? WHERE AdopcionId = ?');
$stmt->bind_param('si', $estadoAdopcion, $adopcionId);
$stmt->execute();
$stmt->close();

json_success(['estadoAdopcion' => $estadoAdopcion], 'Estado actualizado');
