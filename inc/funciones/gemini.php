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
    $url = str_replace('{modelo}', $config['GEMINI_MODELO'] ?? 'gemini-3.1-flash-image', $config['GEMINI_ENDPOINT'] ?? '');
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

        if ($httpCode === 429) {
            // Google devuelve 429 en dos situaciones muy distintas, y decirle
            // "probá mañana" a la segunda es mentirle al usuario:
            //  - "limit: 0"  → la API key NO tiene cuota asignada para este
            //                  modelo (falta habilitar facturación en el
            //                  proyecto). Mañana va a fallar igual.
            //  - sin limit:0 → cuota real agotada por uso; mañana se renueva.
            $sinCuotaAsignada = str_contains($detalle, 'limit: 0');
            return $fallo($sinCuotaAsignada
                ? 'La cuenta de IA no tiene cuota habilitada para generar imágenes'
                : 'Se agotó la cuota diaria del servicio de imágenes, probá mañana');
        }

        return $fallo('El servicio de imágenes rechazó el pedido');
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

/**
 * Extrae texto de una respuesta generateContent (candidates[].content.parts[].text).
 */
function rh_gemini_extraer_texto(array $respuesta): ?string
{
    foreach ($respuesta['candidates'] ?? [] as $candidato) {
        $chunks = [];
        foreach ($candidato['content']['parts'] ?? [] as $part) {
            if (!empty($part['text']) && is_string($part['text'])) {
                $chunks[] = $part['text'];
            }
        }
        if ($chunks) {
            return implode("\n", $chunks);
        }
    }
    return null;
}

/**
 * Modelo multimodal de texto (OCR / clasificación). Separado del de imagen.
 */
function rh_gemini_modelo_texto(): string
{
    $config = rh_gemini_config();
    return (string) ($config['GEMINI_MODELO_TEXTO'] ?? 'gemini-3.5-flash');
}

/**
 * Lista de modelos a probar si el principal falla (404 / no disponible para la key).
 *
 * @return list<string>
 */
function rh_gemini_modelos_texto_fallback(): array
{
    $config = rh_gemini_config();
    $principal = rh_gemini_modelo_texto();
    $extra = $config['GEMINI_MODELO_TEXTO_FALLBACKS'] ?? [
        'gemini-3.5-flash',
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-2.0-flash-lite',
        'gemini-flash-latest',
    ];
    if (!is_array($extra)) {
        $extra = [];
    }
    $lista = array_values(array_unique(array_filter(array_merge([$principal], $extra), 'is_string')));
    return $lista;
}

/**
 * Llamada genérica generateContent con partes ya armadas (texto + imágenes).
 *
 * @param list<array<string,mixed>> $parts
 * @return array{ok: bool, texto: ?string, error: ?string, raw: ?array}
 */
function rh_gemini_generate_content(array $parts): array
{
    $fallo = fn (string $msg): array => ['ok' => false, 'texto' => null, 'error' => $msg, 'raw' => null];

    if (!rh_gemini_configurado()) {
        return $fallo('Gemini no está configurado');
    }

    $config = rh_gemini_config();
    $endpointTpl = (string) ($config['GEMINI_ENDPOINT'] ?? '');
    if ($endpointTpl === '') {
        return $fallo('Falta configurar el endpoint de Gemini');
    }

    $body = [
        'contents' => [['parts' => $parts]],
        'generationConfig' => [
            'temperature' => 0.1,
            'responseMimeType' => 'application/json',
        ],
    ];
    $payload = json_encode($body);
    $ultimoError = 'Gemini rechazó el pedido';

    foreach (rh_gemini_modelos_texto_fallback() as $modelo) {
        $url = str_replace('{modelo}', $modelo, $endpointTpl);
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
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
            error_log('rh_gemini_text: cURL — ' . $errCurl);
            return $fallo('No se pudo conectar con Gemini');
        }

        $respuesta = json_decode($raw, true);
        if (!is_array($respuesta)) {
            return $fallo('Gemini devolvió una respuesta inesperada');
        }

        if ($httpCode >= 400) {
            $detalle = $respuesta['error']['message'] ?? ('HTTP ' . $httpCode);
            error_log("rh_gemini_text [$modelo]: $detalle");
            $ultimoError = $httpCode === 429
                ? 'Se agotó la cuota de Gemini, probá más tarde'
                : 'Gemini rechazó el pedido';
            // 404 / modelo no disponible / cuota agotada → probar el siguiente de respaldo.
            if ($httpCode === 404 || $httpCode === 429
                || stripos($detalle, 'not found') !== false
                || stripos($detalle, 'no longer available') !== false
                || stripos($detalle, 'is not found') !== false
                || stripos($detalle, 'quota') !== false
                || stripos($detalle, 'rate') !== false) {
                continue;
            }
            return $fallo($ultimoError);
        }

        $texto = rh_gemini_extraer_texto($respuesta);
        if ($texto === null || $texto === '') {
            $ultimoError = 'Gemini no devolvió texto';
            continue;
        }

        return ['ok' => true, 'texto' => $texto, 'error' => null, 'raw' => $respuesta];
    }

    return $fallo($ultimoError);
}

