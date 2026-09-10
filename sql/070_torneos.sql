-- ============================================================
-- Torneos de HuePlay para los juegos de duelo 1v1.
--
-- Dos formatos:
--  - 'eliminacion': llave de eliminación directa (4/8/16). Si al iniciar
--    hay menos inscriptos que el tamaño, los seeds de arriba pasan de ronda
--    con 'bye'.
--  - 'liga': todos contra todos, tabla de puntos (3 por ganar / 1 empate).
--
-- Cada `TorneoPartida` con los dos jugadores definidos genera un
-- `JuegoDesafio` real (mismo motor que "salas de duelo"); al cerrarse ese
-- duelo, `rh_torneo_al_cerrar_desafio()` avanza el torneo.
-- ============================================================

CREATE TABLE IF NOT EXISTS Torneo (
    TorneoId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    JuegoCodigo VARCHAR(32) NOT NULL,
    CreadorUserId INT UNSIGNED NOT NULL,
    Nombre VARCHAR(80) NOT NULL,
    Formato ENUM('eliminacion','liga') NOT NULL DEFAULT 'eliminacion',
    Tamano TINYINT UNSIGNED NOT NULL DEFAULT 8,
    Estado ENUM('inscripcion','en_curso','terminado','cancelado') NOT NULL DEFAULT 'inscripcion',
    CodigoInvitacion CHAR(6) NOT NULL,
    EsPublico TINYINT(1) NOT NULL DEFAULT 1,
    PlazoTurnoMinutos SMALLINT UNSIGNED NOT NULL DEFAULT 1440,
    PlazoRondaMinutos INT NOT NULL DEFAULT 0,
    RondaActual TINYINT UNSIGNED NOT NULL DEFAULT 0,
    GanadorUserId INT UNSIGNED NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    IniciadoEn DATETIME NULL,
    TerminadoEn DATETIME NULL,
    PRIMARY KEY (TorneoId),
    UNIQUE KEY uq_torneo_codigo (CodigoInvitacion),
    KEY idx_torneo_abiertos (Estado, EsPublico),
    CONSTRAINT fk_torneo_creador FOREIGN KEY (CreadorUserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TorneoParticipante (
    TorneoId INT UNSIGNED NOT NULL,
    UserId INT UNSIGNED NOT NULL,
    Estado ENUM('inscripto','jugando','eliminado','campeon') NOT NULL DEFAULT 'inscripto',
    Seed SMALLINT UNSIGNED NULL,
    PuntosLiga INT NOT NULL DEFAULT 0,
    PartidasGanadas SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PartidasPerdidas SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UnidoPorCodigo TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TorneoId, UserId),
    KEY idx_torneopart_user (UserId),
    CONSTRAINT fk_torneopart_torneo FOREIGN KEY (TorneoId) REFERENCES Torneo(TorneoId) ON DELETE CASCADE,
    CONSTRAINT fk_torneopart_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS TorneoPartida (
    PartidaId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    TorneoId INT UNSIGNED NOT NULL,
    Ronda TINYINT UNSIGNED NOT NULL,
    Slot SMALLINT UNSIGNED NOT NULL,
    UserIdA INT UNSIGNED NULL,
    UserIdB INT UNSIGNED NULL,
    DesafioId INT UNSIGNED NULL,
    GanadorUserId INT UNSIGNED NULL,
    Estado ENUM('pendiente','jugando','terminada','bye') NOT NULL DEFAULT 'pendiente',
    VenceEn DATETIME NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (PartidaId),
    KEY idx_torneopartida_torneo (TorneoId, Ronda),
    KEY idx_torneopartida_desafio (DesafioId),
    CONSTRAINT fk_torneopartida_torneo FOREIGN KEY (TorneoId) REFERENCES Torneo(TorneoId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
