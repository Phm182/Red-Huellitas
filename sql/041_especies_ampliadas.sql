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
