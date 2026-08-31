<?php
/**
 * Preferencia fija de skin de HueSoccer (fichas + pelota) — se elige una
 * vez en el perfil, no por partida. Mismo molde que
 * `inc/ajax/perfil/whatsapp_guardar.php`.
 *
 * Las whitelists de acá abajo son el espejo exacto de `SKINS_FICHA`/
 * `SKINS_PELOTA` en `app-movil/src/juego/huesoccer/skins.ts` — si se agrega
 * un skin nuevo, hay que sumarlo en los dos lados.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

const RH_SOCCER_SKINS_FICHA = ['clasica', 'rayada', 'lunares', 'bicolor', 'estrella'];
const RH_SOCCER_SKINS_PELOTA = ['clasica', 'cueroRetro', 'tricolor', 'arcoiris', 'lunar'];

$userId = rh_require_auth($conn);

$skinFicha = $_POST['skinFicha'] ?? null;
$skinPelota = $_POST['skinPelota'] ?? null;

if ($skinFicha !== null && !in_array($skinFicha, RH_SOCCER_SKINS_FICHA, true)) {
    json_error('skinFicha inválido');
}
if ($skinPelota !== null && !in_array($skinPelota, RH_SOCCER_SKINS_PELOTA, true)) {
    json_error('skinPelota inválido');
}

if ($skinFicha !== null && $skinPelota !== null) {
    $stmt = $conn->prepare('UPDATE Usuario SET HueSoccerSkinFicha = ?, HueSoccerSkinPelota = ? WHERE UserId = ?');
    $stmt->bind_param('ssi', $skinFicha, $skinPelota, $userId);
} elseif ($skinFicha !== null) {
    $stmt = $conn->prepare('UPDATE Usuario SET HueSoccerSkinFicha = ? WHERE UserId = ?');
    $stmt->bind_param('si', $skinFicha, $userId);
} elseif ($skinPelota !== null) {
    $stmt = $conn->prepare('UPDATE Usuario SET HueSoccerSkinPelota = ? WHERE UserId = ?');
    $stmt->bind_param('si', $skinPelota, $userId);
} else {
    json_error('Nada para guardar');
}
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT HueSoccerSkinFicha, HueSoccerSkinPelota FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'skinFicha' => $actual['HueSoccerSkinFicha'],
    'skinPelota' => $actual['HueSoccerSkinPelota'],
], 'Skin actualizado');
