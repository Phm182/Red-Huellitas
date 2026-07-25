-- ============================================================
-- Verificación automática (Gemini + opcional Renaper/SID facial)
-- ============================================================
ALTER TABLE UsuarioVerificacion
    ADD COLUMN AutoScore          DECIMAL(4,3) NULL AFTER MotivoRechazo,
    ADD COLUMN FaceMatchScore     DECIMAL(4,3) NULL AFTER AutoScore,
    ADD COLUMN AutoMetodo         VARCHAR(40) NULL AFTER FaceMatchScore,
    ADD COLUMN AutoDetalle        TEXT NULL AFTER AutoMetodo,
    ADD COLUMN DniNumeroExtraido  VARCHAR(20) NULL AFTER AutoDetalle,
    ADD COLUMN NombreExtraido     VARCHAR(150) NULL AFTER DniNumeroExtraido,
    ADD COLUMN KycExternoId       VARCHAR(100) NULL AFTER NombreExtraido,
    ADD COLUMN KycEstado          VARCHAR(40) NULL AFTER KycExternoId;
