-- ============================================================
-- HueSoccer: color de ficha elegible (antes era fijo por jugador, rosa el
-- retador y azul el retado, sin poder elegirlo). Mismo criterio que
-- 056_hueplay_soccer_skins.sql: preferencia de cuenta fija en Usuario, no
-- por partida.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/057_hueplay_soccer_color_ficha.sql
-- ============================================================

SET NAMES utf8mb4;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'HueSoccerColorFicha') = 0,
    "ALTER TABLE Usuario ADD COLUMN HueSoccerColorFicha VARCHAR(20) NOT NULL DEFAULT 'rojo'",
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
