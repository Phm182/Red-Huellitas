import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mapaApi } from '../../../src/api/mapaApi';
import { MapaLienzo, sesionMapaViva } from '../../../src/components/mapa/MapaLienzo';
import { MAPA_TIPOS, MAPA_TIPO_POR_CLAVE } from '../../../src/types/mapa';
import type { MapaPunto, MapaSesion, MapaTipo } from '../../../src/types/mapa';
import { APP_TAB_BAR_HEIGHT } from '../../../src/navigation/chrome';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { useMiUbicacion } from '../../../src/hooks/useMiUbicacion';
import { hapticLeve } from '../../../src/utils/haptics';
import {
  anclarSesion,
  claveMapa,
  decidirSesion,
  guardarCacheMapa,
  guardarSesionCache,
  leerCacheMapa,
  leerSesionCache,
  limpiarCacheMapa,
  marcarForzado,
  proximoForzado,
} from '../../../src/utils/mapaCache';
import { rhMediaUrl } from '../../../src/utils/media';

const RADIOS = [2, 5, 10, 25, 50];

/**
 * El mapa: todo lo que se ofrece o se pide, alrededor tuyo.
 *
 * Cada punto se dibuja donde está la publicación, no donde está el teléfono.
 * Es la diferencia que hace que el mapa sirva: un animal en adopción sigue
 * estando en el mismo barrio aunque su dueño se haya ido de viaje.
 */
