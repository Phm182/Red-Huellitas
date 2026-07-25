<?php
/**
 * Helpers compartidos para Match de Mascotas (swipes, matches mutuos, chat
 * interno y consentimiento de revelado de WhatsApp) usados por todos los
 * endpoints de inc/ajax/match/. Requiere que quien llame también haya hecho
 * require_once de funciones/mascotas.php (usa rh_mascota_publica()).
 */

function rh_match_candidato_publico(mysqli $conn, array $mascotaRow, int $viewerUserId, ?float $distanciaKm = null): array
{
    $data = rh_mascota_publica($conn, $mascotaRow, $viewerUserId);
    $data['distanciaKm'] = $distanciaKm !== null ? round($distanciaKm, 1) : null;
    return $data;
}

function rh_match_mensaje_publico(array $row, int $viewerUserId): array
{
    return [
        'mensajeId' => (int) $row['MensajeId'],
        'matchId' => (int) $row['MatchId'],
        'userIdEmisor' => (int) $row['UserIdEmisor'],
        'texto' => $row['Texto'],
        'esMio' => (int) $row['UserIdEmisor'] === $viewerUserId,
        'createdAt' => $row['CreatedAt'],
    ];
}

function rh_match_pertenece(array $match, int $userId): bool
{
    return (int) $match['UserIdA'] === $userId || (int) $match['UserIdB'] === $userId;
}

/** Devuelve el UserId del lado opuesto de un match respecto de $userId. */
function rh_match_otro_usuario_id(array $match, int $userId): int
{
    return (int) $match['UserIdA'] === $userId ? (int) $match['UserIdB'] : (int) $match['UserIdA'];
}

/** Devuelve el MascotaId del lado opuesto de un match respecto de $userId. */
function rh_match_otra_mascota_id(array $match, int $userId): int
{
    return (int) $match['UserIdA'] === $userId ? (int) $match['MascotaIdB'] : (int) $match['MascotaIdA'];
}

/**
 * Serializa un row de MascotaMatch al shape público desde el punto de vista
 * de $viewerUserId: quién es "la otra mascota", último mensaje (preview) y
 * estado de consentimiento de WhatsApp de ambos lados.
 */
function rh_match_publico(mysqli $conn, array $match, int $viewerUserId): array
{
    $matchId = (int) $match['MatchId'];
    $otraMascotaId = rh_match_otra_mascota_id($match, $viewerUserId);

    $stmt = $conn->prepare('SELECT * FROM Mascota WHERE MascotaId = ?');
    $stmt->bind_param('i', $otraMascotaId);
    $stmt->execute();
    $otraMascota = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare('SELECT * FROM MatchMensaje WHERE MatchId = ? ORDER BY MensajeId DESC LIMIT 1');
    $stmt->bind_param('i', $matchId);
    $stmt->execute();
    $ultimoMensajeRow = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare('SELECT UserId FROM MatchWhatsappConsentimiento WHERE MatchId = ?');
    $stmt->bind_param('i', $matchId);
    $stmt->execute();
    $result = $stmt->get_result();
    $consentimientos = [];
    while ($row = $result->fetch_assoc()) {
        $consentimientos[] = (int) $row['UserId'];
    }
    $stmt->close();

    return [
        'matchId' => $matchId,
        'mascota' => $otraMascota ? rh_mascota_publica($conn, $otraMascota, $viewerUserId) : null,
        'ultimoMensaje' => $ultimoMensajeRow ? rh_match_mensaje_publico($ultimoMensajeRow, $viewerUserId) : null,
        'miConsentimiento' => in_array($viewerUserId, $consentimientos, true),
        'whatsappRevelado' => count($consentimientos) >= 2,
        'estado' => $match['Estado'],
        'createdAt' => $match['CreatedAt'],
    ];
}
