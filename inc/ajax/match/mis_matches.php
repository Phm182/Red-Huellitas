<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/match.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    "SELECT MascotaMatch.*, MAX(MatchMensaje.CreatedAt) AS UltimaActividad
     FROM MascotaMatch
     LEFT JOIN MatchMensaje ON MatchMensaje.MatchId = MascotaMatch.MatchId
     WHERE MascotaMatch.Estado = 'A' AND (MascotaMatch.UserIdA = ? OR MascotaMatch.UserIdB = ?)
     GROUP BY MascotaMatch.MatchId
     ORDER BY COALESCE(MAX(MatchMensaje.CreatedAt), MascotaMatch.CreatedAt) DESC"
);
$stmt->bind_param('ii', $userId, $userId);
$stmt->execute();
$result = $stmt->get_result();

$matches = [];
while ($row = $result->fetch_assoc()) {
    $matches[] = rh_match_publico($conn, $row, $userId);
}
$stmt->close();

json_success(['matches' => $matches]);