export default function MapaScreen() {
  const { t } = useTranslation();
  const { colors, theme } = useTheme();
  const esOscuro = theme === 'dark';
  const insets = useSafeAreaInsets();

  // Deep link: /(app)/mapa?lat=..&lng=..&zoom=.. abre centrado en ese punto.
  // Lo usan los botones "Ver en mapa" de veterinarias, refugios y campañas.
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const destino =
    params.lat && params.lng
      ? { lat: Number(params.lat), lng: Number(params.lng) }
      : null;

  const [sesion, setSesion] = useState<MapaSesion | null>(null);
  const [centro, setCentro] = useState<{ lat: number; lng: number } | null>(null);
  // Posición real del GPS, separada del centro: el centro se mueve al
  // arrastrar el mapa, y "vos estás acá" no debe moverse con él.
  // El hook escucha el GPS y se queda con la lectura más precisa; una sola
  // llamada devolvía la de red, con cuadras de error (ver useMiUbicacion).
  const { fijacion, estado: estadoGps, buscar: buscarUbicacion } = useMiUbicacion();
  const miUbicacion = fijacion ? { lat: fijacion.lat, lng: fijacion.lng } : null;
  const [puntos, setPuntos] = useState<MapaPunto[]>([]);
  const [porTipo, setPorTipo] = useState<Partial<Record<MapaTipo, number>>>({});
  const [radioKm, setRadioKm] = useState(10);
  const [tipos, setTipos] = useState<MapaTipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seleccion, setSeleccion] = useState<MapaPunto[] | null>(null);
  const [irA, setIrA] = useState<{ lat: number; lng: number; nonce: number } | null>(null);
  const [avisoGps, setAvisoGps] = useState<string | null>(null);
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  // La cámara acompaña al usuario recién cuando él lo pide; arrastrar el mapa
  // lo apaga, porque en ese momento está mirando otra cosa a propósito.
  const [seguirme, setSeguirme] = useState(false);

  // El centro con el que se pidieron los puntos, para no volver a pedir por un
  // arrastre de dos cuadras.
  const centroPedido = useRef<{ lat: number; lng: number } | null>(null);

  // --- Arranque: motor + ubicación ----------------------------------------
  useEffect(() => {
    let vivo = true;

    (async () => {
      const modo = esOscuro ? 'oscuro' : 'claro';

      // 1) Si el mapa de una visita anterior sigue montado, se reusa su sesión
      //    y NO se le pide otra al servidor: pedirla descontaría una carga del
      //    presupuesto por algo que el proveedor no va a cobrar, porque no se
      //    crea ningún mapa nuevo.
      let sesionUsada = sesionMapaViva(esOscuro);

      // 2) Si no, la que quedó guardada del ancla. Mientras el usuario siga
      //    dentro del radio no se baja mapa nuevo nunca (ver mapaCache).
      if (!sesionUsada) {
        const guardada = await leerSesionCache<MapaSesion>(modo);
        if (guardada) sesionUsada = guardada;
      }

      // 3) Recién si no hay nada, se gasta una carga.
      if (!sesionUsada) {
        const resSesion = await mapaApi.sesion(modo);
        if (!vivo) return;
        if (resSesion.success && resSesion.data) {
          sesionUsada = resSesion.data;
          await guardarSesionCache(modo, resSesion.data);
        } else {
          setError(resSesion.message);
          setCargando(false);
          return;
        }
      }

      if (!vivo) return;
      setSesion(sesionUsada);

      // Ubicación: si la deniegan, el backend cae a la zona guardada del
      // usuario, así que el mapa igual abre en algún lugar con sentido.
      const fix = await buscarUbicacion();
      const coords = fix ? { lat: fix.lat, lng: fix.lng } : null;
      if (!vivo) return;

      // Con la ubicación ya en mano se revisa el ancla. Si el usuario se mudó
      // de ciudad —más de 50 km— ahí sí vale bajar un mapa nuevo; si no, el
      // ancla se planta acá la primera vez y no se vuelve a gastar.
      const decision = await decidirSesion(coords);
      if (!vivo) return;
      if (decision.pedir && decision.motivo === 'lejos') {
        const resSesion = await mapaApi.sesion(modo);
        if (vivo && resSesion.success && resSesion.data) {
          setSesion(resSesion.data);
          await guardarSesionCache(modo, resSesion.data);
          await anclarSesion(coords);
        }
      } else if (decision.motivo === 'sin_ancla') {
        await anclarSesion(coords);
      }

      // Un destino explícito gana sobre el GPS: si te mandaron a ver una
      // veterinaria puntual, centrar en vos sería perderla de vista.
      if (destino) {
        setCentro(destino);
        setIrA({ ...destino, nonce: Date.now() });
      } else if (coords) {
        // Sólo si hubo GPS. Poner `null` acá desmontaba el mapa que ya estaba
        // dibujado con la zona del perfil: se veía aparecer y, unos segundos
        // más tarde —cuando la búsqueda de ubicación se rendía—, desaparecer.
        setCentro(coords);
      }
    })();

    return () => {
      vivo = false;
    };
  }, [esOscuro]);

  // --- Traer puntos --------------------------------------------------------
  const cargarPuntos = useCallback(
    async (c: { lat: number; lng: number } | null, forzar = false) => {
      setCargando(true);
      setError(null);

      // Caché del día: las publicaciones no cambian tanto como para golpear
      // siete tablas cada vez que se entra y se sale de la pantalla.
      const clave = c ? claveMapa(c, radioKm, tipos) : null;
      if (clave && !forzar) {
        const guardado = await leerCacheMapa(clave);
        if (guardado) {
          setPuntos(guardado.puntos);
          setPorTipo(guardado.porTipo);
          setCentro(guardado.centro);
          centroPedido.current = guardado.centro;
          setCargando(false);
          return;
        }
      }

      const res = await mapaApi.listar({
        lat: c?.lat ?? null,
        lng: c?.lng ?? null,
        radioKm,
        tipos,
      });
      if (res.success && res.data) {
        setPuntos(res.data.puntos);
        setPorTipo(res.data.porTipo);
        setCentro(res.data.centro);
        centroPedido.current = res.data.centro;
        void guardarCacheMapa(claveMapa(res.data.centro, radioKm, tipos), {
          centro: res.data.centro,
          puntos: res.data.puntos,
          porTipo: res.data.porTipo,
        });
      } else {
        setError(res.message);
      }
      setCargando(false);
    },
    [radioKm, tipos]
  );

  /** Tirar el caché y volver a pedir. Para el botón de actualizar. */
  /**
   * Actualizar.
   *
   * Los puntos se refrescan siempre: salen del servidor propio y no cuestan
   * nada. El **mapa** en cambio sólo se vuelve a bajar una vez por semana,
   * aunque se apriete el botón todos los días: sin ese tope, alguien apretando
   * por costumbre se comería el presupuesto mensual de todos en una tarde.
   */
  const refrescar = useCallback(async () => {
    hapticLeve();
    await limpiarCacheMapa();
    await cargarPuntos(centro, true);

    const modo = esOscuro ? 'oscuro' : 'claro';
    const decision = await decidirSesion(miUbicacion, true);
    if (decision.pedir) {
      const res = await mapaApi.sesion(modo);
      if (res.success && res.data) {
        setSesion(res.data);
        await guardarSesionCache(modo, res.data);
        await anclarSesion(miUbicacion);
        if (decision.motivo === 'forzado') await marcarForzado();
      }
      return;
    }

    // No se bajó mapa nuevo: se dice por qué, así el botón no parece roto.
    const cuando = await proximoForzado();
    if (cuando) {
      setAvisoGps(
        t('mapa.forzadoEnEspera', {
          dias: Math.max(1, Math.ceil((cuando - Date.now()) / 86400000)),
        })
      );
    }
  }, [cargarPuntos, centro, esOscuro, miUbicacion, t]);

  useEffect(() => {
    if (!sesion) return;
    cargarPuntos(centro);
    // `centro` a propósito fuera de las dependencias: si entrara, cada
    // movimiento del mapa dispararía una recarga en cascada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sesion, cargarPuntos]);

  /** Al soltar el mapa, sólo recargar si se alejó de verdad del último pedido. */
  const onMover = useCallback(
    (c: { lat: number; lng: number }) => {
      // Si el mapa se movió porque el usuario lo arrastró, deja de seguirlo:
      // insistir en volver a centrarlo sería pelearle el control.
      setSeguirme(false);

      const previo = centroPedido.current;
      if (!previo) return;
      const dLat = Math.abs(c.lat - previo.lat);
      const dLng = Math.abs(c.lng - previo.lng);
      // ~2 km. Menos que eso ya está cubierto por el radio que se pidió.
      if (dLat > 0.02 || dLng > 0.02) {
        cargarPuntos(c);
      }
    },
    [cargarPuntos]
  );

  /**
   * Centrar en mi ubicación real.
   *
   * Va como acción explícita y no automática al abrir: el permiso de ubicación
   * en web sólo se puede pedir desde un gesto del usuario, y pedirlo de arranque
   * hace que muchos lo nieguen sin entender para qué era.
   */
  const centrarEnMi = useCallback(async () => {
    hapticLeve();
    setAvisoGps(null);
    setSeguirme(true);

    // Si ya sabemos dónde estás, se vuela ahí en el acto y recién después se
    // pide una lectura mejor: esperar el GPS con la pantalla quieta hacía
    // parecer que el botón no hacía nada.
    if (fijacion) {
      setIrA({ lat: fijacion.lat, lng: fijacion.lng, nonce: Date.now() });
    }

    const fix = await buscarUbicacion();
    if (fix) {
      setIrA({ lat: fix.lat, lng: fix.lng, nonce: Date.now() });
    }
  }, [buscarUbicacion, fijacion]);

  // El aviso sale del estado del hook y no de un catch suelto: antes se
  // guardaba en `avisoGps` y no se dibujaba en ningún lado, así que negar el
  // permiso dejaba el botón mudo.
  useEffect(() => {
    if (estadoGps === 'denegada') setAvisoGps(t('mapa.gpsDenegado'));
    else if (estadoGps === 'servicios_apagados') setAvisoGps(t('mapa.gpsApagado'));
    else if (estadoGps === 'solo_aproximada') setAvisoGps(t('mapa.gpsAproximado'));
    else if (estadoGps === 'error') setAvisoGps(t('mapa.gpsError'));
    else if (estadoGps === 'vaga') setAvisoGps(t('mapa.gpsVago'));
    else if (estadoGps === 'siguiendo') setAvisoGps(null);
  }, [estadoGps, t]);

  /**
   * "Todas las publicaciones": abre el detalle de capas la primera vez, y si ya
   * estaba abierto con todo seleccionado, limpia la selección.
   */
  const alternarTodas = () => {
    hapticLeve();
    if (!filtrosAbiertos) {
      setFiltrosAbiertos(true);
      return;
    }
    if (tipos.length > 0) setTipos([]);
    else setFiltrosAbiertos(false);
  };

  const alternarTipo = (tipo: MapaTipo) => {
    hapticLeve();
    setTipos((prev) => (prev.includes(tipo) ? prev.filter((x) => x !== tipo) : [...prev, tipo]));
  };

  const totalVisible = puntos.length;
  const hayFiltro = tipos.length > 0;

  const chips = useMemo(
    () =>
      MAPA_TIPOS.map((meta) => {
        const activo = tipos.includes(meta.tipo);
        const cantidad = porTipo[meta.tipo] ?? 0;
        return (
          <Pressable
            key={meta.tipo}
            onPress={() => alternarTipo(meta.tipo)}
            style={[
              styles.chip,
              {
                borderColor: meta.color,
                backgroundColor: activo ? meta.color : 'rgba(0,0,0,0.35)',
              },
            ]}
          >
            <Ionicons
              name={meta.icon}
              size={13}
              color={activo ? '#fff' : meta.color}
              style={{ marginRight: 5 }}
            />
            <Text style={[styles.chipTexto, { color: activo ? '#fff' : meta.color }]}>
              {t(meta.labelKey)}
            </Text>
            {cantidad > 0 ? (
              <View style={[styles.chipBadge, { backgroundColor: activo ? 'rgba(255,255,255,.25)' : meta.color }]}>
                <Text style={styles.chipBadgeTexto}>{cantidad}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      }),
    [tipos, porTipo, t]
  );

  return (
    <View style={[styles.raiz, { backgroundColor: colors.background }]}>
      {/* Lienzo al fondo, ocupando todo */}
      <View style={StyleSheet.absoluteFill}>
        {sesion && centro ? (
          <MapaLienzo
            sesion={sesion}
            puntos={puntos}
            centro={centro}
            miUbicacion={miUbicacion}
            precisionM={fijacion?.precisionM ?? null}
            seguirme={seguirme}
            irA={irA}
            oscuro={esOscuro}
            onSeleccion={setSeleccion}
            onMover={onMover}
          />
        ) : (
          <View style={styles.centrado}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
      </View>

      {/* --- Arriba: sólo volver, contador y acciones --- */}
      <View style={[styles.superior, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.filaTitulo} pointerEvents="box-none">
          <Pressable
            onPress={() => router.back()}
            style={styles.botonRedondo}
            accessibilityRole="button"
            accessibilityLabel={t('common.close')}
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>

          <View style={styles.pastilla}>
            <Ionicons name="planet" size={15} color="#4CC9F0" />
            <Text style={styles.pastillaTexto}>
              {cargando ? t('mapa.buscando') : t('mapa.resultados', { cantidad: totalVisible })}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pressable
              onPress={centrarEnMi}
              style={styles.botonRedondo}
              disabled={estadoGps === 'buscando'}
              accessibilityRole="button"
              accessibilityLabel={t('mapa.centrarEnMi')}
            >
              {estadoGps === 'buscando' ? (
                <ActivityIndicator size="small" color="#4CC9F0" />
              ) : (
                <Ionicons
                  name={estadoGps === 'siguiendo' || estadoGps === 'vaga' ? 'locate' : 'locate-outline'}
                  size={18}
                  color={miUbicacion ? '#4CC9F0' : '#fff'}
                />
              )}
            </Pressable>
            <Pressable
              onPress={refrescar}
              style={styles.botonRedondo}
              accessibilityRole="button"
              accessibilityLabel={t('common.retry')}
            >
              <Ionicons name="refresh" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Qué capas se ven. Va arriba: es lo que define qué estás mirando,
            y abajo competía con los chips de radio y con la barra. */}
        <View style={styles.chipsFila}>
          <Pressable onPress={alternarTodas} style={styles.todasWrap}>
            <LinearGradient
              colors={['#FF4D6D', '#FF9F1C', '#FFD23F', '#06D6A0', '#4CC9F0', '#7B61FF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.todas}
            >
              <Ionicons name={filtrosAbiertos ? 'chevron-up' : 'chevron-down'} size={14} color="#fff" />
              <Text style={styles.todasTexto}>{t('mapa.todasLasPublicaciones')}</Text>
              <View style={styles.todasBadge}>
                <Text style={styles.todasBadgeTexto}>{totalVisible}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        {filtrosAbiertos ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsFila}>
            {chips}
          </ScrollView>
        ) : null}
      </View>

      {/* --- Abajo: sólo el radio, donde llega el pulgar --- */}
      <View style={[styles.inferior, { bottom: APP_TAB_BAR_HEIGHT + insets.bottom + 10 }]} pointerEvents="box-none">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsFila}>
          {RADIOS.map((r) => (
            <Pressable
              key={r}
              onPress={() => {
                hapticLeve();
                setRadioKm(r);
              }}
              style={[
                styles.chipRadio,
                {
                  borderColor: radioKm === r ? '#4CC9F0' : 'rgba(255,255,255,.25)',
                  backgroundColor: radioKm === r ? 'rgba(76,201,240,.25)' : 'rgba(0,0,0,.45)',
                },
              ]}
            >
              <Text style={[styles.chipTexto, { color: radioKm === r ? '#4CC9F0' : '#fff' }]}>
                {r} km
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* El aviso del GPS. Existe porque sin esto negar el permiso dejaba el
          botón de centrar sin ninguna respuesta visible. */}
      {avisoGps ? (
        <Pressable
          onPress={() => setAvisoGps(null)}
          style={[styles.aviso, { top: insets.top + 108, backgroundColor: 'rgba(200,120,20,.92)' }]}
        >
          <Text style={styles.avisoTexto}>{avisoGps}</Text>
        </Pressable>
      ) : null}

      {/* Aviso de que se está usando el motor de respaldo */}
      {sesion?.motor === 'maplibre' && sesion.motivo === 'sin_cupo' ? (
        <View style={[styles.aviso, { top: insets.top + 150 }]}>
          <Text style={styles.avisoTexto}>{t('mapa.avisoSinCupo')}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.aviso, { top: insets.top + 150, backgroundColor: 'rgba(200,40,40,.9)' }]}>
          <Text style={styles.avisoTexto}>{error}</Text>
        </View>
      ) : null}

      {/* --- Hoja inferior: lo que se tocó en el mapa --- */}
      {seleccion && seleccion.length > 0 ? (
        <View
          style={[
            styles.hoja,
            {
              backgroundColor: colors.surface,
              // La barra de abajo sigue montada en esta pantalla: sin este
              // margen, los últimos resultados quedan tapados por ella.
              bottom: APP_TAB_BAR_HEIGHT + insets.bottom,
              paddingBottom: 16,
            },
          ]}
        >
          <View style={styles.hojaAsa} />
          <View style={styles.hojaCabecera}>
            <Text style={[styles.hojaTitulo, { color: colors.text }]}>
              {t('mapa.enEstePunto', { cantidad: seleccion.length })}
            </Text>
            <Pressable onPress={() => setSeleccion(null)} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView style={{ maxHeight: 330 }} showsVerticalScrollIndicator={false}>
            {seleccion.map((p) => {
              const meta = MAPA_TIPO_POR_CLAVE[p.tipo];
              return (
                <Pressable
                  key={`${p.tipo}-${p.id}`}
                  onPress={() => {
                    setSeleccion(null);
                    router.push(p.ruta as never);
                  }}
                  style={[styles.item, { borderBottomColor: colors.border }]}
                >
                  {p.fotoPath ? (
                    <Image source={{ uri: rhMediaUrl(p.fotoPath) }} style={styles.itemFoto} />
                  ) : (
                    <View style={[styles.itemFoto, styles.itemFotoVacia, { backgroundColor: meta.color + '33' }]}>
                      <Ionicons name={meta.icon} size={20} color={meta.color} />
                    </View>
                  )}

                  <View style={{ flex: 1 }}>
                    <View style={styles.itemTipoFila}>
                      <View style={[styles.itemTipoPunto, { backgroundColor: meta.color }]} />
                      <Text style={[styles.itemTipo, { color: meta.color }]}>
                        {t(meta.labelKey).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.itemTitulo, { color: colors.text }]} numberOfLines={1}>
                      {p.titulo}
                    </Text>
                    {p.subtitulo ? (
                      <Text style={[styles.itemSub, { color: colors.textMuted }]} numberOfLines={1}>
                        {p.subtitulo}
                      </Text>
                    ) : null}
                    <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
                      {p.distanciaKm} km
                      {p.zonaDescripcion ? ` · ${p.zonaDescripcion}` : ''}
                      {!p.ubicacionExacta ? ` · ${t('mapa.ubicacionAproximada')}` : ''}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raiz: { flex: 1 },
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  superior: { position: 'absolute', top: 0, left: 0, right: 0, gap: 8 },
  filaTitulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  botonRedondo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.45)',
  },
  pastilla: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,.55)',
    borderWidth: 1,
    borderColor: 'rgba(76,201,240,.4)',
  },
  pastillaTexto: { color: '#fff', fontWeight: '700', fontSize: 13 },

  inferior: { position: 'absolute', left: 0, right: 0, gap: 8 },
  // `alignSelf` para que la píldora mida lo que mide su texto: estirada a todo
  // el ancho parecía una barra de estado y no un botón que se toca.
  todasWrap: { borderRadius: 20, overflow: 'hidden', alignSelf: 'flex-start' },
  todas: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  todasTexto: { color: '#fff', fontWeight: '800', fontSize: 13 },
  todasBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.35)',
  },
  todasBadgeTexto: { color: '#fff', fontWeight: '800', fontSize: 11 },
  chipsFila: { paddingHorizontal: 12, gap: 7 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipTexto: { fontSize: 12, fontWeight: '700' },
  chipBadge: {
    marginLeft: 5,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  chipBadgeTexto: { color: '#fff', fontSize: 10, fontWeight: '800' },
  chipRadio: { borderWidth: 1.2, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },

  aviso: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,.75)',
  },
  avisoTexto: { color: '#fff', fontSize: 12, textAlign: 'center' },

  hoja: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: -6 },
    elevation: 20,
  },
  hojaAsa: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,.5)',
    marginBottom: 10,
  },
  hojaCabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  hojaTitulo: { fontSize: 15, fontWeight: '700' },

  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  itemFoto: { width: 52, height: 52, borderRadius: 12 },
  itemFotoVacia: { alignItems: 'center', justifyContent: 'center' },
  itemTipoFila: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 1 },
  itemTipoPunto: { width: 6, height: 6, borderRadius: 3 },
  itemTipo: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  itemTitulo: { fontSize: 15, fontWeight: '700' },
  itemSub: { fontSize: 12.5, marginTop: 1 },
  itemMeta: { fontSize: 11, marginTop: 2 },
});
