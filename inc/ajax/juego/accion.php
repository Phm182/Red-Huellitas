<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/juego.php';

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para jugar', 403);
}

$mascotaId = (int) ($_POST['mascotaId'] ?? 0);
$tipo = trim($_POST['tipo'] ?? '');

if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}
if (!isset(RH_JUEGO_ACCIONES[$tipo])) {
    json_error('Acción desconocida');
}

$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);
if ($datos === null) {
    json_error('No tenés acceso a esta mascota', 403);
}

$resultado = rh_juego_aplicar_accion($conn, $datos['juego'], $tipo);

if (!$resultado['ok']) {
    // 429 cuando es cooldown: el cliente muestra el contador con esperarSegundos.
    $codigo = $resultado['esperarSegundos'] !== null ? 429 : 400;
    json_error($resultado['error'], $codigo, ['esperarSegundos' => $resultado['esperarSegundos']]);
}

// Se relee para devolver el estado ya consolidado.
$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);

json_success([
    'juego' => rh_juego_publico($conn, $datos['juego'], $datos['mascota']),
    'subioNivel' => $resultado['subioNivel'],
]);
