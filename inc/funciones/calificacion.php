<?php
/**
 * Calificaciones cruzadas: la gente califica al organizador de una campaña y
 * el organizador califica a los que se anotaron.
 *
 * Los dos sentidos usan la misma tabla porque son el mismo dato (ver el
 * comentario largo en sql/045). Acá viven las tres cosas que hay que
 * responder siempre igual: **quién puede calificar a quién**, **cuál es la
 * reputación de alguien** y **cuántas veces faltó**.
 *
 * La regla de oro: sólo se califica lo que se vivió. Si el usuario no estuvo
 * inscripto y confirmado en la campaña, no puede opinar sobre ella; si la
 * campaña todavía no terminó, tampoco. Sin eso, la reputación se llena de
 * gente que nunca pisó el lugar.
 */

require_once __DIR__ . '/equipo.php';

/**
 * Quién organiza una campaña: el equipo si lo hay, si no la persona.
 *
 * Devuelve ['tipo' => 'equipo'|'usuario', 'id' => int]. Es el destinatario de
 * la calificación del usuario y el emisor de la calificación al usuario.
 */
function rh_campania_organizador(array $campania): array
{
    $equipoId = isset($campania['EquipoId']) ? (int) $campania['EquipoId'] : 0;

    if ($equipoId > 0) {
        return ['tipo' => 'equipo', 'id' => $equipoId];
    }

    return ['tipo' => 'usuario', 'id' => (int) $campania['UserId']];
}

/**
 * ¿Este usuario puede administrar la campaña?
 *
 * Vive al lado de `rh_campania_organizador()` porque es la misma pregunta
 * vista al revés, y porque desde que existen los equipos ya no alcanza con
 * comparar `UserId`: si la campaña es de un equipo, la administran sus
 * dueños y admins aunque no la hayan cargado ellos.
 */
function rh_campania_puede_administrar(mysqli $conn, array $campania, int $userId): bool
{
    $organizador = rh_campania_organizador($campania);

    if ($organizador['tipo'] === 'equipo') {
        return rh_equipo_puede_administrar($conn, $organizador['id'], $userId);
    }

    return $organizador['id'] === $userId;
}

/** ¿Ya pasó? Una campaña sin FechaHasta termina el día que empieza. */
function rh_campania_termino(array $campania): bool
{
    $fin = $campania['FechaHasta'] ?: $campania['FechaDesde'];

    return $fin < date('Y-m-d');
}

/**
 * Promedio y total de calificaciones recibidas.
 *
 * `promedio` es null y no 0 cuando no hay ninguna: un equipo nuevo no tiene
 * cero estrellas, no tiene estrellas todavía, y mostrarlo como 0 lo hundiría
 * antes de empezar.
 */
function rh_reputacion(mysqli $conn, string $paraTipo, int $paraId): array
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS total, AVG(Puntaje) AS promedio
         FROM Calificacion
         WHERE ParaTipo = ? AND ParaId = ? AND Estado = 'A'"
    );
    $stmt->bind_param('si', $paraTipo, $paraId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $total = (int) ($row['total'] ?? 0);

    return [
        'total' => $total,
        'promedio' => $total > 0 ? round((float) $row['promedio'], 2) : null,
    ];
}

/**
 * Historial de asistencia de un usuario a campañas con inscripción.
 *
 * `faltasSinAviso` es el número que le importa al organizador: se anotó, no
 * avisó y no apareció, ocupando un cupo que alguien de la lista de espera
 * habría usado. Se cuenta aparte de `faltasConAviso` porque avisar es
 * justamente lo que queremos premiar.
 */
