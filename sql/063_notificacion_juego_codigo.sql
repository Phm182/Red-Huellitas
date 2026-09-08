-- ============================================================
-- Para poder mostrar el ícono del juego correspondiente en la campanita de
-- notificaciones (antes todas las de juego mostraban el mismo ícono
-- genérico de "control remoto", sin decir de qué juego se trataba).
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/063_notificacion_juego_codigo.sql
-- ============================================================

SET NAMES utf8mb4;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Notificacion' AND COLUMN_NAME = 'JuegoCodigo') = 0,
    'ALTER TABLE Notificacion ADD COLUMN JuegoCodigo VARCHAR(32) NULL AFTER MascotaId',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
