<?php
/**
 * Arranca la partida: sólo quien creó la sala, con mínimo 2 aceptados.
 * Completa con IA si corresponde, arma el tablero inicial (según el juego)
 * y resuelve de entrada los turnos que le toquen a un asiento IA.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';
require_once __DIR__ . '/../../funciones/ludo.php';
require_once __DIR__ . '/../../funciones/ludoroyal.php';
require_once __DIR__ . '/../../funciones/rummy.php';
require_once __DIR__ . '/../../funciones/scrabble.php';
require_once __DIR__ . '/../../funciones/desafio_tablero.php';

$userId = rh_require_auth($conn);

$salaId = (int) ($_POST['salaId'] ?? 0);
if ($salaId <= 0) {
    json_error('Falta salaId');
}

$preparado = rh_sala_iniciar_preparar($conn, $salaId, $userId);
if (isset($preparado['error'])) {
    json_error($preparado['error'], 409);
}

$sala = $preparado['sala'];
$jugadores = $preparado['jugadores'];
$juegoCodigo = $sala['JuegoCodigo'];

// --- Juego de duelo 1v1: la sala fue el lobby, ahora se genera el
// `JuegoDesafio` entre los 2 asientos y el cliente entra a ese duelo por
// el flujo normal (`*_ver.php` / `turno_jugar.php` / `desafio_jugar.php`).
if (rh_juego_es_duelo($juegoCodigo)) {
    $retadorId = (int) $sala['CreadorUserId'];
    $otros = array_values(array_filter($jugadores, fn ($j) => (int) $j['UserId'] !== $retadorId));
    if (!$otros) {
        json_error('La sala no tiene un rival', 409);
    }
    $retadoId = (int) $otros[0]['UserId'];
    $semilla = rh_juego_semilla();
    $modo = rh_juego_modo($juegoCodigo); // 'turnos' o 'puntaje'

    if ($modo === 'turnos') {
        $armado = rh_desafio_tablero_inicial($juegoCodigo, $retadorId, $retadoId, $semilla);
        $tableroDuelo = $armado['tablero'];
        $turnoDeDuelo = $armado['turnoDe'];
        $plazoTurnoMinutos = (int) $sala['PlazoTurnoMinutos'];
        $expiraMinutos = $plazoTurnoMinutos;
    } else {
        $tableroDuelo = null;
        $turnoDeDuelo = null;
        $plazoTurnoMinutos = 1440;
        $expiraMinutos = RH_DESAFIO_DIAS * 1440;
    }

    $stmt = $conn->prepare(
        "INSERT INTO JuegoDesafio
            (JuegoCodigo, Modo, PlazoTurnoMinutos, UserIdRetador, UserIdRetado, Semilla, Tablero, TurnoDeUserId, Estado, ExpiraEn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'aceptado', DATE_ADD(NOW(), INTERVAL ? MINUTE))"
    );
    $stmt->bind_param(
        'ssiiiisii',
        $juegoCodigo,
        $modo,
        $plazoTurnoMinutos,
        $retadorId,
        $retadoId,
        $semilla,
        $tableroDuelo,
        $turnoDeDuelo,
        $expiraMinutos
    );
    $stmt->execute();
    $desafioId = $conn->insert_id;
    $stmt->close();

    $stmt = $conn->prepare(
        "UPDATE JuegoSala SET DesafioId = ?, Estado = 'jugando', IniciadaEn = NOW() WHERE SalaId = ?"
    );
    $stmt->bind_param('ii', $desafioId, $salaId);
    $stmt->execute();
    $stmt->close();

    if (!rh_juego_es_bot($conn, $retadoId)) {
        rh_notificar($conn, [$retadoId], 'juego_desafio', 'Arrancó la partida',
            rh_juego_nombre($conn, $userId) . ' inició la sala de ' . rh_juego_titulo($juegoCodigo),
            rh_hueplay_ruta_duelo($juegoCodigo, $desafioId, (int) $semilla), ['juegoCodigo' => $juegoCodigo]);
    }

    $salaFinal = rh_sala_obtener($conn, $salaId);
    $jugadoresFinal = rh_sala_jugadores($conn, $salaId);
    $salaSerializada = rh_sala_serializar($conn, $salaFinal, $jugadoresFinal, $userId);
    $salaSerializada['juegoModo'] = $modo;
    $salaSerializada['desafioId'] = (int) $desafioId;
    $salaSerializada['semilla'] = (int) $semilla;

    json_success(['sala' => $salaSerializada, 'jugadasIA' => [], 'estadoRummy' => null, 'estadoScrabble' => null]);
}

if ($juegoCodigo === 'hueludo') {
    $tablero = rh_ludo_inicial(count($jugadores));
} elseif ($juegoCodigo === 'hueludoroyal') {
    $tablero = rh_ludoroyal_inicial(count($jugadores));
} elseif ($juegoCodigo === 'huerummy') {
    $tablero = rh_rummy_inicial(count($jugadores));
} elseif ($juegoCodigo === 'huescrabble') {
    $tablero = rh_scrabble_inicial(count($jugadores));
} else {
    json_error('Juego de sala desconocido');
}

usort($jugadores, fn ($a, $b) => (int) $a['Posicion'] <=> (int) $b['Posicion']);
$primerTurno = (int) $jugadores[0]['SalaJugadorId'];
$plazo = (int) $sala['PlazoTurnoMinutos'];

$stmt = $conn->prepare(
    "UPDATE JuegoSala
        SET Tablero = ?, Estado = 'jugando', TurnoDeSalaJugadorId = ?,
            TurnoVenceEn = DATE_ADD(NOW(), INTERVAL ? MINUTE), IniciadaEn = NOW()
      WHERE SalaId = ?"
);
$stmt->bind_param('siii', $tablero, $primerTurno, $plazo, $salaId);
$stmt->execute();
$stmt->close();

$humanos = array_values(array_filter($jugadores, fn ($j) => !rh_juego_es_bot($conn, (int) $j['UserId'])));
$humanoIds = array_map(fn ($j) => (int) $j['UserId'], $humanos);
if ($humanoIds) {
    $otros = array_values(array_filter($humanoIds, fn ($id) => $id !== $userId));
    if ($otros) {
        rh_notificar($conn, $otros, 'juego_desafio', 'Arrancó la partida',
            rh_juego_nombre($conn, $userId) . ' inició la sala de ' . rh_juego_titulo($juegoCodigo),
            rh_hueplay_ruta_bandeja('tuTurno'), ['juegoCodigo' => $juegoCodigo]);
    }
}

$sala = rh_sala_obtener($conn, $salaId);
$jugadores = rh_sala_jugadores($conn, $salaId);

$jugadasIA = [];
if ($juegoCodigo === 'hueludo') {
    $resultado = rh_ludo_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
} elseif ($juegoCodigo === 'hueludoroyal') {
    $resultado = rh_ludoroyal_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
} elseif ($juegoCodigo === 'huerummy') {
    $resultado = rh_rummy_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
} elseif ($juegoCodigo === 'huescrabble') {
    $resultado = rh_scrabble_sala_resolver_ia_en_cadena($conn, $sala, $jugadores);
    $sala = $resultado['sala'];
    $jugadores = $resultado['jugadores'];
    $jugadasIA = $resultado['jugadasIA'];
}

$salaSerializada = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$estadoRummy = null;
$estadoScrabble = null;

if ($juegoCodigo === 'hueludo' || $juegoCodigo === 'hueludoroyal') {
    $salaSerializada['tablero'] = $sala['Tablero'];
} elseif ($juegoCodigo === 'huerummy' && $salaSerializada['miAsientoId'] !== null) {
    $miPosicion = null;
    foreach ($jugadores as $j) {
        if ((int) $j['SalaJugadorId'] === $salaSerializada['miAsientoId']) {
            $miPosicion = (int) $j['Posicion'];
            break;
        }
    }
    if ($miPosicion !== null) {
        $estadoRummy = rh_rummy_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
    }
} elseif ($juegoCodigo === 'huescrabble' && $salaSerializada['miAsientoId'] !== null) {
    $miPosicion = null;
    foreach ($jugadores as $j) {
        if ((int) $j['SalaJugadorId'] === $salaSerializada['miAsientoId']) {
            $miPosicion = (int) $j['Posicion'];
            break;
        }
    }
    if ($miPosicion !== null) {
        $estadoScrabble = rh_scrabble_estado_visible(json_decode($sala['Tablero'], true), $miPosicion);
    }
}

json_success(['sala' => $salaSerializada, 'jugadasIA' => $jugadasIA, 'estadoRummy' => $estadoRummy, 'estadoScrabble' => $estadoScrabble]);
