<?php
/**
 * Presupuesto de cargas de Mapbox.
 *
 * Mapbox factura por "map load" (cada vez que el navegador instancia un mapa).
 * El plan gratuito da 50.000 al mes; pasado eso empieza a cobrar. Acá se lleva
 * la cuenta y se corta antes de llegar.
 *
 * La regla de oro: **el token sólo sale de acá si además se pudo reservar el
 * cupo.** No se entrega y después se cuenta, porque si algo falla en el medio
 * quedaría una carga sin registrar y el contador iría siempre por detrás de la
 * realidad. Primero se reserva, y sólo si la reserva salió bien se devuelve el
 * token.
 *
 * Cuando no hay cupo no se rompe nada: se responde `maplibre`, que es el fork
 * libre de Mapbox, sin cuota ni cuenta. El usuario ve el mapa igual.
 */

function rh_mapa_config(): array
{
    $ruta = __DIR__ . '/../config/mapa.local.php';
    $base = [
        'MAPBOX_TOKEN' => '',
        'LIMITE_MENSUAL_GLOBAL' => 45000,
        'LIMITE_DIARIO_USUARIO' => 60,
        'MAPBOX_ESTILO_OSCURO' => 'mapbox://styles/mapbox/dark-v11',
        'MAPBOX_ESTILO_CLARO' => 'mapbox://styles/mapbox/light-v11',
    ];
    return is_file($ruta) ? array_merge($base, require $ruta) : $base;
}

/**
 * Intenta reservar una carga de mapa para este usuario.
 *
 * Devuelve true sólo si quedaba cupo mensual global Y diario del usuario.
 *
 * El descuento se hace con un UPDATE condicional (`WHERE Cargas < limite`) en
 * vez de leer-y-después-escribir. Con dos usuarios entrando a la vez, leer
 * primero haría que ambos vean "quedan 1" y ambos se lo lleven, pasándose del
 * tope. Con el UPDATE condicional el que pierde recibe 0 filas afectadas y se
 * va a MapLibre, que es exactamente lo que se quiere.
 */
function rh_mapa_reservar_carga(mysqli $conn, int $userId, array $cfg): bool
{
    $periodo = date('Y-m');
    $hoy = date('Y-m-d');

    // --- Cupo diario del usuario ---
    $stmt = $conn->prepare(
        'INSERT INTO MapaCargaUsuarioDia (UserId, Dia, Cargas) VALUES (?, ?, 0)
         ON DUPLICATE KEY UPDATE UserId = UserId'
    );
    // Sin migración 038 el prepare falla: no romper el mapa, caer a MapLibre.
    if (!$stmt) {
        return false;
    }
    $stmt->bind_param('is', $userId, $hoy);
    $stmt->execute();
    $stmt->close();

    $limiteDia = (int) $cfg['LIMITE_DIARIO_USUARIO'];
    $stmt = $conn->prepare(
        'UPDATE MapaCargaUsuarioDia SET Cargas = Cargas + 1
         WHERE UserId = ? AND Dia = ? AND Cargas < ?'
    );
    $stmt->bind_param('isi', $userId, $hoy, $limiteDia);
    $stmt->execute();
    $tomoDiario = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$tomoDiario) {
        return false;
    }

    // --- Cupo mensual global ---
    $stmt = $conn->prepare(
        'INSERT INTO MapaCargaMes (Periodo, Cargas) VALUES (?, 0)
         ON DUPLICATE KEY UPDATE Periodo = Periodo'
    );
    $stmt->bind_param('s', $periodo);
    $stmt->execute();
    $stmt->close();

    $limiteMes = (int) $cfg['LIMITE_MENSUAL_GLOBAL'];
    $stmt = $conn->prepare(
        'UPDATE MapaCargaMes SET Cargas = Cargas + 1 WHERE Periodo = ? AND Cargas < ?'
    );
    $stmt->bind_param('si', $periodo, $limiteMes);
    $stmt->execute();
    $tomoMensual = $stmt->affected_rows > 0;
    $stmt->close();

    if (!$tomoMensual) {
        // Devolver el cupo diario: no se usó ninguna carga de Mapbox, así que
        // descontárselo al usuario sería cobrarle algo que no consumió.
        $stmt = $conn->prepare(
            'UPDATE MapaCargaUsuarioDia SET Cargas = Cargas - 1
             WHERE UserId = ? AND Dia = ? AND Cargas > 0'
        );
        $stmt->bind_param('is', $userId, $hoy);
        $stmt->execute();
        $stmt->close();
        return false;
    }

    return true;
}

/** Cuánto se lleva consumido, para mostrarlo y para el panel de admin. */
function rh_mapa_consumo(mysqli $conn, int $userId): array
{
    $periodo = date('Y-m');
    $hoy = date('Y-m-d');
    $mes = 0;
    $dia = 0;

    $stmt = $conn->prepare('SELECT Cargas FROM MapaCargaMes WHERE Periodo = ?');
    if ($stmt) {
        $stmt->bind_param('s', $periodo);
        $stmt->execute();
        $mes = (int) ($stmt->get_result()->fetch_row()[0] ?? 0);
        $stmt->close();
    }

    $stmt = $conn->prepare('SELECT Cargas FROM MapaCargaUsuarioDia WHERE UserId = ? AND Dia = ?');
    if ($stmt) {
        $stmt->bind_param('is', $userId, $hoy);
        $stmt->execute();
        $dia = (int) ($stmt->get_result()->fetch_row()[0] ?? 0);
        $stmt->close();
    }

    return ['mes' => $mes, 'diaUsuario' => $dia];
}
