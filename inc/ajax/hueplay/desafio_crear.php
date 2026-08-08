<?php
/**
 * Retar a alguien, o jugar en modo solitario contra la IA.
 *
 * Se puede retar a cualquiera, lo sigas o no — es lo pedido, y a diferencia del
 * chat un desafío no abre un canal para mandar texto, así que no toca la
 * protección de menores. Lo único que se comparte es un número.
 *
 * `contraIA=1` reemplaza al rival por la cuenta bot del sistema: el humano
 * siempre queda como retador. Si le toca arrancar al bot (mitad de las veces,
 * por la paridad de la semilla), su jugada de apertura se resuelve acá mismo,
 * antes de responder — así el cliente nunca hace polling esperándolo.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/hueconecta.php';
require_once __DIR__ . '/../../funciones/damas.php';
require_once __DIR__ . '/../../funciones/ajedrez.php';

$userId = rh_require_auth($conn);

$codigo = trim($_POST['juegoCodigo'] ?? '');
$contraIA = !empty($_POST['contraIA']);
$modo = rh_juego_modo($codigo);

if (!rh_juego_existe($codigo)) {
    json_error('Juego desconocido');
}

if ($contraIA) {
    if (!rh_juego_ia_disponible($codigo)) {
        json_error('Este juego todavía no tiene modo contra la IA');
    }
    $rivalId = rh_juego_bot_user_id($conn);
    if ($rivalId <= 0) {
        json_error('La IA no está disponible ahora', 503);
    }
    // El plazo de turno no aplica: el bot nunca hace esperar a nadie.
    $plazoTurnoHoras = 24;
} else {
    $rivalId = (int) ($_POST['rivalUserId'] ?? 0);
    if ($rivalId <= 0) {
        json_error('Falta el rival');
    }
    if ($rivalId === $userId) {
        json_error('No podés retarte a vos mismo');
    }

    $stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A' AND EsBot = 0");
    $stmt->bind_param('i', $rivalId);
    $stmt->execute();
    $rival = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$rival) {
        json_error('Ese usuario no existe', 404);
    }

    $plazoTurnoHoras = 24;
    if ($modo === 'turnos') {
        $plazoTurnoHoras = isset($_POST['plazoTurnoHoras']) ? (int) $_POST['plazoTurnoHoras'] : 24;
        if ($plazoTurnoHoras < 1 || $plazoTurnoHoras > 24) {
            json_error('El plazo debe ser entre 1 y 24 horas');
        }
    }
}

// Un duelo abierto por vez con la misma persona en el mismo juego: si no, se
// puede empapelar a alguien con cien desafíos y la bandeja queda inservible.
// Aplica igual contra la IA (no tiene sentido tener 3 partidas de Damas contra
// la app abiertas a la vez).
$stmt = $conn->prepare(
    "SELECT DesafioId FROM JuegoDesafio
      WHERE JuegoCodigo = ? AND Estado IN ('pendiente','aceptado') AND ExpiraEn > NOW()
        AND ((UserIdRetador = ? AND UserIdRetado = ?) OR (UserIdRetador = ? AND UserIdRetado = ?))"
);
$stmt->bind_param('siiii', $codigo, $userId, $rivalId, $rivalId, $userId);
$stmt->execute();
$abierto = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($abierto) {
    json_error('Ya tenés un duelo en curso con esta persona', 409);
}

$semilla = rh_juego_semilla();
$dias = RH_DESAFIO_DIAS;

// En modo turnos hay que arrancar el tablero y decidir quién mueve primero.
// Quién empieza sale de la paridad de la semilla y no de "siempre el retador":
// en un juego de turnos mover primero es una ventaja real, así que dejársela
// siempre a quien invita convertiría el botón de retar en una ventaja.
$tablero = null;
$turnoDe = null;
if ($modo === 'turnos') {
    if ($codigo === 'huedamas') {
        $tablero = rh_damas_inicial();
    } elseif ($codigo === 'hueajedrez') {
        $tablero = rh_ajedrez_inicial();
    } else {
        $tablero = rh_c4_vacio();
    }
    $turnoDe = $semilla % 2 === 0 ? $userId : $rivalId;
}

if ($modo === 'turnos') {
    $stmt = $conn->prepare(
        'INSERT INTO JuegoDesafio (JuegoCodigo, Modo, PlazoTurnoHoras, UserIdRetador, UserIdRetado, Semilla, Tablero, TurnoDeUserId, ExpiraEn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? HOUR))'
    );
    $stmt->bind_param('ssiiiisii', $codigo, $modo, $plazoTurnoHoras, $userId, $rivalId, $semilla, $tablero, $turnoDe, $plazoTurnoHoras);
} else {
    $stmt = $conn->prepare(
        'INSERT INTO JuegoDesafio (JuegoCodigo, Modo, PlazoTurnoHoras, UserIdRetador, UserIdRetado, Semilla, Tablero, TurnoDeUserId, ExpiraEn)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))'
    );
    $stmt->bind_param('ssiiiisii', $codigo, $modo, $plazoTurnoHoras, $userId, $rivalId, $semilla, $tablero, $turnoDe, $dias);
}
$stmt->execute();
$desafioId = $conn->insert_id;
$stmt->close();

// Si le toca arrancar al bot, se resuelve acá mismo: el humano nunca ve un
// duelo "esperando" a un rival que en realidad responde al instante.
if ($contraIA && $turnoDe === $rivalId && in_array($codigo, ['huedamas', 'hueajedrez'], true)) {
    $tablas = false;
    if ($codigo === 'huedamas') {
        $resultado = rh_damas_turno_ia($tablero, 2); // el bot siempre es el retado
    } else {
        $resultado = rh_ajedrez_turno_ia($tablero, 2);
        $tablas = $resultado['tablas'];
    }
    $tablero = $resultado['tablero'];
    $movimientos = $resultado['jugada'] !== null ? 1 : 0;

    if ($resultado['terminoLado'] !== null || $tablas) {
        // terminoLado=2 -> perdió el bot (no debería pasar desde el inicio,
        // pero se cubre); terminoLado=1 -> perdió el humano; tablas -> nadie.
        $ganador = $tablas ? null : ($resultado['terminoLado'] === 1 ? $rivalId : $userId);
        if ($codigo === 'huedamas') {
            $puntosRetador = $ganador === $userId ? rh_damas_puntos(true) : rh_damas_puntos(false);
            $puntosRetado = $ganador === $rivalId ? rh_damas_puntos(true) : rh_damas_puntos(false);
        } else {
            $puntosRetador = rh_ajedrez_puntos($ganador === $userId, $tablas);
            $puntosRetado = rh_ajedrez_puntos($ganador === $rivalId, $tablas);
        }

        $stmt = $conn->prepare('UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ? WHERE DesafioId = ?');
        $stmt->bind_param('sii', $tablero, $movimientos, $desafioId);
        $stmt->execute();
        $stmt->close();

        $d = ['DesafioId' => $desafioId, 'UserIdRetador' => $userId, 'UserIdRetado' => $rivalId, 'JuegoCodigo' => $codigo];
        rh_juego_cerrar_desafio_turnos($conn, $d, $ganador, $puntosRetador, $puntosRetado);
    } else {
        $stmt = $conn->prepare(
            "UPDATE JuegoDesafio SET Tablero = ?, Movimientos = ?, TurnoDeUserId = ?, Estado = 'aceptado' WHERE DesafioId = ?"
        );
        $stmt->bind_param('siii', $tablero, $movimientos, $userId, $desafioId);
        $stmt->execute();
        $stmt->close();
    }
}

if (!$contraIA) {
    $nombreJuego = rh_juego_titulo($codigo);
    rh_notificar(
        $conn,
        [$rivalId],
        'juego_desafio',
        'Te retaron a jugar',
        rh_juego_nombre($conn, $userId) . ' te retó en ' . $nombreJuego,
        '/(app)/hueplay/desafios',
        ['actorUserId' => $userId]
    );
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['desafio' => rh_juego_serializar_desafio($conn, $d, $userId)]);
