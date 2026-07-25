<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/perdido.php';

$userId = rh_require_auth($conn);

$perdidoId = (int) ($_POST['perdidoId'] ?? 0);
if ($perdidoId <= 0) {
    json_error('Falta perdidoId');
}

$stmt = $conn->prepare("SELECT * FROM Perdido WHERE PerdidoId = ? AND Estado = 'A'");
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$perdido) {
    json_error('Reporte no encontrado', 404);
}
if ((int) $perdido['UserId'] !== $userId) {
    json_error('No tenés permiso para modificar este reporte', 403);
}

if ($perdido['EstadoPerdido'] === 'activo') {
    $stmt = $conn->prepare("UPDATE Perdido SET EstadoPerdido = 'reencontrado' WHERE PerdidoId = ?");
    $stmt->bind_param('i', $perdidoId);
    $stmt->execute();
    $stmt->close();

    // Reposteo automático a Social: best-effort, nunca bloquea la respuesta.
    try {
        $mascotaId = $perdido['MascotaId'] !== null ? (int) $perdido['MascotaId'] : null;
        if ($mascotaId !== null) {
            $stmtNombre = $conn->prepare('SELECT Nombre FROM Mascota WHERE MascotaId = ?');
            $stmtNombre->bind_param('i', $mascotaId);
            $stmtNombre->execute();
            $nombre = $stmtNombre->get_result()->fetch_assoc()['Nombre'] ?? 'La mascota';
            $stmtNombre->close();
        } else {
            $nombre = $perdido['Nombre'] ?? 'La mascota';
        }

        $textoPost = $perdido['Tipo'] === 'perdido'
            ? "🎉 ¡Buenas noticias! $nombre fue reencontrado/a."
            : "🎉 ¡Buenas noticias! El animal encontrado ($nombre) fue reunido con su familia.";

        $stmtPost = $conn->prepare('INSERT INTO Post (UserId, Texto) VALUES (?, ?)');
        $stmtPost->bind_param('is', $userId, $textoPost);
        $stmtPost->execute();
        $postId = (int) $stmtPost->insert_id;
        $stmtPost->close();

        $fotos = rh_perdido_fotos($conn, $perdido);
        if (count($fotos) > 0) {
            $primeraFotoPath = $fotos[0]['path'];
            $stmtFoto = $conn->prepare('INSERT INTO PostFoto (PostId, Path, Orden) VALUES (?, ?, 0)');
            $stmtFoto->bind_param('is', $postId, $primeraFotoPath);
            $stmtFoto->execute();
            $stmtFoto->close();
        }
    } catch (Throwable $e) {
        // Silencioso a propósito: el cambio de estado ya se confirmó.
    }
}

json_success(['estadoPerdido' => 'reencontrado'], 'Estado actualizado');
