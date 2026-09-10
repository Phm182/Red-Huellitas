-- ============================================================
-- Salas (lobby) para los juegos de duelo 1v1.
--
-- Un `JuegoSala` de 2 asientos también sirve de lobby para HueConecta,
-- HueDamas, HueAjedrez, HueReversi, HueTaTeTi, HuePool, HueSoccer y los
-- duelos por puntaje. Al iniciar, la sala genera un `JuegoDesafio` entre
-- los 2 jugadores y `DesafioId` lo linkea: el cliente entra a ese duelo
-- por el flujo normal (`*_ver.php` / `turno_jugar.php` / etc.).
--
-- Queda NULL para las salas de los 4 juegos de sala (HueLudo, etc.).
-- ============================================================

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'DesafioId') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN DesafioId INT NULL AFTER EsPublica',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
