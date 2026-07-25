<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
$visibilidad = $_POST['visibilidad'] ?? 'privada';

if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}
if (!in_array($visibilidad, ['publica', 'privada'], true)) {
    json_error("visibilidad debe ser 'publica' o 'privada'");
}
if (!isset($_FILES['carnet'])) {
    json_error('Falta el archivo carnet');
}

$stmt = $conn->prepare('SELECT UserId, CarnetVacunasPath FROM Mascota WHERE MascotaId = ?');
$stmt->bind_param('i', $mascotaId);
$stmt->execute();
$mascota = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$mascota) {
    json_error('Mascota no encontrada', 404);
}
if ((int) $mascota['UserId'] !== $userId) {
    json_error('No tenés permiso para editar esta mascota', 403);
}

$error = rh_validar_imagen_subida($_FILES['carnet']);
if ($error) {
    json_error($error);
}

$path = rh_guardar_carnet_vacunas($_FILES['carnet'], $mascotaId, $mascota['CarnetVacunasPath']);

$stmt = $conn->prepare('UPDATE Mascota SET CarnetVacunasPath = ?, CarnetVisibilidad = ? WHERE MascotaId = ?');
$stmt->bind_param('ssi', $path, $visibilidad, $mascotaId);
$stmt->execute();
$stmt->close();

json_success(['carnetDisponible' => true, 'carnetVisibilidad' => $visibilidad], 'Carnet actualizado');
