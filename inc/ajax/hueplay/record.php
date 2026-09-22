<?php
/**
 * Récord personal en un juego, para mostrarlo arriba de todo antes de
 * arrancar la partida. 0 si nunca lo jugó.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$codigo = trim($_GET['juegoCodigo'] ?? '');
if ($codigo === '' || !isset(RH_JUEGOS[$codigo])) {
    json_error('Juego inválido');
}

json_success(['record' => rh_juego_record($conn, $userId, $codigo)]);
