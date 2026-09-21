-- ============================================================
-- Publicaciones: elegir si el mapa muestra la ubicación EXACTA o APROXIMADA
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/073_ubicacion_exacta.sql
-- ============================================================

-- ------------------------------------------------------------
-- Hasta ahora todas las publicaciones de personas salían en el mapa
-- corridas hasta ~500 m (rh_geo_difuminar), sin opción. Ahora quien
-- publica elige: 0 = aproximada (lo de siempre, y el default para
-- lo ya cargado), 1 = exacta (el pin va en el punto exacto).
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Adopcion' AND COLUMN_NAME = 'UbicacionExacta');
SET @sql = IF(@c = 0,
    'ALTER TABLE Adopcion ADD COLUMN UbicacionExacta TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND COLUMN_NAME = 'UbicacionExacta');
SET @sql = IF(@c = 0,
    'ALTER TABLE Transito ADD COLUMN UbicacionExacta TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Perdido' AND COLUMN_NAME = 'UbicacionExacta');
SET @sql = IF(@c = 0,
    'ALTER TABLE Perdido ADD COLUMN UbicacionExacta TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND COLUMN_NAME = 'UbicacionExacta');
SET @sql = IF(@c = 0,
    'ALTER TABLE Donacion ADD COLUMN UbicacionExacta TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Producto' AND COLUMN_NAME = 'UbicacionExacta');
SET @sql = IF(@c = 0,
    'ALTER TABLE Producto ADD COLUMN UbicacionExacta TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
