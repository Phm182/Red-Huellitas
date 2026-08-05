-- ============================================================
-- HuePlay: partidas por turnos sobre un tablero compartido
-- Idempotente con el patrón information_schema + PREPARE de sql/025.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/049_hueplay_turnos.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Hasta ahora un desafío era siempre "cada uno juega su partida y se comparan
-- los puntajes" (HueMatch). Conecta 4 necesita otra cosa: UN tablero que los
-- dos van modificando por turnos.
--
-- Se agrega a `JuegoDesafio` en vez de crear una tabla nueva porque todo lo que
-- rodea al duelo —la bandeja, las notificaciones, el vencimiento, quién puede
-- rechazarlo— ya está resuelto ahí y sirve igual para los dos modos.
--
-- La diferencia importante contra el modo 'puntaje': acá **el servidor valida
-- cada jugada y decide quién ganó**. En HueMatch el puntaje lo calcula el
-- celular y sólo se le puede poner un techo; en un tablero por turnos el
-- servidor sabe si la columna es legal y si hay 4 en línea, así que no hay nada
-- que confiarle al cliente.
-- ------------------------------------------------------------

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'Modo') = 0,
    "ALTER TABLE JuegoDesafio ADD COLUMN Modo ENUM('puntaje','turnos') NOT NULL DEFAULT 'puntaje' AFTER JuegoCodigo",
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Estado del tablero serializado. Para Conecta 4 son 42 caracteres
-- ('0' vacío, '1' retador, '2' retado), leídos de arriba hacia abajo.
-- Es texto y no una tabla de jugadas: el tablero completo entra en una celda,
-- se lee de un saque y no hace falta reconstruirlo movimiento por movimiento.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'Tablero') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN Tablero VARCHAR(128) NULL AFTER Semilla',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- De quién es el turno. NULL en el modo 'puntaje', donde no hay turnos.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'TurnoDeUserId') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN TurnoDeUserId INT UNSIGNED NULL AFTER Tablero',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- Cuántas fichas se pusieron. Sirve para detectar el empate sin recorrer el
-- tablero y para que el front sepa si tiene que refrescar.
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND COLUMN_NAME = 'Movimientos') = 0,
    'ALTER TABLE JuegoDesafio ADD COLUMN Movimientos SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER TurnoDeUserId',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

-- `GanadorUserId` ya existe y se reusa. Para marcar el empate hace falta
-- distinguir "terminado sin ganador" de "todavía no terminó", y eso ya lo dice
-- `Estado`, así que no se agrega nada más.

-- Índice para la bandeja: "los duelos donde me toca mover".
SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoDesafio' AND INDEX_NAME = 'idx_turno') = 0,
    'ALTER TABLE JuegoDesafio ADD INDEX idx_turno (TurnoDeUserId, Estado)',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
