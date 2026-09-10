-- ============================================================
-- Plazo de partida: además del plazo POR TURNO (cuánto tiene el rival para
-- responder cada jugada, ya existente en PlazoTurnoMinutos), un plazo TOTAL
-- para toda la partida. Si nadie ganó cuando llega, el duelo queda en
-- tablas. NULL = sin límite (comportamiento actual).
--
-- En torneos este mismo campo lleva el "plazo por ronda".
-- ============================================================

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PartidaVenceEn') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN PartidaVenceEn DATETIME NULL AFTER ExpiraEn',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND INDEX_NAME = 'idx_partida_vence') = 0,
    'ALTER TABLE JuegoDesafio ADD INDEX idx_partida_vence (Estado, PartidaVenceEn)',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Las salas de duelo 1v1 llevan el plazo de partida elegido al armarlas,
-- para pasárselo al JuegoDesafio que generan al iniciar. 0 = sin límite.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'PlazoPartidaMinutos') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN PlazoPartidaMinutos INT NOT NULL DEFAULT 0 AFTER PlazoTurnoMinutos',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
