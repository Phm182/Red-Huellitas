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
