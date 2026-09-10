<?php
/**
 * Crea un torneo de un juego de duelo 1v1. Quien lo crea queda inscripto; a
 * cada invitado puntual se le crea la inscripción y se le avisa. El resto se
 * suma con el código o desde el visualizador de torneos abiertos.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_POST['juegoCodigo'] ?? '');
if (!rh_juego_existe($juegoCodigo) || !rh_juego_es_duelo($juegoCodigo)) {
    json_error('Este juego no arma torneos');
}

$formato = trim($_POST['formato'] ?? 'eliminacion');
if (!in_array($formato, ['eliminacion', 'liga'], true)) {
    json_error('Formato desconocido');
}

$tamano = (int) ($_POST['tamano'] ?? 8);
if (!in_array($tamano, RH_TORNEO_TAMANOS, true)) {
    json_error('El torneo admite 4, 8 o 16 jugadores');
}

$esPublico = !isset($_POST['esPublico']) || $_POST['esPublico'] === '1' || $_POST['esPublico'] === 1 || $_POST['esPublico'] === true;

$plazoTurnoSegundos = (int) ($_POST['plazoTurnoSegundos'] ?? 86400);
if ($plazoTurnoSegundos < 30 || $plazoTurnoSegundos > 604800) {
    json_error('El plazo por turno debe ser entre 30 segundos y 7 días');
}

$plazoRondaMinutos = (int) ($_POST['plazoRondaMinutos'] ?? 0);
if ($plazoRondaMinutos !== 0 && ($plazoRondaMinutos < 10 || $plazoRondaMinutos > 20160)) {
    json_error('El plazo por ronda debe ser entre 10 minutos y 14 días');
}

$invitados = [];
$raw = trim($_POST['invitadosUserIds'] ?? '');
if ($raw !== '') {
    foreach (explode(',', $raw) as $id) {
        $id = (int) trim($id);
        if ($id > 0) {
            $invitados[] = $id;
        }
    }
}
if (count($invitados) > $tamano - 1) {
    json_error('Invitaste a más gente de la que entra en el torneo');
}

$torneo = rh_torneo_crear(
    $conn,
    $userId,
    $juegoCodigo,
    $formato,
    $tamano,
    $esPublico,
    $plazoTurnoSegundos,
    $plazoRondaMinutos,
    $invitados
);

json_success(['torneo' => rh_torneo_serializar($conn, $torneo, $userId)]);
