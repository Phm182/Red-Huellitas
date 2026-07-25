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
