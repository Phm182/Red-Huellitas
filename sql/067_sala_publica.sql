-- ============================================================
-- Salas abiertas: una sala puede ser PÚBLICA (aparece en el visualizador de
-- salas y cualquiera con cupo libre se suma sin código) o privada (sólo por
-- invitación puntual o con el código compartible, como venía siendo).
--
-- `EsPublica` default 1: crear una sala la hace visible salvo que quien la
-- arma la marque como privada.
-- ============================================================

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'EsPublica') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN EsPublica TINYINT(1) NOT NULL DEFAULT 1 AFTER CodigoInvitacion',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Índice para el listado de salas abiertas (estado + pública), que corre en
-- cada apertura del visualizador.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND INDEX_NAME = 'idx_sala_abiertas') = 0,
    'ALTER TABLE JuegoSala ADD INDEX idx_sala_abiertas (Estado, EsPublica)',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
