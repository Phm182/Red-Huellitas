import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { juegoApi } from '../../../src/api/juegoApi';
import { MascotaViva } from '../../../src/components/juego/MascotaViva';
import { StatBar } from '../../../src/components/StatBar';
import { JuegoAccion, JuegoAvatarEstado, MascotaJuego } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

const ACCIONES: { tipo: JuegoAccion; icono: string }[] = [
  { tipo: 'alimentar', icono: '🍖' },
  { tipo: 'jugar', icono: '🎾' },
  { tipo: 'banar', icono: '🛁' },
  { tipo: 'dormir', icono: '😴' },
];

/** "1h 20m" / "45m" / "30s" — para el contador de cooldown. */
function formatearEspera(segundos: number): string {
  if (segundos >= 3600) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  if (segundos >= 60) {
    return `${Math.floor(segundos / 60)}m`;
  }
  return `${segundos}s`;
}

export default function JuegoScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { mascotaId } = useLocalSearchParams<{ mascotaId: string }>();

  const [juego, setJuego] = useState<MascotaJuego | null>(null);
  const [loading, setLoading] = useState(true);
  const [accionEnCurso, setAccionEnCurso] = useState<JuegoAccion | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [celebrar, setCelebrar] = useState(0);
  // Qué está actuando la mascota. Va aparte de accionEnCurso porque la
  // animación tiene que durar lo suyo aunque la request vuelva en 200ms.
  const [actuando, setActuando] = useState<JuegoAccion | null>(null);
  const [ahora, setAhora] = useState(Date.now());

  const [avatar, setAvatar] = useState<JuegoAvatarEstado | null>(null);
  const [avatarBusy, setAvatarBusy] = useState<'generar' | 'quitar' | null>(null);

  // Instante en que se leyó el estado: los cooldowns vienen en segundos desde
  // el servidor, así que se descuentan localmente contra este punto.
  const leidoEn = useRef(Date.now());

  const cargarAvatar = useCallback(() => {
    juegoApi.avatarEstado(Number(mascotaId)).then((res) => {
      if (res.success && res.data) {
        setAvatar(res.data.avatar);
      }
    });
  }, [mascotaId]);

  const cargar = useCallback(() => {
    setLoading(true);
    juegoApi.estado(Number(mascotaId)).then((res) => {
      if (res.success && res.data) {
        setJuego(res.data.juego);
        leidoEn.current = Date.now();
        setAhora(Date.now());
      } else {
        setMensaje(res.message);
      }
      setLoading(false);
    });
    cargarAvatar();
  }, [mascotaId, cargarAvatar]);

  const onGenerarAvatar = async () => {
    if (avatarBusy !== null) return;
    setMensaje(null);
    setAvatarBusy('generar');
    const res = await juegoApi.avatarGenerar(Number(mascotaId));
    setAvatarBusy(null);

    // 402 = no tiene suscripción activa. Mostrarle un error sin salida sería
    // una pared: se lo lleva directo a los planes.
    if (res.status === 402) {
      router.push('/(app)/suscripcion' as never);
      return;
    }

    if (res.success && res.data) {
      setJuego(res.data.juego);
      setCelebrar((c) => c + 1);
    }
    setMensaje(res.message);
    cargarAvatar();
  };

  const onQuitarAvatar = async () => {
    if (avatarBusy !== null) return;
    setMensaje(null);
    setAvatarBusy('quitar');
    const res = await juegoApi.avatarQuitar(Number(mascotaId));
    setAvatarBusy(null);
    if (res.success && res.data) {
      setJuego(res.data.juego);
    }
    cargarAvatar();
  };

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  // Tick para que los contadores de cooldown bajen solos.
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onAccion = async (tipo: JuegoAccion) => {
    if (accionEnCurso !== null) return;
    setMensaje(null);
    setAccionEnCurso(tipo);
    setActuando(tipo);
    // 'dormir' se queda hasta que el usuario haga otra cosa; el resto vuelve
    // al reposo cuando termina el gesto.
    if (tipo !== 'dormir') {
      setTimeout(() => setActuando(null), 2600);
    }
    const res = await juegoApi.accion(Number(mascotaId), tipo);
    setAccionEnCurso(null);

    if (res.success && res.data) {
      setJuego(res.data.juego);
      leidoEn.current = Date.now();
      setAhora(Date.now());
      setCelebrar((c) => c + 1);
      setMensaje(res.data.subioNivel ? t('juego.subioNivel', { nivel: res.data.juego.nivel }) : null);
    } else {
      setMensaje(res.message);
    }
  };

  if (loading) {
    return <SkeletonList />;
  }

  if (!juego) {
    return (
      <View style={[styles.centrado, { backgroundColor: colors.background, padding: 32 }]}>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{mensaje ?? t('juego.sinMascotas')}</Text>
      </View>
    );
  }

  const segundosPasados = Math.floor((ahora - leidoEn.current) / 1000);
  const progresoNivel = (juego.experienciaNivel / juego.experienciaPorNivel) * 100;

  return (
    <ScrollView contentContainerStyle={[styles.contenedor, { backgroundColor: colors.background }, centeredContent]}>
      <View style={styles.avatarZona}>
        <MascotaViva
          especie={juego.especie}
          raza={juego.raza}
          nombre={juego.nombre}
          animo={juego.animo}
          accion={actuando}
          disparo={celebrar}
        />
        <Text style={[styles.nombre, { color: colors.text }]}>{juego.nombre}</Text>
        <Text style={{ color: colors.textMuted, textAlign: 'center' }}>{t(`juego.animo.${juego.animo}`)}</Text>

        {/* Avatar IA: sólo se muestra algo si hay una acción posible o un
            motivo que valga la pena explicar. Nunca un botón muerto. */}
        {avatarBusy === 'generar' ? (
          <View style={styles.avatarAccion}>
            <ActivityIndicator color={colors.primary} />
            <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, textAlign: 'center' }}>
              {t('juego.avatar.generando')}
            </Text>
          </View>
        ) : juego.avatarEsGenerado ? (
          <View style={styles.avatarFila}>
            <Pressable onPress={onGenerarAvatar} disabled={!avatar?.disponible}>
              <Text style={{ color: avatar?.disponible ? colors.primary : colors.textMuted, fontSize: 12 }}>
                {t('juego.avatar.regenerar')}
              </Text>
            </Pressable>
            <Text style={{ color: colors.border }}>·</Text>
            <Pressable onPress={onQuitarAvatar} disabled={avatarBusy !== null}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{t('juego.avatar.volverFoto')}</Text>
            </Pressable>
          </View>
        ) : avatar?.disponible ? (
          <View style={styles.avatarAccion}>
            <Pressable
              style={[styles.avatarBoton, { borderColor: colors.primary }]}
              onPress={onGenerarAvatar}
            >
              <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>
                ✨ {t('juego.avatar.crear')}
              </Text>
            </Pressable>
            <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 4 }}>
              {t('juego.avatar.restantes', { count: avatar.restantesHoy })}
            </Text>
          </View>
        ) : avatar?.motivo ? (
          <Text style={{ color: colors.textMuted, fontSize: 11, marginTop: 10, textAlign: 'center' }}>
            {t(`juego.avatar.motivo.${avatar.motivo}`)}
          </Text>
        ) : null}
      </View>

      <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.filaEntre}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>
            {t('juego.nivel', { nivel: juego.nivel })}
          </Text>
          {juego.rachaDias > 0 ? (
            <Text style={{ color: colors.primary, fontWeight: '600', fontSize: 12 }}>
              🔥 {t('juego.racha', { count: juego.rachaDias })}
            </Text>
          ) : null}
        </View>
        <View style={[styles.trackNivel, { backgroundColor: colors.border }]}>
          <View style={[styles.fillNivel, { backgroundColor: colors.primary, width: `${progresoNivel}%` }]} />
        </View>
        <Text style={{ color: colors.textMuted, fontSize: 11, textAlign: 'right', marginTop: 2 }}>
          {juego.experienciaNivel}/{juego.experienciaPorNivel} XP
        </Text>
      </View>

      <View style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <StatBar etiqueta={t('juego.stats.hambre')} valor={juego.stats.hambre} icono="restaurant" />
        <StatBar etiqueta={t('juego.stats.felicidad')} valor={juego.stats.felicidad} icono="heart" />
        <StatBar etiqueta={t('juego.stats.energia')} valor={juego.stats.energia} icono="flash" />
        <StatBar etiqueta={t('juego.stats.higiene')} valor={juego.stats.higiene} icono="water" />
      </View>

      <View style={styles.acciones}>
        {ACCIONES.map(({ tipo, icono }) => {
          const restante = Math.max(0, juego.cooldowns[tipo] - segundosPasados);
          const bloqueada = restante > 0;
          return (
            <Pressable
              key={tipo}
              style={[
                styles.botonAccion,
                {
                  backgroundColor: bloqueada ? colors.surface : colors.primary,
                  borderColor: bloqueada ? colors.border : colors.primary,
                },
              ]}
              onPress={() => onAccion(tipo)}
              disabled={bloqueada || accionEnCurso !== null}
            >
              {accionEnCurso === tipo ? (
                <ActivityIndicator color={bloqueada ? colors.textMuted : colors.primaryText} />
              ) : (
                <>
                  <Text style={{ fontSize: 22 }}>{icono}</Text>
                  <Text
                    style={{
                      color: bloqueada ? colors.textMuted : colors.primaryText,
                      fontWeight: '600',
                      fontSize: 12,
                      marginTop: 2,
                    }}
                  >
                    {t(`juego.acciones.${tipo}`)}
                  </Text>
                  {bloqueada ? (
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>{formatearEspera(restante)}</Text>
                  ) : null}
                </>
              )}
            </Pressable>
          );
        })}
      </View>

      {mensaje ? (
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 14 }}>{mensaje}</Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centrado: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  contenedor: { flexGrow: 1, padding: 20 },
  avatarZona: { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  nombre: { fontSize: 22, fontWeight: '700', marginTop: 14 },
  avatarAccion: { alignItems: 'center', marginTop: 12 },
  avatarFila: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  avatarBoton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 14 },
  filaEntre: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  trackNivel: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fillNivel: { height: '100%', borderRadius: 3 },
  acciones: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  botonAccion: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
  },
});
