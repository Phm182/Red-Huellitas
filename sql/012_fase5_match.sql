-- Red Huellitas — Fase 5: Match de Mascotas
-- mysql -u root huellitas < sql/012_fase5_match.sql

SET NAMES utf8mb4;

-- ============================================================
-- MascotaMatchSwipe (like/pass de una mascota propia sobre una candidata)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaMatchSwipe (
    SwipeId           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaIdOrigen   INT UNSIGNED NOT NULL,
    MascotaIdDestino  INT UNSIGNED NOT NULL,
    Direccion         ENUM('like','pass') NOT NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Swipe (MascotaIdOrigen, MascotaIdDestino),
    KEY IX_Swipe_Destino (MascotaIdDestino),
    CONSTRAINT FK_Swipe_Origen FOREIGN KEY (MascotaIdOrigen) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Swipe_Destino FOREIGN KEY (MascotaIdDestino) REFERENCES Mascota(MascotaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MascotaMatch (match mutuo entre dos mascotas — MascotaIdA < MascotaIdB siempre)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaMatch (
    MatchId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaIdA   INT UNSIGNED NOT NULL,
    MascotaIdB   INT UNSIGNED NOT NULL,
    UserIdA      INT UNSIGNED NOT NULL,
    UserIdB      INT UNSIGNED NOT NULL,
    Estado       CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Match (MascotaIdA, MascotaIdB),
    KEY IX_Match_UserA (UserIdA),
    KEY IX_Match_UserB (UserIdB),
    CONSTRAINT FK_Match_MascotaA FOREIGN KEY (MascotaIdA) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Match_MascotaB FOREIGN KEY (MascotaIdB) REFERENCES Mascota(MascotaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MatchMensaje (chat interno 1:1 asociado a un match)
-- ============================================================
CREATE TABLE IF NOT EXISTS MatchMensaje (
    MensajeId     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MatchId       INT UNSIGNED NOT NULL,
    UserIdEmisor  INT UNSIGNED NOT NULL,
    Texto         VARCHAR(1000) NOT NULL,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Mensaje_Match (MatchId, MensajeId),
    CONSTRAINT FK_Mensaje_Match FOREIGN KEY (MatchId) REFERENCES MascotaMatch(MatchId),
    CONSTRAINT FK_Mensaje_Usuario FOREIGN KEY (UserIdEmisor) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MatchWhatsappConsentimiento (consentimiento mutuo para revelar WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS MatchWhatsappConsentimiento (
    MatchId    INT UNSIGNED NOT NULL,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MatchId, UserId),
    CONSTRAINT FK_Consent_Match FOREIGN KEY (MatchId) REFERENCES MascotaMatch(MatchId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
