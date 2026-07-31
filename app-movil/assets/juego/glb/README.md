# Modelos GLB HueGotchi

## Perro (skinned + clips)

Fuente: `../rsg_dogspack_germanshepherd_fbx/`

| Archivo | Clip |
|---------|------|
| `perro_mesh.glb` | mesh con skin |
| `perro_idle.glb` | Idle Breathing |
| `perro_play.glb` | Idle Playing |
| `perro_walk.glb` | Walk Loop |
| `perro_run.glb` | Run Loop |
| `perro_turn.glb` | Walk Turn Left |
| `perro_lean.glb` | Run Lean Left |
| `perro_albedo.jpg` | textura 1024 |

Mapa de acciones (director): feed→lean, play→play, bath→turn, spin→turn, catch→run, pet/speak→idle+overlay, sit/lie→pose huesos.

## Gato (STL sentado)

Fuente: `../3dprintfile_stl_sitting_blue_cat/sitting blue cat.stl`

- `gato_mesh.glb` — ~16k tris, color azul, **ya sentado**, sin skin
- Motion rígido (restPose: `sit`)

Regenerar:

```bash
node scripts/stl-to-glb.mjs "assets/juego/3dprintfile_stl_sitting_blue_cat/sitting blue cat.stl" assets/juego/glb/gato_mesh.glb "#5BA3E0" 16000
```
