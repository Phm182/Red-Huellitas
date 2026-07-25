<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

$campos = ['dniFrente' => 'DniFrentePath', 'dniDorso' => 'DniDorsoPath', 'selfie' => 'SelfiePath'];

$archivosEnviados = array_filter(array_keys($campos), fn($campo) => isset($_FILES[$campo]));
if (empty($archivosEnviados)) {
    json_error('No se envió ningún archivo (dniFrente, dniDorso, selfie)');
}

foreach ($archivosEnviados as $campo) {
    $error = rh_validar_imagen_subida($_FILES[$campo]);
    if ($error) {
        json_error("$campo: $error");
    }
}

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

$nuevosPaths = [];
foreach ($archivosEnviados as $campo) {
    $columna = $campos[$campo];
    $anterior = $actual[$columna] ?? null;
    $nuevosPaths[$columna] = rh_guardar_imagen_verificacion($_FILES[$campo], $userId, $anterior);
}

if ($actual) {
    $sets = [];
    $params = [];
    $types = '';
    foreach ($nuevosPaths as $columna => $valor) {
        $sets[] = "$columna = ?";
        $params[] = $valor;
        $types .= 's';
    }
    $sets[] = "EstadoRevision = 'pendiente'";
    $sets[] = 'MotivoRechazo = NULL';
    $types .= 'i';
    $params[] = $userId;

    $sql = 'UPDATE UsuarioVerificacion SET ' . implode(', ', $sets) . ' WHERE UserId = ?';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $stmt->close();
} else {
    $stmt = $conn->prepare(
        'INSERT INTO UsuarioVerificacion (UserId, DniFrentePath, DniDorsoPath, SelfiePath, EstadoRevision)
         VALUES (?, ?, ?, ?, \'pendiente\')'
    );
    $dniFrente = $nuevosPaths['DniFrentePath'] ?? null;
    $dniDorso = $nuevosPaths['DniDorsoPath'] ?? null;
    $selfie = $nuevosPaths['SelfiePath'] ?? null;
    $stmt->bind_param('isss', $userId, $dniFrente, $dniDorso, $selfie);
    $stmt->execute();
    $stmt->close();
}

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$verificacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

json_success([
    'estadoRevision' => $verificacion['EstadoRevision'],
    'tieneDniFrente' => !empty($verificacion['DniFrentePath']),
    'tieneDniDorso' => !empty($verificacion['DniDorsoPath']),
    'tieneSelfie' => !empty($verificacion['SelfiePath']),
], 'Documentos recibidos, en revisión');
