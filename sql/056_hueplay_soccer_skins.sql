-- ============================================================
-- HueSoccer: preferencia fija de skin (fichas/pelota) por usuario.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/056_hueplay_soccer_skins.sql
-- ============================================================

SET NAMES utf8mb4;

-- Mismo precedente que WhatsappVisibilidad: una preferencia de cuenta fija,
-- no por partida (decisión de producto ya cerrada). Se resuelve en
-- Usuario, no en UsuarioJuegoPerfil (esa tabla es de estadísticas puras).
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'HueSoccerSkinFicha') = 0,
    "ALTER TABLE Usuario ADD COLUMN HueSoccerSkinFicha VARCHAR(30) NOT NULL DEFAULT 'clasica'",
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'HueSoccerSkinPelota') = 0,
    "ALTER TABLE Usuario ADD COLUMN HueSoccerSkinPelota VARCHAR(30) NOT NULL DEFAULT 'clasica'",
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
