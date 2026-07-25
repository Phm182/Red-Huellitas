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
        'dniNumero' => null,
        'nombreExtraido' => null,
        'kycExternoId' => null,
        'kycEstado' => null,
    ];

    if (!rh_gemini_configurado()) {
        $base['motivo'] = 'Revisión automática no disponible; queda pendiente de revisión manual';
        $base['metodo'] = 'manual';
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

    if (!$docsOk || $face < $umbralRechazar || empty($d['selfie_tiene_rostro'])) {
        $motivo = $resumen !== '' ? $resumen : 'Las imágenes no pasan la verificación automática';
        if ($problemas) {
            $motivo = implode('; ', array_slice($problemas, 0, 3));
        }
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
    $base['motivo'] = $resumen !== ''
        ? $resumen
        : 'Quedó en revisión: la confianza automática no fue suficiente';
    $base['motivo'] = mb_substr((string) $base['motivo'], 0, 250);
    return $base;
}

/**
 * Persiste el resultado automático sobre la fila de UsuarioVerificacion.
 */
function rh_verificacion_auto_aplicar(mysqli $conn, int $userId, array $resultado): void
{
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
        RevisadoEn = ?
        WHERE UserId = ?';

    $stmt = @$conn->prepare($sqlFull);
    if ($stmt) {
        // Si quedó pendiente con una nota, la guardamos en MotivoRechazo solo
        // como mensaje informativo (la UI ya distingue por estado).
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
