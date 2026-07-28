<?php
/**
 * Orquesta la verificación automática de identidad:
 * 1) Gemini: ¿son DNI? OCR + face match selfie vs foto del documento
 * 2) Opcional Renaper/SID: face match selfie vs foto oficial del padrón
 *
 * Decide aprobado / rechazado / pendiente según umbrales en gemini.local.php.
 */

require_once __DIR__ . '/gemini.php';
require_once __DIR__ . '/kyc_renaper.php';
require_once __DIR__ . '/uploads.php';

/**
 * @return array{
 *   estado: 'aprobado'|'rechazado'|'pendiente',
 *   motivo: ?string,
 *   autoScore: ?float,
 *   faceMatchScore: ?float,
 *   metodo: string,
 *   detalle: array,
 *   dniNumero: ?string,
 *   nombreExtraido: ?string,
 *   kycExternoId: ?string,
 *   kycEstado: ?string
 * }
 */
function rh_verificacion_auto_evaluar(
    mysqli $conn,
    int $userId,
    string $rutaFrente,
    string $rutaDorso,
    string $rutaSelfie
): array {
    $config = rh_gemini_config();
    $umbralAprobar = (float) ($config['VERIF_UMBRAL_APROBAR'] ?? 0.78);
    $umbralRechazar = (float) ($config['VERIF_UMBRAL_RECHAZAR'] ?? 0.40);

    $nombrePerfil = null;
    $stmt = $conn->prepare('SELECT NombreCompleto FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($row) {
        $nombrePerfil = (string) $row['NombreCompleto'];
    }

    $base = [
        'estado' => 'pendiente',
        'motivo' => null,
        'autoScore' => null,
        'faceMatchScore' => null,
        'metodo' => 'pendiente',
        'detalle' => [],
        'problemas' => [],
        'dniNumero' => null,
        'nombreExtraido' => null,
        'kycExternoId' => null,
        'kycEstado' => null,
    ];

    if (!rh_gemini_configurado()) {
        $base['motivo'] = 'Revisión automática no disponible; queda pendiente de revisión manual';
        $base['metodo'] = 'manual_cola';
        $base['problemas'] = ['La revisión automática no está configurada en el servidor'];
        $base['reintentar'] = true;
        return $base;
    }

    $analisis = rh_gemini_analizar_verificacion($rutaFrente, $rutaDorso, $rutaSelfie, $nombrePerfil);
    if (!$analisis['ok'] || !is_array($analisis['data'])) {
        // El error técnico va a 'detalle' (que solo ve el moderador en el panel).
        // 'motivo' termina en MotivoRechazo, que es lo que el usuario lee en su
        // pantalla: mostrarle ahí "Gemini rechazó el pedido" es confuso (no lo
        // rechazaron, quedó pendiente) y además no le dice qué hacer.
        $base['motivo'] = 'Revisión automática no disponible; queda pendiente de revisión manual';
        $base['metodo'] = 'gemini_error';
        $base['detalle'] = ['error' => $analisis['error'] ?? 'No se pudo analizar automáticamente'];
        $base['problemas'] = ['No se pudo completar la revisión automática; un moderador lo revisará'];
        $base['reintentar'] = true;
        return $base;
    }

    $d = $analisis['data'];
    $face = (float) $d['face_match_score'];
    $base['faceMatchScore'] = $face;
    $base['dniNumero'] = $d['dni_numero'];
    $base['nombreExtraido'] = $d['nombre_completo'];
    $base['detalle'] = ['gemini' => $d];
    $base['metodo'] = 'gemini';

    // Score compuesto: docs válidos + face match (+ bonus nombre).
    $docsOk = !empty($d['es_dni_frente']) && !empty($d['es_dni_dorso'])
        && !empty($d['documento_legible']) && !empty($d['selfie_tiene_rostro']);
    $nombreOk = $d['nombre_coincide_perfil'];
    $autoScore = $face;
    if (!$docsOk) {
        $autoScore = min($autoScore, 0.25);
    }
    if ($nombreOk === false) {
        $autoScore = min($autoScore, max(0.35, $face * 0.7));
    }
    if ($nombreOk === true) {
        $autoScore = min(1.0, $autoScore + 0.05);
    }
    $base['autoScore'] = round($autoScore, 3);

    $problemas = is_array($d['problemas']) ? $d['problemas'] : [];
    $resumen = trim((string) ($d['resumen'] ?? ''));

    // Asegura problemas accionables aunque Gemini no los liste.
    if (empty($d['es_dni_frente'])) {
        $problemas[] = 'El frente no se reconoce como DNI argentino';
    }
    if (empty($d['es_dni_dorso'])) {
        $problemas[] = 'El dorso no se reconoce como DNI argentino';
    }
    if (empty($d['documento_legible'])) {
        $problemas[] = 'El documento no se lee con claridad';
    }
    if (empty($d['selfie_tiene_rostro'])) {
        $problemas[] = 'La selfie no muestra un rostro claro';
    }
    if ($face < $umbralRechazar) {
        $problemas[] = 'La selfie no coincide con la foto del DNI';
    }
    if ($nombreOk === false) {
        $problemas[] = 'El nombre del DNI no coincide con el del perfil';
    }
    $problemas = array_values(array_unique(array_filter(array_map('strval', $problemas))));
    $base['detalle']['gemini']['problemas'] = $problemas;
    $base['problemas'] = $problemas;

    if (!$docsOk || $face < $umbralRechazar || empty($d['selfie_tiene_rostro'])) {
        $motivo = $problemas
            ? implode('; ', array_slice($problemas, 0, 3))
            : ($resumen !== '' ? $resumen : 'Las imágenes no pasan la verificación automática');
        $base['estado'] = 'rechazado';
        $base['motivo'] = mb_substr($motivo, 0, 250);
        return $base;
    }

    // Capa Renaper/SID: si está configurada y tenemos DNI, confronta facial oficial.
    $kycUsado = false;
    if (rh_kyc_configurado() && !empty($d['dni_numero'])) {
        $sexo = $d['sexo'] ?? null;
        $kyc = rh_kyc_validar_facial((string) $d['dni_numero'], $rutaSelfie, $sexo);
        $base['detalle']['kyc'] = [
            'ok' => $kyc['ok'],
            'match' => $kyc['match'],
            'score' => $kyc['score'],
            'estado' => $kyc['estado'],
            'error' => $kyc['error'],
        ];
        $base['kycExternoId'] = $kyc['externoId'];
        $base['kycEstado'] = $kyc['estado'];
        $kycUsado = true;
        $base['metodo'] = 'gemini+renaper';

        if ($kyc['ok'] && $kyc['match'] === true) {
            if ($kyc['score'] !== null) {
                $base['faceMatchScore'] = (float) $kyc['score'];
                $base['autoScore'] = round(max($autoScore, (float) $kyc['score']), 3);
            }
            $base['estado'] = 'aprobado';
            $base['motivo'] = null;
            return $base;
        }

        if ($kyc['ok'] && $kyc['match'] === false) {
            $base['estado'] = 'rechazado';
            $base['motivo'] = 'El reconocimiento facial con Renaper no coincide con el DNI indicado';
            return $base;
        }

        // Error de KYC: no rechazar por falla del proveedor; seguir con Gemini.
        $base['detalle']['kyc_fallback'] = 'proveedor_no_disponible';
    }

    if ($docsOk && $face >= $umbralAprobar && $nombreOk !== false) {
        $base['estado'] = 'aprobado';
        $base['motivo'] = null;
        if (!$kycUsado) {
            $base['metodo'] = 'gemini';
        }
        return $base;
    }

    $base['estado'] = 'pendiente';
    $base['motivo'] = $problemas
        ? implode('; ', array_slice($problemas, 0, 3))
        : ($resumen !== ''
            ? $resumen
            : 'Quedó en revisión: la confianza automática no fue suficiente');
    $base['motivo'] = mb_substr((string) $base['motivo'], 0, 250);
    return $base;
}

