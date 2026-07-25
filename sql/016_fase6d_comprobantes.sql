-- ============================================================
-- Fase 6d — Comprobantes PDF + envío por email
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Pedido.ComprobanteEnviadoEn
-- Marca de cuándo se mandó el comprobante por mail. Sirve para
-- mostrarlo en la UI y para distinguir "nunca se envió" de
-- "se envió y el usuario quiere reenviarlo".
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Pedido' AND COLUMN_NAME = 'ComprobanteEnviadoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Pedido ADD COLUMN ComprobanteEnviadoEn DATETIME NULL AFTER Estado',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- PedidoComprobanteToken
-- Token efímero de un solo uso para descargar el PDF del
-- comprobante. Existe porque Linking.openURL() (la forma en que
-- la app abre un archivo, tanto en web como en nativo) no puede
-- mandar el header Authorization, así que el endpoint del PDF no
-- puede exigir Bearer. Mismo patrón que UsuarioMpOauthPendiente
-- de 6c: se crea desde un endpoint autenticado, se consume una
-- sola vez, y vence a los 10 minutos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS PedidoComprobanteToken (
    Token      VARCHAR(64) PRIMARY KEY,
    PedidoId   INT UNSIGNED NOT NULL,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_ComprobanteToken_Pedido (PedidoId),
    CONSTRAINT FK_ComprobanteToken_Pedido FOREIGN KEY (PedidoId) REFERENCES Pedido(PedidoId),
    CONSTRAINT FK_ComprobanteToken_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
