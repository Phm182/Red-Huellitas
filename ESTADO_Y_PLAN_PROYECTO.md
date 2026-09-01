# Red Huellitas — Estado del proyecto y plan de fases

> Este archivo es el punto de partida para retomar el desarrollo en cualquier máquina. Resume qué se construyó, cómo se trabajó, y qué queda por hacer. Pegalo como primer mensaje de la conversación nueva (o decile a Claude "leé ESTADO_Y_PLAN_PROYECTO.md") para que tenga contexto completo sin tener que releer todo el historial.

**Última actualización**: 2026-07-25. 🎉 **Las 7 fases están completas y verificadas.** El desarrollo de la spec original terminó.

Lo que queda son **3 pasos de activación que dependen de vos**, ninguno bloquea el uso local (todo degrada solo si falta):
1. **API key de Gemini** → habilita el avatar IA del minijuego. [Google AI Studio](https://aistudio.google.com), gratis y sin tarjeta. Se pega en `inc/config/gemini.local.php`.
2. **`npx eas init`** → habilita el push en todo el proyecto (campañas, perdidos, match, minijuego). Hoy está inactivo desde Fase 4b.
3. **Registrar los 2 `schtasks`** (ingesta de noticias y recordatorios del juego). Ver `AUTOMATIZACIONES_PENDIENTES.md`.

Además, cuando tengas casilla propia de email, cambiar el remitente en `inc/config/email.local.php` (hoy sale desde la de Contapp).

> ⚠️ **En una máquina nueva hace falta `composer install`** en la raíz — desde Fase 6d el backend usa dompdf y PHPMailer. Sin `vendor/` la app funciona igual, pero los comprobantes y los emails responden 503.
>
> ⚠️ **`inc/funciones/bd.php` está gitignoreado** (tiene las credenciales de la DB), así que en una máquina nueva hay que crearlo a mano. Importante: además de la conexión, ese archivo fija **la zona horaria de MySQL y de PHP** (`-03:00` / `America/Argentina/Buenos_Aires`) — si falta la línea de PHP, vuelve el bug de desfasaje descrito en Fase 7a.

---

## 1. Qué es esto

Red Huellitas es una plataforma social/adopción/marketplace para mascotas: app React Native (Expo Router, corre en web + Android + iOS) con backend PHP 8 REST y MySQL. Se construye en **7 fases** según una especificación maestra que el usuario dio al inicio del proyecto.

**Stack**:
- **Frontend**: Expo Router (`app-movil/`), TypeScript, i18n con 10 idiomas (es/en/pt/fr/de/it/zh/ja/ko/ru).
- **Backend**: PHP 8 plano sobre XAMPP (`inc/ajax/**/*.php` por módulo, sin framework), mysqli con prepared statements en todos lados.
- **DB**: MySQL, nombre de base **`huellitas`** (¡no "red_huellitas"!), charset `utf8mb4_unicode_ci`, timezone `-03:00`.
- **Nota de interoperabilidad**: para Fase 6 (E-Commerce) hay que poder interoperar con `C:\xampp\htdocs\Contapp\Documentacion\contapp_schema_final.md` (esquema de productos/servicios/facturas de otro proyecto del usuario).

**Expo cambió mucho de versión** — antes de tocar código de `app-movil/`, leer `app-movil/AGENTS.md`, que apunta a la doc versionada exacta (`https://docs.expo.dev/versions/v57.0.0/`).

---

## 2. Cómo se trabajó (metodología — seguir igual en las fases que faltan)

Esto es más importante que el detalle de cada fase: es el "cómo" que el usuario espera que se repita.

1. **Una sub-parte a la vez.** Fases grandes (3 y 4) se partieron en sub-módulos (ej. 4.1 Adopción, 4.2 Campañas, ... 4.6 Veterinarias) y cada uno se hizo de punta a punta antes de arrancar el siguiente.
2. **Plan mode completo antes de codear**: explorar el código existente → identificar decisiones de diseño ambiguas → preguntar con `AskUserQuestion` (nunca asumir alcance en los puntos realmente ambiguos; sí decidir sin preguntar en detalles de bajo impacto como nombres de campos o carpetas, siguiendo el patrón ya establecido) → escribir el plan → `ExitPlanMode` → recién ahí implementar.
3. **No avanzar de fase sin pedido explícito del usuario.** Ni siquiera cuando la spec original decía "avanzá automático sin parar" — el usuario prefirió confirmar fase por fase, y esa preferencia manda sobre la spec original.
4. **Implementación completa por sub-parte**: SQL → helpers PHP → endpoints → frontend (tipos, api client, pantallas, i18n en los 10 idiomas) → testing.
5. **Testing en dos capas, siempre antes de dar por cerrada una parte**:
   - **curl** contra los endpoints PHP: casos válidos, casos de error (401 sin auth, 403 sin verificar/no-dueño, 404 en inexistentes, validaciones de campos), y cualquier lógica especial (ej. filtro geográfico con registros a distancias conocidas).
   - **Browser preview** (Expo web) para los flujos de UI reales: capturas de pantalla, clicks reales, no alcanza con que compile.
6. **Limpiar datos de prueba siempre** al terminar de verificar (usuarios de test, posts, filas de prueba, archivos subidos) — no dejar basura en la base local.
7. **Memoria persistente**: hay un sistema de memoria en `C:\Users\Pab\.claude\projects\C--xampp-htdocs-Red-Huellitas\memory\` (no viaja con el repo, es local a esta máquina) con gotchas del entorno, el estado de fases, y cómo le gusta trabajar al usuario. En una máquina nueva esa memoria no va a estar — por eso este archivo existe, para no perder el contexto importante.

Ver la sección 6 (Gotchas del entorno) para los detalles técnicos repetibles que costó descubrir.

---

## 3. Las 7 fases — resumen y estado

### ✅ Fase 1 — Setup inicial & Auth (COMPLETA)
Theme provider, i18n, logos, login + Google, onboarding (username/zona), verificación DNI+selfie, WhatsApp, reportes/solicitudes, cláusula anti-criaderos + denuncia.

### ✅ Fase 2 — Perfiles & Mis Mascotas (COMPLETA)
Buscador (usuarios+razas), perfil de usuario, alta de mascotas (hasta 6 fotos, carnet de vacunas, toggle "Disponible para Match").

### ✅ Fase 3 — Módulo Social (COMPLETA, confirmada por el usuario que no falta nada)
- Noticias: portal externo (ingesta de 5 fuentes: Infobae, La Vanguardia, Ámbito, CNN, NatGeo) + tabs por tipo de usuario.
- Publicaciones: feed + reacciones + compartir.
- Shorts & Historias: video efímero/vertical.

### ✅ Fase 4 — Auxilio, Comunidad & Adopción (COMPLETA — las 6 sub-partes)
Se hizo igual que Fase 3: por partes, cada una con su propio plan/implementación/testing.

- **4.1 Adopción**: formulario dinámico de postulación (preguntas custom del rescatista: texto/sí-no/opción múltiple) + contacto WhatsApp + Favoritos.
- **4.2 Campañas** (castración/vacunación territorial): cualquier verificado publica, fecha única o rango, inscripción con cupo opcional, ubicación GPS del evento, difusión doble (botón Compartir nativo + push real vía `expo-notifications` a usuarios en radio de 5km con fórmula haversine en SQL). *Limitación aceptada: la recepción real del push no se puede verificar en este entorno (necesita dispositivo físico + proyecto EAS, que este repo no tiene configurado).*
- **4.3 Perdidos & Reencontrados**: cubre "perdido" (con opción de vincular una Mascota ya registrada o cargar manual) y "encontrado" (siempre manual). Reposteo automático a Social al marcar "reencontrado". Difusión por push a 5km con **opt-out**: `Usuario.NotificarProximidad` (default ON, configurable en Ajustes) — este toggle también aplica retroactivamente a Campañas. Contacto solo WhatsApp, sin sistema de avistamientos.
- **4.4 Tránsito**: dos tipos, "necesito tránsito" (animal propio o rescatado que necesita alojamiento temporal, vincula Mascota o carga manual) y "ofrezco tránsito" (alguien ofrece hospedar). Acá se construyó el **primer filtro geográfico real** del proyecto: radio 20/50/100km o "Todos" contra la zona del usuario que mira, con haversine — este patrón se reusó tal cual en Donaciones y Veterinarias.
- **4.5 Donaciones**: mismo patrón dual "necesito"/"ofrezco" que Tránsito pero sobre un ítem (nunca vincula Mascota). Categoría obligatoria (`alimento`/`insumo`) + descripción libre + especie opcional. Mismo filtro geográfico + filtro de categoría.
- **4.6 Veterinarias cercanas**: directorio público simple — la veterinaria no tiene cuenta propia en la app, solo el usuario verificado que la carga queda como "dueño" del listado (puede editar/eliminar). Sin dualidad tipo/categoría, sin vínculo a Mascota. Contacto (`Telefono`/`WhatsappNumero`/`Horario`) vive directo en la tabla `Veterinaria`. Mismo filtro geográfico de radio. Botón "Llamar" (`tel:`) además del de WhatsApp.

**Patrón repetido en toda la Fase 4** ("factory" de sub-módulos, útil para Fase 5+): SQL con ALTERs guardados (columna → índice → FK, chequeando `INFORMATION_SCHEMA` antes de aplicar, para que la migración sea idempotente) → helper PHP serializador (`rh_<modulo>_publico()`) → endpoints CRUD (`crear/listar/obtener/eliminar.php`) → extensión de `Denuncia` con un nuevo `<Modulo>Id` nullable (cadena polimórfica: `PostId → HistoriaId → AdopcionId → CampaniaId → PerdidoId → TransitoId → DonacionId → VeterinariaId`) → tipos TypeScript + api client + pantallas (`index/nueva/[id].tsx`) → i18n en los 10 idiomas → curl sweep → browser verification → limpieza.

### ✅ Fase 5 — Match de Mascotas (COMPLETA, 2026-07-24)
Swipe tipo Tinder **mascota a mascota** (no a nivel usuario): el usuario elige con cuál de sus propias mascotas "Disponible para Match" swipea (si tiene más de una), contra el pool de mascotas ajenas también disponibles. Botones tap ❌/❤️ (no gesto — no hay libs de gestos en el proyecto). Filtros: especie (default = especie de la mascota propia elegida), raza (`RazaPicker` reusado), sexo, edad por bucket (Cachorro/Joven/Adulto/Senior), y el mismo filtro geográfico de radio 20/50/100/Sin límite de Tránsito-Donaciones-Veterinarias — con la diferencia de que acá **siempre** se ordena por distancia, incluso sin radio (no hay modo "cronológico" como en los demás módulos).

Al haber match mutuo (ambas mascotas se gustaron) se abre un **chat interno nuevo** — la primera mensajería 1:1 de todo el proyecto (antes todo contacto era WhatsApp deep-link). Sin WebSockets: polling simple (`setInterval` cada 5s mientras la pantalla está en foco). Dentro del chat hay un botón "Revelar WhatsApp" de **consentimiento mutuo explícito**: el número solo se muestra cuando ambos lados lo piden (tabla `MatchWhatsappConsentimiento`), y ese consentimiento explícito pisa a propósito `Usuario.WhatsappVisibilidad='privada'`. `Denuncia` no se tocó — denunciar desde el chat usa el caso base ya soportado (solo `userId`, sin id de contenido nuevo).

Tablas nuevas: `MascotaMatchSwipe`, `MascotaMatch`, `MatchMensaje`, `MatchWhatsappConsentimiento` (`sql/012_fase5_match.sql`). Endpoints en `inc/ajax/match/`: `candidatos.php`, `swipe.php`, `mis_matches.php`, `conversacion_mensajes.php`, `mensaje_enviar.php`, `whatsapp_revelar.php`, `deshacer.php`.

**Bugs reales encontrados y corregidos durante la verificación** (quedan documentados por si algo similar reaparece):
1. `mis_matches.php` fallaba con `Reference 'UltimaActividad' not supported (reference to group function)` — MariaDB no permite referenciar el alias de una función agregada (`MAX(...) AS X`) dentro de otra función (`COALESCE(X, ...)`) en `ORDER BY`. Fix: repetir `MAX(MatchMensaje.CreatedAt)` completo dentro del `COALESCE` en vez de usar el alias.
2. El botón "Contactar por WhatsApp" quedaba muerto (sin abrir nada) si se reabría un chat que ya tenía el WhatsApp revelado de una sesión anterior — el número solo se guardaba en estado local en el momento exacto de revelar, nunca se recargaba al abrir un match ya revelado. Fix en `match/[matchId].tsx`: si `whatsappRevelado=true` al cargar, volver a pedir `whatsapp_revelar.php` (es idempotente) para poblar el número.
3. **Gotcha de entorno nuevo**: dos tabs del browser preview apuntando al mismo origen (`localhost:8081`) comparten el mismo `localStorage` — no se puede simular 2 sesiones reales con 2 tabs, el segundo `setItem` pisa al primero silenciosamente. Para probar flujos bilaterales (como el match mutuo), se usó 1 tab real con clicks genuinos para un lado, y `fetch()` directo con el token del otro usuario (mismo patrón que el gotcha de `Alert.alert`) para simular las acciones del otro lado.

### ✅ Fase 6 — E-Commerce PetShop/PetServices (COMPLETA — 6a, 6b, 6c y 6d)
Replicar esquema de `contapp_schema_final.md` (otro proyecto del usuario, mismo stack PHP+mysqli). Comprar/Vender C2C con carrito, retención de pago (0% con suscripción activa del vendedor, 10% sin ella), suscripción mensual para vitrina comercial, comprobantes PDF por mail, Mis Compras/Mis Ventas, Favoritos. Se está partiendo en sub-partes, mismo criterio que Fase 3/4.

**✅ 6a — Suscripción "Vitrina Comercial" (completa, 2026-07-24)**: pago dual **Manual + Mercado Pago**, replicando fielmente el mecanismo real que usa Contapp (no una integración inventada):
- **Mercado Pago**: Preapproval API vía **cURL crudo, sin SDK** (`inc/funciones/mercadopago.php`), credenciales en `inc/config/mercadopago.local.php` (mismo patrón `is_file()`+`require` que ya existe para Google en `google.local.php`). Endpoints: `mp_preapproval_crear.php`, `mp_webhook.php` (notificaciones, siempre re-consulta contra la API real, nunca confía en el payload del POST), `mp_resync.php` (el front lo llama al volver del checkout porque los webhooks de MP no llegan a `localhost`).
- **Manual**: `manual_solicitar.php` (arma link `wa.me` prellenado) → humano coordina el pago fuera de la app → `manual_confirmar.php`, gateado por `Usuario.Rol === 'admin'` — **primer uso real de la columna `Rol`** en todo el proyecto (existía desde Fase 1 pero nunca se leía en ningún lado). Sin panel de admin propio, el endpoint es curl-testable.
- Lógica compartida `rh_suscripcion_aplicar_pago()` extiende el período desde el vencimiento vigente (no desde hoy, no pierde días pagos ya cubiertos), idempotente vía `MpPaymentId` (una notificación duplicada de MP no genera un período extra).
- **Limitación aceptada explícitamente por el usuario**: sin credenciales TEST de Mercado Pago en este entorno, la llamada real a la API (`api.mercadopago.com`) no se pudo verificar de punta a punta — el flujo manual sí quedó 100% verificado con curl+browser. Cuando haya credenciales reales, copiar `inc/config/mercadopago.local.php.example` a `mercadopago.local.php` y completar `MP_ACCESS_TOKEN`/`MP_PUBLIC_KEY`/`MP_BACK_URL`/`SOPORTE_WHATSAPP`.
- Helper reusable para las siguientes sub-partes: `rh_usuario_tiene_suscripcion_activa($conn, $userId)` en `inc/funciones/suscripcion.php` — es la base de la retención 0%/10% que viene en 6c.

**✅ 6b — Catálogo C2C de Producto/Servicio (completa, 2026-07-24)**: publicación simple (sin duplicidad necesito/ofrezco, sin el inventario multi-sucursal de Contapp — decisión tomada explícitamente) — tabla `Producto` con `TipoListado ENUM('producto','servicio')`, `ProductoCategoriaCatalogo` (catálogo plano de 10 categorías mixtas, mismo shape que `TipoUsuarioCatalogo`), `Precio DECIMAL(10,2)` simple sin columna de moneda (implícito ARS, mismo precedente que `SuscripcionPlan.MontoMensual`). Contacto vía WhatsApp con JOIN a `Usuario` (igual que Donaciones — el vendedor es un Usuario de la app, a diferencia de Veterinarias). Mismo filtro geográfico de radio 20/50/100/Todos que Tránsito/Donaciones/Veterinarias/Match. Favoritos (`ProductoFavorito`) incluidos acá, mismo patrón idempotente que `AdopcionFavorito`. `Denuncia` extendida con `ProductoId` (último de la cadena polimórfica, `bind_param 'iiiiiiiiiiiss'`, 11 ints + 2 strings). Endpoints en `inc/ajax/productos/`: `categorias.php`, `crear.php`, `listar.php`, `obtener.php`, `eliminar.php`, `favorito_agregar.php`, `favorito_quitar.php`, `mis_favoritos.php`. **Sin carrito, sin compra en la app, sin comisión todavía** — el contacto para concretar la venta sigue siendo WhatsApp, igual que el resto de módulos C2C del proyecto.

**✅ 6c — Carrito + Pedido + Comisión real vía Mercado Pago Marketplace (completa, 2026-07-24)**: el usuario **descartó explícitamente** la opción simplificada de "solo dejar registrada la comisión" y pidió integración real de Mercado Pago, más un botón **"Cambiar cuenta"** por si el navegador quedó logueado con la cuenta equivocada (inspirado en la vinculación de cuentas externas de `tiendas-online.php` de Contapp, y en su propio "Cambiar cuenta de Mercado Pago" de `configuracion_metodo_pago.php`).
- **Vinculación del vendedor (OAuth real)**: `UsuarioMpCuenta` (1 cuenta MP por usuario) + `UsuarioMpOauthPendiente` (tabla de `state` de un solo uso, protección CSRF — más simple que el mecanismo sesión+cookie firmada de Contapp porque acá no hay multi-empresa). Endpoints en `inc/ajax/mp/`: `vendedor_estado.php`, `vendedor_conectar.php`, `vendedor_oauth_callback.php` (público, único endpoint de la fase que devuelve HTML en vez de JSON — es un redirect de navegador, no un fetch), `vendedor_desconectar.php`. "Cambiar cuenta" = desconectar + volver a pedir la URL de autorización.
- **Dos juegos de credenciales MP conviven** en `mercadopago.local.php`: las simples de 6a (`MP_ACCESS_TOKEN`, cuenta propia de la plataforma, para cobrar la suscripción) y las de **app Marketplace** (`MP_CLIENT_ID`/`MP_CLIENT_SECRET`/`MP_MARKETPLACE_REDIRECT_URI`) que son las que habilitan el OAuth de vendedores. `rh_mp_oauth_token_request()` es un helper aparte porque `/oauth/token` **no** usa `Authorization: Bearer` (client_id/secret van en el body) — rutearlo por `rh_mp_api_request()` habría fallado con 503 si el token de suscripción estaba vacío aunque las credenciales de Marketplace estuvieran bien.
- **Carrito → Pedidos**: `Carrito`/`CarritoItem` persistente y multi-vendedor; al hacer checkout **se separa automáticamente en un `Pedido` por vendedor**, y la comisión se calcula por separado para cada uno según la suscripción de **ese** vendedor (`rh_pedido_calcular_comision()`: 0% con suscripción activa, 10% sin ella). `PedidoItem` guarda snapshot de `NombreProducto`+`PrecioUnitario` (el producto puede editarse o borrarse después sin alterar pedidos históricos, mismo criterio que `FacturasDetalles` de Contapp). El checkout descuenta stock y desactiva (`Estado='I'`) el producto que llega a 0.
- **Pago real**: la preferencia se crea con el **access token del vendedor** (no el de la plataforma) e incluye `marketplace_fee` = la comisión retenida, con `external_reference = "rh:pedido:{id}"`. `mp_webhook.php` (de 6a) se extendió para reconocer esa referencia y marcar el Pedido como `pagado`.
- **Degradación con gracia (clave)**: si el vendedor no vinculó MP, o la llamada real falla, o MP no está configurado, el Pedido **igual se crea** con la comisión calculada pero en `MetodoPago='coordinar'`/`Estado='coordinando'`, y comprador+vendedor coordinan por WhatsApp igual que en todos los demás módulos C2C. **La compra nunca se bloquea por la ausencia de la integración de pago.**
- Endpoints: `inc/ajax/carrito/` (`agregar`, `ver`, `actualizar_cantidad`, `quitar`, `vaciar`, `checkout`) e `inc/ajax/pedidos/` (`mis_compras`, `mis_ventas`, `marcar_entregado` — solo el vendedor dueño, solo desde `coordinando`/`pagado`).
- **Limitación aceptada** (mismo criterio que 6a): el intercambio OAuth real contra `auth.mercadopago.com` y la creación de preferencias con `marketplace_fee` no se pueden verificar sin registrar la app como **Marketplace** en el panel de MP y tener un `redirect_uri` público **HTTPS** (MP no acepta `localhost`). Todo el código está escrito fiel a la API real; lo verificado end-to-end es el manejo de "no configurado" y toda la lógica de negocio.
- **Bug real encontrado y corregido en la verificación**: `rh_carrito_publico()` hacía `SELECT CarritoItem.Cantidad, Producto.*` — y `Producto.Cantidad` (el stock) pisaba a la cantidad del carrito en el array asociativo de mysqli, así que el carrito mostraba el stock del producto en vez de lo que el comprador llevaba. Corregido aliasando a `CarritoCantidad`.

**✅ 6d — Comprobantes PDF + email + historial completo (completa, 2026-07-24)**. Con esto **Fase 6 queda terminada**.
- **⚠️ Este es el primer punto del proyecto que usa composer.** Hasta acá todo se hizo sin dependencias a propósito (Google Auth y Mercado Pago con cURL crudo, sin SDK). En 6d se sumaron `dompdf/dompdf ^3.1` y `phpmailer/phpmailer ^6.9`, porque generar un PDF y hablar SMTP a mano no tiene sentido. **Hay que correr `composer install` en cualquier máquina nueva.** El código está escrito para degradar solo: `rh_vendor_autoload()` devuelve null si falta `vendor/`, y entonces los endpoints de comprobante/email responden **503** en vez de romper — verificado moviendo `vendor/` y confirmando que el resto de la app sigue andando igual.
- **También se creó el `.gitignore`, que no existía** (`/vendor/`, `inc/config/*.local.php`, `inc/storage/`, `uploads/`, `node_modules/`). Sin esto, el primer commit se llevaría las credenciales y las dependencias.
- **PDF generado en el servidor con dompdf**, no en el cliente. Contapp lo hace al revés (jsPDF en el navegador y sube el binario por POST); ese patrón se descartó explícitamente: no permite mandar el comprobante desde un webhook (en Contapp eso derivó en un `tmp/mail_cache/` que quedó como código muerto), no valida el archivo recibido, y el layout en coordenadas milimétricas es inmantenible. Acá: `inc/funciones/comprobante.php` + template HTML/CSS en `inc/templates/comprobante.php`, con `isRemoteEnabled(false)` (el logo va embebido en base64), `defaultFont: DejaVu Sans` (sin eso las tildes y la ñ salen rotas) y `htmlspecialchars()` en todo el texto que viene de la DB. **Dos copias distintas**: la del vendedor incluye el desglose de comisión, la del comprador no.
- **Email por SMTP** (`inc/funciones/email.php`, PHPMailer). **PROVISORIO: usa la casilla de Contapp** (`soporte@cont-app.com` en Hostinger) porque Red Huellitas todavía no tiene la suya. **Para cambiar el remitente: `inc/config/email.local.php`, claves `MAIL_FROM`/`MAIL_NAME` (lo que ve el destinatario) y `SMTP_*` (el servidor que los manda). Es el único lugar donde vive eso.** Hay un `.example` al lado con las claves vacías. A diferencia de Mercado Pago, **el envío se verificó de verdad end-to-end**: llegan los mails con el PDF adjunto.
- **Descarga del PDF con token de un solo uso** (`PedidoComprobanteToken`, mismo patrón que `UsuarioMpOauthPendiente` de 6c). Existe porque `Linking.openURL()` —la forma en que la app abre archivos, en web y en nativo— no puede mandar el header `Authorization`, y meter el token de sesión en la query string lo dejaría en el historial y en los logs de Apache. El token vence a los 10 minutos, se borra al usarse, y los huérfanos se limpian al pedir uno nuevo.
- **Historial completo**: nueva pantalla de detalle (`app/(app)/pedidos/[id].tsx`), filtro por estado con chips y paginación por cursor (mismo patrón que `productos/listar.php`). Las dos listas ahora comparten `src/components/PedidosLista.tsx`. `rh_pedido_publico()` suma `comprador`, `numeroComprobante` y `comprobanteEnviadoEn` — antes no devolvía datos del comprador y por eso "Mis Ventas" mostraba un literal sin nombre. El N+1 de usuarios se resolvió con una query `IN (...)` más cache por request.
- **Dos bugs encontrados y corregidos en la verificación**: la URL del comprobante salía con el espacio de "Red Huellitas" sin encodear (inusable — se arregló encodeando segmento por segmento), y en el template los encabezados numéricos quedaban alineados a la izquierda mientras sus valores iban a la derecha, porque `table.items th` le ganaba en especificidad a `.num`.

**Conexión con Fase 4.6**: las veterinarias que quieran ofrecer catálogo de servicios pago necesitan esta misma suscripción — ese enganche se resuelve reusando `rh_usuario_tiene_suscripcion_activa()`, no hace falta nada nuevo del lado de Suscripción.

### ✅ Fase 7 — Minijuego "Pet Society" (COMPLETA — 7a el juego, 7b el avatar IA)

**El concepto cambió respecto de la spec original.** La spec hablaba de "avatar 2D por AI Vision + canvas 2D con otras mascotas de la red"; el usuario lo redefinió como **un Tamagotchi donde cuidás a tu propia mascota** ya registrada en la app. Eso es lo que se construyó.

**✅ 7a — El juego (completa, 2026-07-25)**
- **Cuidás a tu propia mascota**, con su foto real (`fotos[0]`) animada con Reanimated. Si no tiene foto, cae a un emoji según la especie.
- **Nunca muere ni se enferma** — decisión de producto explícita. Los stats tienen piso en 0 y de ahí sale un ánimo `decaido` con un mensaje cálido ("Te extraña. Pasá un ratito a hacerle mimos"). El avatar es la foto de una mascota real en una app de bienestar animal; un "tu mascota murió" ahí sería inaceptable.
- **El decay no usa cron**: se guarda el stat + `StatsActualizadoEn` y el valor real se deriva al leer. La fila sólo se escribe cuando el usuario hace una acción — mismo criterio que Historias. 4 stats (comida/ánimo/energía/higiene) con ritmos distintos; el hambre es el más rápido (100→0 en ~25h), así que entrar una vez por día alcanza.
- 4 acciones con cooldown propio y efectos cruzados (jugar sube el ánimo pero gasta energía y da hambre), XP/nivel y racha de días consecutivos.
- **Todo el cálculo temporal se hace en MySQL** (`TIMESTAMPDIFF`/`DATEDIFF`/`CURDATE`), no en PHP — ver el bug de zonas horarias más abajo.
- Push de recordatorio: `rh_enviar_push()` se extendió con payload `data` (deep-link) y **chunking de 100 tokens**, que no tenía y es el límite de Expo (una campaña grande no le llegaba a nadie). El script `inc/cli/juego_recordatorios.php` manda un push por usuario, saltea a quien jugó hace menos de 20hs, y tiene `--dry-run` para probar el balance sin enviar nada. **Falta registrarlo en el Programador de Tareas** (item 5 de `AUTOMATIZACIONES_PENDIENTES.md`).
- **Primeras dependencias declaradas del frontend**: `react-native-reanimated` y `react-native-gesture-handler` ya estaban en `node_modules` como peers de `expo-router` (y el plugin de Babel se auto-inyecta), pero no en `package.json`. Se fijaron con `npx expo install` para que un update no las mueva. También se sumó `warning` a `ThemeColors` (hacían falta 4 colores de stat y había 3).
- **🐛 Bug sistémico encontrado y corregido**: **PHP corría en `Europe/Berlin` y MySQL en `-03:00`** — 5 horas de desfasaje en cualquier comparación entre `time()`/`date()` de PHP y un `DATETIME` de MySQL. Se detectó porque el juego descontaba 5hs de decay apenas se creaba la mascota, pero **afectaba a más cosas**: `suscripcion.php` podía dar una suscripción por vencida 5hs antes en la madrugada, las sesiones duraban 30 días + 5hs, y el `ExpiresAt` del token de MP quedaba corrido. Se arregló en la raíz con `date_default_timezone_set('America/Argentina/Buenos_Aires')` en `bd.php`, al lado del `SET time_zone` que ya estaba.

**✅ 7b — Avatar generado por IA (completa, 2026-07-25)**. Con esto **el proyecto queda terminado**.
- **Proveedor: Gemini 2.5 Flash Image ("Nano Banana")** — hace **img2img real** (mantiene la identidad de la mascota, no dibuja "un perro genérico") y da **500 imágenes/día gratis por API sin tarjeta**. `inc/funciones/gemini.php`, cURL crudo sin SDK, coherente con Google Auth y Mercado Pago.
- **El prompt es lo que define la calidad** y vive en una sola constante comentada (`RH_GEMINI_PROMPT_AVATAR`): está en inglés y pide explícitamente conservar color de pelaje, forma de orejas y manchas, porque sin eso el modelo devuelve un animal genérico y se pierde la gracia. Para cambiar el estilo del avatar se toca ahí y en ningún otro lado.
- **Endpoint y modelo son configurables**, no están hardcodeados: Google está migrando a `/v1beta/interactions` con otro formato, así que si cambia se ajusta en el `.local.php`. El parser de la respuesta además **recorre las `parts` en vez de asumir un índice** y contempla los dos formatos.
- **Doble cuota** (`MascotaAvatarGeneracion` como log y contador): 3 por usuario/día y 400 globales/día, por debajo de las 500 reales. Los intentos **fallidos no consumen cuota**, y el corte por día usa `CURDATE()` de MySQL (ver el bug de zonas horarias de 7a).
- **Degradación completa**: sin `gemini.local.php` la feature se apaga sola y el juego sigue mostrando la foto real; en la UI aparece un texto explicativo en vez de un botón muerto. Si la llamada falla, el avatar anterior **no se toca** (el borrado del viejo pasa recién cuando el nuevo ya está guardado en disco).
- **Verificado sin API key** (que es el estado real hoy): 503 con mensaje claro, el juego intacto, y **toda la lógica de cuota probada** insertando filas a mano — límite personal, límite global, que las de ayer no cuenten, que las fallidas no cuenten, mascota sin foto (400) y mascota ajena (403). También se probó la llamada real con una key inválida: falla con gracia, queda registrada como fallida y no consume cuota.
- **Lo único sin verificar es la generación real** — necesita una API key. Cuando la tengas: copiá `inc/config/gemini.local.php.example` a `gemini.local.php` y pegá la key de [Google AI Studio](https://aistudio.google.com) (gratis, sin tarjeta). No hace falta tocar nada más.

**Idea descartada, documentada para no volver a evaluarla**: "que cada usuario conecte su cuenta de Google y gaste sus propios tokens". La API de Gemini **no expone un OAuth que facture al usuario final** (sólo vía Vertex AI, y eso autentica contra el proyecto GCP del desarrollador). El único BYOK posible sería que cada usuario pegue una API key a mano — mucha fricción y nos obligaría a guardar claves ajenas cifradas. Con 500/día gratis, además, no hace falta.

---

### Panel de moderación (post-fase 7, 2026-07-25)

Cierra el único hueco que quedaba para que la app funcione **sin tocar la base a mano**. Antes de esto, aprobar una verificación de identidad se hacía con un `UPDATE`, y las denuncias y los reportes se acumulaban sin que ningún endpoint los leyera.

- **`sql/021_moderacion.sql`**: `ResueltoPorUserId` / `ResueltoEn` / `NotaAdmin` en `Denuncia` y `ReporteSolicitud` (lo que `UsuarioVerificacion` ya tenía), más índices por `EstadoRevision`.
- **`rh_require_admin($conn)`** en `auth.php`: 401 sin sesión, 403 sin rol admin. `suscripcion/manual_confirmar.php` (que tenía el chequeo inline) pasó a usarlo.
- **`inc/funciones/moderacion.php`** + **9 endpoints en `inc/ajax/admin/`**: `resumen`, `verificaciones_listar`, `verificacion_archivo`, `verificacion_resolver`, `denuncias_listar`, `denuncia_resolver`, `reportes_listar`, `reporte_resolver`, `usuario_suspender`. Los tres listados con el mismo cursor+limit del resto del proyecto.
- **4 pantallas** en `app/(app)/admin/` + `adminApi.ts` + i18n en los 10 idiomas. La entrada en "Más" sólo se renderiza si `user.rol === 'admin'`; el gate real es el backend.
- **Hacer admin a alguien sigue siendo por SQL**: `UPDATE Usuario SET Rol='admin' WHERE UserId=…`. No hay gestor de roles.

Decisiones de alcance: **eliminar contenido denunciado quedó afuera** (son 10 tipos distintos); en su lugar la denuncia resuelve de qué contenido se trata y linkea a la pantalla que ya existe. **Suspender/reactivar sí entró** — y además de tocar `Usuario.Estado`, revoca las sesiones vivas, porque el login filtra por `Estado='A'` pero un token bearer ya emitido seguiría funcionando hasta vencer.

Dos arreglos que salieron en el camino:
- **Las migraciones `019` y `020` nunca se habían corrido**: `auth/password_olvidada.php` tiraba un fatal error (`Table 'huellitas.passwordreset' doesn't exist`) y la verificación automática usaba columnas inexistentes. Ya corridas.
- **`verificacion_auto.php` escribía el error técnico de Gemini en `MotivoRechazo`**, que es el campo que el usuario lee como "por qué te rechazaron" — aunque el estado hubiera quedado en `pendiente`. Ahora el error va a `AutoDetalle` (que sólo ve el moderador) y el usuario lee "queda pendiente de revisión manual".

---

### Rediseño visual (arrancado 2026-07-26, EN CURSO)

El objetivo que puso el usuario: que alguien que viene de Instagram abra la app y diga "qué bueno que hicieron esto". Ambición máxima, todo en una tanda.

**El hallazgo que ordenó todo el trabajo**: el sistema de diseño ya existía y era bueno (`src/theme/`: paleta coral `#E23B4A` + teal `#0F766E` con variantes `soft`, Outfit+Nunito cargadas por `FontBootstrap`, `elevation`/`radii`, más `Atmosphere`, `AppButton` y `AppInput`), **pero sólo lo usaba el 11% de la app**. El problema no era estético sino estructural: los mismos patrones estaban copiados a mano en decenas de archivos con medidas distintas — los chips en 19, la tarjeta de listado en 17, el spinner centrado en 42, el FAB en 9 — así que dos listados que mostraban lo mismo no se veían iguales.

**Por eso el orden es: componentes primero, pantallas después.** Rediseñar 5 componentes compartidos mueve ~20 pantallas sin tocarlas.

**Hecho** (commits `2e3205e` y `4a83292`):
- `expo-haptics` (con wrapper no-op en web: sus promesas rechazan ahí) y `expo-image`.
- Favicon regenerado: era el icono de Android y a 32px quedaba irreconocible.
- **`src/components/ui/`**: `Skeleton`/`SkeletonList`/`SkeletonPost`, `ChipRow`/`FilterChip`/`RadioChips`, `ListCard`, `EmptyState`, `Fab`, `Screen`, `AppCard`, `Badge`, `SectionHeader`.
- 16 componentes compartidos migrados. `PerfilBody` ahora tiene grilla de 3 columnas con pestañas y stats. `LanguagePicker` y `DenunciaButtonStub` eran los que rompían visualmente pantallas ya rediseñadas; `NoticiaExternaCard` convivía con `PostCard` en la misma lista con dos estilos.
- Los 9 FAB al componente compartido (esquina derecha, con icono) y 36 pantallas con skeletons en vez de spinner.

- **Los 8 listados** (Tránsito, Donaciones, Veterinarias, Adopción, Perdidos, Campañas, Productos, Mis Mascotas) y el hub de admin a `ListCard` + `ChipRow` + `EmptyState` + `SkeletonList`, con pull-to-refresh parejo en todos.
- **54 campos de formulario en 18 pantallas** a `AppInput`. Quedan 3 `TextInput` a propósito (búsqueda, chat del match, y el password del login que necesita su ref).
- **Doble-tap con corazón animado + haptic** en `PostCard`.

**Falta**:
- Las pantallas de **detalle** (`[id].tsx` de cada módulo) y las secundarias (favoritos, postulaciones, inscripciones, carrito, pedidos, suscripción, buscar, onboarding): tienen skeletons y `AppInput`, pero el cuerpo sigue con `StyleSheet` plano.
- Headers colapsables en los detalles y cards a foto completa en Match.
- Extender los haptics al resto de las acciones (hoy están en chips, FAB, pickers, denuncia, reporte y doble-tap).

**Dos cosas del plan original que resultaron innecesarias**: las historias **ya tenían** barras de progreso segmentadas, y el perfil ya quedó con la grilla de 3 columnas en la capa C.

**Al automatizar con regex sobre TSX**: anclar siempre al tag (`<TextInput ... />`), nunca a un patrón de estilo suelto — un regex de `style={[styles.X, {…}]}` sin anclar dejó las tarjetas del panel admin sin fondo. Y usar `\r?$` en los `^…$` multilínea, porque los archivos están en CRLF y si no el `$` no matchea.

El plan completo está en `C:\Users\Pab\.claude\plans\c-xampp-htdocs-red-huellitas-master-encapsulated-sloth.md`.

---

### Historias: Cadenas + editor y visor completos (2026-07-26)

**Cadenas es el feature propio del proyecto**, no una copia de Instagram: alguien propone un tema ("Chapuzón"), sube su historia, y el resto la continúa con la suya. En Instagram cada historia es una isla; acá se enganchan en un hilo que la comunidad sigue.

**La decisión de diseño que hace que funcione: la cadena no expira aunque sus historias sí.** Las historias vencen a las 24hs como siempre, pero la cadena queda viva mostrando las vigentes. Si muriera con su primera historia nadie llegaría a sumarse. Por eso `cadenas_listar` ordena por la última historia vigente y no por fecha de creación, y la posición ("3º de Chapuzón") se calcula al leer: si una historia anterior vence, las siguientes se recorren solas.

- `sql/023_historias_cadenas.sql` (corrida): recorte, `SinAudio`, `Cadena`, `CadenaParticipante`, `CadenaInvitacion`, `Historia.CadenaId`, encuestas, preguntas y respuestas.
- `inc/funciones/cadenas.php` + 7 endpoints nuevos en `inc/ajax/historias/`.
- Editor: `StoryTrimBar` (recorte + silenciar), stickers, encuesta y caja de preguntas.
- Visor: audio, mantener para pausar, respeta el recorte, "visto por N", responder, compartir y banner de cadena.
- 3 pantallas de Cadenas + píldora en `HistoriasBar`. i18n ×10.

**Recorte de video: es no destructivo y eso fue una decisión, no una limitación olvidada.** Recortar de verdad exige re-encodear, y hoy no se puede en Expo managed: `ffmpeg-kit-react-native` fue retirado y las alternativas necesitan prebuild nativo, que rompería la verificación en browser. Se guarda el tramo y el reproductor arranca y corta ahí. El archivo pesa igual, cosa que no importa en algo que vence a las 24hs.

**Bug de arrastre corregido**: el video del visor estaba forzado a `muted`, así que **toda historia con sonido se veía muda**.

**Gotcha de Expo Router que costó caro**: no admite dos parámetros dinámicos distintos en el mismo nivel. Tener `historias/[userId].tsx` y `historias/[historiaId]/vistas.tsx` **rompía el router entero** — cualquier ruta caía en `/buscar` con la pantalla en blanco, sin un solo error en consola. El visor quedó en `historias/ver/[userId].tsx` y las vistas en `historia-vistas/[historiaId].tsx`.

### Temporizador, velocidad y swipe (2026-07-26)

Cierra lo que faltaba de Historias.

**Cámara**: chip de temporizador (sin / 3s / 10s) con cuenta regresiva a pantalla completa —tocar de nuevo cancela— y chip de velocidad (0.5x / 1x / 2x), que sólo aparece en modo video.

**La velocidad es no destructiva, igual que el recorte** (`sql/024`). En TikTok se hornea en el archivo al grabar; acá se guarda el factor en `Historia.VelocidadReproduccion` y lo aplica el reproductor con `playbackRate`. Para el que mira es lo mismo —grabar 10s a 2x se ve en 5s— pero no hace falta re-encodear (o sea, no hace falta build nativo, ver 023) y el autor puede cambiar de idea en el editor sin volver a grabar. El backend acepta sólo 0.5/1/2 y rechaza el resto: si aceptara cualquier número, publicaría algo distinto de lo elegido sin avisar. La barra de progreso del visor divide por el factor, si no se desfasa del video.

**Visor**: swipe horizontal para saltar de usuario —en el orden del carrusel, que sale del mismo `feed.php`— y vertical hacia abajo para cerrar. Al final del carrusel el swipe a la izquierda cierra en vez de quedar muerto, como Instagram.

El gesto va **sobre** las zonas de tap, no en lugar de ellas: el `PanResponder` recién reclama el gesto cuando hay 12px de movimiento real, así el toque para avanzar y el mantener apretado para pausar siguen funcionando (verificado: tap avanza de historia, long-press pausa).

### Recorte: los 3 bugs por los que "andaba raro" (2026-07-26)

El usuario reportó que el recorte se trababa a veces sí y a veces no. Eran tres cosas distintas, ninguna de ellas del gesto en sí:

1. **La pista medía 0 de ancho.** `onLayout` no vuelve a dispararse si el primer layout del panel llega con ancho 0, y el panel de recorte aparece de golpe sobre una pantalla ya montada. Con ancho 0, `segundosPorPx` da 0 y `onPanResponderMove` **descarta el gesto entero en silencio**: la manija no se movía ni un píxel. Que dependiera del timing del montaje explica el "a veces sí, a veces no". Ahora además se mide a mano con `measure()` hasta tener un ancho real.
2. **El `PanResponder` se recreaba en pleno arrastre**, porque su `useMemo` dependía de `inicioSeg`/`finSeg`, que cambian con cada `onChange`. React Native re-registraba los handlers a mitad del gesto.
3. **El delta se aplicaba en cascada**: `gesture.dx` es acumulado desde que arrancó el gesto, pero se lo sumaba a un valor que ya se había movido, así que la manija se disparaba sola hasta el tope. Ahora el valor de arranque se captura en `onPanResponderGrant`.

**Y un cuarto, aparte**: `StoryCameraCapture` mandaba `duracionSegundos: 15` fijo para todo video grabado en web. Grabar 4 segundos daba una barra de 15: las manijas caían en cualquier lado. Ahora se mide el archivo (con el truco de saltar a `1e101` para los WebM de `MediaRecorder`, que no traen duración en el header) y el reloj de grabación queda de respaldo.

**Lo que se sumó**: mientras se arrastra, el video salta al frame exacto que se está cortando y aparece una burbuja con la miniatura y el segundo. Y la pista entera es un cabezal: tocarla o arrastrarla reproduce desde ahí, para revisar un momento puntual sin volver a mirar el video entero. El tramo recortado ahora también se respeta en nativo — antes sólo andaba en web.

---

### Marca propia, hubs, privacidad, chat y notificaciones (2026-07-27)

**La navegación era de cuando la app tenía 4 pantallas.** Con 7 fases construidas, Tienda, Salud, Rescate y Juegos estaban todos escondidos en un "Más" con 6 tiles y 10 links sueltos. Ahora la barra inferior agrupa por tema y dice qué hace la app en vez de listar pantallas.

**Nombres**: Inicio → **Huelligram**, Historias → **Huellitas**, Shorts → **Huetube**, Juegos → **HuePlay**, Más → **Configuración**. Sólo cambian los textos: rutas y tablas siguen diciendo `historias`, porque renombrarlas es un diff enorme sin efecto visible y tocar esas rutas ya rompió el router una vez.

**`src/navigation/hubs.ts` es la fuente única** de los 6 hubs. La leen la barra, el menú de mantener apretado y la grilla de cada hub. Antes la lista vivía duplicada entre la barra y el cajón de "Más" y se desincronizaba sola.

**Huelligram** tiene las Huellitas arriba y tres solapas debajo (Publicaciones · Noticias · Huetube), que también se cambian deslizando el dedo.

**Riel de flotantes** abajo a la derecha, en columna: notificaciones, chat, mis animales y publicar. Los tres secundarios son de 42px en color de superficie y sólo publicar va en color de marca — cuatro botones grandes tapaban el contenido. Los "crear" de cada pantalla se corrieron a la izquierda del riel para no pisarse. Se apagan enteros en Huellitas, fotos y videos.

**Cuenta privada** (`sql/025`): `rh_puede_ver_perfil()` es el gate único y se llama desde los **cinco** caminos que exponen contenido de un usuario (publicaciones, mascotas, Huellitas, seguidores, seguidos). La ficha del perfil sigue visible porque si no no habría forma de encontrar a alguien para pedirle seguirlo; el WhatsApp no se filtra ni marcado como público. **Al pasar a privado los seguidores actuales se conservan**: echarlos sería destruir datos por un cambio de setting.

**Notificaciones** (`sql/026`): `rh_notificar()` guarda la fila y después manda el push. Antes se llamaba directo a `rh_enviar_push()` en 10 lugares y no quedaba nada — si el celular estaba apagado, la notificación no existió nunca. Los tres badges salen de un solo endpoint cada 30s.

**Chat** (`sql/027`): el estado vive **por participante**, no por conversación. Es lo que hace posible la bandeja: para el que escribe es una charla y para el que recibe, si no se conocen, es una solicitud. Cuenta como conocerse que uno siga al otro, que haya match de mascotas o un pedido en común. A una solicitud sin aceptar no se le manda push. Sin websockets en hosting compartido: **polling cada 4s pidiendo sólo lo nuevo**. Del MSN: zumbido que sacude la pantalla, mensaje personal y emoticones que se convierten al escribir.

**Refugios** no necesitó tabla: es un usuario con `TipoUsuario = 'refugio'`, que existía desde el registro y no se usaba para nada. **Cuidados** (`sql/028`) es contenido semilla real por especie.

**Dos bugs de encoding encontrados de paso**, ninguno del pedido:
1. **Los 8 i18n que no son es/en estaban doble-codificados**: en chino se veía `é¦–é¡µ` en vez de `首页`, en ruso `Ð“Ð»Ð°Ð²Ð½Ð°Ñ`. La app era ilegible en 4 idiomas. Reparado revirtiendo el mapeo cp1252→UTF-8.
2. **`app/+html.tsx` no se aplica en el dev server** — sólo al export estático. Por eso la regla que oculta las barras de scroll nunca corría. Ahora se inyecta desde el runtime (`src/theme/hideScrollbars.ts`).

⚠️ **Las migraciones con acentos hay que correrlas con `--default-character-set=utf8mb4`**, si no el cliente de MySQL asume latin1 y entra todo roto.

**Falta**: enganchar `rh_notificar()` en los 9 llamadores viejos de `rh_enviar_push()` (hoy sólo lo usan seguimiento y chat), la tarjeta de interacciones dentro de cada mascota, y el rediseño visual de las pantallas de detalle.

### Edición de publicaciones propias y candados (2026-07-27)

Faltaban los `actualizar.php` de **Tránsito, Donaciones, Perdidos y Productos** (sólo Adopción tenía). Ahora los cuatro existen, con sus pantallas `[id]/editar.tsx` y el botón "Editar publicación" en cada detalle.

**`inc/funciones/edicion.php` es el único lugar que decide cuándo algo deja de editarse.** Cada módulo se bloquea con la señal real que tiene, no con una inventada:

| Módulo | Se bloquea cuando | De dónde sale la señal |
|---|---|---|
| Adopción | `en_proceso` / `adoptado` | postulaciones |
| Perdidos | `reencontrado` | `EstadoPerdido` |
| Tránsito | `acordado` | `EstadoTransito` — **lo marca el dueño** |
| Donaciones | `acordado` | `EstadoDonacion` — **lo marca el dueño** |
| Productos | **nunca** | — |

**Por qué Tránsito y Donaciones necesitaron columna nueva** (`sql/035`): son los únicos módulos donde el acuerdo se cierra afuera de la app y no deja rastro en la base. Deducirlo de "alguien abrió una conversación" congelaría la publicación por una simple consulta. Así que es un toggle explícito y reversible (`estado_actualizar.php` en cada módulo): si el trato se cae, vuelve a `disponible` y se recupera la edición.

**Por qué Productos no se bloquea nunca**, aunque haya un pedido en curso: `PedidoItem` guarda su propia copia de `NombreProducto` y `PrecioUnitario` al confirmarse, y **todo el flujo de pedidos lee de ahí — no hay un solo `JOIN Producto`** (verificado en `rh_pedido_items()`, el detalle, los listados y el PDF). El pedido en curso queda tan congelado como uno entregado, así que el vendedor puede corregir la descripción o reponer stock sin afectar a nadie. Bloquear la publicación no agregaría ninguna garantía. *(El carrito sí muestra el precio vigente, que es lo correcto: todavía no hay nada acordado.)*

El motivo del bloqueo lo escribe **siempre el backend** (`motivoNoEditable`), nunca la app, para que no se desincronicen al cambiar una regla. `rh_sincronizar_fotos()` (mismo archivo) resuelve el reordenamiento de galería para los 5 módulos con un solo helper.

**Números de migración duplicados: resueltos.** Había dos archivos con 025, 026, 027 y 028. Se conservaron los de la tanda de navegación (privacidad, notificaciones, chat, cuidados) porque son los que este documento referencia, y la otra tanda se renumeró a **031–034** (`hueplus_planes`, `mascota_banner`, `fix_hueplus_acentos`, `verificacion_reintentos`), respetando el orden relativo — `033` sigue corrigiendo los acentos que inserta `031`.

⚠️ **`sql/000_todo_schema.sql` está desactualizado**: sólo concatena hasta la `016`. Una instalación nueva hecha desde ese archivo se pierde de la `017` a la `035`. Hoy la única forma correcta de levantar la base de cero es correr las migraciones en orden.

---

## 4. Cómo seguir mañana

1. Confirmar que XAMPP (MySQL + Apache) está corriendo: `/c/xampp/mysql_start.bat` y `/c/xampp/apache_start.bat` en background si no lo están.
2. **Si es una máquina nueva o `vendor/` no existe: `composer install` en la raíz** (ver el aviso del encabezado).
3. Decirle a Claude algo como: *"leé ESTADO_Y_PLAN_PROYECTO.md, hagamos la Fase 7b (avatar de la mascota generado por IA)"*.
4. Claude debería arrancar en **plan mode** (explorar, escribir el plan, pedir aprobación) antes de tocar código, igual que en cada fase anterior. Para 7b lo principal ya está investigado y anotado arriba (Gemini Flash Image, 500 img/día gratis, img2img real; el BYOK con cuenta de Google no es viable). **Lo que falta de tu lado**: crear una API key en [Google AI Studio](https://aistudio.google.com) — es gratis y no pide tarjeta.

**Pendiente operativo (no bloquea nada)**: los emails salen desde la casilla de Contapp (`soporte@cont-app.com`). Cuando exista la casilla propia de Red Huellitas, cambiar `MAIL_FROM`/`MAIL_NAME` y las claves `SMTP_*` en `inc/config/email.local.php`.
4. Si en la máquina nueva no hay memoria persistente (`~/.claude/projects/.../memory/`), este archivo cubre lo esencial; los gotchas de la sección 6 son los que más tiempo ahorran repetir.

---

## 4bis. Mapa (Planeta) — agregado 2026-07-28

Botón planeta en el centro de la barra inferior, sobresaliendo, que abre
`/(app)/mapa`: **todas las publicaciones de todos los módulos salvo Huelligram**,
dibujadas donde está la publicación y no donde está el teléfono.

**Registro único**: `inc/funciones/mapa.php` declara las 8 capas (adopción,
tránsito, perdidos, donaciones, productos, veterinarias, campañas, refugios) con
su tabla, columnas de coordenadas, foto de portada y ruta de detalle.
`rh_mapa_buscar_tipo()` no sabe nada de ningún módulo en particular: agregar una
capa es agregar una entrada, no tocar la consulta.

**Ubicación difuminada** (`rh_geo_difuminar` en `geo.php`): las publicaciones de
personas se corren hasta ~500 m (5 cuadras). El corrimiento es **determinista**
(hash de módulo+id), no aleatorio: con ruido nuevo en cada request bastaría con
pedir la misma publicación muchas veces y promediar para que el punto real
aparezca solo. Los lugares públicos (veterinarias, refugios, campañas) van
exactos — ahí la dirección precisa es el dato útil.

**Adopción no guardaba ubicación** (migración `036`): usaba la zona del dueño,
que se muda con él. Ahora es de la publicación y se fija al publicar.

**Mapbox con MapLibre de contingencia y tope duro**: el token vive en
`inc/config/mapa.local.php` (gitignored) y lo entrega `ajax/mapa/sesion.php`
sólo después de reservar cupo. Nunca está en el bundle — si estuviera, el
navegador podría crear mapas sin pasar por el contador. Topes: 45.000/mes
global (Mapbox da 50.000) y 60/día por usuario. Al agotarse responde
`motor: 'maplibre'` con **200, no error**. Verificado: agotando el cupo a mano,
la app pasa a MapLibre sola y muestra el aviso.

**Datos de demo**: `php inc/cli/seed_mapa_demo.php` siembra 30 publicaciones por
barrios reales de CABA; `--limpiar` borra sólo eso (van marcadas con
`[demo-mapa]` en la descripción).

**Ahorro de consumo**: el mapa se **reutiliza entre navegaciones** — la instancia
y su nodo DOM viven en un módulo y al volver se re-enganchan, así que Mapbox
cobra una carga por sesión del navegador y no una por visita. Junto con la
instancia se reusa la sesión (`sesionMapaViva()`); si no, la pantalla pediría
`sesion.php` otra vez y descontaría una carga que Mapbox no cobró. Medido: abrir
= 1, salir y volver = sigue en 1. El caché de puntos (`utils/mapaCache.ts`,
vencimiento diario) ahorra servidor propio, no Mapbox.

**Ubicación propia vs. del dispositivo**: el punto celeste usa el GPS real
(`miUbicacion`), separado del centro de búsqueda (`centro`) que se mueve al
arrastrar. Sin GPS no se dibuja nada — mejor ningún punto que uno que miente.

**Falta**: el lienzo nativo. `mapbox-gl` es DOM y no corre en React Native;
`@rnmapbox/maps` necesita `expo prebuild` y un token secreto de descarga (`sk.`).
`MapaLienzo.tsx` (nativo) avisa en vez de romper; el resto de la pantalla anda.

---

## 4ter. Campañas con inscripción — backend listo (2026-07-28)

Migración `043`. Extiende `Campania` (`MensajeAviso`, `BajaLimiteHoras`) y
`CampaniaInscripcion` (`Estado`, `Posicion`, `CanceladaEn`, `AvisoAusenciaEn`,
`NotaAusencia`), y suma el formulario dinámico con **las mismas tres tablas que
Adopción** (`CampaniaPregunta` / `…Opcion` / `CampaniaRespuesta`).

**Toda la lógica de cupo vive en `inc/funciones/campania_inscripcion.php`.** Es
la parte que la gente reclama ("me anoté antes que él"), así que hay un solo
lugar donde mirar:

- **Cupo lleno ⇒ lista de espera**, no rechazo. Decirle "no hay lugar" a alguien
  que igual iría es perder gente que después entra por una baja.
- **`Posicion` nunca se recalcula**, ni siquiera al cancelar. Es "en qué lugar
  llegaste", no "qué puesto ocupás hoy"; renumerar dejaría a alguien que se
  anotó primero detrás de otro por una baja ajena.
- **Los lugares se cuentan sobre `confirmada`**, no sobre el total de filas: las
  canceladas y la lista de espera no ocupan.
- El ascenso usa `UPDATE … WHERE Estado='lista_espera'`: dos bajas simultáneas no
  pueden ascender dos veces a la misma persona.
- `CupoMaximo` NULL = ilimitado. No hay flag aparte: dos fuentes para el mismo
  dato terminan contradiciéndose.

Endpoints: `inscribirme` (valida el formulario y decide confirmada/espera),
`baja` (sirve para el propio y para el organizador; siempre asciende al que
sigue), `aviso_ausencia` (para cuando ya venció el plazo de baja),
`administrar` (panel del organizador en un solo pedido) y `formulario_guardar`.

Dos candados que ya probé: no se puede bajar el cupo por debajo de los
confirmados, y no se puede cambiar el formulario si alguien ya respondió — la
FK se llevaría puestas sus respuestas.

**Frontend hecho**: el detalle muestra el aviso importante y, según quién mire,
"Administrar campaña (n/cupo)" para quien organiza o el estado propio para quien
se anotó ("En lista de espera · puesto 3") con baja o aviso de ausencia según el
plazo. Inscribirse abre el formulario **sólo si la campaña tiene preguntas**;
sin preguntas se anota en el acto.

`campanias/[id]/administrar.tsx` es el panel: barra de ocupación, los cuatro
estados en chips, y cada persona con su posición, respuestas del formulario,
nota de ausencia y WhatsApp para coordinar. Después de cada baja **se recarga
entero** en vez de tocar el estado local: una baja puede ascender a otro, y
adivinar ese efecto en la pantalla duplicaría la regla que ya vive en el backend.

**Falta**: la pantalla para que quien organiza arme el formulario desde la app
(el endpoint `formulario_guardar.php` existe y está probado, pero todavía no hay
UI que lo llame — hoy las preguntas se cargan por API).

---

## 4quater. Direccion exacta, Equipos y calificaciones (2026-07-28)

### Direccion exacta en los lugares con puerta a la calle (`sql/044`)

`ZonaDescripcion` es el barrio ("Palermo") y sirve para filtrar; para llegar
hace falta la calle y el numero. Columna `Direccion` nueva en `Veterinaria`,
`Campania` y `Usuario`, con el componente `DireccionConMapa` que las muestra
juntas y agrega **"Ver en mapa"**: abre `/(app)/mapa?lat=&lng=` y el mapa vuela
al punto exacto al montarse.

**Solo para lugares publicos.** Las publicaciones de personas siguen
difuminadas (`rh_geo_difuminar`); poner ahi un boton de "ver en mapa" sugeriria
una precision que a proposito no existe.

De paso, `inc/ajax/mapa/listar.php` dejo de reventar con un fatal de PHP cuando
el cliente manda `tipos[]=a&tipos[]=b` en vez de `tipos=a,b`.

### Equipos (`sql/045`)

Hasta ahora "refugio" era un **tipo de cuenta**, y eso no alcanza: el gobierno
de la ciudad no es ni veterinaria ni refugio pero hace campañas, y una
organizacion tiene mas de una persona. Un equipo es una entidad aparte con
miembros; cada persona conserva su usuario y **se une a un equipo existente**
en vez de duplicar la misma organizacion cinco veces.

- `TipoEquipoCatalogo` decide **icono y color** de cada insignia, asi que sumar
  un tipo nuevo es una fila en la base y no un deploy de la app.
- `EquipoMiembro` con `Estado` (`pendiente`/`activo`/`rechazado`/`salio`) y
  `Rol` (`dueno`/`admin`/`miembro`). El pedido de entrar lo aprueba alguien de
  adentro; sin eso cualquiera se colgaria del nombre de una ONG conocida.
- Publicar en nombre del equipo lo pueden **solo dueño y admins**: si alcanzara
  con ser miembro, sumarse daria permiso para hablar por la organizacion el
  mismo dia.
- `Campania.EquipoId` (NULL = la organiza una persona). Los admins del equipo
  administran la campaña aunque no la hayan cargado ellos: el que la cargo se
  puede ir de vacaciones.
- `Equipo.Verificado` lo pone **moderacion**, nunca el propio equipo.

Todo el "quien puede que" pasa por `rh_equipo_rol()` / `rh_equipo_puede_administrar()`
en `inc/funciones/equipo.php`, y por `rh_campania_puede_administrar()` para las
campañas. Estan concentrados a proposito: la membresia se chequea en una docena
de endpoints y alcanza con olvidarse de uno.

### Calificaciones cruzadas

Terminada la campaña se califican **los dos lados**: el participante al
organizador (equipo o persona) y el organizador a cada participante, con
comentario. Una sola tabla `Calificacion` para ambos sentidos porque es el mismo
dato; `DeTipo`/`ParaTipo` resuelven que un extremo pueda ser persona o equipo.

- Una UNIQUE por `(contexto, contextoId, de, para)`: volver a calificar
  **actualiza** la propia nota en vez de sumar otra fila. Si no, el promedio se
  infla votando muchas veces lo mismo.
- Solo califica **el que estuvo**: hay que tener inscripcion confirmada y la
  campaña tiene que haber terminado. Sin eso la reputacion se llena de gente
  que nunca piso el lugar.
- `promedio` es `null` y no `0` cuando no hay ninguna: un equipo nuevo no tiene
  cero estrellas, no tiene estrellas todavia.

**Asistencia**, aparte de las calificaciones: `CampaniaInscripcion.Asistio`
(`si`/`no`/NULL) la marca el organizador **despues** de la campaña. Es distinto
de `Estado='ausente'`, que es el aviso previo del propio usuario. La diferencia
es justamente lo que responde *"¿este se anoto cinco veces y no vino ninguna?"*,
y aparece como alerta roja en el panel del organizador. NULL = todavia no se
paso lista: usar 0 por defecto convertiria en faltador a todo el que participo
de una campaña donde nadie tomo asistencia.

**Verificado con curl y en browser**: crear equipo (y el rechazo del nombre
duplicado, que ofrece el que ya existe), pedir/aprobar/rechazar membresia,
publicar campaña a nombre del equipo, pasar lista, calificar de los dos lados,
y los 403 de cada intento indebido.

**Datos de prueba que quedaron en la base** (a pedido, para poder mirarlo):
equipo *Gobierno de la Ciudad TEST*, campaña *TEST equipo castracion* con dos
inscriptos —uno que fue y otro marcado como faltador sin aviso—, y las
calificaciones de ida y vuelta.

**Falta**: subir el avatar del equipo desde la app (el endpoint ya acepta
`$_FILES['avatar']`, no hay UI), y el tab por equipo en el chat.

---

## 4quinquies. Ranking global de HuePlay, con tabs por período (2026-08-07)

Retomando el desafío diario de Fase 1: el "ver la tabla del día" que ya existía
es **por juego** (HueCrush/HueMemo/HueTrivia, un solo día). Lo que pidió el
usuario es otra cosa — un botón de **Ranking** aparte, que suma los tres retos
y se puede mirar en cuatro ventanas: hoy / semana / mes / año.

- **Ventanas móviles, no de calendario.** "Los últimos 7 días" en vez de "esta
  semana calendario": si se reiniciara los lunes, la tabla estaría vacía todo
  el lunes, y la anual arrancaría de cero el 1° de enero. `RH_DIARIO_PERIODOS`
  en `inc/funciones/diario.php` (`rh_diario_ranking_periodo()`) mapea
  `dia/semana/mes/anio` a 1/7/30/365 días hacia atrás desde hoy inclusive.
  Nuevo endpoint `inc/ajax/hueplay/diario_ranking_periodo.php`.
- Mi puesto se calcula aparte de la lista top-N (mismo patrón que ya usaba
  `rh_diario_mi_puesto`): si no apareciera en el top, igual sabe dónde está.
- Frontend: modal en `app/(app)/hueplay/diario.tsx`, tabs con el `ChipRow`
  compartido, un botón "Ranking" nuevo al lado del título.

**Bug real encontrado en la verificación, no del feature en sí — de cómo
`<Modal>` de React Native se comporta en este proyecto sobre web**:
`animationType="slide"` deja el modal con un `transform: translateY()` que
nunca se resuelve (queda trasladado una pantalla entera hacia abajo, invisible
y en la práctica sin poder clickearlo aunque el texto esté en el DOM).
`animationType="fade"` (el que ya usaba el modal de Match) tampoco cierra bien
el círculo: el contenido queda visualmente en su lugar pero con
`pointer-events: none` heredado de la animación que no termina de "entrar" en
este entorno web — un click real (coordenadas) no le pega a nada, aunque un
`dispatchEvent` manual por JS sí (porque eso no respeta `pointer-events`, y por
eso durante la verificación parecía que las tabs sí andaban aunque el modal
seguía roto). **La solución fue `animationType="none"`**: sin animación no hay
transición a medio completar, y el modal queda clickeable desde el primer
frame. Si se agrega otro `<Modal>` de RN a este proyecto (web), usar `"none"` y
no asumir que `"fade"` de Match está libre de este problema — no se verificó
ahí, sólo se descubrió acá.

---

## 4sexies. HueDamas + infraestructura de plazo de turno e IA (2026-08-07)

Primer juego de una tanda de 4 pedidos (Damas, Ajedrez, Ludo, Rummy — los tres
últimos quedan para entregas futuras, uno por vez). Esta entrega funda dos
piezas compartidas que **también se aplican retroactivamente a HueConecta**:

- **Plazo de respuesta configurable, con tope de 24hs**: quien arma el duelo
  elige 1/6/12/24 horas (`JuegoDesafio.PlazoTurnoHoras`, migración
  `sql/052_hueplay_plazo_ia.sql`). No responder a tiempo **pierde la
  partida** (no es un vencimiento neutro) — se resuelve tanto perezosamente
  (al abrir la bandeja, `rh_juego_expirar_desafios()`) como por el cron nuevo
  `inc/cli/juego_turnos_vencidos.php` (cada 15 min, sin registrar todavía —
  ver `AUTOMATIZACIONES_PENDIENTES.md` #7).
- **Modo solitario contra la IA**: cuenta bot reservada (`Usuario.EsBot`,
  única fila, `PasswordHash=NULL` así nunca puede loguearse), excluida a mano
  de `usuarios/buscar.php` y `hueplay/rivales.php`. El bot resuelve su turno
  **en el mismo request** que la jugada humana (`rh_damas_turno_ia()`), nunca
  hay polling esperándolo. `rh_juego_ia_disponible($codigo)` es el único punto
  a tocar cuando otro juego sume IA.
- **Refactor**: `rh_juego_cerrar_desafio_turnos()` (nueva, en `juegos.php`)
  centraliza el cierre de un desafío por turnos — antes `turno_jugar.php` lo
  hacía a mano y era el único consumidor; ahora también la usan
  `damas_mover.php` y la resolución de vencidos, sin repetir el bloque de
  notificar+contar+registrar partida.

**Damas en sí**: reglas argentinas sobre 8x8 (no 10x10 internacional),
tablero como string de 64 posiciones igual criterio que HueConecta.
`inc/funciones/damas.php`: captura obligatoria en las 4 diagonales (no sólo
adelante — regla FMJD), multi-captura en cadena, dama voladora. IA por
minimax + poda alfa-beta (profundidad 4, ~2ms por jugada). Dos
simplificaciones deliberadas y documentadas en el código: no se fuerza la
"captura de mayoría" cuando hay varias cadenas posibles, y la dama aterriza
siempre inmediatamente después de la pieza comida (no en cualquier casilla
libre más lejana).

**Animaciones** (`app-movil/src/juego/huedamas/`): `PiezaDamas` desliza en los
2 ejes (a diferencia de `FichaCae`, que sólo cae en Y), con pop de corona;
`PiezaComida` se desvanece antes de salir del árbol; `CelebracionPatitas` es
el evento visual de "ganar" que HueConecta no tenía (ahí sólo hay
texto+haptic). El front reproduce la cadena de saltos del backend paso a
paso, con un delay fijo por salto — nunca aplica el tablero final de un
golpe.

**Bug real encontrado en la verificación**: un movimiento SIN captura mandaba
`saltos: []`, y el front sólo sabe animar iterando esa lista — así que un
movimiento simple nunca actualizaba la posición visual de la ficha (aunque el
servidor sí lo aplicaba bien). Se arregló haciendo que todo movimiento,
incluso uno simple, lleve un salto implícito con `comida: null`.

**Verificado**: motor de reglas con casos armados a mano (captura obligatoria,
cadena de 2 saltos, coronación, dama voladora, bloqueo total) + simulación
IA-vs-IA completa (72 turnos, 2.2ms/jugada) + partidas reales por HTTP en
browser (contra la IA y 1v1 humano con `curl`, incluida la IA
contraatacando con una dama voladora) + vencimiento de turno forzado a mano
(perezoso y por cron) + HueConecta jugado hasta ganar para confirmar que el
refactor de `turno_jugar.php` no rompió nada. **No se pudo verificar
visualmente** (el browser preview de esta sesión no puede tomar
screenshots) — falta mirar las animaciones en el celular.

**Falta**: Ajedrez, Ludo (con salas de hasta 4) y Rummy (ídem), uno por vez.

## 4septies. HueAjedrez (2026-08-07)

Tercer juego de la tanda (Damas y ahora Ajedrez cerrados; quedan Ludo y
Rummy, que van a necesitar salas de hasta 4 jugadores). Reusa el 100% de la
infraestructura de HueDamas sin tocarla — plazo de turno, IA en el mismo
request, `rh_juego_cerrar_desafio_turnos()` — así que esta entrega fue pura
lógica de ajedrez.

**Tablero**: string de **70 caracteres**, no 64 como Damas/Conecta4 — los
primeros 64 son las casillas con **letras** (mayúscula el retador, minúscula
el retado: `P/N/B/R/Q/K`, `.` vacío; hacían falta letras y no dígitos porque
son 6 tipos de pieza por lado), y los últimos 6 son estado que el tablero
solo no alcanza a expresar: 4 de derecho de enroque estilo FEN (`KQkq`, cada
uno `-` si se perdió) y 2 de la casilla objetivo de captura al paso (`--` si
no aplica). `inc/funciones/ajedrez.php` implementa reglas completas: jaque,
jaque mate, ahogado (empate), enroque corto/largo con las 3 condiciones
(nadie se movió, casillas libres, el rey ni pasa ni termina en jaque),
captura al paso, promoción automática a dama. La pieza clave del motor es
`rh_ajedrez_casilla_atacada()`: la reusan tanto la detección de jaque como
la validación de enroque.

**Deliberadamente no implementado** (documentado en el código): regla de 50
movimientos, triple repetición, empate por material insuficiente. El plazo
de turno (compartido) le pone un techo real a una partida que no termine
sola.

**IA a profundidad 2, no 3**: el factor de ramificación del ajedrez (~35)
es mucho mayor que el de damas (~7). En la verificación, profundidad 3 tardó
hasta ~0.9s por jugada desde la posición inicial — riesgoso para un request
síncrono. A profundidad 2 el promedio medido fue ~200ms.

**Piezas dibujadas con glifos Unicode** (♔♕♖♗♘♙ / ♚♛♜♝♞♟) en vez de 12 SVG a
mano — se ven nítidas sobre cualquier casilla usando `textShadow` del color
contrario como contorno. `CelebracionPatitas` (el confeti de huellitas al
ganar) se movió de `src/juego/huedamas/` a `src/juego/comun/`: es genérica,
y con Ajedrez como segundo consumidor real ya valía la pena.

Verificado igual que Damas: motor aislado (20 movimientos en la posición
inicial, jaque forzando a salir, enroque válido e inválido por casilla de
paso atacada, captura al paso, promoción, mate del pastor, ahogado con rey
solo), partidas completas por HTTP contra la IA (incluida una captura
determinística idéntica reproducida dos veces, primero por curl y después
confirmada clickeando en el browser), y limpieza de datos de prueba al
cerrar.

**Falta**: Ludo y Rummy, que necesitan el sistema de salas de hasta 4
jugadores (no existe todavía, se construye recién ahí).

## 4octies. HueLudo + salas de hasta 4 jugadores (2026-08-08)

Cuarto juego de la tanda y el primero que **no** es un duelo 1 contra 1: hasta
4 jugadores en la misma partida, con asientos completables por IA. Esto
obligó a construir una infraestructura nueva y genérica (`JuegoSala`,
`JuegoSalaJugador`) que Rummy va a reusar después sin tocarla — mismo
criterio de capas que ya separaba `inc/funciones/juegos.php` (genérico) de
`inc/funciones/damas.php`/`ajedrez.php` (específicos de cada juego).

**Esquema** (`sql/053_hueplay_salas.sql`): `JuegoSala` (código de invitación
de 6 caracteres sin 0/O/1/I/L, `MaxJugadores` 2-4, `CompletarConIA`,
`PoliticaAbandono` ENUM `ia`/`espera`/`expulsa`, `Tablero` **JSON** — no un
string de casillas como Damas/Ajedrez, porque Ludo no es una grilla
cuadrada) y `JuegoSalaJugador` (un asiento; `TomadoPorIA` se prende cuando la
política `ia` le toma el lugar a un humano que venció su turno, sin pisar su
`UserId` — así el historial sigue siendo cierto). También `JuegoHistorialPar`
(cuántas veces le ganaste/perdiste a cada persona, por juego — de a pares,
`UserIdA` siempre el menor de los dos UserId; **genérico**, así que
HueConecta/Damas/Ajedrez también empezaron a acumularlo desde
`rh_juego_cerrar_desafio_turnos()`).

**Arquitectura de la capa de salas** (`inc/funciones/salas.php`): sabe crear,
unirse por código, responder invitación, armar el orden de turno (barajado,
no por orden de llegada), cerrar y resolver un turno vencido según la
política — pero **no sabe nada de Ludo**. Construir el tablero inicial y
resolver "quién juega el turno completo de la IA" es responsabilidad del
juego específico (`inc/funciones/ludo.php`), invocado por dispatch en los
endpoints (`sala_iniciar.php`, `sala_ver.php`) — mismo patrón que
`desafio_crear.php` ya usaba para Damas/Ajedrez.

**Motor de Ludo** (`inc/funciones/ludo.php`): estado en JSON
`{"fichas":[...16],"consecutivosSeis":0,"dadoPendiente":null}`. Cada ficha
guarda su posición **relativa a su propio jugador** (no absoluta en el
anillo): `-1` corral, `0-50` las 51 casillas del camino compartido (que da
casi toda la vuelta a un anillo de 52 antes de doblar), `51-56` su tramo
final privado, `57` meta. 8 casillas seguras (las 4 entradas + una "estrella"
8 casillas después de cada una). Tres seises seguidos sin mover de verdad
pierden el turno. El endpoint `ludo_tirar.php` tira y calcula los
movimientos legales; si no hay ninguno, pasa el turno ahí mismo y encadena
lo que le toque jugar a la IA — `ludo_mover.php` aplica la ficha elegida y,
si no sacó 6, hace lo mismo. **Decisión de alcance**: la partida termina con
el PRIMER jugador que completa sus 4 fichas, no se juega por 2°/3° puesto
(documentado en el código) — el historial de a pares sólo puede registrar
"el ganador le ganó a cada humano", no el orden entre los que no ganaron.

**Frontend**: `sala-crear.tsx` (cantidad de jugadores, completar con IA,
política de abandono, plazo, buscador de invitados reusando
`rivales.php`), `sala-unirse.tsx` (pegar código o abrir el deep-link que
arma `sala-lobby` con `compartirPost`), `sala-lobby/[salaId].tsx` (quién
aceptó, iniciar), `salas.tsx` (bandeja: invitaciones/armando/tu
turno/esperando/terminadas) y `ludo.tsx` (el tablero). El tablero es SVG
puro en una grilla de 15x15 (`TableroLudo.tsx`, con las coordenadas del
camino/tramos/corrales escritas a mano una sola vez) + `Ficha.tsx`
(se reposiciona sola por `pos`, igual criterio que `PiezaDamas` con
fila/col) + `Dado.tsx`. Animar un tiro de varias casillas es la pantalla
actualizando `pos` de a un paso genuino con una espera chica entre medio
(`reproducirJugada` en `ludo.tsx`), no Ficha haciendo sub-pasos internos.

Verificado: motor aislado (34 casos — reparto, salida con 6, captura en
casilla no segura, no-captura en segura, tope exacto para entrar a meta,
victoria, 3 seises, heurística de IA, expulsión), infraestructura de salas
por curl (crear con código, unirse, responder, iniciar completando con IA,
y **las 3 políticas de abandono** forzando vencimiento con el cron), dos
partidas completas de punta a punta por HTTP (2 humanos + 2 IA hasta que
ganó la IA; 2 humanos solos hasta que ganó un humano, confirmando que el
historial de a pares sólo se actualiza cuando gana un humano), y en browser
(hub → salas → crear → lobby → invitación aceptada por otro usuario vía
curl → iniciar → tablero SVG con el conteo de piezas esperado → tirar dado →
"sin jugada, pasa el turno" → el rival jugó su turno por curl → volvió mi
turno → salió 6 → clic en una ficha resaltada → salió del corral y el turno
siguió siendo mío). Limpieza de datos de prueba (salas, partidas, historial,
contadores de perfil) verificada al final.

**Falta**: `inc/cli/salas_turnos_vencidos.php` está escrito y probado con el
cron manual, pero la tarea programada de Windows no se registró (ver
`AUTOMATIZACIONES_PENDIENTES.md`, item 8). Rummy queda para después, reusando
esta misma infraestructura de salas.

## 4nonies. HueRummy — el cuarto y último juego de la tanda (2026-08-08)

Reusa el 100% de la infraestructura de salas de Ludo (`inc/funciones/salas.php`,
`JuegoSala`/`JuegoSalaJugador`/`JuegoHistorialPar`) sin tocarla — mismo
patrón de dispatch por `JuegoCodigo` en `sala_iniciar.php`/`sala_ver.php`/el
cron. Sólo hizo falta sumar `'huerummy' => ['modo' => 'sala']` a `RH_JUEGOS`.

**Reglas**: Rummy de descarte clásico, mazo de 52 cartas sin comodines, 7
cartas de mano para cualquier cantidad de jugadores (2-4) — decisión de
alcance, igual criterio que las simplificaciones documentadas de Ludo. Un
turno es robar (mazo o tope del descarte) → bajar 0 o más juegos nuevos
(sets de igual valor y palo distinto, o corridas de 3+ del mismo palo) →
descartar. **No existe "jugar una carta suelta" sobre un meld ya bajado**
(ni propio ni ajeno) — cada juego se arma completo desde la mano en un solo
pedido y queda fijo en la mesa; es la simplificación de alcance más
importante del motor, documentada en el encabezado de
`inc/funciones/rummy.php`. Si el mazo se vacía se reforma solo con el
descarte (menos el tope, que sigue visible) — regla clásica. Si no queda
nada de dónde robar (mazo vacío y el descarte con 1 sola carta), la ronda se
corta y gana quien tenga menos "deadwood" (as=1, 2-10 su número, figuras=10).

**Información oculta — el cambio de arquitectura más importante de esta
entrega**: a diferencia de Ludo (donde el tablero entero es público), en
Rummy cada jugador sólo puede ver su propia mano. Esto obligó a sacar el
campo `tablero` de `rh_sala_serializar()` (antes mandaba `Tablero` crudo
para cualquier sala, lo cual en Rummy habría mostrado las cartas de todos a
cualquiera que mirara la respuesta JSON — se encontró y corrigió **antes**
de exponer ningún endpoint). Ahora `rh_sala_serializar()` siempre manda
`tablero: null`; Ludo lo vuelve a pegar entero después (`sala_ver.php`,
`sala_iniciar.php`, `ludo_tirar.php`, `ludo_mover.php`, ahí sí es seguro) y
Rummy manda por separado `estadoRummy` (`rh_rummy_estado_visible()`): mi
mano completa, sólo la CANTIDAD de cartas de cada rival, el mazo como
número, y lo que ya es público (descarte, melds en la mesa, fase).

**IA**: heurística greedy en `rh_rummy_ia_encontrar_melds()` — agrupa
primero sets (por valor) y después corridas (por palo) con lo que sobra; no
busca la combinación óptima entre las dos formas, documentado como
simplificación de alcance. Toma el descarte en vez del mazo sólo cuando esa
carta puntual le arma un meld de una.

**Frontend**: `src/juego/huerummy/Carta.tsx` (una carta con símbolo Unicode
de palo, no SVG a mano) y `ManoRivalOculta` (cartas boca abajo, para mostrar
cuántas tiene cada rival sin revelarlas). `sala-crear.tsx` ahora lee
`?juego=hueludo|huerummy` (antes estaba fijo a Ludo) y `salas.tsx` tiene dos
botones de crear. **Bug real encontrado y corregido durante la verificación
en browser**: las animaciones declarativas `entering`/`exiting`/`layout` de
Reanimated (usadas al principio en `Carta.tsx` para el pop de entrada) dejan
el elemento con `visibility: hidden` **para siempre** en este entorno web —
las cartas estaban en el DOM con el valor y el palo correctos, pero
invisibles (confirmado inspeccionando el `outerHTML`, no un problema de
datos). Se reemplazó por el mismo patrón ya probado en `PiezaDamas`/`Ficha`:
`useSharedValue` + `withTiming` en un `useEffect` al montar. **Ojo con esto
en cualquier componente nuevo**: no usar `entering`/`exiting`/`layout` de
Reanimated en este proyecto, ni en web ni claramente probado en nativo.

Verificado: motor aislado (92 aserciones — reparto sin duplicados, valor de
carta, sets/corridas válidas e inválidas, robar de mazo y de descarte,
reforma del mazo al vaciarse, bajar meld válido/inválido, descartar y
ganar, deadwood, heurística de IA, turno completo de IA), infraestructura
de salas por curl (crear, invitar, aceptar, iniciar completando con IA, las
3 políticas de abandono), una partida de 400 turnos por HTTP con un jugador
de prueba deliberadamente débil (nunca toma del descarte a propósito) que
sirvió para golpear la reforma del mazo y la cadena de IA cientos de veces
sin un solo error — y por eso, en vez de esperar a que esa partida lenta
terminara sola, los DOS caminos de cierre (alguien se queda sin cartas;
nadie tiene de dónde robar) se verificaron aparte con estado forzado a
mano, confirmando puntos, historial de a pares y contadores de perfil
correctos en cada uno. En browser: crear sala de HueRummy, invitación
aceptada por otro usuario vía curl, iniciar completando con IA, tablero con
las cartas visibles y legibles (ahí se encontró el bug de arriba), robar,
seleccionar, descartar, turno pasado correctamente al rival. Limpieza de
datos de prueba (incluida la reconstrucción exacta de puntos/nivel/partidas
jugadas desde `JuegoPartida`, no un ajuste aproximado) verificada al final.

**Con esto se cierran los 4 juegos pedidos**: Damas, Ajedrez, Ludo y Rummy,
todos con animación en cada acción, plazo de turno configurable, IA
opcional, y (Ludo/Rummy) salas de hasta 4 con historial de a pares.

**Build de Android hecho la misma noche** (2026-08-08): `.env` cambiado
temporalmente a `EXPO_PUBLIC_API_URL=https://redhuellitas.bitflow.com.ar/inc`
(y revertido a localhost después de compilar), `JAVA_HOME` al jbr de Android
Studio, `./gradlew assembleRelease` en `app-movil/android` — mismo comando
que documenta [[gotcha_java_home_gradle]]. Generó
`app-arm64-v8a-release.apk` (71 MB) y `app-armeabi-v7a-release.apk` (59 MB)
en `android/app/build/outputs/apk/release/`, firmados con el keystore de
debug (igual que siempre, no es un release de Play Store). No había celular
conectado por USB en ese momento para probar la instalación real — sólo se
verificó que el build terminó sin errores (`BUILD SUCCESSFUL`).

**iOS: no se pudo compilar** — no hay Mac/Xcode en esta máquina y `eas
whoami` da "Not logged in" (EAS Build necesita loguearse con la cuenta de
Expo del usuario, login interactivo que no se puede hacer sin su
intervención). Se dejó preparado: `app.json` ya tenía `ios.bundleIdentifier`,
y se agregaron los perfiles `ios-simulator` (sin costo, sólo pide `eas
login`) e `ios-preview` (necesita Apple Developer Program pago) a
`eas.json`. Pasos exactos para terminarlo en `AUTOMATIZACIONES_PENDIENTES.md`
item 9.

## 4decies. HueGotchi: se saca el 3D, entran 10 animales dibujados en 2D (2026-08-08)

Pedido: sacar "toda la animación fea" del perro y el gato en 3D, reemplazar
por un dibujo 2D animado, con al menos 10 animales — bien amistoso, pensado
para chicos, con animación en cada acción.

**Hallazgo clave, antes de escribir nada**: el motor de dibujo 2D **ya
existía**: `ProceduralPet.tsx` (SVG a mano, con morfología real por raza) ya dibujaba
al gato con silueta anatómica completa (torso/cabeza/patas/cola/cara,
patrones de pelaje, hasta una vista de tortuga lista y sin usar). Lo único
en 3D de verdad era el **perro** (GLB con esqueleto, Three.js) — el gato NO
era 3D, la memoria vieja que decía "orphaned" sobre este archivo estaba
desactualizada. Esto cambió todo el plan: en vez de construir un renderer
2D desde cero, alcanzó con **generalizarlo** a las 10 especies reales del
catálogo (`Especie` en `src/types/index.ts`: perro, gato, conejo, ave, pez,
hámster, cobayo, tortuga, hurón, otro) y sacar el resto (GLB, el "clay" 3D
viejo del gato con Three.js, los clips Lottie de terceros, el bridge de
Rive que nunca se llegó a renderizar).

**Arquitectura**: `HueSpecies` pasó a ser un alias de `Especie` (antes sólo
tenía 4 valores y todo lo demás caía en un "otro" genérico). La mayoría de
las especies nuevas (conejo, hurón, hámster, cobayo) reusan el mismo
esqueleto de cuadrúpedo genérico que ya tenían perro/gato — sólo hizo falta
sumar su `X_PROMEDIO` (morfología) en `domain/breeds.ts`; ave y pez sí
necesitaron un archetype propio (`Ave`/`Pez` en `ProceduralPet.tsx`) porque
su anatomía no entra en "torso + cabeza + 4 patas + cola". El sistema de
`Pose` (postura por acción, función pura de `t`) no se tocó — es agnóstico
del renderer, así que las 10 especies heredan gratis la animación de las 8
acciones existentes (comer, jugar, bañarse, dormir, trucos, visitas).

**Bugs reales encontrados recién al verse renderizado** (no se notan leyendo
el código, hay que mirar el dibujo):
- Orejas de conejo con `earSize` grande se superponían y leían como un
  cuerno de unicornio en vez de dos orejas — se les dio un `earStyle`
  propio (`larga_conejo`, redondeada, inclinada hacia afuera cada una para
  su lado) en vez de reusar el triángulo genérico.
- El nombre genérico cuando no hay raza cargada estaba hardcodeado a sólo
  "Gato"/"Perro" — cualquier otra especie (conejo, ave, etc.) mostraba
  "Perro" en la ficha. Ahora hay un nombre por especie.
- El campo `poke` (tocar la mascota para saludar) nunca disparaba la
  animación en el sistema de `Pose` — antes lo manejaba sólo el puente de
  Rive (que nunca se renderizaba), así que tocar la mascota no hacía nada
  visualmente. Se sacó el caso especial.
- Hámster/cobayo con las mismas proporciones que un perro chico seguían
  leyendo "perrito" en vez de "roedor redondo" — hizo falta bajar
  `legLength` casi a cero y subir `bodyWidth`/`headSize` bastante más de lo
  que parecía necesario en el papel.

**Limpieza**: se borraron `glb/`, `three/` (incluye `ClayPet3D.tsx`,
`buildChibiPet.ts` — nunca importados desde ningún lado, 1452 líneas
huérfanas), `lottie/` (clips de terceros), y de `rive/` todo menos
`contract.ts` (que sólo tiene los nombres de trigger, reusados como
vocabulario de acciones — no tiene nada de Rive de verdad). En
`hooks/useHueGotchiController.ts` se sacó el puente entero a Rive
(`handleRef`, `pushToRive`, `onRiveReady`/`onRiveError`, `riveSource`) —
estaba 100% muerto, `handleRef.current` era siempre `null` porque ningún
componente Rive se llegaba a montar nunca. En disco: 88 MB de fuentes 3D
crudas sin usar (STL/FBX de un gato y un perro) + 4 MB de gifs viejos +
2.1 MB de `.riv` + 2.6 MB de Lottie, todo sin ninguna referencia en el
código — `assets/juego/` bajó de >90 MB a 2.1 MB (sólo audio real).

**Verificado en browser** (creando mascotas de prueba para las 10
especies, borradas al final): las 10 renderizan reconocibles y sin
errores, sin regresión en gato/perro (Tom y Shaco, las mascotas reales de
prueba, siguen andando bien), la acción "Dar de comer" anima y suma XP
correctamente en una especie nueva (hámster). **No se pudo verificar en el
celular Xiaomi Mi 11i** que se dejó conectado — `adb devices` lo ve pero
en estado `unauthorized`: hace falta tocar "Permitir" en la pantalla del
propio celular, algo que no se puede hacer por USB/adb. Queda pendiente
para cuando el usuario esté para destrabarlo.

## 5. Convenciones técnicas a mantener

- **`sql/000_todo_schema.sql` es generado**: tras tocar `sql/`, correr
  `php inc/cli/build_schema.php --verificar` y commitear el resultado. Levanta una
  base descartable y comprueba que la instalación desde cero funcione de verdad.
  Hay skill `/bd-build-actual` con los errores típicos. Ya detectó dos problemas
  reales: números de migración duplicados, y `020` fallando en base nueva porque
  `001` fue editado después para incluir sus columnas.
- **bind_param**: contar el type-string carácter por carácter contra la lista de parámetros — hubo al menos un bug real por un carácter de más (Tránsito, detectado antes de testear). Es el error más fácil de cometer en este proyecto.
- **Migraciones SQL idempotentes**: todo `ALTER TABLE` que agrega columna/índice/FK se hace chequeando primero contra `INFORMATION_SCHEMA.COLUMNS` / `.STATISTICS` / `.TABLE_CONSTRAINTS` con un `IF(...)` + `PREPARE`/`EXECUTE`, para poder correr el script dos veces sin romper.
- **Denuncia polimórfica**: cualquier módulo nuevo que necesite ser denunciable agrega un `<Modulo>Id INT UNSIGNED NULL` al final de la cadena existente en `Denuncia`, y `denuncia_crear.php` se extiende con el nuevo parámetro opcional (mismo patrón en `DenunciaButtonStub.tsx` y `reportesApi.ts`).
- **Filtro geográfico por radio** (Tránsito/Donaciones/Veterinarias/Match): `radioKm` opcional en `{20,50,100}` → haversine en SQL, `HAVING DistanciaKm <= ? ORDER BY DistanciaKm ASC LIMIT 50` sin cursor; sin `radioKm` ("Todos") → normalmente cronológico con cursor, salvo en Match donde siempre se ordena por distancia (no tiene sentido un modo cronológico en un deck de swipe). Seguir reusando este patrón en las fases que vienen si aparece otro listado geolocalizado.
- **FAB de pantallas nuevas**: el botón flotante global "Reportar/Solicitar" (`FloatingReportButton.tsx`) ocupa `bottom-right` en toda la app `(app)`. Cualquier FAB nuevo va en otra esquina (se usó `bottom-left` en todos los listados de Fase 4) o necesita `zIndex` > 10.
- **i18n**: cualquier texto nuevo va en los 10 idiomas (`app-movil/src/i18n/{es,en,pt,fr,de,it,zh,ja,ko,ru}.json`) en la misma sesión que se agrega el feature, no después. Validar JSON con `php -r "json_decode(...)"` en los 10 tras cada edit.
- **Typed routes de Expo**: una pantalla nueva bajo `app/(app)/<modulo>/` no aparece en el `router.d.ts` generado hasta un ciclo completo de `preview_stop` + `preview_start` (un simple reload no alcanza).

---

## 6. Gotchas del entorno (verificación en browser)

- **`Alert.alert` es un no-op en `react-native-web`** (`node_modules/react-native-web/dist/exports/Alert/index.js`). Cualquier confirmación antes de una acción destructiva (eliminar, cambiar estado) nunca dispara el `onPress` al clickear en el browser preview. Para verificar el resultado igual: llamar el endpoint directo vía `fetch()` con el token de `localStorage` (key `red_huellitas_token`) usando `javascript_tool`, y confirmar el efecto recargando la pantalla.
- **⚠️ Clickear botones en el panel Browser cuelga el panel entero** (el gotcha que más tiempo costó, verificación de 6c): `computer` con `left_click` sobre un `Pressable` de RN-Web hace timeout de 30s **sistemáticamente**, y después quedan colgados también `screenshot`, `read_page` y `navigate`. Clickear un `TextInput` sí anda; el problema es específico de los botones. Parece un bug de la app ("el botón Ingresar no funciona") pero el handler nunca se dispara — `read_network_requests` muestra cero requests. Reiniciar la app, el server y hasta la máquina **no lo arregla**. Dos técnicas que sí funcionan:
  1. **Saltear el login inyectando el token**: sacar un token con `curl .../ajax/auth/login.php` y con `javascript_tool` hacer `localStorage.setItem` sobre las **3 variantes** de clave de AsyncStorage web (`red_huellitas_token`, `@RNAsyncStorage:red_huellitas_token`, `@AsyncStorage:red_huellitas_token`), después `navigate` para recargar. La app arranca autenticada. Para cambiar de usuario, pisar el token y recargar.
  2. **Clickear por JS**: `javascript_tool` disparando la secuencia completa que espera RN-Web (`pointerdown` → `mousedown` → `pointerup` → `mouseup` → `click`, con `bubbles:true, cancelable:true, pointerId:1, isPrimary:true` y `clientX/clientY` del centro del `getBoundingClientRect()`) sobre el nodo hoja con el texto del botón. Dispara los handlers de React de verdad (confirmado viendo el POST real en `read_network_requests`).
  Recuperación cuando el panel ya se trabó: `tabs_create` + `navigate` en la pestaña nueva. Y **"Claude in Chrome" no sirve como alternativa** — corre fuera del sandbox y no alcanza ni `localhost:8081` ni el Apache de XAMPP.
- **Upload de fotos SÍ se puede probar en browser**: inyectar un `File` real vía `DataTransfer` sobre el `<input type="file" style="display:none">` que genera `expo-image-picker` en web, disparar `change`. Puede aparecer un error no fatal de React ("Failed to execute 'removeChild'") — es inofensivo, cerrar el overlay y seguir.
- **curl con archivos**: `curl -F` está roto en este entorno git-bash con `CURLFile` (falla con "operation aborted by callback" incluso contra un endpoint de eco trivial). Usar el patrón de construir el `multipart/form-data` a mano (boundary + `Content-Disposition` + `file_get_contents`) — hay un ejemplo reusable de esto que se fue recreando cada sesión en el scratchpad; conviene guardarlo en el repo (ej. `scripts/post_multipart_raw.php`) si se va a seguir usando en Fase 6+.
- **localStorage compartido entre tabs**: dos tabs del browser preview apuntando al mismo origen (`localhost:8081`) comparten el mismo `localStorage` — no se puede simular 2 sesiones reales logueadas a la vez así (el segundo `setItem` pisa al primero silenciosamente). Para flujos bilaterales (chat, match, cualquier interacción entre 2 usuarios), usar 1 tab real con clicks genuinos para un lado y `fetch()` directo con el token del otro usuario para simular sus acciones (mismo patrón que el gotcha de `Alert.alert`), recargando la tab real después de cada acción simulada para ver el estado actualizado.
- **Geolocalización en browser preview**: para cualquier feature que pida ubicación (`expo-location`), hay que mockear `navigator.permissions.query` y `navigator.geolocation.getCurrentPosition` vía `javascript_tool` **antes** de la acción — y **se pierde en cada `navigate()` completo**, hay que reinyectarlo después de cada carga de página nueva.
- **Base de datos**: el nombre real es `huellitas`, no "red_huellitas" (confirmado en `inc/funciones/bd.php`) — es un error fácil de cometer al escribir comandos `mysql` a mano.
- **XAMPP no siempre está corriendo** al empezar sesión — arrancar `/c/xampp/mysql_start.bat` y `/c/xampp/apache_start.bat` en background antes de cualquier test.
- **Inserts SQL manuales con acentos**: usar `mysql --default-character-set=utf8mb4` si se inserta texto con tildes/ñ a mano, si no queda mojibake.

---

## 7. Infraestructura pendiente (no urgente, ver detalle en `AUTOMATIZACIONES_PENDIENTES.md`)

- Tareas programadas de Windows (los 3 scripts CLI están hechos y probados; falta registrarlos): ingesta de Noticias (`inc/cli/ingestar_noticias.php`), recordatorios del minijuego (`inc/cli/juego_recordatorios.php`) y limpieza de Historias vencidas (`inc/cli/limpiar_historias.php`).
- Subir `upload_max_filesize`/`post_max_size` en `php.ini` (actual 40M, necesario 80M para videos de Shorts de hasta 60MB).
- `npx eas init` para que el push funcione (sin `extra.eas.projectId` ningún dispositivo registra token y **todo el push del proyecto está inactivo**).
- Revisar límites de `php.ini` reales del hosting antes de producción.
- ~~**Deploy a producción**~~ — **HECHO (2026-09-01)**, ver `[[proyecto_deploy_produccion]]` en la memoria persistente o el resumen abajo.

Ninguna de estas bloquea seguir con Fase 6 en desarrollo local.

---

## 8. Deploy a producción — hecho (2026-09-01)

`inc/ajax`, `inc/funciones`, `inc/cli`, `inc/templates` y `sql/` sincronizados
a `redhuellitas.bitflow.com.ar` y la migración completa (`000_todo_schema.sql`,
453 sentencias) corrida contra la base real, sin SSH ni Git en el hosting —
mecanismo: un script PHP de un solo uso subido por la API de archivos de
Hostinger (TUS), que baja el zip público de GitHub, copia esas carpetas
(nunca `inc/config/`, `uploads/`, ni `app-movil/`) y corre la migración. Se
neutralizó (pisado con un stub 410) apenas terminó — no queda un endpoint de
deploy vivo.

**Dos bugs reales de producción, preexistentes, encontrados y arreglados en
el camino** (no los causó este deploy):
1. `bd.php` de producción tenía el `$dbname` correcto en el archivo pero
   `require` seguía viendo un valor viejo (`opcache.file_cache` sirviendo
   bytecode cacheado; `opcache_reset()` no alcanza porque esa caché vive en
   disco, no en memoria) — la API real probablemente no conectaba a la base
   en ningún request desde que se creó el archivo. Se arregló borrando y
   reescribiendo `bd.php` (mismo contenido, inode nuevo).
2. `sql/000_todo_schema.sql` no es portable tal cual a este hosting: arranca
   con `CREATE DATABASE IF NOT EXISTS huellitas` + `USE huellitas;`
   (convención de nombre local), pero en Hostinger la base real es
   `u289831705_huellitas` (prefijo con el username de la cuenta) y el
   usuario de MySQL no tiene permiso para crear/usar una base llamada
   "huellitas" a secas. Hay que sacar esas 2 sentencias antes de correr el
   archivo en cualquier hosting con ese mismo prefijo de nombre.

**Verificado con curl contra producción real**: `login.php` devuelve JSON
limpio (no un error crudo de MySQL), `admin/resumen.php` (antes 404, ni
existía) ahora responde "No autenticado" correctamente, igual
`veterinarias/listar.php`.

**Gaps que quedan, preexistentes, degradan con gracia (no rotos por este
deploy)**:
- Sin `vendor/` (composer) → comprobantes PDF y emails de Fase 6d en 503.
  No se pudo correr `composer install` ahí (no hay SSH/exec disponible en
  las herramientas de hosting usadas).
- Sin `inc/config/mapa.local.php` → mapa cae directo a MapLibre.
- Sin `inc/config/mercadopago.local.php` → suscripción/comisión de pedidos
  en modo "coordinar manualmente".
