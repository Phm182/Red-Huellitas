<?php
/**
 * Configurar la inscripción de una campaña: aviso, cupo, plazo de baja y el
 * formulario que responde quien se anota.
 *
 * `preguntas` viaja como JSON:
 *   [{ "tipo": "texto", "texto": "¿Nombre del animal?", "obligatoria": true },
 *    { "tipo": "opcion_multiple", "texto": "Tamaño", "obligatoria": true,
 *      "opciones": ["Chico", "Mediano", "Grande"] }]
 *
 * Reemplaza el formulario entero en vez de aplicar un diff: es un puñado de
 * preguntas y armar un diff correcto (altas, bajas, reordenamientos) es mucho
 * más código para el mismo resultado.
 *
 * **Las preguntas ya respondidas no se tocan.** Si alguien se anotó, borrar las
 * preguntas se llevaría puestas sus respuestas por la foreign key, y quien
 * organiza perdería los datos con los que iba a atender a esa persona.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';
require_once __DIR__ . '/../../funciones/campania_inscripcion.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_POST['campaniaId'] ?? 0);
if ($campaniaId <= 0) {
    json_error('Falta campaniaId');
}

$stmt = $conn->prepare("SELECT * FROM Campania WHERE CampaniaId = ? AND Estado = 'A'");
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$campania = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$campania) {
    json_error('Campaña no encontrada', 404);
}
if (!rh_campania_puede_administrar($conn, $campania, $userId)) {
    json_error('No organizás esta campaña', 403);
}

// --- Configuración ---------------------------------------------------------
$requiere = filter_var($_POST['requiereInscripcion'] ?? false, FILTER_VALIDATE_BOOLEAN);
$mensajeAviso = trim($_POST['mensajeAviso'] ?? '') ?: null;

// Vacío = ilimitado. No hay un flag aparte: NULL ya lo dice.
$cupo = isset($_POST['cupoMaximo']) && $_POST['cupoMaximo'] !== ''
    ? (int) $_POST['cupoMaximo']
    : null;
if ($cupo !== null && $cupo < 1) {
    json_error('El cupo debe ser al menos 1, o vacío para ilimitado');
}

$bajaHoras = isset($_POST['bajaLimiteHoras']) && $_POST['bajaLimiteHoras'] !== ''
    ? (int) $_POST['bajaLimiteHoras']
    : null;
if ($bajaHoras !== null && $bajaHoras < 0) {
    json_error('El plazo de baja no puede ser negativo');
}

// Bajar el cupo por debajo de la gente ya confirmada dejaría filas confirmadas
// de más y ningún criterio justo para elegir a quién sacar.
if ($cupo !== null) {
    $confirmadas = rh_campania_confirmadas($conn, $campaniaId);
    if ($cupo < $confirmadas) {
        json_error(
            "Ya hay $confirmadas personas confirmadas. Para bajar el cupo, primero dales de baja.",
            409
        );
    }
}

$stmt = $conn->prepare(
    'UPDATE Campania SET RequiereInscripcion = ?, MensajeAviso = ?, CupoMaximo = ?, BajaLimiteHoras = ?
     WHERE CampaniaId = ?'
);
$req = $requiere ? 1 : 0;
$stmt->bind_param('isiii', $req, $mensajeAviso, $cupo, $bajaHoras, $campaniaId);
$stmt->execute();
$stmt->close();

// --- Formulario ------------------------------------------------------------
$crudo = trim($_POST['preguntas'] ?? '');
if ($crudo === '') {
    json_success(['preguntas' => rh_campania_preguntas($conn, $campaniaId)], 'Configuración guardada');
}

$preguntas = json_decode($crudo, true);
if (!is_array($preguntas)) {
    json_error('preguntas inválido');
}
if (count($preguntas) > 15) {
    json_error('Máximo 15 preguntas');
}

// ¿Hay respuestas guardadas? Si las hay, el formulario queda congelado.
$stmt = $conn->prepare(
    'SELECT COUNT(*) FROM CampaniaRespuesta r
     JOIN CampaniaPregunta p ON p.CampaniaPreguntaId = r.CampaniaPreguntaId
     WHERE p.CampaniaId = ?'
);
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$hayRespuestas = (int) $stmt->get_result()->fetch_row()[0] > 0;
$stmt->close();

if ($hayRespuestas) {
    json_error(
        'Ya hay personas inscriptas que respondieron el formulario. Cambiarlo borraría sus respuestas.',
        409
    );
}

// Reemplazo completo: opciones primero por la foreign key.
$conn->query(
    "DELETE o FROM CampaniaPreguntaOpcion o
     JOIN CampaniaPregunta p ON p.CampaniaPreguntaId = o.CampaniaPreguntaId
     WHERE p.CampaniaId = $campaniaId"
);
$stmt = $conn->prepare('DELETE FROM CampaniaPregunta WHERE CampaniaId = ?');
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$stmt->close();

$tiposOk = ['texto', 'si_no', 'opcion_multiple'];
$orden = 0;
foreach ($preguntas as $p) {
    $texto = trim((string) ($p['texto'] ?? ''));
    if ($texto === '') {
        continue;
    }
    $tipo = in_array($p['tipo'] ?? '', $tiposOk, true) ? $p['tipo'] : 'texto';
    $obligatoria = !empty($p['obligatoria']) ? 1 : 0;

    $stmt = $conn->prepare(
        'INSERT INTO CampaniaPregunta (CampaniaId, Tipo, Texto, Obligatoria, Orden) VALUES (?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('issii', $campaniaId, $tipo, $texto, $obligatoria, $orden);
    $stmt->execute();
    $preguntaId = (int) $stmt->insert_id;
    $stmt->close();

    if ($tipo === 'opcion_multiple') {
        $ordenOpcion = 0;
        foreach ((array) ($p['opciones'] ?? []) as $op) {
            $textoOp = trim((string) $op);
            if ($textoOp === '') {
                continue;
            }
            $stmt = $conn->prepare(
                'INSERT INTO CampaniaPreguntaOpcion (CampaniaPreguntaId, Texto, Orden) VALUES (?, ?, ?)'
            );
            $stmt->bind_param('isi', $preguntaId, $textoOp, $ordenOpcion);
            $stmt->execute();
            $stmt->close();
            $ordenOpcion++;
        }
    }
    $orden++;
}

json_success(['preguntas' => rh_campania_preguntas($conn, $campaniaId)], 'Formulario guardado');
