-- ============================================================
-- "Me interesa" en Tránsito y Donaciones: levantar la mano, sin
-- cuestionario (a diferencia de AdopcionPostulacion). Dos tablas
-- gemelas, no polimórficas -- mismo criterio que Denuncia.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/059_interes_transito_donacion.sql
-- ============================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS TransitoInteres (
    TransitoInteresId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    TransitoId         INT UNSIGNED NOT NULL,
    UserId             INT UNSIGNED NOT NULL,
    Mensaje            VARCHAR(300) NULL,
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (TransitoInteresId),
    UNIQUE KEY uq_transito_user (TransitoId, UserId),
    KEY idx_user (UserId),
    CONSTRAINT fk_transitointeres_transito FOREIGN KEY (TransitoId) REFERENCES Transito(TransitoId) ON DELETE CASCADE,
    CONSTRAINT fk_transitointeres_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS DonacionInteres (
    DonacionInteresId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    DonacionId         INT UNSIGNED NOT NULL,
    UserId             INT UNSIGNED NOT NULL,
    Mensaje            VARCHAR(300) NULL,
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (DonacionInteresId),
    UNIQUE KEY uq_donacion_user (DonacionId, UserId),
    KEY idx_user (UserId),
    CONSTRAINT fk_donacioninteres_donacion FOREIGN KEY (DonacionId) REFERENCES Donacion(DonacionId) ON DELETE CASCADE,
    CONSTRAINT fk_donacioninteres_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
