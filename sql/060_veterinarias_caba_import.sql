-- ============================================================
-- Import de veterinarias reales de CABA (backup / referencia)
--
-- Fuente: "Habilitaciones Aprobadas" -- Agencia Gubernamental de
-- Control (AGC), Gobierno de la Ciudad de Buenos Aires, datos
-- abiertos (CC-BY 2.5 AR): https://data.buenosaires.gob.ar/dataset/habilitaciones-aprobadas
-- Filtrado a rubros de atención médica veterinaria real
-- (Consultorio veterinario / Centro y clínica veterinaria),
-- excluyendo comercios de venta de artículos para mascotas.
--
-- Coordenadas geocodificadas con Nominatim/OpenStreetMap a partir
-- de la dirección de habilitación (Calles).
--
-- Generado automáticamente -- NO editar a mano, regenerar desde
-- el CSV fuente si hace falta actualizar.
--
-- Dueño: el primer usuario con Rol='admin' (cuenta de la propia
-- plataforma) -- son listados curados de una fuente oficial, no
-- cargados por un usuario común. En una base recién creada (sin
-- ningún admin todavía) el INSERT no aplica ninguna fila -- no
-- rompe la instalación desde cero, se puede correr de nuevo
-- después de crear el primer admin.
--
-- Idempotente: cada fila sólo se inserta si no existe ya una
-- veterinaria con el mismo nombre y las mismas coordenadas.
-- ============================================================

SET NAMES utf8mb4;

INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Laura Judit Miranda', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'ACASSUSO 6680, Acassuso', -34.6503021, -58.515637, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Laura Judit Miranda' AND v.ZonaLat = -34.6503021 AND v.ZonaLng = -58.515637
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Daniela Pinchetti', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ALBERDI, JUAN BAUTISTA AV. 4808, Avenida Juan Bautista Alberdi', -34.6303529, -58.4585587, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Daniela Pinchetti' AND v.ZonaLat = -34.6303529 AND v.ZonaLng = -58.4585587
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Patrich Cohen', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ALVAREZ JONTE AV. 2600, Avenida Nazca', -34.6090356, -58.4831897, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Patrich Cohen' AND v.ZonaLat = -34.6090356 AND v.ZonaLng = -58.4831897
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Lecona', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ALVAREZ JONTE AV. 2874, Monte Castro', -34.6268057, -58.5144911, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Lecona' AND v.ZonaLat = -34.6268057 AND v.ZonaLng = -58.5144911
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Judith Rosana Groisman', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ALVAREZ, JULIAN 211, Julián Baltasar Álvarez', -34.5879555, -58.4168105, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Judith Rosana Groisman' AND v.ZonaLat = -34.5879555 AND v.ZonaLng = -58.4168105
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Flavia Fernanda Marquez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'AMENABAR 1199, Amenábar', -34.5699335, -58.4504934, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Flavia Fernanda Marquez' AND v.ZonaLat = -34.5699335 AND v.ZonaLng = -58.4504934
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Coca', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Centro y clínica veterinaria con internación limitada al proceso pre y postoperatorio). Verificá horarios y disponibilidad antes de ir.', 'AMENABAR 2049, Amenábar', -34.5636069, -58.4580718, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Coca' AND v.ZonaLat = -34.5636069 AND v.ZonaLng = -58.4580718
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Nardelli', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ANDALGALA 1947, Andalgalá', -34.6589197, -58.510983, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Nardelli' AND v.ZonaLat = -34.6589197 AND v.ZonaLng = -58.510983
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Rosana Adriana Totino', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ARCE 470, Arce', -34.5702702, -58.4321458, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Rosana Adriana Totino' AND v.ZonaLat = -34.5702702 AND v.ZonaLng = -58.4321458
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Sergio Alejandro Amarelle', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ARENALES 3684, Arenales', -34.5853083, -58.4139433, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Sergio Alejandro Amarelle' AND v.ZonaLat = -34.5853083 AND v.ZonaLng = -58.4139433
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Diego Alejandro Londner', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ASUNCION 5318, Asunción', -34.6119778, -58.5283093, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Diego Alejandro Londner' AND v.ZonaLat = -34.6119778 AND v.ZonaLng = -58.5283093
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Julio Javier Gomez Y Luciano Enrique Cantello S.H.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'AVELLANEDA 925, Avellaneda', -34.6164075, -58.4436088, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Julio Javier Gomez Y Luciano Enrique Cantello S.H.' AND v.ZonaLat = -34.6164075 AND v.ZonaLng = -58.4436088
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Sergio Szulhacz', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BEAZLEY 3925, Beazley', -34.6543445, -58.4152561, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Sergio Szulhacz' AND v.ZonaLat = -34.6543445 AND v.ZonaLng = -58.4152561
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Adalberto David Roth', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BEIRO, FRANCISCO AV. 4029, 3522', -34.6001956, -58.5023534, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Adalberto David Roth' AND v.ZonaLat = -34.6001956 AND v.ZonaLng = -58.5023534
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Juan Gabriel Cortiñas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BEIRO, FRANCISCO AV. 4773, 3522', -34.6001956, -58.5023534, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Juan Gabriel Cortiñas' AND v.ZonaLat = -34.6001956 AND v.ZonaLng = -58.5023534
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Devoto Pet Mall S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'BEIRO, FRANCISCO AV. 5047, 3522', -34.6001956, -58.5023534, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Devoto Pet Mall S.A.' AND v.ZonaLat = -34.6001956 AND v.ZonaLng = -58.5023534
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Paola Beatriz Pisano', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BELAUSTEGUI, LUIS, Dr. 1109, Doctor Luis Beláustegui', -34.6165664, -58.4776041, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Paola Beatriz Pisano' AND v.ZonaLat = -34.6165664 AND v.ZonaLng = -58.4776041
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Bajo Zero S.A.S', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BELGRANO AV. 1737, Avenida Belgrano', -34.6136367, -58.3908626, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Bajo Zero S.A.S' AND v.ZonaLat = -34.6136367 AND v.ZonaLng = -58.3908626
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Paula Soledad Rego', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BERMUDEZ 2006, Bermúdez', -34.6199393, -58.5090184, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Paula Soledad Rego' AND v.ZonaLat = -34.6199393 AND v.ZonaLng = -58.5090184
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Victor Sebastian Rovey', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BILLINGHURST 1464, 1464', -34.5931381, -58.4124182, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Victor Sebastian Rovey' AND v.ZonaLat = -34.5931381 AND v.ZonaLng = -58.4124182
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Luis Alfredo Visbal Mora', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BLANCO ENCALADA 2538, Blanco Encalada', -34.5600587, -58.460394, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Luis Alfredo Visbal Mora' AND v.ZonaLat = -34.5600587 AND v.ZonaLng = -58.460394
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Anzelini', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BLANCO ENCALADA 5226, Blanco Encalada', -34.5765821, -58.4879907, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Anzelini' AND v.ZonaLat = -34.5765821 AND v.ZonaLng = -58.4879907
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Agustin Hector Farias Garcia', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'BONIFACIO, JOSE 1681, 943', -34.6284792, -58.4407197, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Agustin Hector Farias Garcia' AND v.ZonaLat = -34.6284792 AND v.ZonaLng = -58.4407197
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Leocan Sas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Centro y clínica veterinaria con internación limitada al proceso pre y postoperatorio). Verificá horarios y disponibilidad antes de ir.', 'BULNES 1286, Avenida Santa Fe', -34.588251, -58.4112129, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Leocan Sas' AND v.ZonaLat = -34.588251 AND v.ZonaLng = -58.4112129
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Graciela Beatriz Esteban', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CABEZON, JOSE LEON 3401, José León Cabezón', -34.5869789, -58.5120379, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Graciela Beatriz Esteban' AND v.ZonaLat = -34.5869789 AND v.ZonaLng = -58.5120379
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Marquez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CABILDO AV. 1400, 381', -34.5723474, -58.4398802, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Marquez' AND v.ZonaLat = -34.5723474 AND v.ZonaLng = -58.4398802
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Diego Fidel Albertoni', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CABILDO AV. 2811, 4576', -34.5426136, -58.4732647, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Diego Fidel Albertoni' AND v.ZonaLat = -34.5426136 AND v.ZonaLng = -58.4732647
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Franco Lezica', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CAMARONES 2199, Camarones', -34.607761, -58.471989, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Franco Lezica' AND v.ZonaLat = -34.607761 AND v.ZonaLng = -58.471989
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Lucas Miguel De Graaff', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CAMPANA 3615, Campana', -34.5972769, -58.5003321, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Lucas Miguel De Graaff' AND v.ZonaLat = -34.5972769 AND v.ZonaLng = -58.5003321
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Bosch Hernan Y Schreiber Marcelo S.H.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CASTAÑARES AV. 4908, 4908', -34.6674474, -58.4732904, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Bosch Hernan Y Schreiber Marcelo S.H.' AND v.ZonaLat = -34.6674474 AND v.ZonaLng = -58.4732904
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Servicios Integrales Veterinarios S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Centro y clínica veterinaria con internación limitada al proceso pre y postoperatorio (Según ley 6099)). Verificá horarios y disponibilidad antes de ir.', 'CHIVILCOY 2299, Chivilcoy', -34.6126176, -58.5003712, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Servicios Integrales Veterinarios S.R.L.' AND v.ZonaLat = -34.6126176 AND v.ZonaLng = -58.5003712
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Bibiana Magali Arrimondi Pieri', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CIUDAD DE LA PAZ 2020, 2020', -34.5633312, -58.4571713, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Bibiana Magali Arrimondi Pieri' AND v.ZonaLat = -34.5633312 AND v.ZonaLng = -58.4571713
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Martello', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'COMBATE DE LOS POZOS 334, Combate de los Pozos', -34.6131432, -58.393193, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Martello' AND v.ZonaLat = -34.6131432 AND v.ZonaLng = -58.393193
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Lo De Paco Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'COMBATE DE LOS POZOS 709, Combate de los Pozos', -34.6171251, -58.3932665, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Lo De Paco Srl' AND v.ZonaLat = -34.6171251 AND v.ZonaLng = -58.3932665
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Pet Supplies Intl Sa', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'CONGRESO AV. 2756, Avenida Congreso', -34.5572462, -58.4657313, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Pet Supplies Intl Sa' AND v.ZonaLat = -34.5572462 AND v.ZonaLng = -58.4657313
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Diego Raul Aiello', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CORDOBA 6400, Córdoba', -34.5825143, -58.4497375, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Diego Raul Aiello' AND v.ZonaLat = -34.5825143 AND v.ZonaLng = -58.4497375
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Nora Jorgelina Casir', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CORDOBA AV. 3312, Avenida Córdoba', -34.5980804, -58.4135121, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Nora Jorgelina Casir' AND v.ZonaLat = -34.5980804 AND v.ZonaLng = -58.4135121
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Servicios Integrales Veterinarios Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CORDOBA AV. 3541, Avenida Córdoba', -34.5977211, -58.4164843, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Servicios Integrales Veterinarios Srl' AND v.ZonaLat = -34.5977211 AND v.ZonaLng = -58.4164843
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Gallardo', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CORRIENTES AV. 5039, Avenida Corrientes', -34.6003921, -58.4368141, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Gallardo' AND v.ZonaLat = -34.6003921 AND v.ZonaLng = -58.4368141
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Lourido', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CORRO, MIGUEL C. DEL, CANONIGO AV. 274, Avenida Canónigo Miguel del Corro', -34.6323633, -58.4996411, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Lourido' AND v.ZonaLat = -34.6323633 AND v.ZonaLng = -58.4996411
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Alberto Eduardo Pinella', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'COSQUIN 60, Cosquín', -34.6396591, -58.5235613, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Alberto Eduardo Pinella' AND v.ZonaLat = -34.6396591 AND v.ZonaLng = -58.5235613
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Lsg Argentina Sa', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'CUENCA 2550, Cuenca', -34.6063279, -58.4913459, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Lsg Argentina Sa' AND v.ZonaLat = -34.6063279 AND v.ZonaLng = -58.4913459
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Roxana Kohler', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DE LOS CONSTITUYENTES AV. 3145, Avenida de los Constituyentes', -34.5757546, -58.4999228, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Roxana Kohler' AND v.ZonaLat = -34.5757546 AND v.ZonaLng = -58.4999228
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Maria Cecilia ;Fernandez, Federico Luis Manuel Di Sarli', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DE LOS CONSTITUYENTES AV. 3605, Avenida de los Constituyentes', -34.5757546, -58.4999228, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Maria Cecilia ;Fernandez, Federico Luis Manuel Di Sarli' AND v.ZonaLat = -34.5757546 AND v.ZonaLng = -58.4999228
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Josefina Maria Rubianes Torio', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DEL CARMEN 757, Del Carmen', -34.6000881, -58.3900043, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Josefina Maria Rubianes Torio' AND v.ZonaLat = -34.6000881 AND v.ZonaLng = -58.3900043
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Samanta Lorena Cantera', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DELGADO 1308, Delgado', -34.5768485, -58.4600823, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Samanta Lorena Cantera' AND v.ZonaLat = -34.5768485 AND v.ZonaLng = -58.4600823
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Constanza Ingrid Kruk', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DIAZ COLODRERO 2356, Díaz Colodrero', -34.5742442, -58.4852634, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Constanza Ingrid Kruk' AND v.ZonaLat = -34.5742442 AND v.ZonaLng = -58.4852634
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Laham', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DIAZ VELEZ AV. 4342, Villa Weigel', -34.6543579, -58.5291253, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Laham' AND v.ZonaLat = -34.6543579 AND v.ZonaLng = -58.5291253
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Cano Constanza Isabel Y Gonzalez Romina Beatriz S.H.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'DIAZ VELEZ AV. 5342, Liniers', -34.6543579, -58.5291253, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Cano Constanza Isabel Y Gonzalez Romina Beatriz S.H.' AND v.ZonaLat = -34.6543579 AND v.ZonaLng = -58.5291253
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Serkin', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DIAZ VELEZ AV. 5548, Villa Weigel', -34.6543579, -58.5291253, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Serkin' AND v.ZonaLat = -34.6543579 AND v.ZonaLng = -58.5291253
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Francisco Patricio E Iglesias,Claudia Alejandra Sociedad De Hecho Scorza', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'DIRECTORIO AV. 1584, Avenida Directorio', -34.6379012, -58.4746653, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Francisco Patricio E Iglesias,Claudia Alejandra Sociedad De Hecho Scorza' AND v.ZonaLat = -34.6379012 AND v.ZonaLng = -58.4746653
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Eygbottino S.A.S.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DIRECTORIO AV. 3439, Avenida Directorio', -34.6379012, -58.4746653, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Eygbottino S.A.S.' AND v.ZonaLat = -34.6379012 AND v.ZonaLng = -58.4746653
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Pet Kingdom Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'DIRECTORIO AV. 680, Avenida Directorio', -34.6285595, -58.4367452, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Pet Kingdom Srl' AND v.ZonaLat = -34.6285595 AND v.ZonaLng = -58.4367452
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Gonzalez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ECHEVERRIA 1642, Avenida Triunvirato', -34.5779686, -58.4807356, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Gonzalez' AND v.ZonaLat = -34.5779686 AND v.ZonaLng = -58.4807356
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Jose Manuel Rodriguez Menendez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'EL TALA 1428, El Tala', -34.6468385, -58.4672059, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Jose Manuel Rodriguez Menendez' AND v.ZonaLat = -34.6468385 AND v.ZonaLng = -58.4672059
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Grupo Petba S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ENTRE RIOS AV. 1093, 51', -34.6098236, -58.3927321, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Grupo Petba S.A.' AND v.ZonaLat = -34.6098236 AND v.ZonaLng = -58.3927321
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Fernández', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ENTRE RIOS AV. 643, Balvanera', -34.6162782, -58.3916704, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Fernández' AND v.ZonaLat = -34.6162782 AND v.ZonaLng = -58.3916704
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Marcelo Mariano Gotte', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ESCALADA DE SAN MARTIN, R. 3248, Villa Crespo', -34.6001292, -58.4498915, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Marcelo Mariano Gotte' AND v.ZonaLat = -34.6001292 AND v.ZonaLng = -58.4498915
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Isv S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'FRENCH 2673, French', -34.5894794, -58.4014852, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Isv S.R.L.' AND v.ZonaLat = -34.5894794 AND v.ZonaLng = -58.4014852
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Alejandro Alberto Palomeque', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'FRENCH 3115, French', -34.5861019, -58.4067748, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Alejandro Alberto Palomeque' AND v.ZonaLat = -34.5861019 AND v.ZonaLng = -58.4067748
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Ventura', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GALLO 1525, Gallo', -34.5924927, -58.4094552, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Ventura' AND v.ZonaLat = -34.5924927 AND v.ZonaLng = -58.4094552
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Gaona Av. 4687', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GAONA AV. 4685, 1800', -34.6113822, -58.4532676, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Gaona Av. 4687' AND v.ZonaLat = -34.6113822 AND v.ZonaLng = -58.4532676
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Arguello Laura Flavia Y Garcia Jorge Gabriel', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GASCON 1347, Gascón', -34.5947212, -58.4228485, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Arguello Laura Flavia Y Garcia Jorge Gabriel' AND v.ZonaLat = -34.5947212 AND v.ZonaLng = -58.4228485
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Adrian Ortiz', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GASCON 573, Gascón', -34.604962, -58.4243471, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Adrian Ortiz' AND v.ZonaLat = -34.604962 AND v.ZonaLng = -58.4243471
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Mari', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GONZALEZ, ELPIDIO 2802, 4090', -34.6173274, -58.4952128, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Mari' AND v.ZonaLat = -34.6173274 AND v.ZonaLng = -58.4952128
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Mariano Gabriel Diaz', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GUATEMALA 4199, Guatemala', -34.5893268, -58.418791, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Mariano Gabriel Diaz' AND v.ZonaLat = -34.5893268 AND v.ZonaLng = -58.418791
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Paglilla', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GUISE 1868, Guise', -34.5913117, -58.4135351, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Paglilla' AND v.ZonaLat = -34.5913117 AND v.ZonaLng = -58.4135351
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Vet Punto Vet Sas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'GURRUCHAGA 994, Gurruchaga', -34.5936853, -58.4361901, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Vet Punto Vet Sas' AND v.ZonaLat = -34.5936853 AND v.ZonaLng = -58.4361901
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Perez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'HUMBERTO 1° 690, San Telmo', -34.6207362, -58.3735413, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Perez' AND v.ZonaLat = -34.6207362 AND v.ZonaLng = -58.3735413
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Aranda', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'INDEPENDENCIA AV. 2666, Avenida Independencia', -34.6189043, -58.4029572, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Aranda' AND v.ZonaLat = -34.6189043 AND v.ZonaLng = -58.4029572
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Comercializadora Casper S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'JUNIN 1142, Junín', -34.5950409, -58.397367, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Comercializadora Casper S.R.L.' AND v.ZonaLat = -34.5950409 AND v.ZonaLng = -58.397367
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Adriana Alejandra Zita', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'JUSTO, JUAN B. AV. 6176, Avenida Juan Bautista Justo', -34.6021651, -58.455357, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Adriana Alejandra Zita' AND v.ZonaLat = -34.6021651 AND v.ZonaLng = -58.455357
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Veterinaria Del Plata Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LA PLATA AV. 1099, Avenida San Juan', -34.626968, -58.426404, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Veterinaria Del Plata Srl' AND v.ZonaLat = -34.626968 AND v.ZonaLng = -58.426404
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Victoria Elizabeth Caia', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LA PLATA AV. 1270, Avenida San Juan', -34.626968, -58.426404, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Victoria Elizabeth Caia' AND v.ZonaLat = -34.626968 AND v.ZonaLng = -58.426404
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Inti Pet Shop S.R.L', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LA PLATA AV. 1368, Avenida La Plata', -34.631064, -58.4257062, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Inti Pet Shop S.R.L' AND v.ZonaLat = -34.631064 AND v.ZonaLng = -58.4257062
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Ocampo', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LA RIOJA 1956, La Rioja', -34.6342219, -58.4058608, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Ocampo' AND v.ZonaLat = -34.6342219 AND v.ZonaLng = -58.4058608
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Mirra', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LA RIOJA 2073, La Rioja', -34.6355579, -58.4058986, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Mirra' AND v.ZonaLat = -34.6355579 AND v.ZonaLng = -58.4058986
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Rmvet Buenos Aires S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LAMARCA, EMILIO 2115, 8001', -34.6323262, -58.4767095, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Rmvet Buenos Aires S.A.' AND v.ZonaLat = -34.6323262 AND v.ZonaLng = -58.4767095
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Laprida 1646', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LAPRIDA 1642, Laprida', -34.5907466, -58.4039142, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Laprida 1646' AND v.ZonaLat = -34.5907466 AND v.ZonaLng = -58.4039142
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Comercializadora Casper S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LAS HERAS GENERAL AV. 3281, 2111', -34.5890136, -58.3949067, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Comercializadora Casper S.R.L.' AND v.ZonaLat = -34.5890136 AND v.ZonaLng = -58.3949067
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Faunatikos S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CLINICA VETERINARIA CON INTERNACION LIMITADA AL PROCESO PRE Y POSTOPERATORIO). Verificá horarios y disponibilidad antes de ir.', 'LAS HERAS GENERAL AV. 3858, 2111', -34.5890136, -58.3949067, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Faunatikos S.R.L.' AND v.ZonaLat = -34.5890136 AND v.ZonaLng = -58.3949067
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Lavarden 15', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LAVARDEN 13, Lavardén', -34.6367497, -58.4021388, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Lavarden 15' AND v.ZonaLat = -34.6367497 AND v.ZonaLng = -58.4021388
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Mariano Carlos Padin', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LOPE DE VEGA AV. 1606, Villa Luro', -34.6369655, -58.4995651, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Mariano Carlos Padin' AND v.ZonaLat = -34.6369655 AND v.ZonaLng = -58.4995651
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Devoto Pet Mall S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'LOPE DE VEGA AV. 2605, 1414', -34.6267812, -58.5086792, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Devoto Pet Mall S.A.' AND v.ZonaLat = -34.6267812 AND v.ZonaLng = -58.5086792
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Marcela Gladys Valenzuela', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'LOPE DE VEGA AV. 854, Avenida Juan Bautista Justo', -34.6324033, -58.5014551, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Marcela Gladys Valenzuela' AND v.ZonaLat = -34.6324033 AND v.ZonaLng = -58.5014551
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Intermascota Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MANZANARES 2911, Manzanares', -34.549795, -58.4743123, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Intermascota Srl' AND v.ZonaLat = -34.549795 AND v.ZonaLng = -58.4743123
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Multieventos Y Mascotas Pasco S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'MEXICO 2208, México', -34.616229, -58.3979182, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Multieventos Y Mascotas Pasco S.R.L.' AND v.ZonaLat = -34.616229 AND v.ZonaLng = -58.3979182
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Del Vecchio', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MIRANDA 3685, Miranda', -34.613558, -58.4932364, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Del Vecchio' AND v.ZonaLat = -34.613558 AND v.ZonaLng = -58.4932364
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Martin Fernando Caruso', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MITRE, BARTOLOME 4140, Bartolomé Mitre', -34.6070009, -58.3766938, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Martin Fernando Caruso' AND v.ZonaLat = -34.6070009 AND v.ZonaLng = -58.3766938
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Thomas Leitner', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MITRE, BARTOLOME 4140, Bartolomé Mitre', -34.6070009, -58.3766938, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Thomas Leitner' AND v.ZonaLat = -34.6070009 AND v.ZonaLng = -58.3766938
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Cavallero', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MONROE 2885, Monroe', -34.5608087, -58.4643457, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Cavallero' AND v.ZonaLat = -34.5608087 AND v.ZonaLng = -58.4643457
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Candia', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MONROE 5441, Monroe', -34.57651, -58.4903414, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Candia' AND v.ZonaLat = -34.57651 AND v.ZonaLng = -58.4903414
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Cristian Piñero Corral', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MONROE AV. 4815, Coghlan', -34.5625705, -58.4670062, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Cristian Piñero Corral' AND v.ZonaLat = -34.5625705 AND v.ZonaLng = -58.4670062
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Vet Punto Vet Sas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MOSCONI GENERAL AV. 3200, Avenida General Paz', -34.6567264, -58.5261122, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Vet Punto Vet Sas' AND v.ZonaLat = -34.6567264 AND v.ZonaLng = -58.5261122
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Alan Facundo Krug', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MOSCONI GENERAL AV. 3396, Avenida General Paz', -34.6567264, -58.5261122, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Alan Facundo Krug' AND v.ZonaLat = -34.6567264 AND v.ZonaLng = -58.5261122
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Mormino', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MOSCONI GENERAL AV. 3425, Avenida General Paz', -34.6567264, -58.5261122, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Mormino' AND v.ZonaLat = -34.6567264 AND v.ZonaLng = -58.5261122
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Marrese', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'MURGUIONDO 552, Murguiondo', -34.6446814, -58.5171786, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Marrese' AND v.ZonaLat = -34.6446814 AND v.ZonaLng = -58.5171786
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Panda Pampa S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'NAHUEL HUAPI 5185, Nahuel Huapi', -34.5718012, -58.4900627, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Panda Pampa S.A.' AND v.ZonaLat = -34.5718012 AND v.ZonaLng = -58.4900627
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Norberto Daniel Sabio', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NAZCA 3529, Nazca', -34.5947057, -58.4944446, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Norberto Daniel Sabio' AND v.ZonaLat = -34.5947057 AND v.ZonaLng = -58.4944446
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Punto Vet Srl', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NAZCA AV. 2193, 1233', -34.6190252, -58.4751547, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Punto Vet Srl' AND v.ZonaLat = -34.6190252 AND v.ZonaLng = -58.4751547
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Osvaldo Santiago De Martino', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'NAZCA AV. 3290, 1233', -34.6190252, -58.4751547, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Osvaldo Santiago De Martino' AND v.ZonaLat = -34.6190252 AND v.ZonaLng = -58.4751547
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Martinez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NEUQUEN 1402, Neuquén', -34.6157498, -58.4533484, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Martinez' AND v.ZonaLat = -34.6157498 AND v.ZonaLng = -58.4533484
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Yanina Paola Alice', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NEUQUEN 1694, Neuquén', -34.6158955, -58.4571048, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Yanina Paola Alice' AND v.ZonaLat = -34.6158955 AND v.ZonaLng = -58.4571048
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Gustavo Martin Goncalves', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NEWBERY, JORGE 1761, Avenida Jorge Newbery', -34.5945289, -58.4568947, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Gustavo Martin Goncalves' AND v.ZonaLat = -34.5945289 AND v.ZonaLng = -58.4568947
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Florencia Santiago', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NUÑEZ 4999, Núñez', -34.5625342, -58.4909078, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Florencia Santiago' AND v.ZonaLat = -34.5625342 AND v.ZonaLng = -58.4909078
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Panda Pampa S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'NUÑEZ 5960, Núñez', -34.5682026, -58.5024715, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Panda Pampa S.A.' AND v.ZonaLat = -34.5682026 AND v.ZonaLng = -58.5024715
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria La Isla Veterinaria S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'O\'HIGGINS 2126, O\'Higgins', -34.559581, -58.4532713, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria La Isla Veterinaria S.R.L.' AND v.ZonaLat = -34.559581 AND v.ZonaLng = -58.4532713
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Multimascota S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'OLAVARRIA 743, Olavarría', -34.637992, -58.363242, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Multimascota S.R.L.' AND v.ZonaLat = -34.637992 AND v.ZonaLng = -58.363242
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Maria Soledad Varela', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'OLAYA 1411, Olaya', -34.6039656, -58.4453901, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Maria Soledad Varela' AND v.ZonaLat = -34.6039656 AND v.ZonaLng = -58.4453901
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Vet Punto Vet Sas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'OLAZABAL AV. 5607, Avenida Olazábal', -34.5766447, -58.4865672, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Vet Punto Vet Sas' AND v.ZonaLat = -34.5766447 AND v.ZonaLng = -58.4865672
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Rodiño', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PARAGUAY 3514, Paraguay', -34.5923326, -58.4146629, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Rodiño' AND v.ZonaLat = -34.5923326 AND v.ZonaLng = -58.4146629
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Paraguay 4359', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PARAGUAY 4357, Paraguay', -34.585665, -58.4227956, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Paraguay 4359' AND v.ZonaLat = -34.585665 AND v.ZonaLng = -58.4227956
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Petcity S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PARAGUAY 4357, Paraguay', -34.585665, -58.4227956, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Petcity S.A.' AND v.ZonaLat = -34.585665 AND v.ZonaLng = -58.4227956
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Busnelli', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PAREJA 3088, Pareja', -34.5915085, -58.501173, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Busnelli' AND v.ZonaLat = -34.5915085 AND v.ZonaLng = -58.501173
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Multieventos Y Mascotas Pasco S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'PASCO 611, Pasco', -34.6163375, -58.3977977, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Multieventos Y Mascotas Pasco S.R.L.' AND v.ZonaLat = -34.6163375 AND v.ZonaLng = -58.3977977
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Alejandro Ariel Etchegoyen', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Centro veterinario con internación limitada al proceso pre y postoperatorio (Según ley 6361)). Verificá horarios y disponibilidad antes de ir.', 'PERON, EVA AV. 2499, Avenida Eva Perón', -34.6308078, -58.441975, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Alejandro Ariel Etchegoyen' AND v.ZonaLat = -34.6308078 AND v.ZonaLng = -58.441975
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Roberto Claudio Adolfo Espeja', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PICHEUTA 1413, Picheuta', -34.635626, -58.435517, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Roberto Claudio Adolfo Espeja' AND v.ZonaLat = -34.635626 AND v.ZonaLng = -58.435517
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Font', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PIEDRAS 533, Piedras', -34.6143829, -58.3776063, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Font' AND v.ZonaLat = -34.6143829 AND v.ZonaLng = -58.3776063
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Eidelman, Efraim - Moretti, Julieta S.H.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'PIEDRAS 719, Piedras', -34.6165407, -58.3774768, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Eidelman, Efraim - Moretti, Julieta S.H.' AND v.ZonaLat = -34.6165407 AND v.ZonaLng = -58.3774768
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - D Almeida', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PIERES 257, Pieres', -34.6428389, -58.5149439, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - D Almeida' AND v.ZonaLat = -34.6428389 AND v.ZonaLng = -58.5149439
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Daniela Vanessa Lopez Figueira', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'PINO, Virrey del 2566, Virrey Del Pino', -34.5729719, -58.4655368, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Daniela Vanessa Lopez Figueira' AND v.ZonaLat = -34.5729719 AND v.ZonaLng = -58.4655368
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Pinto 3699', 'Listado importado de datos abiertos del GCBA (habilitación comercial: CONSULTORIO VETERINARIO). Verificá horarios y disponibilidad antes de ir.', 'PINTO 3695, Pinto', -34.5518125, -58.4757374, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Pinto 3699' AND v.ZonaLat = -34.5518125 AND v.ZonaLng = -58.4757374
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Valeria Andrea Pandullo', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'POLA 192, Pola', -34.6408102, -58.511998, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Valeria Andrea Pandullo' AND v.ZonaLat = -34.6408102 AND v.ZonaLng = -58.511998
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Jorge Alberto Picos', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'QUESADA 2702, Quesada', -34.556017, -58.466197, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Jorge Alberto Picos' AND v.ZonaLat = -34.556017 AND v.ZonaLng = -58.466197
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Maria Alejandra Pelaez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'QUESADA 3290, Quesada', -34.5592676, -58.4723889, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Maria Alejandra Pelaez' AND v.ZonaLat = -34.5592676 AND v.ZonaLng = -58.4723889
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria J.P.L. S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'RIVADAVIA AV. 2226, Avenida Rivadavia', -34.6097129, -58.3980235, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria J.P.L. S.R.L.' AND v.ZonaLat = -34.6097129 AND v.ZonaLng = -58.3980235
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Grupo Petba S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'RIVADAVIA AV. 2424, Avenida Rivadavia', -34.6099393, -58.4008302, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Grupo Petba S.A.' AND v.ZonaLat = -34.6099393 AND v.ZonaLng = -58.4008302
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Grupo Petba S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'RIVADAVIA AV. 3207, Avenida Rivadavia', -34.6104331, -58.4118962, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Grupo Petba S.A.' AND v.ZonaLat = -34.6104331 AND v.ZonaLng = -58.4118962
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Martinez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'RIVADAVIA AV. 9210, Avenida Rivadavia', -34.6367947, -58.4938462, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Martinez' AND v.ZonaLat = -34.6367947 AND v.ZonaLng = -58.4938462
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Menchacabaso', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'RODRIGUEZ PEÑA 660, Rodríguez Peña', -34.6012393, -58.391454, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Menchacabaso' AND v.ZonaLat = -34.6012393 AND v.ZonaLng = -58.391454
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Fauna Vets S.A.S.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN ISIDRO LABRADOR AV. 4319, Avenida San Isidro Labrador', -34.5418334, -58.4742358, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Fauna Vets S.A.S.' AND v.ZonaLat = -34.5418334 AND v.ZonaLng = -58.4742358
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Tiscornia', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN ISIDRO LABRADOR AV. 4641, Avenida San Isidro Labrador', -34.5418334, -58.4742358, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Tiscornia' AND v.ZonaLat = -34.5418334 AND v.ZonaLng = -58.4742358
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Rios', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN JOSE 344, San José', -34.6127271, -58.3860705, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Rios' AND v.ZonaLat = -34.6127271 AND v.ZonaLng = -58.3860705
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Grupo Petba S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN JUAN AV. 1952, Avenida San Juan Bautista De La Salle', -34.6537472, -58.4802198, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Grupo Petba S.A.' AND v.ZonaLat = -34.6537472 AND v.ZonaLng = -58.4802198
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Grupo Petba S.A.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN JUAN AV. 1979, Avenida San Juan Bautista De La Salle', -34.6540547, -58.4800775, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Grupo Petba S.A.' AND v.ZonaLat = -34.6540547 AND v.ZonaLng = -58.4800775
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria J.P.L. S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN JUAN AV. 2855, Avenida San Juan', -34.6239791, -58.405016, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria J.P.L. S.R.L.' AND v.ZonaLat = -34.6239791 AND v.ZonaLng = -58.405016
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Castañeyra', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN JUAN AV. 3335, Avenida San Juan', -34.6248831, -58.4126709, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Castañeyra' AND v.ZonaLat = -34.6248831 AND v.ZonaLng = -58.4126709
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Daniel Oscar Raggio', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SAN MARTIN AV. 1961, Avenida San Martín', -34.6050149, -58.4559526, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Daniel Oscar Raggio' AND v.ZonaLat = -34.6050149 AND v.ZonaLng = -58.4559526
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Laura Cristina Fernandez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SANCHEZ DE BUSTAMANTE 2288, Sánchez de Bustamante', -34.5864797, -58.4047738, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Laura Cristina Fernandez' AND v.ZonaLat = -34.5864797 AND v.ZonaLng = -58.4047738
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - María Soledad Iramain', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SANCHEZ DE LORIA 962, Sánchez de Loria', -34.6213799, -58.4123875, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - María Soledad Iramain' AND v.ZonaLat = -34.6213799 AND v.ZonaLng = -58.4123875
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Comercializadora Casper S.R.L.', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SANTA FE AV. 4914, 4914', -34.5775155, -58.4290517, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Comercializadora Casper S.R.L.' AND v.ZonaLat = -34.5775155 AND v.ZonaLng = -58.4290517
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Oswaldo Luis Santos Benain', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SCALABRINI ORTIZ, RAUL AV. 1886, Avenida Raúl Scalabrini Ortiz', -34.5865691, -58.4180397, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Oswaldo Luis Santos Benain' AND v.ZonaLat = -34.5865691 AND v.ZonaLng = -58.4180397
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Verdun', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SERRANO 1189, Jorge Luis Borges', -34.5820018, -58.420877, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Verdun' AND v.ZonaLat = -34.5820018 AND v.ZonaLng = -58.420877
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Diaz Reynolds', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'SUPERI 2851, Superí', -34.5611189, -58.472279, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Diaz Reynolds' AND v.ZonaLat = -34.5611189 AND v.ZonaLng = -58.472279
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Marcelo Donato Petrone', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'TRIUNVIRATO AV. 3780, 4231', -34.5778925, -58.4802991, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Marcelo Donato Petrone' AND v.ZonaLat = -34.5778925 AND v.ZonaLng = -58.4802991
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Llopis Martin Gabriel Pano Pablo Martin S. Cap I Secc Iv', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'TRIUNVIRATO AV. 4083, 4231', -34.5778925, -58.4802991, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Llopis Martin Gabriel Pano Pablo Martin S. Cap I Secc Iv' AND v.ZonaLat = -34.5778925 AND v.ZonaLng = -58.4802991
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Veterinaria Leocan Sas', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'UGARTE, MANUEL 2226, Manuel Ugarte', -34.5550862, -58.4593576, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Veterinaria Leocan Sas' AND v.ZonaLat = -34.5550862 AND v.ZonaLng = -58.4593576
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Cecilia Lorena Gonzalez', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'URUGUAY 144, Uruguay', -34.6071112, -58.3864147, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Cecilia Lorena Gonzalez' AND v.ZonaLat = -34.6071112 AND v.ZonaLng = -58.3864147
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Losardo', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'VIDAL 2491, Vidal', -34.5605592, -58.4633794, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Losardo' AND v.ZonaLat = -34.5605592 AND v.ZonaLng = -58.4633794
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Ana Maria Aschkar', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'VIDT 1774, 1774', -34.5907983, -58.4157128, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Ana Maria Aschkar' AND v.ZonaLat = -34.5907983 AND v.ZonaLng = -58.4157128
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Maria Soledad Piccirilli', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'YERBAL 1074, Yerbal', -34.6210969, -58.4460629, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Maria Soledad Piccirilli' AND v.ZonaLat = -34.6210969 AND v.ZonaLng = -58.4460629
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Guillermo Ignacio Costa', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'YERBAL 1912, Yerbal', -34.6257556, -58.4576288, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Guillermo Ignacio Costa' AND v.ZonaLat = -34.6257556 AND v.ZonaLng = -58.4576288
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Consultorio Veterinario - Gabriela Soledad Coria', 'Listado importado de datos abiertos del GCBA (habilitación comercial: Consultorio veterinario). Verificá horarios y disponibilidad antes de ir.', 'ZARRAGA 3799, Zarraga', -34.5775002, -58.4650782, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Consultorio Veterinario - Gabriela Soledad Coria' AND v.ZonaLat = -34.5775002 AND v.ZonaLng = -58.4650782
);

