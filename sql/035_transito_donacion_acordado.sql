-- ============================================================
-- Tránsito y Donaciones: estado del trato ("acordado")
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/035_transito_donacion_acordado.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué hace falta una columna nueva y no alcanzaba con algo
-- que ya estaba.
--
-- El resto de los módulos puede bloquear la edición porque tiene
-- de dónde deducir que hay otra persona involucrada: Adopción
-- mira las postulaciones, Perdidos mira si ya se reencontró.
-- Tránsito y Donaciones no tenían ninguna señal: el acuerdo se
-- arregla por WhatsApp o por chat y en la base no queda rastro.
-- Sólo existía Estado A/I, que es "publicada / dada de baja".
--
-- Deducirlo de "alguien abrió una conversación" sería peor que
-- no bloquear nada: congelaría una publicación por una simple
-- consulta, y preguntar es justamente lo que uno quiere que
-- pase seguido.
--
-- Así que el estado lo marca el dueño a mano, y es reversible:
-- si el acuerdo se cae, vuelve a 'disponible' y la publicación
-- se puede volver a editar. Mismo criterio que Adopción, donde
-- cancelar la última postulación devuelve la edición.
-- ------------------------------------------------------------

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND COLUMN_NAME = 'EstadoTransito');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Transito ADD COLUMN EstadoTransito ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER DuracionDias",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND COLUMN_NAME = 'EstadoDonacion');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Donacion ADD COLUMN EstadoDonacion ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER Especie",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Índices: los listados filtran por estado para poder mostrar
-- primero lo que todavía está disponible.
-- ------------------------------------------------------------
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND INDEX_NAME = 'IX_Transito_EstadoTransito');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Transito_EstadoTransito ON Transito (EstadoTransito, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND INDEX_NAME = 'IX_Donacion_EstadoDonacion');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Donacion_EstadoDonacion ON Donacion (EstadoDonacion, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
