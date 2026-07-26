-- ============================================================
-- Historias: velocidad de reproducción (cámara lenta / rápida)
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Velocidad, igual que el recorte: no se toca el archivo.
--
-- En TikTok la velocidad se elige ANTES de grabar y queda
-- horneada en el video. Acá se guarda el factor y el reproductor
-- lo aplica, que para el que mira es idéntico: grabar 10s a 2x
-- se ve en 5s igual que si se hubiera re-encodeado. La ventaja
-- es que no hace falta build nativo (ver 023 y el porqué de
-- ffmpeg-kit), y que el autor puede cambiar de idea en el editor
-- sin volver a grabar.
--
-- 0.50 = cámara lenta, 1.00 = normal, 2.00 = cámara rápida.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'VelocidadReproduccion');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN VelocidadReproduccion DECIMAL(3,2) NOT NULL DEFAULT 1.00 AFTER SinAudio',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
