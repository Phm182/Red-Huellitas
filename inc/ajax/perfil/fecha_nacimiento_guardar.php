<?php
/**
 * Carga la fecha de nacimiento de una cuenta que todavía no la tiene.
 *
 * Es el backfill de las cuentas creadas antes de que el campo existiera. La
 * app lo llama desde una pantalla bloqueante, porque sin este dato
 * `rh_es_menor()` falla cerrado y la cuenta queda sin poder chatear.
 *
 * Sólo se puede cargar UNA vez: si se pudiera editar libremente, un menor con
 * el chat restringido se pondría 30 años y listo. Para corregir un error de
 * carga tiene que intervenir un admin.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/menores.php';

$userId = rh_require_auth($conn);

$fecha = trim($_POST['fechaNacimiento'] ?? '');

$v = rh_validar_fecha_nacimiento($fecha);
if (!$v['ok']) {
    json_error($v['error']);
}

$stmt = $conn->prepare('SELECT FechaNacimiento FROM Usuario WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$actual = $stmt->get_result()->fetch_assoc();
$stmt->close();

if ($actual && $actual['FechaNacimiento'] !== null) {
    json_error('La fecha de nacimiento ya está cargada. Escribinos si necesitás corregirla.', 409);
}

$stmt = $conn->prepare('UPDATE Usuario SET FechaNacimiento = ? WHERE UserId = ? AND FechaNacimiento IS NULL');
$stmt->bind_param('si', $v['fecha'], $userId);
$stmt->execute();
$stmt->close();

json_success([
    'fechaNacimiento' => $v['fecha'],
    'edad' => $v['edad'],
    'esMenor' => $v['edad'] < RH_EDAD_MENOR,
], 'Fecha de nacimiento guardada');
