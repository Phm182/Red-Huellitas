<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';

$username = strtolower(trim($_GET['username'] ?? $_POST['username'] ?? ''));

if (!rh_validar_username($username)) {
    json_success(['available' => false, 'reason' => 'formato_invalido']);
}

$stmt = $conn->prepare('SELECT UserId FROM Usuario WHERE Username = ?');
$stmt->bind_param('s', $username);
$stmt->execute();
$existe = (bool) $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['available' => !$existe]);
