-- Banner / foco de recorte en Mis mascotas
-- mysql -u root huellitas < sql/032_mascota_banner.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'ModoBanner'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Mascota ADD COLUMN ModoBanner ENUM('portada','banner') NOT NULL DEFAULT 'portada' AFTER DescripcionTexto",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerPath'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerPath VARCHAR(255) NULL AFTER ModoBanner',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerFocusY'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerFocusY DECIMAL(4,3) NOT NULL DEFAULT 0.500 AFTER BannerPath',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