/**
 * Payload público del estado de verificación (sin paths).
 *
 * @param array<string,mixed>|null $verificacion
 * @param array<string,mixed>|null $auto Resultado fresco de rh_verificacion_auto_evaluar
 * @return array<string,mixed>
 */
function rh_verificacion_estado_publico(?array $verificacion, ?array $auto = null): array
{
    if (!$verificacion) {
        return [
            'estadoRevision' => 'sin_enviar',
            'motivoRechazo' => null,
            'tieneDniFrente' => false,
            'tieneDniDorso' => false,
            'tieneSelfie' => false,
            'autoScore' => null,
            'faceMatchScore' => null,
            'autoMetodo' => null,
            'kycEstado' => null,
            'problemas' => [],
            'checks' => null,
        ];
    }

    $detalle = [];
    if (!empty($verificacion['AutoDetalle'])) {
        $decoded = json_decode((string) $verificacion['AutoDetalle'], true);
        if (is_array($decoded)) {
            $detalle = $decoded;
        }
    }

    $gemini = is_array($detalle['gemini'] ?? null) ? $detalle['gemini'] : [];
    $problemas = [];
    if (is_array($auto['problemas'] ?? null)) {
        $problemas = array_values(array_map('strval', $auto['problemas']));
    } elseif (is_array($gemini['problemas'] ?? null)) {
        $problemas = array_values(array_map('strval', $gemini['problemas']));
    } elseif (!empty($verificacion['MotivoRechazo'])) {
        $problemas = array_values(array_filter(array_map('trim', explode(';', (string) $verificacion['MotivoRechazo']))));
    }

    $checks = null;
    if ($gemini || $auto) {
        $src = $gemini ?: ($auto['detalle']['gemini'] ?? []);
        if (is_array($src) && $src) {
            $checks = [
                'esDniFrente' => !empty($src['es_dni_frente']),
                'esDniDorso' => !empty($src['es_dni_dorso']),
                'documentoLegible' => !empty($src['documento_legible']),
                'selfieTieneRostro' => !empty($src['selfie_tiene_rostro']),
                'faceMatchScore' => isset($src['face_match_score']) ? (float) $src['face_match_score'] : null,
            ];
        }
    }

    return [
        'estadoRevision' => $verificacion['EstadoRevision'],
        'motivoRechazo' => $verificacion['MotivoRechazo'] ?? null,
        'tieneDniFrente' => !empty($verificacion['DniFrentePath']),
        'tieneDniDorso' => !empty($verificacion['DniDorsoPath']),
        'tieneSelfie' => !empty($verificacion['SelfiePath']),
        'autoScore' => isset($verificacion['AutoScore']) && $verificacion['AutoScore'] !== null
            ? (float) $verificacion['AutoScore']
            : ($auto['autoScore'] ?? null),
        'faceMatchScore' => isset($verificacion['FaceMatchScore']) && $verificacion['FaceMatchScore'] !== null
            ? (float) $verificacion['FaceMatchScore']
            : ($auto['faceMatchScore'] ?? null),
        // Códigos internos (gemini_error, pendiente) no se exponen al usuario.
        'autoMetodo' => rh_verificacion_metodo_publico(
            $verificacion['AutoMetodo'] ?? ($auto['metodo'] ?? null)
        ),
        'kycEstado' => $verificacion['KycEstado'] ?? ($auto['kycEstado'] ?? null),
        'problemas' => $problemas,
        'checks' => $checks,
    ];
}