function rh_usuario_asistencias(mysqli $conn, int $userId): array
{
    $stmt = $conn->prepare(
        "SELECT
            SUM(Asistio = 'si') AS fue,
            SUM(Asistio = 'no' AND AvisoAusenciaEn IS NULL) AS faltoSinAviso,
            SUM(Asistio = 'no' AND AvisoAusenciaEn IS NOT NULL) AS faltoConAviso,
            SUM(Estado = 'ausente') AS aviso
         FROM CampaniaInscripcion
         WHERE UserId = ?"
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return [
        'asistio' => (int) ($row['fue'] ?? 0),
        'faltasSinAviso' => (int) ($row['faltoSinAviso'] ?? 0),
        'faltasConAviso' => (int) ($row['faltoConAviso'] ?? 0),
        'avisosDeAusencia' => (int) ($row['aviso'] ?? 0),
    ];
}

/** La calificación que ya dejó este emisor en este contexto, si existe. */
function rh_calificacion_existente(
    mysqli $conn,
    string $contexto,
    int $contextoId,
    string $deTipo,
    int $deId,
    string $paraTipo,
    int $paraId
): ?array {
    $stmt = $conn->prepare(
        'SELECT * FROM Calificacion
         WHERE Contexto = ? AND ContextoId = ?
           AND DeTipo = ? AND DeId = ? AND ParaTipo = ? AND ParaId = ?'
    );
    $stmt->bind_param('sisisi', $contexto, $contextoId, $deTipo, $deId, $paraTipo, $paraId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

/**
 * Guarda o actualiza una calificación.
 *
 * Es un upsert y no un insert: editar la propia opinión es legítimo, pero
 * dejar varias filas del mismo emisor sobre el mismo hecho inflaría el
 * promedio votando muchas veces lo mismo. La UNIQUE de sql/045 lo garantiza
 * a nivel base aunque un endpoint nuevo se olvide de pasar por acá.
 */
function rh_calificacion_guardar(
    mysqli $conn,
    string $contexto,
    int $contextoId,
    string $deTipo,
    int $deId,
    int $deUserId,
    string $paraTipo,
    int $paraId,
    int $puntaje,
    ?string $comentario
): int {
    $stmt = $conn->prepare(
        'INSERT INTO Calificacion
            (Contexto, ContextoId, DeTipo, DeId, DeUserId, ParaTipo, ParaId, Puntaje, Comentario)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
            Puntaje = VALUES(Puntaje),
            Comentario = VALUES(Comentario),
            DeUserId = VALUES(DeUserId),
            Estado = \'A\''
    );
    $stmt->bind_param(
        'sisiisiis',
        $contexto,
        $contextoId,
        $deTipo,
        $deId,
        $deUserId,
        $paraTipo,
        $paraId,
        $puntaje,
        $comentario
    );
    $stmt->execute();
    $id = (int) $stmt->insert_id;
    $stmt->close();

    if ($id === 0) {
        $existente = rh_calificacion_existente(
            $conn, $contexto, $contextoId, $deTipo, $deId, $paraTipo, $paraId
        );
        $id = (int) ($existente['CalificacionId'] ?? 0);
    }

    return $id;
}

/**
 * Serializa una calificación con el nombre y avatar de quien la dejó.
 *
 * El emisor puede ser una persona o un equipo, así que se resuelve acá y no
 * en cada endpoint.
 */
function rh_calificacion_publica(mysqli $conn, array $c): array
{
    $autor = null;

    if ($c['DeTipo'] === 'equipo') {
        $stmt = $conn->prepare('SELECT EquipoId, Nombre, AvatarPath FROM Equipo WHERE EquipoId = ?');
        $stmt->bind_param('i', $c['DeId']);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($row) {
            $autor = [
                'tipo' => 'equipo',
                'id' => (int) $row['EquipoId'],
                'nombre' => $row['Nombre'],
                'username' => null,
                'avatarPath' => $row['AvatarPath'],
            ];
        }
    } else {
        $stmt = $conn->prepare('SELECT UserId, Username, NombreCompleto, AvatarPath FROM Usuario WHERE UserId = ?');
        $stmt->bind_param('i', $c['DeId']);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();

        if ($row) {
            $autor = [
                'tipo' => 'usuario',
                'id' => (int) $row['UserId'],
                'nombre' => $row['NombreCompleto'],
                'username' => $row['Username'],
                'avatarPath' => $row['AvatarPath'],
            ];
        }
    }

    return [
        'calificacionId' => (int) $c['CalificacionId'],
        'contexto' => $c['Contexto'],
        'contextoId' => (int) $c['ContextoId'],
        'autor' => $autor,
        'puntaje' => (int) $c['Puntaje'],
        'comentario' => $c['Comentario'],
        'createdAt' => $c['CreatedAt'],
    ];
}
