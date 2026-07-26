<?php
/**
 * Ingesta de noticias externas (RSS + scraping de categorías).
 * Separado del CLI para poder reutilizarlo desde listar.php cuando
 * la base esté vacía o desactualizada.
 */

require_once __DIR__ . '/noticias.php';

/**
 * Infobae — RSS oficial categoría Mascotas.
 */
function rh_ingestar_infobae(mysqli $conn): int
{
    $url = 'https://www.infobae.com/arc/outboundfeeds/rss/category/mascotas/';
    $xml = rh_noticias_obtener_html($url);
    if ($xml === null) {
        throw new RuntimeException('No se pudo descargar el RSS de Infobae');
    }

    $rss = @simplexml_load_string($xml);
    if ($rss === false || !isset($rss->channel->item)) {
        throw new RuntimeException('RSS de Infobae no se pudo parsear');
    }

    $total = 0;
    foreach ($rss->channel->item as $item) {
        $link = trim((string) $item->link);
        if ($link === '') {
            continue;
        }
        $imagenUrl = null;
        if (isset($item->enclosure['url'])) {
            $imagenUrl = (string) $item->enclosure['url'];
        } elseif (isset($item->children('media', true)->content)) {
            $imagenUrl = (string) $item->children('media', true)->content->attributes()->url;
        }
        $publicadoEn = rh_noticias_parse_fecha((string) ($item->pubDate ?? ''));
        rh_noticia_upsert(
            $conn,
            'infobae',
            $link,
            trim((string) $item->title),
            trim(strip_tags((string) $item->description)) ?: null,
            $imagenUrl ?: null,
            $publicadoEn
        );
        $total++;
    }
    return $total;
}

/**
 * La Vanguardia — RSS oficial Mascotas.
 */
function rh_ingestar_lavanguardia(mysqli $conn): int
{
    $url = 'https://www.lavanguardia.com/rss/mascotas.xml';
    $xml = rh_noticias_obtener_html($url);
    if ($xml === null) {
        throw new RuntimeException('No se pudo descargar el RSS de La Vanguardia');
    }

    $rss = @simplexml_load_string($xml);
    if ($rss === false || !isset($rss->channel->item)) {
        throw new RuntimeException('RSS de La Vanguardia no se pudo parsear');
    }

    $total = 0;
    foreach ($rss->channel->item as $item) {
        $link = trim((string) $item->link);
        if ($link === '') {
            continue;
        }
        $imagenUrl = null;
        $mediaContent = $item->children('media', true)->content ?? null;
        if ($mediaContent !== null) {
            $imagenUrl = (string) $mediaContent->attributes()->url;
        }
        $publicadoEn = rh_noticias_parse_fecha((string) ($item->pubDate ?? ''));
        rh_noticia_upsert(
            $conn,
            'lavanguardia',
            $link,
            trim((string) $item->title),
            trim(strip_tags((string) $item->description)) ?: null,
            $imagenUrl ?: null,
            $publicadoEn
        );
        $total++;
    }
    return $total;
}

/**
 * Ámbito — categoría vía JSON-LD + og: de cada artículo.
 */
function rh_ingestar_ambito(mysqli $conn): int
{
    $categoriaUrl = 'https://www.ambito.com/mascotas-a5123576';
    $html = rh_noticias_obtener_html($categoriaUrl);
    if ($html === null) {
        throw new RuntimeException('No se pudo descargar la categoría de Ámbito');
    }

    if (!preg_match_all('/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/s', $html, $matches)) {
        throw new RuntimeException('Ámbito: no se encontró JSON-LD en la página de categoría');
    }

    $urls = [];
    foreach ($matches[1] as $bloqueJson) {
        $datos = json_decode($bloqueJson, true);
        if (!is_array($datos)) {
            continue;
        }
        $candidatos = isset($datos[0]) ? $datos : [$datos];
        foreach ($candidatos as $item) {
            $lista = $item['mainEntity']['itemListElement'] ?? null;
            if (!is_array($lista)) {
                continue;
            }
            foreach ($lista as $elemento) {
                if (!empty($elemento['url'])) {
                    $urls[] = $elemento['url'];
                }
            }
        }
    }

    $total = 0;
    foreach (array_unique($urls) as $articuloUrl) {
        if (rh_noticia_existe($conn, $articuloUrl)) {
            continue;
        }
        $articuloHtml = rh_noticias_obtener_html($articuloUrl);
        if ($articuloHtml === null) {
            continue;
        }
        $og = rh_noticias_extraer_og($articuloHtml);
        if (empty($og['titulo'])) {
            continue;
        }
        rh_noticia_upsert(
            $conn,
            'ambito',
            $articuloUrl,
            $og['titulo'],
            $og['resumen'],
            $og['imagenUrl'],
            $og['publicadoEn']
        );
        $total++;
    }
    return $total;
}

/**
 * CNN Español — enlaces de categoría + og: por artículo.
 */
