<?php
/**
 * Arma una sala. Dos usos:
 *  - Juegos de sala (HueLudo, HueRummy…): hasta 4 asientos.
 *  - Juegos de duelo 1v1 (HueAjedrez, HuePool, HueCrush…): sala de 2 que
 *    hace de lobby; al iniciar genera el `JuegoDesafio` (ver `sala_iniciar`).
 *
 * Quien crea queda adentro ya aceptado; a cada invitado puntual se le crea
 * un asiento 'invitado' y se le avisa — el resto se puede sumar después con
 * el código.
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
require_once __DIR__ . '/../../funciones/desafio_tablero.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_POST['juegoCodigo'] ?? '');
if (!rh_juego_existe($juegoCodigo) || (rh_juego_modo($juegoCodigo) !== 'sala' && !rh_juego_es_duelo($juegoCodigo))) {
    json_error('Este juego no se juega en salas');
}

// Los juegos de duelo son siempre sala de 2, sin IA de relleno ni política
// de abandono: el vencimiento propio del `JuegoDesafio` cubre al que no
// aparece, y para jugar contra la app ya está el botón de la IA en "Retar".
$esDuelo = rh_juego_es_duelo($juegoCodigo);

$maxJugadores = $esDuelo ? 2 : (int) ($_POST['maxJugadores'] ?? 4);
if ($maxJugadores < 2 || $maxJugadores > 4) {
    json_error('La sala admite entre 2 y 4 jugadores');
}

$completarConIA = !$esDuelo && !empty($_POST['completarConIA']);

$esPublica = !isset($_POST['esPublica']) || $_POST['esPublica'] === '1' || $_POST['esPublica'] === 1 || $_POST['esPublica'] === true;

$politicaAbandono = $esDuelo ? 'espera' : trim($_POST['politicaAbandono'] ?? 'espera');
if (!in_array($politicaAbandono, ['ia', 'espera', 'expulsa'], true)) {
    json_error('Política de abandono desconocida');
}

$plazoTurnoSegundos = (int) ($_POST['plazoTurnoSegundos'] ?? 86400);
if ($plazoTurnoSegundos < 30 || $plazoTurnoSegundos > 604800) {
    json_error('El plazo debe ser entre 30 segundos y 7 días');
}

// Plazo de la partida entera (sólo salas de duelo): se guarda para pasárselo
// al JuegoDesafio al iniciar. 0 = sin límite.
$plazoPartidaMinutos = $esDuelo ? (int) ($_POST['plazoPartidaMinutos'] ?? 0) : 0;
if ($plazoPartidaMinutos !== 0 && ($plazoPartidaMinutos < 10 || $plazoPartidaMinutos > 20160)) {
    json_error('El plazo de partida debe ser entre 10 minutos y 14 días');
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
    $plazoTurnoSegundos,
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

if ($plazoPartidaMinutos > 0) {
    $salaId = (int) $sala['SalaId'];
    $stmt = $conn->prepare('UPDATE JuegoSala SET PlazoPartidaMinutos = ? WHERE SalaId = ?');
    $stmt->bind_param('ii', $plazoPartidaMinutos, $salaId);
    $stmt->execute();
    $stmt->close();
    $sala['PlazoPartidaMinutos'] = $plazoPartidaMinutos;
}

$jugadores = rh_sala_jugadores($conn, (int) $sala['SalaId']);
$item = rh_sala_serializar($conn, $sala, $jugadores, $userId);
$item['esPublica'] = (bool) ($sala['EsPublica'] ?? 1);
json_success(['sala' => $item]);
