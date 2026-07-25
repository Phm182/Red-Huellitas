-- Red Huellitas — Fase 3c: Shorts & Historias
-- mysql -u root huellitas < sql/005_fase3c_shorts_historias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Post.VideoPath / Post.DuracionSegundos (ALTER guardado)
-- Un "Short" = Post WHERE VideoPath IS NOT NULL. Reusa reacciones, follow-
-- gating, denuncia, soft-delete y paginación por cursor ya existentes en Post.
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND COLUMN_NAME = 'VideoPath'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Post ADD COLUMN VideoPath VARCHAR(255) NULL AFTER Texto',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND COLUMN_NAME = 'DuracionSegundos'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Post ADD COLUMN DuracionSegundos SMALLINT UNSIGNED NULL AFTER VideoPath',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MariaDB 10.4.32: sin índice funcional, KEY simple sobre la columna alcanza
-- para el filtro "WHERE VideoPath IS NOT NULL" de shorts_feed.php.
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND INDEX_NAME = 'IX_Post_VideoPath'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Post ADD INDEX IX_Post_VideoPath (VideoPath)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Historia (contenido efímero — ciclo de vida distinto de Post, sin
-- reacciones/comentarios, expira sin necesidad de cron: cada lectura
-- filtra por ExpiraEn > NOW())
-- ============================================================
CREATE TABLE IF NOT EXISTS Historia (
    HistoriaId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    TipoMedia        ENUM('foto','video') NOT NULL,
    MediaPath        VARCHAR(255) NOT NULL,
    DuracionSegundos SMALLINT UNSIGNED NULL,
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiraEn         DATETIME NOT NULL,
    KEY IX_Historia_User (UserId),
    KEY IX_Historia_Expira (ExpiraEn),
    KEY IX_Historia_Estado (Estado),
    CONSTRAINT FK_Historia_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- HistoriaVista (qué usuario ya vio qué historia puntual)
-- ============================================================
CREATE TABLE IF NOT EXISTS HistoriaVista (
    HistoriaVistaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    HistoriaId      INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_HistoriaVista (HistoriaId, UserId),
    CONSTRAINT FK_HistoriaVista_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId),
    CONSTRAINT FK_HistoriaVista_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.HistoriaId (mismo patrón guardado que Denuncia.PostId en 003)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'HistoriaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN HistoriaId INT UNSIGNED NULL AFTER PostId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Historia'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Historia (HistoriaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Historia'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
