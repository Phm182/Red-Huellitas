<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania.php';
require_once __DIR__ . '/../../funciones/geo.php';
require_once __DIR__ . '/../../funciones/push.php';
require_once __DIR__ . '/../../funciones/notificaciones.php';

const RH_CAMPANIA_RADIO_NOTIFICACION_KM = 5.0;

$userId = rh_require_auth($conn);

if (!rh_usuario_verificado($conn, $userId)) {
    json_error('Necesitás tu cuenta verificada para publicar una campaña', 403);
}

$tipo = $_POST['tipo'] ?? '';
$titulo = trim($_POST['titulo'] ?? '');
$descripcion = trim($_POST['descripcion'] ?? '') ?: null;
$fechaDesde = trim($_POST['fechaDesde'] ?? '');
$fechaHasta = trim($_POST['fechaHasta'] ?? '') ?: null;
$zonaDescripcion = trim($_POST['zonaDescripcion'] ?? '');
// La calle y el número son opcionales: una campaña en una plaza puede no
// tener dirección postal, pero cuando la hay es lo que la gente busca.
$direccion = trim($_POST['direccion'] ?? '') ?: null;
$zonaLat = isset($_POST['zonaLat']) ? (float) $_POST['zonaLat'] : null;
$zonaLng = isset($_POST['zonaLng']) ? (float) $_POST['zonaLng'] : null;
$requiereInscripcion = filter_var($_POST['requiereInscripcion'] ?? false, FILTER_VALIDATE_BOOLEAN);
// Publicar en nombre de un equipo. 0/vacío = la organiza la persona.
$equipoId = isset($_POST['equipoId']) && $_POST['equipoId'] !== '' ? (int) $_POST['equipoId'] : null;
$cupoMaximo = isset($_POST['cupoMaximo']) && $_POST['cupoMaximo'] !== '' ? (int) $_POST['cupoMaximo'] : null;

if ($equipoId !== null) {
    require_once __DIR__ . '/../../funciones/equipo.php';
    // Sólo el dueño y los admins publican por el equipo: si alcanzara con ser
    // miembro, sumarse a una organización conocida daría permiso para hablar
    // en su nombre el mismo día.
    if (!rh_equipo_puede_administrar($conn, $equipoId, $userId)) {
        json_error('No podés publicar en nombre de ese equipo', 403);
    }
}
if (!in_array($tipo, ['castracion', 'vacunacion'], true)) {
    json_error("tipo debe ser 'castracion' o 'vacunacion'");
}
if ($titulo === '' || mb_strlen($titulo) > 150) {
    json_error('El título es obligatorio (máx 150 caracteres)');
}
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaDesde)) {
    json_error('fechaDesde inválida (formato YYYY-MM-DD)');
}
if ($fechaHasta !== null) {
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fechaHasta)) {
        json_error('fechaHasta inválida (formato YYYY-MM-DD)');
    }
    if ($fechaHasta < $fechaDesde) {
        json_error('fechaHasta no puede ser anterior a fechaDesde');
    }
}
if ($direccion !== null && mb_strlen($direccion) > 200) {
    json_error('La dirección no puede superar los 200 caracteres');
}
if ($zonaDescripcion === '') {
    json_error('La zona/dirección es obligatoria');
}
if ($zonaLat === null || $zonaLng === null) {
    json_error('Falta la ubicación de la campaña');
}
if (!$requiereInscripcion) {
    $cupoMaximo = null;
} elseif ($cupoMaximo !== null && $cupoMaximo <= 0) {
    json_error('cupoMaximo debe ser mayor a 0');
}

$stmt = $conn->prepare(
    'INSERT INTO Campania
        (UserId, EquipoId, Tipo, Titulo, Descripcion, FechaDesde, FechaHasta, ZonaDescripcion, Direccion, ZonaLat, ZonaLng, RequiereInscripcion, CupoMaximo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);
$requiereInt = $requiereInscripcion ? 1 : 0;
$stmt->bind_param(
    'iisssssssddii',
    $userId,
    $equipoId,
    $tipo,
    $titulo,
    $descripcion,
    $fechaDesde,
    $fechaHasta,
    $zonaDescripcion,
    $direccion,
    $zonaLat,
    $zonaLng,
    $requiereInt,
    $cupoMaximo
);
$stmt->execute();
$campaniaId = (int) $stmt->insert_id;
$stmt->close();

// Difusión: best-effort, nunca bloquea la respuesta si Expo/la red fallan.
try {
    $destinatarios = rh_usuarios_en_radio($conn, $zonaLat, $zonaLng, RH_CAMPANIA_RADIO_NOTIFICACION_KM);
    unset($destinatarios[$userId]); // no notificarle al propio creador
    if (count($destinatarios) > 0) {
        $tipoLabel = $tipo === 'castracion' ? 'castración' : 'vacunación';
        rh_notificar(
            $conn,
            array_keys($destinatarios),
            'campania_nueva',
            'Nueva campaña cerca tuyo',
            "Campaña de $tipoLabel: $titulo",
            '/(app)/campanias/' . $campaniaId,
            ['actorUserId' => $userId]
        );
    }
} catch (Throwable $e) {
    // Silencioso a propósito: la campaña ya se creó, la notificación es secundaria.
}

$stmt = $conn->prepare(
    'SELECT Campania.*, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
     FROM Campania JOIN Usuario ON Usuario.UserId = Campania.UserId
     WHERE Campania.CampaniaId = ?'
);
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success(['campania' => rh_campania_publico($conn, $campania, $userId)], 'Campaña creada', 201);
