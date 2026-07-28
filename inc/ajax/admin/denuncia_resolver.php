<?php
/**
 * Resuelve una denuncia: desestimar, o dar curso (revisada) con opción de
 * dar de baja el contenido y/o advertir al usuario denunciado.
 *
 * POST:
 *  - denunciaId
 *  - estado: revisada | desestimada
 *  - nota (opcional)
 *  - accion (opcional, sólo con revisada):
 *      baja_contenido — soft-delete del contenido denunciado
 *      baja_y_advertir — soft-delete + notificación de advertencia
 *      advertir — sólo notifica (sin baja; útil si el contenido ya no existe)
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/moderacion.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

$adminId = rh_require_admin($conn);

$denunciaId = (int) ($_POST['denunciaId'] ?? 0);
$estado = trim($_POST['estado'] ?? '');
$nota = trim($_POST['nota'] ?? '') ?: null;
$accion = trim($_POST['accion'] ?? '') ?: null;

if ($denunciaId <= 0) {
    json_error('Falta denunciaId');
}
if (!in_array($estado, ['revisada', 'desestimada'], true)) {
    json_error('estado inválido (revisada o desestimada)');
}
if ($accion !== null && !in_array($accion, ['baja_contenido', 'baja_y_advertir', 'advertir'], true)) {
    json_error('accion inválida');
}
if ($accion !== null && $estado !== 'revisada') {
    json_error('Las acciones de baja/aviso sólo aplican al marcar como revisada');
}

$stmt = $conn->prepare('SELECT * FROM Denuncia WHERE DenunciaId = ?');
$stmt->bind_param('i', $denunciaId);
$stmt->execute();
$denuncia = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$denuncia) {
    json_error('Denuncia no encontrada', 404);
}

$contenidoBajado = false;
$avisoEnviado = false;

if ($estado === 'revisada' && ($accion === 'baja_contenido' || $accion === 'baja_y_advertir')) {
    $contenidoBajado = rh_moderacion_bajar_contenido($conn, $denuncia);
}

if ($estado === 'revisada' && ($accion === 'advertir' || $accion === 'baja_y_advertir')) {
    $denunciadoId = (int) $denuncia['UserIdDenunciado'];
    $motivo = (string) $denuncia['Motivo'];
    $cuerpo = 'Un moderador revisó una denuncia sobre tu cuenta';
    if ($contenidoBajado) {
        $cuerpo = 'Se dio de baja contenido tuyo tras una denuncia. Motivo: ' . $motivo;
    } else {
        $cuerpo .= '. Motivo: ' . $motivo . '. Por favor respetá las normas de Red Huellitas (contenido animal / respeto).';
    }
    if ($nota) {
        $cuerpo .= ' Nota: ' . $nota;
    }

    rh_notificar(
        $conn,
        [$denunciadoId],
        'moderacion_advertencia',
        'Advertencia de moderación',
        $cuerpo,
        '/(app)/(tabs)/mas'
    );
    $avisoEnviado = true;
}

$stmt = $conn->prepare(
    'UPDATE Denuncia
     SET EstadoRevision = ?, NotaAdmin = ?, ResueltoPorUserId = ?, ResueltoEn = NOW()
     WHERE DenunciaId = ?'
);
$stmt->bind_param('ssii', $estado, $nota, $adminId, $denunciaId);
$stmt->execute();
$stmt->close();

$msg = 'Denuncia resuelta';
if ($contenidoBajado && $avisoEnviado) {
    $msg = 'Contenido dado de baja y usuario advertido';
} elseif ($contenidoBajado) {
    $msg = 'Contenido dado de baja';
} elseif ($avisoEnviado) {
    $msg = 'Usuario advertido';
} elseif ($estado === 'desestimada') {
    $msg = 'Denuncia desestimada';
}

json_success([
    'denunciaId' => $denunciaId,
    'estadoRevision' => $estado,
    'contenidoBajado' => $contenidoBajado,
    'avisoEnviado' => $avisoEnviado,
], $msg);
