<?php
/**
 * Helpers de Suscripción "Vitrina Comercial" compartidos por el flujo manual
 * y el de Mercado Pago (inc/ajax/suscripcion/*).
 */

function rh_suscripcion_publica(mysqli $conn, array $usuario): array
{
    $stmt = $conn->prepare('SELECT Codigo FROM SuscripcionPlan WHERE PlanId = ?');
    $planId = $usuario['SuscripcionPlanId'] !== null ? (int) $usuario['SuscripcionPlanId'] : 0;
    $stmt->bind_param('i', $planId);
    $stmt->execute();
    $plan = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    $pagaHasta = $usuario['SuscripcionPagaHasta'] ?? null;
    $activa = $pagaHasta !== null && strtotime($pagaHasta) >= strtotime(date('Y-m-d'));

    return [
        'planCodigo' => $plan['Codigo'] ?? null,
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
 * Aplica un pago confirmado (manual o Mercado Pago) a la suscripción de un
 * usuario: extiende PeriodoHasta a partir del vencimiento vigente (si todavía
 * no venció) o desde hoy (si venció o nunca pagó), actualiza Usuario y deja
 * constancia en SuscripcionPago. Idempotente respecto de $mpPaymentId
 * (notificaciones duplicadas de Mercado Pago no generan un segundo período).
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
