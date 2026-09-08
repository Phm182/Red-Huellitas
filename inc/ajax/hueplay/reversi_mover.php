<?php
/**
 * Una jugada de HueReversi: colocar una ficha nueva en (fila,col).
 *
 * A diferencia de Damas, acá no hay "desde": el cliente sólo manda el
 * destino, y el servidor busca ese destino entre los movimientos legales que
 * ya le mandó `reversi_ver.php`.
 *
 * Regla propia de Reversi que Damas/Ajedrez no necesitan: si después de mi
 * jugada el rival no tiene ningún movimiento legal, su turno se salta — y si
 * yo tampoco tuviera en ese momento, el turno seguiría probando hasta
 * encontrar quién puede jugar, o terminar el juego si nadie puede. Con IA de
 * por medio esto se resuelve todo en la misma vuelta (el bot puede terminar
 * jugando varias veces seguidas si a mí me toca pasar).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/reversi.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
$hFila = isset($_POST['hFila']) ? (int) $_POST['hFila'] : -1;
$hCol = isset($_POST['hCol']) ? (int) $_POST['hCol'] : -1;

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
if ($d['JuegoCodigo'] !== 'huereversi' || $d['Modo'] !== 'turnos') {
    json_error('Este duelo no es de HueReversi');
}

$retador = (int) $d['UserIdRetador'];
$retado = (int) $d['UserIdRetado'];

if ($userId !== $retador && $userId !== $retado) {
    json_error('Este desafío no es tuyo', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este duelo ya terminó', 409);
}
if (strtotime($d['ExpiraEn']) <= time()) {
    json_error('El desafío venció', 409);
}
if ((int) $d['TurnoDeUserId'] !== $userId) {
    json_error('No es tu turno', 409);
}

$miLado = $userId === $retador ? 1 : 2;
$rivalLado = $miLado === 1 ? 2 : 1;
$rival = $userId === $retador ? $retado : $retador;
$tablero = $d['Tablero'];

$legales = rh_reversi_movimientos_legales($tablero, $miLado);
$candidato = null;
foreach ($legales as $m) {
    if ($m['fila'] === $hFila && $m['col'] === $hCol) {
        $candidato = $m;
        break;
    }
}

if ($candidato === null) {
    json_error('Movimiento ilegal', 409);
}

$tablero = rh_reversi_aplicar($tablero, $candidato, $miLado);
$movimientos = (int) $d['Movimientos'] + 1;

// Paso 1: persistir el tablero. El `WHERE TurnoDeUserId = ?` es el guard de
// concurrencia: si dos jugadas llegaran a la vez, la segunda no encuentra fila.
$stmt = $conn->prepare(
    "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?
      WHERE DesafioId = ? AND TurnoDeUserId = ? AND Estado IN ('pendiente','aceptado')"
);
$stmt->bind_param('siii', $tablero, $movimientos, $desafioId, $userId);
$stmt->execute();
$afectadas = $stmt->affected_rows;
$stmt->close();

if ($afectadas === 0) {
    json_error('No es tu turno', 409);
}

// Paso 2: averiguar a quién le toca de verdad (saltando al lado que no
// pueda jugar), resolviendo en el camino cualquier jugada de IA que
// corresponda, hasta llegar a "me toca a mí", "le toca a un rival humano" o
// "nadie puede: se terminó".
$jugadasIA = [];
$turnoActual = $rivalLado;

while (true) {
    if (!rh_reversi_sin_movimientos($tablero, $turnoActual)) {
        if ($turnoActual === $rivalLado && rh_juego_es_bot($conn, $rival)) {
            $resultado = rh_reversi_turno_ia($tablero, $rivalLado);
            if ($resultado === null) {
                // Salvaguarda: no debería pasar, ya confirmamos que puede jugar.
                break;
            }
            $tablero = $resultado['tablero'];
            $jugadasIA[] = $resultado['jugada'];
            $movimientos++;
            $turnoActual = $miLado;
            continue;
        }
        break;
    }
    $otro = $turnoActual === 1 ? 2 : 1;
    if (rh_reversi_sin_movimientos($tablero, $otro)) {
        $turnoActual = null;
        break;
    }
    $turnoActual = $otro;
}

$gane = false;
$perdiste = false;
$progreso = null;

if ($turnoActual === null) {
    // Ninguno de los dos puede jugar: se termina acá.
    $conteo = rh_reversi_contar($tablero);
    if ($conteo[$miLado] === $conteo[$rivalLado]) {
        $ganador = null;
    } else {
        $ganador = $conteo[$miLado] > $conteo[$rivalLado] ? $userId : $rival;
    }
    $gane = $ganador === $userId;
    $perdiste = $ganador !== null && $ganador !== $userId;

    $resultadoRetador = $ganador === null ? 'empate' : ($ganador === $retador ? 'gane' : 'perdio');
    $resultadoRetado = $ganador === null ? 'empate' : ($ganador === $retado ? 'gane' : 'perdio');
    $puntosRetador = rh_reversi_puntos($resultadoRetador);
    $puntosRetado = rh_reversi_puntos($resultadoRetado);

    // El tablero puede haber seguido cambiando después del primer UPDATE (la
    // cadena de jugadas de la IA de arriba) — hay que guardar esa versión
    // final antes de cerrar el desafío.
    $stmt = $conn->prepare('UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ? WHERE DesafioId = ?');
    $stmt->bind_param('sii', $tablero, $movimientos, $desafioId);
    $stmt->execute();
    $stmt->close();

    $d['Tablero'] = $tablero;
    $cierre = rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    $progreso = $userId === $retador ? $cierre['progresoRetador'] : $cierre['progresoRetado'];
} elseif ($turnoActual === $miLado) {
    // El rival (humano) se queda sin movimiento posible: el turno vuelve a
    // mí sin pasar por él. No hace falta avisarle nada — no le "tocaba" de
    // verdad.
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?, TurnoDeUserId = ?, Estado = 'aceptado' WHERE DesafioId = ?"
    );
    $stmt->bind_param('siii', $tablero, $movimientos, $userId, $desafioId);
    $stmt->execute();
    $stmt->close();
} else {
    // Caso normal: le toca de verdad a un rival humano.
    $stmt = $conn->prepare('UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ? WHERE DesafioId = ?');
    $stmt->bind_param('sii', $tablero, $movimientos, $desafioId);
    $stmt->execute();
    $stmt->close();

    rh_juego_avanzar_turno($conn, $desafioId, $rival, $userId, (int) $d['PlazoTurnoMinutos'], $d['JuegoCodigo']);
    rh_notificar($conn, [$rival], 'juego_desafio', 'Te toca jugar',
        rh_juego_nombre($conn, $userId) . ' ya movió en HueReversi', '/(app)/hueplay/desafios',
        ['actorUserId' => $userId, 'juegoCodigo' => $d['JuegoCodigo']]);
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    'jugada' => ['fila' => $candidato['fila'], 'col' => $candidato['col'], 'volteadas' => $candidato['volteadas']],
    'jugadasIA' => $jugadasIA,
    'gane' => $gane,
    'perdiste' => $perdiste,
    'progreso' => $progreso,
]);
