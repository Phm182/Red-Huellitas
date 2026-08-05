-- ============================================================
-- Stickers propios en el chat + reacciones rápidas en Huellitas
-- Idempotente: se puede correr más de una vez sin error.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/047_chat_stickers.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Mensaje.Tipo suma 'sticker'.
--
-- El sticker viaja como un mensaje más (queda en el historial, cuenta como no
-- leído, respeta el candado de menores) pero la app lo dibuja sin burbuja.
-- Es la misma decisión que ya se había tomado con 'zumbido'.
--
-- En Texto se guarda el ID del sticker, no una URL: los dibujos son nuestros y
-- viven en el bundle de la app. Guardar una URL ataría los mensajes viejos a
-- una ruta que puede cambiar, y obligaría a bajar una imagen para algo que ya
-- está instalado.
-- ------------------------------------------------------------
SET @sql = (SELECT IF(
    (SELECT LOCATE('sticker', COLUMN_TYPE) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mensaje' AND COLUMN_NAME = 'Tipo') = 0,
    'ALTER TABLE Mensaje MODIFY Tipo ENUM(''texto'',''zumbido'',''sticker'') NOT NULL DEFAULT ''texto''',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ------------------------------------------------------------
-- Reacciones rápidas a una Huellita.
--
-- Una fila por (Historia, Usuario): tocar otra reacción reemplaza la anterior
-- en vez de acumular, que es como se comportan las reacciones en el resto de
-- la app. Por eso la PK es compuesta y no un id propio.
--
-- Es distinto de HistoriaRespuesta, que es un mensaje escrito: esto es un
-- toque y no abre conversación.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS HistoriaReaccion (
    HistoriaId INT UNSIGNED NOT NULL,
    UserId INT UNSIGNED NOT NULL,
    Tipo ENUM('huella','amor','divertido','asombro','triste','abrazo','guau','michi') NOT NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (HistoriaId, UserId),
    KEY idx_historia_tipo (HistoriaId, Tipo),
    CONSTRAINT fk_hr_historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId) ON DELETE CASCADE,
    CONSTRAINT fk_hr_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
