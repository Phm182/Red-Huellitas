<?php
/**
 * Cierre del reto del día.
 *
 * Mismo recorte de puntaje que una partida suelta: el número lo calcula el
 * cliente y acá se acota contra el techo del juego (ver `RH_JUEGOS`). En el
 * diario eso pesa más que en una partida normal, porque un puntaje inflado no
 * sólo ensucia el perfil de quien lo manda sino la tabla de todos.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/diario.php';

$userId = rh_require_auth($conn);

$codigo = trim($_POST['juegoCodigo'] ?? '');
$puntos = (int) ($_POST['puntos'] ?? 0);
$duracion = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

$reto = rh_diario_obtener($conn, $codigo);
if (!$reto) {
    json_error('Ese juego no tiene reto diario');
}

$valido = rh_juego_puntaje_valido($codigo, $puntos, $duracion);
if ($valido === null) {
    json_error('Partida inválida');
}

$r = rh_diario_guardar($conn, $reto['diarioId'], $userId, $codigo, $valido, $duracion);
if ($r === null) {
    // No es un error del cliente: es la regla del juego. Se responde con el
    // resultado que ya había, así la pantalla puede mostrar "ya jugaste hoy"
    // con el puntaje puesto en vez de un cartel vacío.
    $mio = rh_diario_mi_resultado($conn, $reto['diarioId'], $userId);
    json_error('Ya jugaste el reto de hoy', 409, [
        'yaJugado' => true,
        'miPuntaje' => $mio['puntos'] ?? null,
        'miPuesto' => rh_diario_mi_puesto($conn, $reto['diarioId'], $userId),
    ]);
}

json_success($r);
