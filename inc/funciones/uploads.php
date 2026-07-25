<?php
/**
 * Helpers de almacenamiento de imágenes para Red Huellitas.
 *
 * Verificación (DNI frente/dorso + selfie): inc/storage/verificacion/{UserId}/
 * protegido por .htaccess (Require all denied) — nunca se expone una URL pública.
 * Avatar: uploads/avatares/{UserId}.jpg — público, servido directo por Apache.
 * Fotos de mascota: uploads/mascotas/{MascotaId}/ — público (galería del perfil).
 * Carnet de vacunas: inc/storage/carnets/{MascotaId}/ — protegido por .htaccess,
 * el dueño decide si es pública o privada vía Mascota.CarnetVisibilidad (la
 * carpeta en sí SIEMPRE está protegida; cuando es "pública" se sirve a través
 * de carnet_ver.php, nunca con una URL directa — misma filosofía que Fase 1).
 */

function rh_dir_verificacion_usuario(int $userId): string
{
    $dir = __DIR__ . '/../storage/verificacion/' . $userId;
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    return $dir;
}

function rh_dir_avatares(): string
{
    $dir = __DIR__ . '/../../uploads/avatares';
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

function rh_nombre_archivo_random(string $mime): string
{
    return bin2hex(random_bytes(8)) . '.' . rh_extension_para_mime($mime);
}

/**
 * Normaliza $_FILES['campo'] cuando el campo es un input multi-archivo
 * (name="fotos[]"), donde PHP entrega name/type/tmp_name/error/size como
 * arrays paralelos en vez de un array de archivos individuales.
 * Devuelve una lista plana de arrays de archivo individuales (sin los que
 * tengan UPLOAD_ERR_NO_FILE, ej. slots vacíos).
 */
function rh_normalizar_archivos_multiples(?array $filesField): array
{
    if (!$filesField || !isset($filesField['name'])) {
        return [];
    }
    if (!is_array($filesField['name'])) {
        return $filesField['error'] === UPLOAD_ERR_NO_FILE ? [] : [$filesField];
    }
    $normalizados = [];
    foreach ($filesField['name'] as $i => $name) {
        if ($filesField['error'][$i] === UPLOAD_ERR_NO_FILE) {
            continue;
        }
        $normalizados[] = [
            'name' => $filesField['name'][$i],
            'type' => $filesField['type'][$i],
            'tmp_name' => $filesField['tmp_name'][$i],
            'error' => $filesField['error'][$i],
            'size' => $filesField['size'][$i],
        ];
    }
    return $normalizados;
}

/**
 * Mueve un archivo subido (ya validado) a la carpeta de verificación del usuario.
 * Si ya existía un archivo previo para ese campo, lo borra primero.
 * Devuelve el nombre de archivo (relativo a esa carpeta) para guardar en DB.
 */
function rh_guardar_imagen_verificacion(array $file, int $userId, ?string $pathAnterior): string
{
    $dir = rh_dir_verificacion_usuario($userId);

    if ($pathAnterior) {
        $anterior = $dir . '/' . basename($pathAnterior);
        if (is_file($anterior)) {
            unlink($anterior);
        }
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return $filename;
}

/**
 * Guarda el avatar público del usuario, normalizado a .jpg via GD para
 * consistencia de servido (siempre sobreescribe {UserId}.jpg).
 * Devuelve la ruta relativa (para construir la URL pública) o null si falla.
 */
function rh_guardar_avatar(array $file, int $userId): ?string
{
    $dir = rh_dir_avatares();
    $destino = $dir . '/' . $userId . '.jpg';

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $imagen = $mime === 'image/png'
        ? @imagecreatefrompng($file['tmp_name'])
        : @imagecreatefromjpeg($file['tmp_name']);

    if (!$imagen) {
        return null;
    }

    imagejpeg($imagen, $destino, 85);
    imagedestroy($imagen);

    return 'avatares/' . $userId . '.jpg';
}

function rh_dir_fotos_mascota(int $mascotaId): string
{
    $dir = __DIR__ . '/../../uploads/mascotas/' . $mascotaId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de la galería de una mascota (público). Devuelve la ruta
 * relativa a `uploads/` (ej. "mascotas/12/ab12cd34.jpg") para guardar en DB.
 */
function rh_guardar_foto_mascota(array $file, int $mascotaId): string
{
    $dir = rh_dir_fotos_mascota($mascotaId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'mascotas/' . $mascotaId . '/' . $filename;
}

function rh_dir_fotos_post(int $postId): string
{
    $dir = __DIR__ . '/../../uploads/publicaciones/' . $postId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de una publicación (público). Devuelve la ruta relativa
 * a `uploads/` (ej. "publicaciones/12/ab12cd34.jpg") para guardar en DB.
 */
function rh_guardar_foto_post(array $file, int $postId): string
{
    $dir = rh_dir_fotos_post($postId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'publicaciones/' . $postId . '/' . $filename;
}

function rh_dir_videos_post(int $postId): string
{
    $dir = __DIR__ . '/../../uploads/publicaciones_video/' . $postId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda el video de un Short (público, sin transcodificar — video crudo tal
 * cual lo sube el cliente). Devuelve la ruta relativa a `uploads/`
 * (ej. "publicaciones_video/12/ab12cd34.mp4") para guardar en DB.
 */
function rh_guardar_video_post(array $file, int $postId): string
{
    $dir = rh_dir_videos_post($postId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = bin2hex(random_bytes(8)) . '.' . rh_extension_para_mime_video($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'publicaciones_video/' . $postId . '/' . $filename;
}

function rh_dir_historias(int $userId): string
{
    $dir = __DIR__ . '/../../uploads/historias/' . $userId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda el media (foto o video) de una Historia (público). Devuelve la ruta
 * relativa a `uploads/` (ej. "historias/5/ab12cd34.jpg") para guardar en DB.
 */
function rh_guardar_media_historia(array $file, int $userId, string $tipoMedia): string
{
    $dir = rh_dir_historias($userId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = $tipoMedia === 'video'
        ? bin2hex(random_bytes(8)) . '.' . rh_extension_para_mime_video($mime)
        : rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'historias/' . $userId . '/' . $filename;
}

function rh_dir_fotos_adopcion(int $adopcionId): string
{
    $dir = __DIR__ . '/../../uploads/adopciones/' . $adopcionId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de un listado de adopción (público). Devuelve la ruta
 * relativa a `uploads/` (ej. "adopciones/12/ab12cd34.jpg") para guardar en DB.
 */
function rh_guardar_foto_adopcion(array $file, int $adopcionId): string
{
    $dir = rh_dir_fotos_adopcion($adopcionId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'adopciones/' . $adopcionId . '/' . $filename;
}

function rh_dir_fotos_perdido(int $perdidoId): string
{
    $dir = __DIR__ . '/../../uploads/perdidos/' . $perdidoId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de un reporte de perdido/encontrado manual (sin Mascota
 * vinculada). Devuelve la ruta relativa a `uploads/` para guardar en DB.
 */
function rh_guardar_foto_perdido(array $file, int $perdidoId): string
{
    $dir = rh_dir_fotos_perdido($perdidoId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'perdidos/' . $perdidoId . '/' . $filename;
}

function rh_dir_fotos_transito(int $transitoId): string
{
    $dir = __DIR__ . '/../../uploads/transito/' . $transitoId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de un tránsito manual (sin Mascota vinculada). Devuelve la
 * ruta relativa a `uploads/` para guardar en DB.
 */
function rh_guardar_foto_transito(array $file, int $transitoId): string
{
    $dir = rh_dir_fotos_transito($transitoId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'transito/' . $transitoId . '/' . $filename;
}

function rh_dir_fotos_donacion(int $donacionId): string
{
    $dir = __DIR__ . '/../../uploads/donaciones/' . $donacionId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de una publicación de donación. Devuelve la ruta relativa
 * a `uploads/` para guardar en DB.
 */
function rh_guardar_foto_donacion(array $file, int $donacionId): string
{
    $dir = rh_dir_fotos_donacion($donacionId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'donaciones/' . $donacionId . '/' . $filename;
}

function rh_dir_fotos_veterinaria(int $veterinariaId): string
{
    $dir = __DIR__ . '/../../uploads/veterinarias/' . $veterinariaId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de un listado de veterinaria. Devuelve la ruta relativa a
 * `uploads/` para guardar en DB.
 */
function rh_guardar_foto_veterinaria(array $file, int $veterinariaId): string
{
    $dir = rh_dir_fotos_veterinaria($veterinariaId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'veterinarias/' . $veterinariaId . '/' . $filename;
}

function rh_dir_fotos_producto(int $productoId): string
{
    $dir = __DIR__ . '/../../uploads/productos/' . $productoId;
    if (!is_dir($dir)) {
        mkdir($dir, 0755, true);
    }
    return $dir;
}

/**
 * Guarda una foto de un listado de producto/servicio. Devuelve la ruta
 * relativa a `uploads/` para guardar en DB.
 */
function rh_guardar_foto_producto(array $file, int $productoId): string
{
    $dir = rh_dir_fotos_producto($productoId);

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return 'productos/' . $productoId . '/' . $filename;
}

function rh_dir_carnet_mascota(int $mascotaId): string
{
    $dir = __DIR__ . '/../storage/carnets/' . $mascotaId;
    if (!is_dir($dir)) {
        mkdir($dir, 0750, true);
    }
    return $dir;
}

/**
 * Guarda el carnet de vacunas de una mascota (carpeta protegida por .htaccess
 * sin importar la visibilidad elegida; la visibilidad solo decide si
 * carnet_ver.php sirve el archivo sin necesitar un grant de MascotaCarnetAcceso).
 * Devuelve el nombre de archivo (relativo a esa carpeta) para guardar en DB.
 */
function rh_guardar_carnet_vacunas(array $file, int $mascotaId, ?string $pathAnterior): string
{
    $dir = rh_dir_carnet_mascota($mascotaId);

    if ($pathAnterior) {
        $anterior = $dir . '/' . basename($pathAnterior);
        if (is_file($anterior)) {
            unlink($anterior);
        }
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $filename = rh_nombre_archivo_random($mime);
    move_uploaded_file($file['tmp_name'], $dir . '/' . $filename);

    return $filename;
}
