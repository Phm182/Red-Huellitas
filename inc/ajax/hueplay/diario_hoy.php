<?php
/**
 * Los retos de hoy, todos juntos.
 *
 * Devuelve un reto por juego con la semilla del día y —si ya jugaste— tu
 * puntaje y tu puesto. Viene todo en una sola llamada porque la pantalla los
 * muestra como una lista para elegir: pedirlos de a uno serían tres viajes para
 * pintar una sola pantalla.
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/diario.php';

$userId = rh_require_auth($conn);

$retos = [];
foreach (rh_diario_juegos() as $codigo) {
    $reto = rh_diario_obtener($conn, $codigo);
    if (!$reto) {
        continue;
    }

    $mio = rh_diario_mi_resultado($conn, $reto['diarioId'], $userId);
    $reto['jugado'] = $mio !== null;
    $reto['miPuntaje'] = $mio['puntos'] ?? null;
    $reto['miPuesto'] = $mio ? rh_diario_mi_puesto($conn, $reto['diarioId'], $userId) : null;
    $reto['participantes'] = rh_diario_participantes($conn, $reto['diarioId']);

    // La semilla sólo viaja si todavía no jugaste. No es por secreto —el
    // tablero se ve apenas empezás— sino para que el cliente no pueda
    // "practicar" el tablero del día sin registrar el intento y mandar recién
    // el mejor de varios.
    if ($reto['jugado']) {
        unset($reto['semilla']);
    }

    $retos[] = $reto;
}

$stmt = $conn->prepare('SELECT RachaDiaria, UltimoDiario FROM UsuarioJuegoPerfil WHERE UserId = ?');
$stmt->bind_param('i', $userId);
$stmt->execute();
$perfil = $stmt->get_result()->fetch_assoc();
$stmt->close();

$hoy = rh_diario_hoy();
$ayer = date('Y-m-d', strtotime($hoy . ' -1 day'));
$ultimo = $perfil['UltimoDiario'] ?? null;

json_success([
    'fecha' => $hoy,
    'retos' => $retos,
    // La racha se muestra en cero si se cortó: guardarla es útil para el
    // historial, pero anunciar "racha de 9" a alguien que faltó tres días sería
    // mentirle.
    'racha' => ($ultimo === $hoy || $ultimo === $ayer) ? (int) ($perfil['RachaDiaria'] ?? 0) : 0,
]);
