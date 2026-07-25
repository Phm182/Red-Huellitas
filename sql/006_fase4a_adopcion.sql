-- Red Huellitas — Fase 4a: Adopción (formulario dinámico + postulaciones + favoritos)
-- mysql -u root huellitas < sql/006_fase4a_adopcion.sql

SET NAMES utf8mb4;

-- ============================================================
-- Adopcion (listado de un animal en adopción)
-- ============================================================
CREATE TABLE IF NOT EXISTS Adopcion (
    AdopcionId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    Nombre           VARCHAR(60) NOT NULL,
    Sexo             ENUM('macho','hembra') NOT NULL,
    EdadAnios        TINYINT UNSIGNED NULL,
    EdadMeses        TINYINT UNSIGNED NULL,
    Especie          ENUM('perro','gato','otro') NOT NULL,
    RazaId           INT UNSIGNED NULL,
    RazaTexto        VARCHAR(60) NULL,
    Descripcion      TEXT NULL,
    EstadoAdopcion   ENUM('disponible','en_proceso','adoptado') NOT NULL DEFAULT 'disponible',
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Adopcion_User (UserId),
    KEY IX_Adopcion_Estado (Estado),
    KEY IX_Adopcion_EstadoAdopcion (EstadoAdopcion),
    CONSTRAINT FK_Adopcion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Adopcion_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionFoto (galería, máx 6 fotos enforced en PHP)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionFoto (
    AdopcionFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionFoto_Adopcion (AdopcionId),
    CONSTRAINT FK_AdopcionFoto_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPregunta (formulario dinámico armado por el rescatista)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPregunta (
    AdopcionPreguntaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId         INT UNSIGNED NOT NULL,
    Tipo               ENUM('texto','si_no','opcion_multiple') NOT NULL,
    Texto              VARCHAR(255) NOT NULL,
    Orden              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionPregunta_Adopcion (AdopcionId),
    CONSTRAINT FK_AdopcionPregunta_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPreguntaOpcion (solo para Tipo='opcion_multiple')
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPreguntaOpcion (
    AdopcionPreguntaOpcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionPreguntaId       INT UNSIGNED NOT NULL,
    Texto                    VARCHAR(150) NOT NULL,
    Orden                    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionPreguntaOpcion_Pregunta (AdopcionPreguntaId),
    CONSTRAINT FK_AdopcionPreguntaOpcion_Pregunta FOREIGN KEY (AdopcionPreguntaId) REFERENCES AdopcionPregunta(AdopcionPreguntaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPostulacion (un adoptante se postula a un listado — una vez)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPostulacion (
    AdopcionPostulacionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId            INT UNSIGNED NOT NULL,
    UserId                INT UNSIGNED NOT NULL,
    EstadoRevision        VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_AdopcionPostulacion (AdopcionId, UserId),
    KEY IX_AdopcionPostulacion_Adopcion (AdopcionId),
    KEY IX_AdopcionPostulacion_User (UserId),
    CONSTRAINT FK_AdopcionPostulacion_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId),
    CONSTRAINT FK_AdopcionPostulacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionRespuesta (respuestas del adoptante a cada pregunta del listado)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionRespuesta (
    AdopcionRespuestaId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionPostulacionId    INT UNSIGNED NOT NULL,
    AdopcionPreguntaId       INT UNSIGNED NOT NULL,
    RespuestaTexto           TEXT NULL,
    AdopcionPreguntaOpcionId INT UNSIGNED NULL,
    KEY IX_AdopcionRespuesta_Postulacion (AdopcionPostulacionId),
    CONSTRAINT FK_AdopcionRespuesta_Postulacion FOREIGN KEY (AdopcionPostulacionId) REFERENCES AdopcionPostulacion(AdopcionPostulacionId),
    CONSTRAINT FK_AdopcionRespuesta_Pregunta FOREIGN KEY (AdopcionPreguntaId) REFERENCES AdopcionPregunta(AdopcionPreguntaId),
    CONSTRAINT FK_AdopcionRespuesta_Opcion FOREIGN KEY (AdopcionPreguntaOpcionId) REFERENCES AdopcionPreguntaOpcion(AdopcionPreguntaOpcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionFavorito (corazón — guardar un listado)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionFavorito (
    AdopcionFavoritoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId         INT UNSIGNED NOT NULL,
    UserId             INT UNSIGNED NOT NULL,
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_AdopcionFavorito (AdopcionId, UserId),
    CONSTRAINT FK_AdopcionFavorito_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId),
    CONSTRAINT FK_AdopcionFavorito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.AdopcionId (mismo patrón guardado que Denuncia.HistoriaId en 005)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'AdopcionId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN AdopcionId INT UNSIGNED NULL AFTER HistoriaId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Adopcion'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Adopcion (AdopcionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Adopcion'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
