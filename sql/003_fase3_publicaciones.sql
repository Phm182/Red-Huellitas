-- Red Huellitas — Fase 3a: Publicaciones (Módulo Social — Feed)
-- mysql -u root huellitas < sql/003_fase3_publicaciones.sql

SET NAMES utf8mb4;

-- ============================================================
-- Post
-- ============================================================
CREATE TABLE IF NOT EXISTS Post (
    PostId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId        INT UNSIGNED NOT NULL,
    Texto         TEXT NULL,
    Estado        CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Post_User (UserId),
    KEY IX_Post_Estado (Estado),
    KEY IX_Post_CreatedAt (CreatedAt),
    CONSTRAINT FK_Post_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PostFoto (galería, máx 6 fotos enforced en PHP)
-- ============================================================
CREATE TABLE IF NOT EXISTS PostFoto (
    PostFotoId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PostId        INT UNSIGNED NOT NULL,
    Path          VARCHAR(255) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_PostFoto_Post (PostId),
    CONSTRAINT FK_PostFoto_Post FOREIGN KEY (PostId) REFERENCES Post(PostId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PostReaccion (Like / Me divierte — una sola reacción por usuario y post)
-- ============================================================
CREATE TABLE IF NOT EXISTS PostReaccion (
    PostReaccionId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PostId          INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    Tipo            ENUM('like','me_divierte') NOT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_PostReaccion_User (PostId, UserId),
    KEY IX_PostReaccion_Post (PostId),
    CONSTRAINT FK_PostReaccion_Post FOREIGN KEY (PostId) REFERENCES Post(PostId),
    CONSTRAINT FK_PostReaccion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Conecta Denuncia.PostId (reservado desde Fase 1, siempre NULL hasta ahora)
-- ============================================================
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Post'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Post (PostId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Post'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Post FOREIGN KEY (PostId) REFERENCES Post(PostId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
