-- =============================================================================
-- Red Huellitas — schema completo (001 … 043)
--
-- ARCHIVO GENERADO — no editar a mano.
-- Se regenera con:  php inc/cli/build_schema.php
-- Si agregás una migración a sql/, volvé a correr eso y commiteá el resultado.
--
-- Última generación: 2026-07-28  ·  Migraciones incluidas: 43
--
-- Sirve para crear la base desde cero con la versión final del esquema:
--   mysql --default-character-set=utf8mb4 -u root < sql/000_todo_schema.sql
--
-- ⚠️ Correr SIEMPRE con --default-character-set=utf8mb4. El cliente de MySQL
--    asume latin1 y sin eso los acentos de los seeds entran rotos.
-- =============================================================================

CREATE DATABASE IF NOT EXISTS huellitas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas;

SET NAMES utf8mb4;

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
('perro','Sin raza'),
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
('gato','Sin raza'),
('gato','Mestizo / Común Europeo'),
('gato','Atigrado Marrón'),
('gato','Atigrado Gris'),
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


-- -----------------------------------------------------------------------------
-- 017_fase7_minijuego.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 7a: Minijuego "Pet Society" (Tamagotchi con la mascota propia)
-- mysql -u root huellitas < sql/017_fase7_minijuego.sql
-- Idempotente: se puede correr más de una vez sin error.

SET NAMES utf8mb4;

