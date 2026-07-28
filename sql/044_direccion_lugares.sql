-- ============================================================
-- Dirección exacta para los lugares con puerta a la calle
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/044_direccion_lugares.sql
-- ============================================================

-- ------------------------------------------------------------
-- Hasta ahora sólo existía `ZonaDescripcion`, que es el barrio
-- ("Palermo"). Sirve para filtrar y para las publicaciones de
-- personas, donde la dirección justamente NO se publica.
--
-- Pero en una veterinaria, un refugio o una campaña, la calle y
-- el número son el dato que la gente necesita para llegar. Va en
-- una columna aparte y no reusando ZonaDescripcion porque los dos
-- se muestran juntos y significan cosas distintas.
--
-- Nullable: no todos los cargan, y una campaña en una plaza puede
-- no tener dirección postal.
-- ------------------------------------------------------------

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Veterinaria' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Veterinaria ADD COLUMN Direccion VARCHAR(200) NULL AFTER Horario',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN Direccion VARCHAR(200) NULL AFTER ZonaDescripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Los refugios son usuarios (TipoUsuario = 'refugio'), no tienen
-- tabla propia, así que la dirección va en Usuario.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Usuario ADD COLUMN Direccion VARCHAR(200) NULL AFTER ZonaDescripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
