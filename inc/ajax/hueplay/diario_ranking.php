<?php
/**
 * La tabla del día para un juego.
 *
 * Acepta `fecha` para poder mirar la de ayer —sirve para "así quedó el reto de
 * ayer" sin inventar otro endpoint—, pero nunca crea el reto de una fecha que
 * no existe: si nadie lo jugó, no hay nada que rankear.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/diario.php';

$userId = rh_require_auth($conn);

$codigo = trim($_GET['juegoCodigo'] ?? '');
$fecha = trim($_GET['fecha'] ?? '') ?: rh_diario_hoy();
$limite = isset($_GET['limite']) ? (int) $_GET['limite'] : 20;

// La fecha viene del cliente: se valida el formato antes de usarla. No es un
// riesgo de inyección —va por sentencia preparada— pero una cadena cualquiera
// crearía un reto con fecha basura al pasar por rh_diario_obtener().
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha) || $fecha > rh_diario_hoy()) {
    json_error('Fecha inválida');
}

$reto = rh_diario_obtener($conn, $codigo, $fecha);
if (!$reto) {
    json_error('Ese juego no tiene reto diario');
}

// La semilla no se devuelve acá bajo ninguna circunstancia: este endpoint es
// público para cualquiera que esté logueado, y con la semilla en mano se podría
// practicar el tablero del día antes de jugarlo en serio.
unset($reto['semilla']);

$mio = rh_diario_mi_resultado($conn, $reto['diarioId'], $userId);

json_success([
    'reto' => $reto,
    'ranking' => rh_diario_ranking($conn, $reto['diarioId'], $limite),
    'participantes' => rh_diario_participantes($conn, $reto['diarioId']),
    'miPuntaje' => $mio['puntos'] ?? null,
    'miPuesto' => $mio ? rh_diario_mi_puesto($conn, $reto['diarioId'], $userId) : null,
]);
