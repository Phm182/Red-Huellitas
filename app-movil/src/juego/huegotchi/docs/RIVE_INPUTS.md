# Inputs Rive — HueGotchi (contrato técnico)

> **Importante:** el agente / la app **no pueden crear el `.riv` en tu cuenta de Rive**.
> El archivo se diseña en [editor.rive.app](https://editor.rive.app) y se exporta.
> Mientras no exista, HueGotchi usa un **fallback clay** jugable (mirada, squash, acciones).

**Artboard:** `Pet`  
**State Machine:** `PetLife`  
**View Model:** `PetVM`  
**Un archivo `.riv` por especie:** `gato.riv` | `perro.riv` | `tortuga.riv`

Estilo visual: volumétrico 2.5D, mesh deform, gradientes soft (Sims / Animal Crossing / Apple clay). **No pixel art.**

## Cómo enchufar el archivo cuando lo tengas

1. En Rive: **Export → Runtime** → `.riv`
2. Copiá a:
   - `app-movil/assets/juego/rive/gato.riv` (nativo / `require`)
   - `app-movil/public/rive/gato.riv` (Expo web — **no** uses `/assets/`, Expo lo reserva)
3. En `rive/assets.native.ts` agregá el `require(...)` de esa especie
4. En `rive/assets.web.ts` marcá la especie en `WEB_RIVE`
5. Reiniciá Metro con caché limpia: `npx expo start -c`
6. Recargá la app — el fallback se apaga solo cuando Rive carga OK

---

## Numbers (`PetVM` / SM)

| Nombre | Rango | Uso |
|--------|-------|-----|
| `lookX` | -1…1 | Mirada / rotación cabeza horizontal (app hace lerp) |
| `lookY` | -1…1 | Mirada vertical |
| `squash` | 0.85…1.15 | Compresión clay (Hooke) |
| `stretch` | 0.85…1.15 | Estiramiento clay |
| `mood` | 0…1 | Ánimo (0 decaído → 1 feliz) |
| `bodyScale` | 0.7…1.4 | Escala corporal |
| `ageBlend` | 0…1 | 0 cachorro / 1 adulto (morph) |
| `placeId` | 0…4 | 0 living, 1 cocina, 2 patio, 3 árbol, 4 plaza |
| `weatherId` | 0…3 | 0 clear, 1 cloudy, 2 rain, 3 storm |
| `periodId` | 0…3 | 0 dawn, 1 day, 2 dusk, 3 night |

## Booleans

| Nombre | Uso |
|--------|-----|
| `isDragging` | Usuario arrastra al pet |
| `isSleeping` | Dormir / noche |
| `isNight` | Ciclo día/noche |
| `isRaining` | Lluvia/tormenta |
| `preferIndoors` | Llueve + lugar exterior → busca casa |
| `hasGuest` | Visita de amigo activa (máquina dual) |

## String / Enum (skin en caliente)

| Nombre | Uso |
|--------|-----|
| `skinId` | Pelaje/raza/edad. Formato: `{especie}_{cachorro\|adulto}_{razaSlug}` |

La app llama `setSkin(skinId)` sin recargar el archivo.

## Triggers

| Nombre | Cuándo |
|--------|--------|
| `poke` | Tap en el animal |
| `feed` | Alimentar |
| `play` | Jugar |
| `bath` | Bañar |
| `sleep` | Dormir |
| `yawn` | Noche / aburrido |
| `trickPaw` | Truco dar la pata |
| `trickSpin` | Dar vuelta |
| `trickPlayDead` | Hacerse el muerto |
| `trickSuccess` / `trickFail` | Resultado entrenamiento |
| `catchFood` | Minijuego glotón |
| `guestArrive` | Llega visita |
| `guestPlay` / `guestSniff` / `guestIgnore` | Interacción dual |

## Mesh / capas recomendadas

- `Torso`, `Head` con **Mesh Deform** (squash + look-at)
- Capas de coat por `skinId`
- Artboards/nodes de fondo indexados por `placeId`
- Guest pet (segundo skeleton) visible si `hasGuest`

## QA checklist

- [ ] SM `PetLife` + VM `PetVM` + artboard `Pet`
- [ ] Todos los numbers/booleans/triggers con nombres exactos
- [ ] `skinId` cambia pelaje sin reload
- [ ] `lookX=1` mira a la derecha del espectador
- [ ] Squash 0.85 se ve “plastilina” sin romper mesh
- [ ] Archivo < 3 MB por especie
