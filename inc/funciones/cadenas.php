<?php
/**
 * Cadenas de historias.
 *
 * Alguien propone un tema ("Chapuzón"), sube su historia, y el resto la
 * continúa con la suya. Es lo que diferencia esto de Instagram, donde cada
 * historia es una isla.
 *
 * Regla central: **la cadena no expira aunque sus historias sí**. Las
 * historias vencen a las 24hs como cualquier otra, pero la cadena queda viva
 * mostrando las que estén vigentes. Si muriera con su primera historia nadie
 * llegaría a sumarse.
 *
 * Requiere bd.php, respuesta.php y auth.php incluidos.
 */

require_once __DIR__ . '/push.php';
require_once __DIR__ . '/notificaciones.php';

const RH_CADENA_LIMITE_DEFAULT = 20;
const RH_CADENA_LIMITE_MAX = 50;

/** Cuántos avatares de participantes se mandan para la pila de la tarjeta. */
const RH_CADENA_AVATARES_PREVIEW = 4;

/**
 * Cuenta las historias vigentes de una cadena y en qué posición quedaría una
 * historia nueva. El "3º de Chapuzón" del badge sale de acá: saber que estás
 * sumándote a algo que ya tiene gente es lo que da ganas de participar.
 */
function rh_cadena_total_historias(mysqli $conn, int $cadenaId): int
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS Total FROM Historia
         WHERE CadenaId = ? AND Estado = 'A' AND ExpiraEn > NOW()"
    );
    $stmt->bind_param('i', $cadenaId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int) $row['Total'];
}

/**
 * Posición de una historia dentro de su cadena, contando sólo las vigentes.
 * Se calcula al leer y no se guarda: si una historia anterior vence, las
 * siguientes se recorren solas.
 */
function rh_cadena_posicion(mysqli $conn, int $cadenaId, int $historiaId): int
{
    $stmt = $conn->prepare(
        "SELECT COUNT(*) AS Previas FROM Historia
         WHERE CadenaId = ? AND Estado = 'A' AND ExpiraEn > NOW() AND HistoriaId <= ?"
    );
    $stmt->bind_param('ii', $cadenaId, $historiaId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return (int) $row['Previas'];
}

/**
 * Participantes de una cadena, los más recientes primero.
 * @return array<int, array>
 */
function rh_cadena_participantes(mysqli $conn, int $cadenaId, ?int $limite = null): array
{
    $sql = 'SELECT Usuario.UserId, Usuario.Username, Usuario.NombreCompleto, Usuario.AvatarPath
            FROM CadenaParticipante
            JOIN Usuario ON Usuario.UserId = CadenaParticipante.UserId
            WHERE CadenaParticipante.CadenaId = ?
            ORDER BY CadenaParticipante.CreatedAt DESC';
    if ($limite !== null) {
        $sql .= ' LIMIT ' . max(1, $limite);
    }

    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $cadenaId);
    $stmt->execute();
    $result = $stmt->get_result();

    $participantes = [];
    while ($row = $result->fetch_assoc()) {
        $participantes[] = rh_usuario_resumen($row);
    }
    $stmt->close();

    return $participantes;
}

/**
 * Suma a alguien como participante. Idempotente: publicar dos historias en la
 * misma cadena no lo cuenta dos veces (PK compuesta).
 */
function rh_cadena_sumar_participante(mysqli $conn, int $cadenaId, int $userId): void
{
    $stmt = $conn->prepare(
        'INSERT INTO CadenaParticipante (CadenaId, UserId) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE CadenaId = CadenaId'
    );
    $stmt->bind_param('ii', $cadenaId, $userId);
    $stmt->execute();
    $stmt->close();
}

/**
 * Avisa al creador de la cadena que alguien la continuó.
 *
 * Es el empujón que mantiene viva una cadena: el que la propuso se entera de
 * que prendió y vuelve a la app. No se notifica si el que continúa es el
 * propio creador.
 */
function rh_cadena_notificar_continuacion(mysqli $conn, int $cadenaId, int $autorUserId): void
{
    $stmt = $conn->prepare(
        'SELECT Cadena.Tema, Cadena.CreadorUserId, creador.ExpoPushToken, autor.NombreCompleto AS AutorNombre
         FROM Cadena
         JOIN Usuario creador ON creador.UserId = Cadena.CreadorUserId
         JOIN Usuario autor ON autor.UserId = ?
         WHERE Cadena.CadenaId = ?'
    );
    $stmt->bind_param('ii', $autorUserId, $cadenaId);
    $stmt->execute();
    $datos = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    // Ya no se pide token: la notificación se guarda igual y rh_notificar
    // decide sola si además hay push que mandar.
    if (!$datos || (int) $datos['CreadorUserId'] === $autorUserId) {
        return;
    }

    // Un push que falla nunca puede tumbar la publicación de la historia.
    try {
        rh_notificar(
            $conn,
            [(int) $datos['CreadorUserId']],
            'cadena_continuada',
            'Se sumaron a tu cadena 🔗',
            sprintf('%s continuó "%s".', $datos['AutorNombre'], $datos['Tema']),
            '/(app)/cadenas/' . $cadenaId,
            ['actorUserId' => $autorUserId]
        );
    } catch (Throwable $e) {
        error_log('rh_cadena_notificar_continuacion: ' . $e->getMessage());
    }
}