-- ============================================================
-- MascotaJuego — estado de juego de una mascota (1:1 con Mascota)
--
-- Los 4 stats se guardan junto a StatsActualizadoEn, y el valor REAL se
-- deriva al leer descontando el tiempo transcurrido. La fila no se toca
-- salvo que el usuario haga una acción — mismo criterio que Historias
-- ("no hay cron, la expiración es puramente a nivel de query").
--
-- Por decisión de producto la mascota NUNCA muere ni se enferma: los stats
-- tienen piso en 0 y de ahí sale un ánimo "decaído", nada más. El avatar es
-- la foto de una mascota real, en una app de bienestar animal.
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaJuego (
    MascotaId           INT UNSIGNED PRIMARY KEY,
    UserId              INT UNSIGNED NOT NULL,

    Hambre              TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Felicidad           TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Energia             TINYINT UNSIGNED NOT NULL DEFAULT 100,
    Higiene             TINYINT UNSIGNED NOT NULL DEFAULT 100,
    StatsActualizadoEn  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Cooldown por acción: cuándo se usó cada una por última vez.
    UltimoAlimentar     DATETIME NULL,
    UltimoJugar         DATETIME NULL,
    UltimoBanar         DATETIME NULL,
    UltimoDormir        DATETIME NULL,

    -- Progresión
    Nivel               SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    Experiencia         INT UNSIGNED NOT NULL DEFAULT 0,
    RachaDias           SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    UltimaVisita        DATE NULL,

    -- Enganche para Fase 7b (avatar generado por IA). Si tiene algo, se usa
    -- en lugar de la foto real de la mascota. Nada más del juego cambia.
    AvatarPath          VARCHAR(255) NULL,

    CreatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY IX_MascotaJuego_User (UserId),
    CONSTRAINT FK_MascotaJuego_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_MascotaJuego_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Usuario.NotificarJuego — opt-out de los recordatorios del minijuego.
-- Propio, no reusa NotificarProximidad (que es sólo para avisos por cercanía
-- geográfica). Mismo patrón que el ALTER guardado de 008.
-- ============================================================
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'NotificarJuego'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN NotificarJuego TINYINT(1) NOT NULL DEFAULT 1 AFTER NotificarProximidad',
    'SELECT 1'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 018_fase7b_avatar_ia.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — Fase 7b: Avatar de la mascota generado por IA
-- mysql -u root huellitas < sql/018_fase7b_avatar_ia.sql
-- Idempotente: se puede correr más de una vez sin error.

SET NAMES utf8mb4;

-- ============================================================
-- MascotaAvatarGeneracion — log de generaciones de avatar.
--
-- Sirve para dos cosas: contar el consumo (la cuota gratuita de Gemini es
-- global de la app, no por usuario, así que hay que limitar de los dos lados)
-- y poder auditar qué se generó y por qué falló.
--
-- Los intentos fallidos se registran con Exito = 0 pero NO consumen cuota.
--
-- No hace falta tocar MascotaJuego: la columna AvatarPath ya existe desde 7a,
-- justamente como enganche para esta fase.
-- ============================================================
CREATE TABLE IF NOT EXISTS MascotaAvatarGeneracion (
    GeneracionId  INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    MascotaId     INT UNSIGNED NOT NULL,
    UserId        INT UNSIGNED NOT NULL,
    Exito         TINYINT(1) NOT NULL DEFAULT 0,
    Detalle       VARCHAR(255) NULL,
    CreatedAt     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Los dos índices cubren las dos consultas de cuota: por usuario en el día
    -- y global en el día.
    KEY IX_AvatarGen_User_Fecha (UserId, CreatedAt),
    KEY IX_AvatarGen_Fecha (CreatedAt),

    CONSTRAINT FK_AvatarGen_Mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId),
    CONSTRAINT FK_AvatarGen_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 019_password_reset.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 020_verificacion_auto.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Verificación automática (Gemini + opcional Renaper/SID facial)
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/020_verificacion_auto.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué esto está guardado columna por columna.
--
-- Estas 8 columnas nacieron acá, pero después `001_fase1_schema`
-- se editó y las incluyó en su CREATE TABLE. Resultado: en una
-- base nueva 001 ya las crea y este archivo fallaba con
-- "Duplicate column name 'AutoScore'", cortando la instalación
-- desde cero por la mitad.
--
-- No alcanza con borrar este archivo: las bases creadas ANTES de
-- aquella edición de 001 no tienen las columnas y necesitan este
-- ALTER. Guardando cada una, el archivo sirve para los dos casos
-- y no molesta en ninguno.
-- ------------------------------------------------------------

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoScore');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoScore DECIMAL(4,3) NULL AFTER MotivoRechazo', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'FaceMatchScore');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN FaceMatchScore DECIMAL(4,3) NULL AFTER AutoScore', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoMetodo');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoMetodo VARCHAR(40) NULL AFTER FaceMatchScore', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoDetalle');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoDetalle TEXT NULL AFTER AutoMetodo', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'DniNumeroExtraido');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN DniNumeroExtraido VARCHAR(20) NULL AFTER AutoDetalle', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'NombreExtraido');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN NombreExtraido VARCHAR(150) NULL AFTER DniNumeroExtraido', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'KycExternoId');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN KycExternoId VARCHAR(100) NULL AFTER NombreExtraido', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'KycEstado');
SET @sql = IF(@c = 0, 'ALTER TABLE UsuarioVerificacion ADD COLUMN KycEstado VARCHAR(40) NULL AFTER KycExternoId', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 021_moderacion.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 022_historia_overlay.sql
-- -----------------------------------------------------------------------------

-- Overlay de editor de historias (filtros / texto / dibujo) renderizado en el visor.
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'OverlayJson'
);
SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN OverlayJson TEXT NULL AFTER DuracionSegundos',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 023_historias_cadenas.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Historias: Cadenas, recorte de video e interactivos
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Recorte no destructivo + silenciado.
--
-- No se re-encodea el video: se guarda el tramo elegido y el
-- reproductor arranca y corta ahí. ffmpeg-kit-react-native fue
-- retirado y las alternativas exigen build nativo, que rompería
-- la verificación en browser. Para algo que vence a las 24hs no
-- vale la pena: el archivo pesa igual pero la historia dura lo
-- que el usuario eligió.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'RecorteInicioSeg');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN RecorteInicioSeg DECIMAL(6,2) NULL AFTER DuracionSegundos',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'RecorteFinSeg');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN RecorteFinSeg DECIMAL(6,2) NULL AFTER RecorteInicioSeg',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'SinAudio');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN SinAudio TINYINT(1) NOT NULL DEFAULT 0 AFTER RecorteFinSeg',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Cadena
--
-- Alguien propone un tema ("Chapuzón") y sube su historia; el
-- resto la continúa con la suya. Es lo que diferencia esto de
-- Instagram, donde cada historia es una isla.
--
-- LA CADENA NO EXPIRA aunque sus historias sí (vencen a las
-- 24hs como cualquier otra). Si la cadena muriera con su primera
-- historia nadie llegaría a sumarse, y el feature no tendría
-- sentido. Queda viva mostrando las historias vigentes que
-- tenga, y una cadena sin historias vigentes puede reactivarse
-- — así "Chapuzón" puede volver cada verano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Cadena (
    CadenaId       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    CreadorUserId  INT UNSIGNED NOT NULL,
    Tema           VARCHAR(60) NOT NULL,
    Descripcion    VARCHAR(200) NULL,
    Estado         CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_Cadena_Creador (CreadorUserId),
    KEY IX_Cadena_Estado (Estado, CadenaId),
    CONSTRAINT FK_Cadena_Usuario FOREIGN KEY (CreadorUserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Se llena al publicar una historia en la cadena. La PK compuesta
-- hace que sumarse dos veces no duplique: se es participante o no.
CREATE TABLE IF NOT EXISTS CadenaParticipante (
    CadenaId   INT UNSIGNED NOT NULL,
    UserId     INT UNSIGNED NOT NULL,
    CreatedAt  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CadenaId, UserId),
    KEY IX_CadenaParticipante_User (UserId),
    CONSTRAINT FK_CadenaParticipante_Cadena FOREIGN KEY (CadenaId) REFERENCES Cadena(CadenaId),
    CONSTRAINT FK_CadenaParticipante_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CadenaInvitacion (
    CadenaId          INT UNSIGNED NOT NULL,
    UserId            INT UNSIGNED NOT NULL,
    InvitadoPorUserId INT UNSIGNED NOT NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (CadenaId, UserId),
    CONSTRAINT FK_CadenaInvitacion_Cadena FOREIGN KEY (CadenaId) REFERENCES Cadena(CadenaId),
    CONSTRAINT FK_CadenaInvitacion_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'CadenaId');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN CadenaId INT UNSIGNED NULL AFTER SinAudio, ADD KEY IX_Historia_Cadena (CadenaId)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Stickers interactivos: encuesta y caja de preguntas.
--
-- La POSICIÓN del sticker vive en Historia.OverlayJson (junto al
-- texto y el dibujo); acá van sólo los datos y los votos, que
-- necesitan integridad y consultas propias.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS HistoriaEncuesta (
    EncuestaId  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    Pregunta    VARCHAR(120) NOT NULL,
    OpcionA     VARCHAR(40) NOT NULL,
    OpcionB     VARCHAR(40) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaEncuesta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaEncuesta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- PK compuesta: un voto por usuario. Cambiar de opción actualiza
-- la fila, no agrega otra.
CREATE TABLE IF NOT EXISTS HistoriaEncuestaVoto (
    EncuestaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Opcion      CHAR(1) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (EncuestaId, UserId),
    CONSTRAINT FK_HistoriaEncuestaVoto_Encuesta FOREIGN KEY (EncuestaId) REFERENCES HistoriaEncuesta(EncuestaId),
    CONSTRAINT FK_HistoriaEncuestaVoto_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS HistoriaPregunta (
    PreguntaId  INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    Texto       VARCHAR(120) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaPregunta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaPregunta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS HistoriaPreguntaRespuesta (
    RespuestaId INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    PreguntaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(300) NOT NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaPreguntaRespuesta_Pregunta (PreguntaId),
    CONSTRAINT FK_HPR_Pregunta FOREIGN KEY (PreguntaId) REFERENCES HistoriaPregunta(PreguntaId),
    CONSTRAINT FK_HPR_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Responder directo al autor de una historia.
CREATE TABLE IF NOT EXISTS HistoriaRespuesta (
    RespuestaId INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    HistoriaId  INT UNSIGNED NOT NULL,
    UserId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(500) NOT NULL,
    LeidaEn     DATETIME NULL,
    CreatedAt   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY IX_HistoriaRespuesta_Historia (HistoriaId),
    CONSTRAINT FK_HistoriaRespuesta_Historia FOREIGN KEY (HistoriaId) REFERENCES Historia(HistoriaId),
    CONSTRAINT FK_HistoriaRespuesta_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- La lista de espectadores ordena por más reciente primero.
SET @ix_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HistoriaVista' AND INDEX_NAME = 'IX_HistoriaVista_Historia_Fecha');
SET @sql = IF(@ix_exists = 0,
    'CREATE INDEX IX_HistoriaVista_Historia_Fecha ON HistoriaVista (HistoriaId, CreatedAt)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 024_historias_velocidad.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Historias: velocidad de reproducción (cámara lenta / rápida)
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Velocidad, igual que el recorte: no se toca el archivo.
--
-- En TikTok la velocidad se elige ANTES de grabar y queda
-- horneada en el video. Acá se guarda el factor y el reproductor
-- lo aplica, que para el que mira es idéntico: grabar 10s a 2x
-- se ve en 5s igual que si se hubiera re-encodeado. La ventaja
-- es que no hace falta build nativo (ver 023 y el porqué de
-- ffmpeg-kit), y que el autor puede cambiar de idea en el editor
-- sin volver a grabar.
--
-- 0.50 = cámara lenta, 1.00 = normal, 2.00 = cámara rápida.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Historia' AND COLUMN_NAME = 'VelocidadReproduccion');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Historia ADD COLUMN VelocidadReproduccion DECIMAL(3,2) NOT NULL DEFAULT 1.00 AFTER SinAudio',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 025_privacidad.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 026_notificaciones.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Centro de notificaciones
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Hasta ahora los avisos salían sólo por push (rh_enviar_push)
-- y no se guardaban en ningún lado: si el celular estaba
-- apagado o el token vencido, la notificación no existió nunca.
-- Con esta tabla el push pasa a ser el aviso y esta fila, el
-- registro.
--
-- `Ruta` es el destino en la app (ej. /(app)/adopcion/12), para
-- que tocar la notificación lleve a algún lado.
--
-- `MascotaId` es lo que permite el pedido de agrupar por animal:
-- las notificaciones que nacen de una mascota se cuentan aparte
-- y se muestran dentro de esa mascota.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Notificacion (
    NotificacionId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    UserId INT UNSIGNED NOT NULL,
    Tipo VARCHAR(40) NOT NULL,
    Titulo VARCHAR(120) NOT NULL,
    Cuerpo VARCHAR(255) NOT NULL,
    Ruta VARCHAR(160) NULL,
    ActorUserId INT UNSIGNED NULL,
    MascotaId INT UNSIGNED NULL,
    Leida TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (NotificacionId),
    KEY idx_user_leida (UserId, Leida, NotificacionId),
    KEY idx_user_mascota (UserId, MascotaId, Leida),
    CONSTRAINT fk_notif_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor FOREIGN KEY (ActorUserId) REFERENCES Usuario(UserId) ON DELETE SET NULL,
    CONSTRAINT fk_notif_mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 027_chat.sql
-- -----------------------------------------------------------------------------

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


-- -----------------------------------------------------------------------------
-- 028_cuidados.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Recomendaciones de cuidados por especie
-- Idempotente: se puede correr más de una vez sin error.
--
-- ⚠️ CORRER CON --default-character-set=utf8mb4
--     mysql -u root --default-character-set=utf8mb4 huellitas < 028_cuidados.sql
--
-- Sin eso el cliente de MySQL asume latin1 y todos los acentos entran
-- rotos ("Cu├íntas veces por d├¡a"). El archivo está en UTF-8; el que
-- traduce mal es el cliente, no la base.
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS CuidadoRecomendacion (
    CuidadoId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Especie ENUM('perro','gato','otro') NOT NULL,
    Categoria ENUM('alimentacion','higiene','salud','ejercicio','convivencia') NOT NULL,
    Titulo VARCHAR(120) NOT NULL,
    Resumen VARCHAR(200) NOT NULL,
    Cuerpo TEXT NOT NULL,
    Orden INT NOT NULL DEFAULT 0,
    Estado CHAR(1) NOT NULL DEFAULT 'A',
    PRIMARY KEY (CuidadoId),
    UNIQUE KEY uq_cuidado (Especie, Categoria, Titulo),
    KEY idx_especie (Especie, Estado, Orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Contenido semilla.
--
-- El único por (Especie, Categoria, Titulo) hace que re-correr la
-- migración no duplique nada, y el INSERT IGNORE que no falle.
--
-- Es contenido general y de sentido común a propósito: la app no da
-- diagnósticos ni dosis. Donde hace falta un profesional, el texto lo
-- dice y manda a la veterinaria.
-- ------------------------------------------------------------
INSERT IGNORE INTO CuidadoRecomendacion (Especie, Categoria, Titulo, Resumen, Cuerpo, Orden) VALUES
('perro','alimentacion','Cuántas veces por día darle de comer','Los cachorros comen más seguido que los adultos.','Hasta los 4 meses, tres o cuatro comidas por día. De los 4 a los 12 meses, dos o tres. De adulto, dos comidas alcanzan y ayudan a evitar el hambre nocturna.\n\nDejá siempre agua fresca disponible. Si cambiás de alimento, hacelo de a poco durante una semana mezclando el nuevo con el viejo: un cambio de golpe suele terminar en diarrea.',1),
('perro','alimentacion','Alimentos que no puede comer','Hay comida nuestra que para un perro es tóxica.','Nunca le des chocolate, uva ni pasas de uva, cebolla, ajo, palta, alcohol ni nada con xilitol (un endulzante común en chicles y golosinas sin azúcar). Tampoco huesos cocidos: se astillan y pueden perforar el intestino.\n\nSi comió algo de esto, no esperes a ver si le hace mal: llamá a una veterinaria.',2),
('perro','higiene','Cada cuánto bañarlo','Bañarlo de más le arruina la piel.','Un baño por mes suele ser suficiente, o cada dos si no se ensucia mucho. Bañarlo todas las semanas le saca la grasa natural que protege la piel y termina en picazón y caspa.\n\nUsá shampoo para perros: el nuestro tiene un pH que no les sirve. Secalo bien, sobre todo en las orejas.',1),
('perro','higiene','Uñas, orejas y dientes','Lo que se olvida y termina en el veterinario.','Las uñas se cortan cuando se escuchan contra el piso al caminar. Cortá de a poco, lejos de la parte rosada.\n\nLas orejas se revisan una vez por semana: si hay olor fuerte, cera oscura o se rasca mucho, es consulta veterinaria.\n\nLos dientes se cepillan con pasta para perros. El sarro no es estético: termina en infecciones que afectan el corazón y los riñones.',2),
('perro','salud','Vacunas y desparasitación','El calendario que no conviene atrasar.','El plan arranca a las 6-8 semanas y sigue con refuerzos cada 3-4 semanas hasta los 4 meses. Después, refuerzo anual. La antirrábica es obligatoria en la mayoría de los municipios.\n\nLa desparasitación interna se repite según edad y ambiente; la externa (pulgas y garrapatas) es todo el año, no sólo en verano.\n\nEl calendario exacto lo arma la veterinaria según dónde vivís.',1),
('perro','salud','Señales de que algo anda mal','Cuándo dejar de esperar y consultar.','Consultá sin demora si ves: decaimiento que dura más de un día, no comer por más de 24 horas, vómitos o diarrea repetidos, panza dura e hinchada, dificultad para respirar, encías pálidas o azuladas, o intentos de vomitar sin resultado.\n\nEsto último, sobre todo en perros grandes y de pecho profundo, puede ser torsión gástrica: es una urgencia de minutos, no de horas.',2),
('perro','ejercicio','Cuánto paseo necesita','No todos los perros necesitan lo mismo.','Como piso, dos salidas diarias. Las razas de trabajo y los perros jóvenes necesitan bastante más, y sin eso aparecen los destrozos y los ladridos: casi siempre son aburrimiento, no maldad.\n\nEn verano, paseos temprano o de noche: el asfalto caliente les quema las almohadillas. Si no podés apoyar la mano cinco segundos, no puede caminar ahí.',1),
('perro','convivencia','Llegar a una casa nueva','Los primeros días definen mucho.','Dale un lugar propio y tranquilo, y no lo abrumes con visitas la primera semana. Las rutinas fijas de comida y paseo lo ordenan más rápido que cualquier premio.\n\nSi hay otros animales, presentalos de a poco y en territorio neutral. Si hay chicos, enseñales a no molestarlo mientras come o duerme.',1),
('gato','alimentacion','Comida y agua','El gato bebe menos de lo que necesita.','Dejá comida seca disponible y sumá húmeda: es la forma más simple de que tome agua sin darse cuenta, y previene problemas urinarios que en gatos son muy frecuentes.\n\nEl bebedero lejos del comedero (en la naturaleza no beben donde comen) y mejor si es una fuente con agua en movimiento.',1),
('gato','alimentacion','Nada de leche','La leche de vaca les cae mal.','La mayoría de los gatos adultos no digiere la lactosa: la leche de vaca les da diarrea. La imagen del gato con el platito de leche es de las cosas más instaladas y más equivocadas.\n\nTampoco cebolla, ajo, chocolate ni atún en lata de forma habitual.',2),
('gato','higiene','La bandeja sanitaria','La causa número uno de que haga fuera.','La regla es una bandeja por gato más una. Lejos de la comida, en un lugar tranquilo y con salida a la vista: si se siente acorralado, no la usa.\n\nSe limpia todos los días. Si de golpe empieza a hacer fuera de la bandeja, antes de retarlo consultá: muchas veces es dolor al orinar, no un capricho.',1),
('gato','higiene','Cepillado y bolas de pelo','Se cepilla más de lo que se baña.','Los gatos se bañan solos; salvo caso puntual, no necesitan baño. Lo que sí necesitan es cepillado, sobre todo los de pelo largo: lo que no sacás con el cepillo se lo traga y termina en bolas de pelo.\n\nVomitar pelo de vez en cuando es normal; hacerlo seguido, o hacer arcadas sin sacar nada, no lo es.',2),
('gato','salud','Vacunas y castración','Lo básico que alarga la vida.','La triple felina y la antirrábica son el piso, con refuerzo anual. Si sale al exterior, consultá también por leucemia felina.\n\nLa castración evita camadas no deseadas y baja mucho el riesgo de tumores mamarios y de infecciones uterinas, además de las peleas y las escapadas.',1),
('gato','salud','Señales de alarma','Los gatos disimulan el dolor.','Consultá si: deja de comer más de un día, se esconde de golpe, respira con la boca abierta, orina poco o con esfuerzo, o baja de peso sin explicación.\n\nUn gato macho que va y viene a la bandeja sin poder orinar es una urgencia de horas: la obstrucción urinaria puede ser mortal.',2),
('gato','ejercicio','Jugar y trepar','Un gato aburrido se pone gordo o ansioso.','Diez o quince minutos de juego con caña o señuelo, dos veces por día, cambian el carácter de un gato. Terminá siempre dejándolo "cazar" el juguete: quedarse sin atrapar nada lo frustra.\n\nSumá altura: repisas, rascadores altos o el techo de un mueble. Para un gato, el espacio se mide para arriba, no en metros cuadrados.',1),
('gato','convivencia','Rascar es normal','No se le saca, se le redirige.','Rascar les marca territorio y les mantiene las uñas. No se corrige retándolo: se le da un rascador firme y alto, al lado de donde ya rasca, y se lo premia cuando lo usa.\n\nLa amputación de uñas está prohibida en muchos países y es una mutilación: nunca es una opción.',1),
('otro','alimentacion','Cada especie come distinto','Lo que sirve para un perro no sirve para un conejo.','Los conejos y cobayos necesitan heno disponible todo el día: es lo que les desgasta los dientes, que crecen toda la vida. El pellet es un complemento, no la base.\n\nLos cobayos además no fabrican vitamina C y hay que dársela.\n\nAntes de decidir la dieta de un animal que no es perro ni gato, consultá con una veterinaria de exóticos: la información suelta de internet suele estar mal.',1),
('otro','salud','Veterinaria de exóticos','No cualquier clínica atiende cualquier especie.','Conejos, aves, roedores y reptiles necesitan profesionales con formación específica. Buscá y guardá el contacto ANTES de tener una urgencia: a las tres de la mañana no es momento de averiguar quién atiende.\n\nEstas especies esconden los síntomas hasta que están muy comprometidas: cualquier cambio de conducta o de apetito ya es motivo de consulta.',1),
('otro','convivencia','El espacio importa más de lo que parece','Las jaulas de venta suelen ser demasiado chicas.','La mayoría de las jaulas que se venden son el mínimo para transportar, no para vivir. Un conejo necesita varias horas fuera por día; un ave, poder desplegar las alas del todo.\n\nUn animal en un espacio insuficiente desarrolla conductas repetitivas y problemas de huesos y músculos.',1);


-- -----------------------------------------------------------------------------
-- 029_razas_sin_raza_atigrados.sql
-- -----------------------------------------------------------------------------

-- "Sin raza" primero en perro/gato + atigrados en gatos
-- mysql -u root huellitas < sql/029_razas_sin_raza_atigrados.sql

SET NAMES utf8mb4;

INSERT IGNORE INTO RazaCatalogo (Especie, Nombre) VALUES
('perro', 'Sin raza'),
('gato', 'Sin raza'),
('gato', 'Atigrado Marrón'),
('gato', 'Atigrado Gris');


-- -----------------------------------------------------------------------------
-- 030_mp_vendedor_perfil.sql
-- -----------------------------------------------------------------------------

-- Perfil visible de la cuenta MP del vendedor + tema del callback OAuth.
-- mysql -u root huellitas < sql/030_mp_vendedor_perfil.sql

SET NAMES utf8mb4;

ALTER TABLE UsuarioMpCuenta
    ADD COLUMN MpNombre VARCHAR(200) NULL AFTER MpEmail,
    ADD COLUMN MpTelefono VARCHAR(40) NULL AFTER MpNombre;

ALTER TABLE UsuarioMpOauthPendiente
    ADD COLUMN Theme VARCHAR(10) NOT NULL DEFAULT 'light' AFTER UserId;


-- -----------------------------------------------------------------------------
-- 031_hueplus_planes.sql
-- -----------------------------------------------------------------------------

-- Red Huellitas — HuePlus + HuePlus Comercial (catálogo editable)
-- mysql -u root huellitas < sql/031_hueplus_planes.sql
-- Idempotente.

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Columnas nuevas en SuscripcionPlan
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Descripcion'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Descripcion TEXT NULL AFTER Nombre',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Orden'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Orden INT NOT NULL DEFAULT 0 AFTER MontoMensual',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'SinComision'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN SinComision TINYINT(1) NOT NULL DEFAULT 0 AFTER Orden',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Ítems de beneficios por plan (editables desde admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SuscripcionPlanItem (
    ItemId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PlanId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(220) NOT NULL,
    Orden       INT NOT NULL DEFAULT 0,
    Estado      CHAR(1) NOT NULL DEFAULT 'A',
    KEY IX_PlanItem_Plan (PlanId),
    CONSTRAINT FK_PlanItem_Plan FOREIGN KEY (PlanId) REFERENCES SuscripcionPlan(PlanId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar plan legado → HuePlus Comercial
UPDATE SuscripcionPlan
SET Codigo = 'hue_plus_comercial',
    Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
    MontoMensual = GREATEST(MontoMensual, 8000.00),
    Orden = 2,
    SinComision = 1,
    Estado = 'A'
WHERE Codigo = 'vitrina_comercial';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = COALESCE(Descripcion, 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'),
    Orden = 2,
    SinComision = 1
WHERE Codigo = 'hue_plus_comercial';

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus',
       'HuePlus',
       'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.',
       3500.00,
       1,
       0,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus');

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus_comercial',
       'HuePlus Comercial',
       'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
       8000.00,
       2,
       1,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus_comercial');

-- Ítems HuePlus (sólo si el plan no tiene ninguno)
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Insignia HuePlus en tu perfil' AS Texto
    UNION ALL SELECT 2, 'Crear tu mascota real con IA'
    UNION ALL SELECT 3, 'Acceso anticipado a novedades de la comunidad'
) v
WHERE p.Codigo = 'hue_plus'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);

-- Ítems HuePlus Comercial
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Todo lo incluido en HuePlus' AS Texto
    UNION ALL SELECT 2, 'Insignia HuePlus Comercial (distinta)'
    UNION ALL SELECT 3, 'Sin retención por comisión de venta, vendas lo que vendas'
    UNION ALL SELECT 4, 'Vitrina destacada en la tienda'
) v
WHERE p.Codigo = 'hue_plus_comercial'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);


-- -----------------------------------------------------------------------------
-- 032_mascota_banner.sql
-- -----------------------------------------------------------------------------

-- Banner / foco de recorte en Mis mascotas
-- mysql -u root huellitas < sql/032_mascota_banner.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'ModoBanner'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Mascota ADD COLUMN ModoBanner ENUM('portada','banner') NOT NULL DEFAULT 'portada' AFTER DescripcionTexto",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerPath'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerPath VARCHAR(255) NULL AFTER ModoBanner',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerFocusY'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerFocusY DECIMAL(4,3) NOT NULL DEFAULT 0.500 AFTER BannerPath',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 033_fix_hueplus_acentos.sql
-- -----------------------------------------------------------------------------

-- Fix acentos en planes HuePlus (corrige ?? por SOURCE mal codificado en Windows)
-- Ejecutar con cliente UTF-8: mysql --default-character-set=utf8mb4 -u root huellitas < sql/033_fix_hueplus_acentos.sql

SET NAMES utf8mb4;

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus',
    Descripcion = 'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.'
WHERE Codigo = 'hue_plus';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'
WHERE Codigo IN ('hue_plus_comercial', 'vitrina_comercial');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial')
  AND (i.Texto LIKE 'Sin retenci%' OR i.Texto LIKE '%comisi%venta%');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus en tu perfil'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Crear tu mascota real con IA'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Acceso anticipado a novedades de la comunidad'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Todo lo incluido en HuePlus'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus Comercial (distinta)'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Vitrina destacada en la tienda'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 4;


-- -----------------------------------------------------------------------------
-- 034_verificacion_reintentos.sql
-- -----------------------------------------------------------------------------

-- Reintentos de verificación automática (Gemini/IA)
-- mysql --default-character-set=utf8mb4 -u root huellitas < sql/034_verificacion_reintentos.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentoEn DATETIME NULL AFTER KycEstado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentos'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentos INT UNSIGNED NOT NULL DEFAULT 0 AFTER AutoReintentoEn',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND INDEX_NAME = 'IX_Verif_AutoReintento'
);
SET @sql = IF(@idx = 0,
    'ALTER TABLE UsuarioVerificacion ADD KEY IX_Verif_AutoReintento (EstadoRevision, AutoReintentoEn)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 035_transito_donacion_acordado.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Tránsito y Donaciones: estado del trato ("acordado")
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/035_transito_donacion_acordado.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué hace falta una columna nueva y no alcanzaba con algo
-- que ya estaba.
--
-- El resto de los módulos puede bloquear la edición porque tiene
-- de dónde deducir que hay otra persona involucrada: Adopción
-- mira las postulaciones, Perdidos mira si ya se reencontró.
-- Tránsito y Donaciones no tenían ninguna señal: el acuerdo se
-- arregla por WhatsApp o por chat y en la base no queda rastro.
-- Sólo existía Estado A/I, que es "publicada / dada de baja".
--
-- Deducirlo de "alguien abrió una conversación" sería peor que
-- no bloquear nada: congelaría una publicación por una simple
-- consulta, y preguntar es justamente lo que uno quiere que
-- pase seguido.
--
-- Así que el estado lo marca el dueño a mano, y es reversible:
-- si el acuerdo se cae, vuelve a 'disponible' y la publicación
-- se puede volver a editar. Mismo criterio que Adopción, donde
-- cancelar la última postulación devuelve la edición.
-- ------------------------------------------------------------

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND COLUMN_NAME = 'EstadoTransito');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Transito ADD COLUMN EstadoTransito ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER DuracionDias",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND COLUMN_NAME = 'EstadoDonacion');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Donacion ADD COLUMN EstadoDonacion ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER Especie",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Índices: los listados filtran por estado para poder mostrar
-- primero lo que todavía está disponible.
-- ------------------------------------------------------------
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND INDEX_NAME = 'IX_Transito_EstadoTransito');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Transito_EstadoTransito ON Transito (EstadoTransito, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND INDEX_NAME = 'IX_Donacion_EstadoDonacion');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Donacion_EstadoDonacion ON Donacion (EstadoDonacion, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 036_adopcion_ubicacion.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Adopción: ubicación propia de la publicación
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/036_adopcion_ubicacion.sql
-- ============================================================

-- ------------------------------------------------------------
-- Adopción era el único módulo publicable sin ubicación propia.
--
-- Todos los demás (Tránsito, Perdidos, Donaciones, Productos,
-- Veterinarias, Campañas) ya guardan dónde pasa la cosa. Adopción
-- no, y se venía resolviendo mostrando la zona del dueño — que es
-- justamente lo que no sirve: la zona del usuario lo sigue a él,
-- y si se muda cambia de lugar un animal que se sigue dando en
-- adopción en el mismo barrio de siempre.
--
-- Para el mapa esto es la diferencia entre un pin correcto y un
-- pin que miente, así que la ubicación pasa a ser de la
-- publicación, fijada cuando se publica.
--
-- Nullable porque las filas viejas no la tienen; se rellenan más
-- abajo con la del dueño, que es la mejor aproximación que hay
-- para lo ya cargado. De acá en adelante crear.php la exige.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Adopcion' AND COLUMN_NAME = 'ZonaDescripcion');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Adopcion ADD COLUMN ZonaDescripcion VARCHAR(150) NULL AFTER Descripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Adopcion' AND COLUMN_NAME = 'ZonaLat');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Adopcion ADD COLUMN ZonaLat DECIMAL(10,7) NULL AFTER ZonaDescripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Adopcion' AND COLUMN_NAME = 'ZonaLng');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Adopcion ADD COLUMN ZonaLng DECIMAL(10,7) NULL AFTER ZonaLat',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Backfill: sólo donde falta y sólo si el dueño tiene zona.
-- Idempotente por el IS NULL — una segunda corrida no pisa nada.
-- ------------------------------------------------------------
UPDATE Adopcion a
JOIN Usuario u ON u.UserId = a.UserId
SET a.ZonaDescripcion = COALESCE(a.ZonaDescripcion, u.ZonaDescripcion),
    a.ZonaLat         = COALESCE(a.ZonaLat, u.ZonaLat),
    a.ZonaLng         = COALESCE(a.ZonaLng, u.ZonaLng)
WHERE (a.ZonaLat IS NULL OR a.ZonaLng IS NULL)
  AND u.ZonaLat IS NOT NULL AND u.ZonaLng IS NOT NULL;

-- ------------------------------------------------------------
-- El mapa barre por caja de coordenadas antes de calcular
-- distancias, así que el índice va sobre el par.
-- ------------------------------------------------------------
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Adopcion' AND INDEX_NAME = 'IX_Adopcion_Zona');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Adopcion_Zona ON Adopcion (Estado, ZonaLat, ZonaLng)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 037_mapa_indices_geo.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Mapa: índices geográficos en los módulos que se dibujan
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/037_mapa_indices_geo.sql
-- ============================================================

-- ------------------------------------------------------------
-- El mapa consulta siete tablas de una, filtrando por una caja
-- de coordenadas alrededor del usuario. Sin índice cada una es
-- un full scan, y multiplicado por siete se nota enseguida.
--
-- El orden de las columnas importa: `Estado` primero porque
-- descarta de entrada todo lo dado de baja, y recién después el
-- par de coordenadas para el rango. Al revés MySQL no puede usar
-- el índice para el filtro de estado.
--
-- MySQL no tiene índice espacial usable acá sin migrar a columnas
-- POINT y SRID, que sería rehacer el modelo de siete módulos por
-- una ganancia que a esta escala no se ve. La caja + haversine
-- sobre el subconjunto alcanza de sobra.
-- ------------------------------------------------------------

-- Transito
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND INDEX_NAME = 'IX_Transito_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Transito_Zona ON Transito (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Donacion
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND INDEX_NAME = 'IX_Donacion_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Donacion_Zona ON Donacion (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Perdido (sus coordenadas se llaman UltimoLugar*)
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Perdido' AND INDEX_NAME = 'IX_Perdido_Lugar');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Perdido_Lugar ON Perdido (Estado, UltimoLugarLat, UltimoLugarLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Producto
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Producto' AND INDEX_NAME = 'IX_Producto_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Producto_Zona ON Producto (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Veterinaria
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Veterinaria' AND INDEX_NAME = 'IX_Veterinaria_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Veterinaria_Zona ON Veterinaria (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Campania
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND INDEX_NAME = 'IX_Campania_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Campania_Zona ON Campania (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Usuario: los refugios salen de acá (TipoUsuario = 'refugio')
SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND INDEX_NAME = 'IX_Usuario_Zona');
SET @sql = IF(@idx = 0, 'CREATE INDEX IX_Usuario_Zona ON Usuario (Estado, ZonaLat, ZonaLng)', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- -----------------------------------------------------------------------------
-- 038_mapa_consumo.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Mapa: contador de cargas para no pasarse de la cuota de Mapbox
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/038_mapa_consumo.sql
-- ============================================================

-- ------------------------------------------------------------
-- Mapbox cobra por "map load": cada vez que el navegador crea un
-- mapa. El plan gratuito da 50.000 por mes y arriba de eso
-- empieza a facturar, así que hace falta contarlas nosotros.
--
-- El contador vive en la base y no en la sesión ni en un archivo
-- porque tiene que ser uno solo para toda la app, sobrevivir a
-- reinicios y no depender de que el cliente diga la verdad.
--
-- Cuando el mes se llena, el servidor deja de entregar el token y
-- la app cae a MapLibre, que no tiene cuota. El mapa sigue
-- funcionando: cambia el proveedor de los mosaicos, nada más.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MapaCargaMes (
    Periodo   CHAR(7)          NOT NULL PRIMARY KEY,  -- 'YYYY-MM'
    Cargas    INT UNSIGNED     NOT NULL DEFAULT 0,
    UpdatedAt DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tope por usuario y por día: sin esto, una sola persona dejando
-- la pantalla abierta y recargando se come el cupo de todos antes
-- de fin de mes. El límite global solo no alcanza para eso.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MapaCargaUsuarioDia (
    UserId  INT UNSIGNED NOT NULL,
    Dia     DATE         NOT NULL,
    Cargas  INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (UserId, Dia),
    CONSTRAINT FK_MapaCargaUsuarioDia_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- -----------------------------------------------------------------------------
-- 039_cuidados_especies.sql
-- -----------------------------------------------------------------------------

-- Amplía especies de Cuidados más allá de perro/gato/otro.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/039_cuidados_especies.sql

SET NAMES utf8mb4;

ALTER TABLE CuidadoRecomendacion
    MODIFY Especie VARCHAR(20) NOT NULL;

INSERT IGNORE INTO CuidadoRecomendacion (Especie, Categoria, Titulo, Resumen, Cuerpo, Orden) VALUES
('conejo','alimentacion','Heno todo el día','El heno no es un snack: es la base.','Los conejos necesitan heno de buena calidad disponible las 24 horas. Les desgasta los dientes (que crecen toda la vida) y les mantiene el aparato digestivo en marcha.\n\nEl pellet es un complemento medido, no el plato principal. Sumá verduras de hoja frescas y agua limpia siempre.',1),
('conejo','salud','No lo levantes mal','La columna de un conejo es frágil.','Nunca lo tomes solo de las orejas ni lo dejes colgando. Sostené el pecho y el tren trasero juntos.\n\nSi deja de comer aunque sea un día, es urgencia: su digestión no tolera el ayuno. Buscá veterinaria de exóticos antes de necesitarla.',1),
('conejo','convivencia','Espacio para saltar','La jaula chica no alcanza.','Necesita varias horas diarias fuera de la jaula en un espacio seguro. Sin eso aparecen obesidad, aburrimiento y problemas óseos.\n\nOjo con cables y plantas tóxicas: si llega, lo muerde.',1),

('ave','alimentacion','Semillas solas no alcanzan','Una dieta solo de semillas engorda y desnutre.','Mezclá pellets formulados para su especie, frutas y verduras aptas, y muy pocas semillas como premio.\n\nEl agua se cambia todos los días. Nunca aguacate, chocolate, cafeína ni alcohol.',1),
('ave','ejercicio','Vuelo y juguetes','Un ave aburrida se despluma.','La jaula tiene que permitir abrir las alas por completo. Sacala a volar o trepar en un ambiente seguro todos los días.\n\nRotá juguetes: necesitan destruir, forrajear y resolver cosas con el pico.',1),
('ave','salud','Corrientes y noches','Las aves se resfrían fácil.','Evitá corrientes y cambios bruscos de temperatura. Necesitan 10–12 horas de oscuridad y silencio para dormir bien.\n\nCualquier cambio de voz, postura o apetito merece consulta con un veterinario de aves.',1),

('pez','alimentacion','Poco y seguido','El exceso de comida pudre el agua.','Dale solo lo que coman en dos o tres minutos, una o dos veces al día. Lo que sobra ensucia y enferma.\n\nCada especie tiene su alimento: no uses el mismo para todos.',1),
('pez','salud','El agua es el hábitat','Si el agua falla, el pez enferma.','Ciclo el acuario antes de agregar peces, controlá amoníaco/nitritos y hacé cambios parciales de agua con regularidad.\n\nNo laves el filtro con agua de la canilla con cloro: matás las bacterias buenas.',1),
('pez','convivencia','Compatibilidad','No todos los peces pueden vivir juntos.','Investigá tamaño adulto, temperamento y parámetros (temperatura, pH) antes de mezclar especies.\n\nUn pez grande y territorial puede estresar o comerse a los chicos.',1),

('hamster','alimentacion','De noche comen','Son crepusculares/nocturnos.','Usá alimento específico para hámster y sumá snacks aptos con medida. Siempre hay agua limpia.\n\nNunca chocolate, cítricos ácidos en exceso ni comida chatarra humana.',1),
('hamster','convivencia','Uno por jaula','Suelen ser territoriales.','La mayoría de hámsteres viven solos. Juntarlos puede terminar en peleas graves.\n\nLa rueda debe ser sólida (sin barrotes) y del diámetro adecuado para no arquearles la espalda.',1),
('hamster','higiene','Sustrato seguro','El aserrín aromático irrita.','Usá sustrato apto para roedores, sin polvo fuerte. Limpiá la jaula con frecuencia pero dejá un rincón con olor familiar para que no se estrese.',1),

('cobayo','alimentacion','Vitamina C obligatoria','No la fabrican solos.','Además de heno ilimitado, necesitan fuente diaria de vitamina C (verduras aptas o suplemento indicado por el vet).\n\nSin eso aparecen problemas de piel, dientes y articulaciones.',1),
('cobayo','convivencia','Compañía','Son animales sociales.','Viven mejor en pareja o grupo compatible, con espacio amplio. Una jaula de pet shop suele ser chica.\n\nPresentalos con cuidado y observá peleas.',1),
('cobayo','salud','Dientes y pelo','Crece todo el tiempo.','El heno desgasta los dientes. Si babea, deja de comer o adelgaza, consultá.\n\nLos de pelo largo necesitan cepillado frecuente para evitar nudos y moscas.',1),

('tortuga','alimentacion','Según la especie','No hay una dieta única.','Tortugas terrestres, de agua y semiacuáticas comen distinto. Investigá la tuya: muchas necesitan calcio y exposición a UVB.\n\nLa lechuga sola no es una dieta completa.',1),
('tortuga','salud','Calor y luz UVB','Sin UVB enferman los huesos.','Necesitan gradiente térmico y lámpara UVB adecuada (se renueva según vida útil del fabricante).\n\nUn caparazón blando o deformado es señal de alarma.',1),
('tortuga','convivencia','Terrario amplio','Crecen más de lo que parece.','Calculá el tamaño adulto antes de comprarla. El hacinamiento genera estrés e infecciones.\n\nAgua limpia si es acuática; escondites secos y húmedos según especie.',1),

('huron','alimentacion','Dieta carnívora','No son roedores.','Necesitan alimento alto en proteína animal y bajo en fibra vegetal. La comida de gato de calidad a veces se usa bajo consejo vet, nunca comida de perro como base.\n\nChocolate, uvas y cebolla también les son tóxicos.',1),
('huron','ejercicio','Horas fuera','Duermen mucho, pero despiertos explotan.','Varias horas diarias de juego supervisado fuera de la jaula. Escondé cables y huecos peligrosos.\n\nSin estímulo destruyen o se deprimen.',1),
('huron','salud','Vacunas y olores','Requieren controles específicos.','Consultá vacunas y desparasitación con un vet que conozca hurones. El olor baja mucho con castración/histerectomía y higiene del ambiente, no con baños constantes.',1);


-- -----------------------------------------------------------------------------
-- 040_donacion_categoria_ropa.sql
-- -----------------------------------------------------------------------------

-- Categoría ropa/comodidades en Donaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/040_donacion_categoria_ropa.sql

SET NAMES utf8mb4;

ALTER TABLE Donacion
    MODIFY Categoria ENUM('alimento','insumo','ropa') NOT NULL;


-- -----------------------------------------------------------------------------
-- 041_especies_ampliadas.sql
-- -----------------------------------------------------------------------------

-- Amplía Especie en tablas de mascotas / rescate / tienda (como Cuidados).
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/041_especies_ampliadas.sql

SET NAMES utf8mb4;

ALTER TABLE RazaCatalogo
    MODIFY Especie VARCHAR(20) NOT NULL;

ALTER TABLE Mascota
    MODIFY Especie VARCHAR(20) NOT NULL;

ALTER TABLE Adopcion
    MODIFY Especie VARCHAR(20) NOT NULL;

ALTER TABLE Perdido
    MODIFY Especie VARCHAR(20) NOT NULL;

ALTER TABLE Transito
    MODIFY Especie VARCHAR(20) NULL;

ALTER TABLE Donacion
    MODIFY Especie VARCHAR(20) NULL;

ALTER TABLE Producto
    MODIFY Especie VARCHAR(20) NULL;


-- -----------------------------------------------------------------------------
-- 042_reacciones_ampliadas.sql
-- -----------------------------------------------------------------------------

-- Amplía reacciones de publicaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/042_reacciones_ampliadas.sql

SET NAMES utf8mb4;

ALTER TABLE PostReaccion
    MODIFY Tipo ENUM(
        'like',
        'me_divierte',
        'amor',
        'asombro',
        'triste',
        'abrazo',
        'huella',
        'apoyo',
        'guau',
        'michi'
    ) NOT NULL;


-- -----------------------------------------------------------------------------
-- 043_campanias_inscripcion.sql
-- -----------------------------------------------------------------------------

-- ============================================================
-- Campañas: inscripción con formulario, cupo y lista de espera
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/043_campanias_inscripcion.sql
-- ============================================================

-- ------------------------------------------------------------
-- Campania: mensaje de aviso y límite para darse de baja.
--
-- `CupoMaximo` NULL ya significaba "sin límite", así que no hace
-- falta un flag aparte: agregarlo daría dos fuentes para el mismo
-- dato y tarde o temprano se contradicen.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'MensajeAviso');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN MensajeAviso TEXT NULL AFTER Descripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Horas antes de FechaDesde hasta las que se admite la baja.
-- NULL = se puede dar de baja siempre.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'BajaLimiteHoras');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN BajaLimiteHoras INT UNSIGNED NULL AFTER CupoMaximo',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- CampaniaInscripcion: estado y posición.
--
-- `Posicion` es el número de orden en que se anotó, y NO se
-- recalcula al cancelar. Si se renumerara, alguien que se anotó
-- primero podría terminar detrás de otro por una baja ajena, y el
-- orden de la lista de espera es justamente lo que hay que poder
-- defender ante un reclamo.
--
-- Las canceladas se conservan (Estado='cancelada') en vez de
-- borrarse: hacen falta para saber quién se dio de baja y cuándo,
-- sobre todo con el aviso de ausencia.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Estado');
SET @sql = IF(@c = 0,
    "ALTER TABLE CampaniaInscripcion ADD COLUMN Estado ENUM('confirmada','lista_espera','cancelada','ausente') NOT NULL DEFAULT 'confirmada' AFTER UserId",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Posicion');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN Posicion INT UNSIGNED NOT NULL DEFAULT 0 AFTER Estado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'CanceladaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN CanceladaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'AvisoAusenciaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN AvisoAusenciaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'NotaAusencia');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN NotaAusencia VARCHAR(255) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND INDEX_NAME = 'IX_CampaniaInscripcion_Orden');
SET @sql = IF(@idx = 0,
    'CREATE INDEX IX_CampaniaInscripcion_Orden ON CampaniaInscripcion (CampaniaId, Estado, Posicion)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Formulario: mismas tres tablas que Adopción, mismos nombres de
-- columna. Un formulario dinámico ya resuelto en este proyecto no
-- se reinventa con otra forma.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CampaniaPregunta (
    CampaniaPreguntaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaId         INT UNSIGNED NOT NULL,
    Tipo               ENUM('texto','si_no','opcion_multiple') NOT NULL DEFAULT 'texto',
    Texto              VARCHAR(255) NOT NULL,
    Obligatoria        TINYINT(1) NOT NULL DEFAULT 1,
    Orden              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPregunta_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId),
    INDEX IX_CampaniaPregunta_Campania (CampaniaId, Orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaPreguntaOpcion (
    CampaniaPreguntaOpcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    Texto                    VARCHAR(150) NOT NULL,
    Orden                    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPreguntaOpcion_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaRespuesta (
    CampaniaRespuestaId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaInscripcionId    INT UNSIGNED NOT NULL,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    RespuestaTexto           TEXT NULL,
    CampaniaPreguntaOpcionId INT UNSIGNED NULL,
    CONSTRAINT FK_CampaniaRespuesta_Inscripcion FOREIGN KEY (CampaniaInscripcionId) REFERENCES CampaniaInscripcion(CampaniaInscripcionId),
    CONSTRAINT FK_CampaniaRespuesta_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId),
    INDEX IX_CampaniaRespuesta_Inscripcion (CampaniaInscripcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


