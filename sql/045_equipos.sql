-- ============================================================
-- Equipos (organizaciones) y calificaciones cruzadas
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/045_equipos.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué una tabla de equipos y no reusar TipoUsuario.
--
-- Hasta ahora "refugio" era un tipo de cuenta: una persona se
-- registraba como refugio y ese era todo el modelo. Eso rompe en
-- cuanto la organización tiene más de una persona (la que atiende
-- el teléfono y la que hace las campañas) o cuando la organización
-- no es ninguna de las categorías que teníamos —el gobierno de la
-- ciudad no es una veterinaria ni un refugio, pero hace campañas.
--
-- Un equipo es una entidad aparte con miembros. Cada persona
-- conserva su usuario propio y pertenece (o no) a un equipo. Así
-- se puede entrar a un equipo existente en vez de crear uno nuevo
-- y duplicar la misma organización cinco veces.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS TipoEquipoCatalogo (
    TipoEquipoId    INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Codigo          VARCHAR(30)  NOT NULL,
    Nombre          VARCHAR(80)  NOT NULL,
    -- Nombre de ícono de Ionicons y color de la insignia: el catálogo
    -- decide cómo se ve cada tipo, así el día que se suma uno nuevo no
    -- hay que tocar el frontend.
    Icono           VARCHAR(40)  NOT NULL DEFAULT 'people',
    Color           VARCHAR(9)   NOT NULL DEFAULT '#6C8CFF',
    Orden           INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (TipoEquipoId),
    UNIQUE KEY uq_tipoequipo_codigo (Codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO TipoEquipoCatalogo (Codigo, Nombre, Icono, Color, Orden) VALUES
    ('refugio',     'Refugio',              'home',            '#F97362', 1),
    ('protectora',  'Protectora',           'shield-checkmark','#FF8A4C', 2),
    ('veterinaria', 'Veterinaria',          'medkit',          '#4FC3F7', 3),
    ('ong',         'ONG',                  'heart',           '#B76CFF', 4),
    ('gobierno',    'Organismo público',    'business',        '#59D9A5', 5),
    ('rescatista',  'Grupo de rescatistas', 'paw',             '#FFC857', 6),
    ('otro',        'Otro',                 'people',          '#8FA0B5', 9)
ON DUPLICATE KEY UPDATE Nombre = VALUES(Nombre), Icono = VALUES(Icono),
    Color = VALUES(Color), Orden = VALUES(Orden);

CREATE TABLE IF NOT EXISTS Equipo (
    EquipoId        INT UNSIGNED NOT NULL AUTO_INCREMENT,
    TipoEquipoId    INT UNSIGNED NOT NULL,
    Nombre          VARCHAR(150) NOT NULL,
    Descripcion     TEXT         NULL,
    AvatarPath      VARCHAR(255) NULL,
    Email           VARCHAR(150) NULL,
    Telefono        VARCHAR(30)  NULL,
    SitioWeb        VARCHAR(200) NULL,
    -- Un equipo es una organización con puerta a la calle: igual que
    -- las veterinarias, su ubicación se publica exacta (ver sql/044).
    Direccion       VARCHAR(200) NULL,
    ZonaDescripcion VARCHAR(150) NULL,
    ZonaLat         DECIMAL(10,7) NULL,
    ZonaLng         DECIMAL(10,7) NULL,
    -- Lo pone moderación. Es lo que separa "me puse Gobierno de la Ciudad
    -- en el nombre" de serlo, así que no puede ser autoservicio.
    Verificado      TINYINT(1)   NOT NULL DEFAULT 0,
    Estado          CHAR(1)      NOT NULL DEFAULT 'A',
    CreatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (EquipoId),
    KEY idx_equipo_tipo (TipoEquipoId, Estado),
    KEY idx_equipo_geo (ZonaLat, ZonaLng),
    CONSTRAINT fk_equipo_tipo FOREIGN KEY (TipoEquipoId)
        REFERENCES TipoEquipoCatalogo (TipoEquipoId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Membresías.
--
-- `Estado = 'pendiente'` es el pedido de unirse: lo aprueba alguien
-- que ya está adentro con rol dueño/admin. Sin esa aprobación
-- cualquiera se colgaría del nombre de una organización conocida.
--
-- Las salidas y los rechazos no se borran: quedan como historial
-- para poder responder "¿quién estuvo en este equipo?".
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS EquipoMiembro (
    EquipoMiembroId   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    EquipoId          INT UNSIGNED NOT NULL,
    UserId            INT UNSIGNED NOT NULL,
    Rol               ENUM('dueno','admin','miembro') NOT NULL DEFAULT 'miembro',
    Estado            ENUM('pendiente','activo','rechazado','salio') NOT NULL DEFAULT 'pendiente',
    Mensaje           VARCHAR(300) NULL,
    CreatedAt         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltoEn        DATETIME NULL,
    ResueltoPorUserId INT UNSIGNED NULL,
    PRIMARY KEY (EquipoMiembroId),
    UNIQUE KEY uq_equipo_usuario (EquipoId, UserId),
    KEY idx_miembro_usuario (UserId, Estado),
    KEY idx_miembro_equipo (EquipoId, Estado),
    CONSTRAINT fk_miembro_equipo FOREIGN KEY (EquipoId)
        REFERENCES Equipo (EquipoId) ON DELETE CASCADE,
    CONSTRAINT fk_miembro_usuario FOREIGN KEY (UserId)
        REFERENCES Usuario (UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Una campaña puede ser de un equipo o de una persona suelta.
-- NULL = la organiza la persona de `UserId`, como hasta ahora.
-- `UserId` se conserva igual porque sigue haciendo falta saber
-- quién la cargó, aunque la organice el equipo.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'EquipoId');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN EquipoId INT UNSIGNED NULL AFTER UserId',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND INDEX_NAME = 'idx_campania_equipo');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD KEY idx_campania_equipo (EquipoId, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Asistencia real, distinta del aviso de ausencia.
--
-- `Estado = 'ausente'` ya existía y significa "avisó que no venía",
-- que es buena fe. Lo que hacía falta es lo otro: se anotó, no
-- avisó y no apareció. Se marca después de la campaña desde el
-- panel del organizador.
--
-- NULL = todavía no se pasó lista. No es lo mismo que "no vino",
-- y usar 0 por defecto convertiría en faltador a todo el que
-- participó de una campaña donde nadie tomó asistencia.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Asistio');
SET @sql = IF(@c = 0,
    "ALTER TABLE CampaniaInscripcion ADD COLUMN Asistio ENUM('si','no') NULL AFTER NotaAusencia",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'AsistenciaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN AsistenciaEn DATETIME NULL AFTER Asistio',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Calificaciones cruzadas.
--
-- Una sola tabla para los dos sentidos (el usuario califica al
-- organizador y el organizador al usuario) porque es exactamente
-- el mismo dato: quién califica, a quién, en qué contexto, cuánto
-- y por qué. Dos tablas simétricas obligarían a duplicar cada
-- consulta de promedio y a mantener las dos iguales para siempre.
--
-- `DeTipo`/`ParaTipo` existen porque un extremo puede ser una
-- persona o un equipo: una campaña puede organizarla el gobierno
-- de la ciudad o un vecino, y en los dos casos hay que poder
-- calificar al organizador.
--
-- `DeUserId` es quién apretó el botón aunque califique el equipo:
-- hace falta para auditar y para no dejar que la misma persona
-- califique dos veces cambiando de sombrero.
--
-- `Contexto` deja lugar para calificar adopciones o compras más
-- adelante sin migrar nada; hoy sólo se usa 'campania'.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Calificacion (
    CalificacionId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Contexto       ENUM('campania') NOT NULL DEFAULT 'campania',
    ContextoId     INT UNSIGNED NOT NULL,
    DeTipo         ENUM('usuario','equipo') NOT NULL,
    DeId           INT UNSIGNED NOT NULL,
    DeUserId       INT UNSIGNED NOT NULL,
    ParaTipo       ENUM('usuario','equipo') NOT NULL,
    ParaId         INT UNSIGNED NOT NULL,
    Puntaje        TINYINT UNSIGNED NOT NULL,
    Comentario     VARCHAR(600) NULL,
    Estado         CHAR(1) NOT NULL DEFAULT 'A',
    CreatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UpdatedAt      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (CalificacionId),
    -- Una calificación por par y contexto. Editar la propia es un
    -- UPDATE, no una fila nueva: si no, el promedio se infla votando
    -- muchas veces lo mismo.
    UNIQUE KEY uq_calificacion (Contexto, ContextoId, DeTipo, DeId, ParaTipo, ParaId),
    KEY idx_calificacion_para (ParaTipo, ParaId, Estado),
    KEY idx_calificacion_de (DeUserId, Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Las denuncias también pueden apuntar a un equipo o a una calificación.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'EquipoId');
SET @sql = IF(@c = 0,
    'ALTER TABLE Denuncia ADD COLUMN EquipoId INT UNSIGNED NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Denuncia' AND COLUMN_NAME = 'CalificacionId');
SET @sql = IF(@c = 0,
    'ALTER TABLE Denuncia ADD COLUMN CalificacionId INT UNSIGNED NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
