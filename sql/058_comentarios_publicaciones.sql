-- ============================================================
-- Comentarios en publicaciones (Post): hilo plano, público, con
-- soft-delete individual. Sin respuestas anidadas.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/058_comentarios_publicaciones.sql
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS Comentario (
    ComentarioId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    PostId       INT UNSIGNED NOT NULL,
    UserId       INT UNSIGNED NOT NULL,
    Texto        VARCHAR(500) NOT NULL,
    Estado       CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ComentarioId),
    KEY idx_post (PostId, ComentarioId),
    KEY idx_user (UserId),
    CONSTRAINT fk_comentario_post FOREIGN KEY (PostId) REFERENCES Post(PostId) ON DELETE CASCADE,
    CONSTRAINT fk_comentario_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Denuncia.ComentarioId: mismo patrón guardado que PostId/HistoriaId/.../
-- ProductoId, para poder denunciar un comentario individual. Sin AFTER
-- explícito (mismo criterio que EquipoId/CalificacionId en 045_equipos.sql,
-- las últimas 2 columnas *Id agregadas) -- evita depender del orden actual.
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'ComentarioId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN ComentarioId INT UNSIGNED NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Comentario'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Comentario (ComentarioId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Comentario'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Comentario FOREIGN KEY (ComentarioId) REFERENCES Comentario(ComentarioId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
