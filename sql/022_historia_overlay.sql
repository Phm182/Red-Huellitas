-- Overlay de editor de historias (filtros / texto / dibujo) renderizado en el visor.
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'OverlayJson'
);
SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN OverlayJson TEXT NULL AFTER DuracionSegundos',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
