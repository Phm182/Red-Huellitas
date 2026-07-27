-- ============================================================
-- Centro de notificaciones
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Hasta ahora los avisos salían sólo por push (rh_enviar_push)
-- y no se guardaban en ningún lado: si el celular estaba
-- apagado o el token vencido, la notificación no existió nunca.
-- Con esta tabla el push pasa a ser el aviso y esta fila, el
-- registro.
--
-- `Ruta` es el destino en la app (ej. /(app)/adopcion/12), para
-- que tocar la notificación lleve a algún lado.
--
-- `MascotaId` es lo que permite el pedido de agrupar por animal:
-- las notificaciones que nacen de una mascota se cuentan aparte
-- y se muestran dentro de esa mascota.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Notificacion (
    NotificacionId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    UserId INT UNSIGNED NOT NULL,
    Tipo VARCHAR(40) NOT NULL,
    Titulo VARCHAR(120) NOT NULL,
    Cuerpo VARCHAR(255) NOT NULL,
    Ruta VARCHAR(160) NULL,
    ActorUserId INT UNSIGNED NULL,
    MascotaId INT UNSIGNED NULL,
    Leida TINYINT(1) NOT NULL DEFAULT 0,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (NotificacionId),
    KEY idx_user_leida (UserId, Leida, NotificacionId),
    KEY idx_user_mascota (UserId, MascotaId, Leida),
    CONSTRAINT fk_notif_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_notif_actor FOREIGN KEY (ActorUserId) REFERENCES Usuario(UserId) ON DELETE SET NULL,
    CONSTRAINT fk_notif_mascota FOREIGN KEY (MascotaId) REFERENCES Mascota(MascotaId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
