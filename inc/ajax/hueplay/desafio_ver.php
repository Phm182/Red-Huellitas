<?php
/**
 * Estado actual de un duelo.
 *
 * Es lo que consulta la pantalla de HueConecta mientras espera al rival. Sin
 * websockets en el hosting, el refresco es preguntando cada tanto; por eso este
 * endpoint es lo más chico posible y devuelve `movimientos`, que le alcanza al
 * cliente para saber si algo cambió sin comparar el tablero entero.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/hueconecta.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_GET['desafioId'] ?? 0);
if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) {
    json_error('El desafío no existe', 404);
}

// Sólo los dos jugadores pueden mirar el tablero. Es una partida entre dos, no
// un contenido público.
if ((int) $d['UserIdRetador'] !== $userId && (int) $d['UserIdRetado'] !== $userId) {
    json_error('Este desafío no es tuyo', 403);
}

$tablero = $d['Tablero'] ?? '';

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'columnasLibres' => $tablero !== '' ? rh_c4_columnas_libres($tablero) : [],
]);
