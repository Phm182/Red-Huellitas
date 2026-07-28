<?php
/**
 * Dejar (o corregir) una calificación después de una campaña.
 *
 * Los dos sentidos entran por acá porque comparten todas las reglas menos
 * quién es el emisor: la campaña tiene que haber terminado, el que califica
 * tiene que haber estado, y no se puede calificar dos veces lo mismo.
 */

require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_POST['campaniaId'] ?? 0);
$paraTipo = trim($_POST['paraTipo'] ?? '');
$paraId = (int) ($_POST['paraId'] ?? 0);
$puntaje = (int) ($_POST['puntaje'] ?? 0);
$comentario = trim($_POST['comentario'] ?? '') ?: null;

if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}
if (!in_array($paraTipo, ['usuario', 'equipo'], true)) {
    json_error("paraTipo debe ser 'usuario' o 'equipo'");
}
if ($paraId <= 0) {
    json_error('Falta paraId');
}
if ($puntaje < 1 || $puntaje > 5) {
    json_error('El puntaje va de 1 a 5');
}
if ($comentario !== null && mb_strlen($comentario) > 600) {
    json_error('El comentario no puede superar los 600 caracteres');
}

$stmt = $conn->prepare("SELECT * FROM Campania WHERE CampaniaId = ? AND Estado = 'A'");
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}

// Calificar antes de que pase es opinar sobre algo que no ocurrió.
if (!rh_campania_termino($campania)) {
    json_error('Vas a poder calificar cuando termine la campaña', 409);
}

$organizador = rh_campania_organizador($campania);

$organizadorEsMio = $organizador['tipo'] === 'equipo'
    ? rh_equipo_puede_administrar($conn, $organizador['id'], $userId)
    : $organizador['id'] === $userId;

if ($paraTipo === $organizador['tipo'] && $paraId === $organizador['id']) {
    // --- El participante califica al organizador ---
    if ($organizadorEsMio) {
        json_error('No podés calificar tu propia campaña', 409);
    }

    $stmt = $conn->prepare(
        "SELECT Estado, Asistio FROM CampaniaInscripcion
         WHERE CampaniaId = ? AND UserId = ?"
    );
    $stmt->bind_param('ii', $campaniaId, $userId);
    $stmt->execute();
    $ins = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Sólo opina el que estuvo. Si quedó en lista de espera o se dio de baja
    // no vivió la campaña, y si el organizador ya marcó que no vino, tampoco.
    $estuvo = $ins
        && in_array($ins['Estado'], ['confirmada', 'ausente'], true)
        && $ins['Asistio'] !== 'no';

    if (!$estuvo) {
        json_error('Sólo pueden calificar los que participaron de la campaña', 403);
    }

    $deTipo = 'usuario';
    $deId = $userId;
} else {
    // --- El organizador califica a un participante ---
    if (!$organizadorEsMio) {
        json_error('No sos el organizador de esta campaña', 403);
    }
    if ($paraTipo !== 'usuario') {
        json_error('El organizador califica participantes, no equipos');
    }

    $stmt = $conn->prepare(
        'SELECT Estado FROM CampaniaInscripcion WHERE CampaniaId = ? AND UserId = ?'
    );
    $stmt->bind_param('ii', $campaniaId, $paraId);
    $stmt->execute();
    $ins = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$ins) {
        json_error('Esa persona no estuvo anotada en la campaña', 404);
    }
    if ($paraId === $userId) {
        json_error('No podés calificarte a vos mismo', 409);
    }

    $deTipo = $organizador['tipo'];
    $deId = $organizador['id'];
}

$yaEstaba = rh_calificacion_existente(
    $conn, 'campania', $campaniaId, $deTipo, $deId, $paraTipo, $paraId
);

$calificacionId = rh_calificacion_guardar(
    $conn,
    'campania',
    $campaniaId,
    $deTipo,
    $deId,
    $userId,
    $paraTipo,
    $paraId,
    $puntaje,
    $comentario
);

// Sólo se avisa la primera vez: corregir la propia nota no debería volver a
// molestar al otro.
if (!$yaEstaba && $paraTipo === 'usuario') {
    rh_notificar(
        $conn,
        [$paraId],
        'calificacion_recibida',
        'Te calificaron',
        'Dejaron una calificación por ' . $campania['Titulo'],
        '/(app)/campanias/' . $campaniaId,
        ['actorUserId' => $userId]
    );
}

json_success(
    [
        'calificacionId' => $calificacionId,
        'reputacion' => rh_reputacion($conn, $paraTipo, $paraId),
    ],
    $yaEstaba ? 'Calificación actualizada' : 'Gracias por calificar'
);
