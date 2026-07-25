<?php
/**
 * Helpers de Noticias externas (agregación RSS + scraping) para Red Huellitas.
 * Nunca se guarda ni se sirve el artículo completo — solo título, resumen
 * corto, imagen, fecha y el link al original (misma postura que cualquier
 * lector RSS: siempre se devuelve tráfico a la fuente).
 */

const RH_NOTICIAS_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RedHuellitasBot/1.0';
const RH_NOTICIAS_TIMEOUT_SEGUNDOS = 10;

function rh_noticia_url_hash(string $url): string
{
    return hash('sha256', $url);
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
    $html = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($html === false || $httpCode !== 200) {
        return null;
    }
    return $html;
}

/**
 * Extrae og:title/og:description/og:image de un HTML de artículo, vía
 * DOMDocument+DOMXPath (más robusto que regex para parsear meta tags).
 */
function rh_noticias_extraer_og(string $html): array
{
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    // Forzar UTF-8: sin esta pista, DOMDocument a veces ignora el <meta charset>
    // real de la página y asume ISO-8859-1, produciendo texto doble-codificado
    // (ej. "más" -> "mÃ¡s") en los títulos/resúmenes extraídos.
    $doc->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NOWARNING | LIBXML_NOERROR);
    libxml_clear_errors();

    $xpath = new DOMXPath($doc);
    $obtener = function (string $propiedad) use ($xpath): ?string {
        $nodos = $xpath->query("//meta[@property='$propiedad']/@content");
        return $nodos->length > 0 ? trim($nodos->item(0)->nodeValue) : null;
    };

    return [
        'titulo' => $obtener('og:title'),
        'resumen' => $obtener('og:description'),
        'imagenUrl' => $obtener('og:image'),
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
         ON DUPLICATE KEY UPDATE Titulo = VALUES(Titulo), Resumen = VALUES(Resumen), ImagenUrl = VALUES(ImagenUrl)'
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
