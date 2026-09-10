-- ============================================================
-- Plazo por turno en SEGUNDOS (antes minutos).
--
-- Para poder ofrecer partidas casi en tiempo real (30 seg / 1 min por
-- jugada) el plazo por turno pasa de minutos enteros a segundos. Se renombra
-- la columna en las tres tablas que lo usan y se multiplican ×60 los valores
-- existentes. La columna se ensancha a INT: 7 días = 604800 seg no entra en
-- SMALLINT.
--
-- `Torneo.PlazoRondaMinutos` y `JuegoSala.PlazoPartidaMinutos` siguen en
-- minutos (granularidad de decenas de minutos, no hace falta segundos).
--
-- Idempotente: cada bloque migra sólo si todavía existe la columna vieja y
-- no la nueva. Si la tabla no existe (Torneo antes de 070), los dos COUNT
-- dan 0 y no hace nada.
-- ============================================================

-- ---- JuegoDesafio ----
SET @mig := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoMinutos') = 1
    AND (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoSegundos') = 0,
    1, 0));
SET @sql := IF(@mig = 1,
    'ALTER TABLE JuegoDesafio CHANGE COLUMN PlazoTurnoMinutos PlazoTurnoSegundos INT UNSIGNED NOT NULL DEFAULT 86400',
    'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
SET @sql := IF(@mig = 1, 'UPDATE JuegoDesafio SET PlazoTurnoSegundos = PlazoTurnoSegundos * 60', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ---- JuegoSala ----
SET @mig := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoMinutos') = 1
    AND (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoTurnoSegundos') = 0,
    1, 0));
SET @sql := IF(@mig = 1,
    'ALTER TABLE JuegoSala CHANGE COLUMN PlazoTurnoMinutos PlazoTurnoSegundos INT UNSIGNED NOT NULL DEFAULT 86400',
    'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
SET @sql := IF(@mig = 1, 'UPDATE JuegoSala SET PlazoTurnoSegundos = PlazoTurnoSegundos * 60', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- ---- Torneo ----
SET @mig := (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Torneo' AND COLUMN_NAME = 'PlazoTurnoMinutos') = 1
    AND (SELECT COUNT(*) FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Torneo' AND COLUMN_NAME = 'PlazoTurnoSegundos') = 0,
    1, 0));
SET @sql := IF(@mig = 1,
    'ALTER TABLE Torneo CHANGE COLUMN PlazoTurnoMinutos PlazoTurnoSegundos INT UNSIGNED NOT NULL DEFAULT 86400',
    'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
SET @sql := IF(@mig = 1, 'UPDATE Torneo SET PlazoTurnoSegundos = PlazoTurnoSegundos * 60', 'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
