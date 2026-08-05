-- =============================================================================
-- Seed PREPROD — datos de ejemplo para probar toda la app
-- =============================================================================
--
-- Requisito: esquema completo (pasaje 025→045 / 000_todo_schema) ya aplicado.
-- No toca catálogos (razas, planes, categorías, cuidados).
--
-- Correr (UTF-8):
--   mysql --default-character-set=utf8mb4 -u USUARIO -p NOMBRE_BD < sql/seed_preprod_demo.sql
--
-- En Hostinger / phpMyAdmin: Importar este archivo (charset utf8mb4).
--
-- Login de TODOS los usuarios demo:
--   email:  demo1@rh-demo.local … demo8@rh-demo.local
--   clave:  Demo123!
--
-- Re-ejecutable: borra la demo anterior (@rh-demo.local) y vuelve a crear.
-- Para borrar sin reseñar: php inc/cli/seed_preprod_demo.php --limpiar
-- =============================================================================

SET NAMES utf8mb4;
SET @rh_marca = '[demo-preprod]';
-- bcrypt de "Demo123!" (PASSWORD_DEFAULT)
SET @rh_pass = '$2y$10$rIt8kkFhP3bhUNBi1H8pS.AQHqTWG5QfXj3wdAffAL0ojZMDO0uKq';

SET @tipo_ind = (SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = 'individual' LIMIT 1);
SET @tipo_ref = (SELECT TipoUsuarioId FROM TipoUsuarioCatalogo WHERE Codigo = 'refugio' LIMIT 1);
SET @plan_hue = (
  SELECT PlanId FROM SuscripcionPlan
  WHERE Codigo IN ('hue_plus', 'hue_plus_comercial', 'vitrina_comercial')
  ORDER BY PlanId LIMIT 1
);
SET @cat_alim = (SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo = 'alimento' LIMIT 1);
SET @cat_jug  = (SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo = 'juguetes' LIMIT 1);
SET @cat_hig  = (SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo = 'higiene' LIMIT 1);
SET @cat_sal  = (SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo = 'salud' LIMIT 1);
SET @cat_pas  = (SELECT CategoriaId FROM ProductoCategoriaCatalogo WHERE Codigo = 'paseo' LIMIT 1);
SET @tipo_eq  = (SELECT TipoEquipoId FROM TipoEquipoCatalogo WHERE Codigo = 'refugio' LIMIT 1);

SET @raza_lab     = (SELECT RazaId FROM RazaCatalogo WHERE Especie='perro' AND Nombre='Labrador Retriever' LIMIT 1);
SET @raza_mest    = (SELECT RazaId FROM RazaCatalogo WHERE Especie='perro' AND Nombre='Mestizo' LIMIT 1);
SET @raza_can     = (SELECT RazaId FROM RazaCatalogo WHERE Especie='perro' AND Nombre='Caniche' LIMIT 1);
SET @raza_sia     = (SELECT RazaId FROM RazaCatalogo WHERE Especie='gato' AND Nombre='Siamés' LIMIT 1);
SET @raza_mest_g  = (SELECT RazaId FROM RazaCatalogo WHERE Especie='gato' AND Nombre='Mestizo / Común Europeo' LIMIT 1);
SET @raza_maine   = (SELECT RazaId FROM RazaCatalogo WHERE Especie='gato' AND Nombre='Maine Coon' LIMIT 1);

-- ---------------------------------------------------------------------------
-- LIMPIEZA demo anterior
-- ---------------------------------------------------------------------------
CREATE TEMPORARY TABLE IF NOT EXISTS _rh_demo_uids AS
SELECT UserId FROM Usuario WHERE Email LIKE '%@rh-demo.local';

