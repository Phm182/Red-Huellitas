-- =============================================================================
-- Red Huellitas — schema completo (todas las fases concatenadas)
-- Generado para ejecutar de una sola vez en phpMyAdmin / MySQL.
-- Orden: 001 … 016
-- =============================================================================

CREATE DATABASE IF NOT EXISTS huellitas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas;


-- -----------------------------------------------------------------------------
-- 001_fase1_schema.sql
-- -----------------------------------------------------------------------------

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
    AutoScore          DECIMAL(4,3) NULL,
    FaceMatchScore     DECIMAL(4,3) NULL,
    AutoMetodo         VARCHAR(40) NULL,
    AutoDetalle        TEXT NULL,
    DniNumeroExtraido  VARCHAR(20) NULL,
    NombreExtraido     VARCHAR(150) NULL,
    KycExternoId       VARCHAR(100) NULL,
    KycEstado          VARCHAR(40) NULL,
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


-- -----------------------------------------------------------------------------
-- 002_fase2_mascotas_social.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 2: Perfiles & "Mis Mascotas"
-- mysql -u root huellitas < sql/002_fase2_mascotas_social.sql

SET NAMES utf8mb4;

-- ============================================================
-- RazaCatalogo (catálogo curado por especie + fallback a texto libre en Mascota.RazaTexto)
-- ============================================================
CREATE TABLE IF NOT EXISTS RazaCatalogo (
    RazaId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Especie   ENUM('perro','gato','otro') NOT NULL,
    Nombre    VARCHAR(60) NOT NULL,
    UNIQUE KEY UQ_Raza (Especie, Nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO RazaCatalogo (Especie, Nombre) VALUES
('perro','Mestizo'),
('perro','Labrador Retriever'),
('perro','Golden Retriever'),
('perro','Caniche'),
('perro','Bulldog Francés'),
('perro','Bulldog Inglés'),
('perro','Chihuahua'),
('perro','Pastor Alemán'),
('perro','Boxer'),
('perro','Beagle'),
('perro','Dálmata'),
('perro','Dogo Argentino'),
('perro','Cocker Spaniel'),
('perro','Salchicha (Dachshund)'),
('perro','Husky Siberiano'),
('perro','Pug'),
('perro','Rottweiler'),
('perro','Shih Tzu'),
('perro','Yorkshire Terrier'),
('perro','Border Collie'),
('gato','Mestizo / Común Europeo'),
('gato','Siamés'),
('gato','Persa'),
('gato','Maine Coon'),
('gato','Angora'),
('gato','Bengalí'),
('gato','Ragdoll'),
('gato','Sphynx (Esfinge)'),
('gato','Británico de Pelo Corto'),
('gato','Azul Ruso'),
('gato','Himalayo'),
('gato','Bosque de Noruega'),
('otro','Otra especie');

-- ============================================================
-- Mascota
-- ============================================================
CREATE TABLE IF NOT EXISTS Mascota (
    MascotaId            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId               INT UNSIGNED NOT NULL,
    Nombre               VARCHAR(60) NOT NULL,
    Sexo                 ENUM('macho','hembra') NOT NULL,
    EdadAnios            TINYINT UNSIGNED NULL,
    EdadMeses            TINYINT UNSIGNED NULL,
    Especie              ENUM('perro','gato','otro') NOT NULL,
    RazaId               INT UNSIGNED NULL,
    RazaTexto            VARCHAR(80) NULL,
    DescripcionTexto     TEXT NULL,
    CarnetVacunasPath    VARCHAR(255) NULL,
    CarnetVisibilidad    ENUM('publica','privada') NOT NULL DEFAULT 'privada',
    DisponibleParaMatch  TINYINT(1) NOT NULL DEFAULT 0,
    Estado               CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Mascota_User (UserId),
    KEY IX_Mascota_Estado (Estado),
    KEY IX_Mascota_Raza (RazaId),
    CONSTRAINT FK_Mascota_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Mascota_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MascotaFoto (galería, máx 6 fotos enforced en PHP)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaFoto (
    MascotaFotoId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaId      INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_MascotaFoto_Mascota (MascotaId),
    CONSTRAINT FK_MascotaFoto_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MascotaCarnetAcceso (grants manuales cuando el carnet es privado)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaCarnetAcceso (
    AccesoId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaId   INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_CarnetAcceso (MascotaId, UserId),
    CONSTRAINT FK_CarnetAcceso_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_CarnetAcceso_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seguimiento (follow/follower)
-- ============================================================
CREATE TABLE IF NOT EXISTS Seguimiento (
    SeguimientoId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserIdSeguidor   INT UNSIGNED NOT NULL,
    UserIdSeguido    INT UNSIGNED NOT NULL,
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Seguimiento (UserIdSeguidor, UserIdSeguido),
    KEY IX_Seguimiento_Seguidor (UserIdSeguidor),
    KEY IX_Seguimiento_Seguido (UserIdSeguido),
    CONSTRAINT FK_Seguimiento_Seguidor FOREIGN KEY (UserIdSeguidor) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Seguimiento_Seguido FOREIGN KEY (UserIdSeguido) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Extiende Usuario (Fase 1) con visibilidad del WhatsApp
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'WhatsappVisibilidad'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN WhatsappVisibilidad ENUM(''publica'',''privada'') NOT NULL DEFAULT ''privada'' AFTER WhatsappNumero',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 003_fase3_publicaciones.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 3a: Publicaciones (Módulo Social — Feed)
-- mysql -u root huellitas < sql/003_fase3_publicaciones.sql

SET NAMES utf8mb4;

-- ============================================================
-- Post
-- ============================================================
CREATE TABLE IF NOT EXISTS Post (
    PostId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId        INT UNSIGNED NOT NULL,
    Texto         TEXT NULL,
    Estado        CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Post_User (UserId),
    KEY IX_Post_Estado (Estado),
    KEY IX_Post_CreatedAt (CreatedAt),
    CONSTRAINT FK_Post_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PostFoto (galería, máx 6 fotos enforced en PHP)
-- ============================================================
CREATE TABLE IF NOT EXISTS PostFoto (
    PostFotoId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PostId        INT UNSIGNED NOT NULL,
    Path          VARCHAR(255) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_PostFoto_Post (PostId),
    CONSTRAINT FK_PostFoto_Post FOREIGN KEY (PostId) REFERENCES Post(PostId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PostReaccion (Like / Me divierte — una sola reacción por usuario y post)
-- ============================================================
CREATE TABLE IF NOT EXISTS PostReaccion (
    PostReaccionId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PostId          INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    Tipo            ENUM('like','me_divierte') NOT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_PostReaccion_User (PostId, UserId),
    KEY IX_PostReaccion_Post (PostId),
    CONSTRAINT FK_PostReaccion_Post FOREIGN KEY (PostId) REFERENCES Post(PostId),
    CONSTRAINT FK_PostReaccion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Conecta Denuncia.PostId (reservado desde Fase 1, siempre NULL hasta ahora)
-- ============================================================
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Post'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Post (PostId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Post'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Post FOREIGN KEY (PostId) REFERENCES Post(PostId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 004_fase3b_noticias.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 3b: Noticias
-- mysql -u root huellitas < sql/004_fase3b_noticias.sql

SET NAMES utf8mb4;

-- ============================================================
-- TipoUsuarioCatalogo (Individual, Refugio/Protectora, ampliable después)
-- ============================================================
CREATE TABLE IF NOT EXISTS TipoUsuarioCatalogo (
    TipoUsuarioId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Codigo        VARCHAR(30) NOT NULL,
    Nombre        VARCHAR(60) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    UNIQUE KEY UQ_TipoUsuario_Codigo (Codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO TipoUsuarioCatalogo (Codigo, Nombre, Orden) VALUES
('individual', 'Individual', 1),
('refugio', 'Refugio / Protectora', 2);

-- ============================================================
-- Usuario.TipoUsuarioId (ALTER guardado, backfill a 'individual', FK guardada)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'TipoUsuarioId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN TipoUsuarioId INT UNSIGNED NULL AFTER Rol',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

UPDATE Usuario
SET TipoUsuarioId = (SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = 'individual')
WHERE TipoUsuarioId IS NULL;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND CONSTRAINT_NAME = 'FK_Usuario_TipoUsuario'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Usuario ADD CONSTRAINT FK_Usuario_TipoUsuario FOREIGN KEY (TipoUsuarioId) REFERENCES TipoUsuarioCatalogo(TipoUsuarioId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_TipoUsuario'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Usuario ADD INDEX IX_Usuario_TipoUsuario (TipoUsuarioId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- NoticiaExterna (agregación de RSS/scraping externo, dedupe por UrlHash)
-- ============================================================
CREATE TABLE IF NOT EXISTS NoticiaExterna (
    NoticiaExternaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Fuente           VARCHAR(40) NOT NULL,
    UrlOriginal      VARCHAR(500) NOT NULL,
    UrlHash          CHAR(64) NOT NULL,
    Titulo           VARCHAR(300) NOT NULL,
    Resumen          TEXT NULL,
    ImagenUrl        VARCHAR(500) NULL,
    PublicadoEn      DATETIME NULL,
    IngestadoEn      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    UNIQUE KEY UQ_NoticiaExterna_UrlHash (UrlHash),
    KEY IX_NoticiaExterna_Fuente (Fuente),
    KEY IX_NoticiaExterna_Publicado (PublicadoEn),
    KEY IX_NoticiaExterna_Estado (Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 005_fase3c_shorts_historias.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 3c: Shorts & Historias
-- mysql -u root huellitas < sql/005_fase3c_shorts_historias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Post.VideoPath / Post.DuracionSegundos (ALTER guardado)
-- Un "Short" = Post WHERE VideoPath IS NOT NULL. Reusa reacciones, follow-
-- gating, denuncia, soft-delete y paginación por cursor ya existentes en Post.
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND COLUMN_NAME = 'VideoPath'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Post ADD COLUMN VideoPath VARCHAR(255) NULL AFTER Texto',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND COLUMN_NAME = 'DuracionSegundos'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Post ADD COLUMN DuracionSegundos SMALLINT UNSIGNED NULL AFTER VideoPath',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- MariaDB 10.4.32: sin índice funcional, KEY simple sobre la columna alcanza
-- para el filtro "WHERE VideoPath IS NOT NULL" de shorts_feed.php.
SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Post' AND INDEX_NAME = 'IX_Post_VideoPath'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Post ADD INDEX IX_Post_VideoPath (VideoPath)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Historia (contenido efímero — ciclo de vida distinto de Post, sin
-- reacciones/comentarios, expira sin necesidad de cron: cada lectura
-- filtra por ExpiraEn > NOW())
-- ============================================================
CREATE TABLE IF NOT EXISTS Historia (
    HistoriaId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    TipoMedia        ENUM('foto','video') NOT NULL,
    MediaPath        VARCHAR(255) NOT NULL,
    DuracionSegundos SMALLINT UNSIGNED NULL,
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ExpiraEn         DATETIME NOT NULL,
    KEY IX_Historia_User (UserId),
    KEY IX_Historia_Expira (ExpiraEn),
    KEY IX_Historia_Estado (Estado),
    CONSTRAINT FK_Historia_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- HistoriaVista (qué usuario ya vio qué historia puntual)
-- ============================================================
CREATE TABLE IF NOT EXISTS HistoriaVista (
    HistoriaVistaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    HistoriaId      INT UNSIGNED NOT NULL,
    UserId          INT UNSIGNED NOT NULL,
    CreatedAt       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_HistoriaVista (HistoriaId, UserId),
    CONSTRAINT FK_HistoriaVista_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId),
    CONSTRAINT FK_HistoriaVista_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.HistoriaId (mismo patrón guardado que Denuncia.PostId en 003)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'HistoriaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN HistoriaId INT UNSIGNED NULL AFTER PostId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Historia'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Historia (HistoriaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Historia'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 006_fase4a_adopcion.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4a: Adopción (formulario dinámico + postulaciones + favoritos)
-- mysql -u root huellitas < sql/006_fase4a_adopcion.sql

SET NAMES utf8mb4;

-- ============================================================
-- Adopcion (listado de un animal en adopción)
-- ============================================================
CREATE TABLE IF NOT EXISTS Adopcion (
    AdopcionId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    Nombre           VARCHAR(60) NOT NULL,
    Sexo             ENUM('macho','hembra') NOT NULL,
    EdadAnios        TINYINT UNSIGNED NULL,
    EdadMeses        TINYINT UNSIGNED NULL,
    Especie          ENUM('perro','gato','otro') NOT NULL,
    RazaId           INT UNSIGNED NULL,
    RazaTexto        VARCHAR(60) NULL,
    Descripcion      TEXT NULL,
    EstadoAdopcion   ENUM('disponible','en_proceso','adoptado') NOT NULL DEFAULT 'disponible',
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Adopcion_User (UserId),
    KEY IX_Adopcion_Estado (Estado),
    KEY IX_Adopcion_EstadoAdopcion (EstadoAdopcion),
    CONSTRAINT FK_Adopcion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Adopcion_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionFoto (galería, máx 6 fotos enforced en PHP)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionFoto (
    AdopcionFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionFoto_Adopcion (AdopcionId),
    CONSTRAINT FK_AdopcionFoto_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPregunta (formulario dinámico armado por el rescatista)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPregunta (
    AdopcionPreguntaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId         INT UNSIGNED NOT NULL,
    Tipo               ENUM('texto','si_no','opcion_multiple') NOT NULL,
    Texto              VARCHAR(255) NOT NULL,
    Orden              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionPregunta_Adopcion (AdopcionId),
    CONSTRAINT FK_AdopcionPregunta_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPreguntaOpcion (solo para Tipo='opcion_multiple')
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPreguntaOpcion (
    AdopcionPreguntaOpcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionPreguntaId       INT UNSIGNED NOT NULL,
    Texto                    VARCHAR(150) NOT NULL,
    Orden                    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_AdopcionPreguntaOpcion_Pregunta (AdopcionPreguntaId),
    CONSTRAINT FK_AdopcionPreguntaOpcion_Pregunta FOREIGN KEY (AdopcionPreguntaId) REFERENCES AdopcionPregunta(AdopcionPreguntaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionPostulacion (un adoptante se postula a un listado — una vez)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionPostulacion (
    AdopcionPostulacionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId            INT UNSIGNED NOT NULL,
    UserId                INT UNSIGNED NOT NULL,
    EstadoRevision        VARCHAR(20) NOT NULL DEFAULT 'pendiente',
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_AdopcionPostulacion (AdopcionId, UserId),
    KEY IX_AdopcionPostulacion_Adopcion (AdopcionId),
    KEY IX_AdopcionPostulacion_User (UserId),
    CONSTRAINT FK_AdopcionPostulacion_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId),
    CONSTRAINT FK_AdopcionPostulacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionRespuesta (respuestas del adoptante a cada pregunta del listado)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionRespuesta (
    AdopcionRespuestaId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionPostulacionId    INT UNSIGNED NOT NULL,
    AdopcionPreguntaId       INT UNSIGNED NOT NULL,
    RespuestaTexto           TEXT NULL,
    AdopcionPreguntaOpcionId INT UNSIGNED NULL,
    KEY IX_AdopcionRespuesta_Postulacion (AdopcionPostulacionId),
    CONSTRAINT FK_AdopcionRespuesta_Postulacion FOREIGN KEY (AdopcionPostulacionId) REFERENCES AdopcionPostulacion(AdopcionPostulacionId),
    CONSTRAINT FK_AdopcionRespuesta_Pregunta FOREIGN KEY (AdopcionPreguntaId) REFERENCES AdopcionPregunta(AdopcionPreguntaId),
    CONSTRAINT FK_AdopcionRespuesta_Opcion FOREIGN KEY (AdopcionPreguntaOpcionId) REFERENCES AdopcionPreguntaOpcion(AdopcionPreguntaOpcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- AdopcionFavorito (corazón — guardar un listado)
-- ============================================================
CREATE TABLE IF NOT EXISTS AdopcionFavorito (
    AdopcionFavoritoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    AdopcionId         INT UNSIGNED NOT NULL,
    UserId             INT UNSIGNED NOT NULL,
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_AdopcionFavorito (AdopcionId, UserId),
    CONSTRAINT FK_AdopcionFavorito_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId),
    CONSTRAINT FK_AdopcionFavorito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.AdopcionId (mismo patrón guardado que Denuncia.HistoriaId en 005)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'AdopcionId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN AdopcionId INT UNSIGNED NULL AFTER HistoriaId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Adopcion'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Adopcion (AdopcionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Adopcion'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Adopcion FOREIGN KEY (AdopcionId) REFERENCES Adopcion(AdopcionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 007_fase4b_campanias.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4b: Campañas (castración/vacunación territorial)
-- mysql -u root huellitas < sql/007_fase4b_campanias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Campania
-- ============================================================
CREATE TABLE IF NOT EXISTS Campania (
    CampaniaId          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId              INT UNSIGNED NOT NULL,
    Tipo                ENUM('castracion','vacunacion') NOT NULL,
    Titulo              VARCHAR(150) NOT NULL,
    Descripcion         TEXT NULL,
    FechaDesde          DATE NOT NULL,
    FechaHasta          DATE NULL,
    ZonaDescripcion     VARCHAR(150) NOT NULL,
    ZonaLat             DECIMAL(10,7) NOT NULL,
    ZonaLng             DECIMAL(10,7) NOT NULL,
    RequiereInscripcion TINYINT(1) NOT NULL DEFAULT 0,
    CupoMaximo          INT UNSIGNED NULL,
    Estado              CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Campania_User (UserId),
    KEY IX_Campania_Estado (Estado),
    KEY IX_Campania_Tipo (Tipo),
    KEY IX_Campania_Fecha (FechaDesde),
    CONSTRAINT FK_Campania_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- CampaniaInscripcion (RSVP simple, sin preguntas dinámicas)
-- ============================================================
CREATE TABLE IF NOT EXISTS CampaniaInscripcion (
    CampaniaInscripcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaId            INT UNSIGNED NOT NULL,
    UserId                INT UNSIGNED NOT NULL,
    CreatedAt             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_CampaniaInscripcion (CampaniaId, UserId),
    KEY IX_CampaniaInscripcion_Campania (CampaniaId),
    CONSTRAINT FK_CampaniaInscripcion_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId),
    CONSTRAINT FK_CampaniaInscripcion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.ExpoPushToken (ALTER guardado) — un solo device por cuenta (MVP)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'ExpoPushToken'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN ExpoPushToken VARCHAR(255) NULL AFTER TipoUsuarioId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Denuncia.CampaniaId (mismo patrón guardado que PostId/HistoriaId/AdopcionId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'CampaniaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN CampaniaId INT UNSIGNED NULL AFTER AdopcionId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Campania'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Campania (CampaniaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Campania'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 008_fase4c_perdidos.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4c: Perdidos & Reencontrados
-- mysql -u root huellitas < sql/008_fase4c_perdidos.sql

SET NAMES utf8mb4;

-- ============================================================
-- Perdido (reporte de mascota perdida o encontrada)
-- ============================================================
CREATE TABLE IF NOT EXISTS Perdido (
    PerdidoId               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId                  INT UNSIGNED NOT NULL,
    Tipo                    ENUM('perdido','encontrado') NOT NULL,
    MascotaId               INT UNSIGNED NULL,
    Nombre                  VARCHAR(60) NULL,
    Sexo                    ENUM('macho','hembra') NULL,
    Especie                 ENUM('perro','gato','otro') NULL,
    RazaId                  INT UNSIGNED NULL,
    RazaTexto               VARCHAR(60) NULL,
    Descripcion             TEXT NULL,
    UltimoLugarDescripcion  VARCHAR(150) NOT NULL,
    UltimoLugarLat          DECIMAL(10,7) NOT NULL,
    UltimoLugarLng          DECIMAL(10,7) NOT NULL,
    FechaSuceso             DATE NOT NULL,
    EstadoPerdido           ENUM('activo','reencontrado') NOT NULL DEFAULT 'activo',
    Estado                  CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Perdido_User (UserId),
    KEY IX_Perdido_Estado (Estado),
    KEY IX_Perdido_EstadoPerdido (EstadoPerdido),
    KEY IX_Perdido_Tipo (Tipo),
    KEY IX_Perdido_Mascota (MascotaId),
    CONSTRAINT FK_Perdido_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Perdido_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Perdido_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- PerdidoFoto (galería propia, solo usada cuando MascotaId IS NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS PerdidoFoto (
    PerdidoFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PerdidoId     INT UNSIGNED NOT NULL,
    Path          VARCHAR(255) NOT NULL,
    Orden         TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_PerdidoFoto_Perdido (PerdidoId),
    CONSTRAINT FK_PerdidoFoto_Perdido FOREIGN KEY (PerdidoId) REFERENCES Perdido(PerdidoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.NotificarProximidad (ALTER guardado) — opt-out de push por
-- cercanía (Campañas y Perdidos comparten esta preferencia).
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'NotificarProximidad'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN NotificarProximidad TINYINT(1) NOT NULL DEFAULT 1 AFTER ExpoPushToken',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- Denuncia.PerdidoId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'PerdidoId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN PerdidoId INT UNSIGNED NULL AFTER CampaniaId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Perdido'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Perdido (PerdidoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Perdido'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Perdido FOREIGN KEY (PerdidoId) REFERENCES Perdido(PerdidoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 009_fase4d_transito.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4d: Tránsito (necesito / ofrezco)
-- mysql -u root huellitas < sql/009_fase4d_transito.sql

SET NAMES utf8mb4;

-- ============================================================
-- Transito (necesita alojamiento temporal / ofrece alojarlo)
-- ============================================================
CREATE TABLE IF NOT EXISTS Transito (
    TransitoId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Tipo              ENUM('necesito','ofrezco') NOT NULL,
    MascotaId         INT UNSIGNED NULL,
    Nombre            VARCHAR(60) NULL,
    Sexo              ENUM('macho','hembra') NULL,
    Especie           ENUM('perro','gato','otro') NULL,
    RazaId            INT UNSIGNED NULL,
    RazaTexto         VARCHAR(60) NULL,
    Descripcion       TEXT NULL,
    DuracionDias      INT UNSIGNED NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Transito_User (UserId),
    KEY IX_Transito_Estado (Estado),
    KEY IX_Transito_Tipo (Tipo),
    KEY IX_Transito_Mascota (MascotaId),
    CONSTRAINT FK_Transito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Transito_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Transito_Raza FOREIGN KEY (RazaId) REFERENCES RazaCatalogo(RazaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- TransitoFoto (galería propia, solo usada cuando MascotaId IS NULL)
-- ============================================================
CREATE TABLE IF NOT EXISTS TransitoFoto (
    TransitoFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    TransitoId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_TransitoFoto_Transito (TransitoId),
    CONSTRAINT FK_TransitoFoto_Transito FOREIGN KEY (TransitoId) REFERENCES Transito(TransitoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.TransitoId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'TransitoId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN TransitoId INT UNSIGNED NULL AFTER PerdidoId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Transito'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Transito (TransitoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Transito'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Transito FOREIGN KEY (TransitoId) REFERENCES Transito(TransitoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 010_fase4e_donaciones.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4e: Donaciones (necesito / ofrezco alimento o insumos)
-- mysql -u root huellitas < sql/010_fase4e_donaciones.sql

SET NAMES utf8mb4;

-- ============================================================
-- Donacion (necesita alimento/insumos / ofrece alimento/insumos)
-- ============================================================
CREATE TABLE IF NOT EXISTS Donacion (
    DonacionId        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Tipo              ENUM('necesito','ofrezco') NOT NULL,
    Categoria         ENUM('alimento','insumo') NOT NULL,
    Descripcion       TEXT NOT NULL,
    Especie           ENUM('perro','gato','otro') NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Donacion_User (UserId),
    KEY IX_Donacion_Estado (Estado),
    KEY IX_Donacion_Tipo (Tipo),
    KEY IX_Donacion_Categoria (Categoria),
    CONSTRAINT FK_Donacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- DonacionFoto (galería propia, siempre opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS DonacionFoto (
    DonacionFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    DonacionId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_DonacionFoto_Donacion (DonacionId),
    CONSTRAINT FK_DonacionFoto_Donacion FOREIGN KEY (DonacionId) REFERENCES Donacion(DonacionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.DonacionId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId/TransitoId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'DonacionId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN DonacionId INT UNSIGNED NULL AFTER TransitoId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Donacion'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Donacion (DonacionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Donacion'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Donacion FOREIGN KEY (DonacionId) REFERENCES Donacion(DonacionId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 011_fase4f_veterinarias.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 4f: Veterinarias Cercanas
-- mysql -u root huellitas < sql/011_fase4f_veterinarias.sql

SET NAMES utf8mb4;

-- ============================================================
-- Veterinaria (directorio público simple, sin cuenta propia de la veterinaria)
-- ============================================================
CREATE TABLE IF NOT EXISTS Veterinaria (
    VeterinariaId     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId            INT UNSIGNED NOT NULL,
    Nombre            VARCHAR(150) NOT NULL,
    Descripcion       TEXT NULL,
    Telefono          VARCHAR(30) NULL,
    WhatsappNumero    VARCHAR(30) NULL,
    Horario           VARCHAR(150) NULL,
    ZonaDescripcion   VARCHAR(150) NOT NULL,
    ZonaLat           DECIMAL(10,7) NOT NULL,
    ZonaLng           DECIMAL(10,7) NOT NULL,
    Estado            CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Veterinaria_User (UserId),
    KEY IX_Veterinaria_Estado (Estado),
    CONSTRAINT FK_Veterinaria_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- VeterinariaFoto (galería propia, siempre opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS VeterinariaFoto (
    VeterinariaFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    VeterinariaId     INT UNSIGNED NOT NULL,
    Path              VARCHAR(255) NOT NULL,
    Orden             TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_VeterinariaFoto_Veterinaria (VeterinariaId),
    CONSTRAINT FK_VeterinariaFoto_Veterinaria FOREIGN KEY (VeterinariaId) REFERENCES Veterinaria(VeterinariaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.VeterinariaId (mismo patrón guardado que PostId/HistoriaId/AdopcionId/CampaniaId/PerdidoId/TransitoId/DonacionId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'VeterinariaId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN VeterinariaId INT UNSIGNED NULL AFTER DonacionId',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Veterinaria'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Veterinaria (VeterinariaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Veterinaria'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Veterinaria FOREIGN KEY (VeterinariaId) REFERENCES Veterinaria(VeterinariaId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 012_fase5_match.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 5: Match de Mascotas
-- mysql -u root huellitas < sql/012_fase5_match.sql

SET NAMES utf8mb4;

-- ============================================================
-- MascotaMatchSwipe (like/pass de una mascota propia sobre una candidata)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaMatchSwipe (
    SwipeId           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaIdOrigen   INT UNSIGNED NOT NULL,
    MascotaIdDestino  INT UNSIGNED NOT NULL,
    Direccion         ENUM('like','pass') NOT NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Swipe (MascotaIdOrigen, MascotaIdDestino),
    KEY IX_Swipe_Destino (MascotaIdDestino),
    CONSTRAINT FK_Swipe_Origen FOREIGN KEY (MascotaIdOrigen) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Swipe_Destino FOREIGN KEY (MascotaIdDestino) REFERENCES Mascota(MascotaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MascotaMatch (match mutuo entre dos mascotas — MascotaIdA < MascotaIdB siempre)
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaMatch (
    MatchId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaIdA   INT UNSIGNED NOT NULL,
    MascotaIdB   INT UNSIGNED NOT NULL,
    UserIdA      INT UNSIGNED NOT NULL,
    UserIdB      INT UNSIGNED NOT NULL,
    Estado       CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_Match (MascotaIdA, MascotaIdB),
    KEY IX_Match_UserA (UserIdA),
    KEY IX_Match_UserB (UserIdB),
    CONSTRAINT FK_Match_MascotaA FOREIGN KEY (MascotaIdA) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_Match_MascotaB FOREIGN KEY (MascotaIdB) REFERENCES Mascota(MascotaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MatchMensaje (chat interno 1:1 asociado a un match)
-- ============================================================
CREATE TABLE IF NOT EXISTS MatchMensaje (
    MensajeId     INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MatchId       INT UNSIGNED NOT NULL,
    UserIdEmisor  INT UNSIGNED NOT NULL,
    Texto         VARCHAR(1000) NOT NULL,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Mensaje_Match (MatchId, MensajeId),
    CONSTRAINT FK_Mensaje_Match FOREIGN KEY (MatchId) REFERENCES MascotaMatch(MatchId),
    CONSTRAINT FK_Mensaje_Usuario FOREIGN KEY (UserIdEmisor) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MatchWhatsappConsentimiento (consentimiento mutuo para revelar WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS MatchWhatsappConsentimiento (
    MatchId    INT UNSIGNED NOT NULL,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MatchId, UserId),
    CONSTRAINT FK_Consent_Match FOREIGN KEY (MatchId) REFERENCES MascotaMatch(MatchId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 013_fase6a_suscripcion.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 014_fase6b_productos.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 6b: Catálogo de Producto/Servicio (E-Commerce PetShop/PetServices)
-- mysql -u root huellitas < sql/014_fase6b_productos.sql

SET NAMES utf8mb4;

-- ============================================================
-- ProductoCategoriaCatalogo (catálogo plano, mismo shape que TipoUsuarioCatalogo)
-- ============================================================
CREATE TABLE IF NOT EXISTS ProductoCategoriaCatalogo (
    CategoriaId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    Codigo       VARCHAR(40) NOT NULL UNIQUE,
    Nombre       VARCHAR(60) NOT NULL,
    Orden        TINYINT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO ProductoCategoriaCatalogo (Codigo, Nombre, Orden) VALUES
    ('alimento', 'Alimento', 1),
    ('accesorios', 'Accesorios', 2),
    ('higiene', 'Higiene', 3),
    ('juguetes', 'Juguetes', 4),
    ('salud', 'Salud', 5),
    ('adiestramiento', 'Adiestramiento', 6),
    ('paseo', 'Paseo', 7),
    ('peluqueria', 'Peluquería', 8),
    ('hospedaje', 'Hospedaje', 9),
    ('otros', 'Otros', 10);

-- ============================================================
-- Producto (listado C2C de venta — producto o servicio, sin duplicidad necesito/ofrezco)
-- ============================================================
CREATE TABLE IF NOT EXISTS Producto (
    ProductoId       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId           INT UNSIGNED NOT NULL,
    TipoListado      ENUM('producto','servicio') NOT NULL,
    CategoriaId      INT UNSIGNED NOT NULL,
    Nombre           VARCHAR(150) NOT NULL,
    Descripcion      TEXT NULL,
    Precio           DECIMAL(10,2) NOT NULL,
    Cantidad         INT UNSIGNED NOT NULL DEFAULT 1,
    Especie          ENUM('perro','gato','otro') NULL,
    ZonaDescripcion  VARCHAR(150) NOT NULL,
    ZonaLat          DECIMAL(10,7) NOT NULL,
    ZonaLng          DECIMAL(10,7) NOT NULL,
    Estado           CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Producto_User (UserId),
    KEY IX_Producto_Categoria (CategoriaId),
    KEY IX_Producto_Estado (Estado),
    CONSTRAINT FK_Producto_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Producto_Categoria FOREIGN KEY (CategoriaId) REFERENCES ProductoCategoriaCatalogo(CategoriaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ProductoFoto (galería propia, siempre opcional)
-- ============================================================
CREATE TABLE IF NOT EXISTS ProductoFoto (
    ProductoFotoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ProductoId     INT UNSIGNED NOT NULL,
    Path           VARCHAR(255) NOT NULL,
    Orden          TINYINT UNSIGNED NOT NULL DEFAULT 0,
    KEY IX_ProductoFoto_Producto (ProductoId),
    CONSTRAINT FK_ProductoFoto_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- ProductoFavorito (mismo patrón idempotente que AdopcionFavorito)
-- ============================================================
CREATE TABLE IF NOT EXISTS ProductoFavorito (
    ProductoFavoritoId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ProductoId         INT UNSIGNED NOT NULL,
    UserId             INT UNSIGNED NOT NULL,
    CreatedAt          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_ProductoFavorito (ProductoId, UserId),
    CONSTRAINT FK_ProductoFavorito_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId),
    CONSTRAINT FK_ProductoFavorito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Denuncia.ProductoId (mismo patrón guardado que ...VeterinariaId)
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'ProductoId'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Denuncia ADD COLUMN ProductoId INT UNSIGNED NULL AFTER VeterinariaId',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND INDEX_NAME = 'IX_Denuncia_Producto'
);
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE Denuncia ADD INDEX IX_Denuncia_Producto (ProductoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND CONSTRAINT_NAME = 'FK_Denuncia_Producto'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE Denuncia ADD CONSTRAINT FK_Denuncia_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 015_fase6c_carrito_pedido.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 6c: Carrito + Pedido + Comisión real vía Mercado Pago Marketplace
-- mysql -u root huellitas < sql/015_fase6c_carrito_pedido.sql

SET NAMES utf8mb4;

-- ============================================================
-- UsuarioMpCuenta (vinculación OAuth de la cuenta de Mercado Pago del vendedor)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioMpCuenta (
    UserId        INT UNSIGNED PRIMARY KEY,
    MpUserId      VARCHAR(60) NOT NULL,
    MpEmail       VARCHAR(150) NULL,
    AccessToken   TEXT NOT NULL,
    RefreshToken  TEXT NULL,
    ExpiresAt     DATETIME NULL,
    ConectadoEn   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_MpCuenta_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- UsuarioMpOauthPendiente (state de un flujo OAuth iniciado, un solo uso)
-- ============================================================
CREATE TABLE IF NOT EXISTS UsuarioMpOauthPendiente (
    State      VARCHAR(64) PRIMARY KEY,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_OauthPendiente_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Carrito / CarritoItem (uno activo por usuario)
-- ============================================================
CREATE TABLE IF NOT EXISTS Carrito (
    CarritoId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    UserId     INT UNSIGNED NOT NULL UNIQUE,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT FK_Carrito_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CarritoItem (
    CarritoItemId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CarritoId      INT UNSIGNED NOT NULL,
    ProductoId     INT UNSIGNED NOT NULL,
    Cantidad       INT UNSIGNED NOT NULL DEFAULT 1,
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY UQ_CarritoItem (CarritoId, ProductoId),
    CONSTRAINT FK_CarritoItem_Carrito FOREIGN KEY (CarritoId) REFERENCES Carrito(CarritoId),
    CONSTRAINT FK_CarritoItem_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Pedido / PedidoItem (un vendedor por pedido — el checkout separa el carrito)
-- ============================================================
CREATE TABLE IF NOT EXISTS Pedido (
    PedidoId            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CompradorUserId     INT UNSIGNED NOT NULL,
    VendedorUserId      INT UNSIGNED NOT NULL,
    MontoProductos      DECIMAL(10,2) NOT NULL,
    PorcentajeComision  DECIMAL(5,2) NOT NULL,
    MontoComision       DECIMAL(10,2) NOT NULL,
    MontoVendedor       DECIMAL(10,2) NOT NULL,
    MetodoPago          ENUM('mercadopago','coordinar') NOT NULL,
    MpPreferenceId      VARCHAR(60) NULL,
    MpPaymentId         VARCHAR(60) NULL,
    Estado              ENUM('pendiente','pagado','coordinando','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY IX_Pedido_Comprador (CompradorUserId),
    KEY IX_Pedido_Vendedor (VendedorUserId),
    CONSTRAINT FK_Pedido_Comprador FOREIGN KEY (CompradorUserId) REFERENCES Usuario(UserId),
    CONSTRAINT FK_Pedido_Vendedor FOREIGN KEY (VendedorUserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS PedidoItem (
    PedidoItemId    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PedidoId        INT UNSIGNED NOT NULL,
    ProductoId      INT UNSIGNED NOT NULL,
    NombreProducto  VARCHAR(150) NOT NULL,
    PrecioUnitario  DECIMAL(10,2) NOT NULL,
    Cantidad        INT UNSIGNED NOT NULL,
    CONSTRAINT FK_PedidoItem_Pedido FOREIGN KEY (PedidoId) REFERENCES Pedido(PedidoId),
    CONSTRAINT FK_PedidoItem_Producto FOREIGN KEY (ProductoId) REFERENCES Producto(ProductoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 016_fase6d_comprobantes.sql
-- -----------------------------------------------------------------------------

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

