-- ============================================================
-- Preferencia de usuario: ver el tiro real del rival en HuePool/HueSoccer
-- (replay de física con el `impulso` que mandó quien tiró) en vez de sólo
-- el tablero final una vez que ya jugó. Default OFF: mantiene el
-- comportamiento actual salvo que el usuario lo prenda a propósito.
--
-- No hace falta columna nueva en JuegoDesafio: el último `impulso` de cada
-- tiro se guarda DENTRO del JSON de `Tablero` (mismo patrón que ya usan
-- `bolaEnMano`/`turnoEmpezoEn` en HuePool) — ver `pool_mover.php` y
-- `soccer_mover.php`.
--
-- Idempotente: sólo agrega la columna si todavía no existe.
-- ============================================================

SET @mig := (SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'VerJugadaRivalEnVivo');
SET @sql := IF(@mig = 0,
    'ALTER TABLE Usuario ADD COLUMN VerJugadaRivalEnVivo TINYINT(1) NOT NULL DEFAULT 0 AFTER NotificarProximidad',
    'SELECT 1');
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
