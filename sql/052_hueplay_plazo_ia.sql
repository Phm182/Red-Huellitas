-- ============================================================
-- HuePlay: plazo de turno configurable + cuenta de IA del sistema
-- Idempotente con el patrón information_schema + PREPARE de sql/049.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/052_hueplay_plazo_ia.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Hasta ahora un duelo por turnos (HueConecta) vencía a un plazo fijo global
-- (RH_DESAFIO_DIAS = 3 días, igual que en modo 'puntaje'). Se pidió que ese
-- plazo sea configurable por quien arma el duelo, con un tope obligatorio de
-- 24 horas, y que no responder a tiempo sea una DERROTA (no un vencimiento
-- neutro). Esto se agrega para todos los juegos por turnos, HueConecta
-- incluido, no sólo para los nuevos.
--
-- También se agrega la cuenta reservada que va a actuar de rival cuando
-- alguien juega en modo solitario contra la app.
-- ------------------------------------------------------------

-- `EsBot`: marca la cuenta de sistema que hace de rival en el modo solitario.
-- Se agrega en vez de reusar `Rol` (que ya significa "permiso de admin") o
-- `Estado` (que sólo distingue activo/inactivo) para no mezclar dos
-- significados distintos en la misma columna.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'EsBot') = 0,
    'ALTER TABLE Usuario ADD COLUMN EsBot TINYINT(1) NOT NULL DEFAULT 0 AFTER Rol',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_EsBot') = 0,
    'ALTER TABLE Usuario ADD INDEX IX_Usuario_EsBot (EsBot)',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- La cuenta bot en sí. `PasswordHash` queda NULL a propósito: `password_verify()`
-- da `false` ante un hash nulo, así que esta cuenta nunca puede loguearse por
-- más que alguien adivine el email. Es una sola cuenta compartida por todos
-- los juegos con modo IA — qué movimiento juega lo decide el endpoint de cada
-- juego según `JuegoCodigo`, no esta fila.
-- `INSERT IGNORE` es idempotente porque `Usuario.Email` tiene UNIQUE KEY.
INSERT IGNORE INTO Usuario
    (Email, PasswordHash, NombreCompleto, Username, Rol, Estado, EsBot, OnboardingCompleto)
VALUES
    ('ia@sistema.redhuellitas.local', NULL, 'IA de Red Huellitas', 'ia_huellitas', 'bot', 'A', 1, 'Y');

-- `PlazoTurnoHoras`: cuánto tiempo tiene el rival para responder cada
-- movimiento, elegido por quien arma el duelo (1-24, se valida en PHP — el
-- proyecto no usa CHECK en SQL en ningún lado). Default 24 = el tope máximo,
-- así que los duelos de HueConecta ya existentes quedan con el plazo más
-- permisivo posible al migrar (antes tenían de hecho 72h vía RH_DESAFIO_DIAS;
-- es un recorte intencional acorde al nuevo límite de producto, y se aplica
-- recién en la próxima jugada de cada uno, no retroactivo sobre `ExpiraEn`).
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'PlazoTurnoHoras') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN PlazoTurnoHoras SMALLINT UNSIGNED NOT NULL DEFAULT 24 AFTER Modo',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
