-- ============================================================
-- Chat directo entre cuentas, con bandeja de solicitudes
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

CREATE TABLE IF NOT EXISTS Conversacion (
    ConversacionId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UltimoMensajeEn DATETIME NULL,
    PRIMARY KEY (ConversacionId),
    KEY idx_ultimo (UltimoMensajeEn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- El estado vive POR PARTICIPANTE, no por conversación.
--
-- Es la decisión que hace posible la bandeja de solicitudes: para el
-- que escribe es una charla normal ('activa') y para el que recibe,
-- si no hay relación previa, es una solicitud. Con un estado global
-- en Conversacion no se podría representar esa asimetría.
--
-- `UltimaLecturaMensajeId` es lo que permite contar no leídos sin
-- una fila por mensaje y por usuario.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ConversacionParticipante (
    ConversacionId INT UNSIGNED NOT NULL,
    UserId INT UNSIGNED NOT NULL,
    Estado ENUM('activa','solicitud','archivada') NOT NULL DEFAULT 'activa',
    UltimaLecturaMensajeId INT UNSIGNED NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ConversacionId, UserId),
    KEY idx_user_estado (UserId, Estado),
    CONSTRAINT fk_cp_conv FOREIGN KEY (ConversacionId) REFERENCES Conversacion(ConversacionId) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `Tipo` distingue el zumbido del MSN: viaja como mensaje para que
-- quede en el historial, pero la app lo dibuja distinto y sacude la
-- pantalla en vez de mostrar una burbuja.
CREATE TABLE IF NOT EXISTS Mensaje (
    MensajeId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ConversacionId INT UNSIGNED NOT NULL,
    UserIdEmisor INT UNSIGNED NOT NULL,
    Texto VARCHAR(1000) NOT NULL,
    Tipo ENUM('texto','zumbido') NOT NULL DEFAULT 'texto',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MensajeId),
    KEY idx_conv (ConversacionId, MensajeId),
    CONSTRAINT fk_msg_conv FOREIGN KEY (ConversacionId) REFERENCES Conversacion(ConversacionId) ON DELETE CASCADE,
    CONSTRAINT fk_msg_emisor FOREIGN KEY (UserIdEmisor) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
