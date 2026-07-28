-- Reintentos de verificación automática (Gemini/IA)
-- mysql --default-character-set=utf8mb4 -u root huellitas < sql/034_verificacion_reintentos.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentoEn DATETIME NULL AFTER KycEstado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentos'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentos INT UNSIGNED NOT NULL DEFAULT 0 AFTER AutoReintentoEn',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND INDEX_NAME = 'IX_Verif_AutoReintento'
);
SET @sql = IF(@idx = 0,
    'ALTER TABLE UsuarioVerificacion ADD KEY IX_Verif_AutoReintento (EstadoRevision, AutoReintentoEn)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
