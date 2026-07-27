-- ============================================================
-- Cuenta privada + solicitudes de seguimiento
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Perfil privado. Arranca en 0 (público) porque cambiarle la
-- visibilidad a cuentas que ya existen sin que nadie lo pida
-- sería peor que el default menos restrictivo.
--
-- Al pasar a privado los seguidores actuales SE CONSERVAN: son
-- gente que ya tenía acceso, echarla es destruir datos por un
-- cambio de setting.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'PerfilPrivado');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN PerfilPrivado TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Mensaje personal estilo MSN, debajo del nombre en el chat.
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'MensajePersonal');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN MensajePersonal VARCHAR(120) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Solicitudes de seguimiento.
--
-- El único por (Solicitante, Destino) evita que apretar dos
-- veces "Seguir" genere dos pedidos. Las resueltas se conservan
-- para saber si a alguien ya lo rechazaste antes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SolicitudSeguimiento (
    SolicitudId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    UserIdSolicitante INT UNSIGNED NOT NULL,
    UserIdDestino INT UNSIGNED NOT NULL,
    Estado ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltaEn DATETIME NULL,
    PRIMARY KEY (SolicitudId),
    UNIQUE KEY uq_solicitud (UserIdSolicitante, UserIdDestino),
    KEY idx_destino_estado (UserIdDestino, Estado),
    CONSTRAINT fk_solsig_solicitante FOREIGN KEY (UserIdSolicitante) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_solsig_destino FOREIGN KEY (UserIdDestino) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
