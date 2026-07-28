-- Fix acentos en planes HuePlus (corrige ?? por SOURCE mal codificado en Windows)
-- Ejecutar con cliente UTF-8: mysql --default-character-set=utf8mb4 -u root huellitas < sql/033_fix_hueplus_acentos.sql

SET NAMES utf8mb4;

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus',
    Descripcion = 'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.'
WHERE Codigo = 'hue_plus';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'
WHERE Codigo IN ('hue_plus_comercial', 'vitrina_comercial');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial')
  AND (i.Texto LIKE 'Sin retenci%' OR i.Texto LIKE '%comisi%venta%');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus en tu perfil'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Crear tu mascota real con IA'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Acceso anticipado a novedades de la comunidad'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Todo lo incluido en HuePlus'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus Comercial (distinta)'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Vitrina destacada en la tienda'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 4;
