<?php
/**
 * Preferencia fija de skin de HueSoccer (fichas + pelota + color) — se
 * elige una vez en el perfil, no por partida. Mismo molde que
 * `inc/ajax/perfil/whatsapp_guardar.php`.
 *
 * Las whitelists de acá abajo son el espejo exacto de `SKINS_FICHA`/
 * `SKINS_PELOTA`/`PALETA_FICHA` en `app-movil/src/juego/huesoccer/skins.ts`
 * — si se agrega un skin o color nuevo, hay que sumarlo en los dos lados.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

const RH_SOCCER_SKINS_FICHA = ['clasica', 'rayada', 'lunares', 'bicolor', 'estrella'];
const RH_SOCCER_SKINS_PELOTA = ['clasica', 'cueroRetro', 'tricolor', 'arcoiris', 'lunar'];
const RH_SOCCER_COLORES_FICHA = [
    'rojo', 'rosa', 'naranja', 'amarillo', 'verde', 'esmeralda', 'celeste',
    'azul', 'indigo', 'violeta', 'magenta', 'marron', 'gris', 'negro', 'blanco',
];

$userId = rh_require_auth($conn);

$skinFicha = $_POST['skinFicha'] ?? null;
$skinPelota = $_POST['skinPelota'] ?? null;
$colorFicha = $_POST['colorFicha'] ?? null;

if ($skinFicha !== null && !in_array($skinFicha, RH_SOCCER_SKINS_FICHA, true)) {
    json_error('skinFicha inválido');
}
if ($skinPelota !== null && !in_array($skinPelota, RH_SOCCER_SKINS_PELOTA, true)) {
    json_error('skinPelota inválido');
}
if ($colorFicha !== null && !in_array($colorFicha, RH_SOCCER_COLORES_FICHA, true)) {
    json_error('colorFicha inválido');
}

$campos = [];
$valores = [];
$tipos = '';
if ($skinFicha !== null) {
    $campos[] = 'HueSoccerSkinFicha = ?';
    $valores[] = $skinFicha;
    $tipos .= 's';
}
if ($skinPelota !== null) {
    $campos[] = 'HueSoccerSkinPelota = ?';
    $valores[] = $skinPelota;
    $tipos .= 's';
}
if ($colorFicha !== null) {
    $campos[] = 'HueSoccerColorFicha = ?';
    $valores[] = $colorFicha;
    $tipos .= 's';
}

if (empty($campos)) {
    json_error('Nada para guardar');
}

$valores[] = $userId;
$tipos .= 'i';
$stmt = $conn->prepare('UPDATE Usuario SET ' . implode(', ', $campos) . ' WHERE UserId = ?');
$stmt->bind_param($tipos, ...$valores);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT HueSoccerSkinFicha, HueSoccerSkinPelota, HueSoccerColorFicha FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'skinFicha' => $actual['HueSoccerSkinFicha'],
    'skinPelota' => $actual['HueSoccerSkinPelota'],
    'colorFicha' => $actual['HueSoccerColorFicha'],
], 'Skin actualizado');
