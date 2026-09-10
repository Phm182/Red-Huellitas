<?php
/**
 * Arma una sala de hasta 4 jugadores (por ahora sólo HueLudo). Quien crea
 * queda adentro ya aceptado; a cada invitado puntual se le crea un asiento
 * 'invitado' y se le avisa — el resto se puede sumar después con el código.
 *
 * Por default la sala es PÚBLICA: aparece en el visualizador de salas
 * abiertas y cualquiera con cupo libre se suma sin código. Se manda
 * `esPublica` = '0' para armarla privada.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/salas.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_POST['juegoCodigo'] ?? '');
if (!rh_juego_existe($juegoCodigo) || rh_juego_modo($juegoCodigo) !== 'sala') {
    json_error('Este juego no se juega en salas');
}

$maxJugadores = (int) ($_POST['maxJugadores'] ?? 4);
if ($maxJugadores < 2 || $maxJugadores > 4) {
    json_error('La sala admite entre 2 y 4 jugadores');
}

$completarConIA = !empty($_POST['completarConIA']);

$esPublica = !isset($_POST['esPublica']) || $_POST['esPublica'] === '1' || $_POST['esPublica'] === 1 || $_POST['esPublica'] === true;

$politicaAbandono = trim($_POST['politicaAbandono'] ?? 'espera');
if (!in_array($politicaAbandono, ['ia', 'espera', 'expulsa'], true)) {
    json_error('Política de abandono desconocida');
}

$plazoTurnoMinutos = (int) ($_POST['plazoTurnoMinutos'] ?? 1440);
if ($plazoTurnoMinutos < 3 || $plazoTurnoMinutos > 10080) {
    json_error('El plazo debe ser entre 3 minutos y 7 días');
}

$invitadosUserIds = [];
$invitadosRaw = trim($_POST['invitadosUserIds'] ?? '');
if ($invitadosRaw !== '') {
    foreach (explode(',', $invitadosRaw) as $id) {
        $id = (int) trim($id);
        if ($id > 0) {
            $invitadosUserIds[] = $id;
        }
    }
}
if (count($invitadosUserIds) > $maxJugadores - 1) {
    json_error('Invitaste a más gente de la que entra en la sala');
}

$sala = rh_sala_crear(
    $conn,
    $userId,
    $juegoCodigo,
    $maxJugadores,
    $completarConIA,
    $politicaAbandono,
    $plazoTurnoMinutos,
    $invitadosUserIds
);

// `EsPublica` (columna nueva, ver sql/067) tiene default 1 — sólo se toca si
// quien arma la marcó privada. Va como UPDATE aparte para no cambiar la
// firma de `rh_sala_crear()`.
if (!$esPublica) {
    $salaId = (int) $sala['SalaId'];
    $stmt = $conn->prepare('UPDATE JuegoSala SET EsPublica = 0 WHERE SalaId = ?');
    $stmt->bind_param('i', $salaId);
    $stmt->execute();
    $stmt->close();
    $sala['EsPublica'] = 0;
}

$jugadores = rh_sala_jugadores($conn, (int) $sala['SalaId']);
$item = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$item['esPublica'] = (bool) ($sala['EsPublica'] ?? 1);
json_success(['sala' => $item]);
