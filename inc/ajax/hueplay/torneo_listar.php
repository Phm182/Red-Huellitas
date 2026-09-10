<?php
/** Mis torneos: en inscripción, en curso y terminados. */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';
require_once __DIR__ . '/../../funciones/torneo.php';

$userId = rh_require_auth($conn);

$stmt = $conn->prepare(
    "SELECT t.* FROM Torneo t
       INNER JOIN TorneoParticipante tp ON tp.TorneoId = t.TorneoId
      WHERE tp.UserId = ? AND t.Estado <> 'cancelado'
      ORDER BY FIELD(t.Estado, 'en_curso', 'inscripcion', 'terminado'), t.CreatedAt DESC
      LIMIT 60"
);
$stmt->bind_param('i', $userId);
$stmt->execute();
$rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt->close();

$inscripcion = [];
$enCurso = [];
$terminados = [];
foreach ($rows as $t) {
    $ser = rh_torneo_serializar($conn, $t, $userId);
    if ($t['Estado'] === 'inscripcion') {
        $inscripcion[] = $ser;
    } elseif ($t['Estado'] === 'terminado') {
        $terminados[] = $ser;
    } else {
        $enCurso[] = $ser;
    }
}

json_success(['inscripcion' => $inscripcion, 'enCurso' => $enCurso, 'terminados' => $terminados]);
