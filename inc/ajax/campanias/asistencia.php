<?php
/**
 * Pasar lista después de la campaña.
 *
 * Distinto del aviso de ausencia (`Estado = 'ausente'`), que lo pone el
 * propio usuario antes: esto lo marca el organizador después, y es lo que
 * distingue "no vino pero avisó" de "no vino y dejó el cupo tirado".
 *
 * Acepta varias inscripciones en un request porque se usa desde una lista:
 * marcar de a una sería un request por persona en una campaña de cincuenta.
 */

require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/equipo.php';
require_once __DIR__ . '/../../funciones/calificacion.php';

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

$organizador = rh_campania_organizador($campania);
$puede = $organizador['tipo'] === 'equipo'
    ? rh_equipo_puede_administrar($conn, $organizador['id'], $userId)
    : $organizador['id'] === $userId;

if (!$puede) {
    json_error('Sólo el organizador puede pasar lista', 403);
}
if (!rh_campania_termino($campania)) {
    // Marcar quién vino antes de que la campaña empiece no significa nada, y
    // deja marcas de ausencia sobre gente que todavía puede aparecer.
    json_error('Vas a poder pasar lista cuando termine la campaña', 409);
}

// Formato: asistencias[<userId>] = 'si' | 'no'
$asistencias = $_POST['asistencias'] ?? [];
if (!is_array($asistencias) || count($asistencias) === 0) {
    json_error('No mandaste ninguna asistencia');
}

$stmt = $conn->prepare(
    "UPDATE CampaniaInscripcion
     SET Asistio = ?, AsistenciaEn = NOW()
     WHERE CampaniaId = ? AND UserId = ? AND Estado IN ('confirmada','ausente')"
);

$actualizadas = 0;
foreach ($asistencias as $uid => $valor) {
    $uid = (int) $uid;
    $valor = is_string($valor) ? trim($valor) : '';

    if ($uid <= 0 || !in_array($valor, ['si', 'no'], true)) {
        continue;
    }

    $stmt->bind_param('sii', $valor, $campaniaId, $uid);
    $stmt->execute();
    $actualizadas += $stmt->affected_rows > 0 ? 1 : 0;
}
$stmt->close();

json_success(['actualizadas' => $actualizadas], 'Lista guardada');
