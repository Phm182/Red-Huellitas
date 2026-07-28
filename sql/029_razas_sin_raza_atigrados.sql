-- "Sin raza" primero en perro/gato + atigrados en gatos
-- mysql -u root huellitas < sql/029_razas_sin_raza_atigrados.sql

SET NAMES utf8mb4;

INSERT IGNORE INTO RazaCatalogo (Especie, Nombre) VALUES
('perro', 'Sin raza'),
('gato', 'Sin raza'),
('gato', 'Atigrado Marrón'),
('gato', 'Atigrado Gris');
