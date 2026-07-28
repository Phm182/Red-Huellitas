<?php
/**
 * Puntos del mapa: todo lo que se ofrece o se pide cerca de un punto.
 *
 * GET  lat, lng, radioKm (default 10, máx 100)
 *      tipos  — CSV opcional de claves (adopcion,transito,…). Sin esto vienen
 *               todas las capas.
 *      limitePorTipo — default 200, máx 500.
 *
 * El límite es por capa y no global a propósito: con un tope global, un módulo
 * con muchas publicaciones (Productos) se comería el cupo y las demás capas
 * desaparecerían del mapa aunque estuvieran ahí.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mapa.php';

$userId = rh_require_auth($conn);

$lat = isset($_GET['lat']) && $_GET['lat'] !== '' ? (float) $_GET['lat'] : null;
$lng = isset($_GET['lng']) && $_GET['lng'] !== '' ? (float) $_GET['lng'] : null;

// Sin coordenadas se cae a la zona guardada del usuario, así que el mapa abre
// en algún lado razonable aunque el permiso de ubicación esté denegado.
if ($lat === null || $lng === null) {
    $stmt = $conn->prepare('SELECT ZonaLat, ZonaLng FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $u = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$u || $u['ZonaLat'] === null || $u['ZonaLng'] === null) {
        json_error('Falta lat/lng y tu cuenta no tiene zona configurada');
    }
    $lat = (float) $u['ZonaLat'];
    $lng = (float) $u['ZonaLng'];
}

if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) {
    json_error('Coordenadas fuera de rango');
}

$radioKm = isset($_GET['radioKm']) && $_GET['radioKm'] !== '' ? (float) $_GET['radioKm'] : 10.0;
$radioKm = max(0.5, min(100.0, $radioKm));

$limitePorTipo = isset($_GET['limitePorTipo']) ? (int) $_GET['limitePorTipo'] : 200;
$limitePorTipo = max(1, min(500, $limitePorTipo));

$fuentes = rh_mapa_fuentes();

// Acepta `tipos=a,b` y también `tipos[]=a&tipos[]=b`: es la forma que arma
// solo cualquier cliente HTTP, y sin esto llegaba como array y reventaba trim().
$pedidosRaw = $_GET['tipos'] ?? '';
$pedidos = is_array($pedidosRaw) ? implode(',', $pedidosRaw) : trim((string) $pedidosRaw);
if ($pedidos !== '') {
    $claves = array_values(array_intersect(
        array_map('trim', explode(',', $pedidos)),
        rh_mapa_tipos_validos()
    ));
    if (count($claves) === 0) {
        json_error('Ninguno de los tipos pedidos existe');
    }
} else {
    $claves = rh_mapa_tipos_validos();
}

$puntos = [];
$conteo = [];
foreach ($claves as $clave) {
    $delTipo = rh_mapa_buscar_tipo($conn, $clave, $fuentes[$clave], $lat, $lng, $radioKm, $limitePorTipo);
    $conteo[$clave] = count($delTipo);
    $puntos = array_merge($puntos, $delTipo);
}

// Ordenado por distancia para que la hoja de resultados muestre primero lo más
// cercano sin que el cliente tenga que reordenar.
usort($puntos, static fn(array $a, array $b) => $a['distanciaKm'] <=> $b['distanciaKm']);

json_success([
    'centro' => ['lat' => $lat, 'lng' => $lng],
    'radioKm' => $radioKm,
    'puntos' => $puntos,
    'total' => count($puntos),
    'porTipo' => $conteo,
]);
