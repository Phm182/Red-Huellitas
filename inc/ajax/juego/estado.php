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

$mascotaId = (int) ($_GET['mascotaId'] ?? 0);
if ($mascotaId <= 0) {
    json_error('Falta mascotaId');
}

$datos = rh_juego_obtener_o_crear($conn, $mascotaId, $userId);
if ($datos === null) {
    // Mismo mensaje para "no existe" y "no es tuya": no filtramos qué mascotas
    // existen a quien no es el dueño.
    json_error('No tenés acceso a esta mascota', 403);
}

json_success([
    'juego' => rh_juego_publico($conn, $datos['juego'], $datos['mascota']),
    // Nivel de HueGotchi dentro de HuePlay, para que la barra ya esté al abrir
    // y no aparezca recién después de la primera acción.
    'progresoJuego' => rh_juego_progreso_juego(rh_juego_puntos_de($conn, $userId, 'huegotchi')),
]);
