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
