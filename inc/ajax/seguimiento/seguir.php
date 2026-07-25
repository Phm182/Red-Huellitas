<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$userIdSeguido = (int) ($_POST['userIdSeguido'] ?? 0);
if ($userIdSeguido <= 0) {
    json_error('Falta userIdSeguido');
}
if ($userIdSeguido === $userId) {
    json_error('No podés seguirte a vos mismo');
}

$stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A'");
$stmt->bind_param('i', $userIdSeguido);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('El usuario no existe', 404);
}
$stmt->close();

$stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
$stmt->bind_param('ii', $userId, $userIdSeguido);
$stmt->execute();
if ($stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('Ya seguís a este usuario', 409);
}
$stmt->close();

$stmt = $conn->prepare('INSERT INTO Seguimiento (UserIdSeguidor, UserIdSeguido) VALUES (?, ?)');
$stmt->bind_param('ii', $userId, $userIdSeguido);
$stmt->execute();
$stmt->close();

json_success(null, 'Ahora seguís a este usuario', 201);
