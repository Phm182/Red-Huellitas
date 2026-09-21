-- ============================================================
-- HuePlay: el nivel de la cuenta pasa a subir por OBJETIVOS cumplidos (XP),
-- no por puntos sueltos de cada partida.
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/075_hueplay_objetivos.sql
-- ============================================================

-- XP de cuenta: la suma de lo que dieron los objetivos cumplidos.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioJuegoPerfil' AND COLUMN_NAME = 'Xp');
SET @sql = IF(@c = 0,
    'ALTER TABLE UsuarioJuegoPerfil ADD COLUMN Xp INT UNSIGNED NOT NULL DEFAULT 0 AFTER PuntosTotales, ADD KEY idx_xp (Xp)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Un objetivo cumplido por fila. Los permanentes ("Jugá 10 partidas") llevan
-- Periodo = '2000-01-01'; los diarios llevan la fecha del día en que se
-- cumplieron, así se vuelven a poder cumplir mañana.
CREATE TABLE IF NOT EXISTS UsuarioJuegoObjetivo (
    UserId INT UNSIGNED NOT NULL,
    Codigo VARCHAR(48) NOT NULL,
    Periodo DATE NOT NULL DEFAULT '2000-01-01',
    Xp INT UNSIGNED NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (UserId, Codigo, Periodo),
    CONSTRAINT fk_ujo_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
