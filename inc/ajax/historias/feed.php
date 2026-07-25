<?php
/**
 * Historias activas de usuarios seguidos + propio, agrupadas por autor
 * (mismo patrón de followedIds que publicaciones/feed.php). Cada grupo indica
 * si el viewer ya vio todas las historias de ese autor, para pintar el
 * anillo del avatar en la barra de historias.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/historias.php';

$viewerUserId = rh_require_auth($conn);

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
$sql = "SELECT Historia.*, Usuario.UserId AS AutorUserId, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
        FROM Historia
        JOIN Usuario ON Usuario.UserId = Historia.UserId
        WHERE Historia.UserId IN ($placeholders) AND Historia.Estado = 'A' AND Historia.ExpiraEn > NOW()
        ORDER BY Historia.UserId, Historia.CreatedAt ASC";
$stmt = $conn->prepare($sql);
$stmt->bind_param(str_repeat('i', count($followedIds)), ...$followedIds);
$stmt->execute();
$result = $stmt->get_result();

$porUsuario = [];
while ($row = $result->fetch_assoc()) {
    $uid = (int) $row['AutorUserId'];
    if (!isset($porUsuario[$uid])) {
        $porUsuario[$uid] = [
            'autor' => rh_usuario_resumen([
                'UserId' => $row['AutorUserId'],
                'Username' => $row['Username'],
                'NombreCompleto' => $row['NombreCompleto'],
                'AvatarPath' => $row['AvatarPath'],
            ]),
            'historias' => [],
        ];
    }
    $porUsuario[$uid]['historias'][] = rh_historia_publico($conn, $row, $viewerUserId);
}
$stmt->close();

$usuarios = array_values(array_map(function ($grupo) {
    $todasVistas = count($grupo['historias']) > 0 && !in_array(false, array_column($grupo['historias'], 'vista'), true);
    return [
        'autor' => $grupo['autor'],
        'todasVistas' => $todasVistas,
        'historias' => $grupo['historias'],
    ];
}, $porUsuario));

json_success(['usuarios' => $usuarios]);
