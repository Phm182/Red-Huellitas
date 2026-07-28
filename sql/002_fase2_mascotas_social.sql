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
