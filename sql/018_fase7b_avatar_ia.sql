-- Red Huellitas — Fase 7b: Avatar de la mascota generado por IA
-- mysql -u root huellitas < sql/018_fase7b_avatar_ia.sql
-- Idempotente: se puede correr más de una vez sin error.

SET NAMES utf8mb4;

-- ============================================================
-- MascotaAvatarGeneracion — log de generaciones de avatar.
--
-- Sirve para dos cosas: contar el consumo (la cuota gratuita de Gemini es
-- global de la app, no por usuario, así que hay que limitar de los dos lados)
-- y poder auditar qué se generó y por qué falló.
--
-- Los intentos fallidos se registran con Exito = 0 pero NO consumen cuota.
--
-- No hace falta tocar MascotaJuego: la columna AvatarPath ya existe desde 7a,
-- justamente como enganche para esta fase.
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaAvatarGeneracion (
    GeneracionId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaId     INT UNSIGNED NOT NULL,
    UserId        INT UNSIGNED NOT NULL,
    Exito         TINYINT(1) NOT NULL DEFAULT 0,
    Detalle       VARCHAR(255) NULL,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Los dos índices cubren las dos consultas de cuota: por usuario en el día
    -- y global en el día.
    KEY IX_AvatarGen_User_Fecha (UserId, CreatedAt),
    KEY IX_AvatarGen_Fecha (CreatedAt),

    CONSTRAINT FK_AvatarGen_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_AvatarGen_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
