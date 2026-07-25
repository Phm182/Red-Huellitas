<?php
/**
 * Suspende o reactiva una cuenta (Usuario.Estado 'A'/'I').
 *
 * El login ya filtra por Estado = 'A', pero eso solo no alcanza: una sesión
 * bearer viva sigue funcionando hasta que expira. Por eso al suspender se
 * revocan también todas las sesiones del usuario, y la suspensión surte
 * efecto en la request siguiente.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$adminId = rh_require_admin($conn);

$userId = (int) ($_POST['userId'] ?? 0);
$suspender = ($_POST['suspender'] ?? '') !== '0' && ($_POST['suspender'] ?? '') !== '';

if ($userId <= 0) {
    json_error('Falta userId');
}
if ($userId === $adminId) {
    json_error('No podés suspender tu propia cuenta');
}

$stmt = $conn->prepare('SELECT UserId, Rol, Estado FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$objetivo = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$objetivo) {
    json_error('Usuario no encontrado', 404);
}
// Un admin no puede suspender a otro admin: si hiciera falta, se hace por SQL
// con intención explícita, no desde el panel.
if ($objetivo['Rol'] === 'admin') {
    json_error('No se puede suspender a otro administrador', 403);
}

$nuevoEstado = $suspender ? 'I' : 'A';

$stmt = $conn->prepare('UPDATE Usuario SET Estado = ? WHERE UserId = ?');
$stmt->bind_param('si', $nuevoEstado, $userId);
$stmt->execute();
$stmt->close();

if ($suspender) {
    $stmt = $conn->prepare(
        'UPDATE UsuarioSesion SET RevocadoEn = NOW() WHERE UserId = ? AND RevocadoEn IS NULL'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $stmt->close();
}

json_success(
    ['userId' => $userId, 'estado' => $nuevoEstado],
    $suspender ? 'Cuenta suspendida' : 'Cuenta reactivada'
);
