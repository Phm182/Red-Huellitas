-- Categoría ropa/comodidades en Donaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/040_donacion_categoria_ropa.sql

SET NAMES utf8mb4;

ALTER TABLE Donacion
    MODIFY Categoria ENUM('alimento','insumo','ropa') NOT NULL;