DELETE FROM Calificacion WHERE DeUserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM CampaniaRespuesta WHERE CampaniaInscripcionId IN (
  SELECT CampaniaInscripcionId FROM CampaniaInscripcion
  WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
     OR CampaniaId IN (SELECT CampaniaId FROM Campania WHERE UserId IN (SELECT UserId FROM _rh_demo_uids))
);
DELETE FROM CampaniaPreguntaOpcion WHERE CampaniaPreguntaId IN (
  SELECT CampaniaPreguntaId FROM CampaniaPregunta WHERE CampaniaId IN (
    SELECT CampaniaId FROM Campania WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
  )
);
DELETE FROM CampaniaPregunta WHERE CampaniaId IN (
  SELECT CampaniaId FROM Campania WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM CampaniaInscripcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
   OR CampaniaId IN (SELECT CampaniaId FROM Campania WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM MatchWhatsappConsentimiento WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MatchMensaje WHERE UserIdEmisor IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MascotaMatch WHERE UserIdA IN (SELECT UserId FROM _rh_demo_uids)
   OR UserIdB IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MascotaMatchSwipe WHERE MascotaIdOrigen IN (
  SELECT MascotaId FROM Mascota WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
) OR MascotaIdDestino IN (
  SELECT MascotaId FROM Mascota WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM Mensaje WHERE UserIdEmisor IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM ConversacionParticipante WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE c FROM Conversacion c
  LEFT JOIN ConversacionParticipante p ON p.ConversacionId = c.ConversacionId
  WHERE p.ConversacionId IS NULL;
DELETE FROM Notificacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
   OR ActorUserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM SolicitudSeguimiento WHERE UserIdSolicitante IN (SELECT UserId FROM _rh_demo_uids)
   OR UserIdDestino IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Seguimiento WHERE UserIdSeguidor IN (SELECT UserId FROM _rh_demo_uids)
   OR UserIdSeguido IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM PostReaccion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM PostFoto WHERE PostId IN (SELECT PostId FROM Post WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Post WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM HistoriaVista WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Historia WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM AdopcionFavorito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM AdopcionRespuesta WHERE AdopcionPostulacionId IN (
  SELECT AdopcionPostulacionId FROM AdopcionPostulacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM AdopcionPostulacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
   OR AdopcionId IN (SELECT AdopcionId FROM Adopcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM AdopcionPreguntaOpcion WHERE AdopcionPreguntaId IN (
  SELECT AdopcionPreguntaId FROM AdopcionPregunta WHERE AdopcionId IN (
    SELECT AdopcionId FROM Adopcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
  )
);
DELETE FROM AdopcionPregunta WHERE AdopcionId IN (
  SELECT AdopcionId FROM Adopcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM AdopcionFoto WHERE AdopcionId IN (
  SELECT AdopcionId FROM Adopcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM Adopcion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM TransitoFoto WHERE TransitoId IN (SELECT TransitoId FROM Transito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Transito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM PerdidoFoto WHERE PerdidoId IN (SELECT PerdidoId FROM Perdido WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Perdido WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM DonacionFoto WHERE DonacionId IN (SELECT DonacionId FROM Donacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Donacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM VeterinariaFoto WHERE VeterinariaId IN (SELECT VeterinariaId FROM Veterinaria WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Veterinaria WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM ProductoFavorito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM ProductoFoto WHERE ProductoId IN (SELECT ProductoId FROM Producto WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM CarritoItem WHERE CarritoId IN (SELECT CarritoId FROM Carrito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Carrito WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM PedidoItem WHERE PedidoId IN (
  SELECT PedidoId FROM Pedido
  WHERE CompradorUserId IN (SELECT UserId FROM _rh_demo_uids)
     OR VendedorUserId IN (SELECT UserId FROM _rh_demo_uids)
);
DELETE FROM Pedido WHERE CompradorUserId IN (SELECT UserId FROM _rh_demo_uids)
   OR VendedorUserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Producto WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Campania WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM EquipoMiembro WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Equipo WHERE Nombre LIKE '%Demo Preprod%' OR Descripcion LIKE CONCAT('%', @rh_marca, '%');
DELETE FROM MascotaAvatarGeneracion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MascotaJuego WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MascotaCarnetAcceso WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MascotaFoto WHERE MascotaId IN (SELECT MascotaId FROM Mascota WHERE UserId IN (SELECT UserId FROM _rh_demo_uids));
DELETE FROM Mascota WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM UsuarioVerificacion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM UsuarioSesion WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM PasswordReset WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM ReporteSolicitud WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Denuncia WHERE UserIdDenunciante IN (SELECT UserId FROM _rh_demo_uids)
   OR UserIdDenunciado IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM MapaCargaUsuarioDia WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);
DELETE FROM Usuario WHERE UserId IN (SELECT UserId FROM _rh_demo_uids);

DROP TEMPORARY TABLE IF EXISTS _rh_demo_uids;

-- ---------------------------------------------------------------------------
-- USUARIOS (8)
-- ---------------------------------------------------------------------------
INSERT INTO Usuario
  (Email, PasswordHash, NombreCompleto, Username, ZonaLat, ZonaLng, ZonaDescripcion,
   WhatsappNumero, WhatsappVisibilidad, OnboardingCompleto, AceptoClausulaAntiCriaderos,
   AceptoClausulaFecha, Rol, TipoUsuarioId, SuscripcionPlanId, SuscripcionPagaHasta, Estado)
VALUES
('demo1@rh-demo.local', @rh_pass, 'Lucía Fernández',   'lucia_palermo',   -34.5885000, -58.4266000, 'Palermo, CABA',      '5491111110001', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, NULL, NULL, 'A'),
('demo2@rh-demo.local', @rh_pass, 'Martín Gómez',      'martin_belgrano', -34.5627000, -58.4560000, 'Belgrano, CABA',     '5491111110002', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, NULL, NULL, 'A'),
('demo3@rh-demo.local', @rh_pass, 'Sofía Ruiz',        'sofia_caballito', -34.6187000, -58.4404000, 'Caballito, CABA',    '5491111110003', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, @plan_hue, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'A'),
('demo4@rh-demo.local', @rh_pass, 'Refugio Huellas CABA','refugio_huellas',-34.5990000, -58.4380000, 'Villa Crespo, CABA', '5491111110004', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ref, @plan_hue, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'A'),
('demo5@rh-demo.local', @rh_pass, 'Ignacio Pérez',     'nacho_almagro',   -34.6096000, -58.4200000, 'Almagro, CABA',      '5491111110005', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, NULL, NULL, 'A'),
('demo6@rh-demo.local', @rh_pass, 'Valentina Díaz',    'vale_flores',     -34.6280000, -58.4640000, 'Flores, CABA',       '5491111110006', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, NULL, NULL, 'A'),
('demo7@rh-demo.local', @rh_pass, 'Vet Amigos San Telmo','vet_san_telmo', -34.6212000, -58.3731000, 'San Telmo, CABA',    '5491111110007', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ind, @plan_hue, DATE_ADD(CURDATE(), INTERVAL 60 DAY), 'A'),
('demo8@rh-demo.local', @rh_pass, 'Rescatistas del Norte','rescatistas_norte',-34.5450000,-58.4620000,'Núñez, CABA',     '5491111110008', 'publica', 'Y', 1, NOW(), 'usuario', @tipo_ref, NULL, NULL, 'A');

SET @u1 = (SELECT UserId FROM Usuario WHERE Email='demo1@rh-demo.local');
SET @u2 = (SELECT UserId FROM Usuario WHERE Email='demo2@rh-demo.local');
SET @u3 = (SELECT UserId FROM Usuario WHERE Email='demo3@rh-demo.local');
SET @u4 = (SELECT UserId FROM Usuario WHERE Email='demo4@rh-demo.local');
SET @u5 = (SELECT UserId FROM Usuario WHERE Email='demo5@rh-demo.local');
SET @u6 = (SELECT UserId FROM Usuario WHERE Email='demo6@rh-demo.local');
SET @u7 = (SELECT UserId FROM Usuario WHERE Email='demo7@rh-demo.local');
SET @u8 = (SELECT UserId FROM Usuario WHERE Email='demo8@rh-demo.local');

INSERT IGNORE INTO Seguimiento (UserIdSeguidor, UserIdSeguido) VALUES
(@u1,@u2),(@u1,@u4),(@u2,@u1),(@u2,@u3),(@u3,@u4),(@u3,@u5),
(@u5,@u1),(@u5,@u6),(@u6,@u4),(@u6,@u8),(@u7,@u4),(@u8,@u1);

-- ---------------------------------------------------------------------------
-- MASCOTAS + JUEGO
-- ---------------------------------------------------------------------------
INSERT INTO Mascota (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, DescripcionTexto, CarnetVisibilidad, DisponibleParaMatch, Estado) VALUES
(@u1,'Lola','hembra',3,0,'perro',@raza_lab, CONCAT('Cariñosa y juguetona ', @rh_marca),'publica',1,'A'),
(@u1,'Mora','hembra',2,4,'gato',@raza_sia, CONCAT('Curiosa, ama las ventanas ', @rh_marca),'publica',1,'A'),
(@u2,'Rocky','macho',4,2,'perro',@raza_mest, CONCAT('Ideal para departamento grande ', @rh_marca),'publica',1,'A'),
(@u2,'Nube','hembra',1,6,'gato',@raza_mest_g, CONCAT('Tranquila y mimosa ', @rh_marca),'publica',1,'A'),
(@u3,'Toby','macho',5,0,'perro',@raza_can, CONCAT('Entrenado y sociable ', @rh_marca),'publica',1,'A'),
(@u4,'Rita','hembra',2,0,'perro',@raza_mest, CONCAT('En el refugio ', @rh_marca),'publica',0,'A'),
(@u5,'Otto','macho',3,3,'gato',@raza_maine, CONCAT('Grande y noble ', @rh_marca),'publica',1,'A'),
(@u6,'Pepa','hembra',1,2,'perro',@raza_lab, CONCAT('Cachorra con energía ', @rh_marca),'publica',1,'A'),
(@u8,'Chispa','hembra',0,8,'gato',@raza_mest_g, CONCAT('Rescatada en socialización ', @rh_marca),'publica',0,'A');

SET @m1 = (SELECT MascotaId FROM Mascota WHERE UserId=@u1 AND Nombre='Lola' ORDER BY MascotaId DESC LIMIT 1);
SET @m2 = (SELECT MascotaId FROM Mascota WHERE UserId=@u1 AND Nombre='Mora' ORDER BY MascotaId DESC LIMIT 1);
SET @m3 = (SELECT MascotaId FROM Mascota WHERE UserId=@u2 AND Nombre='Rocky' ORDER BY MascotaId DESC LIMIT 1);
SET @m4 = (SELECT MascotaId FROM Mascota WHERE UserId=@u2 AND Nombre='Nube' ORDER BY MascotaId DESC LIMIT 1);
SET @m5 = (SELECT MascotaId FROM Mascota WHERE UserId=@u3 AND Nombre='Toby' ORDER BY MascotaId DESC LIMIT 1);
SET @m7 = (SELECT MascotaId FROM Mascota WHERE UserId=@u5 AND Nombre='Otto' ORDER BY MascotaId DESC LIMIT 1);
SET @m8 = (SELECT MascotaId FROM Mascota WHERE UserId=@u6 AND Nombre='Pepa' ORDER BY MascotaId DESC LIMIT 1);

INSERT INTO MascotaJuego (MascotaId, UserId, Hambre, Felicidad, Energia, Higiene, Nivel, Experiencia, RachaDias, UltimaVisita) VALUES
(@m1,@u1,70,85,60,90,3,120,3,CURDATE()),
(@m3,@u2,40,55,80,50,2,40,1,CURDATE()),
(@m5,@u3,90,95,70,80,5,300,5,CURDATE())
ON DUPLICATE KEY UPDATE Hambre=VALUES(Hambre), Felicidad=VALUES(Felicidad);

-- ---------------------------------------------------------------------------
-- FEED
-- ---------------------------------------------------------------------------
INSERT INTO Post (UserId, Texto, Estado) VALUES
(@u1, CONCAT('DEMO-POST-1 Paseo matutino por Palermo con Lola ', @rh_marca), 'A'),
(@u2, CONCAT('DEMO-POST-2 Rocky descubrió que odia la lluvia ', @rh_marca), 'A'),
(@u3, CONCAT('DEMO-POST-3 Tips de enriquecimiento para gatos en dpto ', @rh_marca), 'A'),
(@u4, CONCAT('DEMO-POST-4 Este finde abrimos visitas al refugio ', @rh_marca), 'A'),
(@u5, CONCAT('DEMO-POST-5 Otto aprobó su control anual ', @rh_marca), 'A'),
(@u6, CONCAT('DEMO-POST-6 Primera clase de education canina con Pepa ', @rh_marca), 'A'),
(@u8, CONCAT('DEMO-POST-7 Rescate de la semana: Chispa ya come solita ', @rh_marca), 'A'),
(@u1, CONCAT('DEMO-POST-8 ¿Guardería confiable en Palermo? ', @rh_marca), 'A');

SET @p1 = (SELECT PostId FROM Post WHERE Texto LIKE 'DEMO-POST-1%' ORDER BY PostId DESC LIMIT 1);
SET @p2 = (SELECT PostId FROM Post WHERE Texto LIKE 'DEMO-POST-2%' ORDER BY PostId DESC LIMIT 1);
SET @p4 = (SELECT PostId FROM Post WHERE Texto LIKE 'DEMO-POST-4%' ORDER BY PostId DESC LIMIT 1);
SET @p7 = (SELECT PostId FROM Post WHERE Texto LIKE 'DEMO-POST-7%' ORDER BY PostId DESC LIMIT 1);
SET @p8 = (SELECT PostId FROM Post WHERE Texto LIKE 'DEMO-POST-8%' ORDER BY PostId DESC LIMIT 1);

INSERT IGNORE INTO PostReaccion (PostId, UserId, Tipo) VALUES
(@p1,@u2,'guau'),(@p1,@u3,'amor'),(@p1,@u5,'huella'),
(@p2,@u1,'me_divierte'),(@p4,@u1,'apoyo'),(@p4,@u6,'like'),
(@p7,@u4,'abrazo'),(@p8,@u7,'like');

-- ---------------------------------------------------------------------------
-- ADOPCIÓN / TRÁNSITO / PERDIDOS / DONACIONES
-- ---------------------------------------------------------------------------
INSERT INTO Adopcion (UserId, Nombre, Sexo, EdadAnios, EdadMeses, Especie, RazaId, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, EstadoAdopcion, Estado) VALUES
(@u4,'Luna','hembra',2,0,'perro',@raza_mest, CONCAT('Cachorra vacunada ', @rh_marca),'Palermo, CABA',-34.5885000,-58.4266000,'disponible','A'),
(@u4,'Mishi','macho',1,3,'gato',@raza_mest_g, CONCAT('Gatito esterilizado indoor ', @rh_marca),'Villa Crespo, CABA',-34.5990000,-58.4380000,'disponible','A'),
(@u8,'Bruno','macho',4,0,'perro',@raza_lab, CONCAT('Adulto tranquilo con patio ', @rh_marca),'Belgrano, CABA',-34.5627000,-58.4560000,'disponible','A'),
(@u8,'Cleo','hembra',3,0,'gato',@raza_sia, CONCAT('Independiente y cariñosa ', @rh_marca),'Núñez, CABA',-34.5450000,-58.4620000,'disponible','A'),
(@u4,'Tara','hembra',5,6,'perro',@raza_can, CONCAT('Segundo chance ', @rh_marca),'Almagro, CABA',-34.6096000,-58.4200000,'disponible','A');

SET @a1 = (SELECT AdopcionId FROM Adopcion WHERE UserId=@u4 AND Nombre='Luna' ORDER BY AdopcionId DESC LIMIT 1);
SET @a2 = (SELECT AdopcionId FROM Adopcion WHERE UserId=@u4 AND Nombre='Mishi' ORDER BY AdopcionId DESC LIMIT 1);
SET @a3 = (SELECT AdopcionId FROM Adopcion WHERE UserId=@u8 AND Nombre='Bruno' ORDER BY AdopcionId DESC LIMIT 1);
SET @a4 = (SELECT AdopcionId FROM Adopcion WHERE UserId=@u8 AND Nombre='Cleo' ORDER BY AdopcionId DESC LIMIT 1);
SET @a5 = (SELECT AdopcionId FROM Adopcion WHERE UserId=@u4 AND Nombre='Tara' ORDER BY AdopcionId DESC LIMIT 1);

INSERT IGNORE INTO AdopcionPostulacion (AdopcionId, UserId, EstadoRevision) VALUES
(@a1,@u1,'pendiente'),(@a1,@u2,'pendiente'),(@a3,@u3,'pendiente'),(@a2,@u5,'pendiente'),(@a4,@u6,'pendiente');
INSERT IGNORE INTO AdopcionFavorito (AdopcionId, UserId) VALUES
(@a1,@u3),(@a3,@u1),(@a5,@u2);

INSERT INTO Transito (UserId, Tipo, Nombre, Sexo, Especie, RazaId, Descripcion, DuracionDias, EstadoTransito, ZonaDescripcion, ZonaLat, ZonaLng, Estado) VALUES
(@u1,'necesito','Lola','hembra','perro',@raza_lab, CONCAT('Viajo 10 días, busco tránsito ', @rh_marca),10,'disponible','Palermo, CABA',-34.5885000,-58.4266000,'A'),
(@u4,'ofrezco',NULL,NULL,'perro',@raza_mest, CONCAT('Ofrecemos tránsito satélite ', @rh_marca),30,'disponible','Villa Crespo, CABA',-34.5990000,-58.4380000,'A'),
(@u5,'necesito','Otto','macho','gato',@raza_maine, CONCAT('Mudanza 2 semanas ', @rh_marca),14,'disponible','Almagro, CABA',-34.6096000,-58.4200000,'A'),
(@u8,'ofrezco',NULL,NULL,'gato',@raza_mest_g, CONCAT('Cupos tránsito gatitos ', @rh_marca),21,'disponible','Núñez, CABA',-34.5450000,-58.4620000,'A'),
(@u2,'necesito','Rocky','macho','perro',@raza_mest, CONCAT('Fin de semana largo ', @rh_marca),7,'disponible','Belgrano, CABA',-34.5627000,-58.4560000,'A');

INSERT INTO Perdido (UserId, Tipo, Nombre, Sexo, Especie, RazaId, Descripcion, UltimoLugarDescripcion, UltimoLugarLat, UltimoLugarLng, FechaSuceso, EstadoPerdido, Estado) VALUES
(@u5,'perdido','Coco','macho','perro',@raza_mest, CONCAT('Se escapó cerca de Rivadavia ', @rh_marca),'Almagro, CABA',-34.6096000,-58.4200000,CURDATE(),'activo','A'),
(@u6,'encontrado',NULL,'hembra','gato',@raza_mest_g, CONCAT('Gata con collar rojo ', @rh_marca),'Flores, CABA',-34.6280000,-58.4640000,CURDATE(),'activo','A'),
(@u2,'perdido','Luna','hembra','gato',@raza_sia, CONCAT('Siamesa asustadiza ', @rh_marca),'Belgrano, CABA',-34.5627000,-58.4560000,CURDATE(),'activo','A'),
(@u1,'encontrado',NULL,'macho','perro',@raza_can, CONCAT('Caniche en plaza sin collar ', @rh_marca),'Palermo, CABA',-34.5885000,-58.4266000,CURDATE(),'activo','A'),
(@u8,'perdido','Negro','macho','perro',@raza_lab, CONCAT('Labrador negro responde a Negro ', @rh_marca),'Núñez, CABA',-34.5450000,-58.4620000,CURDATE(),'activo','A');

INSERT INTO Donacion (UserId, Tipo, Categoria, Descripcion, Especie, EstadoDonacion, ZonaDescripcion, ZonaLat, ZonaLng, Estado) VALUES
(@u4,'necesito','alimento', CONCAT('Bolsas adulto 15kg ', @rh_marca),'perro','disponible','Villa Crespo, CABA',-34.5990000,-58.4380000,'A'),
(@u3,'ofrezco','insumo', CONCAT('Arena y comedero nuevos ', @rh_marca),'gato','disponible','Caballito, CABA',-34.6187000,-58.4404000,'A'),
(@u8,'necesito','ropa', CONCAT('Abrigos para cachorros ', @rh_marca),'perro','disponible','Núñez, CABA',-34.5450000,-58.4620000,'A'),
(@u1,'ofrezco','alimento', CONCAT('Latas húmedas por mudanza ', @rh_marca),'gato','disponible','Palermo, CABA',-34.5885000,-58.4266000,'A'),
(@u6,'necesito','insumo', CONCAT('Transportadora mediana ', @rh_marca),NULL,'disponible','Flores, CABA',-34.6280000,-58.4640000,'A');

-- ---------------------------------------------------------------------------
-- VETERINARIAS / EQUIPO / CAMPAÑAS
-- ---------------------------------------------------------------------------
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, Telefono, WhatsappNumero, Horario, Direccion, ZonaDescripcion, ZonaLat, ZonaLng, Estado) VALUES
(@u7,'Vet Amigos San Telmo', CONCAT('Clínica general y vacunas ', @rh_marca),'1112345678','5491111110007','Lun-Vie 10-19','Defensa 800','San Telmo, CABA',-34.6212000,-58.3731000,'A'),
(@u7,'Amigos Sucursal Boedo', CONCAT('Guardia fines de semana ', @rh_marca),'1112345678','5491111110007','Sab-Dom 9-21','Av. San Juan 3500','Boedo, CABA',-34.6300000,-58.4180000,'A'),
(@u3,'Consultorio Sofía', CONCAT('Atención felina a domicilio ', @rh_marca),'1112345603','5491111110003','Lun-Vie 11-18','Acoyte 500','Caballito, CABA',-34.6187000,-58.4404000,'A'),
(@u4,'Sala Refugio Huellas', CONCAT('Atención a adoptantes ', @rh_marca),'1112345604','5491111110004','Mar-Sab 14-18','Corrientes 5500','Villa Crespo, CABA',-34.5990000,-58.4380000,'A'),
(@u8,'Punto Vet Norte', CONCAT('Desparasitación y chip ', @rh_marca),'1112345608','5491111110008','Lun-Vie 10-17','Cabildo 2200','Belgrano, CABA',-34.5627000,-58.4560000,'A');

INSERT INTO Equipo (TipoEquipoId, Nombre, Descripcion, Email, Telefono, Direccion, ZonaDescripcion, ZonaLat, ZonaLng, Verificado, Estado)
VALUES (@tipo_eq, 'Huellas Unidas Demo Preprod', CONCAT('Red de refugios demo ', @rh_marca),
        'equipo@rh-demo.local','5491111110004','Corrientes 5400','Villa Crespo, CABA',-34.5990000,-58.4380000,1,'A');
SET @eq1 = LAST_INSERT_ID();

INSERT INTO EquipoMiembro (EquipoId, UserId, Rol, Estado, ResueltoEn) VALUES
(@eq1,@u4,'dueno','activo',NOW()),
(@eq1,@u8,'admin','activo',NOW()),
(@eq1,@u1,'miembro','activo',NOW()),
(@eq1,@u3,'miembro','pendiente',NULL),
(@eq1,@u5,'miembro','activo',NOW());

INSERT INTO Campania
  (UserId, EquipoId, Tipo, Titulo, Descripcion, MensajeAviso, FechaDesde, FechaHasta,
   ZonaDescripcion, Direccion, ZonaLat, ZonaLng, RequiereInscripcion, CupoMaximo, BajaLimiteHoras, Estado)
VALUES
(@u4,@eq1,'castracion','Castración comunitaria Palermo', CONCAT('Campaña demo abierta ', @rh_marca),'Llegá 15 min antes',
 DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 8 DAY),'Palermo, CABA','Plaza central',-34.5885000,-58.4266000,1,40,24,'A'),
(@u8,@eq1,'vacunacion','Vacunación antirrábica Núñez', CONCAT('Campaña demo abierta ', @rh_marca),'Llegá 15 min antes',
 DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY),'Núñez, CABA','Plaza central',-34.5450000,-58.4620000,1,40,24,'A'),
(@u4,@eq1,'vacunacion','Doble y Triple felina Villa Crespo', CONCAT('Campaña demo abierta ', @rh_marca),'Llegá 15 min antes',
 DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY),'Villa Crespo, CABA','Sede refugio',-34.5990000,-58.4380000,1,30,24,'A'),
(@u7,NULL,'castracion','Campaña San Telmo (cupos)', CONCAT('Campaña demo abierta ', @rh_marca),'Llegá 15 min antes',
 DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY),'San Telmo, CABA','Defensa 800',-34.6212000,-58.3731000,1,20,12,'A'),
(@u8,@eq1,'castracion','Operativo Belgrano rescates', CONCAT('Campaña demo abierta ', @rh_marca),'Llegá 15 min antes',
 DATE_ADD(CURDATE(), INTERVAL 21 DAY), DATE_ADD(CURDATE(), INTERVAL 22 DAY),'Belgrano, CABA','Plaza Noruega',-34.5627000,-58.4560000,1,50,24,'A');

SET @c1 = (SELECT CampaniaId FROM Campania WHERE UserId=@u4 AND Titulo LIKE 'Castración comunitaria%' ORDER BY CampaniaId DESC LIMIT 1);
SET @c2 = (SELECT CampaniaId FROM Campania WHERE UserId=@u8 AND Titulo LIKE 'Vacunación antirrábica%' ORDER BY CampaniaId DESC LIMIT 1);

INSERT IGNORE INTO CampaniaInscripcion (CampaniaId, UserId, Estado, Posicion) VALUES
(@c1,@u1,'confirmada',1),(@c1,@u2,'confirmada',2),(@c1,@u3,'lista_espera',3),
(@c2,@u5,'confirmada',1),(@c2,@u6,'confirmada',2);

-- ---------------------------------------------------------------------------
-- MARKETPLACE
-- ---------------------------------------------------------------------------
INSERT INTO Producto (UserId, TipoListado, CategoriaId, Nombre, Descripcion, Precio, Cantidad, Especie, ZonaDescripcion, ZonaLat, ZonaLng, Estado) VALUES
(@u3,'producto',@cat_alim,'Alimento premium 3kg', CONCAT('Marketplace demo ', @rh_marca),12500,5,'perro','Caballito, CABA',-34.6187000,-58.4404000,'A'),
(@u3,'producto',@cat_jug,'Pelota cuerda XL', CONCAT('Marketplace demo ', @rh_marca),3500,5,'perro','Caballito, CABA',-34.6187000,-58.4404000,'A'),
(@u3,'servicio',@cat_pas,'Paseo 40 min zona Caballito', CONCAT('Marketplace demo ', @rh_marca),6000,5,'perro','Caballito, CABA',-34.6187000,-58.4404000,'A'),
(@u7,'producto',@cat_hig,'Shampoo hipoalergénico', CONCAT('Marketplace demo ', @rh_marca),4800,5,'gato','San Telmo, CABA',-34.6212000,-58.3731000,'A'),
(@u7,'servicio',@cat_sal,'Consulta veterinaria general', CONCAT('Marketplace demo ', @rh_marca),18000,5,NULL,'San Telmo, CABA',-34.6212000,-58.3731000,'A');

SET @pr1 = (SELECT ProductoId FROM Producto WHERE UserId=@u3 AND Nombre='Alimento premium 3kg' ORDER BY ProductoId DESC LIMIT 1);
SET @pr3 = (SELECT ProductoId FROM Producto WHERE UserId=@u3 AND Nombre LIKE 'Paseo%' ORDER BY ProductoId DESC LIMIT 1);
SET @pr5 = (SELECT ProductoId FROM Producto WHERE UserId=@u7 AND Nombre LIKE 'Consulta%' ORDER BY ProductoId DESC LIMIT 1);

INSERT IGNORE INTO ProductoFavorito (ProductoId, UserId) VALUES
(@pr1,@u1),(@pr3,@u2),(@pr5,@u5);

-- ---------------------------------------------------------------------------
-- MATCH + CHAT + NOTIFICACIONES
-- ---------------------------------------------------------------------------
INSERT IGNORE INTO MascotaMatchSwipe (MascotaIdOrigen, MascotaIdDestino, Direccion) VALUES
(@m1,@m3,'like'),(@m3,@m1,'like'),(@m2,@m4,'like'),(@m4,@m2,'pass'),(@m5,@m8,'like');

SET @ma = LEAST(@m1,@m3);
SET @mb = GREATEST(@m1,@m3);
SET @ua = IF(@ma=@m1,@u1,@u2);
SET @ub = IF(@ma=@m1,@u2,@u1);

INSERT IGNORE INTO MascotaMatch (MascotaIdA, MascotaIdB, UserIdA, UserIdB, Estado)
VALUES (@ma,@mb,@ua,@ub,'A');
SET @match1 = (SELECT MatchId FROM MascotaMatch WHERE MascotaIdA=@ma AND MascotaIdB=@mb LIMIT 1);

INSERT INTO MatchMensaje (MatchId, UserIdEmisor, Texto) VALUES
(@match1,@u1, CONCAT('¡Hola! Lola y Rocky se cayeron bien ', @rh_marca)),
(@match1,@u2, CONCAT('¿Plaza Sicilia el sábado? ', @rh_marca)),
(@match1,@u1, CONCAT('Dale, 11 hs. Llevo agua. ', @rh_marca));

INSERT INTO Conversacion (UltimoMensajeEn) VALUES (NOW());
SET @cv1 = LAST_INSERT_ID();
INSERT INTO ConversacionParticipante (ConversacionId, UserId, Estado) VALUES
(@cv1,@u1,'activa'),(@cv1,@u4,'activa');
INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES
(@cv1,@u1, CONCAT('Hola! Vi a Luna en adopción, ¿sigue? ', @rh_marca),'texto'),
(@cv1,@u4, CONCAT('Sí! Mañana de 15 a 18. ', @rh_marca),'texto'),
(@cv1,@u1, CONCAT('Perfecto, voy con DNI. ', @rh_marca),'texto');

INSERT INTO Conversacion (UltimoMensajeEn) VALUES (NOW());
SET @cv2 = LAST_INSERT_ID();
INSERT INTO ConversacionParticipante (ConversacionId, UserId, Estado) VALUES
(@cv2,@u2,'activa'),(@cv2,@u3,'solicitud');
INSERT INTO Mensaje (ConversacionId, UserIdEmisor, Texto, Tipo) VALUES
(@cv2,@u2, CONCAT('Hola Sofi, ¿sigue el servicio de paseo? ', @rh_marca),'texto');

INSERT INTO Notificacion (UserId, Tipo, Titulo, Cuerpo, Ruta, ActorUserId, MascotaId, Leida) VALUES
(@u1,'match_nuevo','¡Nuevo match!', CONCAT('Lola hizo match con Rocky ', @rh_marca),'/(app)/match',@u2,@m1,0),
(@u2,'match_nuevo','¡Nuevo match!', CONCAT('Rocky hizo match con Lola ', @rh_marca),'/(app)/match',@u1,@m3,0),
(@u4,'adopcion_postulacion','Nueva postulación', CONCAT('Lucía se postuló a Luna ', @rh_marca),'/(app)/adopcion',@u1,NULL,0),
(@u3,'seguimiento','Nuevo seguidor', CONCAT('Martín empezó a seguirte ', @rh_marca),'/(app)/perfil',@u2,NULL,0),
(@u1,'chat_mensaje','Mensaje nuevo', CONCAT('Refugio Huellas te respondió ', @rh_marca),'/(app)/chat',@u4,NULL,0),
(@u5,'campania','Inscripción OK', CONCAT('Anotado en vacunación Núñez ', @rh_marca),'/(app)/campanias',@u8,NULL,0),
(@u6,'sistema','Bienvenida demo', CONCAT('Cuenta de prueba preprod lista ', @rh_marca),NULL,NULL,NULL,0),
(@u8,'donacion','Pedido de ayuda', CONCAT('Alguien miró tu pedido de ropa ', @rh_marca),'/(app)/donaciones',@u1,NULL,0);

INSERT INTO MapaCargaMes (Periodo, Cargas) VALUES (DATE_FORMAT(NOW(),'%Y-%m'), 12)
ON DUPLICATE KEY UPDATE Cargas = GREATEST(Cargas, 12);

INSERT INTO MapaCargaUsuarioDia (UserId, Dia, Cargas) VALUES
(@u1,CURDATE(),2),(@u2,CURDATE(),2),(@u3,CURDATE(),2),(@u4,CURDATE(),2),
(@u5,CURDATE(),2),(@u6,CURDATE(),2),(@u7,CURDATE(),2),(@u8,CURDATE(),2)
ON DUPLICATE KEY UPDATE Cargas = GREATEST(Cargas, 2);

SELECT 'OK seed_preprod_demo' AS resultado,
       (SELECT COUNT(*) FROM Usuario WHERE Email LIKE '%@rh-demo.local') AS usuarios_demo,
       (SELECT COUNT(*) FROM Mascota WHERE DescripcionTexto LIKE CONCAT('%', @rh_marca, '%')) AS mascotas,
       (SELECT COUNT(*) FROM Adopcion WHERE Descripcion LIKE CONCAT('%', @rh_marca, '%')) AS adopciones,
       (SELECT COUNT(*) FROM Post WHERE Texto LIKE CONCAT('%', @rh_marca, '%')) AS posts;
