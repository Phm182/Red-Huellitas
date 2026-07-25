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

### 2. php.ini — Subir límite de subida para videos (Shorts/Historias)
- **Qué**: `upload_max_filesize` y `post_max_size` están en 40M (default XAMPP). El límite de la app para videos es 60MB, así que hoy PHP corta antes de llegar a la validación propia.
- **Por qué pendiente**: es un cambio de configuración del sistema, no algo que deba tocar por mi cuenta.
- **Pasos**:
  1. Editar `C:\xampp\php\php.ini`.
  2. Subir `upload_max_filesize = 80M` y `post_max_size = 80M`.
  3. Reiniciar Apache desde el panel de XAMPP.
- **Estado**: no ejecutado todavía (confirmado con un test real: un video de 65MB hoy es rechazado por el límite de PHP, no por la validación de la app).

### 3. Limpieza física de Historias vencidas
- **Qué**: los archivos de `uploads/historias/{UserId}/` de historias con `ExpiraEn < NOW()` quedan en disco (la fila de `Historia` sigue existiendo con `Estado='A'`, solo se excluye por query en tiempo de lectura — no hay borrado físico ni de la fila).
- **Por qué pendiente**: no bloquea nada funcional (las historias vencidas nunca se muestran), es limpieza de espacio en disco a futuro.
- **Sugerencia de implementación futura**: script CLI similar a `ingestar_noticias.php` que:
  - Busque `Historia` con `ExpiraEn < NOW() - INTERVAL 7 DAY` (margen de seguridad).
  - Borre el archivo físico (`MediaPath`) y la fila (o la marque `Estado='I'` primero, y borre el archivo en una segunda pasada).
  - Se registraría con `schtasks` igual que la ingesta de noticias (ej. una vez por día).
- **Estado**: no implementado.

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
