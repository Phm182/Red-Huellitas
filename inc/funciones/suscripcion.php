<?php
/**
 * Helpers de Suscripción HuePlus / HuePlus Comercial.
 */

function rh_plan_items(mysqli $conn, int $planId, bool $soloActivos = true): array
{
    $sql = 'SELECT ItemId, Texto, Orden, Estado FROM SuscripcionPlanItem WHERE PlanId = ?';
    if ($soloActivos) {
        $sql .= " AND Estado = 'A'";
    }
    $sql .= ' ORDER BY Orden ASC, ItemId ASC';
    $stmt = $conn->prepare($sql);
    $stmt->bind_param('i', $planId);
    $stmt->execute();
    $result = $stmt->get_result();
    $items = [];
    while ($row = $result->fetch_assoc()) {
        $items[] = [
            'itemId' => (int) $row['ItemId'],
            'texto' => $row['Texto'],
            'orden' => (int) $row['Orden'],
            'estado' => $row['Estado'],
        ];
    }
    $stmt->close();
    return $items;
}

function rh_plan_publico(mysqli $conn, array $plan, bool $conItems = true): array
{
    $out = [
        'planId' => (int) $plan['PlanId'],
        'codigo' => $plan['Codigo'],
        'nombre' => $plan['Nombre'],
        'descripcion' => $plan['Descripcion'] ?? null,
        'montoMensual' => (float) $plan['MontoMensual'],
        'orden' => (int) ($plan['Orden'] ?? 0),
        'sinComision' => (bool) ($plan['SinComision'] ?? 0),
        'estado' => $plan['Estado'] ?? 'A',
    ];
    if ($conItems) {
        $out['items'] = rh_plan_items($conn, (int) $plan['PlanId'], true);
    }
    return $out;
}

function rh_planes_activos(mysqli $conn): array
{
    $result = $conn->query(
        "SELECT * FROM SuscripcionPlan WHERE Estado = 'A' ORDER BY Orden ASC, PlanId ASC"
    );
    $planes = [];
    while ($row = $result->fetch_assoc()) {
        $planes[] = rh_plan_publico($conn, $row, true);
    }
    return $planes;
}

function rh_suscripcion_publica(mysqli $conn, array $usuario): array
{
    $planId = $usuario['SuscripcionPlanId'] !== null ? (int) $usuario['SuscripcionPlanId'] : 0;
    $plan = null;
    if ($planId > 0) {
        $stmt = $conn->prepare('SELECT * FROM SuscripcionPlan WHERE PlanId = ?');
        $stmt->bind_param('i', $planId);
        $stmt->execute();
        $plan = $stmt->get_result()->fetch_assoc();
        $stmt->close();
    }

    $pagaHasta = $usuario['SuscripcionPagaHasta'] ?? null;
    $activa = $pagaHasta !== null && strtotime($pagaHasta) >= strtotime(date('Y-m-d'));

    return [
        'planCodigo' => $plan['Codigo'] ?? null,
        'planNombre' => $plan['Nombre'] ?? null,
        'sinComision' => $activa && !empty($plan['SinComision']),
        'activa' => $activa,
        'pagaHasta' => $pagaHasta,
        'metodoActivo' => $usuario['SuscripcionMetodoActivo'] ?? null,
        'ultimoPago' => $usuario['SuscripcionUltimoPago'] ?? null,
    ];
}

function rh_usuario_tiene_suscripcion_activa(mysqli $conn, int $userId): bool
{
    $stmt = $conn->prepare('SELECT SuscripcionPagaHasta FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row['SuscripcionPagaHasta'] === null) {
        return false;
    }
    return strtotime($row['SuscripcionPagaHasta']) >= strtotime(date('Y-m-d'));
}

/**
 * True sólo con suscripción activa en un plan marcado SinComision
 * (HuePlus Comercial). HuePlus base sigue pagando la retención de tienda.
 */
function rh_usuario_sin_comision(mysqli $conn, int $userId): bool
{
    $stmt = $conn->prepare(
        'SELECT u.SuscripcionPagaHasta, p.SinComision
         FROM Usuario u
         LEFT JOIN SuscripcionPlan p ON p.PlanId = u.SuscripcionPlanId
         WHERE u.UserId = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row['SuscripcionPagaHasta'] === null) {
        return false;
    }
    if (strtotime($row['SuscripcionPagaHasta']) < strtotime(date('Y-m-d'))) {
        return false;
    }
    return !empty($row['SinComision']);
}

/**
 * Código del plan activo del usuario, o null.
 */
function rh_usuario_plan_codigo_activo(mysqli $conn, int $userId): ?string
{
    $stmt = $conn->prepare(
        'SELECT u.SuscripcionPagaHasta, p.Codigo
         FROM Usuario u
         LEFT JOIN SuscripcionPlan p ON p.PlanId = u.SuscripcionPlanId
         WHERE u.UserId = ?'
    );
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$row || $row['SuscripcionPagaHasta'] === null) {
        return null;
    }
    if (strtotime($row['SuscripcionPagaHasta']) < strtotime(date('Y-m-d'))) {
        return null;
    }
    return $row['Codigo'] ?? null;
}

/**
 * Aplica un pago confirmado (manual o Mercado Pago) a la suscripción de un
 * usuario: extiende PeriodoHasta a partir del vencimiento vigente (si todavía
 * no venció) o desde hoy (si venció o nunca pagó), actualiza Usuario y deja
 * constancia en SuscripcionPago. Idempotente respecto de $mpPaymentId.
 */
function rh_suscripcion_aplicar_pago(
    mysqli $conn,
    int $userId,
    int $planId,
    string $origen,
    float $monto,
    ?string $mpPaymentId,
    int $meses = 1
): void {
    if ($mpPaymentId !== null) {
        $stmt = $conn->prepare('SELECT PagoId FROM SuscripcionPago WHERE MpPaymentId = ?');
        $stmt->bind_param('s', $mpPaymentId);
        $stmt->execute();
        $yaAplicado = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if ($yaAplicado) {
            return;
        }
    }

    $stmt = $conn->prepare('SELECT SuscripcionPagaHasta FROM Usuario WHERE UserId = ?');
    $stmt->bind_param('i', $userId);
    $stmt->execute();
    $usuario = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $hoy = date('Y-m-d');
    $pagaHastaActual = $usuario['SuscripcionPagaHasta'] ?? null;
    $desde = ($pagaHastaActual !== null && strtotime($pagaHastaActual) >= strtotime($hoy))
        ? date('Y-m-d', strtotime($pagaHastaActual . ' +1 day'))
        : $hoy;
    $hasta = date('Y-m-d', strtotime($desde . " +$meses months"));

    $stmt = $conn->prepare(
        'UPDATE Usuario SET SuscripcionPlanId = ?, SuscripcionPagaHasta = ?, SuscripcionUltimoPago = NOW(), SuscripcionMetodoActivo = ? WHERE UserId = ?'
    );
    $stmt->bind_param('issi', $planId, $hasta, $origen, $userId);
    $stmt->execute();
    $stmt->close();

    $stmt = $conn->prepare(
        'INSERT INTO SuscripcionPago (UserId, PlanId, Origen, MpPaymentId, MontoPagado, PeriodoDesde, PeriodoHasta)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('iissdss', $userId, $planId, $origen, $mpPaymentId, $monto, $desde, $hasta);
    $stmt->execute();
    $stmt->close();
}
