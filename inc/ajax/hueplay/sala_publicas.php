<?php
/**
 * Visualizador de salas abiertas: las salas PÚBLICAS que todavía están
 * armándose y tienen al menos un asiento libre, para sumarse sin código.
 *
 * Filtra las propias (ya estás adentro) y, opcional, por `juegoCodigo`.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_GET['juegoCodigo'] ?? '');
$filtrarJuego = $juegoCodigo !== '' && rh_juego_existe($juegoCodigo);

$sqlJuego = $filtrarJuego ? ' AND s.JuegoCodigo = ?' : '';
$sql =
    "SELECT s.* FROM JuegoSala s
      WHERE s.Estado = 'esperando' AND s.EsPublica = 1
        AND s.CreadorUserId <> ?
        AND (SELECT COUNT(*) FROM JuegoSalaJugador sj
              WHERE sj.SalaId = s.SalaId AND sj.Estado IN ('invitado','aceptado')) < s.MaxJugadores
        AND NOT EXISTS (SELECT 1 FROM JuegoSalaJugador sj2
                         WHERE sj2.SalaId = s.SalaId AND sj2.UserId = ? AND sj2.Estado <> 'rechazado')
        $sqlJuego
      ORDER BY s.CreatedAt DESC
      LIMIT 60";

$stmt = $conn->prepare($sql);
if ($filtrarJuego) {
    $stmt->bind_param('iis', $userId, $userId, $juegoCodigo);
} else {
    $stmt->bind_param('ii', $userId, $userId);
}
$stmt->execute();
$salas = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$items = [];
foreach ($salas as $sala) {
    $jugadores = rh_sala_jugadores($conn, (int) $sala['SalaId']);
    $items[] = rh_sala_serializar($conn, $sala, $jugadores, $userId);
}

json_success(['salas' => $items]);
