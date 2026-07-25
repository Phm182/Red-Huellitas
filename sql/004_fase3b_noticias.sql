-- Red Huellitas — Fase 3b: Noticias
-- mysql -u root huellitas < sql/004_fase3b_noticias.sql

SET NAMES utf8mb4;

-- ============================================================
-- TipoUsuarioCatalogo (Individual, Refugio/Protectora, ampliable después)
-- ============================================================
CREATE TABLE IF NOT EXISTS TipoUsuarioCatalogo (
    TipoUsuarioId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Codigo        VARCHAR(30) NOT NULL,
    Nombre        VARCHAR(60) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY UQ_TipoUsuario_Codigo (Codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO TipoUsuarioCatalogo (Codigo, Nombre, Orden) VALUES
('individual', 'Individual', 1),
('refugio', 'Refugio / Protectora', 2);

-- ============================================================
-- Usuario.TipoUsuarioId (ALTER guardado, backfill a 'individual', FK guardada)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'TipoUsuarioId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN TipoUsuarioId INT UNSIGNED NULL AFTER Rol',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE Usuario
SET TipoUsuarioId = (SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = 'individual')
WHERE TipoUsuarioId IS NULL;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND CONSTRAINT_NAME = 'FK_Usuario_TipoUsuario'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Usuario ADD CONSTRAINT FK_Usuario_TipoUsuario FOREIGN KEY (TipoUsuarioId) REFERENCES TipoUsuarioCatalogo(TipoUsuarioId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_TipoUsuario'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Usuario ADD INDEX IX_Usuario_TipoUsuario (TipoUsuarioId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- NoticiaExterna (agregación de RSS/scraping externo, dedupe por UrlHash)
-- ============================================================
CREATE TABLE IF NOT EXISTS NoticiaExterna (
    NoticiaExternaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Fuente           VARCHAR(40) NOT NULL,
    UrlOriginal      VARCHAR(500) NOT NULL,
    UrlHash          CHAR(64) NOT NULL,
    Titulo           VARCHAR(300) NOT NULL,
    Resumen          TEXT NULL,
    ImagenUrl        VARCHAR(500) NULL,
    PublicadoEn      DATETIME NULL,
    IngestadoEn      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    UNIQUE KEY UQ_NoticiaExterna_UrlHash (UrlHash),
    KEY IX_NoticiaExterna_Fuente (Fuente),
    KEY IX_NoticiaExterna_Publicado (PublicadoEn),
    KEY IX_NoticiaExterna_Estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
