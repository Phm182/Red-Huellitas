-- Red Huellitas — HuePlus + HuePlus Comercial (catálogo editable)
-- mysql -u root huellitas < sql/031_hueplus_planes.sql
-- Idempotente.

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Columnas nuevas en SuscripcionPlan
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Descripcion'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Descripcion TEXT NULL AFTER Nombre',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Orden'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Orden INT NOT NULL DEFAULT 0 AFTER MontoMensual',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'SinComision'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN SinComision TINYINT(1) NOT NULL DEFAULT 0 AFTER Orden',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Ítems de beneficios por plan (editables desde admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SuscripcionPlanItem (
    ItemId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PlanId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(220) NOT NULL,
    Orden       INT NOT NULL DEFAULT 0,
    Estado      CHAR(1) NOT NULL DEFAULT 'A',
    KEY IX_PlanItem_Plan (PlanId),
    CONSTRAINT FK_PlanItem_Plan FOREIGN KEY (PlanId) REFERENCES SuscripcionPlan(PlanId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar plan legado → HuePlus Comercial
UPDATE SuscripcionPlan
SET Codigo = 'hue_plus_comercial',
    Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
    MontoMensual = GREATEST(MontoMensual, 8000.00),
    Orden = 2,
    SinComision = 1,
    Estado = 'A'
WHERE Codigo = 'vitrina_comercial';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = COALESCE(Descripcion, 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'),
    Orden = 2,
    SinComision = 1
WHERE Codigo = 'hue_plus_comercial';

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus',
       'HuePlus',
       'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.',
       3500.00,
       1,
       0,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus');

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus_comercial',
       'HuePlus Comercial',
       'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
       8000.00,
       2,
       1,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus_comercial');

-- Ítems HuePlus (sólo si el plan no tiene ninguno)
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Insignia HuePlus en tu perfil' AS Texto
    UNION ALL SELECT 2, 'Crear tu mascota real con IA'
    UNION ALL SELECT 3, 'Acceso anticipado a novedades de la comunidad'
) v
WHERE p.Codigo = 'hue_plus'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);

-- Ítems HuePlus Comercial
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Todo lo incluido en HuePlus' AS Texto
    UNION ALL SELECT 2, 'Insignia HuePlus Comercial (distinta)'
    UNION ALL SELECT 3, 'Sin retención por comisión de venta, vendas lo que vendas'
    UNION ALL SELECT 4, 'Vitrina destacada en la tienda'
) v
WHERE p.Codigo = 'hue_plus_comercial'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);
