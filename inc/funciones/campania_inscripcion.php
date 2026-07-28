<?php
/**
 * Inscripciones a campañas: cupo, lista de espera y ascensos.
 *
 * Todo lo que decide quién entra y quién espera vive acá y no repartido por los
 * endpoints. Es la parte que la gente reclama —"me anoté antes que él"— así que
 * tiene que haber un solo lugar donde mirar cuando algo no cuadre.
 */

require_once __DIR__ . '/notificaciones.php';

/**
 * ¿Cuántos lugares ocupados hay?
 *
 * Cuenta sólo 'confirmada'. Las canceladas y las de lista de espera no ocupan,
 * y las 'ausente' tampoco: quien avisó que no va liberó su lugar de hecho.
 */
function rh_campania_confirmadas(mysqli $conn, int $campaniaId): int
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) FROM CampaniaInscripcion
         WHERE CampaniaId = ? AND Estado = 'confirmada'"
    );
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $n = (int) $stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
}

/**
 * Próximo número de orden.
 *
 * Se toma el máximo histórico +1, incluyendo canceladas: la posición es "en qué
 * lugar llegaste", no "qué puesto ocupás hoy". Reusar el número de alguien que
 * se dio de baja rompería el desempate del que quedó esperando.
 */
function rh_campania_proxima_posicion(mysqli $conn, int $campaniaId): int
{
    $stmt = $conn->prepare('SELECT COALESCE(MAX(Posicion), 0) + 1 FROM CampaniaInscripcion WHERE CampaniaId = ?');
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $n = (int) $stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $n;
}

/**
 * ¿Todavía se puede dar de baja?
 *
 * `BajaLimiteHoras` se cuenta hacia atrás desde el comienzo de la campaña. NULL
 * significa que se puede siempre. El cálculo va en MySQL a propósito: PHP y
 * MySQL no comparten zona horaria en este proyecto (ver bd.php) y comparar
 * fechas cruzando los dos daba diferencias de horas.
 */
function rh_campania_puede_darse_baja(mysqli $conn, array $campania): bool
{
    if ($campania['BajaLimiteHoras'] === null) {
        return true;
    }
    $stmt = $conn->prepare(
        'SELECT NOW() < DATE_SUB(?, INTERVAL ? HOUR)'
    );
    $desde = $campania['FechaDesde'];
    $horas = (int) $campania['BajaLimiteHoras'];
    $stmt->bind_param('si', $desde, $horas);
    $stmt->execute();
    $ok = (bool) $stmt->get_result()->fetch_row()[0];
    $stmt->close();
    return $ok;
}

/**
 * Al liberarse un lugar, sube el primero de la lista de espera.
 *
 * Se llama después de toda baja. Devuelve el UserId ascendido, o null si no
 * había nadie esperando.
 *
 * El `UPDATE ... WHERE Estado = 'lista_espera'` con la posición exacta es lo que
 * evita que dos bajas simultáneas asciendan a la misma persona dos veces: la
 * segunda no encuentra la fila en ese estado y no hace nada.
 */
function rh_campania_ascender_siguiente(mysqli $conn, int $campaniaId): ?int
{
    $stmt = $conn->prepare(
        "SELECT CampaniaInscripcionId, UserId FROM CampaniaInscripcion
         WHERE CampaniaId = ? AND Estado = 'lista_espera'
         ORDER BY Posicion ASC LIMIT 1"
    );
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $fila = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$fila) {
        return null;
    }

    $inscripcionId = (int) $fila['CampaniaInscripcionId'];
    $stmt = $conn->prepare(
        "UPDATE CampaniaInscripcion SET Estado = 'confirmada'
         WHERE CampaniaInscripcionId = ? AND Estado = 'lista_espera'"
    );
    $stmt->bind_param('i', $inscripcionId);
    $stmt->execute();
    $ascendio = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$ascendio) {
        return null;
    }

    $userId = (int) $fila['UserId'];

    $stmt = $conn->prepare('SELECT Titulo FROM Campania WHERE CampaniaId = ?');
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $titulo = $stmt->get_result()->fetch_assoc()['Titulo'] ?? 'la campaña';
    $stmt->close();

    try {
        rh_notificar(
            $conn,
            [$userId],
            'campania_cupo_liberado',
            '🎉 Se liberó un lugar',
            'Ya tenés lugar confirmado en "' . $titulo . '".',
            '/(app)/campanias/' . $campaniaId
        );
    } catch (Throwable $e) {
        // El ascenso ya está hecho; la notificación es el extra.
    }

    return $userId;
}

/** Preguntas del formulario, con sus opciones. */
function rh_campania_preguntas(mysqli $conn, int $campaniaId): array
{
    $stmt = $conn->prepare(
        'SELECT CampaniaPreguntaId, Tipo, Texto, Obligatoria, Orden
         FROM CampaniaPregunta WHERE CampaniaId = ? ORDER BY Orden ASC, CampaniaPreguntaId ASC'
    );
    $stmt->bind_param('i', $campaniaId);
    $stmt->execute();
    $res = $stmt->get_result();

    $preguntas = [];
    $ids = [];
    while ($p = $res->fetch_assoc()) {
        $id = (int) $p['CampaniaPreguntaId'];
        $ids[] = $id;
        $preguntas[$id] = [
            'campaniaPreguntaId' => $id,
            'tipo' => $p['Tipo'],
            'texto' => $p['Texto'],
            'obligatoria' => (bool) $p['Obligatoria'],
            'orden' => (int) $p['Orden'],
            'opciones' => [],
        ];
    }
    $stmt->close();

    if (count($ids) > 0) {
        $marcas = implode(',', array_fill(0, count($ids), '?'));
        $stmt = $conn->prepare(
            "SELECT CampaniaPreguntaOpcionId, CampaniaPreguntaId, Texto
             FROM CampaniaPreguntaOpcion WHERE CampaniaPreguntaId IN ($marcas)
             ORDER BY Orden ASC, CampaniaPreguntaOpcionId ASC"
        );
        $stmt->bind_param(str_repeat('i', count($ids)), ...$ids);
        $stmt->execute();
        $res = $stmt->get_result();
        while ($o = $res->fetch_assoc()) {
            $preguntas[(int) $o['CampaniaPreguntaId']]['opciones'][] = [
                'campaniaPreguntaOpcionId' => (int) $o['CampaniaPreguntaOpcionId'],
                'texto' => $o['Texto'],
            ];
        }
        $stmt->close();
    }

    return array_values($preguntas);
}
