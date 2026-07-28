<?php
/**
 * Qué motor de mapa usar en esta carga, y con qué credencial.
 *
 * El cliente pide esto UNA vez, justo antes de crear el mapa, y usa lo que le
 * digan. El token nunca se embebe en el bundle de la app: si estuviera ahí, el
 * navegador podría crear mapas sin pasar por acá y el contador quedaría ciego,
 * que es precisamente lo que hay que evitar para no pasarse de la cuota.
 *
 * Respuesta:
 *   motor  'mapbox' | 'maplibre'
 *   token  sólo cuando motor = 'mapbox'
 *   estilo URL del estilo a aplicar según el tema
 *
 * Cuando no hay cupo (o no hay token configurado) responde 'maplibre' con 200,
 * no un error: no falló nada, simplemente se dibuja con el otro proveedor.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mapa_uso.php';

$userId = rh_require_auth($conn);

$oscuro = ($_GET['tema'] ?? 'oscuro') !== 'claro';
$cfg = rh_mapa_config();

$token = trim((string) $cfg['MAPBOX_TOKEN']);
$hayToken = $token !== '';

$motivo = null;
$usaMapbox = false;

if (!$hayToken) {
    $motivo = 'sin_token';
} elseif (!rh_mapa_reservar_carga($conn, $userId, $cfg)) {
    $motivo = 'sin_cupo';
} else {
    $usaMapbox = true;
}

$consumo = rh_mapa_consumo($conn, $userId);

if ($usaMapbox) {
    json_success([
        'motor' => 'mapbox',
        'token' => $token,
        'estilo' => $oscuro ? $cfg['MAPBOX_ESTILO_OSCURO'] : $cfg['MAPBOX_ESTILO_CLARO'],
        'consumo' => [
            'mes' => $consumo['mes'],
            'limiteMes' => (int) $cfg['LIMITE_MENSUAL_GLOBAL'],
            'diaUsuario' => $consumo['diaUsuario'],
            'limiteDiaUsuario' => (int) $cfg['LIMITE_DIARIO_USUARIO'],
        ],
    ]);
}

// MapLibre no necesita credencial. El estilo lo arma el cliente con mosaicos
// abiertos, así que acá sólo se informa el motor y por qué.
json_success([
    'motor' => 'maplibre',
    'motivo' => $motivo,
    'consumo' => [
        'mes' => $consumo['mes'],
        'limiteMes' => (int) $cfg['LIMITE_MENSUAL_GLOBAL'],
        'diaUsuario' => $consumo['diaUsuario'],
        'limiteDiaUsuario' => (int) $cfg['LIMITE_DIARIO_USUARIO'],
    ],
]);