/**
 * Traduce AutoMetodo a un valor presentable (o null si es técnico/fallido).
 */
function rh_verificacion_metodo_publico(mixed $metodo): ?string
{
    if (!is_string($metodo) || $metodo === '') {
        return null;
    }
    return match ($metodo) {
        'gemini' => 'automatica',
        'gemini+renaper' => 'automatica_renaper',
        'manual' => 'manual',
        default => null, // gemini_error, pendiente, etc.
    };
}

/**
 * Persiste el resultado automático sobre la fila de UsuarioVerificacion.
 * Si falló la IA, agenda reintento (salvo que un admin ya haya resuelto).
 */
function rh_verificacion_auto_aplicar(mysqli $conn, int $userId, array $resultado): void
{
    // Si un moderador ya resolvió, no pisar con IA ni reintentos.
    $stmt = $conn->prepare('SELECT RevisadoPor, EstadoRevision FROM UsuarioVerificacion WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ($fila && !empty($fila['RevisadoPor'])) {
        return;
    }

    $estado = (string) $resultado['estado'];
    // Motivo visible al usuario solo si rechazó; el detalle completo va en AutoDetalle.
    $motivo = $estado === 'rechazado' ? ($resultado['motivo'] ?? null) : null;
    $autoScore = $resultado['autoScore'] !== null ? (string) $resultado['autoScore'] : null;
    $face = $resultado['faceMatchScore'] !== null ? (string) $resultado['faceMatchScore'] : null;
    $metodo = (string) ($resultado['metodo'] ?? 'gemini');
    $detalle = json_encode($resultado['detalle'] ?? [], JSON_UNESCAPED_UNICODE);
    $dni = $resultado['dniNumero'] !== null ? (string) $resultado['dniNumero'] : null;
    $nombre = $resultado['nombreExtraido'] !== null ? (string) $resultado['nombreExtraido'] : null;
    $kycId = $resultado['kycExternoId'] !== null ? (string) $resultado['kycExternoId'] : null;
    $kycEstado = $resultado['kycEstado'] !== null ? (string) $resultado['kycEstado'] : null;
    $revisadoEn = ($estado === 'aprobado' || $estado === 'rechazado') ? date('Y-m-d H:i:s') : null;
    $notaPendiente = ($estado === 'pendiente' && !empty($resultado['motivo']))
        ? (string) $resultado['motivo']
        : null;

    $quiereReintento = !empty($resultado['reintentar']) && $estado === 'pendiente';
    $mins = isset($resultado['reintento_mins']) ? (int) $resultado['reintento_mins'] : 15;
    $mins = max(5, min(360, $mins));
    $reintentoEn = $quiereReintento ? date('Y-m-d H:i:s', time() + $mins * 60) : null;

    // Columnas nuevas: si el ALTER aún no corrió, cae a update mínimo.
    $sqlFull = 'UPDATE UsuarioVerificacion SET
        EstadoRevision = ?,
        MotivoRechazo = ?,
        AutoScore = ?,
        FaceMatchScore = ?,
        AutoMetodo = ?,
        AutoDetalle = ?,
        DniNumeroExtraido = ?,
        NombreExtraido = ?,
        KycExternoId = ?,
        KycEstado = ?,
        RevisadoPor = NULL,
        RevisadoEn = ?,
        AutoReintentoEn = ?,
        AutoReintentos = AutoReintentos + ?
        WHERE UserId = ?';

    $incReintento = $quiereReintento ? 1 : 0;

    $stmt = @$conn->prepare($sqlFull);
    if ($stmt) {
        // Si quedó pendiente con una nota, la guardamos en MotivoRechazo solo
        // como mensaje informativo (la UI ya distingue por estado).
        if ($estado === 'pendiente' && $notaPendiente !== null) {
            $motivo = mb_substr($notaPendiente, 0, 250);
        }
        $stmt->bind_param(
            'ssssssssssssii',
            $estado,
            $motivo,
            $autoScore,
            $face,
            $metodo,
            $detalle,
            $dni,
            $nombre,
            $kycId,
            $kycEstado,
            $revisadoEn,
            $reintentoEn,
            $incReintento,
            $userId
        );
        $ok = $stmt->execute();
        $stmt->close();
        if ($ok) {
            return;
        }
    }

    // Fallback sin columnas de reintento.
    $sqlMid = 'UPDATE UsuarioVerificacion SET
        EstadoRevision = ?, MotivoRechazo = ?, AutoScore = ?, FaceMatchScore = ?,
        AutoMetodo = ?, AutoDetalle = ?, DniNumeroExtraido = ?, NombreExtraido = ?,
        KycExternoId = ?, KycEstado = ?, RevisadoPor = NULL, RevisadoEn = ?
        WHERE UserId = ?';
    $stmt = @$conn->prepare($sqlMid);
    if ($stmt) {
        if ($estado === 'pendiente' && $notaPendiente !== null) {
            $motivo = mb_substr($notaPendiente, 0, 250);
        }
        $stmt->bind_param(
            'sssssssssssi',
            $estado,
            $motivo,
            $autoScore,
            $face,
            $metodo,
            $detalle,
            $dni,
            $nombre,
            $kycId,
            $kycEstado,
            $revisadoEn,
            $userId
        );
        $ok = $stmt->execute();
        $stmt->close();
        if ($ok) {
            return;
        }
    }

    $stmt = $conn->prepare(
        'UPDATE UsuarioVerificacion SET EstadoRevision = ?, MotivoRechazo = ?, RevisadoPor = NULL, RevisadoEn = ? WHERE UserId = ?'
    );
    $stmt->bind_param('sssi', $estado, $motivo, $revisadoEn, $userId);
    $stmt->execute();
    $stmt->close();
}

