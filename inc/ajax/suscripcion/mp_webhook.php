<?php
/**
 * Notificaciones de Mercado Pago (topics 'payment' y 'preapproval'). Endpoint
 * público sin auth de usuario — llamado por Mercado Pago, no por la app.
 * Nunca confía en el payload del POST: siempre re-consulta el recurso real
 * contra la API de MP antes de aplicar nada (mismo criterio que Contapp).
 */
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/mercadopago.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

if (!rh_mp_configurado()) {
    json_success(null, 'Mercado Pago no configurado, notificación ignorada');
}

$topic = $_GET['topic'] ?? $_GET['type'] ?? null;
$id = $_GET['id'] ?? $_GET['data_id'] ?? null;

if ($id === null) {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    $topic = $topic ?? ($body['type'] ?? null);
    $id = $body['data']['id'] ?? null;
}

if ($topic === null || $id === null) {
    json_success(null, 'Notificación sin topic/id, ignorada');
}

try {
    if ($topic === 'payment') {
        // La app "Marketplace" tiene visibilidad de los pagos de sus cuentas
        // conectadas con su propio token, así que esta consulta sirve tanto
        // para pagos de suscripción (Fase 6a) como de Pedido (Fase 6c).
        $resultado = rh_mp_api_request('GET', "/v1/payments/$id");
        $pago = $resultado['data'];
        if (($pago['status'] ?? null) === 'approved') {
            $externalReference = $pago['external_reference'] ?? null;
            $pedidoId = rh_mp_parse_pedido_reference($externalReference);
            if ($pedidoId !== null) {
                $stmt = $conn->prepare("UPDATE Pedido SET Estado = 'pagado', MpPaymentId = ? WHERE PedidoId = ? AND Estado != 'pagado'");
                $mpPaymentId = (string) $id;
                $stmt->bind_param('si', $mpPaymentId, $pedidoId);
                $stmt->execute();
                $stmt->close();
            } else {
                $ref = rh_mp_parse_external_reference($externalReference);
                if ($ref !== null) {
                    rh_suscripcion_aplicar_pago(
                        $conn,
                        $ref['userId'],
                        $ref['planId'],
                        'mercadopago',
                        (float) ($pago['transaction_amount'] ?? 0),
                        (string) $id,
                        1
                    );
                }
            }
        }
    } elseif ($topic === 'preapproval' || $topic === 'subscription_preapproval') {
        rh_mp_procesar_preapproval($conn, (string) $id);
    }
} catch (RuntimeException $e) {
    // No relanzar — Mercado Pago reintenta notificaciones si no responde 200.
    error_log('mp_webhook: ' . $e->getMessage());
}

json_success(null, 'OK');
