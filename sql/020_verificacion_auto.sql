-- ============================================================
-- Verificación automática (Gemini + opcional Renaper/SID facial)
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/020_verificacion_auto.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué esto está guardado columna por columna.
--
-- Estas 8 columnas nacieron acá, pero después `001_fase1_schema`
-- se editó y las incluyó en su CREATE TABLE. Resultado: en una
-- base nueva 001 ya las crea y este archivo fallaba con
-- "Duplicate column name 'AutoScore'", cortando la instalación
-- desde cero por la mitad.
--
-- No alcanza con borrar este archivo: las bases creadas ANTES de
-- aquella edición de 001 no tienen las columnas y necesitan este
-- ALTER. Guardando cada una, el archivo sirve para los dos casos
-- y no molesta en ninguno.
-- ------------------------------------------------------------

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoScore');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoScore DECIMAL(4,3) NULL AFTER MotivoRechazo', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'FaceMatchScore');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN FaceMatchScore DECIMAL(4,3) NULL AFTER AutoScore', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoMetodo');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoMetodo VARCHAR(40) NULL AFTER FaceMatchScore', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoDetalle');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoDetalle TEXT NULL AFTER AutoMetodo', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'DniNumeroExtraido');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN DniNumeroExtraido VARCHAR(20) NULL AFTER AutoDetalle', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'NombreExtraido');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN NombreExtraido VARCHAR(150) NULL AFTER DniNumeroExtraido', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'KycExternoId');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN KycExternoId VARCHAR(100) NULL AFTER NombreExtraido', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'KycEstado');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN KycEstado VARCHAR(40) NULL AFTER KycExternoId', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
