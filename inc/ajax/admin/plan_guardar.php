<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

rh_require_admin($conn);

$planId = (int) ($_POST['planId'] ?? 0);
$codigo = trim((string) ($_POST['codigo'] ?? ''));
$nombre = trim((string) ($_POST['nombre'] ?? ''));
$descripcion = trim((string) ($_POST['descripcion'] ?? ''));
$montoMensual = (float) ($_POST['montoMensual'] ?? 0);
$orden = (int) ($_POST['orden'] ?? 0);
$sinComision = !empty($_POST['sinComision']) && $_POST['sinComision'] !== '0' ? 1 : 0;
$estado = ($_POST['estado'] ?? 'A') === 'I' ? 'I' : 'A';
$itemsRaw = $_POST['items'] ?? '[]';

if ($nombre === '' || $montoMensual <= 0) {
    json_error('Nombre y monto mensual son obligatorios');
}

if ($planId <= 0) {
    if ($codigo === '' || !preg_match('/^[a-z0-9_]{3,40}$/', $codigo)) {
        json_error('Código inválido (minúsculas, números y _)');
    }
    $stmt = $conn->prepare(
        'INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->bind_param('sssdiss', $codigo, $nombre, $descripcion, $montoMensual, $orden, $sinComision, $estado);
    if (!$stmt->execute()) {
        $stmt->close();
        json_error('No se pudo crear el plan (¿código duplicado?)', 400);
    }
    $planId = (int) $stmt->insert_id;
    $stmt->close();
} else {
    $stmt = $conn->prepare(
        'UPDATE SuscripcionPlan
         SET Nombre = ?, Descripcion = ?, MontoMensual = ?, Orden = ?, SinComision = ?, Estado = ?
         WHERE PlanId = ?'
    );
    $stmt->bind_param('ssdiisi', $nombre, $descripcion, $montoMensual, $orden, $sinComision, $estado, $planId);
    $stmt->execute();
    $stmt->close();
}

$items = json_decode(is_string($itemsRaw) ? $itemsRaw : '[]', true);
if (!is_array($items)) {
    $items = [];
}

$conn->query('DELETE FROM SuscripcionPlanItem WHERE PlanId = ' . (int) $planId);
$stmtItem = $conn->prepare(
    'INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado) VALUES (?, ?, ?, ?)'
);
$ordenItem = 0;
foreach ($items as $item) {
    $texto = trim((string) (is_array($item) ? ($item['texto'] ?? $item['Texto'] ?? '') : $item));
    if ($texto === '') {
        continue;
    }
    $ordenItem++;
    $estadoItem = 'A';
    $stmtItem->bind_param('isis', $planId, $texto, $ordenItem, $estadoItem);
    $stmtItem->execute();
}
$stmtItem->close();

$stmt = $conn->prepare('SELECT * FROM SuscripcionPlan WHERE PlanId = ?');
$stmt->bind_param('i', $planId);
$stmt->execute();
$plan = $stmt->get_result()->fetch_assoc();
$stmt->close();

$out = rh_plan_publico($conn, $plan, false);
$out['items'] = rh_plan_items($conn, $planId, false);

json_success(['plan' => $out], 'Plan guardado');