function rh_ingestar_cnn(mysqli $conn): int
{
    $categoriaUrl = 'https://cnnespanol.cnn.com/ciencia/animales';
    $html = rh_noticias_obtener_html($categoriaUrl);
    if ($html === null) {
        throw new RuntimeException('No se pudo descargar la categoría de CNN Español');
    }

    if (!preg_match_all(
        '~href="(https://cnnespanol\.cnn\.com/\d{4}/\d{2}/\d{2}/[^"?#]+|/\d{4}/\d{2}/\d{2}/[^"?#]+)"~',
        $html,
        $matches
    )) {
        if (!preg_match_all('#href="(/\d{4}/\d{2}/\d{2}/[^"]+)"#', $html, $matches)) {
            throw new RuntimeException('CNN Español: no se encontraron enlaces de artículos');
        }
    }

    $urls = [];
    foreach (array_unique($matches[1]) as $pathOrUrl) {
        if (str_starts_with($pathOrUrl, 'http')) {
            $urls[] = $pathOrUrl;
        } else {
            $urls[] = 'https://cnnespanol.cnn.com' . $pathOrUrl;
        }
    }

    $total = 0;
    foreach ($urls as $articuloUrl) {
        if (rh_noticia_existe($conn, $articuloUrl)) {
            continue;
        }
        $articuloHtml = rh_noticias_obtener_html($articuloUrl);
        if ($articuloHtml === null) {
            continue;
        }
        $og = rh_noticias_extraer_og($articuloHtml);
        if (empty($og['titulo'])) {
            continue;
        }
        rh_noticia_upsert(
            $conn,
            'cnn',
            $articuloUrl,
            $og['titulo'],
            $og['resumen'],
            $og['imagenUrl'],
            $og['publicadoEn']
        );
        $total++;
    }
    return $total;
}

/**
 * National Geographic LA — enlaces de categoría + og: por artículo.
 */
function rh_ingestar_natgeo(mysqli $conn): int
{
    $categoriaUrl = 'https://www.nationalgeographicla.com/animales';
    $html = rh_noticias_obtener_html($categoriaUrl);
    if ($html === null) {
        throw new RuntimeException('No se pudo descargar la categoría de National Geographic LA');
    }

    if (!preg_match_all(
        '~href="(https://www\.nationalgeographicla\.com/animales/\d{4}/\d{2}/[^"?#]+|/animales/\d{4}/\d{2}/[^"?#]+)"~',
        $html,
        $matches
    )) {
        if (!preg_match_all('#href="(/animales/\d{4}/\d{2}/[^"]+)"#', $html, $matches)) {
            throw new RuntimeException('National Geographic LA: no se encontraron enlaces de artículos');
        }
    }

    $urls = [];
    foreach (array_unique($matches[1]) as $pathOrUrl) {
        if (str_starts_with($pathOrUrl, 'http')) {
            $urls[] = $pathOrUrl;
        } else {
            $urls[] = 'https://www.nationalgeographicla.com' . $pathOrUrl;
        }
    }

    $total = 0;
    foreach ($urls as $articuloUrl) {
        if (rh_noticia_existe($conn, $articuloUrl)) {
            continue;
        }
        $articuloHtml = rh_noticias_obtener_html($articuloUrl);
        if ($articuloHtml === null) {
            continue;
        }
        $og = rh_noticias_extraer_og($articuloHtml);
        if (empty($og['titulo'])) {
            continue;
        }
        rh_noticia_upsert(
            $conn,
            'natgeo',
            $articuloUrl,
            $og['titulo'],
            $og['resumen'],
            $og['imagenUrl'],
            $og['publicadoEn']
        );
        $total++;
    }
    return $total;
}

/**
 * Fuentes disponibles: nombre => callable.
 *
 * @return array<string, callable(mysqli):int>
 */
function rh_noticias_fuentes_ingesta(): array
{
    return [
        'infobae' => 'rh_ingestar_infobae',
        'lavanguardia' => 'rh_ingestar_lavanguardia',
        'ambito' => 'rh_ingestar_ambito',
        'cnn' => 'rh_ingestar_cnn',
        'natgeo' => 'rh_ingestar_natgeo',
    ];
}

/**
 * Si no hay noticias o la más reciente tiene más de N horas, corre las
 * fuentes RSS rápidas (no scrapers pesados) para no dejar la pestaña vacía.
 */
function rh_noticias_asegurar_recientes(mysqli $conn, int $maxHoras = 6): void
{
    $row = $conn->query(
        "SELECT COUNT(*) AS c, MAX(IngestadoEn) AS ultimo FROM NoticiaExterna WHERE Estado = 'A'"
    )->fetch_assoc();
    $cantidad = (int) ($row['c'] ?? 0);
    $ultimo = $row['ultimo'] ?? null;
    $viejo = $ultimo === null || strtotime((string) $ultimo) < (time() - $maxHoras * 3600);

    if ($cantidad > 0 && !$viejo) {
        return;
    }

    // Solo RSS: suele completar en pocos segundos y evita timeouts de PHP-FPM.
    foreach (['rh_ingestar_infobae', 'rh_ingestar_lavanguardia'] as $fn) {
        try {
            $fn($conn);
        } catch (Throwable $e) {
            error_log('rh_noticias_asegurar: ' . $e->getMessage());
        }
    }
}
