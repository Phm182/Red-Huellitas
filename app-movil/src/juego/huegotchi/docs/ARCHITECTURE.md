# HueGotchi — arquitectura de producción (Rive)

## Estructura

```
src/juego/huegotchi/
  HueGotchiExperience.tsx     # UI principal
  hooks/useHueGotchiController.ts
  domain/types.ts
  physics/PetPhysicsEngine.ts # Hooke + look-at lerp
  audio/PetVoiceEngine.ts     # 10 clips × ánimo + pitch 0.9–1.1
  systems/
    environment.ts            # lugares + día/noche + clima
    personality.ts            # rasgos dinámicos
    training.ts               # trucos por gestos
    social.ts                 # visitas de amigos
  rive/
    contract.ts               # nombres SM / VM EXACTOS
    assets.ts                 # .riv por especie
    RivePetRuntime.native.tsx # @rive-app/react-native
    RivePetRuntime.web.tsx    # @rive-app/react-canvas
    RivePetRuntime.types.ts
  docs/RIVE_INPUTS.md
```

## Assets

Colocar en `assets/juego/rive/`:

- `gato.riv`
- `perro.riv`
- `tortuga.riv`

Descomentar `require(...)` en `rive/assets.ts`.  
En web copiar también a `public/assets/juego/rive/`.

## Native

`@rive-app/react-native` requiere **development build** (no Expo Go):

```bash
npx expo prebuild
npx expo run:android
```

## setSkin

`handle.setSkin(skinId)` escribe el ViewModel string `skinId` **sin recargar** el `.riv`.
