<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$adopcionId = (int) ($_POST['adopcionId'] ?? 0);
if ($adopcionId <= 0) {
    json_error('Falta adopcionId');
}

$stmt = $conn->prepare('DELETE FROM AdopcionFavorito WHERE AdopcionId = ? AND UserId = ?');
$stmt->bind_param('ii', $adopcionId, $userId);
$stmt->execute();
$stmt->close();

json_success(null, 'Quitado de favoritos');
