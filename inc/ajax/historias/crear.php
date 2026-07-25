<?php
/**
 * Crear una Historia. Sin gate de verificación (a diferencia de Publicaciones
 * y Shorts) — contenido efímero de menor riesgo; sumar el gate después es
 * trivial si se decide dar paridad.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/historias.php';

$userId = rh_require_auth($conn);

$tipoMedia = $_POST['tipoMedia'] ?? '';
if (!in_array($tipoMedia, ['foto', 'video'], true)) {
    json_error("tipoMedia debe ser 'foto' o 'video'");
}

if (!isset($_FILES['media'])) {
    json_error('Falta el archivo de la historia');
}

$duracionSegundos = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

if ($tipoMedia === 'video') {
    $error = rh_validar_video_subido($_FILES['media'], $duracionSegundos);
    if ($error) {
        json_error("Video inválido: $error");
    }
} else {
    $error = rh_validar_imagen_subida($_FILES['media']);
    if ($error) {
        json_error("Imagen inválida: $error");
    }
    $duracionSegundos = null;
}

$stmt = $conn->prepare(
    'INSERT INTO Historia (UserId, TipoMedia, MediaPath, DuracionSegundos, ExpiraEn)
     VALUES (?, ?, ?, ?, NOW() + INTERVAL 24 HOUR)'
);
// MediaPath se completa después de guardar el archivo (necesita el HistoriaId).
$vacio = '';
$stmt->bind_param('issi', $userId, $tipoMedia, $vacio, $duracionSegundos);
$stmt->execute();
$historiaId = (int) $stmt->insert_id;
$stmt->close();

$mediaPath = rh_guardar_media_historia($_FILES['media'], $userId, $tipoMedia);

$stmt = $conn->prepare('UPDATE Historia SET MediaPath = ? WHERE HistoriaId = ?');
$stmt->bind_param('si', $mediaPath, $historiaId);
$stmt->execute();
$stmt->close();

$stmt = $conn->prepare('SELECT * FROM Historia WHERE HistoriaId = ?');
$stmt->bind_param('i', $historiaId);
$stmt->execute();
$historia = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['historia' => rh_historia_publico($conn, $historia, $userId)], 'Historia creada', 201);
