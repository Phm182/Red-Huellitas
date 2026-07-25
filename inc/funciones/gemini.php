<?php
/**
 * Cliente de la API de Gemini para generar el avatar ilustrado de una mascota
 * a partir de su foto real (Fase 7b).
 *
 * cURL crudo contra la API REST, sin SDK — mismo criterio que mercadopago.php
 * y google_auth.php. Config en inc/config/gemini.local.php; sin ella la
 * feature se desactiva sola.
 *
 * Criterio de errores: esto NUNCA lanza. Devuelve ['ok' => false, 'error' =>
 * ...] y quien llama decide qué mostrar. Un problema con la IA no puede
 * romper el minijuego.
 */

const RH_GEMINI_TIMEOUT_SEGUNDOS = 60; // estas llamadas tardan 10-20s

/**
 * El prompt define casi toda la calidad del resultado. Está en inglés porque
 * los modelos responden mejor, y pide explícitamente CONSERVAR los rasgos
 * distintivos: sin eso devuelve "un perro" genérico en vez de ESTA mascota,
 * que es justamente lo que le da sentido a la feature.
 *
 * Para cambiar el estilo del avatar, se edita acá y en ningún otro lado.
 */
const RH_GEMINI_PROMPT_AVATAR = <<<'PROMPT'
Turn this photo of a pet into a friendly cartoon-style avatar illustration.

Keep the animal clearly recognizable: preserve its fur colour and pattern, ear
shape, muzzle shape, eye colour and any distinctive markings or spots. Someone
who knows this pet should immediately recognize it.

Style: warm, soft, hand-drawn digital illustration with clean lines and gentle
shading. Simple flat background in a soft complementary colour. Square framing,
the pet's head and upper body centred, facing the viewer, with a calm happy
expression. No text, no watermarks, no border, no human figures.
PROMPT;

function rh_gemini_config(): array
{
    $configFile = __DIR__ . '/../config/gemini.local.php';
    if (!is_file($configFile)) {
        return [];
    }
    return require $configFile;
}

function rh_gemini_configurado(): bool
{
    $config = rh_gemini_config();
    return !empty($config['GEMINI_API_KEY']);
}

/**
 * Busca la imagen generada dentro de la respuesta.
 *
 * Recorre las parts en vez de asumir un índice fijo: el modelo suele devolver
 * una parte de texto además de la imagen, y el orden no está garantizado.
 * También contempla el formato del endpoint nuevo (/v1beta/interactions), que
 * la devuelve en output_image.
 */
function rh_gemini_extraer_imagen(array $respuesta): ?string
{
    // Formato clásico: candidates[].content.parts[].inlineData.data
    foreach ($respuesta['candidates'] ?? [] as $candidato) {
        foreach ($candidato['content']['parts'] ?? [] as $part) {
            $data = $part['inlineData']['data'] ?? $part['inline_data']['data'] ?? null;
            if (is_string($data) && $data !== '') {
                return $data;
            }
        }
    }

    // Formato del endpoint nuevo.
    $data = $respuesta['output_image']['data'] ?? $respuesta['interaction']['output_image']['data'] ?? null;
    return is_string($data) && $data !== '' ? $data : null;
}

/**
 * Genera el avatar a partir de una foto en disco.
 *
 * @return array{ok: bool, imagen: ?string, error: ?string} `imagen` son los
 *         BYTES del PNG (ya decodificado), no base64.
 */
function rh_gemini_generar_avatar(string $rutaFoto): array
{
    $fallo = fn (string $msg): array => ['ok' => false, 'imagen' => null, 'error' => $msg];

    if (!rh_gemini_configurado()) {
        return $fallo('La generación de avatares no está configurada');
    }
    if (!is_file($rutaFoto) || !is_readable($rutaFoto)) {
        return $fallo('No se encontró la foto de la mascota');
    }

    $contenido = @file_get_contents($rutaFoto);
    if ($contenido === false || $contenido === '') {
        return $fallo('No se pudo leer la foto de la mascota');
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $rutaFoto) ?: 'image/jpeg';
    finfo_close($finfo);

    $config = rh_gemini_config();
    $url = str_replace('{modelo}', $config['GEMINI_MODELO'] ?? 'gemini-2.5-flash-image', $config['GEMINI_ENDPOINT'] ?? '');
    if ($url === '') {
        return $fallo('Falta configurar el endpoint de Gemini');
    }

    $body = [
        'contents' => [[
            'parts' => [
                ['text' => RH_GEMINI_PROMPT_AVATAR],
                ['inline_data' => ['mime_type' => $mime, 'data' => base64_encode($contenido)]],
            ],
        ]],
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-goog-api-key: ' . $config['GEMINI_API_KEY'],
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, RH_GEMINI_TIMEOUT_SEGUNDOS);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

    $raw = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $errCurl = curl_error($ch);
    curl_close($ch);

    if ($raw === false) {
        error_log('rh_gemini: cURL — ' . $errCurl);
        return $fallo('No se pudo conectar con el servicio de imágenes');
    }

    $respuesta = json_decode($raw, true);
    if (!is_array($respuesta)) {
        error_log('rh_gemini: respuesta no-JSON (HTTP ' . $httpCode . ')');
        return $fallo('El servicio de imágenes devolvió una respuesta inesperada');
    }

    if ($httpCode >= 400) {
        $detalle = $respuesta['error']['message'] ?? ('HTTP ' . $httpCode);
        error_log('rh_gemini: ' . $detalle);
        // 429 del lado de Google = cuota agotada; se distingue para poder
        // avisarlo bien al usuario.
        return $fallo($httpCode === 429
            ? 'Se agotó la cuota diaria del servicio de imágenes, probá mañana'
            : 'El servicio de imágenes rechazó el pedido');
    }

    $base64 = rh_gemini_extraer_imagen($respuesta);
    if ($base64 === null) {
        error_log('rh_gemini: la respuesta no traía imagen — ' . substr($raw, 0, 300));
        return $fallo('El servicio no devolvió una imagen, probá de nuevo');
    }

    $bytes = base64_decode($base64, true);
    if ($bytes === false || $bytes === '') {
        return $fallo('La imagen devuelta no se pudo decodificar');
    }

    return ['ok' => true, 'imagen' => $bytes, 'error' => null];
}
