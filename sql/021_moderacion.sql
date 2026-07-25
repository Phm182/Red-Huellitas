-- ============================================================
-- Panel de moderación — trazabilidad de denuncias y reportes
-- Idempotente: se puede correr más de una vez sin error.
--
-- UsuarioVerificacion ya tenía RevisadoPor/RevisadoEn/MotivoRechazo
-- desde el schema original, así que sólo faltaba lo equivalente en
-- las otras dos bandejas.
-- ============================================================

-- ------------------------------------------------------------
-- Denuncia: quién la resolvió, cuándo, y con qué nota interna.
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'ResueltoPorUserId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN ResueltoPorUserId INT UNSIGNED NULL AFTER EstadoRevision',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'ResueltoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN ResueltoEn DATETIME NULL AFTER ResueltoPorUserId',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'NotaAdmin'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN NotaAdmin VARCHAR(255) NULL AFTER ResueltoEn',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- ReporteSolicitud: lo mismo.
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ReporteSolicitud' AND COLUMN_NAME = 'ResueltoPorUserId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ReporteSolicitud ADD COLUMN ResueltoPorUserId INT UNSIGNED NULL AFTER EstadoRevision',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ReporteSolicitud' AND COLUMN_NAME = 'ResueltoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ReporteSolicitud ADD COLUMN ResueltoEn DATETIME NULL AFTER ResueltoPorUserId',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ReporteSolicitud' AND COLUMN_NAME = 'NotaAdmin'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE ReporteSolicitud ADD COLUMN NotaAdmin VARCHAR(255) NULL AFTER ResueltoEn',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Índices sobre EstadoRevision: las tres bandejas del panel
-- filtran siempre por ahí y ordenan por Id DESC.
-- ------------------------------------------------------------
SET @ix_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Estado'
);
SET @sql = IF(@ix_exists = 0,
    'CREATE INDEX IX_Denuncia_Estado ON Denuncia (EstadoRevision, DenunciaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ix_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ReporteSolicitud' AND INDEX_NAME = 'IX_Reporte_Estado'
);
SET @sql = IF(@ix_exists = 0,
    'CREATE INDEX IX_Reporte_Estado ON ReporteSolicitud (EstadoRevision, ReporteId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @ix_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND INDEX_NAME = 'IX_Verificacion_Estado'
);
SET @sql = IF(@ix_exists = 0,
    'CREATE INDEX IX_Verificacion_Estado ON UsuarioVerificacion (EstadoRevision, VerificacionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
