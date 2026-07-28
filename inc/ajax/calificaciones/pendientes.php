<?php
/**
 * Qué tiene el usuario para calificar ahora mismo.
 *
 * Es lo que hace que las calificaciones existan de verdad: nadie entra a
 * buscar el botón. La app usa esto para avisar "terminó la campaña, contanos
 * cómo te fue", tanto del lado del participante como del organizador.
 */

require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';

$userId = rh_require_auth($conn);

// --- Campañas a las que fui y todavía no califiqué al organizador ---
$stmt = $conn->prepare(
    "SELECT c.CampaniaId, c.Titulo, c.Tipo, c.FechaDesde, c.FechaHasta, c.UserId, c.EquipoId,
            e.Nombre AS EquipoNombre, e.AvatarPath AS EquipoAvatar,
            u.NombreCompleto AS AutorNombre, u.Username AS AutorUsername, u.AvatarPath AS AutorAvatar
     FROM CampaniaInscripcion i
     JOIN Campania c ON c.CampaniaId = i.CampaniaId
     LEFT JOIN Equipo e ON e.EquipoId = c.EquipoId
     JOIN Usuario u ON u.UserId = c.UserId
     WHERE i.UserId = ?
       AND c.Estado = 'A'
       AND COALESCE(c.FechaHasta, c.FechaDesde) < CURDATE()
       AND i.Estado IN ('confirmada','ausente')
       AND COALESCE(i.Asistio, 'si') <> 'no'
     ORDER BY COALESCE(c.FechaHasta, c.FechaDesde) DESC
     LIMIT 30"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$res = $stmt->get_result();

$comoParticipante = [];
while ($row = $res->fetch_assoc()) {
    $organizador = rh_campania_organizador($row);

    // El organizador no se califica a sí mismo aunque se haya anotado.
    $esMio = $organizador['tipo'] === 'equipo'
        ? rh_equipo_puede_administrar($conn, $organizador['id'], $userId)
        : $organizador['id'] === $userId;
    if ($esMio) {
        continue;
    }

    $ya = rh_calificacion_existente(
        $conn, 'campania', (int) $row['CampaniaId'],
        'usuario', $userId, $organizador['tipo'], $organizador['id']
    );
    if ($ya) {
        continue;
    }

    $comoParticipante[] = [
        'campaniaId' => (int) $row['CampaniaId'],
        'titulo' => $row['Titulo'],
        'tipo' => $row['Tipo'],
        'fecha' => $row['FechaHasta'] ?: $row['FechaDesde'],
        'organizador' => [
            'tipo' => $organizador['tipo'],
            'id' => $organizador['id'],
            'nombre' => $organizador['tipo'] === 'equipo' ? $row['EquipoNombre'] : $row['AutorNombre'],
            'username' => $organizador['tipo'] === 'equipo' ? null : $row['AutorUsername'],
            'avatarPath' => $organizador['tipo'] === 'equipo' ? $row['EquipoAvatar'] : $row['AutorAvatar'],
        ],
    ];
}
$stmt->close();

// --- Campañas que organicé y tienen gente sin calificar ---
$equipoIds = array_map(
    static fn (array $e): int => $e['equipoId'],
    rh_equipos_de_usuario($conn, $userId)
);

$placeholders = count($equipoIds) > 0
    ? ' OR c.EquipoId IN (' . implode(',', array_fill(0, count($equipoIds), '?')) . ')'
    : '';

$sql = "SELECT c.CampaniaId, c.Titulo, c.Tipo, c.FechaDesde, c.FechaHasta, c.UserId, c.EquipoId,
               COUNT(i.CampaniaInscripcionId) AS totalParticipantes,
               SUM(i.Asistio IS NULL) AS sinAsistencia
        FROM Campania c
        LEFT JOIN CampaniaInscripcion i
               ON i.CampaniaId = c.CampaniaId AND i.Estado IN ('confirmada','ausente')
        WHERE c.Estado = 'A'
          AND COALESCE(c.FechaHasta, c.FechaDesde) < CURDATE()
          AND (c.UserId = ?$placeholders)
        GROUP BY c.CampaniaId
        HAVING totalParticipantes > 0
        ORDER BY COALESCE(c.FechaHasta, c.FechaDesde) DESC
        LIMIT 30";

$stmt = $conn->prepare($sql);
$tipos = str_repeat('i', 1 + count($equipoIds));
$stmt->bind_param($tipos, $userId, ...$equipoIds);
$stmt->execute();
$res = $stmt->get_result();

$comoOrganizador = [];
while ($row = $res->fetch_assoc()) {
    $organizador = rh_campania_organizador($row);

    // Cuántos participantes todavía no calificó el organizador.
    $stmt2 = $conn->prepare(
        "SELECT COUNT(*) AS n FROM CampaniaInscripcion i
         WHERE i.CampaniaId = ? AND i.Estado IN ('confirmada','ausente') AND i.UserId <> ?
           AND NOT EXISTS (
               SELECT 1 FROM Calificacion ca
               WHERE ca.Contexto = 'campania' AND ca.ContextoId = i.CampaniaId
                 AND ca.DeTipo = ? AND ca.DeId = ?
                 AND ca.ParaTipo = 'usuario' AND ca.ParaId = i.UserId
           )"
    );
    $campaniaId = (int) $row['CampaniaId'];
    $stmt2->bind_param('iisi', $campaniaId, $userId, $organizador['tipo'], $organizador['id']);
    $stmt2->execute();
    $sinCalificar = (int) ($stmt2->get_result()->fetch_assoc()['n'] ?? 0);
    $stmt2->close();

    if ($sinCalificar === 0 && (int) $row['sinAsistencia'] === 0) {
        continue;
    }

    $comoOrganizador[] = [
        'campaniaId' => $campaniaId,
        'titulo' => $row['Titulo'],
        'tipo' => $row['Tipo'],
        'fecha' => $row['FechaHasta'] ?: $row['FechaDesde'],
        'totalParticipantes' => (int) $row['totalParticipantes'],
        'sinAsistencia' => (int) $row['sinAsistencia'],
        'sinCalificar' => $sinCalificar,
    ];
}
$stmt->close();

json_success([
    'comoParticipante' => $comoParticipante,
    'comoOrganizador' => $comoOrganizador,
]);
