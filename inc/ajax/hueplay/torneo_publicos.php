<?php
/**
 * Visualizador de torneos abiertos: los PÚBLICOS todavía en inscripción con
 * cupo libre, para sumarse sin código. Filtra los propios y, opcional, por
 * `juegoCodigo`.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$juegoCodigo = trim($_GET['juegoCodigo'] ?? '');
$filtrar = $juegoCodigo !== '' && rh_juego_existe($juegoCodigo);

$sqlJuego = $filtrar ? ' AND t.JuegoCodigo = ?' : '';
$sql =
    "SELECT t.* FROM Torneo t
      WHERE t.Estado = 'inscripcion' AND t.EsPublico = 1
        AND t.CreadorUserId <> ?
        AND (SELECT COUNT(*) FROM TorneoParticipante tp WHERE tp.TorneoId = t.TorneoId) < t.Tamano
        AND NOT EXISTS (SELECT 1 FROM TorneoParticipante tp2 WHERE tp2.TorneoId = t.TorneoId AND tp2.UserId = ?)
        $sqlJuego
      ORDER BY t.CreatedAt DESC
      LIMIT 40";

$stmt = $conn->prepare($sql);
if ($filtrar) {
    $stmt->bind_param('iis', $userId, $userId, $juegoCodigo);
} else {
    $stmt->bind_param('ii', $userId, $userId);
}
$stmt->execute();
$torneos = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$items = [];
foreach ($torneos as $t) {
    $ser = rh_torneo_serializar($conn, $t, $userId);
    $ser['inscriptos'] = count($ser['participantes']);
    $ser['cuposLibres'] = max(0, (int) $t['Tamano'] - $ser['inscriptos']);
    $items[] = $ser;
}

json_success(['torneos' => $items]);
