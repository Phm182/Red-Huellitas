-- ============================================================
-- Chat: respuestas y reacciones a una historia, dentro de la conversación
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/074_chat_historias.sql
-- ============================================================

-- ------------------------------------------------------------
-- Cuando alguien responde o reacciona a una historia, el mensaje entra a la
-- charla con el autor mostrando la miniatura de esa historia, para que la
-- interacción se pueda seguir desde el chat.
--
--   Tipo 'historia'           -> respuesta de texto (Texto = lo que escribió)
--   Tipo 'historia_reaccion'  -> reacción        (Texto = clave de la reacción)
--   HistoriaId / HistoriaMediaPath -> a qué historia se refiere, y su miniatura
--     (se guarda la ruta: la historia vence a las 24 hs pero el mensaje queda).
-- ------------------------------------------------------------
SET @tiene = (SELECT LOCATE('historia_reaccion', COLUMN_TYPE) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mensaje' AND COLUMN_NAME = 'Tipo');
SET @sql = IF(@tiene = 0,
    'ALTER TABLE Mensaje MODIFY Tipo ENUM(''texto'',''zumbido'',''sticker'',''historia'',''historia_reaccion'') NOT NULL DEFAULT ''texto''',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mensaje' AND COLUMN_NAME = 'HistoriaId');
SET @sql = IF(@c = 0,
    'ALTER TABLE Mensaje ADD COLUMN HistoriaId INT UNSIGNED NULL AFTER Tipo',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mensaje' AND COLUMN_NAME = 'HistoriaMediaPath');
SET @sql = IF(@c = 0,
    'ALTER TABLE Mensaje ADD COLUMN HistoriaMediaPath VARCHAR(255) NULL AFTER HistoriaId',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
