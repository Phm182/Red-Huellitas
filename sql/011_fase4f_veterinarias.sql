-- Red Huellitas — Fase 4f: Veterinarias Cercanas
-- mysql -u root huellitas < sql/011_fase4f_veterinarias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Veterinaria (directorio público simple, sin cuenta propia de la veterinaria)
-- ============================================================
CREATE TABLE IF NOT EXISTS Veterinaria (
    VeterinariaId     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Nombre            VARCHAR(150) NOT NULL,
    Descripcion       TEXT NULL,
    Telefono          VARCHAR(30) NULL,
    WhatsappNumero    VARCHAR(30) NULL,
    Horario           VARCHAR(150) NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Veterinaria_User (UserId),
    KEY IX_Veterinaria_Estado (Estado),
    CONSTRAINT FK_Veterinaria_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VeterinariaFoto (galería propia, siempre opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS VeterinariaFoto (
    VeterinariaFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    VeterinariaId     INT UNSIGNED NOT NULL,
    Path              VARCHAR(255) NOT NULL,
    Orden             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_VeterinariaFoto_Veterinaria (VeterinariaId),
    CONSTRAINT FK_VeterinariaFoto_Veterinaria FOREIGN KEY (VeterinariaId) REFERENCES Veterinaria(VeterinariaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.VeterinariaId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId/TransitoId/DonacionId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'VeterinariaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN VeterinariaId INT UNSIGNED NULL AFTER DonacionId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Veterinaria'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Veterinaria (VeterinariaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Veterinaria'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Veterinaria FOREIGN KEY (VeterinariaId) REFERENCES Veterinaria(VeterinariaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
