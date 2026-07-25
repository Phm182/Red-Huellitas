<?php
/**
 * Validadores de input para Red Huellitas.
 */

function rh_validar_email(string $email): bool
{
    return filter_var($email, FILTER_VALIDATE_EMAIL) !== false && strlen($email) <= 190;
}

function rh_validar_password(string $password): bool
{
    return strlen($password) >= 8;
}

function rh_validar_username(string $username): bool
{
    return (bool) preg_match('/^[a-z0-9_.]{3,30}$/', $username);
}

function rh_validar_whatsapp(string $numero): bool
{
    // Acepta +54911xxxxxxx o variantes numéricas simples, 8 a 20 caracteres.
    return (bool) preg_match('/^\+?[0-9]{8,20}$/', $numero);
}

const RH_MIME_IMAGENES_PERMITIDAS = ['image/jpeg', 'image/png'];
const RH_EXT_IMAGENES_PERMITIDAS = ['jpg', 'jpeg', 'png'];
const RH_MAX_IMAGEN_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Valida un archivo subido vía $_FILES['campo'] usando el mime real (finfo),
 * no el Content-Type declarado por el cliente. Devuelve un mensaje de error
 * (string) o null si es válido.
 */
function rh_validar_imagen_subida(array $file): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return 'Error al subir el archivo';
    }

    if (($file['size'] ?? 0) > RH_MAX_IMAGEN_BYTES) {
        return 'El archivo supera el tamaño máximo permitido (8MB)';
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, RH_MIME_IMAGENES_PERMITIDAS, true)) {
        return 'Formato de imagen no permitido (solo JPG/PNG)';
    }

    return null;
}

function rh_extension_para_mime(string $mime): string
{
    return $mime === 'image/png' ? 'png' : 'jpg';
}

const RH_MIME_VIDEOS_PERMITIDOS = ['video/mp4', 'video/quicktime'];
const RH_MAX_VIDEO_BYTES = 60 * 1024 * 1024; // 60MB
const RH_MAX_VIDEO_DURACION_SEGUNDOS = 60;

/**
 * Valida un video subido vía $_FILES['campo']: tamaño, mime real (finfo, no
 * el Content-Type del cliente) y duración declarada por el picker del cliente
 * (no hay lector de duración de video en el servidor sin una librería extra
 * tipo getID3, así que la duración real del archivo no se re-verifica acá).
 * Devuelve un mensaje de error (string) o null si es válido.
 */
function rh_validar_video_subido(array $file, ?int $duracionSegundos): ?string
{
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        return 'Error al subir el archivo';
    }

    if (($file['size'] ?? 0) > RH_MAX_VIDEO_BYTES) {
        return 'El video supera el tamaño máximo permitido (60MB)';
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, RH_MIME_VIDEOS_PERMITIDOS, true)) {
        return 'Formato de video no permitido (solo MP4/MOV)';
    }

    if ($duracionSegundos === null || $duracionSegundos <= 0) {
        return 'Falta la duración del video';
    }

    if ($duracionSegundos > RH_MAX_VIDEO_DURACION_SEGUNDOS) {
        return 'El video supera la duración máxima permitida (60 segundos)';
    }

    return null;
}

function rh_extension_para_mime_video(string $mime): string
{
    return $mime === 'video/quicktime' ? 'mov' : 'mp4';
}
