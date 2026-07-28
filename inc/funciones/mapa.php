<?php
/**
 * Fuentes del mapa: qué módulos se dibujan y de dónde sale cada punto.
 *
 * El mapa junta en una sola vista publicaciones de siete módulos que no
 * comparten ni nombres de columna ni forma. En vez de siete endpoints o un
 * `switch` gigante, acá vive **un registro declarativo**: cada entrada dice de
 * qué tabla sale, cómo se arma el título, dónde están sus coordenadas y a qué
 * ruta de la app lleva. `rh_mapa_buscar()` sabe leer eso y no sabe nada de
 * ningún módulo en particular.
 *
 * La ventaja concreta: agregar un módulo al mapa es agregar una entrada acá,
 * no tocar la consulta. Y como el difuminado y el filtro de radio se aplican en
 * un solo lugar, no puede pasar que un módulo nuevo se olvide de difuminar y
 * publique la dirección de alguien.
 *
 * **Qué queda afuera y por qué:**
 *  - Huelligram (publicaciones, Huellitas, Huetube): no son "algo que se
 *    ofrece o se pide" en un lugar, son contenido social. Pedido explícito.
 *  - Match: una mascota no tiene ubicación propia, tendría la casa del dueño.
 *    Poner en un mapa dónde vive cada persona con su mascota es justo lo que
 *    el difuminado trata de evitar, y Match ya tiene su propio descubrimiento.
 *  - Cuidados: contenido editorial, no pasa en ningún lado.
 */

require_once __DIR__ . '/geo.php';
require_once __DIR__ . '/uploads.php';

/**
 * Definición de cada capa del mapa.
 *
 * `publico = true` significa que el punto se muestra exacto. Es para lugares
 * con puerta a la calle —una veterinaria, un refugio, una campaña de
 * castración— donde la dirección precisa es justamente el dato que la gente
 * necesita. Todo lo demás sale difuminado (ver rh_geo_difuminar).
 */
function rh_mapa_fuentes(): array
{
    return [
        'adopcion' => [
            'tabla' => 'Adopcion',
            'pk' => 'AdopcionId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => 'Nombre',
            'subtitulo' => "COALESCE(RazaTexto, Especie)",
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A' AND EstadoAdopcion = 'disponible'",
            'fotoTabla' => 'AdopcionFoto',
            'fotoFk' => 'AdopcionId',
            'ruta' => '/(app)/adopcion/%d',
            'publico' => false,
        ],
        'transito' => [
            'tabla' => 'Transito',
            'pk' => 'TransitoId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => "COALESCE(Nombre, CONCAT(Tipo, ' tránsito'))",
            'subtitulo' => "COALESCE(RazaTexto, Especie, Tipo)",
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A' AND EstadoTransito = 'disponible'",
            'fotoTabla' => 'TransitoFoto',
            'fotoFk' => 'TransitoId',
            'ruta' => '/(app)/transito/%d',
            'publico' => false,
        ],
        'perdidos' => [
            'tabla' => 'Perdido',
            'pk' => 'PerdidoId',
            'lat' => 'UltimoLugarLat',
            'lng' => 'UltimoLugarLng',
            'titulo' => "COALESCE(Nombre, 'Sin nombre')",
            'subtitulo' => "CONCAT(Tipo, ' · ', COALESCE(RazaTexto, Especie, ''))",
            'zona' => 'UltimoLugarDescripcion',
            'where' => "Estado = 'A' AND EstadoPerdido = 'activo'",
            'fotoTabla' => 'PerdidoFoto',
            'fotoFk' => 'PerdidoId',
            'ruta' => '/(app)/perdidos/%d',
            'publico' => false,
        ],
        'donaciones' => [
            'tabla' => 'Donacion',
            'pk' => 'DonacionId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => "CONCAT(UPPER(LEFT(Tipo,1)), SUBSTRING(Tipo,2), ' ', Categoria)",
            'subtitulo' => 'Descripcion',
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A' AND EstadoDonacion = 'disponible'",
            'fotoTabla' => 'DonacionFoto',
            'fotoFk' => 'DonacionId',
            'ruta' => '/(app)/donaciones/%d',
            'publico' => false,
        ],
        'productos' => [
            'tabla' => 'Producto',
            'pk' => 'ProductoId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => 'Nombre',
            'subtitulo' => "CONCAT('$', FORMAT(Precio, 0))",
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A' AND Cantidad > 0",
            'fotoTabla' => 'ProductoFoto',
            'fotoFk' => 'ProductoId',
            'ruta' => '/(app)/productos/%d',
            'publico' => false,
        ],
        'veterinarias' => [
            'tabla' => 'Veterinaria',
            'pk' => 'VeterinariaId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => 'Nombre',
            // La dirección primero: en el mapa es lo que se busca.
            'subtitulo' => "COALESCE(NULLIF(Direccion,''), Horario, '')",
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A'",
            'fotoTabla' => 'VeterinariaFoto',
            'fotoFk' => 'VeterinariaId',
            'ruta' => '/(app)/veterinarias/%d',
            'publico' => true,
        ],
        'campanias' => [
            'tabla' => 'Campania',
            'pk' => 'CampaniaId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => 'Titulo',
            'subtitulo' => "CONCAT(Tipo, ' · ', DATE_FORMAT(FechaDesde, '%d/%m'))",
            'zona' => 'ZonaDescripcion',
            // Sólo las que no terminaron: una campaña de la semana pasada en el
            // mapa es ruido que manda gente a un lugar donde ya no hay nada.
            'where' => "Estado = 'A' AND (FechaHasta IS NULL OR FechaHasta >= CURDATE())",
            'fotoTabla' => null,
            'fotoFk' => null,
            'ruta' => '/(app)/campanias/%d',
            'publico' => true,
        ],
        'refugios' => [
            // Los refugios no tienen tabla propia: son usuarios con
            // TipoUsuario = 'refugio'. La foto es el avatar.
            'tabla' => 'Usuario',
            'pk' => 'UserId',
            'lat' => 'ZonaLat',
            'lng' => 'ZonaLng',
            'titulo' => "COALESCE(NombreCompleto, Username)",
            'subtitulo' => "CONCAT('@', Username)",
            'zona' => 'ZonaDescripcion',
            'where' => "Estado = 'A' AND OnboardingCompleto = 'Y'
                        AND TipoUsuarioId = (SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = 'refugio')",
            'fotoTabla' => null,
            'fotoFk' => null,
            'fotoCol' => 'AvatarPath',
            'ruta' => '/(app)/perfil/%d',
            'publico' => true,
        ],
    ];
}

