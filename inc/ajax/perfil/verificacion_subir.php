<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/verificacion_auto.php';

$userId = rh_require_auth($conn);

$campos = ['dniFrente' => 'DniFrentePath', 'dniDorso' => 'DniDorsoPath', 'selfie' => 'SelfiePath'];

$archivosEnviados = array_filter(array_keys($campos), fn($campo) => isset($_FILES[$campo]));

$stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

$reintentarSolo = empty($archivosEnviados);
if ($reintentarSolo) {
    $tieneTodoActual = $actual
        && !empty($actual['DniFrentePath'])
        && !empty($actual['DniDorsoPath'])
        && !empty($actual['SelfiePath']);
    if (!$tieneTodoActual) {
        json_error('No se envió ningún archivo (dniFrente, dniDorso, selfie)');
    }
} else {
    foreach ($archivosEnviados as $campo) {
        $error = rh_validar_imagen_subida($_FILES[$campo]);
        if ($error) {
            json_error("$campo: $error");
        }
    }
}

$nuevosPaths = [];
foreach ($archivosEnviados as $campo) {
    $columna = $campos[$campo];
    $anterior = $actual[$columna] ?? null;
    $guardado = rh_guardar_imagen_verificacion($_FILES[$campo], $userId, $anterior);
    if ($guardado === null) {
        json_error("No se pudo guardar $campo. Revisá permisos de inc/storage en el servidor.", 500);
    }
    $nuevosPaths[$columna] = $guardado;
}

// Al (re)enviar se reinicia el resultado automático: cualquier foto nueva
// reemplaza a la anterior y vuelve a quedar pendiente hasta el nuevo análisis.
$resetAuto = "EstadoRevision = 'pendiente', MotivoRechazo = NULL, RevisadoPor = NULL, RevisadoEn = NULL,
    AutoScore = NULL, FaceMatchScore = NULL, AutoMetodo = NULL, AutoDetalle = NULL,
    DniNumeroExtraido = NULL, NombreExtraido = NULL, KycExternoId = NULL, KycEstado = NULL";

if ($actual) {
    $sets = [];
    $params = [];
    $types = '';
    foreach ($nuevosPaths as $columna => $valor) {
        $sets[] = "$columna = ?";
        $params[] = $valor;
        $types .= 's';
    }
    // Si las columnas auto aún no existen (SQL 020 pendiente), el UPDATE full
    // puede fallar: caemos al reset mínimo.
    $sqlFull = 'UPDATE UsuarioVerificacion SET '
        . ($sets ? implode(', ', $sets) . ', ' : '')
        . $resetAuto
        . ' WHERE UserId = ?';
    $types .= 'i';
    $params[] = $userId;

    $stmt = @$conn->prepare($sqlFull);
    if ($stmt) {
        $stmt->bind_param($types, ...$params);
        $ok = $stmt->execute();
        $stmt->close();
        if (!$ok) {
            $stmt = null;
        }
    }
    if (!$stmt) {
        $setsMin = [];
        $paramsMin = [];
        $typesMin = '';
        foreach ($nuevosPaths as $columna => $valor) {
            $setsMin[] = "$columna = ?";
            $paramsMin[] = $valor;
            $typesMin .= 's';
        }
        $setsMin[] = "EstadoRevision = 'pendiente'";
        $setsMin[] = 'MotivoRechazo = NULL';
        $typesMin .= 'i';
        $paramsMin[] = $userId;
        $sql = 'UPDATE UsuarioVerificacion SET ' . implode(', ', $setsMin) . ' WHERE UserId = ?';
        $stmt = $conn->prepare($sql);
        $stmt->bind_param($typesMin, ...$paramsMin);
        $stmt->execute();
        $stmt->close();
    }
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

$mensaje = 'Documentos recibidos, en revisión';
$auto = null;

$tieneTodo = !empty($verificacion['DniFrentePath'])
    && !empty($verificacion['DniDorsoPath'])
    && !empty($verificacion['SelfiePath']);

if ($tieneTodo) {
    @set_time_limit(120);
    $dir = rh_dir_verificacion_usuario($userId);
    $rutaFrente = $dir . '/' . basename((string) $verificacion['DniFrentePath']);
    $rutaDorso = $dir . '/' . basename((string) $verificacion['DniDorsoPath']);
    $rutaSelfie = $dir . '/' . basename((string) $verificacion['SelfiePath']);

    $auto = rh_verificacion_auto_evaluar($conn, $userId, $rutaFrente, $rutaDorso, $rutaSelfie);
    rh_verificacion_auto_aplicar($conn, $userId, $auto);

    $stmt = $conn->prepare('SELECT * FROM UsuarioVerificacion WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $verificacion = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if ($auto['estado'] === 'aprobado') {
        $mensaje = 'Identidad verificada automáticamente';
    } elseif ($auto['estado'] === 'rechazado') {
        $mensaje = $auto['motivo'] ?? 'Verificación rechazada';
    } else {
        $mensaje = 'Documentos recibidos; quedaron en revisión';
    }
} elseif ($reintentarSolo) {
    $mensaje = 'Faltan fotos para reintentar la verificación automática';
}

json_success(rh_verificacion_estado_publico($verificacion, $auto), $mensaje);
