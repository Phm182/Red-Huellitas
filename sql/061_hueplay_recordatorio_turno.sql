-- ============================================================
-- Recordatorio de "quedan 15 minutos para que venza tu turno".
-- Sin esto la única notificación de turno era al pasar el turno; el pedido
-- fue agregar exactamente UN recordatorio más, cerca del vencimiento, y no
-- ningún otro (nada de avisos repetidos mientras se espera).
--
-- La columna se resetea a 0 en cada `rh_juego_avanzar_turno` (turno nuevo =
-- cuenta regresiva nueva) y el cron `juego_turno_por_vencer.php` la pone en 1
-- apenas manda el aviso, así nunca se manda dos veces para el mismo turno.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/061_hueplay_recordatorio_turno.sql
-- ============================================================

SET NAMES utf8mb4;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'RecordatorioTurnoEnviado') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN RecordatorioTurnoEnviado TINYINT(1) NOT NULL DEFAULT 0 AFTER TurnoDeUserId',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
