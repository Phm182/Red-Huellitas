<?php
/**
 * Crear una Historia. Sin gate de verificación (a diferencia de Publicaciones
 * y Shorts) — contenido efímero de menor riesgo; sumar el gate después es
 * trivial si se decide dar paridad.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/validacion.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/uploads.php';
require_once __DIR__ . '/../../funciones/historias.php';

try {
    $userId = rh_require_auth($conn);

    $tipoMedia = $_POST['tipoMedia'] ?? '';
    if (!in_array($tipoMedia, ['foto', 'video'], true)) {
        json_error("tipoMedia debe ser 'foto' o 'video'");
    }

    if (!isset($_FILES['media']) || !is_array($_FILES['media'])) {
        // Sin archivo: suele ser post_max_size / upload_max_filesize del hosting.
        $contentLength = (int) ($_SERVER['CONTENT_LENGTH'] ?? 0);
        if ($contentLength > 0 && empty($_POST) && empty($_FILES)) {
            json_error('El archivo supera el límite de subida del servidor. Probá un video más corto o comprimido.');
        }
        json_error('Falta el archivo de la historia');
    }

    $duracionSegundos = isset($_POST['duracionSegundos']) ? (int) $_POST['duracionSegundos'] : null;

    // Recorte no destructivo: no se re-encodea nada, se guarda el tramo y el
    // reproductor arranca y corta ahí (ver sql/023_historias_cadenas.sql).
    $recorteInicio = isset($_POST['recorteInicioSeg']) && $_POST['recorteInicioSeg'] !== ''
        ? max(0, (float) $_POST['recorteInicioSeg'])
        : null;
    $recorteFin = isset($_POST['recorteFinSeg']) && $_POST['recorteFinSeg'] !== ''
        ? max(0, (float) $_POST['recorteFinSeg'])
        : null;
    if ($recorteInicio !== null && $recorteFin !== null && $recorteFin <= $recorteInicio) {
        json_error('El recorte del video es inválido: el final tiene que ser posterior al inicio');
    }
    $sinAudio = filter_var($_POST['sinAudio'] ?? false, FILTER_VALIDATE_BOOLEAN) ? 1 : 0;

    // Velocidad de reproducción (cámara lenta / rápida). Se acepta sólo la
    // lista cerrada que ofrece la app: cualquier otro valor volvería a 1x sin
    // avisar, y es mejor rechazarlo que publicar algo distinto de lo elegido.
    $velocidad = 1.0;
    if (isset($_POST['velocidad']) && $_POST['velocidad'] !== '') {
        $velocidad = (float) $_POST['velocidad'];
        if (!in_array($velocidad, [0.5, 1.0, 2.0], true)) {
            json_error('Velocidad de reproducción inválida');
        }
    }

    $cadenaId = isset($_POST['cadenaId']) && $_POST['cadenaId'] !== '' ? (int) $_POST['cadenaId'] : null;
    if ($cadenaId !== null) {
        $stmt = $conn->prepare("SELECT CadenaId FROM Cadena WHERE CadenaId = ? AND Estado = 'A'");
        $stmt->bind_param('i', $cadenaId);
        $stmt->execute();
        $existe = (bool) $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$existe) {
            json_error('La cadena no existe o fue cerrada', 404);
        }
    }

    $overlayJson = null;
    if (isset($_POST['overlayJson']) && is_string($_POST['overlayJson']) && $_POST['overlayJson'] !== '') {
        $decoded = json_decode($_POST['overlayJson'], true);
        if (!is_array($decoded)) {
            json_error('overlayJson inválido');
        }
        if (strlen($_POST['overlayJson']) > 100000) {
            json_error('overlayJson demasiado grande');
        }
        $overlayJson = json_encode($decoded, JSON_UNESCAPED_UNICODE);
    }

    if ($tipoMedia === 'video') {
        $error = rh_validar_video_subido($_FILES['media'], $duracionSegundos);
        if ($error) {
            json_error("Video inválido: $error");
        }
        if ($duracionSegundos === null || $duracionSegundos <= 0) {
            $duracionSegundos = null;
        }
    } else {
        $error = rh_validar_imagen_subida($_FILES['media']);
        if ($error) {
            json_error("Imagen inválida: $error");
        }
        $duracionSegundos = null;
    }

    // PHP 8.1+ no acepta null en bind_param tipado 'i' → usamos SQL con NULL explícito.
    if ($duracionSegundos === null) {
        $stmt = $conn->prepare(
            'INSERT INTO Historia (UserId, TipoMedia, MediaPath, DuracionSegundos, ExpiraEn)
             VALUES (?, ?, ?, NULL, NOW() + INTERVAL 24 HOUR)'
        );
        $vacio = '';
        $stmt->bind_param('iss', $userId, $tipoMedia, $vacio);
    } else {
        $stmt = $conn->prepare(
            'INSERT INTO Historia (UserId, TipoMedia, MediaPath, DuracionSegundos, ExpiraEn)
             VALUES (?, ?, ?, ?, NOW() + INTERVAL 24 HOUR)'
        );
        $vacio = '';
        $stmt->bind_param('issi', $userId, $tipoMedia, $vacio, $duracionSegundos);
    }
    if (!$stmt->execute()) {
        json_error('No se pudo crear la historia');
    }
    $historiaId = (int) $stmt->insert_id;
    $stmt->close();

    $mediaPath = rh_guardar_media_historia($_FILES['media'], $userId, $tipoMedia);

    // El path se sabe recién después de guardar el archivo (necesita el
    // HistoriaId), así que el resto de los campos se completa en el mismo
    // UPDATE en vez de hacer dos.
    $sets = ['MediaPath = ?'];
    $tipos = 's';
    $params = [$mediaPath];

    if ($overlayJson !== null) {
        $sets[] = 'OverlayJson = ?';
        $tipos .= 's';
        $params[] = $overlayJson;
    }
    if ($recorteInicio !== null) {
        $sets[] = 'RecorteInicioSeg = ?';
        $tipos .= 'd';
        $params[] = $recorteInicio;
    }
    if ($recorteFin !== null) {
        $sets[] = 'RecorteFinSeg = ?';
        $tipos .= 'd';
        $params[] = $recorteFin;
    }
    if ($sinAudio === 1) {
        $sets[] = 'SinAudio = 1';
    }
    if ($velocidad !== 1.0) {
        $sets[] = 'VelocidadReproduccion = ?';
        $tipos .= 'd';
        $params[] = $velocidad;
    }
    if ($cadenaId !== null) {
        $sets[] = 'CadenaId = ?';
        $tipos .= 'i';
        $params[] = $cadenaId;
    }

    $tipos .= 'i';
    $params[] = $historiaId;

    $stmt = $conn->prepare('UPDATE Historia SET ' . implode(', ', $sets) . ' WHERE HistoriaId = ?');
    $stmt->bind_param($tipos, ...$params);
    $stmt->execute();
    $stmt->close();

    // Stickers interactivos. La posición ya viajó dentro del overlay; acá van
    // los datos, que necesitan tabla propia para poder recibir votos.
    $encuestaPregunta = trim($_POST['encuestaPregunta'] ?? '');
    $encuestaA = trim($_POST['encuestaOpcionA'] ?? '');
    $encuestaB = trim($_POST['encuestaOpcionB'] ?? '');
    if ($encuestaPregunta !== '' && $encuestaA !== '' && $encuestaB !== '') {
        $stmt = $conn->prepare(
            'INSERT INTO HistoriaEncuesta (HistoriaId, Pregunta, OpcionA, OpcionB) VALUES (?, ?, ?, ?)'
        );
        $stmt->bind_param('isss', $historiaId, $encuestaPregunta, $encuestaA, $encuestaB);
        $stmt->execute();
        $stmt->close();
    }

    $preguntaTexto = trim($_POST['preguntaTexto'] ?? '');
    if ($preguntaTexto !== '') {
        $stmt = $conn->prepare('INSERT INTO HistoriaPregunta (HistoriaId, Texto) VALUES (?, ?)');
        $stmt->bind_param('is', $historiaId, $preguntaTexto);
        $stmt->execute();
        $stmt->close();
    }

    // Publicar en una cadena es lo que suma como participante. Idempotente:
    // publicar dos veces en la misma cadena no cuenta doble.
    if ($cadenaId !== null) {
        rh_cadena_sumar_participante($conn, $cadenaId, $userId);
        rh_cadena_notificar_continuacion($conn, $cadenaId, $userId);
    }

    $stmt = $conn->prepare('SELECT * FROM Historia WHERE HistoriaId = ?');
    $stmt->bind_param('i', $historiaId);
    $stmt->execute();
    $historia = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$historia) {
        json_error('Historia creada pero no se pudo leer', 500);
    }

    json_success(['historia' => rh_historia_publico($conn, $historia, $userId)], 'Historia creada', 201);
} catch (Throwable $e) {
    error_log('historias/crear.php: ' . $e->getMessage());
    json_error('Error al crear la historia. Intentá de nuevo.', 500);
}
