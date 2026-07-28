import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { calificacionesApi, equiposApi } from '../../../src/api/equiposApi';
import { Atmosphere } from '../../../src/components/Atmosphere';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { DireccionConMapa } from '../../../src/components/DireccionConMapa';
import { Estrellas, ReputacionLinea } from '../../../src/components/Estrellas';
import { InsigniaEquipo } from '../../../src/components/InsigniaEquipo';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { Calificacion, Equipo, EquipoMiembro } from '../../../src/types/equipo';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { fonts, type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { hapticLeve } from '../../../src/utils/haptics';
import { rhAvatarUrl, rhMediaUrl } from '../../../src/utils/media';

/**
 * Ficha del equipo: quiénes son, dónde están, qué campañas hicieron y qué
 * dice la gente que fue.
 *
 * Es la pantalla donde alguien decide si confía en una organización que no
 * conoce, así que las calificaciones van completas y no sólo el promedio.
 */
export default function EquipoDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const equipoId = Number(id);

  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [calificaciones, setCalificaciones] = useState<Calificacion[]>([]);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    const [det, cal] = await Promise.all([
      equiposApi.obtener(equipoId),
      calificacionesApi.listar('equipo', equipoId),
    ]);
    if (det.success && det.data) setEquipo(det.data.equipo);
    if (cal.success && cal.data) setCalificaciones(cal.data.calificaciones);
    setLoading(false);
  }, [equipoId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      cargar();
    }, [cargar])
  );

  if (loading || !equipo) {
    return <SkeletonList />;
  }

  const pedirUnirme = async () => {
    hapticLeve();
    const res = await equiposApi.unirme(equipoId);
    Alert.alert(res.success ? t('common.ok') : t('common.error'), res.message);
    if (res.success) cargar();
  };

  const resolver = async (m: EquipoMiembro, accion: 'aceptar' | 'rechazar') => {
    hapticLeve();
    const res = await equiposApi.resolverSolicitud(m.equipoMiembroId, accion);
    if (!res.success) Alert.alert(t('common.error'), res.message);
    cargar();
  };

  const salir = () => {
    Alert.alert(t('equipos.salir'), t('equipos.salirConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('equipos.salir'),
        style: 'destructive',
        onPress: async () => {
          const res = await equiposApi.salir(equipoId);
          if (!res.success) Alert.alert(t('common.error'), res.message);
          cargar();
        },
      },
    ]);
  };

  const dueno = (equipo.miembros ?? []).find((m) => m.rol === 'dueno');

  const avatar = (path: string | null, color: string, icono: string, size: number) =>
    path ? (
      <Image
        source={{ uri: rhMediaUrl(path) }}
        style={{ width: size, height: size, borderRadius: radii.pill }}
        contentFit="cover"
        transition={160}
      />
    ) : (
      <View
        style={[
          styles.avatarVacio,
          { width: size, height: size, borderRadius: radii.pill, backgroundColor: color + '22' },
        ]}
      >
        <Ionicons name={icono as never} size={size * 0.42} color={color} />
      </View>
    );

  return (
    <Atmosphere>
      <ScrollView contentContainerStyle={[styles.container, centeredContent]}>
        <View style={styles.encabezado}>
          {avatar(equipo.avatarPath, equipo.tipo.color, equipo.tipo.icono, 72)}

          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.titulo, { color: colors.text }]}>{equipo.nombre}</Text>
            <InsigniaEquipo tipo={equipo.tipo} verificado={equipo.verificado} />
            <ReputacionLinea
              reputacion={equipo.reputacion}
              sinDatosLabel={t('equipos.sinCalificaciones')}
            />
          </View>
        </View>

        {equipo.descripcion ? (
          <Text style={{ color: colors.text, marginBottom: 14 }}>{equipo.descripcion}</Text>
        ) : null}

        {equipo.zonaLat !== null && equipo.zonaLng !== null ? (
          <DireccionConMapa
            direccion={equipo.direccion}
            zonaDescripcion={equipo.zonaDescripcion}
            lat={equipo.zonaLat}
            lng={equipo.zonaLng}
          />
        ) : null}

        {/* --- Acción principal según mi relación con el equipo --- */}
        {equipo.miRol === null && equipo.miEstadoMembresia !== 'pendiente' ? (
          <Pressable
            onPress={pedirUnirme}
            style={[styles.boton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="person-add" size={16} color={colors.primaryText} />
            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
              {t('equipos.pedirUnirme')}
            </Text>
          </Pressable>
        ) : null}

        {equipo.miEstadoMembresia === 'pendiente' ? (
          <View style={[styles.aviso, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="hourglass-outline" size={16} color={colors.textMuted} />
            <Text style={{ color: colors.textMuted, flex: 1 }}>{t('equipos.pendienteAprobacion')}</Text>
          </View>
        ) : null}

        {equipo.puedoAdministrar ? (
          <Pressable
            onPress={() => {
              hapticLeve();
              router.push({ pathname: '/(app)/equipos/[id]/editar', params: { id: equipoId } });
            }}
            style={[styles.boton, styles.botonOutline, { borderColor: colors.primary }]}
          >
            <Ionicons name="create-outline" size={16} color={colors.primary} />
            <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('equipos.editar')}</Text>
          </Pressable>
        ) : null}

        {/* --- Pedidos para entrar, sólo para quien puede resolverlos --- */}
        {(equipo.solicitudesPendientes?.length ?? 0) > 0 ? (
          <>
            <Text style={[styles.seccion, { color: colors.text }]}>
              {t('equipos.solicitudes')} ({equipo.solicitudesPendientes!.length})
            </Text>
            {equipo.solicitudesPendientes!.map((m) => (
              <View
                key={m.equipoMiembroId}
                style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                {avatar(m.usuario.avatarPath, colors.primary, 'person', 40)}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {m.usuario.nombreCompleto}
                  </Text>
                  {m.mensaje ? (
                    <Text style={[type.caption, { color: colors.textMuted }]}>{m.mensaje}</Text>
                  ) : null}
                </View>
                <Pressable onPress={() => resolver(m, 'aceptar')} hitSlop={8}>
                  <Ionicons name="checkmark-circle" size={26} color={colors.success} />
                </Pressable>
                <Pressable onPress={() => resolver(m, 'rechazar')} hitSlop={8}>
                  <Ionicons name="close-circle" size={26} color={colors.danger} />
                </Pressable>
              </View>
            ))}
          </>
        ) : null}

        {/* --- Miembros --- */}
        <Text style={[styles.seccion, { color: colors.text }]}>
          {t('equipos.miembros')} ({equipo.totalMiembros})
        </Text>
        {(equipo.miembros ?? []).map((m) => (
          <Pressable
            key={m.equipoMiembroId}
            onPress={() => {
              if (m.usuario.username) router.push(`/(app)/usuario/${m.usuario.username}`);
            }}
            style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            {m.usuario.avatarPath ? (
              <Image
                source={{ uri: rhAvatarUrl(m.usuario.avatarPath) }}
                style={{ width: 40, height: 40, borderRadius: radii.pill }}
                contentFit="cover"
              />
            ) : (
              avatar(null, colors.primary, 'person', 40)
            )}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                {m.usuario.nombreCompleto}
              </Text>
              <Text style={[type.caption, { color: colors.textMuted }]}>
                {t(`equipos.rol.${m.rol}`)}
              </Text>
            </View>
          </Pressable>
        ))}

        {/* --- Campañas hechas --- */}
        {(equipo.campanias?.length ?? 0) > 0 ? (
          <>
            <Text style={[styles.seccion, { color: colors.text }]}>{t('equipos.campanias')}</Text>
            {equipo.campanias!.map((c) => (
              <Pressable
                key={c.campaniaId}
                onPress={() => router.push(`/(app)/campanias/${c.campaniaId}`)}
                style={[styles.tarjeta, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Ionicons name="megaphone-outline" size={20} color={colors.primary} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: colors.text, fontWeight: '600' }} numberOfLines={1}>
                    {c.titulo}
                  </Text>
                  <Text style={[type.caption, { color: colors.textMuted }]}>
                    {c.fechaDesde} · {c.zonaDescripcion}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
            ))}
          </>
        ) : null}

        {/* --- Lo que dice la gente que fue --- */}
        {calificaciones.length > 0 ? (
          <>
            <Text style={[styles.seccion, { color: colors.text }]}>
              {t('calificaciones.recibidas')}
            </Text>
            {calificaciones.map((c) => (
              <View
                key={c.calificacionId}
                style={[styles.tarjeta, styles.tarjetaCalif, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <View style={styles.filaCalif}>
                  <Text style={{ color: colors.text, fontWeight: '600', flex: 1 }} numberOfLines={1}>
                    {c.autor?.nombre ?? '—'}
                  </Text>
                  <Estrellas valor={c.puntaje} size={14} />
                </View>
                {c.comentario ? (
                  <Text style={{ color: colors.textMuted }}>{c.comentario}</Text>
                ) : null}
              </View>
            ))}
          </>
        ) : null}

        {equipo.miRol !== null && equipo.miRol !== 'dueno' ? (
          <Pressable onPress={salir} style={styles.salir}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('equipos.salir')}</Text>
          </Pressable>
        ) : null}

        {/* La denuncia apunta al dueño: el equipo no es un usuario, y quien
            responde por lo que publica una organización es quien la dirige. */}
        {dueno ? <DenunciaButtonStub userId={dueno.usuario.userId} /> : null}
      </ScrollView>
    </Atmosphere>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 90 },
  encabezado: { flexDirection: 'row', gap: 14, alignItems: 'center', marginBottom: 14 },
  titulo: { fontFamily: fonts.bodySemi, fontSize: 21 },
  avatarVacio: { alignItems: 'center', justifyContent: 'center' },
  seccion: { fontFamily: fonts.bodySemi, fontSize: 15, marginTop: 20, marginBottom: 8 },
  tarjeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 8,
  },
  tarjetaCalif: { flexDirection: 'column', alignItems: 'stretch', gap: 6 },
  filaCalif: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.lg,
    paddingVertical: 13,
    marginBottom: 10,
  },
  botonOutline: { borderWidth: 1, backgroundColor: 'transparent' },
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.lg,
    padding: 12,
    marginBottom: 10,
  },
  salir: { alignItems: 'center', paddingVertical: 16 },
});
