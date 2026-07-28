<?php
/**
 * Feed de HueTube (shorts): primero videos de seguidos (+ propios). Si no hay
 * o no alcanzan, completa con videos de usuarios no seguidos.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/publicaciones.php';

$viewerUserId = rh_require_auth($conn);

$cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
$limit = isset($_GET['limit']) ? max(1, min(50, (int) $_GET['limit'])) : 10;

$followedIds = [$viewerUserId];
$stmt = $conn->prepare('SELECT UserIdSeguido FROM Seguimiento WHERE UserIdSeguidor = ?');
$stmt->bind_param('i', $viewerUserId);
$stmt->execute();
$result = $stmt->get_result();
while ($row = $result->fetch_assoc()) {
    $followedIds[] = (int) $row['UserIdSeguido'];
}
$stmt->close();

$placeholders = implode(',', array_fill(0, count($followedIds), '?'));
$followedTypes = str_repeat('i', count($followedIds));

$sql = "SELECT * FROM Post
        WHERE UserId IN ($placeholders) AND VideoPath IS NOT NULL AND Estado = 'A'";
$types = $followedTypes;
$params = $followedIds;
if ($cursor !== null) {
    $sql .= ' AND PostId < ?';
    $types .= 'i';
    $params[] = $cursor;
}
$sql .= ' ORDER BY PostId DESC LIMIT ' . $limit;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();
$cronologicos = [];
while ($row = $result->fetch_assoc()) {
    $cronologicos[] = $row;
}
$stmt->close();

$faltan = $limit - count($cronologicos);
$soloRecomendados = count($cronologicos) === 0;

if ($soloRecomendados) {
    $recLimit = $limit;
} elseif ($faltan > 0) {
    $recLimit = $faltan;
} else {
    $recLimit = max(1, (int) floor($limit / 5));
}

$sql = "SELECT Post.*, COUNT(pr.PostReaccionId) AS reaccionesRecientes
        FROM Post
        LEFT JOIN PostReaccion pr ON pr.PostId = Post.PostId AND pr.CreatedAt > (NOW() - INTERVAL 72 HOUR)
        WHERE Post.UserId NOT IN ($placeholders)
          AND Post.VideoPath IS NOT NULL
          AND Post.Estado = 'A'";
$recTypes = $followedTypes;
$recParams = $followedIds;
if ($soloRecomendados && $cursor !== null) {
    $sql .= ' AND Post.PostId < ?';
    $recTypes .= 'i';
    $recParams[] = $cursor;
}
$sql .= " GROUP BY Post.PostId
          ORDER BY reaccionesRecientes DESC, Post.PostId DESC
          LIMIT $recLimit";

$stmt = $conn->prepare($sql);
$stmt->bind_param($recTypes, ...$recParams);
$stmt->execute();
$result = $stmt->get_result();
$recomendados = [];
while ($row = $result->fetch_assoc()) {
    unset($row['reaccionesRecientes']);
    $recomendados[] = $row;
}
$stmt->close();

$posts = [];
if ($soloRecomendados) {
    foreach ($recomendados as $row) {
        $posts[] = ['row' => $row, 'origen' => 'recomendado'];
    }
    $nextCursor = count($recomendados) === $limit
        ? (int) $recomendados[count($recomendados) - 1]['PostId']
        : null;
} else {
    $recIndex = 0;
    foreach ($cronologicos as $i => $row) {
        $posts[] = ['row' => $row, 'origen' => 'seguido'];
        if ($faltan === 0 && ($i + 1) % 5 === 0 && $recIndex < count($recomendados)) {
            $posts[] = ['row' => $recomendados[$recIndex], 'origen' => 'recomendado'];
            $recIndex++;
        }
    }
    while ($recIndex < count($recomendados)) {
        $posts[] = ['row' => $recomendados[$recIndex], 'origen' => 'recomendado'];
        $recIndex++;
    }
    $nextCursor = count($cronologicos) === $limit
        ? (int) $cronologicos[count($cronologicos) - 1]['PostId']
        : null;
}

$data = array_map(static function ($item) use ($conn, $viewerUserId) {
    $publico = rh_post_publico($conn, $item['row'], $viewerUserId);
    $publico['origen'] = $item['origen'];
    return $publico;
}, $posts);

json_success(['posts' => $data, 'nextCursor' => $nextCursor]);
