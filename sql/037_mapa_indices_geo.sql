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
