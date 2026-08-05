<?php
/**
 * Rechazar un desafío.
 *
 * Sólo lo puede rechazar el retado y sólo si todavía no jugó: una vez que
 * jugaste, el duelo sigue su curso. Aceptar no tiene endpoint propio porque
 * jugar YA es aceptar; un botón de "aceptar" separado sería un paso de más
 * antes de lo único que importa, que es entrar al tablero.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/juegos.php';

$userId = rh_require_auth($conn);

$desafioId = (int) ($_POST['desafioId'] ?? 0);
if ($desafioId <= 0) {
    json_error('Falta desafioId');
}

$stmt = $conn->prepare('SELECT * FROM JuegoDesafio WHERE DesafioId = ?');
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$d = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$d) {
    json_error('El desafío no existe', 404);
}
if ((int) $d['UserIdRetado'] !== $userId) {
    json_error('No podés rechazar este desafío', 403);
}
if (!in_array($d['Estado'], ['pendiente', 'aceptado'], true)) {
    json_error('Este desafío ya está cerrado', 409);
}
// "Ya empezaste" se mide distinto según el modo: en 'puntaje' es haber mandado
// tu puntaje, y en 'turnos' es que ya haya fichas en el tablero. Sin esta
// segunda rama se podría abandonar un Conecta 4 yendo perdiendo.
$empezado = $d['Modo'] === 'turnos'
    ? (int) $d['Movimientos'] > 0
    : $d['PuntosRetado'] !== null;

if ($empezado) {
    json_error('Ya empezaste este duelo', 409);
}

$stmt = $conn->prepare("UPDATE JuegoDesafio SET Estado = 'rechazado' WHERE DesafioId = ?");
$stmt->bind_param('i', $desafioId);
$stmt->execute();
$stmt->close();

json_success(['desafioId' => $desafioId, 'estado' => 'rechazado']);
