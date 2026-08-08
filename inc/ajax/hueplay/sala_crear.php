<?php
/**
 * Arma una sala de hasta 4 jugadores (por ahora sólo HueLudo). Quien crea
 * queda adentro ya aceptado; a cada invitado puntual se le crea un asiento
 * 'invitado' y se le avisa — el resto se puede sumar después con el código.
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

$politicaAbandono = trim($_POST['politicaAbandono'] ?? 'espera');
if (!in_array($politicaAbandono, ['ia', 'espera', 'expulsa'], true)) {
    json_error('Política de abandono desconocida');
}

$plazoTurnoHoras = (int) ($_POST['plazoTurnoHoras'] ?? 24);
if ($plazoTurnoHoras < 1 || $plazoTurnoHoras > 24) {
    json_error('El plazo debe ser entre 1 y 24 horas');
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
    $plazoTurnoHoras,
    $invitadosUserIds
);

$jugadores = rh_sala_jugadores($conn, (int) $sala['SalaId']);
json_success(['sala' => rh_sala_serializar($conn, $sala, $jugadores, $userId)]);
