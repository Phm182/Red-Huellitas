<?php
/**
 * Retar a alguien.
 *
 * Se puede retar a cualquiera, lo sigas o no — es lo pedido, y a diferencia del
 * chat un desafío no abre un canal para mandar texto, así que no toca la
 * protección de menores. Lo único que se comparte es un número.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/hueconecta.php';

$userId = rh_require_auth($conn);

$codigo = trim($_POST['juegoCodigo'] ?? '');
$rivalId = (int) ($_POST['rivalUserId'] ?? 0);

if (!rh_juego_existe($codigo)) {
    json_error('Juego desconocido');
}
if ($rivalId <= 0) {
    json_error('Falta el rival');
}
if ($rivalId === $userId) {
    json_error('No podés retarte a vos mismo');
}

$stmt = $conn->prepare("SELECT UserId FROM Usuario WHERE UserId = ? AND Estado = 'A'");
$stmt->bind_param('i', $rivalId);
$stmt->execute();
$rival = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$rival) {
    json_error('Ese usuario no existe', 404);
}

// Un duelo abierto por vez con la misma persona en el mismo juego: si no, se
// puede empapelar a alguien con cien desafíos y la bandeja queda inservible.
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
$modo = rh_juego_modo($codigo);

// En modo turnos hay que arrancar el tablero y decidir quién mueve primero.
// Quién empieza sale de la paridad de la semilla y no de "siempre el retador":
// en Conecta 4 mover primero es una ventaja real, así que dejársela siempre a
// quien invita convertiría el botón de retar en una ventaja.
$tablero = null;
$turnoDe = null;
if ($modo === 'turnos') {
    $tablero = rh_c4_vacio();
    $turnoDe = $semilla % 2 === 0 ? $userId : $rivalId;
}

$stmt = $conn->prepare(
    'INSERT INTO JuegoDesafio (JuegoCodigo, Modo, UserIdRetador, UserIdRetado, Semilla, Tablero, TurnoDeUserId, ExpiraEn)
     VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))'
);
$stmt->bind_param('ssiiisii', $codigo, $modo, $userId, $rivalId, $semilla, $tablero, $turnoDe, $dias);
$stmt->execute();
$desafioId = $conn->insert_id;
$stmt->close();

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

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['desafio' => rh_juego_serializar_desafio($conn, $d, $userId)]);
