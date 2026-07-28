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
