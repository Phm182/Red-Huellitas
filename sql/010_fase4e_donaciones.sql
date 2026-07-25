-- Red Huellitas — Fase 4e: Donaciones (necesito / ofrezco alimento o insumos)
-- mysql -u root huellitas < sql/010_fase4e_donaciones.sql

SET NAMES utf8mb4;

-- ============================================================
-- Donacion (necesita alimento/insumos / ofrece alimento/insumos)
-- ============================================================
CREATE TABLE IF NOT EXISTS Donacion (
    DonacionId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Tipo              ENUM('necesito','ofrezco') NOT NULL,
    Categoria         ENUM('alimento','insumo') NOT NULL,
    Descripcion       TEXT NOT NULL,
    Especie           ENUM('perro','gato','otro') NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Donacion_User (UserId),
    KEY IX_Donacion_Estado (Estado),
    KEY IX_Donacion_Tipo (Tipo),
    KEY IX_Donacion_Categoria (Categoria),
    CONSTRAINT FK_Donacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DonacionFoto (galería propia, siempre opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS DonacionFoto (
    DonacionFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    DonacionId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_DonacionFoto_Donacion (DonacionId),
    CONSTRAINT FK_DonacionFoto_Donacion FOREIGN KEY (DonacionId) REFERENCES Donacion(DonacionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.DonacionId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId/TransitoId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'DonacionId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN DonacionId INT UNSIGNED NULL AFTER TransitoId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Donacion'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Donacion (DonacionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Donacion'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Donacion FOREIGN KEY (DonacionId) REFERENCES Donacion(DonacionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
