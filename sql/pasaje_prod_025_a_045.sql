-- ============================================================
-- PASAJE A PRODUCCIÓN — migraciones desde el último push remoto
-- Baseline en origin/main: hasta sql/024_historias_velocidad.sql
-- Este archivo aplica: 025 … 045 (idempotente donde aplica).
--
-- mysql --default-character-set=utf8mb4 -u USUARIO -p NOMBRE_BD < sql/pasaje_prod_025_a_045.sql
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ######## 025_privacidad.sql ########

-- ============================================================
-- Cuenta privada + solicitudes de seguimiento
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

-- ------------------------------------------------------------
-- Perfil privado. Arranca en 0 (público) porque cambiarle la
-- visibilidad a cuentas que ya existen sin que nadie lo pida
-- sería peor que el default menos restrictivo.
--
-- Al pasar a privado los seguidores actuales SE CONSERVAN: son
-- gente que ya tenía acceso, echarla es destruir datos por un
-- cambio de setting.
-- ------------------------------------------------------------
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'PerfilPrivado');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN PerfilPrivado TINYINT(1) NOT NULL DEFAULT 0',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Mensaje personal estilo MSN, debajo del nombre en el chat.
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'MensajePersonal');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Usuario ADD COLUMN MensajePersonal VARCHAR(120) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Solicitudes de seguimiento.
--
-- El único por (Solicitante, Destino) evita que apretar dos
-- veces "Seguir" genere dos pedidos. Las resueltas se conservan
-- para saber si a alguien ya lo rechazaste antes.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SolicitudSeguimiento (
    SolicitudId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    UserIdSolicitante INT UNSIGNED NOT NULL,
    UserIdDestino INT UNSIGNED NOT NULL,
    Estado ENUM('pendiente','aceptada','rechazada') NOT NULL DEFAULT 'pendiente',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ResueltaEn DATETIME NULL,
    PRIMARY KEY (SolicitudId),
    UNIQUE KEY uq_solicitud (UserIdSolicitante, UserIdDestino),
    KEY idx_destino_estado (UserIdDestino, Estado),
    CONSTRAINT fk_solsig_solicitante FOREIGN KEY (UserIdSolicitante) REFERENCES Usuario(UserId) ON DELETE CASCADE,
    CONSTRAINT fk_solsig_destino FOREIGN KEY (UserIdDestino) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ######## 026_notificaciones.sql ########

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


-- ######## 027_chat.sql ########

-- ============================================================
-- Chat directo entre cuentas, con bandeja de solicitudes
-- Idempotente: se puede correr más de una vez sin error.
-- ============================================================

CREATE TABLE IF NOT EXISTS Conversacion (
    ConversacionId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UltimoMensajeEn DATETIME NULL,
    PRIMARY KEY (ConversacionId),
    KEY idx_ultimo (UltimoMensajeEn)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- El estado vive POR PARTICIPANTE, no por conversación.
--
-- Es la decisión que hace posible la bandeja de solicitudes: para el
-- que escribe es una charla normal ('activa') y para el que recibe,
-- si no hay relación previa, es una solicitud. Con un estado global
-- en Conversacion no se podría representar esa asimetría.
--
-- `UltimaLecturaMensajeId` es lo que permite contar no leídos sin
-- una fila por mensaje y por usuario.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ConversacionParticipante (
    ConversacionId INT UNSIGNED NOT NULL,
    UserId INT UNSIGNED NOT NULL,
    Estado ENUM('activa','solicitud','archivada') NOT NULL DEFAULT 'activa',
    UltimaLecturaMensajeId INT UNSIGNED NULL,
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (ConversacionId, UserId),
    KEY idx_user_estado (UserId, Estado),
    CONSTRAINT fk_cp_conv FOREIGN KEY (ConversacionId) REFERENCES Conversacion(ConversacionId) ON DELETE CASCADE,
    CONSTRAINT fk_cp_user FOREIGN KEY (UserId) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- `Tipo` distingue el zumbido del MSN: viaja como mensaje para que
-- quede en el historial, pero la app lo dibuja distinto y sacude la
-- pantalla en vez de mostrar una burbuja.
CREATE TABLE IF NOT EXISTS Mensaje (
    MensajeId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    ConversacionId INT UNSIGNED NOT NULL,
    UserIdEmisor INT UNSIGNED NOT NULL,
    Texto VARCHAR(1000) NOT NULL,
    Tipo ENUM('texto','zumbido') NOT NULL DEFAULT 'texto',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (MensajeId),
    KEY idx_conv (ConversacionId, MensajeId),
    CONSTRAINT fk_msg_conv FOREIGN KEY (ConversacionId) REFERENCES Conversacion(ConversacionId) ON DELETE CASCADE,
    CONSTRAINT fk_msg_emisor FOREIGN KEY (UserIdEmisor) REFERENCES Usuario(UserId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ######## 028_cuidados.sql ########

-- ============================================================
-- Recomendaciones de cuidados por especie
-- Idempotente: se puede correr más de una vez sin error.
--
-- ⚠️ CORRER CON --default-character-set=utf8mb4
--     mysql -u root --default-character-set=utf8mb4 huellitas < 028_cuidados.sql
--
-- Sin eso el cliente de MySQL asume latin1 y todos los acentos entran
-- rotos ("Cu├íntas veces por d├¡a"). El archivo está en UTF-8; el que
-- traduce mal es el cliente, no la base.
-- ============================================================
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS CuidadoRecomendacion (
    CuidadoId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Especie ENUM('perro','gato','otro') NOT NULL,
    Categoria ENUM('alimentacion','higiene','salud','ejercicio','convivencia') NOT NULL,
    Titulo VARCHAR(120) NOT NULL,
    Resumen VARCHAR(200) NOT NULL,
    Cuerpo TEXT NOT NULL,
    Orden INT NOT NULL DEFAULT 0,
    Estado CHAR(1) NOT NULL DEFAULT 'A',
    PRIMARY KEY (CuidadoId),
    UNIQUE KEY uq_cuidado (Especie, Categoria, Titulo),
    KEY idx_especie (Especie, Estado, Orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Contenido semilla.
--
-- El único por (Especie, Categoria, Titulo) hace que re-correr la
-- migración no duplique nada, y el INSERT IGNORE que no falle.
--
-- Es contenido general y de sentido común a propósito: la app no da
-- diagnósticos ni dosis. Donde hace falta un profesional, el texto lo
-- dice y manda a la veterinaria.
-- ------------------------------------------------------------
INSERT IGNORE INTO CuidadoRecomendacion (Especie, Categoria, Titulo, Resumen, Cuerpo, Orden) VALUES
('perro','alimentacion','Cuántas veces por día darle de comer','Los cachorros comen más seguido que los adultos.','Hasta los 4 meses, tres o cuatro comidas por día. De los 4 a los 12 meses, dos o tres. De adulto, dos comidas alcanzan y ayudan a evitar el hambre nocturna.\n\nDejá siempre agua fresca disponible. Si cambiás de alimento, hacelo de a poco durante una semana mezclando el nuevo con el viejo: un cambio de golpe suele terminar en diarrea.',1),
('perro','alimentacion','Alimentos que no puede comer','Hay comida nuestra que para un perro es tóxica.','Nunca le des chocolate, uva ni pasas de uva, cebolla, ajo, palta, alcohol ni nada con xilitol (un endulzante común en chicles y golosinas sin azúcar). Tampoco huesos cocidos: se astillan y pueden perforar el intestino.\n\nSi comió algo de esto, no esperes a ver si le hace mal: llamá a una veterinaria.',2),
('perro','higiene','Cada cuánto bañarlo','Bañarlo de más le arruina la piel.','Un baño por mes suele ser suficiente, o cada dos si no se ensucia mucho. Bañarlo todas las semanas le saca la grasa natural que protege la piel y termina en picazón y caspa.\n\nUsá shampoo para perros: el nuestro tiene un pH que no les sirve. Secalo bien, sobre todo en las orejas.',1),
('perro','higiene','Uñas, orejas y dientes','Lo que se olvida y termina en el veterinario.','Las uñas se cortan cuando se escuchan contra el piso al caminar. Cortá de a poco, lejos de la parte rosada.\n\nLas orejas se revisan una vez por semana: si hay olor fuerte, cera oscura o se rasca mucho, es consulta veterinaria.\n\nLos dientes se cepillan con pasta para perros. El sarro no es estético: termina en infecciones que afectan el corazón y los riñones.',2),
('perro','salud','Vacunas y desparasitación','El calendario que no conviene atrasar.','El plan arranca a las 6-8 semanas y sigue con refuerzos cada 3-4 semanas hasta los 4 meses. Después, refuerzo anual. La antirrábica es obligatoria en la mayoría de los municipios.\n\nLa desparasitación interna se repite según edad y ambiente; la externa (pulgas y garrapatas) es todo el año, no sólo en verano.\n\nEl calendario exacto lo arma la veterinaria según dónde vivís.',1),
('perro','salud','Señales de que algo anda mal','Cuándo dejar de esperar y consultar.','Consultá sin demora si ves: decaimiento que dura más de un día, no comer por más de 24 horas, vómitos o diarrea repetidos, panza dura e hinchada, dificultad para respirar, encías pálidas o azuladas, o intentos de vomitar sin resultado.\n\nEsto último, sobre todo en perros grandes y de pecho profundo, puede ser torsión gástrica: es una urgencia de minutos, no de horas.',2),
('perro','ejercicio','Cuánto paseo necesita','No todos los perros necesitan lo mismo.','Como piso, dos salidas diarias. Las razas de trabajo y los perros jóvenes necesitan bastante más, y sin eso aparecen los destrozos y los ladridos: casi siempre son aburrimiento, no maldad.\n\nEn verano, paseos temprano o de noche: el asfalto caliente les quema las almohadillas. Si no podés apoyar la mano cinco segundos, no puede caminar ahí.',1),
('perro','convivencia','Llegar a una casa nueva','Los primeros días definen mucho.','Dale un lugar propio y tranquilo, y no lo abrumes con visitas la primera semana. Las rutinas fijas de comida y paseo lo ordenan más rápido que cualquier premio.\n\nSi hay otros animales, presentalos de a poco y en territorio neutral. Si hay chicos, enseñales a no molestarlo mientras come o duerme.',1),
('gato','alimentacion','Comida y agua','El gato bebe menos de lo que necesita.','Dejá comida seca disponible y sumá húmeda: es la forma más simple de que tome agua sin darse cuenta, y previene problemas urinarios que en gatos son muy frecuentes.\n\nEl bebedero lejos del comedero (en la naturaleza no beben donde comen) y mejor si es una fuente con agua en movimiento.',1),
('gato','alimentacion','Nada de leche','La leche de vaca les cae mal.','La mayoría de los gatos adultos no digiere la lactosa: la leche de vaca les da diarrea. La imagen del gato con el platito de leche es de las cosas más instaladas y más equivocadas.\n\nTampoco cebolla, ajo, chocolate ni atún en lata de forma habitual.',2),
('gato','higiene','La bandeja sanitaria','La causa número uno de que haga fuera.','La regla es una bandeja por gato más una. Lejos de la comida, en un lugar tranquilo y con salida a la vista: si se siente acorralado, no la usa.\n\nSe limpia todos los días. Si de golpe empieza a hacer fuera de la bandeja, antes de retarlo consultá: muchas veces es dolor al orinar, no un capricho.',1),
('gato','higiene','Cepillado y bolas de pelo','Se cepilla más de lo que se baña.','Los gatos se bañan solos; salvo caso puntual, no necesitan baño. Lo que sí necesitan es cepillado, sobre todo los de pelo largo: lo que no sacás con el cepillo se lo traga y termina en bolas de pelo.\n\nVomitar pelo de vez en cuando es normal; hacerlo seguido, o hacer arcadas sin sacar nada, no lo es.',2),
('gato','salud','Vacunas y castración','Lo básico que alarga la vida.','La triple felina y la antirrábica son el piso, con refuerzo anual. Si sale al exterior, consultá también por leucemia felina.\n\nLa castración evita camadas no deseadas y baja mucho el riesgo de tumores mamarios y de infecciones uterinas, además de las peleas y las escapadas.',1),
('gato','salud','Señales de alarma','Los gatos disimulan el dolor.','Consultá si: deja de comer más de un día, se esconde de golpe, respira con la boca abierta, orina poco o con esfuerzo, o baja de peso sin explicación.\n\nUn gato macho que va y viene a la bandeja sin poder orinar es una urgencia de horas: la obstrucción urinaria puede ser mortal.',2),
('gato','ejercicio','Jugar y trepar','Un gato aburrido se pone gordo o ansioso.','Diez o quince minutos de juego con caña o señuelo, dos veces por día, cambian el carácter de un gato. Terminá siempre dejándolo "cazar" el juguete: quedarse sin atrapar nada lo frustra.\n\nSumá altura: repisas, rascadores altos o el techo de un mueble. Para un gato, el espacio se mide para arriba, no en metros cuadrados.',1),
('gato','convivencia','Rascar es normal','No se le saca, se le redirige.','Rascar les marca territorio y les mantiene las uñas. No se corrige retándolo: se le da un rascador firme y alto, al lado de donde ya rasca, y se lo premia cuando lo usa.\n\nLa amputación de uñas está prohibida en muchos países y es una mutilación: nunca es una opción.',1),
('otro','alimentacion','Cada especie come distinto','Lo que sirve para un perro no sirve para un conejo.','Los conejos y cobayos necesitan heno disponible todo el día: es lo que les desgasta los dientes, que crecen toda la vida. El pellet es un complemento, no la base.\n\nLos cobayos además no fabrican vitamina C y hay que dársela.\n\nAntes de decidir la dieta de un animal que no es perro ni gato, consultá con una veterinaria de exóticos: la información suelta de internet suele estar mal.',1),
('otro','salud','Veterinaria de exóticos','No cualquier clínica atiende cualquier especie.','Conejos, aves, roedores y reptiles necesitan profesionales con formación específica. Buscá y guardá el contacto ANTES de tener una urgencia: a las tres de la mañana no es momento de averiguar quién atiende.\n\nEstas especies esconden los síntomas hasta que están muy comprometidas: cualquier cambio de conducta o de apetito ya es motivo de consulta.',1),
('otro','convivencia','El espacio importa más de lo que parece','Las jaulas de venta suelen ser demasiado chicas.','La mayoría de las jaulas que se venden son el mínimo para transportar, no para vivir. Un conejo necesita varias horas fuera por día; un ave, poder desplegar las alas del todo.\n\nUn animal en un espacio insuficiente desarrolla conductas repetitivas y problemas de huesos y músculos.',1);


-- ######## 029_razas_sin_raza_atigrados.sql ########

-- "Sin raza" primero en perro/gato + atigrados en gatos
-- mysql -u root huellitas < sql/029_razas_sin_raza_atigrados.sql

SET NAMES utf8mb4;

INSERT IGNORE INTO RazaCatalogo (Especie, Nombre) VALUES
('perro', 'Sin raza'),
('gato', 'Sin raza'),
('gato', 'Atigrado Marrón'),
('gato', 'Atigrado Gris');


-- ######## 030_mp_vendedor_perfil.sql ########

-- Perfil visible de la cuenta MP del vendedor + tema del callback OAuth.
-- mysql -u root huellitas < sql/030_mp_vendedor_perfil.sql

SET NAMES utf8mb4;

ALTER TABLE UsuarioMpCuenta
    ADD COLUMN MpNombre VARCHAR(200) NULL AFTER MpEmail,
    ADD COLUMN MpTelefono VARCHAR(40) NULL AFTER MpNombre;

ALTER TABLE UsuarioMpOauthPendiente
    ADD COLUMN Theme VARCHAR(10) NOT NULL DEFAULT 'light' AFTER UserId;


-- ######## 031_hueplus_planes.sql ########

-- Red Huellitas — HuePlus + HuePlus Comercial (catálogo editable)
-- mysql -u root huellitas < sql/031_hueplus_planes.sql
-- Idempotente.

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Columnas nuevas en SuscripcionPlan
-- ------------------------------------------------------------
SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Descripcion'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Descripcion TEXT NULL AFTER Nombre',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'Orden'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN Orden INT NOT NULL DEFAULT 0 AFTER MontoMensual',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'SuscripcionPlan' AND COLUMN_NAME = 'SinComision'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE SuscripcionPlan ADD COLUMN SinComision TINYINT(1) NOT NULL DEFAULT 0 AFTER Orden',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Ítems de beneficios por plan (editables desde admin)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS SuscripcionPlanItem (
    ItemId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    PlanId      INT UNSIGNED NOT NULL,
    Texto       VARCHAR(220) NOT NULL,
    Orden       INT NOT NULL DEFAULT 0,
    Estado      CHAR(1) NOT NULL DEFAULT 'A',
    KEY IX_PlanItem_Plan (PlanId),
    CONSTRAINT FK_PlanItem_Plan FOREIGN KEY (PlanId) REFERENCES SuscripcionPlan(PlanId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrar plan legado → HuePlus Comercial
UPDATE SuscripcionPlan
SET Codigo = 'hue_plus_comercial',
    Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
    MontoMensual = GREATEST(MontoMensual, 8000.00),
    Orden = 2,
    SinComision = 1,
    Estado = 'A'
WHERE Codigo = 'vitrina_comercial';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = COALESCE(Descripcion, 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'),
    Orden = 2,
    SinComision = 1
WHERE Codigo = 'hue_plus_comercial';

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus',
       'HuePlus',
       'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.',
       3500.00,
       1,
       0,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus');

INSERT INTO SuscripcionPlan (Codigo, Nombre, Descripcion, MontoMensual, Orden, SinComision, Estado)
SELECT 'hue_plus_comercial',
       'HuePlus Comercial',
       'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.',
       8000.00,
       2,
       1,
       'A'
WHERE NOT EXISTS (SELECT 1 FROM SuscripcionPlan WHERE Codigo = 'hue_plus_comercial');

-- Ítems HuePlus (sólo si el plan no tiene ninguno)
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Insignia HuePlus en tu perfil' AS Texto
    UNION ALL SELECT 2, 'Crear tu mascota real con IA'
    UNION ALL SELECT 3, 'Acceso anticipado a novedades de la comunidad'
) v
WHERE p.Codigo = 'hue_plus'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);

-- Ítems HuePlus Comercial
INSERT INTO SuscripcionPlanItem (PlanId, Texto, Orden, Estado)
SELECT p.PlanId, v.Texto, v.Orden, 'A'
FROM SuscripcionPlan p
JOIN (
    SELECT 1 AS Orden, 'Todo lo incluido en HuePlus' AS Texto
    UNION ALL SELECT 2, 'Insignia HuePlus Comercial (distinta)'
    UNION ALL SELECT 3, 'Sin retención por comisión de venta, vendas lo que vendas'
    UNION ALL SELECT 4, 'Vitrina destacada en la tienda'
) v
WHERE p.Codigo = 'hue_plus_comercial'
  AND NOT EXISTS (SELECT 1 FROM SuscripcionPlanItem i WHERE i.PlanId = p.PlanId);


-- ######## 032_mascota_banner.sql ########

-- Banner / foco de recorte en Mis mascotas
-- mysql -u root huellitas < sql/032_mascota_banner.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'ModoBanner'
);
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Mascota ADD COLUMN ModoBanner ENUM('portada','banner') NOT NULL DEFAULT 'portada' AFTER DescripcionTexto",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerPath'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerPath VARCHAR(255) NULL AFTER ModoBanner',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Mascota' AND COLUMN_NAME = 'BannerFocusY'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE Mascota ADD COLUMN BannerFocusY DECIMAL(4,3) NOT NULL DEFAULT 0.500 AFTER BannerPath',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ######## 033_fix_hueplus_acentos.sql ########

-- Fix acentos en planes HuePlus (corrige ?? por SOURCE mal codificado en Windows)
-- Ejecutar con cliente UTF-8: mysql --default-character-set=utf8mb4 -u root huellitas < sql/033_fix_hueplus_acentos.sql

SET NAMES utf8mb4;

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus',
    Descripcion = 'La suscripción de Red Huellitas: insignia, mascota real con IA y beneficios de la comunidad.'
WHERE Codigo = 'hue_plus';

UPDATE SuscripcionPlan
SET Nombre = 'HuePlus Comercial',
    Descripcion = 'Todo lo de HuePlus, y además vendés en la tienda sin retención por comisión.'
WHERE Codigo IN ('hue_plus_comercial', 'vitrina_comercial');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial')
  AND (i.Texto LIKE 'Sin retenci%' OR i.Texto LIKE '%comisi%venta%');

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus en tu perfil'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Crear tu mascota real con IA'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Acceso anticipado a novedades de la comunidad'
WHERE p.Codigo = 'hue_plus' AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Todo lo incluido en HuePlus'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 1;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Insignia HuePlus Comercial (distinta)'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 2;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Sin retención por comisión de venta, vendas lo que vendas'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 3;

UPDATE SuscripcionPlanItem i
JOIN SuscripcionPlan p ON p.PlanId = i.PlanId
SET i.Texto = 'Vitrina destacada en la tienda'
WHERE p.Codigo IN ('hue_plus_comercial', 'vitrina_comercial') AND i.Orden = 4;


-- ######## 034_verificacion_reintentos.sql ########

-- Reintentos de verificación automática (Gemini/IA)
-- mysql --default-character-set=utf8mb4 -u root huellitas < sql/034_verificacion_reintentos.sql

SET NAMES utf8mb4;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentoEn'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentoEn DATETIME NULL AFTER KycEstado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND COLUMN_NAME = 'AutoReintentos'
);
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE UsuarioVerificacion ADD COLUMN AutoReintentos INT UNSIGNED NOT NULL DEFAULT 0 AFTER AutoReintentoEn',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'UsuarioVerificacion' AND INDEX_NAME = 'IX_Verif_AutoReintento'
);
SET @sql = IF(@idx = 0,
    'ALTER TABLE UsuarioVerificacion ADD KEY IX_Verif_AutoReintento (EstadoRevision, AutoReintentoEn)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ######## 035_transito_donacion_acordado.sql ########

-- ============================================================
-- Tránsito y Donaciones: estado del trato ("acordado")
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/035_transito_donacion_acordado.sql
-- ============================================================

-- ------------------------------------------------------------
-- Por qué hace falta una columna nueva y no alcanzaba con algo
-- que ya estaba.
--
-- El resto de los módulos puede bloquear la edición porque tiene
-- de dónde deducir que hay otra persona involucrada: Adopción
-- mira las postulaciones, Perdidos mira si ya se reencontró.
-- Tránsito y Donaciones no tenían ninguna señal: el acuerdo se
-- arregla por WhatsApp o por chat y en la base no queda rastro.
-- Sólo existía Estado A/I, que es "publicada / dada de baja".
--
-- Deducirlo de "alguien abrió una conversación" sería peor que
-- no bloquear nada: congelaría una publicación por una simple
-- consulta, y preguntar es justamente lo que uno quiere que
-- pase seguido.
--
-- Así que el estado lo marca el dueño a mano, y es reversible:
-- si el acuerdo se cae, vuelve a 'disponible' y la publicación
-- se puede volver a editar. Mismo criterio que Adopción, donde
-- cancelar la última postulación devuelve la edición.
-- ------------------------------------------------------------

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND COLUMN_NAME = 'EstadoTransito');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Transito ADD COLUMN EstadoTransito ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER DuracionDias",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND COLUMN_NAME = 'EstadoDonacion');
SET @sql = IF(@col_exists = 0,
    "ALTER TABLE Donacion ADD COLUMN EstadoDonacion ENUM('disponible','acordado') NOT NULL DEFAULT 'disponible' AFTER Especie",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Índices: los listados filtran por estado para poder mostrar
-- primero lo que todavía está disponible.
-- ------------------------------------------------------------
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Transito' AND INDEX_NAME = 'IX_Transito_EstadoTransito');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Transito_EstadoTransito ON Transito (EstadoTransito, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Donacion' AND INDEX_NAME = 'IX_Donacion_EstadoDonacion');
SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX IX_Donacion_EstadoDonacion ON Donacion (EstadoDonacion, Estado)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ######## 036_adopcion_ubicacion.sql ########

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


-- ######## 037_mapa_indices_geo.sql ########

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


-- ######## 038_mapa_consumo.sql ########

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


-- ######## 039_cuidados_especies.sql ########

-- Amplía especies de Cuidados más allá de perro/gato/otro.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/039_cuidados_especies.sql

SET NAMES utf8mb4;

ALTER TABLE CuidadoRecomendacion
    MODIFY Especie VARCHAR(20) NOT NULL;

INSERT IGNORE INTO CuidadoRecomendacion (Especie, Categoria, Titulo, Resumen, Cuerpo, Orden) VALUES
('conejo','alimentacion','Heno todo el día','El heno no es un snack: es la base.','Los conejos necesitan heno de buena calidad disponible las 24 horas. Les desgasta los dientes (que crecen toda la vida) y les mantiene el aparato digestivo en marcha.\n\nEl pellet es un complemento medido, no el plato principal. Sumá verduras de hoja frescas y agua limpia siempre.',1),
('conejo','salud','No lo levantes mal','La columna de un conejo es frágil.','Nunca lo tomes solo de las orejas ni lo dejes colgando. Sostené el pecho y el tren trasero juntos.\n\nSi deja de comer aunque sea un día, es urgencia: su digestión no tolera el ayuno. Buscá veterinaria de exóticos antes de necesitarla.',1),
('conejo','convivencia','Espacio para saltar','La jaula chica no alcanza.','Necesita varias horas diarias fuera de la jaula en un espacio seguro. Sin eso aparecen obesidad, aburrimiento y problemas óseos.\n\nOjo con cables y plantas tóxicas: si llega, lo muerde.',1),

('ave','alimentacion','Semillas solas no alcanzan','Una dieta solo de semillas engorda y desnutre.','Mezclá pellets formulados para su especie, frutas y verduras aptas, y muy pocas semillas como premio.\n\nEl agua se cambia todos los días. Nunca aguacate, chocolate, cafeína ni alcohol.',1),
('ave','ejercicio','Vuelo y juguetes','Un ave aburrida se despluma.','La jaula tiene que permitir abrir las alas por completo. Sacala a volar o trepar en un ambiente seguro todos los días.\n\nRotá juguetes: necesitan destruir, forrajear y resolver cosas con el pico.',1),
('ave','salud','Corrientes y noches','Las aves se resfrían fácil.','Evitá corrientes y cambios bruscos de temperatura. Necesitan 10–12 horas de oscuridad y silencio para dormir bien.\n\nCualquier cambio de voz, postura o apetito merece consulta con un veterinario de aves.',1),

('pez','alimentacion','Poco y seguido','El exceso de comida pudre el agua.','Dale solo lo que coman en dos o tres minutos, una o dos veces al día. Lo que sobra ensucia y enferma.\n\nCada especie tiene su alimento: no uses el mismo para todos.',1),
('pez','salud','El agua es el hábitat','Si el agua falla, el pez enferma.','Ciclo el acuario antes de agregar peces, controlá amoníaco/nitritos y hacé cambios parciales de agua con regularidad.\n\nNo laves el filtro con agua de la canilla con cloro: matás las bacterias buenas.',1),
('pez','convivencia','Compatibilidad','No todos los peces pueden vivir juntos.','Investigá tamaño adulto, temperamento y parámetros (temperatura, pH) antes de mezclar especies.\n\nUn pez grande y territorial puede estresar o comerse a los chicos.',1),

('hamster','alimentacion','De noche comen','Son crepusculares/nocturnos.','Usá alimento específico para hámster y sumá snacks aptos con medida. Siempre hay agua limpia.\n\nNunca chocolate, cítricos ácidos en exceso ni comida chatarra humana.',1),
('hamster','convivencia','Uno por jaula','Suelen ser territoriales.','La mayoría de hámsteres viven solos. Juntarlos puede terminar en peleas graves.\n\nLa rueda debe ser sólida (sin barrotes) y del diámetro adecuado para no arquearles la espalda.',1),
('hamster','higiene','Sustrato seguro','El aserrín aromático irrita.','Usá sustrato apto para roedores, sin polvo fuerte. Limpiá la jaula con frecuencia pero dejá un rincón con olor familiar para que no se estrese.',1),

('cobayo','alimentacion','Vitamina C obligatoria','No la fabrican solos.','Además de heno ilimitado, necesitan fuente diaria de vitamina C (verduras aptas o suplemento indicado por el vet).\n\nSin eso aparecen problemas de piel, dientes y articulaciones.',1),
('cobayo','convivencia','Compañía','Son animales sociales.','Viven mejor en pareja o grupo compatible, con espacio amplio. Una jaula de pet shop suele ser chica.\n\nPresentalos con cuidado y observá peleas.',1),
('cobayo','salud','Dientes y pelo','Crece todo el tiempo.','El heno desgasta los dientes. Si babea, deja de comer o adelgaza, consultá.\n\nLos de pelo largo necesitan cepillado frecuente para evitar nudos y moscas.',1),

('tortuga','alimentacion','Según la especie','No hay una dieta única.','Tortugas terrestres, de agua y semiacuáticas comen distinto. Investigá la tuya: muchas necesitan calcio y exposición a UVB.\n\nLa lechuga sola no es una dieta completa.',1),
('tortuga','salud','Calor y luz UVB','Sin UVB enferman los huesos.','Necesitan gradiente térmico y lámpara UVB adecuada (se renueva según vida útil del fabricante).\n\nUn caparazón blando o deformado es señal de alarma.',1),
('tortuga','convivencia','Terrario amplio','Crecen más de lo que parece.','Calculá el tamaño adulto antes de comprarla. El hacinamiento genera estrés e infecciones.\n\nAgua limpia si es acuática; escondites secos y húmedos según especie.',1),

('huron','alimentacion','Dieta carnívora','No son roedores.','Necesitan alimento alto en proteína animal y bajo en fibra vegetal. La comida de gato de calidad a veces se usa bajo consejo vet, nunca comida de perro como base.\n\nChocolate, uvas y cebolla también les son tóxicos.',1),
('huron','ejercicio','Horas fuera','Duermen mucho, pero despiertos explotan.','Varias horas diarias de juego supervisado fuera de la jaula. Escondé cables y huecos peligrosos.\n\nSin estímulo destruyen o se deprimen.',1),
('huron','salud','Vacunas y olores','Requieren controles específicos.','Consultá vacunas y desparasitación con un vet que conozca hurones. El olor baja mucho con castración/histerectomía y higiene del ambiente, no con baños constantes.',1);


-- ######## 040_donacion_categoria_ropa.sql ########

-- Categoría ropa/comodidades en Donaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/040_donacion_categoria_ropa.sql

SET NAMES utf8mb4;

ALTER TABLE Donacion
    MODIFY Categoria ENUM('alimento','insumo','ropa') NOT NULL;


-- ######## 041_especies_ampliadas.sql ########

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


-- ######## 042_reacciones_ampliadas.sql ########

-- Amplía reacciones de publicaciones.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/042_reacciones_ampliadas.sql

SET NAMES utf8mb4;

ALTER TABLE PostReaccion
    MODIFY Tipo ENUM(
        'like',
        'me_divierte',
        'amor',
        'asombro',
        'triste',
        'abrazo',
        'huella',
        'apoyo',
        'guau',
        'michi'
    ) NOT NULL;


-- ######## 043_campanias_inscripcion.sql ########

-- ============================================================
-- Campañas: inscripción con formulario, cupo y lista de espera
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/043_campanias_inscripcion.sql
-- ============================================================

-- ------------------------------------------------------------
-- Campania: mensaje de aviso y límite para darse de baja.
--
-- `CupoMaximo` NULL ya significaba "sin límite", así que no hace
-- falta un flag aparte: agregarlo daría dos fuentes para el mismo
-- dato y tarde o temprano se contradicen.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'MensajeAviso');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN MensajeAviso TEXT NULL AFTER Descripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Horas antes de FechaDesde hasta las que se admite la baja.
-- NULL = se puede dar de baja siempre.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'BajaLimiteHoras');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN BajaLimiteHoras INT UNSIGNED NULL AFTER CupoMaximo',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- CampaniaInscripcion: estado y posición.
--
-- `Posicion` es el número de orden en que se anotó, y NO se
-- recalcula al cancelar. Si se renumerara, alguien que se anotó
-- primero podría terminar detrás de otro por una baja ajena, y el
-- orden de la lista de espera es justamente lo que hay que poder
-- defender ante un reclamo.
--
-- Las canceladas se conservan (Estado='cancelada') en vez de
-- borrarse: hacen falta para saber quién se dio de baja y cuándo,
-- sobre todo con el aviso de ausencia.
-- ------------------------------------------------------------
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Estado');
SET @sql = IF(@c = 0,
    "ALTER TABLE CampaniaInscripcion ADD COLUMN Estado ENUM('confirmada','lista_espera','cancelada','ausente') NOT NULL DEFAULT 'confirmada' AFTER UserId",
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'Posicion');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN Posicion INT UNSIGNED NOT NULL DEFAULT 0 AFTER Estado',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'CanceladaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN CanceladaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'AvisoAusenciaEn');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN AvisoAusenciaEn DATETIME NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND COLUMN_NAME = 'NotaAusencia');
SET @sql = IF(@c = 0,
    'ALTER TABLE CampaniaInscripcion ADD COLUMN NotaAusencia VARCHAR(255) NULL',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'CampaniaInscripcion' AND INDEX_NAME = 'IX_CampaniaInscripcion_Orden');
SET @sql = IF(@idx = 0,
    'CREATE INDEX IX_CampaniaInscripcion_Orden ON CampaniaInscripcion (CampaniaId, Estado, Posicion)',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- Formulario: mismas tres tablas que Adopción, mismos nombres de
-- columna. Un formulario dinámico ya resuelto en este proyecto no
-- se reinventa con otra forma.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS CampaniaPregunta (
    CampaniaPreguntaId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaId         INT UNSIGNED NOT NULL,
    Tipo               ENUM('texto','si_no','opcion_multiple') NOT NULL DEFAULT 'texto',
    Texto              VARCHAR(255) NOT NULL,
    Obligatoria        TINYINT(1) NOT NULL DEFAULT 1,
    Orden              TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPregunta_Campania FOREIGN KEY (CampaniaId) REFERENCES Campania(CampaniaId),
    INDEX IX_CampaniaPregunta_Campania (CampaniaId, Orden)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaPreguntaOpcion (
    CampaniaPreguntaOpcionId INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    Texto                    VARCHAR(150) NOT NULL,
    Orden                    TINYINT UNSIGNED NOT NULL DEFAULT 0,
    CONSTRAINT FK_CampaniaPreguntaOpcion_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS CampaniaRespuesta (
    CampaniaRespuestaId      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    CampaniaInscripcionId    INT UNSIGNED NOT NULL,
    CampaniaPreguntaId       INT UNSIGNED NOT NULL,
    RespuestaTexto           TEXT NULL,
    CampaniaPreguntaOpcionId INT UNSIGNED NULL,
    CONSTRAINT FK_CampaniaRespuesta_Inscripcion FOREIGN KEY (CampaniaInscripcionId) REFERENCES CampaniaInscripcion(CampaniaInscripcionId),
    CONSTRAINT FK_CampaniaRespuesta_Pregunta FOREIGN KEY (CampaniaPreguntaId) REFERENCES CampaniaPregunta(CampaniaPreguntaId),
    INDEX IX_CampaniaRespuesta_Inscripcion (CampaniaInscripcionId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ######## 044_direccion_lugares.sql ########

-- ============================================================
-- Dirección exacta para los lugares con puerta a la calle
-- Idempotente: se puede correr más de una vez sin error.
--
-- Correr con cliente UTF-8:
--   mysql --default-character-set=utf8mb4 -u root huellitas < sql/044_direccion_lugares.sql
-- ============================================================

-- ------------------------------------------------------------
-- Hasta ahora sólo existía `ZonaDescripcion`, que es el barrio
-- ("Palermo"). Sirve para filtrar y para las publicaciones de
-- personas, donde la dirección justamente NO se publica.
--
-- Pero en una veterinaria, un refugio o una campaña, la calle y
-- el número son el dato que la gente necesita para llegar. Va en
-- una columna aparte y no reusando ZonaDescripcion porque los dos
-- se muestran juntos y significan cosas distintas.
--
-- Nullable: no todos los cargan, y una campaña en una plaza puede
-- no tener dirección postal.
-- ------------------------------------------------------------

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Veterinaria' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Veterinaria ADD COLUMN Direccion VARCHAR(200) NULL AFTER Horario',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Campania' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Campania ADD COLUMN Direccion VARCHAR(200) NULL AFTER ZonaDescripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Los refugios son usuarios (TipoUsuario = 'refugio'), no tienen
-- tabla propia, así que la dirección va en Usuario.
SET @c = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Usuario' AND COLUMN_NAME = 'Direccion');
SET @sql = IF(@c = 0,
    'ALTER TABLE Usuario ADD COLUMN Direccion VARCHAR(200) NULL AFTER ZonaDescripcion',
    'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ######## 045_equipos.sql ########

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


SET FOREIGN_KEY_CHECKS = 1;
-- FIN pasaje 025→045