/** Las claves válidas para el filtro `tipos[]`. */
function rh_mapa_tipos_validos(): array
{
    return array_keys(rh_mapa_fuentes());
}

/**
 * Busca los puntos de un tipo dentro del radio pedido.
 *
 * Prefiltra con la caja de coordenadas (que usa índice) y recién sobre eso
 * calcula el haversine. La foto sale de una subconsulta a la tabla de fotos
 * tomando la de menor `Orden`, que es la portada.
 */
function rh_mapa_buscar_tipo(
    mysqli $conn,
    string $clave,
    array $f,
    float $lat,
    float $lng,
    float $radioKm,
    int $limite
): array {
    $bbox = rh_geo_bbox($lat, $lng, $radioKm);

    if (!empty($f['fotoTabla'])) {
        $foto = "(SELECT Path FROM {$f['fotoTabla']} ft
                  WHERE ft.{$f['fotoFk']} = t.{$f['pk']}
                  ORDER BY ft.Orden ASC LIMIT 1)";
    } elseif (!empty($f['fotoCol'])) {
        $foto = "t.{$f['fotoCol']}";
    } else {
        $foto = 'NULL';
    }

    $sql = "SELECT
                t.{$f['pk']}      AS id,
                {$f['titulo']}    AS titulo,
                {$f['subtitulo']} AS subtitulo,
                t.{$f['zona']}    AS zona,
                t.{$f['lat']}     AS lat,
                t.{$f['lng']}     AS lng,
                $foto             AS foto,
                (6371 * ACOS(LEAST(1, COS(RADIANS(?)) * COS(RADIANS(t.{$f['lat']}))
                    * COS(RADIANS(t.{$f['lng']}) - RADIANS(?))
                    + SIN(RADIANS(?)) * SIN(RADIANS(t.{$f['lat']}))))) AS distanciaKm
            FROM {$f['tabla']} t
            WHERE {$f['where']}
              AND t.{$f['lat']} IS NOT NULL AND t.{$f['lng']} IS NOT NULL
              AND t.{$f['lat']} BETWEEN ? AND ?
              AND t.{$f['lng']} BETWEEN ? AND ?
            HAVING distanciaKm <= ?
            ORDER BY distanciaKm ASC
            LIMIT ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        // Un módulo mal declarado en el registro no puede tumbar el mapa
        // entero: se saltea esa capa y las demás siguen.
        error_log("rh_mapa_buscar_tipo[$clave]: " . $conn->error);
        return [];
    }

    $stmt->bind_param(
        'ddddddddi',
        $lat, $lng, $lat,
        $bbox['latMin'], $bbox['latMax'],
        $bbox['lngMin'], $bbox['lngMax'],
        $radioKm, $limite
    );
    $stmt->execute();
    $res = $stmt->get_result();

    $puntos = [];
    while ($row = $res->fetch_assoc()) {
        $latReal = (float) $row['lat'];
        $lngReal = (float) $row['lng'];

        // Acá es donde se decide si se publica la dirección exacta o no.
        // Un solo lugar, para todos los módulos.
        if ($f['publico']) {
            $latPub = $latReal;
            $lngPub = $lngReal;
        } else {
            $d = rh_geo_difuminar($latReal, $lngReal, $clave . ':' . $row['id']);
            $latPub = $d['lat'];
            $lngPub = $d['lng'];
        }

        $puntos[] = [
            'tipo' => $clave,
            'id' => (int) $row['id'],
            'titulo' => $row['titulo'],
            'subtitulo' => $row['subtitulo'] !== null ? mb_strimwidth((string) $row['subtitulo'], 0, 80, '…') : null,
            'zonaDescripcion' => $row['zona'],
            'lat' => round($latPub, 6),
            'lng' => round($lngPub, 6),
            'fotoPath' => $row['foto'],
            'distanciaKm' => round((float) $row['distanciaKm'], 2),
            'ubicacionExacta' => (bool) $f['publico'],
            'ruta' => sprintf($f['ruta'], (int) $row['id']),
        ];
    }
    $stmt->close();

    return $puntos;
}
