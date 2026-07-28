-- ============================================================
-- Mapa: contador de cargas para no pasarse de la cuota de Mapbox
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/038_mapa_consumo.sql
-- ============================================================

-- ------------------------------------------------------------
-- Mapbox cobra por "map load": cada vez que el navegador crea un
-- mapa. El plan gratuito da 50.000 por mes y arriba de eso
-- empieza a facturar, así que hace falta contarlas nosotros.
--
-- El contador vive en la base y no en la sesión ni en un archivo
-- porque tiene que ser uno solo para toda la app, sobrevivir a
-- reinicios y no depender de que el cliente diga la verdad.
--
-- Cuando el mes se llena, el servidor deja de entregar el token y
-- la app cae a MapLibre, que no tiene cuota. El mapa sigue
-- funcionando: cambia el proveedor de los mosaicos, nada más.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MapaCargaMes (
    Periodo   CHAR(7)          NOT NULL PRIMARY KEY,  -- 'YYYY-MM'
    Cargas    INT UNSIGNED     NOT NULL DEFAULT 0,
    UpdatedAt DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Tope por usuario y por día: sin esto, una sola persona dejando
-- la pantalla abierta y recargando se come el cupo de todos antes
-- de fin de mes. El límite global solo no alcanza para eso.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MapaCargaUsuarioDia (
    UserId  INT UNSIGNED NOT NULL,
    Dia     DATE         NOT NULL,
    Cargas  INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (UserId, Dia),
    CONSTRAINT FK_MapaCargaUsuarioDia_Usuario FOREIGN KEY (UserId) REFERENCES Usuario(UserId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
