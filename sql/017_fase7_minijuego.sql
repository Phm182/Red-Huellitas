-- Red Huellitas — Fase 7a: Minijuego "Pet Society" (Tamagotchi con la mascota propia)
-- mysql -u root huellitas < sql/017_fase7_minijuego.sql
-- Idempotente: se puede correr más de una vez sin error.

SET NAMES utf8mb4;

-- ============================================================
-- MascotaJuego — estado de juego de una mascota (1:1 con Mascota)
--
-- Los 4 stats se guardan junto a StatsActualizadoEn, y el valor REAL se
-- deriva al leer descontando el tiempo transcurrido. La fila no se toca
-- salvo que el usuario haga una acción — mismo criterio que Historias
-- ("no hay cron, la expiración es puramente a nivel de query").
--
-- Por decisión de producto la mascota NUNCA muere ni se enferma: los stats
-- tienen piso en 0 y de ahí sale un ánimo "decaído", nada más. El avatar es
-- la foto de una mascota real, en una app de bienestar animal.
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaJuego (
    MascotaId           INT UNSIGNED PRIMARY KEY,
    UserId              INT UNSIGNED NOT NULL,

    Hambre              TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Felicidad           TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Energia             TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Higiene             TINYINT UNSIGNED NOT NULL DEFAULT 100,
    StatsActualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Cooldown por acción: cuándo se usó cada una por última vez.
    UltimoAlimentar     DATETIME NULL,
    UltimoJugar         DATETIME NULL,
    UltimoBanar         DATETIME NULL,
    UltimoDormir        DATETIME NULL,

    -- Progresión
    Nivel               SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    Experiencia         INT UNSIGNED NOT NULL DEFAULT 0,
    RachaDias           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UltimaVisita        DATE NULL,

    -- Enganche para Fase 7b (avatar generado por IA). Si tiene algo, se usa
    -- en lugar de la foto real de la mascota. Nada más del juego cambia.
    AvatarPath          VARCHAR(255) NULL,

    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY IX_MascotaJuego_User (UserId),
    CONSTRAINT FK_MascotaJuego_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_MascotaJuego_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.NotificarJuego — opt-out de los recordatorios del minijuego.
-- Propio, no reusa NotificarProximidad (que es sólo para avisos por cercanía
-- geográfica). Mismo patrón que el ALTER guardado de 008.
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'NotificarJuego'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN NotificarJuego TINYINT(1) NOT NULL DEFAULT 1 AFTER NotificarProximidad',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
