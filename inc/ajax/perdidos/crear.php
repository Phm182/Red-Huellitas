<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/mascotas.php';
require_once __DIR__ . '/../../funciones/perdido.php';
require_once __DIR__ . '/../../funciones/geo.php';
require_once __DIR__ . '/../../funciones/push.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

const RH_PERDIDO_RADIO_NOTIFICACION_KM = 5.0;

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar un reporte', 403);
}

$tipo = $_POST['tipo'] ?? '';
$mascotaId = isset($_POST['mascotaId']) && $_POST['mascotaId'] !== '' ? (int) $_POST['mascotaId'] : null;
$nombre = trim($_POST['nombre'] ?? '') ?: null;
$sexo = $_POST['sexo'] ?? '';
$especie = $_POST['especie'] ?? '';
$razaId = isset($_POST['razaId']) && $_POST['razaId'] !== '' ? (int) $_POST['razaId'] : null;
$razaTexto = trim($_POST['razaTexto'] ?? '') ?: null;
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$ultimoLugarDescripcion = trim($_POST['ultimoLugarDescripcion'] ?? '');
$ultimoLugarLat = isset($_POST['ultimoLugarLat']) ? (float) $_POST['ultimoLugarLat'] : null;
$ultimoLugarLng = isset($_POST['ultimoLugarLng']) ? (float) $_POST['ultimoLugarLng'] : null;
$fechaSuceso = trim($_POST['fechaSuceso'] ?? '');

if (!in_array($tipo, ['perdido', 'encontrado'], true)) {
    json_error("tipo debe ser 'perdido' o 'encontrado'");
}
if ($tipo === 'encontrado' && $mascotaId !== null) {
    json_error('Un reporte de tipo encontrado no puede vincularse a una mascota propia');
}
if ($ultimoLugarDescripcion === '' || mb_strlen($ultimoLugarDescripcion) > 150) {
    json_error('El lugar es obligatorio (máx 150 caracteres)');
}
if ($ultimoLugarLat === null || $ultimoLugarLng === null) {
    json_error('Falta la ubicación del reporte');
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaSuceso)) {
    json_error('fechaSuceso inválida (formato YYYY-MM-DD)');
}

$fotos = [];
if ($mascotaId !== null) {
    // Vinculado a una Mascota propia ya registrada: ignora los campos manuales.
    $stmt = $conn->prepare("SELECT MascotaId FROM Mascota WHERE MascotaId = ? AND UserId = ? AND Estado = 'A'");
    $stmt->bind_param('ii', $mascotaId, $userId);
    $stmt->execute();
    if (!$stmt->get_result()->fetch_assoc()) {
        $stmt->close();
        json_error('La mascota indicada no existe o no te pertenece');
    }
    $stmt->close();

    $nombre = null;
    $sexo = null;
    $especie = null;
    $razaId = null;
    $razaTexto = null;
    $descripcion = null;
} else {
    // Manual: mismos requisitos mínimos que Adopción.
    if ($nombre === null || mb_strlen($nombre) > 60) {
        json_error('El nombre es obligatorio (máx 60 caracteres)');
    }
    if (!in_array($sexo, ['macho', 'hembra'], true)) {
        json_error("El sexo debe ser 'macho' o 'hembra'");
    }
    if (!in_array($especie, ['perro', 'gato', 'otro'], true)) {
        json_error("La especie debe ser 'perro', 'gato' u 'otro'");
    }
    if (!$razaId && !$razaTexto) {
        json_error('Debés indicar una raza (del catálogo o a texto libre)');
    }
    if ($razaId) {
        $stmt = $conn->prepare('SELECT RazaId FROM RazaCatalogo WHERE RazaId = ? AND Especie = ?');
        $stmt->bind_param('is', $razaId, $especie);
        $stmt->execute();
        if (!$stmt->get_result()->fetch_assoc()) {
            $stmt->close();
            json_error('La raza seleccionada no corresponde a esa especie');
        }
        $stmt->close();
        $razaTexto = null;
    }

    $fotos = rh_normalizar_archivos_multiples($_FILES['fotos'] ?? null);
    if (count($fotos) > 6) {
        json_error('Máximo 6 fotos por reporte');
    }
    foreach ($fotos as $foto) {
        $error = rh_validar_imagen_subida($foto);
        if ($error) {
            json_error("Foto inválida: $error");
        }
    }
}

$stmt = $conn->prepare(
    'INSERT INTO Perdido
        (UserId, Tipo, MascotaId, Nombre, Sexo, Especie, RazaId, RazaTexto, Descripcion,
         UltimoLugarDescripcion, UltimoLugarLat, UltimoLugarLng, FechaSuceso)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$stmt->bind_param(
    'isisssisssdds',
    $userId,
    $tipo,
    $mascotaId,
    $nombre,
    $sexo,
    $especie,
    $razaId,
    $razaTexto,
    $descripcion,
    $ultimoLugarDescripcion,
    $ultimoLugarLat,
    $ultimoLugarLng,
    $fechaSuceso
);
$stmt->execute();
$perdidoId = (int) $stmt->insert_id;
$stmt->close();

foreach ($fotos as $index => $foto) {
    $path = rh_guardar_foto_perdido($foto, $perdidoId);
    $stmt = $conn->prepare('INSERT INTO PerdidoFoto (PerdidoId, Path, Orden) VALUES (?, ?, ?)');
    $stmt->bind_param('isi', $perdidoId, $path, $index);
    $stmt->execute();
    $stmt->close();
}

// Difusión: best-effort, nunca bloquea la respuesta si Expo/la red fallan.
try {
    $destinatarios = rh_usuarios_en_radio($conn, $ultimoLugarLat, $ultimoLugarLng, RH_PERDIDO_RADIO_NOTIFICACION_KM);
    unset($destinatarios[$userId]);
    if (count($destinatarios) > 0) {
        $cuerpo = $tipo === 'perdido'
            ? 'Se perdió una mascota cerca tuyo'
            : 'Encontraron una mascota cerca tuyo';
        rh_notificar(
            $conn,
            array_keys($destinatarios),
            'perdido_cerca',
            'Perdidos y Reencontrados',
            $cuerpo,
            '/(app)/perdidos/' . $perdidoId,
            ['actorUserId' => $userId]
        );
    }
} catch (Throwable $e) {
    // Silencioso a propósito: el reporte ya se creó, la notificación es secundaria.
}

$stmt = $conn->prepare(
    'SELECT Perdido.*,
            Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath,
            Usuario.WhatsappNumero, Usuario.WhatsappVisibilidad,
            Mascota.Nombre AS MascotaNombre, Mascota.Sexo AS MascotaSexo, Mascota.Especie AS MascotaEspecie,
            Mascota.RazaId AS MascotaRazaId, Mascota.RazaTexto AS MascotaRazaTexto, Mascota.DescripcionTexto AS MascotaDescripcion
     FROM Perdido
     JOIN Usuario ON Usuario.UserId = Perdido.UserId
     LEFT JOIN Mascota ON Mascota.MascotaId = Perdido.MascotaId
     WHERE Perdido.PerdidoId = ?'
);
$stmt->bind_param('i', $perdidoId);
$stmt->execute();
$perdido = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['perdido' => rh_perdido_publico($conn, $perdido, $userId)], 'Reporte creado', 201);
