<?php
/**
 * Panel de la campaña, para quien la organiza.
 *
 * Devuelve todo lo que hace falta para decidir en el momento: cuánta gente hay
 * confirmada contra el cupo, quién está esperando y en qué orden, quién avisó
 * que no va, y las respuestas del formulario de cada uno.
 *
 * Va todo en un pedido y no en cinco: el panel se abre entero, y cinco llamadas
 * en paralelo sobre las mismas dos tablas sólo agregan latencia y estados
 * intermedios raros en la pantalla.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/campania_inscripcion.php';
require_once __DIR__ . '/../../funciones/uploads.php';

$userId = rh_require_auth($conn);

$campaniaId = (int) ($_GET['campaniaId'] ?? 0);
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
if ((int) $campania['UserId'] !== $userId) {
    json_error('No organizás esta campaña', 403);
}

// --- Inscripciones con su gente -------------------------------------------
$stmt = $conn->prepare(
    'SELECT i.CampaniaInscripcionId, i.UserId, i.Estado, i.Posicion, i.CreatedAt,
            i.CanceladaEn, i.AvisoAusenciaEn, i.NotaAusencia,
            u.Username, u.NombreCompleto, u.AvatarPath, u.WhatsappNumero
     FROM CampaniaInscripcion i
     JOIN Usuario u ON u.UserId = i.UserId
     WHERE i.CampaniaId = ?
     ORDER BY FIELD(i.Estado, \'confirmada\', \'lista_espera\', \'ausente\', \'cancelada\'), i.Posicion ASC'
);
$stmt->bind_param('i', $campaniaId);
$stmt->execute();
$res = $stmt->get_result();

$inscripciones = [];
$ids = [];
while ($r = $res->fetch_assoc()) {
    $id = (int) $r['CampaniaInscripcionId'];
    $ids[] = $id;
    $inscripciones[$id] = [
        'campaniaInscripcionId' => $id,
        'estado' => $r['Estado'],
        'posicion' => (int) $r['Posicion'],
        'createdAt' => $r['CreatedAt'],
        'canceladaEn' => $r['CanceladaEn'],
        'avisoAusenciaEn' => $r['AvisoAusenciaEn'],
        'notaAusencia' => $r['NotaAusencia'],
        'usuario' => [
            'userId' => (int) $r['UserId'],
            'username' => $r['Username'],
            'nombreCompleto' => $r['NombreCompleto'],
            'avatarPath' => $r['AvatarPath'],
            'avatarBust' => rh_avatar_bust($r['AvatarPath'] ?? null),
            // El WhatsApp se expone sólo acá y sólo a quien organiza: lo necesita
            // para avisar de un cambio de horario o coordinar.
            'whatsappNumero' => $r['WhatsappNumero'],
        ],
        'respuestas' => [],
    ];
}
$stmt->close();

// --- Respuestas del formulario, en una sola consulta ----------------------
if (count($ids) > 0) {
    $marcas = implode(',', array_fill(0, count($ids), '?'));
    $stmt = $conn->prepare(
        "SELECT r.CampaniaInscripcionId, r.CampaniaPreguntaId, r.RespuestaTexto,
                p.Texto AS PreguntaTexto, o.Texto AS OpcionTexto
         FROM CampaniaRespuesta r
         JOIN CampaniaPregunta p ON p.CampaniaPreguntaId = r.CampaniaPreguntaId
         LEFT JOIN CampaniaPreguntaOpcion o ON o.CampaniaPreguntaOpcionId = r.CampaniaPreguntaOpcionId
         WHERE r.CampaniaInscripcionId IN ($marcas)
         ORDER BY p.Orden ASC"
    );
    $stmt->bind_param(str_repeat('i', count($ids)), ...$ids);
    $stmt->execute();
    $res = $stmt->get_result();
    while ($r = $res->fetch_assoc()) {
        $inscripciones[(int) $r['CampaniaInscripcionId']]['respuestas'][] = [
            'pregunta' => $r['PreguntaTexto'],
            'respuesta' => $r['OpcionTexto'] ?? $r['RespuestaTexto'],
        ];
    }
    $stmt->close();
}

$lista = array_values($inscripciones);
$contar = static fn(string $estado): int => count(array_filter($lista, fn($i) => $i['estado'] === $estado));

$confirmadas = $contar('confirmada');
$cupo = $campania['CupoMaximo'] !== null ? (int) $campania['CupoMaximo'] : null;

json_success([
    'campania' => [
        'campaniaId' => (int) $campania['CampaniaId'],
        'titulo' => $campania['Titulo'],
        'tipo' => $campania['Tipo'],
        'fechaDesde' => $campania['FechaDesde'],
        'fechaHasta' => $campania['FechaHasta'],
        'mensajeAviso' => $campania['MensajeAviso'],
        'cupoMaximo' => $cupo,
        'bajaLimiteHoras' => $campania['BajaLimiteHoras'] !== null ? (int) $campania['BajaLimiteHoras'] : null,
        'requiereInscripcion' => (bool) $campania['RequiereInscripcion'],
    ],
    'resumen' => [
        'confirmadas' => $confirmadas,
        'listaEspera' => $contar('lista_espera'),
        'ausentes' => $contar('ausente'),
        'canceladas' => $contar('cancelada'),
        'cupoMaximo' => $cupo,
        // Null cuando el cupo es ilimitado: mostrar "quedan ∞" no aporta.
        'lugaresLibres' => $cupo !== null ? max(0, $cupo - $confirmadas) : null,
    ],
    'preguntas' => rh_campania_preguntas($conn, $campaniaId),
    'inscripciones' => $lista,
]);
