-- Red Huellitas — Fase 4c: Perdidos & Reencontrados
-- mysql -u root huellitas < sql/008_fase4c_perdidos.sql

SET NAMES utf8mb4;

-- ============================================================
-- Perdido (reporte de mascota perdida o encontrada)
-- ============================================================
CREATE TABLE IF NOT EXISTS Perdido (
    PerdidoId               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId                  INT UNSIGNED NOT NULL,
    Tipo                    ENUM('perdido','encontrado') NOT NULL,
    MascotaId               INT UNSIGNED NULL,
    Nombre                  VARCHAR(60) NULL,
    Sexo                    ENUM('macho','hembra') NULL,
    Especie                 ENUM('perro','gato','otro') NULL,
    RazaId                  INT UNSIGNED NULL,
    RazaTexto               VARCHAR(60) NULL,
    Descripcion             TEXT NULL,
    UltimoLugarDescripcion  VARCHAR(150) NOT NULL,
    UltimoLugarLat          DECIMAL(10,7) NOT NULL,
    UltimoLugarLng          DECIMAL(10,7) NOT NULL,
    FechaSuceso             DATE NOT NULL,
    EstadoPerdido           ENUM('activo','reencontrado') NOT NULL DEFAULT 'activo',
    Estado                  CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Perdido_User (UserId),
    KEY IX_Perdido_Estado (Estado),
    KEY IX_Perdido_EstadoPerdido (EstadoPerdido),
    KEY IX_Perdido_Tipo (Tipo),
    KEY IX_Perdido_Mascota (MascotaId),
    CONSTRAINT FK_Perdido_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Perdido_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Perdido_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PerdidoFoto (galería propia, solo usada cuando MascotaId IS NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS PerdidoFoto (
    PerdidoFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PerdidoId     INT UNSIGNED NOT NULL,
    Path          VARCHAR(255) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_PerdidoFoto_Perdido (PerdidoId),
    CONSTRAINT FK_PerdidoFoto_Perdido FOREIGN KEY (PerdidoId) REFERENCES Perdido(PerdidoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.NotificarProximidad (ALTER guardado) — opt-out de push por
-- cercanía (Campañas y Perdidos comparten esta preferencia).
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'NotificarProximidad'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN NotificarProximidad TINYINT(1) NOT NULL DEFAULT 1 AFTER ExpoPushToken',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Denuncia.PerdidoId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'PerdidoId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN PerdidoId INT UNSIGNED NULL AFTER CampaniaId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Perdido'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Perdido (PerdidoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Perdido'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Perdido FOREIGN KEY (PerdidoId) REFERENCES Perdido(PerdidoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
