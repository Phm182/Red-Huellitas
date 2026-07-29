# Assets Rive — HueGotchi

Colocar acá los `.riv` del artista:

- `gato_base.riv`
- `perro_base.riv`

Luego en `src/juego/huegotchi/rive/registry.ts` descomentá:

```ts
gato: require('../../../../assets/juego/rive/gato_base.riv'),
```

Y para web, copiá también a `public/assets/juego/rive/` (o serví la URL en `riveUrl`).

Brief completo: `src/juego/huegotchi/RIVE_BRIEF.md`  
Contrato de nombres: `src/juego/huegotchi/rive.contract.json`
