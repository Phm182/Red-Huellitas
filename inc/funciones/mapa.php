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
 * necesita. Todo lo demás sale difuminado (ver rh_geo_difuminar), salvo que
 * quien publicó haya elegido mostrarla exacta: `exactaCol` es la columna (0/1)
 * de cada publicación donde se guarda esa elección.
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
            'exactaCol' => 'UbicacionExacta',
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
            'exactaCol' => 'UbicacionExacta',
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
            'exactaCol' => 'UbicacionExacta',
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
            'exactaCol' => 'UbicacionExacta',
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
            'exactaCol' => 'UbicacionExacta',
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
 * Guarda la elección "mostrar ubicación exacta" de una publicación.
 *
 * Se hace aparte del INSERT/UPDATE principal a propósito: si el código se
 * deploya antes que la migración 073, crear y editar publicaciones sigue
 * andando (simplemente no guarda la elección). Sólo escribe si el cliente
 * mandó `ubicacionExacta`, así una versión vieja de la app no pisa nada.
 */
function rh_mapa_guardar_exacta(mysqli $conn, string $tabla, string $pk, int $id, int $userId): void
{
    if (!array_key_exists('ubicacionExacta', $_POST)) {
        return;
    }
    if (!rh_mapa_columna_existe($conn, $tabla, 'UbicacionExacta')) {
        return;
    }
    $exacta = filter_var($_POST['ubicacionExacta'], FILTER_VALIDATE_BOOLEAN) ? 1 : 0;
    $stmt = $conn->prepare("UPDATE $tabla SET UbicacionExacta = ? WHERE $pk = ? AND UserId = ?");
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('iii', $exacta, $id, $userId);
    $stmt->execute();
    $stmt->close();
}

/**
 * ¿Existe esa columna? Se cachea por request. Lo usa el mapa para leer la
 * elección "ubicación exacta" sólo si la migración ya corrió: un deploy del
 * código antes de la migración no puede dejar el mapa vacío.
 */
function rh_mapa_columna_existe(mysqli $conn, string $tabla, string $columna): bool
{
    static $cache = [];
    $k = $tabla . '.' . $columna;
    if (!isset($cache[$k])) {
        $stmt = $conn->prepare(
            'SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
             WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
        );
        $n = 0;
        if ($stmt) {
            $stmt->bind_param('ss', $tabla, $columna);
            $stmt->execute();
            $stmt->bind_result($n);
            $stmt->fetch();
            $stmt->close();
        }
        $cache[$k] = $n > 0;
    }
    return $cache[$k];
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

    // Publicaciones de personas: la columna dice si quien publicó eligió
    // mostrar la ubicación exacta. Lugares públicos no la tienen (0 fijo).
    $exacta = (!empty($f['exactaCol']) && rh_mapa_columna_existe($conn, $f['tabla'], $f['exactaCol']))
        ? "t.{$f['exactaCol']}"
        : '0';

    $sql = "SELECT
                t.{$f['pk']}      AS id,
                {$f['titulo']}    AS titulo,
                {$f['subtitulo']} AS subtitulo,
                t.{$f['zona']}    AS zona,
                t.{$f['lat']}     AS lat,
                t.{$f['lng']}     AS lng,
                $exacta           AS exacta,
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
        $esExacta = $f['publico'] || (int) $row['exacta'] === 1;
        if ($esExacta) {
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
            'ubicacionExacta' => $esExacta,
            'ruta' => sprintf($f['ruta'], (int) $row['id']),
        ];
    }
    $stmt->close();

    return $puntos;
}
