<?php
/**
 * Las 10 preguntas de una partida de HueTrivia.
 *
 * Devuelve el enunciado y las 4 opciones barajadas. **No** devuelve cuál es la
 * correcta: eso lo sabe sólo `trivia_responder.php`.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/huetrivia.php';

$userId = rh_require_auth($conn);

$semilla = (int) ($_GET['semilla'] ?? 0);
$idiomaPedido = trim($_GET['idioma'] ?? 'es');

if ($semilla <= 0) {
    json_error('Falta la semilla');
}

$idioma = rh_trivia_idioma($conn, $idiomaPedido);
$preguntas = rh_trivia_preguntas($conn, $semilla, $idioma);

if (count($preguntas) === 0) {
    json_error('No hay preguntas cargadas', 503);
}

json_success([
    'semilla' => $semilla,
    'idioma' => $idioma,
    'segundosPorPregunta' => RH_TRIVIA_SEGUNDOS,
    'preguntas' => $preguntas,
]);
