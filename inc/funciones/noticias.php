<?php
/**
 * Helpers de Noticias externas (agregación RSS + scraping) para Red Huellitas.
 * Nunca se guarda ni se sirve el artículo completo — solo título, resumen
 * corto, imagen, fecha y el link al original (misma postura que cualquier
 * lector RSS: siempre se devuelve tráfico a la fuente).
 */

const RH_NOTICIAS_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RedHuellitasBot/1.0';
const RH_NOTICIAS_TIMEOUT_SEGUNDOS = 12;

function rh_noticia_url_hash(string $url): string
{
    return hash('sha256', $url);
}

function rh_noticias_parse_fecha(?string $raw): ?string
{
    $raw = trim((string) $raw);
    if ($raw === '') {
        return null;
    }
    $ts = strtotime($raw);
    return $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
}

/**
 * Descarga el contenido de una URL con un User-Agent real y timeout corto,
 * para que una fuente lenta/caída no cuelgue toda la ingesta. Devuelve null
 * si falla (nunca lanza), quien llama decide qué hacer con eso.
 */
function rh_noticias_obtener_html(string $url): ?string
{
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERAGENT, RH_NOTICIAS_USER_AGENT);
    curl_setopt($ch, CURLOPT_TIMEOUT, RH_NOTICIAS_TIMEOUT_SEGUNDOS);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_ENCODING, ''); // acepta gzip
    $html = curl_exec($ch);
    $httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($html === false || $httpCode < 200 || $httpCode >= 400) {
        return null;
    }
    return $html;
}

/**
 * Extrae og:title/og:description/og:image + fecha de publicación de un HTML.
 *
 * @return array{titulo:?string,resumen:?string,imagenUrl:?string,publicadoEn:?string}
 */
function rh_noticias_extraer_og(string $html): array
{
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();

    $xpath = new DOMXPath($doc);
    $obtenerProp = function (string $propiedad) use ($xpath): ?string {
        $nodos = $xpath->query("//meta[@property='$propiedad']/@content");
        return $nodos->length > 0 ? trim($nodos->item(0)->nodeValue) : null;
    };
    $obtenerName = function (string $name) use ($xpath): ?string {
        $nodos = $xpath->query("//meta[@name='$name']/@content");
        return $nodos->length > 0 ? trim($nodos->item(0)->nodeValue) : null;
    };

    $publicado = $obtenerProp('article:published_time')
        ?? $obtenerProp('og:updated_time')
        ?? $obtenerName('publish-date')
        ?? $obtenerName('date')
        ?? $obtenerName('pubdate');

    return [
        'titulo' => $obtenerProp('og:title'),
        'resumen' => $obtenerProp('og:description'),
        'imagenUrl' => $obtenerProp('og:image'),
        'publicadoEn' => rh_noticias_parse_fecha($publicado),
    ];
}

/**
 * Inserta o actualiza una noticia externa (dedupe por hash de la URL
 * original). Reingestar la misma URL refresca título/resumen/imagen si la
 * fuente editó el artículo, sin crear una fila duplicada.
 */
function rh_noticia_upsert(
    mysqli $conn,
    string $fuente,
    string $urlOriginal,
    string $titulo,
    ?string $resumen,
    ?string $imagenUrl,
    ?string $publicadoEn
): void {
    $urlHash = rh_noticia_url_hash($urlOriginal);
    $titulo = mb_substr($titulo, 0, 300);

    $stmt = $conn->prepare(
        'INSERT INTO NoticiaExterna (Fuente, UrlOriginal, UrlHash, Titulo, Resumen, ImagenUrl, PublicadoEn)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           Titulo = VALUES(Titulo),
           Resumen = VALUES(Resumen),
           ImagenUrl = VALUES(ImagenUrl),
           PublicadoEn = COALESCE(VALUES(PublicadoEn), PublicadoEn)'
    );
    $stmt->bind_param('sssssss', $fuente, $urlOriginal, $urlHash, $titulo, $resumen, $imagenUrl, $publicadoEn);
    $stmt->execute();
    $stmt->close();
}

function rh_noticia_existe(mysqli $conn, string $urlOriginal): bool
{
    $urlHash = rh_noticia_url_hash($urlOriginal);
    $stmt = $conn->prepare('SELECT NoticiaExternaId FROM NoticiaExterna WHERE UrlHash = ?');
    $stmt->bind_param('s', $urlHash);
    $stmt->execute();
    $existe = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();
    return $existe;
}

function rh_noticia_publico(array $row): array
{
    return [
        'noticiaExternaId' => (int) $row['NoticiaExternaId'],
        'fuente' => $row['Fuente'],
        'urlOriginal' => $row['UrlOriginal'],
        'titulo' => $row['Titulo'],
        'resumen' => $row['Resumen'],
        'imagenUrl' => $row['ImagenUrl'],
        'publicadoEn' => $row['PublicadoEn'],
    ];
}

/**
 * Lista noticias intercalando fuentes (1 de A, 1 de B, 1 de C…) ordenadas
 * por fecha dentro de cada fuente. Así no aparecen 20 de Infobae seguidas.
 *
 * @return array{noticias: list<array>, nextCursor: ?int}
 */
function rh_noticias_listar_mezcladas(mysqli $conn, int $offset, int $limit): array
{
    $fuentes = [];
    $resFuentes = $conn->query(
        "SELECT Fuente FROM NoticiaExterna WHERE Estado = 'A' GROUP BY Fuente ORDER BY Fuente ASC"
    );
    while ($row = $resFuentes->fetch_assoc()) {
        $fuentes[] = $row['Fuente'];
    }

    if (!$fuentes) {
        return ['noticias' => [], 'nextCursor' => null];
    }

    // Pedimos de cada fuente lo suficiente para cubrir offset+limit en un
    // round-robin perfecto (peor caso: una sola fuente aporta todas).
    $necesito = $offset + $limit;
    $porFuente = (int) ceil($necesito / count($fuentes)) + 2;

    /** @var array<string, list<array>> $colas */
    $colas = [];
    $stmt = $conn->prepare(
        "SELECT * FROM NoticiaExterna
         WHERE Estado = 'A' AND Fuente = ?
         ORDER BY COALESCE(PublicadoEn, IngestadoEn) DESC, NoticiaExternaId DESC
         LIMIT ?"
    );
    foreach ($fuentes as $fuente) {
        $stmt->bind_param('si', $fuente, $porFuente);
        $stmt->execute();
        $result = $stmt->get_result();
        $colas[$fuente] = [];
        while ($row = $result->fetch_assoc()) {
            $colas[$fuente][] = $row;
        }
    }
    $stmt->close();

    // Round-robin: una de cada fuente por vuelta, saltando colas vacías.
    $mezcla = [];
    $indices = array_fill_keys($fuentes, 0);
    $quedan = true;
    while ($quedan && count($mezcla) < $necesito) {
        $quedan = false;
        foreach ($fuentes as $fuente) {
            $i = $indices[$fuente];
            if ($i < count($colas[$fuente])) {
                $mezcla[] = $colas[$fuente][$i];
                $indices[$fuente] = $i + 1;
                $quedan = true;
                if (count($mezcla) >= $necesito) {
                    break;
                }
            }
        }
    }

    $slice = array_slice($mezcla, $offset, $limit);
    $noticias = array_map('rh_noticia_publico', $slice);
    $nextCursor = count($noticias) === $limit ? $offset + $limit : null;

    return ['noticias' => $noticias, 'nextCursor' => $nextCursor];
}
