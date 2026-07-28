-- ============================================================
-- Campañas: inscripción con formulario, cupo y lista de espera
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/043_campanias_inscripcion.sql
-- ============================================================

-- ------------------------------------------------------------
-- Campania: mensaje de aviso y límite para darse de baja.
--
-- `CupoMaximo` NULL ya significaba "sin límite", así que no hace
-- falta un flag aparte: agregarlo daría dos fuentes para el mismo
-- dato y tarde o temprano se contradicen.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'MensajeAviso');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN MensajeAviso TEXT NULL AFTER Descripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Horas antes de FechaDesde hasta las que se admite la baja.
-- NULL = se puede dar de baja siempre.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'BajaLimiteHoras');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN BajaLimiteHoras INT UNSIGNED NULL AFTER CupoMaximo',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- CampaniaInscripcion: estado y posición.
--
-- `Posicion` es el número de orden en que se anotó, y NO se
-- recalcula al cancelar. Si se renumerara, alguien que se anotó
-- primero podría terminar detrás de otro por una baja ajena, y el
-- orden de la lista de espera es justamente lo que hay que poder
-- defender ante un reclamo.
--
-- Las canceladas se conservan (Estado='cancelada') en vez de
-- borrarse: hacen falta para saber quién se dio de baja y cuándo,
-- sobre todo con el aviso de ausencia.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Estado');
SET @sql = IF(@c = 0,
    "ALTER TABLE CampaniaInscripcion ADD COLUMN Estado ENUM('confirmada','lista_espera','cancelada','ausente') NOT NULL DEFAULT 'confirmada' AFTER UserId",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Posicion');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN Posicion INT UNSIGNED NOT NULL DEFAULT 0 AFTER Estado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'CanceladaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN CanceladaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'AvisoAusenciaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN AvisoAusenciaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'NotaAusencia');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN NotaAusencia VARCHAR(255) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND INDEX_NAME = 'IX_CampaniaInscripcion_Orden');
SET @sql = IF(@idx = 0,
    'CREATE INDEX IX_CampaniaInscripcion_Orden ON CampaniaInscripcion (CampaniaId, Estado, Posicion)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Formulario: mismas tres tablas que Adopción, mismos nombres de
-- columna. Un formulario dinámico ya resuelto en este proyecto no
-- se reinventa con otra forma.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CampaniaPregunta (
    CampaniaPreguntaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaId         INT UNSIGNED NOT NULL,
    Tipo               ENUM('texto','si_no','opcion_multiple') NOT NULL DEFAULT 'texto',
    Texto              VARCHAR(255) NOT NULL,
    Obligatoria        TINYINT(1) NOT NULL DEFAULT 1,
    Orden              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPregunta_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId),
    INDEX IX_CampaniaPregunta_Campania (CampaniaId, Orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaPreguntaOpcion (
    CampaniaPreguntaOpcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    Texto                    VARCHAR(150) NOT NULL,
    Orden                    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPreguntaOpcion_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaRespuesta (
    CampaniaRespuestaId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaInscripcionId    INT UNSIGNED NOT NULL,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    RespuestaTexto           TEXT NULL,
    CampaniaPreguntaOpcionId INT UNSIGNED NULL,
    CONSTRAINT FK_CampaniaRespuesta_Inscripcion FOREIGN KEY (CampaniaInscripcionId) REFERENCES CampaniaInscripcion(CampaniaInscripcionId),
    CONSTRAINT FK_CampaniaRespuesta_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId),
    INDEX IX_CampaniaRespuesta_Inscripcion (CampaniaInscripcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
