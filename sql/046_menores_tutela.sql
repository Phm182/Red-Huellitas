-- ============================================================
-- Seguridad infantil: edad, tutela y autorización de chats
-- Idempotente: se puede correr más de una vez sin error.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/046_menores_tutela.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Fecha de nacimiento del usuario.
--
-- Se guarda la FECHA y no la edad: una edad en TINYINT queda
-- vieja sola con el paso del tiempo, y alguien que hoy tiene 12
-- mañana tiene 13 sin que nadie toque nada. Arranca NULL porque
-- las cuentas que ya existen no la declararon nunca.
--
-- OJO: en `rh_es_menor()` un NULL se trata como MENOR, no como
-- adulto. Si el dato falta, la opción segura es restringir.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'FechaNacimiento');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN FechaNacimiento DATE NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Quién cargó la fecha: el propio usuario o su tutor. Sirve para
-- auditar y para no dejar que un menor se "corrija" la edad solo
-- si fue un adulto el que la declaró.
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'EdadOrigen');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN EdadOrigen ENUM(''autodeclarada'',''tutor'') NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Índice para poder listar menores sin tutor desde moderación.
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_Nacimiento');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Usuario ADD INDEX IX_Usuario_Nacimiento (FechaNacimiento)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Tutela: vínculo entre un menor y un adulto responsable.
--
-- `IniciadaPor` existe porque la puede arrancar cualquiera de los
-- dos lados, y quien la inicia NO es quien la acepta: el otro
-- tiene que confirmar. Sin ese dato no se sabe a quién mostrarle
-- el botón de aceptar.
--
-- Las rechazadas y revocadas se conservan en vez de borrarse,
-- para que quede el rastro de que el vínculo existió.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Tutela (
    TutelaId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    UserIdMenor INT UNSIGNED NOT NULL,
    UserIdTutor INT UNSIGNED NOT NULL,
    Estado ENUM('pendiente','aceptada','rechazada','revocada') NOT NULL DEFAULT 'pendiente',
    IniciadaPor ENUM('menor','tutor') NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltaEn DATETIME NULL,
    PRIMARY KEY (TutelaId),
    UNIQUE KEY UQ_Tutela_Par (UserIdMenor, UserIdTutor),
    KEY IX_Tutela_Menor (UserIdMenor, Estado),
    KEY IX_Tutela_Tutor (UserIdTutor, Estado),
    CONSTRAINT fk_tutela_menor FOREIGN KEY (UserIdMenor) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_tutela_tutor FOREIGN KEY (UserIdTutor) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Autorización por conversación.
--
-- Una fila por cada conversación en la que participa un menor.
-- El tutor la pasa a 'autorizada' o 'bloqueada'; mientras esté
-- 'pendiente' el chat no deja mandar nada.
--
-- La PK es (ConversacionId, UserIdMenor) y no incluye al tutor:
-- si el menor cambia de tutor, la decisión sigue siendo sobre la
-- misma conversación, y el tutor nuevo la revisa. Guardamos
-- UserIdTutor igual para saber quién resolvió.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ConversacionAutorizacion (
    ConversacionId INT UNSIGNED NOT NULL,
    UserIdMenor INT UNSIGNED NOT NULL,
    UserIdTutor INT UNSIGNED NULL,
    Estado ENUM('pendiente','autorizada','bloqueada') NOT NULL DEFAULT 'pendiente',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltaEn DATETIME NULL,
    PRIMARY KEY (ConversacionId, UserIdMenor),
    KEY IX_ConvAut_Tutor (UserIdTutor, Estado),
    KEY IX_ConvAut_Menor (UserIdMenor, Estado),
    CONSTRAINT fk_convaut_conv FOREIGN KEY (ConversacionId) REFERENCES Conversacion(ConversacionId) ON DELETE CASCADE,
    CONSTRAINT fk_convaut_menor FOREIGN KEY (UserIdMenor) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_convaut_tutor FOREIGN KEY (UserIdTutor) REFERENCES Usuario(UserId) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
