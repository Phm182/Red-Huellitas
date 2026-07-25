-- Red Huellitas — Fase 1: Setup & Autenticación
-- Ejecutar contra la base `huellitas` (ya debe existir, ver inc/funciones/bd.php)
-- mysql -u root huellitas < sql/001_fase1_schema.sql

SET NAMES utf8mb4;

-- ============================================================
-- Usuario
-- ============================================================
CREATE TABLE IF NOT EXISTS Usuario (
    UserId              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Email               VARCHAR(190) NOT NULL,
    PasswordHash        VARCHAR(255) NULL,
    GoogleSub           VARCHAR(64) NULL,
    NombreCompleto      VARCHAR(150) NOT NULL,
    Username            VARCHAR(30) NULL,
    ZonaLat             DECIMAL(10,7) NULL,
    ZonaLng             DECIMAL(10,7) NULL,
    ZonaDescripcion     VARCHAR(150) NULL,
    WhatsappNumero      VARCHAR(20) NULL,
    AvatarPath          VARCHAR(255) NULL,
    OnboardingCompleto  CHAR(1) NOT NULL DEFAULT 'N',
    AceptoClausulaAntiCriaderos TINYINT(1) NOT NULL DEFAULT 0,
    AceptoClausulaFecha DATETIME NULL,
    Rol                 VARCHAR(20) NOT NULL DEFAULT 'usuario',
    Estado              CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Usuario_Email (Email),
    UNIQUE KEY UQ_Usuario_Username (Username),
    UNIQUE KEY UQ_Usuario_GoogleSub (GoogleSub),
    KEY IX_Usuario_Estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UsuarioSesion (bearer tokens)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioSesion (
    SesionId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId          INT UNSIGNED NOT NULL,
    Token           CHAR(64) NOT NULL,
    Dispositivo     VARCHAR(150) NULL,
    ExpiraEn        DATETIME NOT NULL,
    RevocadoEn      DATETIME NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Sesion_Token (Token),
    KEY IX_Sesion_User (UserId),
    CONSTRAINT FK_Sesion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UsuarioVerificacion (DNI frente/dorso + selfie)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioVerificacion (
    VerificacionId   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    DniFrentePath    VARCHAR(255) NULL,
    DniDorsoPath     VARCHAR(255) NULL,
    SelfiePath       VARCHAR(255) NULL,
    EstadoRevision   VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    MotivoRechazo    VARCHAR(255) NULL,
    RevisadoPor      INT UNSIGNED NULL,
    RevisadoEn       DATETIME NULL,
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Verificacion_User (UserId),
    CONSTRAINT FK_Verificacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ReporteSolicitud (botón flotante Reportar/Solicitar)
-- ============================================================
CREATE TABLE IF NOT EXISTS ReporteSolicitud (
    ReporteId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId          INT UNSIGNED NOT NULL,
    Tipo            ENUM('mejora','falla') NOT NULL,
    Detalle         TEXT NOT NULL,
    PantallaOrigen  VARCHAR(100) NULL,
    EstadoRevision  VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Reporte_User (UserId),
    KEY IX_Reporte_Tipo (Tipo),
    CONSTRAINT FK_Reporte_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia (sistema anti-criaderos: denunciar usuario/publicación)
-- ============================================================
CREATE TABLE IF NOT EXISTS Denuncia (
    DenunciaId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserIdDenunciante INT UNSIGNED NOT NULL,
    UserIdDenunciado  INT UNSIGNED NOT NULL,
    PostId            INT UNSIGNED NULL,
    Motivo            VARCHAR(50) NOT NULL,
    Detalle           TEXT NULL,
    EstadoRevision    VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Denuncia_Denunciado (UserIdDenunciado),
    KEY IX_Denuncia_Denunciante (UserIdDenunciante),
    CONSTRAINT FK_Denuncia_Denunciante FOREIGN KEY (UserIdDenunciante) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Denuncia_Denunciado FOREIGN KEY (UserIdDenunciado) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
