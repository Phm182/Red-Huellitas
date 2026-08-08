-- ============================================================
-- HuePlay: salas de hasta 4 jugadores + historial de a pares
-- Idempotente: son tablas nuevas, CREATE TABLE IF NOT EXISTS alcanza (no
-- hace falta el patrón information_schema+PREPARE que usan los ALTER).
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/053_hueplay_salas.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Una partida de hasta 4 jugadores (Ludo, y después Rummy). Es la hermana de
-- `JuegoDesafio` pero para N jugadores en vez de 2 — se separan en tablas
-- distintas en vez de forzar el 1v1 existente a un caso especial de N=2,
-- porque el modelo de "quién puede jugar contra quién" es distinto: acá hay
-- una invitación por asiento (`JuegoSalaJugador`) y un código para que
-- cualquiera se sume, no un retador/retado fijo.
--
-- `Tablero` guarda JSON, no un string de casillas como Damas/Ajedrez: Ludo no
-- es una grilla cuadrada (camino en cruz + corrales + tramos finales), así
-- que inventar una codificación de caracteres sería más complicado que
-- json_encode/json_decode de un array de fichas.
--
-- `TurnoDeSalaJugadorId` y `GanadorSalaJugadorId` apuntan a filas de
-- `JuegoSalaJugador` (no a `Usuario` directo) sin FK — igual criterio que
-- `JuegoDesafio.GanadorUserId`, que tampoco tiene FK — porque esa tabla se
-- define después acá abajo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoSala (
    SalaId              INT UNSIGNED NOT NULL AUTO_INCREMENT,
    JuegoCodigo         VARCHAR(32) NOT NULL,
    CreadorUserId       INT UNSIGNED NOT NULL,
    MaxJugadores        TINYINT UNSIGNED NOT NULL DEFAULT 4,
    -- Si al iniciar sobran asientos sin humanos, se completan con la IA.
    CompletarConIA      TINYINT(1) NOT NULL DEFAULT 0,
    -- Qué pasa con un asiento cuyo turno venció: la IA lo toma el resto de la
    -- partida, se lo saltea sin sacarlo, o se lo expulsa (fichas fuera).
    PoliticaAbandono    ENUM('ia','espera','expulsa') NOT NULL DEFAULT 'espera',
    PlazoTurnoHoras     SMALLINT UNSIGNED NOT NULL DEFAULT 24,
    -- Código corto para compartir por fuera de la app (WhatsApp, etc.) y que
    -- cualquiera con el código se sume sin haber sido invitado puntualmente.
    CodigoInvitacion    CHAR(6) NOT NULL,
    Estado              ENUM('esperando','jugando','terminada','cancelada') NOT NULL DEFAULT 'esperando',
    Tablero             TEXT NULL,
    TurnoDeSalaJugadorId INT UNSIGNED NULL,
    TurnoVenceEn        DATETIME NULL,
    GanadorSalaJugadorId INT UNSIGNED NULL,
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IniciadaEn          DATETIME NULL,
    TerminadaEn         DATETIME NULL,
    PRIMARY KEY (SalaId),
    UNIQUE KEY uq_js_codigo (CodigoInvitacion),
    KEY idx_js_creador (CreadorUserId, Estado),
    KEY idx_js_estado (Estado),
    CONSTRAINT fk_js_creador FOREIGN KEY (CreadorUserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Un asiento de una sala. `UserId` es la cuenta bot reservada en los
-- asientos que se completaron con IA — mismo criterio que en `JuegoDesafio`
-- contra la IA, no hace falta una columna aparte para distinguirlo.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoSalaJugador (
    SalaJugadorId   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    SalaId          INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    -- Orden de turno / qué color de ficha le toca (0-3). Se asigna recién al
    -- iniciar la partida, barajado con la semilla — no en el orden en que se
    -- fueron sumando, para que invitar no sea ventaja de jugar primero.
    Posicion        TINYINT UNSIGNED NOT NULL DEFAULT 0,
    Estado          ENUM('invitado','aceptado','rechazado','jugando','abandono','expulsado') NOT NULL DEFAULT 'invitado',
    UnidoPorCodigo  TINYINT(1) NOT NULL DEFAULT 0,
    -- Se prende cuando la política 'ia' le toma el asiento tras un
    -- vencimiento de turno. El UserId original se conserva (no se pisa) para
    -- que el historial de a pares y "quién jugó" sigan siendo ciertos.
    TomadoPorIA     TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (SalaJugadorId),
    -- Sin UNIQUE(SalaId, UserId) a propósito: la cuenta bot puede ocupar
    -- varios asientos de la misma sala (hasta 3, si sólo hay 1 humano). Que
    -- una persona real no se sume dos veces a la misma sala se valida en
    -- PHP (`rh_sala_crear`/`rh_sala_unirse_codigo`), no acá.
    KEY idx_sj_sala_user (SalaId, UserId),
    KEY idx_sj_user (UserId, Estado),
    CONSTRAINT fk_sj_sala FOREIGN KEY (SalaId) REFERENCES JuegoSala(SalaId) ON DELETE CASCADE,
    CONSTRAINT fk_sj_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Cuántas veces le ganó cada quién a cada quién, por juego. Es de a PARES
-- (no un ranking general): "le gané 3 a 1 en Damas" es el dato que se pidió,
-- no un acumulado que mezcle todos los juegos.
--
-- `UserIdA` siempre es el menor de los dos UserId, sin importar quién ganó
-- — así el par es único y no hace falta guardar la fila dos veces (una por
-- cada orden). `VictoriasA`/`VictoriasB` dicen cuántas le ganó cada uno AL
-- OTRO, siempre relativas a esa asignación fija.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoHistorialPar (
    UserIdA     INT UNSIGNED NOT NULL,
    UserIdB     INT UNSIGNED NOT NULL,
    JuegoCodigo VARCHAR(32) NOT NULL,
    VictoriasA  INT UNSIGNED NOT NULL DEFAULT 0,
    VictoriasB  INT UNSIGNED NOT NULL DEFAULT 0,
    -- HueConecta sí puede terminar en empate (tablero lleno sin línea) y
    -- Ajedrez en tablas (ahogado): cuenta aparte, no le suma a ninguno.
    Empates     INT UNSIGNED NOT NULL DEFAULT 0,
    UpdatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (UserIdA, UserIdB, JuegoCodigo),
    CONSTRAINT fk_jhp_a FOREIGN KEY (UserIdA) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_jhp_b FOREIGN KEY (UserIdB) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
