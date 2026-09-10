<?php
/**
 * Sumarse a una sala PÚBLICA desde el visualizador (sin código, sin
 * invitación). Mismas validaciones que `sala_unirse.php` (por código) pero
 * por id y exigiendo `EsPublica = 1` — una sala privada sólo se abre con su
 * código.
 *
 * La lógica va inline (no en `salas.php`) para no tocar ese archivo.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta la sala');
}

$stmt = $conn->prepare("SELECT * FROM JuegoSala WHERE SalaId = ? AND Estado = 'esperando' AND EsPublica = 1");
$stmt->bind_param('i', $salaId);
$stmt->execute();
$sala = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$sala) {
    json_error('Esa sala ya no está abierta');
}

$stmt = $conn->prepare('SELECT * FROM JuegoSalaJugador WHERE SalaId = ? AND UserId = ?');
$stmt->bind_param('ii', $salaId, $userId);
$stmt->execute();
$existente = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($existente) {
    // Ya tiene asiento (invitación previa, o ya se sumó): entrar equivale a aceptar.
    if ($existente['Estado'] === 'invitado') {
        $sjId = (int) $existente['SalaJugadorId'];
        $stmt = $conn->prepare("UPDATE JuegoSalaJugador SET Estado = 'aceptado' WHERE SalaJugadorId = ?");
        $stmt->bind_param('i', $sjId);
        $stmt->execute();
        $stmt->close();
    }
} else {
    $ocupados = count(rh_sala_jugadores($conn, $salaId, ['invitado', 'aceptado']));
    if ($ocupados >= (int) $sala['MaxJugadores']) {
        json_error('La sala ya está completa');
    }

    $stmt = $conn->prepare("INSERT INTO JuegoSalaJugador (SalaId, UserId, Estado, UnidoPorCodigo) VALUES (?, ?, 'aceptado', 1)");
    $stmt->bind_param('ii', $salaId, $userId);
    $stmt->execute();
    $stmt->close();

    rh_notificar(
        $conn,
        [(int) $sala['CreadorUserId']],
        'juego_desafio',
        'Se sumó alguien a tu sala',
        rh_juego_nombre($conn, $userId) . ' se unió a tu sala abierta de ' . rh_juego_titulo($sala['JuegoCodigo']),
        '/(app)/hueplay/desafios'
    );
}

$salaFresca = rh_sala_obtener($conn, $salaId);
$jugadores = rh_sala_jugadores($conn, $salaId);
$item = rh_sala_serializar($conn, $salaFresca, $jugadores, $userId);
$item['esPublica'] = (bool) ($salaFresca['EsPublica'] ?? 1);
$item['juegoModo'] = rh_juego_modo($salaFresca['JuegoCodigo']);
json_success(['sala' => $item]);
