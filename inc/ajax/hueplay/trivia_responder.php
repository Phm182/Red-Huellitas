<?php
/**
 * Cierre de una partida de HueTrivia.
 *
 * El cliente manda qué eligió en cada pregunta; **el servidor corrige y calcula
 * los puntos**. A diferencia de HueMatch y HueMemo, acá el puntaje no se le
 * cree al cliente: se deduce de las respuestas, así que no hay nada que acotar
 * con un techo.
 *
 * Sirve tanto para una partida suelta como para un duelo: si viene `desafioId`,
 * el puntaje calculado entra por el mismo camino que los otros juegos.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/huetrivia.php';

$userId = rh_require_auth($conn);

$semilla = (int) ($_POST['semilla'] ?? 0);
$idiomaPedido = trim($_POST['idioma'] ?? 'es');
$duracion = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : 0;
$desafioId = isset($_POST['desafioId']) && $_POST['desafioId'] !== '' ? (int) $_POST['desafioId'] : null;
$crudas = $_POST['respuestas'] ?? '';

if ($semilla <= 0) {
    json_error('Falta la semilla');
}

$respuestas = json_decode($crudas, true);
if (!is_array($respuestas)) {
    json_error('Respuestas inválidas');
}

$idioma = rh_trivia_idioma($conn, $idiomaPedido);
$correccion = rh_trivia_corregir($conn, $semilla, $idioma, $respuestas);

if ($correccion['total'] === 0) {
    json_error('No hay preguntas cargadas', 503);
}

$duracion = max(0, min($duracion, $correccion['total'] * RH_TRIVIA_SEGUNDOS));
$puntos = rh_trivia_puntos($correccion['aciertos'], $correccion['total'], $duracion);

// --- Duelo -----------------------------------------------------------------
if ($desafioId !== null) {
    $stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
    $stmt->bind_param('i', $desafioId);
    $stmt->execute();
    $d = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$d) {
        json_error('El desafío no existe', 404);
    }
    if ($d['JuegoCodigo'] !== 'huetrivia') {
        json_error('Ese duelo no es de HueTrivia');
    }
    // La semilla la manda el cliente, pero tiene que ser la del duelo: si no,
    // se podría pedir una tanda de preguntas fáciles y responder esa.
    if ((int) $d['Semilla'] !== $semilla) {
        json_error('La semilla no corresponde a este duelo', 409);
    }

    $soyRetador = (int) $d['UserIdRetador'] === $userId;
    $soyRetado = (int) $d['UserIdRetado'] === $userId;
    if (!$soyRetador && !$soyRetado) {
        json_error('Este desafío no es tuyo', 403);
    }
    if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
        json_error('Este desafío ya está cerrado', 409);
    }
    if (strtotime($d['ExpiraEn']) <= time()) {
        json_error('El desafío venció', 409);
    }

    $columna = $soyRetador ? 'PuntosRetador' : 'PuntosRetado';
    $stmt = $conn->prepare(
        "UPDATE JuegoDesafio SET $columna = ?, Estado = 'aceptado' WHERE DesafioId = ? AND $columna IS NULL"
    );
    $stmt->bind_param('ii', $puntos, $desafioId);
    $stmt->execute();
    $afectadas = $stmt->affected_rows;
    $stmt->close();

    if ($afectadas === 0) {
        json_error('Ya jugaste este desafío', 409);
    }

    $progreso = rh_juego_registrar_partida($conn, $userId, 'huetrivia', $puntos, $duracion, $desafioId);

    $stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
    $stmt->bind_param('i', $desafioId);
    $stmt->execute();
    $d = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $cierre = rh_juego_resolver_desafio($conn, $d);

    if ($cierre['cerrado']) {
        $retador = (int) $d['UserIdRetador'];
        $retado = (int) $d['UserIdRetado'];
        $ganador = $cierre['ganadorUserId'];
        $titulo = rh_juego_titulo('huetrivia');

        if ($ganador === null) {
            rh_notificar($conn, [$retador, $retado], 'juego_desafio_fin', 'Empate en ' . $titulo,
                'El duelo terminó empatado', '/(app)/hueplay/desafios');
        } else {
            $perdedor = $ganador === $retador ? $retado : $retador;
            rh_notificar($conn, [$ganador], 'juego_desafio_fin', '¡Ganaste el duelo!',
                'Le ganaste a ' . rh_juego_nombre($conn, $perdedor) . ' en ' . $titulo, '/(app)/hueplay/desafios');
            rh_notificar($conn, [$perdedor], 'juego_desafio_fin', 'Perdiste el duelo',
                rh_juego_nombre($conn, $ganador) . ' te ganó en ' . $titulo, '/(app)/hueplay/desafios');
        }

        $stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
        $stmt->bind_param('i', $desafioId);
        $stmt->execute();
        $d = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    } else {
        rh_notificar($conn, [$soyRetador ? (int) $d['UserIdRetado'] : (int) $d['UserIdRetador']],
            'juego_desafio', 'Te toca jugar',
            rh_juego_nombre($conn, $userId) . ' ya jugó su partida en ' . rh_juego_titulo('huetrivia'),
            '/(app)/hueplay/desafios', ['actorUserId' => $userId]);
    }

    json_success([
        'aciertos' => $correccion['aciertos'],
        'total' => $correccion['total'],
        'puntos' => $puntos,
        'detalle' => $correccion['detalle'],
        'progreso' => $progreso,
        'desafio' => rh_juego_serializar_desafio($conn, $d, $userId),
    ]);
}

// --- Partida suelta --------------------------------------------------------
$recordAntes = rh_juego_record($conn, $userId, 'huetrivia');
$progreso = rh_juego_registrar_partida($conn, $userId, 'huetrivia', $puntos, $duracion);

json_success([
    'aciertos' => $correccion['aciertos'],
    'total' => $correccion['total'],
    'puntos' => $puntos,
    'detalle' => $correccion['detalle'],
    'progreso' => $progreso,
    'esRecord' => $puntos > $recordAntes,
]);
