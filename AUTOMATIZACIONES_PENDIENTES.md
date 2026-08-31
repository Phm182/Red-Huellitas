# Automatizaciones y tareas pendientes (a ejecutar al final del desarrollo)

Este archivo se va completando durante el desarrollo. Cada item indica **qué es**, **por qué no se hizo ya** (normalmente: XAMPP no tiene la infraestructura corriendo, o es un cambio de configuración del sistema que no le corresponde tocar a Claude), y el **comando/paso exacto** para activarlo cuando la app esté lista para producción o para uso diario.

## Servidor local (XAMPP / Windows)

### 1. Tarea programada — Ingesta de Noticias externas
- **Qué**: corre `inc/cli/ingestar_noticias.php` periódicamente para traer noticias de Infobae, La Vanguardia, Ámbito, CNN y NatGeo.
- **Por qué pendiente**: XAMPP no tiene cron; hay que registrar una tarea en el Programador de Tareas de Windows.
- **Comando**:
  ```bash
  schtasks /create /tn "RH_Ingesta_Noticias" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\ingestar_noticias.php\"" /sc hourly /mo 6
  ```
- **Estado**: no ejecutado todavía.

### 2. php.ini — Subir límite de subida para videos (Shorts/Historias) — **HECHO (2026-07-26)**
- **Qué**: `upload_max_filesize` y `post_max_size` estaban en 40M (default XAMPP), por debajo del límite de 60MB de la app (`RH_MAX_VIDEO_BYTES`), así que PHP cortaba antes de llegar a la validación propia.
- **Hecho**: ambos a **80M** en `C:\xampp\php\php.ini` (líneas 701 y 853), con backup en `C:\xampp\php\php.ini.backup-20260726`. Apache reiniciado y verificado sirviendo `upload_max_filesize=80M` / `post_max_size=80M`.
- **Ojo al reiniciar Apache en este XAMPP**: no está instalado como servicio de Windows, así que `httpd -k restart` falla con `AH00436: No installed service named "Apache2.4"`. Hay que `taskkill /F /IM httpd.exe` y volver a lanzar `C:\xampp\apache\bin\httpd.exe` (o usar el panel de XAMPP).

### 3. Limpieza física de Historias vencidas — **SCRIPT LISTO, falta registrar la tarea**
- **Qué**: los archivos de `uploads/historias/{UserId}/` de historias vencidas quedaban en disco para siempre (las historias se ocultan por query, `ExpiraEn > NOW()`, nunca se borran solas).
- **Implementado (2026-07-25)**: `inc/cli/limpiar_historias.php`. Borra archivo + `HistoriaVista` + la fila de las historias vencidas hace más de `RH_HISTORIAS_DIAS_MARGEN` (7) días. Verificado con 5 casos reales: vencida sin denuncia, vencida con denuncia pendiente, vencida con denuncia resuelta, dentro del margen, y vigente.
  - **Una historia con denuncia PENDIENTE no se toca**: el panel de moderación necesita poder ver el contenido para decidir. Se saltea y se limpia sola en la corrida siguiente, una vez resuelta (probado).
  - `Denuncia.HistoriaId` tiene FK contra `Historia`, así que las denuncias **ya resueltas** se desenganchan (`HistoriaId = NULL`) antes de borrar la fila. La denuncia conserva motivo, nota, estado y quién la resolvió.
  - Si un archivo no se puede borrar, **la fila no se borra**: sin la fila se pierde el path y el archivo quedaría huérfano para siempre. Se reintenta en la corrida siguiente.
- **Probar sin borrar nada**:
  ```bash
  C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\limpiar_historias.php" --dry-run
  ```
- **Comando para programarla** (una vez por día de madrugada):
  ```bash
  schtasks /create /tn "RH_Limpiar_Historias" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\limpiar_historias.php\"" /sc daily /st 04:00
  ```
- **Estado**: script hecho y verificado; la tarea programada no se registró (modifica la máquina, es decisión del usuario).

