# Brief de arte — HueGotchi (Rive)

**Producto:** Red Huellitas · minijuego **HueGotchi**  
**Estilo:** App Store actual · clay / plastilina premium · volumen 2.5D · **NO** pixel art ni retro  
**Entrega:** archivos `.riv` + hoja de capas  
**Contrato técnico (nombres exactos):** `rive.contract.json` (misma carpeta)

---

## 1. Objetivo visual

Personaje 2D que se sienta **volumétrico** (como figurita de plastilina iluminada):

- Formas suaves, bordes limpios, sin outline negro grueso.
- Gradientes internos (luz arriba-izquierda, sombra abajo-derecha).
- Sombra elíptica suave bajo el cuerpo (puede ir en el artboard o la pone la app).
- Proporciones cute modernas (cabeza ~40–45% de la altura).
- Escala de color amigable; evitar neón / glow.

Referencias de feeling (no copiar): Apple Memoji soft, Falinks/clay shorts, mascotas App Store 2024–26.

---

## 2. Entregables

| Archivo | Contenido |
|---------|-----------|
| `gato_base.riv` | Gato completo + SM + skins base |
| `perro_base.riv` | Perro completo + misma SM |
| *(opcional)* `conejo_base.riv` | Misma estructura |
| `HueGotchi_capas.xlsx` o Notion | Lista de coats / accesorios con IDs |

**Artboard principal:** `Pet` (1080×1080 px lógicos).  
**State Machine única:** `PetLife` (nombre exacto).

---

## 3. Jerarquía de bones / nodos (obligatoria)

```
Root
├── Shadow          (opcional; ellipse soft)
├── Body
│   ├── Torso       ← mesh deform (squash)
│   ├── Belly
│   └── Legs
├── Head            ← bone que rota/traslada con lookX/lookY
│   ├── Face
│   ├── Eyes
│   │   ├── EyeL / PupilL
│   │   └── EyeR / PupilR
│   ├── Ears
│   ├── Nose
│   └── Mouth
├── Tail
├── Coat            ← swap / tint (piel)
├── Pattern         ← manchas, stripes (opcional hide)
└── Accessories
    ├── acc_collar
    ├── acc_bow
    ├── acc_hat
    └── acc_glasses
```

**Mesh deform:** mínimo en `Torso` y `Head` (o Face) para squash & stretch y look-at.

---

## 4. State Machine `PetLife`

### Estados (animations / states)

| State | Duración loop | Notas |
|-------|---------------|-------|
| `idle` | 2–3 s loop | Respiración suave, blink cada 3–5 s |
| `happy` | loop | Cola / orejas más vivas |
| `sad` | loop | Postura baja, orejas caídas |
| `eating` | 2.2–2.8 s one-shot → idle | Boca + cabeza |
| `playing` | 2.5–3 s one-shot → idle | Rebote / pounce |
| `bathing` | 2.8–3.4 s one-shot → idle | Gotas / shake |
| `sleeping` | loop | Ojos cerrados, zzz opcional en art |
| `poke` | 0.4–0.7 s one-shot → idle | Reacción al tap |

### Transitions

- Triggers (boolean one-shot / trigger type en Rive):
  - `poke` → poke
  - `feed` → eating
  - `play` → playing
  - `bath` → bathing
  - `sleep` → sleeping
- Number `mood` (0–1) mezcla idle↔happy↔sad en reposo:
  - `>= 0.75` → happy
  - `0.4–0.75` → idle
  - `< 0.4` → sad (blend)
- Boolean `isSleeping`: fuerza sleeping hasta `sleep` off / otra acción.
- Boolean `isDragging`: mientras el user arrastra (app lo setea).

### Numbers (inputs) — **nombres exactos**

| Input | Rango | Uso |
|-------|-------|-----|
| `lookX` | -1 … 1 | Cabeza/ojos miran horizontal |
| `lookY` | -1 … 1 | Cabeza/ojos miran vertical |
| `squash` | 0.85 … 1.15 | Compresión (app + física) |
| `stretch` | 0.85 … 1.15 | Estiramiento |
| `mood` | 0 … 1 | Ánimo (feliz→decaído) |
| `bodyScale` | 0.7 … 1.4 | Tamaño personalizado |
| `weight` | 0.6 … 1.6 | Influye squash visual (más “gomita”) |
| `length` | 0.85 … 1.25 | Escala X corporal |

**Look-at:** la app hace **lerp** y manda valores ya suavizados. En Rive, bones de Head/Pupils deben responder de forma lineal a `lookX/Y` (sin otro damping fuerte).

Rango sugerido de movimiento de Head: ±12–18° rotación + ±8–14 px translate. Pupils: ±4–6 px extra.

---

## 5. Personalización (skins / capas)

Sin recargar el `.riv`. Usar **View Model / Data Binding** o booleans por variante.

### Coat (piel) — Enum o booleans mutuamente excluyentes

IDs (exactos):

- `coat_default`
- `coat_orange`
- `coat_gray`
- `coat_black`
- `coat_white`
- `coat_cream`
- `coat_tabby`
- `coat_calico` (gato)
- `coat_spotted` (perro)

### Pattern

- `pattern_none`
- `pattern_stripes`
- `pattern_spots`
- `pattern_mask`

### Accesorios (boolean cada uno, stackeables)

- `acc_collar`
- `acc_bow`
- `acc_hat`
- `acc_glasses`
- `acc_bandana`

La app llama: `setBoolean('acc_bow', true)` etc.

---

## 6. Iluminación en el dibujo

- Highlight suave en tercio superior-izquierdo (blanco 20–35% opacity).
- AO suave en axilas / bajo mentón / entre patas.
- Evitar flat cel-shading duro.
- Colores en sRGB; exportar con premultiplied alpha limpio.

---

## 7. Audio (aparte, mismo pipeline)

La app espera 10 maullidos `m01`…`m10` (MP3).  
No van dentro del `.riv`. Ver `assets/juego/sfx/README.md`.

---

## 8. Checklist de QA antes de entregar

- [ ] SM se llama exactamente `PetLife`
- [ ] Artboard se llama exactamente `Pet`
- [ ] Todos los inputs de la §4 existen y tipados
- [ ] Triggers one-shot vuelven a `idle`/`happy`/`sad` según mood
- [ ] `lookX=1` mueve cabeza a la derecha del espectador
- [ ] Squash 0.85 se ve “aplastado” sin romper mesh
- [ ] Al menos 3 coats + 2 accesorios funcionan ocultando/mostrando
- [ ] Idle 60fps estable; one-shots < 3.5 s
- [ ] Archivo < 2 MB ideal (máx 4 MB por especie)
- [ ] Probar en Rive Editor “Share” + en web preview

---

## 9. Cómo lo consume la app

```
assets/juego/rive/gato_base.riv
assets/juego/rive/perro_base.riv
```

Si el archivo existe → motor Rive.  
Si no → `InteractivePet` (GIF + físicas actuales) como fallback.

Cualquier cambio de nombre de input/state **rompe** el bridge: actualizar también `rive.contract.json`.