/**
 * Serializa una cadena para el cliente.
 *
 * `$conViewer` agrega si el viewer ya se sumó, para que la UI muestre
 * "Continuar" o "Sumarme" según corresponda.
 */
function rh_cadena_publica(mysqli $conn, array $c, ?int $viewerUserId = null): array
{
    $cadenaId = (int) $c['CadenaId'];

    // array_key_exists y no isset: Usuario.Username es NULL hasta que se
    // completa el onboarding, y con isset() el creador de la cadena
    // desaparecía del serializer justo para los usuarios nuevos.
    $creador = null;
    if (array_key_exists('CreadorUsername', $c)) {
        $creador = rh_usuario_resumen([
            'UserId' => $c['CreadorUserId'],
            'Username' => $c['CreadorUsername'],
            'NombreCompleto' => $c['CreadorNombre'],
            'AvatarPath' => $c['CreadorAvatar'],
        ]);
    }

    $yaParticipa = false;
    if ($viewerUserId !== null) {
        $stmt = $conn->prepare('SELECT UserId FROM CadenaParticipante WHERE CadenaId = ? AND UserId = ?');
        $stmt->bind_param('ii', $cadenaId, $viewerUserId);
        $stmt->execute();
        $yaParticipa = (bool) $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    return [
        'cadenaId' => $cadenaId,
        'tema' => $c['Tema'],
        'descripcion' => $c['Descripcion'],
        'creador' => $creador,
        'totalParticipantes' => isset($c['TotalParticipantes']) ? (int) $c['TotalParticipantes'] : 0,
        'totalHistorias' => rh_cadena_total_historias($conn, $cadenaId),
        'participantesPreview' => rh_cadena_participantes($conn, $cadenaId, RH_CADENA_AVATARES_PREVIEW),
        'yaParticipa' => $yaParticipa,
        'ultimaActividad' => $c['UltimaActividad'] ?? $c['CreatedAt'],
        'createdAt' => $c['CreatedAt'],
    ];
}

/**
 * Cadenas activas ordenadas por actividad reciente.
 *
 * "Reciente" es la última historia vigente, no la fecha de creación: una
 * cadena vieja a la que alguien se sumó hace 10 minutos tiene que aparecer
 * arriba, que es la gracia de que las cadenas no expiren.
 */
function rh_cadenas_listar(mysqli $conn, int $viewerUserId): array
{
    $cursor = isset($_GET['cursor']) && $_GET['cursor'] !== '' ? (int) $_GET['cursor'] : null;
    $limit = isset($_GET['limit'])
        ? max(1, min(RH_CADENA_LIMITE_MAX, (int) $_GET['limit']))
        : RH_CADENA_LIMITE_DEFAULT;

    // Sólo se listan cadenas con al menos una historia vigente: una cadena
    // vacía en la pantalla de explorar es una decepción garantizada.
    $sql = "SELECT Cadena.*,
                   creador.Username AS CreadorUsername,
                   creador.NombreCompleto AS CreadorNombre,
                   creador.AvatarPath AS CreadorAvatar,
                   (SELECT COUNT(*) FROM CadenaParticipante WHERE CadenaId = Cadena.CadenaId) AS TotalParticipantes,
                   (SELECT MAX(CreatedAt) FROM Historia
                     WHERE CadenaId = Cadena.CadenaId AND Estado = 'A' AND ExpiraEn > NOW()) AS UltimaActividad
            FROM Cadena
            JOIN Usuario creador ON creador.UserId = Cadena.CreadorUserId
            WHERE Cadena.Estado = 'A'
              AND EXISTS (SELECT 1 FROM Historia
                           WHERE CadenaId = Cadena.CadenaId AND Estado = 'A' AND ExpiraEn > NOW())";

    $tipos = '';
    $params = [];
    if ($cursor !== null) {
        $sql .= ' AND Cadena.CadenaId < ?';
        $tipos .= 'i';
        $params[] = $cursor;
    }
    $sql .= ' ORDER BY UltimaActividad DESC, Cadena.CadenaId DESC LIMIT ' . $limit;

    $stmt = $conn->prepare($sql);
    if ($params !== []) {
        $stmt->bind_param($tipos, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $filas = [];
    while ($row = $result->fetch_assoc()) {
        $filas[] = $row;
    }
    $stmt->close();

    $cadenas = array_map(
        static fn (array $fila) => rh_cadena_publica($conn, $fila, $viewerUserId),
        $filas
    );

    return [
        'cadenas' => $cadenas,
        'nextCursor' => count($cadenas) === $limit ? $cadenas[count($cadenas) - 1]['cadenaId'] : null,
    ];
}
