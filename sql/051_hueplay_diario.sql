-- =====================================================================
-- 051 — El desafío diario de HuePlay
--
-- Un reto por día y por juego, igual para todo el mundo, con ranking
-- global. La pieza que lo hace posible es la SEMILLA compartida: los
-- juegos ya saben generar su tablero a partir de un número (es lo que
-- usan los duelos), así que si todos reciben la misma semilla juegan
-- exactamente el mismo tablero y los puntajes se pueden comparar de
-- verdad. Sin eso, un ranking sólo mediría quién tuvo mejor suerte.
--
-- Idempotente: se puede correr dos veces sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- El reto del día
--
-- `Semilla` es lo que comparten todos los jugadores de esa fecha.
-- `Datos` queda para los juegos que necesitan algo más que un número —el
-- puzzle diario de damas o de ajedrez guarda acá su posición inicial y
-- la solución—, y va NULL en los que se arman solos con la semilla.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoDiario (
    DiarioId        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Fecha           DATE NOT NULL,
    JuegoCodigo     VARCHAR(32) NOT NULL,
    Semilla         INT UNSIGNED NOT NULL,
    Datos           TEXT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (DiarioId),
    -- Un solo reto por juego y por día: es lo que garantiza que el
    -- ranking compare partidas del mismo tablero.
    UNIQUE KEY uq_diario_fecha_juego (Fecha, JuegoCodigo),
    KEY idx_diario_fecha (Fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Lo que hizo cada usuario en el reto del día
--
-- La clave única `(DiarioId, UserId)` es el corazón del asunto: se juega
-- UNA vez por día. Sin ella el ranking premiaría al que más veces lo
-- intenta, que es justo lo contrario de lo que un reto diario propone.
-- El intento se registra al terminar, no al empezar, así que cerrar la
-- app a mitad de partida no quema el día.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoDiarioResultado (
    ResultadoId     INT UNSIGNED NOT NULL AUTO_INCREMENT,
    DiarioId        INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    Puntos          INT UNSIGNED NOT NULL DEFAULT 0,
    DuracionSegundos SMALLINT UNSIGNED NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ResultadoId),
    UNIQUE KEY uq_diario_usuario (DiarioId, UserId),
    -- El índice del ranking: ordenar por puntos dentro de un día.
    -- `Puntos` descendente y `CreatedAt` ascendente porque ante empate
    -- va primero el que lo logró antes.
    KEY idx_ranking (DiarioId, Puntos DESC, CreatedAt ASC),
    KEY idx_usuario (UserId),
    CONSTRAINT fk_diarioresultado_diario FOREIGN KEY (DiarioId)
        REFERENCES JuegoDiario (DiarioId) ON DELETE CASCADE,
    CONSTRAINT fk_diarioresultado_usuario FOREIGN KEY (UserId)
        REFERENCES Usuario (UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Racha de días seguidos
--
-- Va en el perfil de juego que ya existe y no en una tabla aparte: es un
-- dato por usuario, se lee siempre junto al resto del perfil, y contarlo
-- cada vez recorriendo los resultados sería caro para algo que se muestra
-- en cada pantalla.
--
-- El patrón de `information_schema` es el mismo de sql/025: `ADD COLUMN`
-- no admite `IF NOT EXISTS` en todas las versiones de MySQL/MariaDB, así
-- que se pregunta antes y se arma la sentencia sólo si falta.
-- ---------------------------------------------------------------------
SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'UsuarioJuegoPerfil'
      AND COLUMN_NAME = 'RachaDiaria'
);
SET @sql := IF(@existe = 0,
    'ALTER TABLE UsuarioJuegoPerfil ADD COLUMN RachaDiaria SMALLINT UNSIGNED NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @existe := (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'UsuarioJuegoPerfil'
      AND COLUMN_NAME = 'UltimoDiario'
);
SET @sql := IF(@existe = 0,
    'ALTER TABLE UsuarioJuegoPerfil ADD COLUMN UltimoDiario DATE NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