### 5. Tarea programada — Recordatorios del minijuego (Fase 7a)
- **Qué**: corre `inc/cli/juego_recordatorios.php`, que avisa por push a los usuarios cuya mascota del juego tiene los stats bajos ("tu mascota te extraña"). Manda un push por usuario, no uno por mascota, y saltea a quien haya jugado en las últimas 20hs.
- **Por qué pendiente**: registrar una tarea programada modifica la máquina del usuario — es una decisión suya, no algo que deba hacer por mi cuenta.
- **Comando** (una vez por día a las 19:00, que es cuando la gente está en el teléfono):
  ```bash
  schtasks /create /tn "RH_Juego_Recordatorios" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\juego_recordatorios.php\"" /sc daily /st 19:00
  ```
- **Para ver a quién notificaría sin mandar nada** (útil para probar el balance del juego):
  ```bash
  C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_recordatorios.php" --dry-run
  ```
- **Estado**: no ejecutado todavía. Ojo: sin el item 6 de acá abajo, el script corre bien pero no hay tokens a los que mandar.

### 6. Expo — `eas.projectId` para que funcione el push (arrastra desde Fase 4b)
- **Qué**: `src/hooks/usePushNotifications.ts` corta temprano (`if (!projectId) return`) si `app.json` no tiene `extra.eas.projectId`. Sin eso **ningún dispositivo registra su token**, así que `Usuario.ExpoPushToken` siempre queda en NULL y **todo el push del proyecto está inactivo** (campañas, perdidos, match y ahora el minijuego).
- **Estado**: **hecho (2026-08-29)**. `app.json` ya tiene `extra.eas.projectId` (`36791264-d5e8-4e54-a86a-85962eb7eeab`, cuenta `pab182`). El APK instalado en el celular de prueba hasta el 2026-08-30 era anterior a este cambio (`versionCode=1`), así que nunca llegó a registrar un token real — quedaba pendiente el rebuild.

