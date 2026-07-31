# Lottie assets — HueGotchi

Animaciones **free** descargadas desde [LottieFiles](https://lottiefiles.com/free-animation/)
(Lottie Simple License). Se usan como clips por estado/acción; el fondo de escena
lo pinta `SceneBackdrop` (se eliminaron capas sólidas de fondo de los JSON).

## Estructura

- `gato/` — idle, happy, sad, sit, lie, sleep, feed, play, bath, pet, speak, success, fail
- `perro/` — idem
- `tortuga/` — idle, happy, sleep, play (el resto cae a idle/happy)

Los archivos se obtuvieron vía GraphQL público `graphql.lottiefiles.com`
(`searchPublicAnimations` → `jsonUrl` en `assets-v2.lottiefiles.com`).

Si reemplazás un clip, mantené el nombre de archivo y corré el strip de fondos
(capa `White Solid` / `background` / etc.).
