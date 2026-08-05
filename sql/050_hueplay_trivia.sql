-- ============================================================
-- HueTrivia: preguntas de cuidado animal
-- Idempotente: se puede correr más de una vez sin duplicar preguntas.
-- mysql -u root --default-character-set=utf8mb4 huellitas < sql/050_hueplay_trivia.sql
-- ============================================================

SET NAMES utf8mb4;

-- ------------------------------------------------------------
-- Las preguntas van en base y no en el código de la app.
--
-- Tres razones: se pueden agregar sin sacar una versión nueva de la app; se
-- pueden traducir de a poco (una fila por idioma) en vez de tener que tener los
-- 10 idiomas listos antes de publicar; y si una pregunta sale mal o está
-- desactualizada se apaga con `Estado` sin tocar nada más.
--
-- `Clave` agrupa la misma pregunta en distintos idiomas. Es lo que permite que
-- un duelo entre alguien en español y alguien en inglés reciba **las mismas
-- preguntas**, cada uno en su idioma: se sortean claves, no filas.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS TriviaPregunta (
    PreguntaId INT UNSIGNED NOT NULL AUTO_INCREMENT,
    Clave VARCHAR(48) NOT NULL,
    Idioma CHAR(2) NOT NULL,
    Texto VARCHAR(400) NOT NULL,
    OpcionA VARCHAR(200) NOT NULL,
    OpcionB VARCHAR(200) NOT NULL,
    OpcionC VARCHAR(200) NOT NULL,
    OpcionD VARCHAR(200) NOT NULL,
    /** Nunca viaja al cliente: el servidor corrige. */
    Correcta ENUM('A','B','C','D') NOT NULL,
    Explicacion VARCHAR(400) NULL,
    Estado CHAR(1) NOT NULL DEFAULT 'A',
    PRIMARY KEY (PreguntaId),
    UNIQUE KEY uk_clave_idioma (Clave, Idioma),
    KEY idx_idioma (Idioma, Estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------
-- Preguntas iniciales. `INSERT IGNORE` contra el único (Clave, Idioma) hace que
-- correr la migración de nuevo no duplique nada, y que agregar preguntas más
-- adelante sea sumar filas acá abajo.
--
-- Hoy están cargadas en español e inglés. Los otros 8 idiomas caen a español
-- por el fallback del endpoint hasta que se carguen: es preferible una pregunta
-- entendible en otro idioma que una pantalla vacía.
-- ------------------------------------------------------------
INSERT IGNORE INTO TriviaPregunta (Clave, Idioma, Texto, OpcionA, OpcionB, OpcionC, OpcionD, Correcta, Explicacion) VALUES
('vacuna_cachorro', 'es', '¿A partir de qué edad se puede dar la primera vacuna a un cachorro?', 'A las 6-8 semanas', 'Al nacer', 'Al año de vida', 'A los 6 meses', 'A', 'Antes de las 6 semanas todavía lo protegen los anticuerpos de la madre.'),
('chocolate', 'es', '¿Por qué el chocolate es peligroso para los perros?', 'Porque tiene teobromina, que no pueden metabolizar', 'Porque tiene mucha azúcar', 'Porque les mancha los dientes', 'Porque les da sueño', 'A', 'La teobromina les afecta el corazón y el sistema nervioso.'),
('castracion_edad', 'es', '¿Cuál es el principal beneficio de castrar a una mascota?', 'Evita camadas no deseadas y previene algunas enfermedades', 'La hace más obediente', 'Le cambia el color del pelo', 'Le alarga las patas', 'A', NULL),
('gato_leche', 'es', '¿Es buena idea darle leche de vaca a un gato adulto?', 'No, la mayoría es intolerante a la lactosa', 'Sí, todos los días', 'Sí, pero sólo tibia', 'Sí, reemplaza el agua', 'A', 'De adultos pierden la enzima que digiere la lactosa.'),
('paseo_calor', 'es', '¿Cuándo NO conviene pasear a un perro en verano?', 'Al mediodía, con el asfalto caliente', 'Temprano a la mañana', 'Al atardecer', 'De noche', 'A', 'El asfalto puede quemarle las almohadillas.'),
('microchip', 'es', '¿Para qué sirve el microchip en una mascota?', 'Para identificarla si se pierde', 'Para rastrearla por GPS en tiempo real', 'Para medirle la temperatura', 'Para abrirle la puerta', 'A', 'No tiene GPS: guarda un número que se lee con un lector.'),
('uvas', 'es', '¿Cuál de estos alimentos es tóxico para perros y gatos?', 'Las uvas y pasas de uva', 'La zanahoria', 'El arroz cocido', 'La manzana sin semillas', 'A', NULL),
('celo_gata', 'es', '¿Cada cuánto entra en celo una gata sin castrar?', 'Varias veces al año, sobre todo en primavera y verano', 'Una vez en la vida', 'Una vez cada 5 años', 'Nunca', 'A', NULL),
('perro_cola', 'es', 'Un perro moviendo la cola, ¿siempre está contento?', 'No, también puede estar nervioso o alerta', 'Sí, siempre', 'Sólo si es cachorro', 'Sólo si ladra al mismo tiempo', 'A', 'Hay que mirar todo el cuerpo, no sólo la cola.'),
('agua_fresca', 'es', '¿Con qué frecuencia hay que cambiarle el agua a una mascota?', 'Todos los días, al menos una vez', 'Una vez por semana', 'Una vez por mes', 'Sólo en verano', 'A', NULL),
('gato_arenero', 'es', '¿Cuántos areneros conviene tener con dos gatos en casa?', 'Tres: uno más que la cantidad de gatos', 'Uno solo alcanza', 'Ninguno, van afuera', 'Cinco como mínimo', 'A', 'La regla es un arenero por gato más uno.'),
('pulgas', 'es', '¿Las pulgas sólo aparecen en verano?', 'No, con calefacción pueden sobrevivir todo el año', 'Sí, sólo en verano', 'Sí, sólo en invierno', 'Sólo si el perro sale al campo', 'A', NULL),
('adopcion_edad', 'es', '¿A qué edad mínima conviene separar a un cachorro de su madre?', 'A las 8 semanas', 'A las 2 semanas', 'Al día siguiente de nacer', 'Al año', 'A', 'Antes de eso todavía aprende conductas sociales de la camada.'),
('huesos_cocidos', 'es', '¿Se le pueden dar huesos cocidos a un perro?', 'No, se astillan y pueden perforarle el intestino', 'Sí, son los mejores', 'Sí, si son de pollo', 'Sí, una vez por semana', 'A', NULL),
('gato_ronronea', 'es', 'Un gato que ronronea, ¿siempre está a gusto?', 'No, también ronronean cuando tienen dolor o miedo', 'Sí, siempre', 'Sólo cuando come', 'Sólo de noche', 'A', NULL),
('desparasitar', 'es', '¿Cada cuánto se suele desparasitar a un perro adulto sano?', 'Cada 3 a 6 meses, según indicación veterinaria', 'Una vez en la vida', 'Todos los días', 'Cada 5 años', 'A', NULL),
('auto_calor', 'es', '¿Qué pasa si dejo a mi perro en el auto cerrado en verano?', 'Puede sufrir un golpe de calor mortal en minutos', 'No pasa nada si hay sombra', 'Se duerme tranquilo', 'Sólo pasa si el auto es negro', 'A', NULL),
('correa_ciudad', 'es', '¿Por qué conviene llevar al perro con correa en la ciudad?', 'Por su seguridad y la de los demás', 'Porque es más lindo', 'Porque camina más rápido', 'Porque así no ladra', 'A', NULL),
('gato_ventana', 'es', '¿Qué es el "síndrome del gato paracaidista"?', 'Caídas desde ventanas o balcones sin red', 'Un juego con paracaídas', 'Una raza de gato', 'Una vacuna', 'A', 'Por eso se recomienda poner redes de protección.'),
('perro_viejo', 'es', 'Un perro mayor que duerme mucho más que antes, ¿qué conviene hacer?', 'Consultar al veterinario: puede haber algo detrás', 'Nada, es normal y listo', 'Despertarlo seguido', 'Darle más comida', 'A', NULL),
('cepillado', 'es', '¿Para qué sirve cepillar a un gato de pelo largo?', 'Evita nudos y reduce las bolas de pelo', 'Para que crezca más rápido', 'Para que cambie de color', 'No sirve para nada', 'A', NULL),
('collar_isabelino', 'es', '¿Para qué se usa el collar isabelino después de una cirugía?', 'Para que no se lama ni se muerda la herida', 'Para que no ladre', 'Para que no coma', 'Para abrigarlo', 'A', NULL),
('temperatura_perro', 'es', '¿Cuál es la temperatura corporal normal de un perro?', 'Entre 38 y 39 grados', 'Entre 33 y 34 grados', 'Entre 41 y 42 grados', 'La misma que la humana', 'A', 'Es más alta que la de las personas.'),
('socializacion', 'es', '¿Cuál es la mejor etapa para socializar a un cachorro?', 'Entre las 3 y las 12 semanas de vida', 'Después de los 3 años', 'Nunca, se socializa solo', 'Sólo cuando ya está castrado', 'A', NULL),
('gato_agua', 'es', '¿Por qué muchos gatos toman poca agua del bebedero?', 'Prefieren agua en movimiento y lejos de la comida', 'No necesitan agua', 'Sólo toman leche', 'Toman del aire', 'A', 'Por eso funcionan bien las fuentes de agua.'),
('perro_cebolla', 'es', '¿La cebolla y el ajo son seguros para los perros?', 'No, dañan sus glóbulos rojos', 'Sí, en cualquier cantidad', 'Sí, si están cocidos', 'Sí, una vez por semana', 'A', NULL),
('rescate_calle', 'es', 'Si encontrás un perro perdido en la calle, ¿qué es lo primero?', 'Ver si tiene chapita o microchip y avisar en la zona', 'Llevártelo directamente a tu casa para siempre', 'Ignorarlo', 'Soltarlo en otro barrio', 'A', NULL),
('gato_cajas', 'es', '¿Por qué a los gatos les gustan las cajas?', 'Les dan sensación de refugio y de seguridad', 'Porque son de cartón', 'Porque tienen olor a comida', 'Porque son cuadradas', 'A', NULL),
('vacuna_antirrabica', 'es', '¿La vacuna antirrábica es obligatoria en la mayoría de los lugares?', 'Sí, y se repite periódicamente', 'No, es opcional', 'Sólo para gatos', 'Sólo para perros de raza', 'A', NULL),
('ejercicio_diario', 'es', '¿Qué pasa si un perro activo no hace suficiente ejercicio?', 'Puede desarrollar ansiedad y conductas destructivas', 'Nada, se adapta', 'Se pone más obediente', 'Duerme mejor de noche', 'A', NULL),
('vacuna_cachorro', 'en', 'At what age can a puppy get its first vaccine?', 'At 6-8 weeks', 'At birth', 'At one year old', 'At 6 months', 'A', 'Before 6 weeks the mother\'s antibodies still protect them.'),
('chocolate', 'en', 'Why is chocolate dangerous for dogs?', 'It contains theobromine, which they cannot metabolise', 'It has too much sugar', 'It stains their teeth', 'It makes them sleepy', 'A', 'Theobromine affects their heart and nervous system.'),
('castracion_edad', 'en', 'What is the main benefit of neutering a pet?', 'It prevents unwanted litters and some diseases', 'It makes them more obedient', 'It changes their coat colour', 'It makes their legs longer', 'A', NULL),
('gato_leche', 'en', 'Is cow milk a good idea for an adult cat?', 'No, most of them are lactose intolerant', 'Yes, every day', 'Yes, but only warm', 'Yes, it replaces water', 'A', 'As adults they lose the enzyme that digests lactose.'),
('paseo_calor', 'en', 'When should you NOT walk a dog in summer?', 'At midday, when the asphalt is hot', 'Early in the morning', 'At sunset', 'At night', 'A', 'Hot asphalt can burn their paw pads.'),
('microchip', 'en', 'What is a pet microchip for?', 'To identify them if they get lost', 'To track them by GPS in real time', 'To measure their temperature', 'To open the door for them', 'A', 'It has no GPS: it stores a number read by a scanner.'),
('uvas', 'en', 'Which of these foods is toxic to dogs and cats?', 'Grapes and raisins', 'Carrot', 'Cooked rice', 'Apple without seeds', 'A', NULL),
('celo_gata', 'en', 'How often does an unspayed cat go into heat?', 'Several times a year, mostly in spring and summer', 'Once in a lifetime', 'Once every 5 years', 'Never', 'A', NULL),
('perro_cola', 'en', 'Is a dog wagging its tail always happy?', 'No, it can also be nervous or alert', 'Yes, always', 'Only if it is a puppy', 'Only if it barks at the same time', 'A', 'You have to read the whole body, not just the tail.'),
('agua_fresca', 'en', 'How often should you change a pet water bowl?', 'Every day, at least once', 'Once a week', 'Once a month', 'Only in summer', 'A', NULL),
('gato_arenero', 'en', 'How many litter boxes should you have for two cats?', 'Three: one more than the number of cats', 'One is enough', 'None, they go outside', 'At least five', 'A', 'The rule is one box per cat plus one.'),
('pulgas', 'en', 'Do fleas only appear in summer?', 'No, with indoor heating they survive all year', 'Yes, summer only', 'Yes, winter only', 'Only if the dog goes to the countryside', 'A', NULL),
('adopcion_edad', 'en', 'What is the minimum age to separate a puppy from its mother?', 'At 8 weeks', 'At 2 weeks', 'The day after birth', 'At one year', 'A', 'Before that they are still learning social behaviour from the litter.'),
('huesos_cocidos', 'en', 'Can you give cooked bones to a dog?', 'No, they splinter and can pierce the intestine', 'Yes, they are the best', 'Yes, if they are chicken bones', 'Yes, once a week', 'A', NULL),
('gato_ronronea', 'en', 'Is a purring cat always comfortable?', 'No, they also purr when in pain or scared', 'Yes, always', 'Only while eating', 'Only at night', 'A', NULL),
('desparasitar', 'en', 'How often is a healthy adult dog usually dewormed?', 'Every 3 to 6 months, as advised by a vet', 'Once in a lifetime', 'Every day', 'Every 5 years', 'A', NULL),
('auto_calor', 'en', 'What happens if you leave a dog in a closed car in summer?', 'It can suffer fatal heatstroke within minutes', 'Nothing if it is in the shade', 'It sleeps peacefully', 'It only matters if the car is black', 'A', NULL),
('correa_ciudad', 'en', 'Why should a dog be leashed in the city?', 'For its own safety and everyone else', 'Because it looks nicer', 'Because it walks faster', 'Because it stops barking', 'A', NULL),
('gato_ventana', 'en', 'What is "high-rise syndrome" in cats?', 'Falls from unscreened windows or balconies', 'A game with parachutes', 'A cat breed', 'A vaccine', 'A', 'That is why protective netting is recommended.'),
('perro_viejo', 'en', 'An older dog sleeping much more than before: what should you do?', 'See a vet: something may be behind it', 'Nothing, it is just normal', 'Wake it up often', 'Feed it more', 'A', NULL),
('cepillado', 'en', 'Why brush a long-haired cat?', 'It prevents knots and reduces hairballs', 'To make the fur grow faster', 'To change its colour', 'It is useless', 'A', NULL),
('collar_isabelino', 'en', 'What is a cone collar used for after surgery?', 'So they cannot lick or bite the wound', 'So they do not bark', 'So they do not eat', 'To keep them warm', 'A', NULL),
('temperatura_perro', 'en', 'What is a normal body temperature for a dog?', 'Between 38 and 39 degrees Celsius', 'Between 33 and 34', 'Between 41 and 42', 'The same as a human', 'A', 'It is higher than in people.'),
('socializacion', 'en', 'When is the best window to socialise a puppy?', 'Between 3 and 12 weeks of age', 'After 3 years old', 'Never, it happens on its own', 'Only after neutering', 'A', NULL),
('gato_agua', 'en', 'Why do many cats drink little from their bowl?', 'They prefer moving water, away from their food', 'They do not need water', 'They only drink milk', 'They absorb it from the air', 'A', 'That is why water fountains work well.'),
('perro_cebolla', 'en', 'Are onion and garlic safe for dogs?', 'No, they damage their red blood cells', 'Yes, in any amount', 'Yes, if cooked', 'Yes, once a week', 'A', NULL),
('rescate_calle', 'en', 'If you find a lost dog on the street, what comes first?', 'Check for a tag or microchip and ask around the area', 'Take it home for good right away', 'Ignore it', 'Release it in another neighbourhood', 'A', NULL),
('gato_cajas', 'en', 'Why do cats like boxes?', 'They feel sheltered and safe inside', 'Because they are cardboard', 'Because they smell like food', 'Because they are square', 'A', NULL),
('vacuna_antirrabica', 'en', 'Is the rabies vaccine mandatory in most places?', 'Yes, and it is repeated periodically', 'No, it is optional', 'Only for cats', 'Only for purebred dogs', 'A', NULL),
('ejercicio_diario', 'en', 'What happens if an active dog does not get enough exercise?', 'It can develop anxiety and destructive behaviour', 'Nothing, it adapts', 'It becomes more obedient', 'It sleeps better at night', 'A', NULL);
