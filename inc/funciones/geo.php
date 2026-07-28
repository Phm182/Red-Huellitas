<?php
/**
 * Helpers de distancia geográfica para Red Huellitas.
 * Primera vez que se necesita una query de distancia en el codebase (Fase 4b,
 * Campañas) — fórmula haversine estándar en SQL, sin extensión espacial
 * (compatible con MariaDB 10.4.32, ya confirmado corriendo en este XAMPP).
 */

/**
 * Devuelve [UserId => ExpoPushToken] de los usuarios con push token
 * registrado y zona conocida que están a `$radioKm` o menos del punto dado.
 */
function rh_usuarios_en_radio(mysqli $conn, float $lat, float $lng, float $radioKm): array
{
    $stmt = $conn->prepare(
        'SELECT UserId, ExpoPushToken,
            (6371 * ACOS(
                COS(RADIANS(?)) * COS(RADIANS(ZonaLat)) * COS(RADIANS(ZonaLng) - RADIANS(?))
                + SIN(RADIANS(?)) * SIN(RADIANS(ZonaLat))
            )) AS DistanciaKm
         FROM Usuario
         WHERE ExpoPushToken IS NOT NULL AND ZonaLat IS NOT NULL AND ZonaLng IS NOT NULL AND NotificarProximidad = 1
         HAVING DistanciaKm <= ?'
    );
    $stmt->bind_param('dddd', $lat, $lng, $lat, $radioKm);
    $stmt->execute();
    $result = $stmt->get_result();

    $usuarios = [];
    while ($row = $result->fetch_assoc()) {
        $usuarios[(int) $row['UserId']] = $row['ExpoPushToken'];
    }
    $stmt->close();

    return $usuarios;
}

/** Metros por grado de latitud. Constante a los fines de esta app. */
const RH_METROS_POR_GRADO_LAT = 111320.0;

/**
 * Caja de coordenadas que contiene al círculo de radio $radioKm.
 *
 * Sirve para prefiltrar con un `BETWEEN` que sí usa índice, antes de calcular
 * el haversine real sobre el puñado de filas que quedan. Sin esto cada consulta
 * del mapa calcularía distancias sobre la tabla entera.
 *
 * Devuelve más de lo que el círculo abarca (una caja no es un círculo): la
 * distancia exacta se sigue filtrando después.
 */
function rh_geo_bbox(float $lat, float $lng, float $radioKm): array
{
    $dLat = ($radioKm * 1000) / RH_METROS_POR_GRADO_LAT;

    // Cerca de los polos un grado de longitud vale muy poco, así que la caja
    // se ensancha. El clamp evita la división por cero justo en el polo.
    $cos = max(0.01, cos(deg2rad($lat)));
    $dLng = ($radioKm * 1000) / (RH_METROS_POR_GRADO_LAT * $cos);

    return [
        'latMin' => $lat - $dLat,
        'latMax' => $lat + $dLat,
        'lngMin' => $lng - $dLng,
        'lngMax' => $lng + $dLng,
    ];
}

/**
 * Corre un punto a un lugar cercano al azar, para no publicar dónde vive nadie.
 *
 * El mapa muestra publicaciones de gente común —"doy en adopción", "perdí a mi
 * gato"— y el punto exacto sería la puerta de su casa. Se difumina dentro de
 * unas 5 cuadras (500 m por defecto).
 *
 * **El corrimiento es determinista a propósito, no aleatorio.** Si cada
 * consulta devolviera un punto distinto, bastaría con pedir la misma
 * publicación muchas veces y promediar los resultados para que el centro
 * verdadero aparezca solo: el ruido se cancela y la dirección real queda
 * expuesta. Derivándolo de un hash de la publicación, el punto mostrado es
 * siempre el mismo y promediar no revela nada.
 *
 * La distancia usa `sqrt($u)` y no `$u` directo porque hace falta que el punto
 * quede repartido parejo por toda el área del círculo. Con `$u` lineal se
 * amontonarían cerca del centro, que es exactamente el lugar que se quiere
 * esconder.
 *
 * Los lugares públicos (veterinarias, refugios, campañas) NO pasan por acá:
 * ahí la dirección exacta es el dato útil, y esconderla haría que la gente no
 * encuentre el local.
 */
function rh_geo_difuminar(float $lat, float $lng, string $semilla, float $radioMetros = 500.0): array
{
    $h = md5($semilla);
    $u1 = hexdec(substr($h, 0, 8)) / 0xFFFFFFFF;   // ángulo
    $u2 = hexdec(substr($h, 8, 8)) / 0xFFFFFFFF;   // distancia

    $angulo = $u1 * 2 * M_PI;
    $dist = $radioMetros * sqrt($u2);

    $cos = max(0.01, cos(deg2rad($lat)));

    return [
        'lat' => $lat + ($dist * cos($angulo)) / RH_METROS_POR_GRADO_LAT,
        'lng' => $lng + ($dist * sin($angulo)) / (RH_METROS_POR_GRADO_LAT * $cos),
    ];
}