function rh_gemini_part_imagen(string $ruta): ?array
{
    if (!is_file($ruta) || !is_readable($ruta)) {
        return null;
    }
    $contenido = @file_get_contents($ruta);
    if ($contenido === false || $contenido === '') {
        return null;
    }
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $ruta) ?: 'image/jpeg';
    finfo_close($finfo);

    return [
        'inline_data' => [
            'mime_type' => $mime,
            'data' => base64_encode($contenido),
        ],
    ];
}

const RH_GEMINI_PROMPT_VERIFICACION = <<<'PROMPT'
Analizá estas 3 imágenes de verificación de identidad en Argentina, en este orden:
1) frente del DNI
2) dorso del DNI
3) selfie de la persona

Respondé SOLO un JSON válido (sin markdown) con esta forma exacta:
{
  "es_dni_frente": true,
  "es_dni_dorso": true,
  "selfie_tiene_rostro": true,
  "selfie_parece_viva": true,
  "face_match_score": 0.0,
  "dni_numero": null,
  "nombre_completo": null,
  "sexo": null,
  "documento_legible": true,
  "nombre_coincide_perfil": null,
  "problemas": [],
  "resumen": ""
}

Reglas:
- face_match_score es 0.0 a 1.0: similitud entre el rostro de la foto del DNI (frente) y la selfie.
- dni_numero: solo dígitos del DNI argentino si se lee; si no, null.
- nombre_completo: tal cual en el documento si se lee.
- sexo: "M", "F" o null.
- nombre_coincide_perfil: true/false/null según el nombre de perfil que te pasamos; null si no aplica.
- problemas: lista corta de strings en español (ej. "no es un DNI", "selfie borrosa", "rostros distintos").
- resumen: una frase corta en español para el usuario.
- Sé estricto: si la imagen 1 no es claramente un DNI argentino frente, es_dni_frente=false.
PROMPT;

/**
 * Analiza DNI frente/dorso + selfie con Gemini (OCR + face match aproximado).
 *
 * @return array{ok: bool, data: ?array, error: ?string}
 */
function rh_gemini_analizar_verificacion(
    string $rutaFrente,
    string $rutaDorso,
    string $rutaSelfie,
    ?string $nombrePerfil = null
): array {
    $fallo = fn (string $msg): array => ['ok' => false, 'data' => null, 'error' => $msg];

    $img1 = rh_gemini_part_imagen($rutaFrente);
    $img2 = rh_gemini_part_imagen($rutaDorso);
    $img3 = rh_gemini_part_imagen($rutaSelfie);
    if (!$img1 || !$img2 || !$img3) {
        return $fallo('Faltan imágenes legibles para el análisis');
    }

    $prompt = RH_GEMINI_PROMPT_VERIFICACION;
    if ($nombrePerfil !== null && trim($nombrePerfil) !== '') {
        $prompt .= "\nNombre declarado en el perfil de la app: " . trim($nombrePerfil);
    }

    $res = rh_gemini_generate_content([
        ['text' => $prompt],
        $img1,
        $img2,
        $img3,
    ]);
    if (!$res['ok']) {
        return $fallo($res['error'] ?? 'Error de Gemini');
    }

    $texto = trim((string) $res['texto']);
    if (preg_match('/```(?:json)?\s*([\s\S]*?)```/', $texto, $m)) {
        $texto = trim($m[1]);
    }

    $data = json_decode($texto, true);
    if (!is_array($data)) {
        error_log('rh_gemini_verif: JSON inválido — ' . substr($texto, 0, 400));
        return $fallo('No se pudo interpretar el análisis automático');
    }

    $score = isset($data['face_match_score']) && is_numeric($data['face_match_score'])
        ? max(0.0, min(1.0, (float) $data['face_match_score']))
        : 0.0;

    $normalizado = [
        'es_dni_frente' => !empty($data['es_dni_frente']),
        'es_dni_dorso' => !empty($data['es_dni_dorso']),
        'selfie_tiene_rostro' => !empty($data['selfie_tiene_rostro']),
        'selfie_parece_viva' => array_key_exists('selfie_parece_viva', $data)
            ? (bool) $data['selfie_parece_viva']
            : true,
        'face_match_score' => $score,
        'dni_numero' => isset($data['dni_numero']) && $data['dni_numero'] !== null
            ? preg_replace('/\D+/', '', (string) $data['dni_numero'])
            : null,
        'nombre_completo' => isset($data['nombre_completo']) ? (string) $data['nombre_completo'] : null,
        'sexo' => isset($data['sexo']) ? strtoupper(substr((string) $data['sexo'], 0, 1)) : null,
        'documento_legible' => !empty($data['documento_legible']),
        'nombre_coincide_perfil' => array_key_exists('nombre_coincide_perfil', $data)
            ? ($data['nombre_coincide_perfil'] === null ? null : (bool) $data['nombre_coincide_perfil'])
            : null,
        'problemas' => is_array($data['problemas'] ?? null)
            ? array_values(array_map('strval', $data['problemas']))
            : [],
        'resumen' => isset($data['resumen']) ? (string) $data['resumen'] : '',
    ];

    if ($normalizado['dni_numero'] === '') {
        $normalizado['dni_numero'] = null;
    }

    return ['ok' => true, 'data' => $normalizado, 'error' => null];
}
