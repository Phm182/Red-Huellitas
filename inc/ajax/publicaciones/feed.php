<?php
/**
 * Feed simple (no es un recomendador real, ver plan): mezcla cronológico de
 * usuarios seguidos (+ propio) con una porción de "recomendados" (posts de
 * usuarios no seguidos, rankeados por reacciones recientes). No hay cursor
 * estable para la porción recomendada — puede repetirse entre páginas de una
 * misma sesión de scroll, aceptable para este alcance.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 15;

// IDs seguidos + el propio usuario (para ver los propios posts en el feed)
$followedIds = [$viewerUserId];
$stmt = $conn->prepare('SELECT UserIdSeguido FROM Seguimiento WHERE UserIdSeguidor = ?');
$stmt->bind_param('i', $viewerUserId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $followedIds[] = (int) $row['UserIdSeguido'];
}
$stmt->close();

$recLimit = max(1, (int) floor($limit / 5));
$chronoLimit = max(1, $limit - $recLimit);

$placeholders = implode(',', array_fill(0, count($followedIds), '?'));

// --- Slice cronológico: posts de seguidos (+propio) ---
$sql = "SELECT * FROM Post WHERE UserId IN ($placeholders) AND Estado = 'A'";
$types = str_repeat('i', count($followedIds));
$params = $followedIds;
if ($cursor !== null) {
    $sql .= ' AND PostId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY PostId DESC LIMIT ' . $chronoLimit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();
$cronologicos = [];
while ($row = $result->fetch_assoc()) {
    $cronologicos[] = $row;
}
$stmt->close();

// --- Slice recomendado: posts de NO seguidos, rankeados por reacciones recientes ---
$sql = "SELECT Post.*, COUNT(pr.PostReaccionId) AS reaccionesRecientes
        FROM Post
        LEFT JOIN PostReaccion pr ON pr.PostId = Post.PostId AND pr.CreatedAt > (NOW() - INTERVAL 72 HOUR)
        WHERE Post.UserId NOT IN ($placeholders) AND Post.Estado = 'A'
        GROUP BY Post.PostId
        ORDER BY reaccionesRecientes DESC, Post.PostId DESC
        LIMIT $recLimit";
$stmt = $conn->prepare($sql);
$stmt->bind_param(str_repeat('i', count($followedIds)), ...$followedIds);
$stmt->execute();
$result = $stmt->get_result();
$recomendados = [];
while ($row = $result->fetch_assoc()) {
    unset($row['reaccionesRecientes']);
    $recomendados[] = $row;
}
$stmt->close();

// Intercalar: 1 recomendado cada ~5 posiciones
$posts = [];
$recIndex = 0;
foreach ($cronologicos as $i => $row) {
    $posts[] = ['row' => $row, 'origen' => 'seguido'];
    if (($i + 1) % 5 === 0 && $recIndex < count($recomendados)) {
        $posts[] = ['row' => $recomendados[$recIndex], 'origen' => 'recomendado'];
        $recIndex++;
    }
}
while ($recIndex < count($recomendados)) {
    $posts[] = ['row' => $recomendados[$recIndex], 'origen' => 'recomendado'];
    $recIndex++;
}

$data = array_map(function ($item) use ($conn, $viewerUserId) {
    $publico = rh_post_publico($conn, $item['row'], $viewerUserId);
    $publico['origen'] = $item['origen'];
    return $publico;
}, $posts);

$nextCursor = count($cronologicos) > 0 ? (int) end($cronologicos)['PostId'] : null;
if (count($cronologicos) < $chronoLimit) {
    // No hay más posts cronológicos que traer, se acabó la paginación estable.
    $nextCursor = null;
}

json_success(['posts' => $data, 'nextCursor' => $nextCursor]);
