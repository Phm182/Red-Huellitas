<?php
/**
 * Estado actual de un duelo de HueSoccer.
 *
 * Lo consulta la pantalla mientras espera el tiro del rival (sin websockets
 * en el hosting, el refresco es preguntando cada tanto). No hace falta
 * ningún campo extra más allá de `rh_juego_serializar_desafio()`: el JSON
 * del tablero ya trae las posiciones de las 10 fichas, la pelota y los
 * goles — todo lo que el cliente necesita para dibujar y animar.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

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
if ((int) $d['UserIdRetador'] !== $userId && (int) $d['UserIdRetado'] !== $userId) {
    json_error('Este desafío no es tuyo', 403);
}

json_success(['desafio' => rh_juego_serializar_desafio($conn, $d, $userId)]);
