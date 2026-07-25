<?php
/**
 * Template del comprobante PDF. Se incluye desde rh_comprobante_html() con
 * ob_start(), y espera dos variables en scope:
 *   $datos        — array de rh_comprobante_datos()
 *   $paraVendedor — bool: si true, muestra el desglose de comisión
 *
 * Todo el texto que viene de la DB pasa por htmlspecialchars(): son nombres de
 * producto y de usuario cargados por terceros, y dompdf parsea esto como HTML.
 */

$pedido = $datos['pedido'];
$items = $datos['items'];
$comprador = $datos['comprador'];
$vendedor = $datos['vendedor'];
$logo = rh_comprobante_logo_data_uri();

$e = static fn ($v): string => htmlspecialchars((string) $v, ENT_QUOTES, 'UTF-8');
$money = static fn ($v): string => '$' . number_format((float) $v, 2, ',', '.');

$estadoLabels = [
    'pendiente'   => 'Pendiente de pago',
    'pagado'      => 'Pagado',
    'coordinando' => 'Coordinando pago',
    'entregado'   => 'Entregado',
    'cancelado'   => 'Cancelado',
];
$estadoLabel = $estadoLabels[$pedido['Estado']] ?? $pedido['Estado'];
$metodoLabel = $pedido['MetodoPago'] === 'mercadopago' ? 'Mercado Pago' : 'A coordinar entre las partes';

