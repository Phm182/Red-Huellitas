-- ============================================================
-- Corta el loop infinito de notificaciones en salas con política "espera"
-- (Saltear su turno): sin esto, una sala de 2 donde nadie juega se pasa el
-- turno cada 15 minutos para siempre, avisándole a cada uno "¡Te toca
-- jugar!" cada ~30 minutos sin parar (confirmado en producción: dos
-- usuarios turnándose el aviso desde hace 2 días en una sala de HueLudo).
--
-- `SaltosSeguidos`: cuántos saltos-por-timeout consecutivos lleva la sala
-- SIN que nadie juegue una jugada real. Se resetea a 0 en cada jugada real
-- (`rh_sala_avanzar_turno`); si llega a "una vuelta completa" (todos los
-- activos saltados sin jugar), la sala se cierra sola en vez de seguir
-- saltando.
--
-- `RecordatorioTurnoEnviado`: mismo mecanismo que `JuegoDesafio` (columna
-- ya existente ahí) para el aviso de "10% del tiempo restante" — hace
-- falta la propia porque las salas nunca tuvieron ese recordatorio.
-- ============================================================

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'SaltosSeguidos') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN SaltosSeguidos SMALLINT UNSIGNED NOT NULL DEFAULT 0 AFTER TurnoVenceEn',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;

SET @sql = (SELECT IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'JuegoSala' AND COLUMN_NAME = 'RecordatorioTurnoEnviado') = 0,
    'ALTER TABLE JuegoSala ADD COLUMN RecordatorioTurnoEnviado TINYINT(1) NOT NULL DEFAULT 0 AFTER SaltosSeguidos',
    'SELECT 1'));
PREPARE st FROM @sql; EXECUTE st; DEALLOCATE PREPARE st;
