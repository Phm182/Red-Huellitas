<?php
/**
 * Cambia CarnetVisibilidad sin necesidad de resubir el archivo (carnet_subir.php
 * hace ambas cosas juntas cuando SÍ hay un archivo nuevo).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
$visibilidad = $_POST['visibilidad'] ?? '';

if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}
if (!in_array($visibilidad, ['publica', 'privada'], true)) {
    json_error("visibilidad debe ser 'publica' o 'privada'");
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
if (empty($mascota['CarnetVacunasPath'])) {
    json_error('Esta mascota todavía no tiene un carnet subido', 400);
}

$stmt = $conn->prepare('UPDATE Mascota SET CarnetVisibilidad = ? WHERE MascotaId = ?');
$stmt->bind_param('si', $visibilidad, $mascotaId);
$stmt->execute();
$stmt->close();

json_success(['carnetVisibilidad' => $visibilidad], 'Visibilidad actualizada');
