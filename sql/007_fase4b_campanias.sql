-- Red Huellitas — Fase 4b: Campañas (castración/vacunación territorial)
-- mysql -u root huellitas < sql/007_fase4b_campanias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Campania
-- ============================================================
CREATE TABLE IF NOT EXISTS Campania (
    CampaniaId          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId              INT UNSIGNED NOT NULL,
    Tipo                ENUM('castracion','vacunacion') NOT NULL,
    Titulo              VARCHAR(150) NOT NULL,
    Descripcion         TEXT NULL,
    FechaDesde          DATE NOT NULL,
    FechaHasta          DATE NULL,
    ZonaDescripcion     VARCHAR(150) NOT NULL,
    ZonaLat             DECIMAL(10,7) NOT NULL,
    ZonaLng             DECIMAL(10,7) NOT NULL,
    RequiereInscripcion TINYINT(1) NOT NULL DEFAULT 0,
    CupoMaximo          INT UNSIGNED NULL,
    Estado              CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Campania_User (UserId),
    KEY IX_Campania_Estado (Estado),
    KEY IX_Campania_Tipo (Tipo),
    KEY IX_Campania_Fecha (FechaDesde),
    CONSTRAINT FK_Campania_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CampaniaInscripcion (RSVP simple, sin preguntas dinámicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS CampaniaInscripcion (
    CampaniaInscripcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaId            INT UNSIGNED NOT NULL,
    UserId                INT UNSIGNED NOT NULL,
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_CampaniaInscripcion (CampaniaId, UserId),
    KEY IX_CampaniaInscripcion_Campania (CampaniaId),
    CONSTRAINT FK_CampaniaInscripcion_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId),
    CONSTRAINT FK_CampaniaInscripcion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.ExpoPushToken (ALTER guardado) — un solo device por cuenta (MVP)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'ExpoPushToken'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN ExpoPushToken VARCHAR(255) NULL AFTER TipoUsuarioId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Denuncia.CampaniaId (mismo patrón guardado que PostId/HistoriaId/AdopcionId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'CampaniaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN CampaniaId INT UNSIGNED NULL AFTER AdopcionId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Campania'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Campania (CampaniaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Campania'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
