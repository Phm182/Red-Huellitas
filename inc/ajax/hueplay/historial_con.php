<?php
/**
 * Cuántas veces le ganaste/perdiste contra una persona puntual, en un juego.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$rivalUserId = (int) ($_GET['rivalUserId'] ?? 0);
$juegoCodigo = trim($_GET['juegoCodigo'] ?? '');

if ($rivalUserId <= 0) {
    json_error('Falta rivalUserId');
}
if (!rh_juego_existe($juegoCodigo)) {
    json_error('Juego desconocido');
}

json_success(['historial' => rh_juego_historial_par($conn, $userId, $rivalUserId, $juegoCodigo)]);
