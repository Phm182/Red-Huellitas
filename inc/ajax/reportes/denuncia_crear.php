<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$userIdDenunciado = (int) ($_POST['userIdDenunciado'] ?? 0);
$motivo = trim($_POST['motivo'] ?? '');
$detalle = trim($_POST['detalle'] ?? '') ?: null;
$postId = isset($_POST['postId']) && $_POST['postId'] !== '' ? (int) $_POST['postId'] : null;
$historiaId = isset($_POST['historiaId']) && $_POST['historiaId'] !== '' ? (int) $_POST['historiaId'] : null;
$adopcionId = isset($_POST['adopcionId']) && $_POST['adopcionId'] !== '' ? (int) $_POST['adopcionId'] : null;
$campaniaId = isset($_POST['campaniaId']) && $_POST['campaniaId'] !== '' ? (int) $_POST['campaniaId'] : null;
$perdidoId = isset($_POST['perdidoId']) && $_POST['perdidoId'] !== '' ? (int) $_POST['perdidoId'] : null;
$transitoId = isset($_POST['transitoId']) && $_POST['transitoId'] !== '' ? (int) $_POST['transitoId'] : null;
$donacionId = isset($_POST['donacionId']) && $_POST['donacionId'] !== '' ? (int) $_POST['donacionId'] : null;
$veterinariaId = isset($_POST['veterinariaId']) && $_POST['veterinariaId'] !== '' ? (int) $_POST['veterinariaId'] : null;
$productoId = isset($_POST['productoId']) && $_POST['productoId'] !== '' ? (int) $_POST['productoId'] : null;
$comentarioId = isset($_POST['comentarioId']) && $_POST['comentarioId'] !== '' ? (int) $_POST['comentarioId'] : null;

if ($userIdDenunciado <= 0) {
    json_error('Falta userIdDenunciado');
}
if ($userIdDenunciado === $userId) {
    json_error('No podés denunciarte a vos mismo');
}
if ($motivo === '') {
    json_error('El motivo es obligatorio');
}

$stmt = $conn->prepare('SELECT UserId FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userIdDenunciado);
$stmt->execute();
if (!$stmt->get_result()->fetch_assoc()) {
    $stmt->close();
    json_error('El usuario denunciado no existe', 404);
}
$stmt->close();

if ($postId !== null) {
    $stmt = $conn->prepare("SELECT PostId FROM Post WHERE PostId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $postId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La publicación denunciada no existe', 404);
    }
    $stmt->close();
}

if ($historiaId !== null) {
    $stmt = $conn->prepare("SELECT HistoriaId FROM Historia WHERE HistoriaId = ? AND Estado = 'A' AND ExpiraEn > NOW()");
    $stmt->bind_param('i', $historiaId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La historia denunciada no existe', 404);
    }
    $stmt->close();
}

if ($adopcionId !== null) {
    $stmt = $conn->prepare("SELECT AdopcionId FROM Adopcion WHERE AdopcionId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $adopcionId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La publicación de adopción denunciada no existe', 404);
    }
    $stmt->close();
}

if ($campaniaId !== null) {
    $stmt = $conn->prepare("SELECT CampaniaId FROM Campania WHERE CampaniaId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La campaña denunciada no existe', 404);
    }
    $stmt->close();
}

if ($perdidoId !== null) {
    $stmt = $conn->prepare("SELECT PerdidoId FROM Perdido WHERE PerdidoId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $perdidoId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('El reporte denunciado no existe', 404);
    }
    $stmt->close();
}

if ($transitoId !== null) {
    $stmt = $conn->prepare("SELECT TransitoId FROM Transito WHERE TransitoId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $transitoId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La publicación de tránsito denunciada no existe', 404);
    }
    $stmt->close();
}

if ($donacionId !== null) {
    $stmt = $conn->prepare("SELECT DonacionId FROM Donacion WHERE DonacionId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $donacionId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La publicación de donación denunciada no existe', 404);
    }
    $stmt->close();
}

if ($veterinariaId !== null) {
    $stmt = $conn->prepare("SELECT VeterinariaId FROM Veterinaria WHERE VeterinariaId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $veterinariaId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La veterinaria denunciada no existe', 404);
    }
    $stmt->close();
}

if ($productoId !== null) {
    $stmt = $conn->prepare("SELECT ProductoId FROM Producto WHERE ProductoId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $productoId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La publicación denunciada no existe', 404);
    }
    $stmt->close();
}

if ($comentarioId !== null) {
    $stmt = $conn->prepare("SELECT ComentarioId FROM Comentario WHERE ComentarioId = ? AND Estado = 'A'");
    $stmt->bind_param('i', $comentarioId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('El comentario denunciado no existe', 404);
    }
    $stmt->close();
}

$stmt = $conn->prepare(
    'INSERT INTO Denuncia (UserIdDenunciante, UserIdDenunciado, PostId, HistoriaId, AdopcionId, CampaniaId, PerdidoId, TransitoId, DonacionId, VeterinariaId, ProductoId, ComentarioId, Motivo, Detalle)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'iiiiiiiiiiiiss',
    $userId,
    $userIdDenunciado,
    $postId,
    $historiaId,
    $adopcionId,
    $campaniaId,
    $perdidoId,
    $transitoId,
    $donacionId,
    $veterinariaId,
    $productoId,
    $comentarioId,
    $motivo,
    $detalle
);
$stmt->execute();
$denunciaId = (int) $stmt->insert_id;
$stmt->close();

json_success(['denunciaId' => $denunciaId], 'Denuncia registrada', 201);
