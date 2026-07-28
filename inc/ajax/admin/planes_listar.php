<?php
require_once __DIR__ . '/../../funciones/bd.php';
require_once __DIR__ . '/../../funciones/respuesta.php';
require_once __DIR__ . '/../../funciones/auth.php';
require_once __DIR__ . '/../../funciones/suscripcion.php';

rh_require_admin($conn);

$result = $conn->query('SELECT * FROM SuscripcionPlan ORDER BY Orden ASC, PlanId ASC');
$planes = [];
while ($row = $result->fetch_assoc()) {
    $plan = rh_plan_publico($conn, $row, false);
    $plan['items'] = rh_plan_items($conn, (int) $row['PlanId'], false);
    $planes[] = $plan;
}

json_success(['planes' => $planes]);
