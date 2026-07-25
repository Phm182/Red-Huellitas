-- Red Huellitas — Fase 6a: Suscripción "Vitrina Comercial" (pago dual Manual + Mercado Pago)
-- mysql -u root huellitas < sql/013_fase6a_suscripcion.sql

SET NAMES utf8mb4;

-- ============================================================
-- SuscripcionPlan (catálogo — hoy un solo plan, mismo criterio que TipoUsuarioCatalogo/RazaCatalogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS SuscripcionPlan (
    PlanId          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Codigo          VARCHAR(40) NOT NULL UNIQUE,
    Nombre          VARCHAR(80) NOT NULL,
    MontoMensual    DECIMAL(10,2) NOT NULL,
    Estado          CHAR(1) NOT NULL DEFAULT 'A'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO SuscripcionPlan (Codigo, Nombre, MontoMensual, Estado)
SELECT 'vitrina_comercial', 'Vitrina Comercial', 5000.00, 'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'vitrina_comercial');

-- ============================================================
-- SuscripcionPago (historial de pagos confirmados, manual o Mercado Pago)
-- ============================================================
CREATE TABLE IF NOT EXISTS SuscripcionPago (
    PagoId          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId          INT UNSIGNED NOT NULL,
    PlanId          INT UNSIGNED NOT NULL,
    Origen          ENUM('mercadopago','manual') NOT NULL,
    MpPaymentId     VARCHAR(60) NULL,
    MontoPagado     DECIMAL(10,2) NOT NULL,
    PeriodoDesde    DATE NOT NULL,
    PeriodoHasta    DATE NOT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Pago_MpPaymentId (MpPaymentId),
    KEY IX_Pago_User (UserId),
    CONSTRAINT FK_Pago_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Pago_Plan FOREIGN KEY (PlanId) REFERENCES SuscripcionPlan(PlanId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- SuscripcionSolicitudManual (registro de auditoría/notificación del flujo manual)
-- ============================================================
CREATE TABLE IF NOT EXISTS SuscripcionSolicitudManual (
    SolicitudId         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId              INT UNSIGNED NOT NULL,
    PlanId              INT UNSIGNED NOT NULL,
    Estado              VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltoPorUserId   INT UNSIGNED NULL,
    ResueltoEn          DATETIME NULL,
    KEY IX_Solicitud_User (UserId),
    KEY IX_Solicitud_Estado (Estado),
    CONSTRAINT FK_Solicitud_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Solicitud_Plan FOREIGN KEY (PlanId) REFERENCES SuscripcionPlan(PlanId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario: columnas de estado de suscripción (guardado idempotente, columna→índice→FK)
-- ============================================================

-- SuscripcionPlanId (FK -> SuscripcionPlan)
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionPlanId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN SuscripcionPlanId INT UNSIGNED NULL AFTER NotificarProximidad',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_SuscripcionPlan'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Usuario ADD INDEX IX_Usuario_SuscripcionPlan (SuscripcionPlanId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND CONSTRAINT_NAME = 'FK_Usuario_SuscripcionPlan'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Usuario ADD CONSTRAINT FK_Usuario_SuscripcionPlan FOREIGN KEY (SuscripcionPlanId) REFERENCES SuscripcionPlan(PlanId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SuscripcionPagaHasta
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionPagaHasta'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN SuscripcionPagaHasta DATE NULL AFTER SuscripcionPlanId',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SuscripcionUltimoPago
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionUltimoPago'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN SuscripcionUltimoPago DATETIME NULL AFTER SuscripcionPagaHasta',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SuscripcionMetodoActivo
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionMetodoActivo'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Usuario ADD COLUMN SuscripcionMetodoActivo ENUM('mercadopago','manual') NULL AFTER SuscripcionUltimoPago",
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SuscripcionMpId
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionMpId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN SuscripcionMpId VARCHAR(60) NULL AFTER SuscripcionMetodoActivo',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- SuscripcionMpEstado
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'SuscripcionMpEstado'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN SuscripcionMpEstado VARCHAR(30) NULL AFTER SuscripcionMpId',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
