<?php
/**
 * Cierre de una partida suelta (sin desafío).
 *
 * El puntaje viene del cliente y se recorta contra el techo del juego. Ver el
 * comentario de `RH_JUEGOS` en juegos.php: no se puede validar de verdad sin
 * reproducir la partida en el servidor, así que se acota el daño.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$codigo = trim($_POST['juegoCodigo'] ?? '');
$puntos = (int) ($_POST['puntos'] ?? 0);
$duracion = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

if (!rh_juego_existe($codigo)) {
    json_error('Juego desconocido');
}

$valido = rh_juego_puntaje_valido($codigo, $puntos, $duracion);
if ($valido === null) {
    json_error('Partida inválida');
}

$recordAntes = rh_juego_record($conn, $userId, $codigo);

$progreso = rh_juego_registrar_partida($conn, $userId, $codigo, $valido, $duracion);
$progreso['record'] = max($recordAntes, $valido);
$progreso['esRecord'] = $valido > $recordAntes;

json_success($progreso);