### 6b. FCM V1 — credencial de Firebase para que Android reciba el push de verdad
- **Qué**: desde que Google apagó la API legacy de FCM (mediados de 2024), el servicio de push de Expo necesita que **cada proyecto** suba su propia clave de cuenta de servicio de Firebase (Google Cloud) para poder entregar notificaciones a Android — sin esto, `getExpoPushTokenAsync()` puede devolver un token igual, pero el envío real (`rh_enviar_push()` → `exp.host/--/api/v2/push/send`) no llega al dispositivo aunque la request a Expo devuelva 200.
- **Por qué pendiente**: no hay ningún `google-services.json` ni proyecto de Firebase en el repo — nunca se creó. Es un paso que sólo puede hacer el dueño de la cuenta de Google/Firebase, y la subida de la clave a EAS es interactiva (`eas credentials`, menú TUI), no scripteable sin acceso a una terminal real.
- **Pasos**:
  1. Crear (o reusar) un proyecto en [Firebase Console](https://console.firebase.google.com/), agregar una app Android con el package `com.redhuellitas.app`.
  2. En ese proyecto de Firebase → Configuración del proyecto → Cuentas de servicio → generar una clave privada nueva para "Firebase Admin SDK" (rol con permiso de FCM). Se descarga un `.json`.
  3. Desde `app-movil/`: `npx eas credentials` → Android → seleccionar el build profile → "Push Notifications: Manage your FCM API Key" → subir ese `.json`.
  4. Verificar con una push real (ver item 6c) que llega a la barra de notificaciones de Android.
- **Estado**: no ejecutado. Es el único paso que falta para que el push llegue de verdad al dispositivo.

### 6c. Rebuild + instalación del APK con el `projectId` correcto
- **Qué**: el APK que había en el celular de prueba (`versionCode=1`) es anterior al `eas.projectId`, así que nunca pudo registrar un token real. Se lanzó un build nuevo (profile `apk`) el 2026-08-31 para volver a instalar y probar.
- **Estado**: en curso / a verificar en la próxima sesión si no quedó confirmado en esta.

### 7. Tarea programada — Turnos vencidos de HuePlay (Damas y los juegos de turnos que vengan)
- **Qué**: corre `inc/cli/juego_turnos_vencidos.php`, que cierra por inacción los desafíos por turnos (Damas, HueConecta) cuyo plazo de respuesta venció — pierde quien tenía el turno y no jugó a tiempo. El mismo resultado ya se resuelve solo, de forma perezosa, cuando cualquiera de los dos abre la bandeja de desafíos; este cron cubre a quien no vuelve a abrir la app, para que la notificación de "perdiste por no responder" le llegue igual.
- **Por qué pendiente**: registrar una tarea programada modifica la máquina del usuario — es una decisión suya, no algo que deba hacer por mi cuenta.
- **Comando** (cada 15 minutos — el plazo mínimo configurable por duelo es 1 hora, así que un cron más espaciado dejaría a alguien casi un día entero sin saber que perdió):
  ```bash
  schtasks /create /tn "RH_Juego_Turnos_Vencidos" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turnos_vencidos.php\"" /sc minute /mo 15
  ```
- **Para ver qué resolvería sin tocar nada**:
  ```bash
  C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\juego_turnos_vencidos.php" --dry-run
  ```
- **Estado**: script hecho y verificado (creación con plazo corto, vencimiento forzado a mano, resolución real confirmada); la tarea programada no se registró.

### 8. Tarea programada — Turnos vencidos de salas de HuePlay (HueLudo y los juegos de sala que vengan)
- **Qué**: corre `inc/cli/salas_turnos_vencidos.php`, hermano del item 7 pero para salas de hasta 4 jugadores (`JuegoSala`) en vez de duelos 1 contra 1. Aplica la política de abandono de cada sala (la IA toma el asiento, se lo saltea, o se lo expulsa) y, si es 'ia', juega en cadena los turnos de IA que correspondan. También se resuelve solo, de forma perezosa, al abrir la bandeja de salas o una sala puntual; este cron cubre a quien no vuelve a abrir la app.
- **Por qué pendiente**: registrar una tarea programada modifica la máquina del usuario — es una decisión suya, no algo que deba hacer por mi cuenta.
- **Comando** (cada 15 minutos, mismo criterio que el item 7):
  ```bash
  schtasks /create /tn "RH_Salas_Turnos_Vencidos" /tr "C:\xampp\php\php.exe \"C:\xampp\htdocs\Red Huellitas\inc\cli\salas_turnos_vencidos.php\"" /sc minute /mo 15
  ```
- **Para ver qué resolvería sin tocar nada**:
  ```bash
  C:\xampp\php\php.exe "C:\xampp\htdocs\Red Huellitas\inc\cli\salas_turnos_vencidos.php" --dry-run
  ```
- **Estado**: script hecho; falta la verificación end-to-end (queda para cuando HueLudo esté completo) y la tarea programada no se registró.

### 9. Build de iOS — no se pudo hacer esta noche (2026-08-08)
- **Qué**: se pidió compilar un instalador de iOS junto con el APK de Android. No hay Mac con Xcode en esta máquina (Windows), así que la única forma de compilar para iOS acá es el build en la nube de EAS (`eas build --platform ios`).
- **Por qué pendiente**: `eas whoami` devuelve "Not logged in" — EAS Build necesita loguearse con la cuenta de Expo del usuario, y eso es un login interactivo (browser/credenciales) que no puedo hacer por mi cuenta. Tampoco hay carpeta `ios/` generada nunca ni perfiles de iOS en `eas.json` (ya los agregué, ver abajo).
- **Ya preparado**: `app-movil/app.json` ya tiene `ios.bundleIdentifier` (`com.redhuellitas.app`). `app-movil/eas.json` ahora tiene dos perfiles nuevos:
  - `ios-simulator`: genera un `.app` para el Simulador de iOS — **no necesita cuenta de Apple Developer**, sólo estar logueado en EAS. Sirve para probar la app sin gastar nada.
  - `ios-preview`: genera un `.ipa` instalable en un iPhone/iPad real — **sí necesita** una cuenta de Apple Developer Program (paga, ~99 USD/año) para firmar el build; EAS pide las credenciales de Apple la primera vez y las gestiona solo de ahí en adelante.
- **Pasos exactos para terminarlo**:
  1. `cd app-movil && npx eas-cli login` (una sola vez, pide usuario/contraseña de Expo — se puede crear una cuenta gratis en [expo.dev](https://expo.dev) si no hay).
  2. Si todavía no existe (ver item 6 más arriba, `eas.projectId`): `npx eas-cli init` — deja el proyecto asociado a la cuenta.
  3. Para el simulador (sin costo, sin cuenta de Apple): `npx eas-cli build --platform ios --profile ios-simulator`.
  4. Para un iPhone real (necesita Apple Developer Program activo): `npx eas-cli build --platform ios --profile ios-preview` — EAS va a pedir loguearse con el Apple ID la primera vez y arma los certificados/perfiles de aprovisionamiento solo.
  5. El build corre en la nube de Expo (tarda ~15-25 min) y al terminar da un link para descargar el `.app`/`.ipa` y (para el simulador) instrucciones para arrastrarlo al Simulator, o (para dispositivo real) un QR para instalarlo directo si el dispositivo está registrado.
- **Estado**: nada de esto se pudo ejecutar — necesita que el usuario haga el login una vez. Todo lo demás (bundle identifier, perfiles de build) ya está listo.

### 10. `android/gradle.properties` — el heap de Gradle se resetea con cada `expo prebuild`
- **Qué**: `app-movil/android/` está en `.gitignore` (línea `/android` de `app-movil/.gitignore`) porque Expo lo regenera desde cero con `npx expo prebuild`. Eso significa que cualquier edición manual a `android/gradle.properties` **se pierde** la próxima vez que se corra prebuild (limpieza de caché, `eas build` local, etc.).
- **Por qué importa**: `org.gradle.jvmargs` viene por defecto en `-Xmx2048m -XX:MaxMetaspaceSize=512m`, y con eso R8 revienta con `OutOfMemoryError: Java heap space` en cuanto corre en frío (no cacheado) sobre un build release real — pasó la noche del 2026-08-29 armando el APK de prueba en el celular. El fix fue subirlo a `-Xmx6144m -XX:MaxMetaspaceSize=1024m` (la PC tiene ~40GB de RAM, sobra margen).
- **Cómo evitar perderlo**: si se vuelve a generar `android/` desde cero, reaplicar a mano esa línea en `android/gradle.properties` antes de compilar en release. Ideal a futuro: mover esto a un config plugin de Expo (`expo-build-properties` no trae un campo directo para `gradle.properties`; haría falta un plugin propio en `app.json` que lo parchee post-prebuild) para que sobreviva la regeneración — no se hizo todavía porque no es urgente mientras el build de referencia (EAS Cloud) tiene su propio heap y no pega este error.

### 11. Migración `sql/054_hueplay_plazo_minutos.sql` — **HECHA en producción (2026-08-30)**
- **Qué**: `PlazoTurnoHoras` (horas enteras 1-24) pasó a `PlazoTurnoMinutos` (3 min a 7 días) en `JuegoDesafio` y `JuegoSala`, para que el plazo por turno se pueda elegir en minutos/horas/días y no sólo en horas cerradas. Ya corrida y verificada en local (build/verify del schema OK, probado de punta a punta con un desafío y una sala reales).
- **Por qué importa**: si se hace deploy del código nuevo sin correr esta migración antes, `desafio_crear.php`/`sala_crear.php` van a fallar el INSERT (columna `PlazoTurnoMinutos` inexistente).
- **Qué hacer**: correr `sql/054_hueplay_plazo_minutos.sql` contra la base de producción ANTES o junto con el deploy de este código. Es idempotente (se puede correr de nuevo sin romper nada) y no toca partidas en curso — sólo convierte el valor de configuración, no los vencimientos ya calculados.

### 12. Notificaciones de "te toca jugar" — nuevas, revisar volumen
- **Qué**: `rh_juego_avanzar_turno()` y `rh_sala_avanzar_turno()` ahora mandan una notificación (push + campanita) cada vez que le pasa el turno a alguien, en duelos 1v1 y en salas. Antes esto no avisaba nada — el usuario tenía que volver a abrir la app para enterarse.
- **Por qué importa**: en partidas rápidas (con los plazos nuevos de 3-5-10 min) esto puede generar bastantes notificaciones seguidas si dos personas están jugando rápido. No se puso ningún throttling — vale la pena mirar en producción si hace falta agrupar/limitar.

## Antes de ir a producción (no urgente en desarrollo local)

### 4. Revisar límites de `php.ini` para producción
- Los límites de tamaño (40M actuales, 80M sugeridos arriba) son válidos para XAMPP local. En el hosting real de producción hay que confirmar los límites del proveedor (algunos paneles compartidos limitan `post_max_size` mucho más bajo, ej. 32M o 20M) y ajustar el límite de video de la app (`RH_MAX_VIDEO_BYTES` en `inc/funciones/validacion.php`) si hace falta bajarlo para que coincida.
