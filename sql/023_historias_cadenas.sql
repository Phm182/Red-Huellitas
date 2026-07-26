-- ============================================================
-- Historias: Cadenas, recorte de video e interactivos
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Recorte no destructivo + silenciado.
--
-- No se re-encodea el video: se guarda el tramo elegido y el
-- reproductor arranca y corta ahí. ffmpeg-kit-react-native fue
-- retirado y las alternativas exigen build nativo, que rompería
-- la verificación en browser. Para algo que vence a las 24hs no
-- vale la pena: el archivo pesa igual pero la historia dura lo
-- que el usuario eligió.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'RecorteInicioSeg');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN RecorteInicioSeg DECIMAL(6,2) NULL AFTER DuracionSegundos',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'RecorteFinSeg');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN RecorteFinSeg DECIMAL(6,2) NULL AFTER RecorteInicioSeg',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'SinAudio');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN SinAudio TINYINT(1) NOT NULL DEFAULT 0 AFTER RecorteFinSeg',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Cadena
--
-- Alguien propone un tema ("Chapuzón") y sube su historia; el
-- resto la continúa con la suya. Es lo que diferencia esto de
-- Instagram, donde cada historia es una isla.
--
-- LA CADENA NO EXPIRA aunque sus historias sí (vencen a las
-- 24hs como cualquier otra). Si la cadena muriera con su primera
-- historia nadie llegaría a sumarse, y el feature no tendría
-- sentido. Queda viva mostrando las historias vigentes que
-- tenga, y una cadena sin historias vigentes puede reactivarse
-- — así "Chapuzón" puede volver cada verano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Cadena (
    CadenaId       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    CreadorUserId  INT UNSIGNED NOT NULL,
    Tema           VARCHAR(60) NOT NULL,
    Descripcion    VARCHAR(200) NULL,
    Estado         CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Cadena_Creador (CreadorUserId),
    KEY IX_Cadena_Estado (Estado, CadenaId),
    CONSTRAINT FK_Cadena_Usuario FOREIGN KEY (CreadorUserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se llena al publicar una historia en la cadena. La PK compuesta
-- hace que sumarse dos veces no duplique: se es participante o no.
CREATE TABLE IF NOT EXISTS CadenaParticipante (
    CadenaId   INT UNSIGNED NOT NULL,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CadenaId, UserId),
    KEY IX_CadenaParticipante_User (UserId),
    CONSTRAINT FK_CadenaParticipante_Cadena FOREIGN KEY (CadenaId) REFERENCES Cadena(CadenaId),
    CONSTRAINT FK_CadenaParticipante_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CadenaInvitacion (
    CadenaId          INT UNSIGNED NOT NULL,
    UserId            INT UNSIGNED NOT NULL,
    InvitadoPorUserId INT UNSIGNED NOT NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CadenaId, UserId),
    CONSTRAINT FK_CadenaInvitacion_Cadena FOREIGN KEY (CadenaId) REFERENCES Cadena(CadenaId),
    CONSTRAINT FK_CadenaInvitacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'CadenaId');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN CadenaId INT UNSIGNED NULL AFTER SinAudio, ADD KEY IX_Historia_Cadena (CadenaId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Stickers interactivos: encuesta y caja de preguntas.
--
-- La POSICIÓN del sticker vive en Historia.OverlayJson (junto al
-- texto y el dibujo); acá van sólo los datos y los votos, que
-- necesitan integridad y consultas propias.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS HistoriaEncuesta (
    EncuestaId  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    Pregunta    VARCHAR(120) NOT NULL,
    OpcionA     VARCHAR(40) NOT NULL,
    OpcionB     VARCHAR(40) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaEncuesta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaEncuesta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PK compuesta: un voto por usuario. Cambiar de opción actualiza
-- la fila, no agrega otra.
CREATE TABLE IF NOT EXISTS HistoriaEncuestaVoto (
    EncuestaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Opcion      CHAR(1) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (EncuestaId, UserId),
    CONSTRAINT FK_HistoriaEncuestaVoto_Encuesta FOREIGN KEY (EncuestaId) REFERENCES HistoriaEncuesta(EncuestaId),
    CONSTRAINT FK_HistoriaEncuestaVoto_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS HistoriaPregunta (
    PreguntaId  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    Texto       VARCHAR(120) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaPregunta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaPregunta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS HistoriaPreguntaRespuesta (
    RespuestaId INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    PreguntaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(300) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaPreguntaRespuesta_Pregunta (PreguntaId),
    CONSTRAINT FK_HPR_Pregunta FOREIGN KEY (PreguntaId) REFERENCES HistoriaPregunta(PreguntaId),
    CONSTRAINT FK_HPR_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Responder directo al autor de una historia.
CREATE TABLE IF NOT EXISTS HistoriaRespuesta (
    RespuestaId INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(500) NOT NULL,
    LeidaEn     DATETIME NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaRespuesta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaRespuesta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId),
    CONSTRAINT FK_HistoriaRespuesta_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La lista de espectadores ordena por más reciente primero.
SET @ix_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HistoriaVista' AND INDEX_NAME = 'IX_HistoriaVista_Historia_Fecha');
SET @sql = IF(@ix_exists = 0,
    'CREATE INDEX IX_HistoriaVista_Historia_Fecha ON HistoriaVista (HistoriaId, CreatedAt)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
