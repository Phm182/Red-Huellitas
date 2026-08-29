# HueGotchi — arquitectura (2D, dibujado a mano)

Actualizado 2026-08-08: se sacó el modelo 3D del perro (GLB + esqueleto,
Three.js), el "clay" procedural viejo del gato como 3D, y los clips Lottie
de terceros. Las 10 especies de `Especie` (perro, gato, conejo, ave, pez,
hamster, cobayo, tortuga, huron, otro) ahora renderizan con un único motor
propio en SVG (`react-native-svg`), sin dependencias externas de animación.

## Estructura

```
src/juego/huegotchi/
  HueGotchiExperience.tsx        # UI principal: stage + gestos + acordeón de acciones
  hooks/useHueGotchiController.ts # orquestador: físicas, entorno, audio, trucos, visitas
  domain/
    types.ts                     # HueSpecies = Especie (1 a 1 con el catálogo real)
    breeds.ts                    # morfología por raza (37 perro/gato) + promedios por especie
    poses.ts                     # Pose = función pura (trigger, t) -> postura; agnóstica del renderer
    riveStates.ts                # bucket de humor (nombre histórico, no depende de Rive)
  components/
    ProceduralPet.tsx            # el dibujo: torso/cabeza/patas/cola genéricos + Tortuga/Ave/Pez aparte
    ProceduralPetStage.tsx       # adaptador: Pose + reloj propio -> <ProceduralPet>
    SceneBackdrop.tsx            # fondo (lugar / día-noche / clima)
    TrickCoachOverlay.tsx        # overlay de gestos para los trucos
    CatchFoodGame.tsx            # minijuego de atrapar comida
  physics/PetPhysicsEngine.ts    # Hooke + look-at lerp (mirada, squash/stretch al arrastrar)
  audio/PetVoiceEngine.ts        # clips reales (gato/perro) + fallback sintetizado
  systems/
    environment.ts               # lugares + día/noche + clima
    personality.ts                # rasgos dinámicos
    training.ts                   # trucos por gestos
    social.ts                     # visitas de amigos
  rive/contract.ts               # SOLO strings (RIVE_TRIGGERS, nombre histórico): vocabulario
                                  # de triggers de acción, reusado por el sistema de poses.
                                  # No hay más nada de Rive: sin .riv, sin bridge, sin handle nativo.
```

## Cómo se dibuja un animal

`ProceduralPet.tsx` recibe una `ResolvedBreed` (proporciones + colores, de
`breeds.ts`) y una `Pose` (números 0→1 / grados, de `poses.ts`) y arma el
SVG. La mayoría de las especies (perro, gato, conejo, hurón, hámster,
cobayo, "otro") comparten el mismo esqueleto genérico de cuadrúpedo —lo que
cambia es sólo la morfología (ancho/alto/largo de tronco, tamaño de
cabeza/hocico/orejas, largo de cola) que ya trae `ResolvedBreed`—; tortuga,
ave y pez tienen su propio archetype porque su anatomía es demasiado
distinta (caparazón, alas/pico, aletas) como para forzarla en el esqueleto
de cuadrúpedo.

`Pose` es la misma interfaz para las 10 especies: cada archetype decide qué
hacer con cada campo (por ejemplo, en el pájaro `earFlap` bate las alas en
vez de mover orejas). Esto es lo que permite que **todas** las acciones
(comer, jugar, bañarse, dormir, trucos, visitas) se vean en cualquier
especie sin escribir la animación de nuevo por cada una: la lógica de "qué
pasa en el segundo `t` de la acción `feed`" vive una sola vez en
`poseFor()`.

## Agregar una especie nueva

1. Sumarla a `Especie` (`src/types/index.ts`) y a `ESPECIES`
   (`src/constants/especies.ts`) si todavía no está.
2. Agregar su promedio morfológico en `domain/breeds.ts`
   (`promedioBase()` + la constante `X_PROMEDIO`).
3. Si su anatomía entra en el esqueleto de cuadrúpedo genérico, no hace
   falta más nada — ya dibuja sola con los números del promedio.
4. Si no (como ave/pez), agregar un archetype propio en
   `ProceduralPet.tsx` y despacharlo al principio de `ProceduralPet()`,
   mismo patrón que `Tortuga`/`Ave`/`Pez`.
