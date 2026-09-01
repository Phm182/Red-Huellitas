<?php
/**
 * Helpers compartidos para serializar Post/PostFoto/PostReaccion al shape
 * público usado por todos los endpoints de inc/ajax/publicaciones/.
 */

function rh_post_fotos(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare(
        'SELECT PostFotoId, Path, Orden FROM PostFoto WHERE PostId = ? ORDER BY Orden ASC, PostFotoId ASC'
    );
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'postFotoId' => (int) $row['PostFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Conteos de reacciones por tipo para un post.
 */
function rh_post_conteos(mysqli $conn, int $postId): array
{
    $stmt = $conn->prepare('SELECT Tipo, COUNT(*) AS total FROM PostReaccion WHERE PostId = ? GROUP BY Tipo');
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $result = $stmt->get_result();

    $conteos = [
        'like' => 0,
        'meDivierte' => 0,
        'amor' => 0,
        'asombro' => 0,
        'triste' => 0,
        'abrazo' => 0,
        'huella' => 0,
        'apoyo' => 0,
        'guau' => 0,
        'michi' => 0,
    ];
    $map = [
        'like' => 'like',
        'me_divierte' => 'meDivierte',
        'amor' => 'amor',
        'asombro' => 'asombro',
        'triste' => 'triste',
        'abrazo' => 'abrazo',
        'huella' => 'huella',
        'apoyo' => 'apoyo',
        'guau' => 'guau',
        'michi' => 'michi',
    ];
    while ($row = $result->fetch_assoc()) {
        $tipo = $row['Tipo'];
        if (isset($map[$tipo])) {
            $conteos[$map[$tipo]] = (int) $row['total'];
        }
    }
    $stmt->close();

    return $conteos;
}

function rh_post_mi_reaccion(mysqli $conn, int $postId, int $viewerUserId): ?string
{
    $stmt = $conn->prepare('SELECT Tipo FROM PostReaccion WHERE PostId = ? AND UserId = ?');
    $stmt->bind_param('ii', $postId, $viewerUserId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? $row['Tipo'] : null;
}

/** Cantidad de comentarios activos de un post, para el shape público. */
function rh_post_total_comentarios(mysqli $conn, int $postId): int
{
    $stmt = $conn->prepare("SELECT COUNT(*) AS total FROM Comentario WHERE PostId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int) $row['total'];
}

/**
 * Serializa un row de Comentario (array asociativo de la DB, con columnas de
 * Usuario ya incluidas vía JOIN) al shape público.
 */
function rh_comentario_publico(array $c, int $viewerUserId): array
{
    return [
        'comentarioId' => (int) $c['ComentarioId'],
        'postId' => (int) $c['PostId'],
        'autor' => rh_usuario_resumen([
            'UserId' => $c['UserId'],
            'Username' => $c['Username'],
            'NombreCompleto' => $c['NombreCompleto'],
            'AvatarPath' => $c['AvatarPath'],
        ]),
        'texto' => $c['Texto'],
        'esDueno' => (int) $c['UserId'] === $viewerUserId,
        'createdAt' => $c['CreatedAt'],
    ];
}

function rh_post_autor_seguido(mysqli $conn, int $autorId, int $viewerUserId): bool
{
    if ($autorId === $viewerUserId) {
        return false;
    }
    $stmt = $conn->prepare('SELECT SeguimientoId FROM Seguimiento WHERE UserIdSeguidor = ? AND UserIdSeguido = ?');
    $stmt->bind_param('ii', $viewerUserId, $autorId);
    $stmt->execute();
    $tieneFollow = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $tieneFollow;
}

/**
 * Serializa un row de Post (array asociativo de la DB) al shape público.
 */
function rh_post_publico(mysqli $conn, array $p, int $viewerUserId): array
{
    $stmt = $conn->prepare('SELECT * FROM Usuario WHERE UserId = ?');
    $autorId = (int) $p['UserId'];
    $stmt->bind_param('i', $autorId);
    $stmt->execute();
    $autor = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $postId = (int) $p['PostId'];

    return [
        'postId' => $postId,
        'autor' => $autor ? rh_usuario_resumen($autor) : null,
        'autorSeguido' => rh_post_autor_seguido($conn, $autorId, $viewerUserId),
        'texto' => $p['Texto'],
        'fotos' => rh_post_fotos($conn, $postId),
        'videoPath' => $p['VideoPath'] ?? null,
        'duracionSegundos' => isset($p['DuracionSegundos']) && $p['DuracionSegundos'] !== null
            ? (int) $p['DuracionSegundos']
            : null,
        'conteos' => rh_post_conteos($conn, $postId),
        'miReaccion' => rh_post_mi_reaccion($conn, $postId, $viewerUserId),
        'totalComentarios' => rh_post_total_comentarios($conn, $postId),
        'esDueno' => $autorId === $viewerUserId,
        'estado' => $p['Estado'],
        'createdAt' => $p['CreatedAt'],
    ];
}
