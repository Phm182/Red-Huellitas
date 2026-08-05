-- ============================================================
-- HuePlay: puntaje por usuario, partidas y desafíos entre cuentas
-- Idempotente: se puede correr más de una vez sin error.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/048_hueplay_juegos.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Progreso de juegos POR USUARIO.
--
-- Es distinto de MascotaJuego.nivel, que es el nivel de una mascota en
-- HueGotchi. Acá el nivel es de la cuenta y suma de todos los juegos, que es
-- lo que permite compararse con otros y retar a alguien.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS UsuarioJuegoPerfil (
    UserId INT UNSIGNED NOT NULL,
    PuntosTotales INT UNSIGNED NOT NULL DEFAULT 0,
    Nivel SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    PartidasJugadas INT UNSIGNED NOT NULL DEFAULT 0,
    DesafiosGanados INT UNSIGNED NOT NULL DEFAULT 0,
    DesafiosPerdidos INT UNSIGNED NOT NULL DEFAULT 0,
    UpdatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId),
    KEY idx_ranking (PuntosTotales DESC),
    CONSTRAINT fk_ujp_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Una fila por partida jugada, para historial y para el récord personal.
--
-- `JuegoCodigo` es texto y no una FK a un catálogo en base: los juegos viven
-- en el código (pantallas, reglas, dibujos), así que una tabla de catálogo
-- sería un espejo que hay que mantener sincronizado a mano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoPartida (
    PartidaId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    JuegoCodigo VARCHAR(32) NOT NULL,
    UserId INT UNSIGNED NOT NULL,
    Puntos INT UNSIGNED NOT NULL DEFAULT 0,
    DuracionSegundos SMALLINT UNSIGNED NULL,
    /** Si nació de un desafío, para no contar dos veces el puntaje. */
    DesafioId INT UNSIGNED NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (PartidaId),
    KEY idx_user_juego (UserId, JuegoCodigo, Puntos DESC),
    KEY idx_juego_puntos (JuegoCodigo, Puntos DESC),
    CONSTRAINT fk_jp_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Desafío entre dos cuentas.
--
-- Decisión central: `Semilla` guarda la semilla del tablero y LOS DOS JUGADORES
-- JUEGAN EXACTAMENTE EL MISMO TABLERO. Con eso el duelo es justo sin necesidad
-- de tiempo real: cada uno juega cuando puede, gana el que hace más puntos.
-- En hosting compartido con PHP no hay websockets, así que un "tiempo real"
-- de verdad no era posible; esto da un duelo competitivo igual de emocionante
-- sin fingir una infraestructura que no existe.
--
-- Se puede retar a cualquiera, lo sigas o no, que es lo pedido. La protección
-- de menores no aplica acá porque un desafío no abre un canal de mensajes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS JuegoDesafio (
    DesafioId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    JuegoCodigo VARCHAR(32) NOT NULL,
    UserIdRetador INT UNSIGNED NOT NULL,
    UserIdRetado INT UNSIGNED NOT NULL,
    Estado ENUM('pendiente','aceptado','terminado','rechazado','expirado') NOT NULL DEFAULT 'pendiente',
    Semilla INT UNSIGNED NOT NULL,
    PuntosRetador INT UNSIGNED NULL,
    PuntosRetado INT UNSIGNED NULL,
    GanadorUserId INT UNSIGNED NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiraEn DATETIME NOT NULL,
    PRIMARY KEY (DesafioId),
    KEY idx_retado (UserIdRetado, Estado),
    KEY idx_retador (UserIdRetador, Estado),
    CONSTRAINT fk_jd_retador FOREIGN KEY (UserIdRetador) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_jd_retado FOREIGN KEY (UserIdRetado) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