$totalUnidades = array_sum(array_map(static fn ($i) => (int) $i['cantidad'], $items));
?>
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
    @page { margin: 28px 34px; }
    body { font-family: "DejaVu Sans", sans-serif; font-size: 11px; color: #2A2420; }
    .header { border-bottom: 2px solid #E8873A; padding-bottom: 10px; margin-bottom: 16px; }
    .header td { vertical-align: top; }
    .logo { width: 64px; }
    .marca { font-size: 20px; font-weight: bold; color: #E8873A; }
    .sub { font-size: 10px; color: #7A7168; }
    .numero { font-size: 15px; font-weight: bold; }
    .doc-tipo { font-size: 10px; color: #7A7168; letter-spacing: 1px; }
    .partes { width: 100%; margin-bottom: 16px; }
    .partes td { width: 50%; vertical-align: top; padding-right: 12px; }
    .caja { border: 1px solid #E5DFD6; border-radius: 6px; padding: 9px; }
    .caja-titulo { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #7A7168; margin-bottom: 4px; }
    .nombre { font-weight: bold; font-size: 12px; }
    table.items { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
    table.items th { background: #FAF7F2; border-bottom: 1.5px solid #E8873A; padding: 6px 5px; text-align: left; font-size: 10px; }
    table.items td { border-bottom: 1px solid #E5DFD6; padding: 6px 5px; }
    /* th.num tiene que repetir el selector de tabla: si no, "table.items th"
       le gana por especificidad a ".num" y los encabezados numéricos quedan
       alineados a la izquierda mientras sus valores van a la derecha. */
    .num, table.items th.num { text-align: right; }
    /* Misma nota de especificidad que .num: hay que repetir el selector de
       tabla para que no gane "table.items th { text-align: left }". */
    .center, table.items th.center { text-align: center; }
    table.items tfoot .total-unidades { border-bottom: none; padding-top: 7px; font-weight: bold; }
    .totales { width: 46%; margin-left: 54%; border-collapse: collapse; }
    .totales td { padding: 4px 5px; }
    .totales .etiqueta { color: #7A7168; }
    .totales .total-row td { border-top: 1.5px solid #2A2420; font-weight: bold; font-size: 13px; padding-top: 7px; }
    .totales .comision td { color: #7A7168; font-size: 10px; }
    .estado { margin-bottom: 14px; }
    .badge { display: inline-block; border: 1px solid #E8873A; color: #E8873A; border-radius: 10px; padding: 2px 9px; font-size: 10px; }
    .footer { margin-top: 26px; border-top: 1px solid #E5DFD6; padding-top: 9px; font-size: 9px; color: #7A7168; text-align: center; }
</style>
</head>
<body>

<table class="header" width="100%">
    <tr>
        <td width="70">
            <?php if ($logo !== null): ?><img src="<?= $logo ?>" class="logo" alt=""><?php endif; ?>
        </td>
        <td>
            <div class="marca">Red Huellitas</div>
            <div class="sub">Comprobante de operación</div>
        </td>
        <td align="right">
            <div class="doc-tipo"><?= $paraVendedor ? 'COPIA VENDEDOR' : 'COPIA COMPRADOR' ?></div>
            <div class="numero"><?= $e($datos['numero']) ?></div>
            <div class="sub"><?= $e(date('d/m/Y H:i', strtotime($pedido['CreatedAt']))) ?></div>
        </td>
    </tr>
</table>

<table class="partes">
    <tr>
        <td>
            <div class="caja">
                <div class="caja-titulo">Comprador</div>
                <div class="nombre"><?= $e($comprador['NombreCompleto'] ?? '—') ?></div>
                <?php if (!empty($comprador['Username'])): ?>
                    <div class="sub">@<?= $e($comprador['Username']) ?></div>
                <?php endif; ?>
                <div class="sub"><?= $e($comprador['Email'] ?? '') ?></div>
            </div>
        </td>
        <td>
            <div class="caja">
                <div class="caja-titulo">Vendedor</div>
                <div class="nombre"><?= $e($vendedor['NombreCompleto'] ?? '—') ?></div>
                <?php if (!empty($vendedor['Username'])): ?>
                    <div class="sub">@<?= $e($vendedor['Username']) ?></div>
                <?php endif; ?>
                <div class="sub"><?= $e($vendedor['Email'] ?? '') ?></div>
            </div>
        </td>
    </tr>
</table>

<div class="estado">
    <span class="badge"><?= $e($estadoLabel) ?></span>
    &nbsp;<span class="sub">Forma de pago: <?= $e($metodoLabel) ?></span>
</div>

<table class="items">
    <thead>
        <tr>
            <th>Detalle</th>
            <th class="center" width="60">Cant.</th>
            <th class="num" width="90">Precio unit.</th>
            <th class="num" width="90">Subtotal</th>
        </tr>
    </thead>
    <tbody>
        <?php foreach ($items as $item): ?>
        <tr>
            <td><?= $e($item['nombreProducto']) ?></td>
            <td class="center"><?= (int) $item['cantidad'] ?></td>
            <td class="num"><?= $money($item['precioUnitario']) ?></td>
            <td class="num"><?= $money($item['precioUnitario'] * $item['cantidad']) ?></td>
        </tr>
        <?php endforeach; ?>
    </tbody>
    <tfoot>
        <tr>
            <td class="total-unidades">Total de artículos</td>
            <td class="center total-unidades"><?= $totalUnidades ?></td>
            <td colspan="2"></td>
        </tr>
    </tfoot>
</table>

<table class="totales">
    <tr>
        <td class="etiqueta">Artículos</td>
        <td class="num"><?= $totalUnidades ?> <?= $totalUnidades === 1 ? 'unidad' : 'unidades' ?></td>
    </tr>
    <?php if ($paraVendedor): ?>
        <tr>
            <td class="etiqueta">Total de la venta</td>
            <td class="num"><?= $money($pedido['MontoProductos']) ?></td>
        </tr>
        <tr class="comision">
            <td>Comisión Red Huellitas (<?= (float) $pedido['PorcentajeComision'] ?>%)</td>
            <td class="num">− <?= $money($pedido['MontoComision']) ?></td>
        </tr>
        <tr class="total-row">
            <td>Recibís</td>
            <td class="num"><?= $money($pedido['MontoVendedor']) ?></td>
        </tr>
    <?php else: ?>
        <tr class="total-row">
            <td>Total</td>
            <td class="num"><?= $money($pedido['MontoProductos']) ?></td>
        </tr>
    <?php endif; ?>
</table>

<div class="footer">
    Este comprobante refleja una operación entre usuarios de Red Huellitas.<br>
    No es una factura ni un comprobante fiscal.
</div>

</body>
</html>
