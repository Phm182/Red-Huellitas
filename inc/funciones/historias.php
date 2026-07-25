<?php
/**
 * Helpers de Historias (contenido efímero) para Red Huellitas.
 * Toda lectura filtra por ExpiraEn > NOW() — no hay cron, la expiración es
 * puramente a nivel de query (ver plan: limpieza física de archivos vencidos
 * queda como tarea manual futura, no bloqueante).
 */

function rh_historia_vista_por(mysqli $conn, int $historiaId, int $viewerUserId): bool
{
    $stmt = $conn->prepare('SELECT HistoriaVistaId FROM HistoriaVista WHERE HistoriaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $historiaId, $viewerUserId);
    $stmt->execute();
    $vista = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $vista;
}

function rh_historia_publico(mysqli $conn, array $h, int $viewerUserId): array
{
    return [
        'historiaId' => (int) $h['HistoriaId'],
        'userId' => (int) $h['UserId'],
        'tipoMedia' => $h['TipoMedia'],
        'mediaPath' => $h['MediaPath'],
        'duracionSegundos' => $h['DuracionSegundos'] !== null ? (int) $h['DuracionSegundos'] : null,
        'createdAt' => $h['CreatedAt'],
        'expiraEn' => $h['ExpiraEn'],
        'vista' => rh_historia_vista_por($conn, (int) $h['HistoriaId'], $viewerUserId),
    ];
}
