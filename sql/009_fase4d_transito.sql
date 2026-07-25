-- Red Huellitas — Fase 4d: Tránsito (necesito / ofrezco)
-- mysql -u root huellitas < sql/009_fase4d_transito.sql

SET NAMES utf8mb4;

-- ============================================================
-- Transito (necesita alojamiento temporal / ofrece alojarlo)
-- ============================================================
CREATE TABLE IF NOT EXISTS Transito (
    TransitoId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Tipo              ENUM('necesito','ofrezco') NOT NULL,
    MascotaId         INT UNSIGNED NULL,
    Nombre            VARCHAR(60) NULL,
    Sexo              ENUM('macho','hembra') NULL,
    Especie           ENUM('perro','gato','otro') NULL,
    RazaId            INT UNSIGNED NULL,
    RazaTexto         VARCHAR(60) NULL,
    Descripcion       TEXT NULL,
    DuracionDias      INT UNSIGNED NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Transito_User (UserId),
    KEY IX_Transito_Estado (Estado),
    KEY IX_Transito_Tipo (Tipo),
    KEY IX_Transito_Mascota (MascotaId),
    CONSTRAINT FK_Transito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Transito_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Transito_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TransitoFoto (galería propia, solo usada cuando MascotaId IS NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS TransitoFoto (
    TransitoFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    TransitoId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_TransitoFoto_Transito (TransitoId),
    CONSTRAINT FK_TransitoFoto_Transito FOREIGN KEY (TransitoId) REFERENCES Transito(TransitoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.TransitoId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'TransitoId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN TransitoId INT UNSIGNED NULL AFTER PerdidoId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Transito'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Transito (TransitoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Transito'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Transito FOREIGN KEY (TransitoId) REFERENCES Transito(TransitoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