/**
 * Reintenta verificaciones automáticas pendientes (cuota/error de IA).
 * No toca filas ya resueltas por un admin (RevisadoPor).
 *
 * @return array{procesados: int, aprobados: int, rechazados: int, pendientes: int, errores: int}
 */
function rh_verificacion_auto_reintentar_pendientes(mysqli $conn, int $limite = 10): array
{
    $stats = ['procesados' => 0, 'aprobados' => 0, 'rechazados' => 0, 'pendientes' => 0, 'errores' => 0];
    $limite = max(1, min(50, $limite));

    $sql = "SELECT UserId, DniFrentePath, DniDorsoPath, SelfiePath, AutoReintentos
            FROM UsuarioVerificacion
            WHERE EstadoRevision = 'pendiente'
              AND RevisadoPor IS NULL
              AND DniFrentePath IS NOT NULL AND DniDorsoPath IS NOT NULL AND SelfiePath IS NOT NULL
              AND (
                    AutoMetodo IN ('gemini_error', 'manual_cola', 'pendiente')
                    OR AutoReintentoEn IS NOT NULL
                  )
              AND (AutoReintentoEn IS NULL OR AutoReintentoEn <= NOW())
              AND AutoReintentos < 12
            ORDER BY AutoReintentoEn IS NULL ASC, AutoReintentoEn ASC, UpdatedAt ASC
            LIMIT $limite";

    $res = @$conn->query($sql);
    if (!$res) {
        // Sin columnas nuevas: intentar set mínimo.
        $res = $conn->query(
            "SELECT UserId, DniFrentePath, DniDorsoPath, SelfiePath
             FROM UsuarioVerificacion
             WHERE EstadoRevision = 'pendiente'
               AND RevisadoPor IS NULL
               AND DniFrentePath IS NOT NULL AND DniDorsoPath IS NOT NULL AND SelfiePath IS NOT NULL
               AND (AutoMetodo IS NULL OR AutoMetodo IN ('gemini_error', 'manual_cola', 'pendiente'))
             ORDER BY UpdatedAt ASC
             LIMIT $limite"
        );
    }
    if (!$res) {
        return $stats;
    }

    while ($row = $res->fetch_assoc()) {
        $userId = (int) $row['UserId'];
        $dir = rh_dir_verificacion_usuario($userId);
        $rutaFrente = $dir . '/' . basename((string) $row['DniFrentePath']);
        $rutaDorso = $dir . '/' . basename((string) $row['DniDorsoPath']);
        $rutaSelfie = $dir . '/' . basename((string) $row['SelfiePath']);
        if (!is_file($rutaFrente) || !is_file($rutaDorso) || !is_file($rutaSelfie)) {
            $stats['errores']++;
            continue;
        }

        try {
            $auto = rh_verificacion_auto_evaluar($conn, $userId, $rutaFrente, $rutaDorso, $rutaSelfie);
            // Backoff: 15m, 30m, 1h… según reintentos previos.
            $prev = (int) ($row['AutoReintentos'] ?? 0);
            if (!empty($auto['reintentar'])) {
                $mins = min(360, 15 * (2 ** min(4, $prev)));
                $auto['reintento_mins'] = $mins;
            }
            rh_verificacion_auto_aplicar($conn, $userId, $auto);
            $stats['procesados']++;
            if ($auto['estado'] === 'aprobado') {
                $stats['aprobados']++;
            } elseif ($auto['estado'] === 'rechazado') {
                $stats['rechazados']++;
            } else {
                $stats['pendientes']++;
            }
        } catch (Throwable $e) {
            error_log('rh_verificacion_auto_reintentar: ' . $e->getMessage());
            $stats['errores']++;
        }
    }

    return $stats;
}
