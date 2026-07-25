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
