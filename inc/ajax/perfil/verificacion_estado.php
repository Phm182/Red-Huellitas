<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$verificacion = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$verificacion) {
    json_success([
        'estadoRevision' => 'sin_enviar',
        'motivoRechazo' => null,
        'tieneDniFrente' => false,
        'tieneDniDorso' => false,
        'tieneSelfie' => false,
    ]);
}

// Nunca se devuelve un path o URL de estas imágenes, solo estado + booleanos.
json_success([
    'estadoRevision' => $verificacion['EstadoRevision'],
    'motivoRechazo' => $verificacion['MotivoRechazo'],
    'tieneDniFrente' => !empty($verificacion['DniFrentePath']),
    'tieneDniDorso' => !empty($verificacion['DniDorsoPath']),
    'tieneSelfie' => !empty($verificacion['SelfiePath']),
]);
