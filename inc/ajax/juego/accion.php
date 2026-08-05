<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/juego.php';
require_once __DIR__ . '/../../funciones/juegos.php';

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

// La XP de la acción también suma al perfil de HuePlay.
//
// Sin esto, HueGotchi subía sólo `MascotaJuego.Nivel`, que es el nivel DE ESA
// MASCOTA: dabas de comer, ganabas XP, y no cambiaba nada en el hub, en el
// ranking ni en el nivel de la cuenta, porque nadie más miraba ese contador.
//
// Va con `cuentaPartida = false`: alimentar no es una partida jugada.
$xp = RH_JUEGO_ACCIONES[$tipo]['xp'];
$progreso = rh_juego_registrar_partida($conn, $userId, 'huegotchi', $xp, null, null, false);

// Se relee para devolver el estado ya consolidado.
$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);

json_success([
    'juego' => rh_juego_publico($conn, $datos['juego'], $datos['mascota']),
    'subioNivel' => $resultado['subioNivel'],
    // Progreso de la CUENTA, para que la pantalla pueda mover la barra de
    // HuePlay en el momento y no recién al volver al hub.
    'progresoCuenta' => $progreso,
    'progresoJuego' => rh_juego_progreso_juego(rh_juego_puntos_de($conn, $userId, 'huegotchi')),
]);
