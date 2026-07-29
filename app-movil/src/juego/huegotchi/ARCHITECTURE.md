# HueGotchi — arquitectura

## Docs para arte
- **Brief artista:** [`RIVE_BRIEF.md`](./RIVE_BRIEF.md)
- **Contrato nombres:** [`rive.contract.json`](./rive.contract.json)
- **Carpeta .riv:** `assets/juego/rive/`

## Decisión de motor

| Opción | Veredicto |
|--------|-----------|
| **Rive** | Destino de arte (skeletal + mesh + SM). Web: `@rive-app/react-canvas`. Nativo: `@rive-app/react-native` + dev build. |
| Phaser / Unity | No encajan en Expo RN. |

**Hoy:** `InteractivePet` (Reanimated + GIF + físicas + look-at + voz).  
**Cuando exista `.riv` registrado:** `RivePetCanvas` (web).

## Carpetas

```
src/juego/huegotchi/
  RIVE_BRIEF.md
  rive.contract.json
  types.ts / PetStateMachine.ts / appearance.ts / lookAt.ts
  audio/
  components/InteractivePet.tsx
  rive/
    registry.ts
    RivePetCanvas.web.tsx
    HueGotchiStage.tsx
  index.ts
```

## Activar un .riv

1. Artista entrega según `RIVE_BRIEF.md`
2. Copiar a `assets/juego/rive/gato_base.riv`
3. Descomentar require en `rive/registry.ts`
4. En web, servir también en `public/assets/juego/rive/` o pasar `riveUrl`
