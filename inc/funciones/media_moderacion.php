<?php
/**
 * Moderación automática de imágenes públicas (NSFW / no apto para la red).
 *
 * Se aplica al guardar fotos de publicaciones, historias, mascotas, etc.
 * No se aplica a DNI/selfie de verificación (necesitan rostros humanos).
 *
 * Si Gemini no está configurado o falla la API, se deja pasar la imagen
 * (fail-open) para no romper subidas; las denuncias de usuarios cubren el resto.
 */

require_once __DIR__ . '/gemini.php';
require_once __DIR__ . '/respuesta.php';

const RH_MEDIA_PROMPT_MODERACION = <<<'PROMPT'
Sos el filtro de seguridad de Red Huellitas, una red social de mascotas y bienestar animal.

Analizá la imagen y respondé SOLO un JSON válido (sin markdown) con esta forma:
{
  "permitida": true|false,
  "motivos": ["codigo", ...],
  "resumen": "frase corta en español"
}

Códigos de motivo posibles (usá sólo los que apliquen):
- "desnudo" — desnudez humana, genitales, pechos expuestos, contenido sexual
- "violencia_extrema" — violencia gráfica real contra personas o animales
- "gore" — sangre/heridas extremas no veterinarias
- "odio" — simbología de odio explícita
- "otro_inapropiado" — claramente indebido para una app familiar de mascotas

REGLAS:
- Fotos normales de personas vestidas con sus mascotas: permitida=true.
- Selfies, familias, veterinarios, eventos: permitida=true.
- Desnudos, semi-desnudos sexuales, pornografía: permitida=false.
- Si dudás entre permitida y no, preferí permitida=true (evitar falsos positivos).
- No rechaces solo porque no haya un animal en la foto.
PROMPT;

/**
 * @return array{ok: bool, permitida: bool, motivos: string[], resumen: string, error: ?string}
 */
function rh_gemini_moderar_imagen(string $rutaAbsoluta): array
{
    $base = [
        'ok' => false,
        'permitida' => true,
        'motivos' => [],
        'resumen' => '',
        'error' => null,
    ];

    if (!is_file($rutaAbsoluta) || !is_readable($rutaAbsoluta)) {
        $base['error'] = 'Archivo no legible';
        return $base;
    }

    if (!rh_gemini_configurado()) {
        $base['ok'] = true;
        $base['error'] = 'gemini_no_configurado';
        return $base;
    }

    $img = rh_gemini_part_imagen($rutaAbsoluta);
    if (!$img) {
        $base['ok'] = true;
        $base['error'] = 'imagen_no_legible';
        return $base;
    }

    $res = rh_gemini_generate_content([
        ['text' => RH_MEDIA_PROMPT_MODERACION],
        $img,
    ]);
    if (!$res['ok']) {
        // Fail-open: no bloquear la red si Gemini está caído.
        error_log('rh_media_moderar: Gemini falló — ' . ($res['error'] ?? ''));
        $base['ok'] = true;
        $base['error'] = $res['error'] ?? 'gemini_error';
        return $base;
    }

    $texto = trim((string) $res['texto']);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $texto, $m)) {
        $texto = trim($m[1]);
    }

    $data = json_decode($texto, true);
    if (!is_array($data)) {
        error_log('rh_media_moderar: JSON inválido — ' . substr($texto, 0, 300));
        $base['ok'] = true;
        $base['error'] = 'json_invalido';
        return $base;
    }

    $permitida = array_key_exists('permitida', $data) ? (bool) $data['permitida'] : true;
    $motivos = is_array($data['motivos'] ?? null)
        ? array_values(array_map('strval', $data['motivos']))
        : [];
    $resumen = isset($data['resumen']) ? (string) $data['resumen'] : '';

    return [
        'ok' => true,
        'permitida' => $permitida,
        'motivos' => $motivos,
        'resumen' => $resumen,
        'error' => null,
    ];
}

/**
 * Ruta absoluta bajo uploads/ a partir de la relativa guardada en DB.
 */
function rh_uploads_abs(string $rutaRelativa): string
{
    $rel = str_replace('\\', '/', $rutaRelativa);
    $rel = ltrim($rel, '/');
    if (strpos($rel, '..') !== false) {
        return '';
    }
    return __DIR__ . '/../../uploads/' . $rel;
}

/**
 * Tras guardar una imagen pública: si el filtro la rechaza, borra el archivo
 * y responde 422 (termina el request). Si Gemini no está, no hace nada.
 *
 * @param string $rutaRelativa ruta relativa a uploads/ (ej. publicaciones/1/a.jpg)
 */
function rh_exigir_imagen_permitida(string $rutaRelativa): void
{
    $config = rh_gemini_config();
    if (isset($config['MEDIA_MODERACION_ACTIVA']) && !$config['MEDIA_MODERACION_ACTIVA']) {
        return;
    }

    $abs = rh_uploads_abs($rutaRelativa);
    if ($abs === '' || !is_file($abs)) {
        return;
    }

    // Sólo imágenes; videos quedan para denuncias manuales por ahora.
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $abs) ?: '';
    finfo_close($finfo);
    if (strpos($mime, 'image/') !== 0) {
        return;
    }

    $resultado = rh_gemini_moderar_imagen($abs);
    if (!$resultado['ok'] || $resultado['permitida']) {
        return;
    }

    @unlink($abs);

    $mensaje = 'Esta imagen no está permitida en Red Huellitas (contenido indebido o sexual).';
    if ($resultado['resumen'] !== '') {
        $mensaje = 'No se pudo subir la imagen: ' . $resultado['resumen'];
    }

    json_error($mensaje, 422);
}
