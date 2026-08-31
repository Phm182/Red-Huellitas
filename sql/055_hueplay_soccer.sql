-- ============================================================
-- HueSoccer: ensancha JuegoDesafio.Tablero para que entre el JSON del duelo.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/055_hueplay_soccer.sql
-- ============================================================

SET NAMES utf8mb4;

-- HueSoccer guarda 3 fichas por jugador + pelota + goles + dimensiones de
-- cancha como JSON en JuegoDesafio.Tablero, y ese JSON (~200-260 caracteres)
-- no entra en los 128 caracteres pensados para el string fijo de
-- Conecta4/Damas/Ajedrez (sql/049_hueplay_turnos.sql). Se ensancha a TEXT,
-- mismo tipo que ya usa JuegoSala.Tablero para Ludo/Rummy.
--
-- MODIFY COLUMN es seguro de re-correr (ensanchar un VARCHAR/TEXT ya TEXT no
-- rompe nada existente), así que no hace falta el guard de information_schema
-- que sí usan los ADD COLUMN de otras migraciones de esta carpeta.
ALTER TABLE JuegoDesafio MODIFY COLUMN Tablero TEXT NULL;
