-- ============================================================
-- HuePlay: plazo de turno en minutos, no sólo en horas cerradas
-- Idempotente con el patrón information_schema + PREPARE de sql/049.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/054_hueplay_plazo_minutos.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- `PlazoTurnoHoras` sólo admitía horas enteras (1/6/12/24): no había forma de
-- armar una partida rápida de "3 minutos" ni una lenta de varios días sin
-- desbordar el rango pensado para horas. Se pasa la unidad a MINUTOS
-- (`PlazoTurnoMinutos`) en las dos tablas que la usan — JuegoDesafio (duelos
-- 1 contra 1) y JuegoSala (salas de hasta 4) — así una sola columna cubre
-- desde "3 min" hasta "7 días" (10080 min, entra sobrado en SMALLINT
-- UNSIGNED, tope 65535 = ~45 días).
--
-- La conversión (`* 60`) es sólo sobre el VALOR DE CONFIGURACIÓN que se usa
-- para calcular el próximo vencimiento la próxima vez que alguien mueva —
-- no toca `ExpiraEn`/`TurnoVenceEn`, que ya están calculados y no dependen
-- de esta columna después de fijados. Ninguna partida en curso cambia de
-- plazo real por migrar esto.
-- ------------------------------------------------------------

-- --- JuegoDesafio ---------------------------------------------------------
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoMinutos') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN PlazoTurnoMinutos SMALLINT UNSIGNED NULL AFTER PlazoTurnoHoras',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoHoras') > 0,
    'UPDATE JuegoDesafio SET PlazoTurnoMinutos = PlazoTurnoHoras * 60 WHERE PlazoTurnoMinutos IS NULL',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoMinutos'
        AND IS_NULLABLE = 'YES') > 0,
    'ALTER TABLE JuegoDesafio MODIFY COLUMN PlazoTurnoMinutos SMALLINT UNSIGNED NOT NULL DEFAULT 1440',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoHoras') > 0,
    'ALTER TABLE JuegoDesafio DROP COLUMN PlazoTurnoHoras',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- --- JuegoSala --------------------------------------------------------
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoMinutos') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN PlazoTurnoMinutos SMALLINT UNSIGNED NULL AFTER PlazoTurnoHoras',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoHoras') > 0,
    'UPDATE JuegoSala SET PlazoTurnoMinutos = PlazoTurnoHoras * 60 WHERE PlazoTurnoMinutos IS NULL',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoMinutos'
        AND IS_NULLABLE = 'YES') > 0,
    'ALTER TABLE JuegoSala MODIFY COLUMN PlazoTurnoMinutos SMALLINT UNSIGNED NOT NULL DEFAULT 1440',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoHoras') > 0,
    'ALTER TABLE JuegoSala DROP COLUMN PlazoTurnoHoras',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