-- ------------------------------------------------------------
-- Centros fijos de atención veterinaria y castración GRATUITA
-- del GCBA (Agencia de Protección Ambiental / "Animales BA").
-- Fuente: https://buenosaires.gob.ar/gcaba_historico/atencion-veterinaria-y-castraciones-gratuitas
-- (verificado 2026-08-31; confirmar vigencia antes de promocionarlo,
-- el turno se pide con cuenta MiBA). No incluye las 8 unidades
-- MÓVILES (rotan de plaza en plaza semana a semana, sin dirección fija).
-- ------------------------------------------------------------
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Centro de Atención Veterinaria y Castración Gratuita - Parque Indoamericano', 'Centro FIJO municipal de atención clínica y castración gratuita (GCBA / Animales BA). Turno previo online con cuenta MiBA.', 'Av. Escalada y Paseo Islas Malvinas, Villa Soldati', -34.6632531, -58.4653650, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Centro de Atención Veterinaria y Castración Gratuita - Parque Indoamericano' AND v.ZonaLat = -34.6632531 AND v.ZonaLng = -58.4653650
);
INSERT INTO Veterinaria (UserId, Nombre, Descripcion, ZonaDescripcion, ZonaLat, ZonaLng, Estado)
SELECT admin.UserId, 'Centro de Atención Veterinaria y Castración Gratuita - Costanera Sur', 'Centro FIJO municipal de atención clínica y castración gratuita (GCBA / Animales BA). Turno previo online con cuenta MiBA.', 'Costanera Sur, Puerto Madero', -34.6069493, -58.3527424, 'A'
FROM (SELECT UserId FROM Usuario WHERE Rol = 'admin' ORDER BY UserId ASC LIMIT 1) admin
WHERE NOT EXISTS (
    SELECT 1 FROM Veterinaria v
    WHERE v.Nombre = 'Centro de Atención Veterinaria y Castración Gratuita - Costanera Sur' AND v.ZonaLat = -34.6069493 AND v.ZonaLng = -58.3527424
);
