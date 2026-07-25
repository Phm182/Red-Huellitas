<?php
/**
 * Ingesta de Noticias externas para la pestaña "General" de Noticias.
 *
 * No hay cron corriendo en este XAMPP — este script se ejecuta manualmente o
 * programado vía el Programador de Tareas de Windows, por ejemplo cada 6hs:
 *
 *   schtasks /create /tn "RH_Ingesta_Noticias" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\ingestar_noticias.php\"" /sc hourly /mo 6
 *
 * Ejecución manual:
 *   C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\ingestar_noticias.php"
 *
 * Cada fuente corre en su propio try/catch: si una fuente está caída o
 * cambió su HTML, las demás igual se ingestan (no se detiene todo el run).
 */

require_once __DIR__ . '/../funciones/bd.php';
require_once __DIR__ . '/../funciones/noticias.php';

/**
 * Infobae tiene RSS oficial para la categoría Mascotas.
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
        $publicadoEn = null;
        if (!empty($item->pubDate)) {
            $ts = strtotime((string) $item->pubDate);
            $publicadoEn = $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
        }
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
 * La Vanguardia tiene RSS oficial dedicado a Mascotas.
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
        $publicadoEn = null;
        if (!empty($item->pubDate)) {
            $ts = strtotime((string) $item->pubDate);
            $publicadoEn = $ts !== false ? date('Y-m-d H:i:s', $ts) : null;
        }
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
 * Ámbito no tiene RSS: la página de categoría trae un JSON-LD ItemList con
 * las URLs de artículos recientes; cada artículo individual sí tiene
 * og:title/description/image limpios.
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
        // A veces json_decode da un objeto único, a veces un array de objetos
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
            continue; // no re-descargar artículos ya ingeridos
        }
        $articuloHtml = rh_noticias_obtener_html($articuloUrl);
        if ($articuloHtml === null) {
            continue; // un artículo individual roto no aborta la fuente entera
        }
        $og = rh_noticias_extraer_og($articuloHtml);
        if (empty($og['titulo'])) {
            continue;
        }
        rh_noticia_upsert($conn, 'ambito', $articuloUrl, $og['titulo'], $og['resumen'], $og['imagenUrl'], null);
        $total++;
    }
    return $total;
}

/**
 * CNN Español no tiene RSS público para esta sección: se extraen los
 * enlaces a artículos directamente del HTML de la categoría.
 */
function rh_ingestar_cnn(mysqli $conn): int
{
    $categoriaUrl = 'https://cnnespanol.cnn.com/ciencia/animales';
    $html = rh_noticias_obtener_html($categoriaUrl);
    if ($html === null) {
        throw new RuntimeException('No se pudo descargar la categoría de CNN Español');
    }

    if (!preg_match_all('#href="(/\d{4}/\d{2}/\d{2}/[^"]+)"#', $html, $matches)) {
        throw new RuntimeException('CNN Español: no se encontraron enlaces de artículos');
    }

    $urls = [];
    foreach (array_unique($matches[1]) as $path) {
        $urls[] = 'https://cnnespanol.cnn.com' . $path;
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
        rh_noticia_upsert($conn, 'cnn', $articuloUrl, $og['titulo'], $og['resumen'], $og['imagenUrl'], null);
        $total++;
    }
    return $total;
}

/**
 * National Geographic LA no tiene RSS público para esta sección: se
 * extraen los enlaces a artículos directamente del HTML de la categoría.
 */
function rh_ingestar_natgeo(mysqli $conn): int
{
    $categoriaUrl = 'https://www.nationalgeographicla.com/animales';
    $html = rh_noticias_obtener_html($categoriaUrl);
    if ($html === null) {
        throw new RuntimeException('No se pudo descargar la categoría de National Geographic LA');
    }

    if (!preg_match_all('#href="(/animales/\d{4}/\d{2}/[^"]+)"#', $html, $matches)) {
        throw new RuntimeException('National Geographic LA: no se encontraron enlaces de artículos');
    }

    $urls = [];
    foreach (array_unique($matches[1]) as $path) {
        $urls[] = 'https://www.nationalgeographicla.com' . $path;
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
        rh_noticia_upsert($conn, 'natgeo', $articuloUrl, $og['titulo'], $og['resumen'], $og['imagenUrl'], null);
        $total++;
    }
    return $total;
}

$fuentes = [
    'infobae' => 'rh_ingestar_infobae',
    'lavanguardia' => 'rh_ingestar_lavanguardia',
    'ambito' => 'rh_ingestar_ambito',
    'cnn' => 'rh_ingestar_cnn',
    'natgeo' => 'rh_ingestar_natgeo',
];

foreach ($fuentes as $nombre => $funcion) {
    try {
        $total = $funcion($conn);
        echo "[$nombre] OK: $total noticias procesadas\n";
    } catch (Throwable $e) {
        echo "[$nombre] FALLÓ: " . $e->getMessage() . "\n";
    }
}
