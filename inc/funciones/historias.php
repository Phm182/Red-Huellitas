<?php
/**
 * Helpers de Historias (contenido efímero) para Red Huellitas.
 * Toda lectura filtra por ExpiraEn > NOW() — no hay cron, la expiración es
 * puramente a nivel de query. La limpieza física de los archivos vencidos la
 * hace inc/cli/limpiar_historias.php.
 */

require_once __DIR__ . '/cadenas.php';

function rh_historia_vista_por(mysqli $conn, int $historiaId, int $viewerUserId): bool
{
    $stmt = $conn->prepare('SELECT HistoriaVistaId FROM HistoriaVista WHERE HistoriaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $historiaId, $viewerUserId);
    $stmt->execute();
    $vista = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $vista;
}

/**
 * Datos de la cadena a la que pertenece una historia, si pertenece a alguna.
 * Incluye la posición ("3º de Chapuzón"), que es lo que invita a sumarse.
 */
function rh_historia_cadena(mysqli $conn, array $h): ?array
{
    if (empty($h['CadenaId'])) {
        return null;
    }

    $cadenaId = (int) $h['CadenaId'];
    $stmt = $conn->prepare('SELECT CadenaId, Tema, Descripcion FROM Cadena WHERE CadenaId = ? AND Estado = \'A\'');
    $stmt->bind_param('i', $cadenaId);
    $stmt->execute();
    $cadena = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$cadena) {
        return null;
    }

    return [
        'cadenaId' => $cadenaId,
        'tema' => $cadena['Tema'],
        'descripcion' => $cadena['Descripcion'],
        'posicion' => rh_cadena_posicion($conn, $cadenaId, (int) $h['HistoriaId']),
        'total' => rh_cadena_total_historias($conn, $cadenaId),
    ];
}

/**
 * Encuesta de la historia con el recuento por opción y qué votó el viewer.
 * Los totales se mandan siempre: en Instagram el resultado se ve recién
 * después de votar, pero acá el autor necesita verlos sin votarse a sí mismo.
 */
function rh_historia_encuesta(mysqli $conn, int $historiaId, int $viewerUserId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM HistoriaEncuesta WHERE HistoriaId = ? LIMIT 1');
    $stmt->bind_param('i', $historiaId);
    $stmt->execute();
    $encuesta = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$encuesta) {
        return null;
    }

    $encuestaId = (int) $encuesta['EncuestaId'];
    $stmt = $conn->prepare(
        "SELECT SUM(Opcion = 'A') AS VotosA, SUM(Opcion = 'B') AS VotosB
         FROM HistoriaEncuestaVoto WHERE EncuestaId = ?"
    );
    $stmt->bind_param('i', $encuestaId);
    $stmt->execute();
    $conteo = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $stmt = $conn->prepare('SELECT Opcion FROM HistoriaEncuestaVoto WHERE EncuestaId = ? AND UserId = ?');
    $stmt->bind_param('ii', $encuestaId, $viewerUserId);
    $stmt->execute();
    $miVoto = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return [
        'encuestaId' => $encuestaId,
        'pregunta' => $encuesta['Pregunta'],
        'opcionA' => $encuesta['OpcionA'],
        'opcionB' => $encuesta['OpcionB'],
        'votosA' => (int) ($conteo['VotosA'] ?? 0),
        'votosB' => (int) ($conteo['VotosB'] ?? 0),
        'miVoto' => $miVoto['Opcion'] ?? null,
    ];
}

/** Caja de preguntas. Las respuestas sólo las ve el autor, así que no van acá. */
function rh_historia_pregunta(mysqli $conn, int $historiaId): ?array
{
    $stmt = $conn->prepare('SELECT * FROM HistoriaPregunta WHERE HistoriaId = ? LIMIT 1');
    $stmt->bind_param('i', $historiaId);
    $stmt->execute();
    $pregunta = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$pregunta) {
        return null;
    }

    $preguntaId = (int) $pregunta['PreguntaId'];
    $result = $conn->query("SELECT COUNT(*) AS Total FROM HistoriaPreguntaRespuesta WHERE PreguntaId = $preguntaId");
    $total = (int) $result->fetch_assoc()['Total'];
    $result->close();

    return [
        'preguntaId' => $preguntaId,
        'texto' => $pregunta['Texto'],
        'totalRespuestas' => $total,
    ];
}

function rh_historia_publico(mysqli $conn, array $h, int $viewerUserId): array
{
    $overlay = null;
    if (!empty($h['OverlayJson'])) {
        $decoded = json_decode((string) $h['OverlayJson'], true);
        if (is_array($decoded)) {
            $overlay = $decoded;
        }
    }

    $historiaId = (int) $h['HistoriaId'];
    $esAutor = (int) $h['UserId'] === $viewerUserId;

    // El total de vistas sólo se manda al autor: es dato sensible y además no
    // le sirve a nadie más.
    $totalVistas = null;
    if ($esAutor) {
        $stmt = $conn->prepare('SELECT COUNT(*) AS Total FROM HistoriaVista WHERE HistoriaId = ?');
        $stmt->bind_param('i', $historiaId);
        $stmt->execute();
        $totalVistas = (int) $stmt->get_result()->fetch_assoc()['Total'];
        $stmt->close();
    }

    return [
        'historiaId' => $historiaId,
        'userId' => (int) $h['UserId'],
        'tipoMedia' => $h['TipoMedia'],
        'mediaPath' => $h['MediaPath'],
        'duracionSegundos' => $h['DuracionSegundos'] !== null ? (int) $h['DuracionSegundos'] : null,
        // Recorte no destructivo: el reproductor arranca y corta acá en vez de
        // re-encodear el archivo (ver sql/023).
        'recorteInicioSeg' => isset($h['RecorteInicioSeg']) && $h['RecorteInicioSeg'] !== null
            ? (float) $h['RecorteInicioSeg']
            : null,
        'recorteFinSeg' => isset($h['RecorteFinSeg']) && $h['RecorteFinSeg'] !== null
            ? (float) $h['RecorteFinSeg']
            : null,
        'sinAudio' => (bool) ($h['SinAudio'] ?? 0),
        // Velocidad: mismo criterio que el recorte, el archivo no se toca y la
        // aplica el reproductor (ver sql/024).
        'velocidad' => isset($h['VelocidadReproduccion']) && $h['VelocidadReproduccion'] !== null
            ? (float) $h['VelocidadReproduccion']
            : 1.0,
        'overlay' => $overlay,
        'cadena' => rh_historia_cadena($conn, $h),
        'encuesta' => rh_historia_encuesta($conn, $historiaId, $viewerUserId),
        'pregunta' => rh_historia_pregunta($conn, $historiaId),
        'esAutor' => $esAutor,
        'totalVistas' => $totalVistas,
        'createdAt' => $h['CreatedAt'],
        'expiraEn' => $h['ExpiraEn'],
        'vista' => rh_historia_vista_por($conn, $historiaId, $viewerUserId),
    ];
}
