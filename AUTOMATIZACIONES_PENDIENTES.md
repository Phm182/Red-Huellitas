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
- **Qué**: `src/hooks/usePushNotifications.ts` corta temprano (`if (!projectId) return`) porque `app.json` no tiene `extra.eas.projectId`. Sin eso **ningún dispositivo registra su token**, así que `Usuario.ExpoPushToken` siempre queda en NULL y **todo el push del proyecto está inactivo** (campañas, perdidos, match y ahora el minijuego).
- **Por qué pendiente**: el projectId lo genera EAS contra una cuenta de Expo del usuario. No es un valor que se pueda inventar — poner uno falso es peor que no tenerlo, porque saltea el guard del hook y hace fallar `getExpoPushTokenAsync`.
- **Pasos**:
  1. Crear cuenta en [expo.dev](https://expo.dev) si no hay.
  2. Desde `app-movil/`: `npx eas init` — escribe `extra.eas.projectId` en `app.json` automáticamente.
  3. Para probar de verdad hace falta un build de EAS en un dispositivo físico: el push **no funciona en web ni en Expo Go**.
- **Estado**: no ejecutado. Es la razón por la que el push nunca se pudo verificar end-to-end en ninguna fase.

## Antes de ir a producción (no urgente en desarrollo local)

### 4. Revisar límites de `php.ini` para producción
- Los límites de tamaño (40M actuales, 80M sugeridos arriba) son válidos para XAMPP local. En el hosting real de producción hay que confirmar los límites del proveedor (algunos paneles compartidos limitan `post_max_size` mucho más bajo, ej. 32M o 20M) y ajustar el límite de video de la app (`RH_MAX_VIDEO_BYTES` en `inc/funciones/validacion.php`) si hace falta bajarlo para que coincida.
