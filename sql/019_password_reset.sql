-- Red Huellitas — Recuperación de contraseña
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS PasswordReset (
    PasswordResetId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId          INT UNSIGNED NOT NULL,
    CodigoHash      VARCHAR(255) NOT NULL,
    ExpiraEn        DATETIME NOT NULL,
    UsadoEn         DATETIME NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX IX_PasswordReset_UserId (UserId),
    INDEX IX_PasswordReset_Expira (ExpiraEn),
    CONSTRAINT FK_PasswordReset_Usuario
        FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
