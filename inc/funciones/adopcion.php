<?php
/**
 * Helpers compartidos para serializar Adopcion/AdopcionFoto/AdopcionPregunta
 * al shape público usado por todos los endpoints de inc/ajax/adopcion/.
 */

function rh_adopcion_raza_nombre(mysqli $conn, ?int $razaId, ?string $razaTexto): ?string
{
    if ($razaId) {
        $stmt = $conn->prepare('SELECT Nombre FROM RazaCatalogo WHERE RazaId = ?');
        $stmt->bind_param('i', $razaId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($row) {
            return $row['Nombre'];
        }
    }
    return $razaTexto;
}

function rh_adopcion_fotos(mysqli $conn, int $adopcionId): array
{
    $stmt = $conn->prepare(
        'SELECT AdopcionFotoId, Path, Orden FROM AdopcionFoto WHERE AdopcionId = ? ORDER BY Orden ASC, AdopcionFotoId ASC'
    );
    $stmt->bind_param('i', $adopcionId);
    $stmt->execute();
    $result = $stmt->get_result();

    $fotos = [];
    while ($row = $result->fetch_assoc()) {
        $fotos[] = [
            'adopcionFotoId' => (int) $row['AdopcionFotoId'],
            'path' => $row['Path'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $fotos;
}

/**
 * Preguntas del formulario dinámico de un listado, con sus opciones anidadas
 * cuando Tipo='opcion_multiple'.
 */
function rh_adopcion_preguntas(mysqli $conn, int $adopcionId): array
{
    $stmt = $conn->prepare(
        'SELECT AdopcionPreguntaId, Tipo, Texto, Orden FROM AdopcionPregunta
         WHERE AdopcionId = ? ORDER BY Orden ASC, AdopcionPreguntaId ASC'
    );
    $stmt->bind_param('i', $adopcionId);
    $stmt->execute();
    $result = $stmt->get_result();

    $preguntas = [];
    while ($row = $result->fetch_assoc()) {
        $preguntaId = (int) $row['AdopcionPreguntaId'];
        $pregunta = [
            'adopcionPreguntaId' => $preguntaId,
            'tipo' => $row['Tipo'],
            'texto' => $row['Texto'],
            'orden' => (int) $row['Orden'],
        ];
        if ($row['Tipo'] === 'opcion_multiple') {
            $pregunta['opciones'] = rh_adopcion_pregunta_opciones($conn, $preguntaId);
        }
        $preguntas[] = $pregunta;
    }
    $stmt->close();

    return $preguntas;
}

function rh_adopcion_pregunta_opciones(mysqli $conn, int $preguntaId): array
{
    $stmt = $conn->prepare(
        'SELECT AdopcionPreguntaOpcionId, Texto, Orden FROM AdopcionPreguntaOpcion
         WHERE AdopcionPreguntaId = ? ORDER BY Orden ASC, AdopcionPreguntaOpcionId ASC'
    );
    $stmt->bind_param('i', $preguntaId);
    $stmt->execute();
    $result = $stmt->get_result();

    $opciones = [];
    while ($row = $result->fetch_assoc()) {
        $opciones[] = [
            'adopcionPreguntaOpcionId' => (int) $row['AdopcionPreguntaOpcionId'],
            'texto' => $row['Texto'],
            'orden' => (int) $row['Orden'],
        ];
    }
    $stmt->close();

    return $opciones;
}

function rh_adopcion_es_favorito(mysqli $conn, int $adopcionId, int $viewerUserId): bool
{
    $stmt = $conn->prepare('SELECT AdopcionFavoritoId FROM AdopcionFavorito WHERE AdopcionId = ? AND UserId = ?');
    $stmt->bind_param('ii', $adopcionId, $viewerUserId);
    $stmt->execute();
    $esFavorito = (bool) $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $esFavorito;
}

function rh_adopcion_total_postulaciones(mysqli $conn, int $adopcionId): int
{
    $stmt = $conn->prepare('SELECT COUNT(*) AS total FROM AdopcionPostulacion WHERE AdopcionId = ?');
    $stmt->bind_param('i', $adopcionId);
    $stmt->execute();
    $total = (int) $stmt->get_result()->fetch_assoc()['total'];
    $stmt->close();

    return $total;
}

/**
 * Respuestas de una postulación puntual, con el texto de la pregunta y (si
 * corresponde) el texto de la opción elegida ya resueltos — para mostrarle
 * al rescatista una lista legible pregunta→respuesta.
 */
function rh_adopcion_respuestas_postulacion(mysqli $conn, int $postulacionId): array
{
    $stmt = $conn->prepare(
        'SELECT r.RespuestaTexto, r.AdopcionPreguntaOpcionId,
                p.Texto AS PreguntaTexto, p.Tipo AS PreguntaTipo,
                o.Texto AS OpcionTexto
         FROM AdopcionRespuesta r
         JOIN AdopcionPregunta p ON p.AdopcionPreguntaId = r.AdopcionPreguntaId
         LEFT JOIN AdopcionPreguntaOpcion o ON o.AdopcionPreguntaOpcionId = r.AdopcionPreguntaOpcionId
         WHERE r.AdopcionPostulacionId = ?
         ORDER BY p.Orden ASC, r.AdopcionRespuestaId ASC'
    );
    $stmt->bind_param('i', $postulacionId);
    $stmt->execute();
    $result = $stmt->get_result();

    $respuestas = [];
    while ($row = $result->fetch_assoc()) {
        $respuestas[] = [
            'preguntaTexto' => $row['PreguntaTexto'],
            'preguntaTipo' => $row['PreguntaTipo'],
            'respuesta' => $row['PreguntaTipo'] === 'opcion_multiple' ? $row['OpcionTexto'] : $row['RespuestaTexto'],
        ];
    }
    $stmt->close();

    return $respuestas;
}

/**
 * Serializa un row de Adopcion (array asociativo de la DB, con columnas de
 * Usuario ya incluidas vía JOIN) al shape público.
 * $incluirDetalle agrega preguntas/postulaciones (para obtener.php, no para listar.php).
 */
function rh_adopcion_publico(mysqli $conn, array $a, int $viewerUserId, bool $incluirDetalle = false): array
{
    $adopcionId = (int) $a['AdopcionId'];
    $autorId = (int) $a['UserId'];
    $esDueno = $autorId === $viewerUserId;
    $razaId = $a['RazaId'] !== null ? (int) $a['RazaId'] : null;

    $whatsappVisible = $esDueno || ($a['WhatsappVisibilidad'] ?? null) === 'publica';

    $data = [
        'adopcionId' => $adopcionId,
        'autor' => rh_usuario_resumen([
            'UserId' => $a['UserId'],
            'Username' => $a['Username'],
            'NombreCompleto' => $a['NombreCompleto'],
            'AvatarPath' => $a['AvatarPath'],
        ]),
        'whatsappNumero' => $whatsappVisible ? ($a['WhatsappNumero'] ?? null) : null,
        'zonaDescripcion' => $a['ZonaDescripcion'] ?? null,
        'nombre' => $a['Nombre'],
        'sexo' => $a['Sexo'],
        'edadAnios' => $a['EdadAnios'] !== null ? (int) $a['EdadAnios'] : null,
        'edadMeses' => $a['EdadMeses'] !== null ? (int) $a['EdadMeses'] : null,
        'especie' => $a['Especie'],
        'razaId' => $razaId,
        'razaTexto' => $a['RazaTexto'],
        'raza' => rh_adopcion_raza_nombre($conn, $razaId, $a['RazaTexto']),
        'descripcion' => $a['Descripcion'],
        'fotos' => rh_adopcion_fotos($conn, $adopcionId),
        'estadoAdopcion' => $a['EstadoAdopcion'],
        'esFavorito' => rh_adopcion_es_favorito($conn, $adopcionId, $viewerUserId),
        'esDueno' => $esDueno,
        'estado' => $a['Estado'],
        'createdAt' => $a['CreatedAt'],
    ];

    if ($incluirDetalle) {
        $data['preguntas'] = rh_adopcion_preguntas($conn, $adopcionId);
        if ($esDueno) {
            $data['totalPostulaciones'] = rh_adopcion_total_postulaciones($conn, $adopcionId);
        }
    }

    return $data;
}
