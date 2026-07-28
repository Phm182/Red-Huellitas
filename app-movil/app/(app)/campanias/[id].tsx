import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { campaniaApi } from '../../../src/api/campaniaApi';
import { DenunciaButtonStub } from '../../../src/components/DenunciaButtonStub';
import { DireccionConMapa } from '../../../src/components/DireccionConMapa';
import { Campania } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { compartirPost } from '../../../src/utils/compartir';
import { SkeletonList } from '../../../src/components/ui/Skeleton';

export default function CampaniaDetalleScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [campania, setCampania] = useState<Campania | null>(null);
  const [loading, setLoading] = useState(true);
  const [inscribiendo, setInscribiendo] = useState(false);
  const [inscribiError, setInscribiError] = useState<string | null>(null);
  // El backend contesta distinto según si entró o quedó en lista de espera; se
  // muestra su mensaje tal cual en vez de recomponerlo acá.
  const [aviso, setAviso] = useState<string | null>(null);

  /** Vuelve a traer la campaña. Después de cualquier acción se recarga entera:
   *  una baja puede ascender a otra persona y cambiar los contadores. */
  const recargar = useCallback(async () => {
    const res = await campaniaApi.obtener(Number(id));
    if (res.success && res.data) setCampania(res.data.campania);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setLoading(true);
      campaniaApi.obtener(Number(id)).then((res) => {
        if (activo && res.success && res.data) {
          setCampania(res.data.campania);
        }
        if (activo) setLoading(false);
      });
      return () => {
        activo = false;
      };
    }, [id])
  );

  const onCompartir = () => {
    if (!campania) return;
    compartirPost({
      texto: campania.titulo,
      url: Linking.createURL(`/campanias/${campania.campaniaId}`),
    });
  };

  /**
   * Inscribirse.
   *
   * Con formulario se va a la pantalla del formulario; sin formulario se
   * inscribe acá mismo. Mandar a llenar un formulario vacío sería un paso de
   * más para el caso más común, que es la campaña sin preguntas.
   */
  const onInscribirme = async () => {
    if (!campania || inscribiendo) return;

    if ((campania.preguntas?.length ?? 0) > 0) {
      router.push({
        pathname: '/(app)/campanias/[id]/inscribirme',
        params: { id: campania.campaniaId },
      });
      return;
    }

    setInscribiError(null);
    setInscribiendo(true);
    const res = await campaniaApi.inscribirme(campania.campaniaId);
    setInscribiendo(false);
    if (res.success) {
      setAviso(res.message);
      await recargar();
    } else {
      setInscribiError(res.message);
    }
  };

  const onDarmeDeBaja = () => {
    const ins = campania?.miInscripcion;
    if (!ins) return;
    Alert.alert(t('campanias.bajaConfirmTitle'), t('campanias.bajaConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('campanias.darmeDeBaja'),
        style: 'destructive',
        onPress: async () => {
          const res = await campaniaApi.darDeBaja(ins.campaniaInscripcionId);
          if (res.success) {
            setAviso(res.message);
            await recargar();
          } else {
            setInscribiError(res.message);
          }
        },
      },
    ]);
  };

  /** Para cuando ya venció el plazo de baja: al menos que el equipo se entere. */
  const onAvisarAusencia = () => {
    const ins = campania?.miInscripcion;
    if (!ins) return;
    Alert.alert(t('campanias.ausenciaConfirmTitle'), t('campanias.ausenciaConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('campanias.avisarNoVoy'),
        onPress: async () => {
          const res = await campaniaApi.avisarAusencia(ins.campaniaInscripcionId);
          if (res.success) {
            setAviso(res.message);
            await recargar();
          } else {
            setInscribiError(res.message);
          }
        },
      },
    ]);
  };

  const onEliminar = () => {
    if (!campania) return;
    Alert.alert(t('campanias.deleteConfirmTitle'), t('campanias.deleteConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('feed.deleteButton'),
        style: 'destructive',
        onPress: async () => {
          const res = await campaniaApi.eliminar(campania.campaniaId);
          if (res.success) {
            router.replace('/(app)/campanias');
          }
        },
      },
    ]);
  };

  if (loading || !campania) {
    return <SkeletonList />;
  }

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }, centeredContent]}>
      <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 12, marginBottom: 6 }}>
        {t(`campanias.tipo.${campania.tipo}`).toUpperCase()}
      </Text>
      <Text style={[styles.titulo, { color: colors.text }]}>{campania.titulo}</Text>
      <Text style={{ color: colors.textMuted, marginBottom: 4 }}>
        {campania.fechaDesde}{campania.fechaHasta ? ` – ${campania.fechaHasta}` : ''}
      </Text>
      <DireccionConMapa
        direccion={campania.direccion}
        zonaDescripcion={campania.zonaDescripcion}
        lat={campania.zonaLat}
        lng={campania.zonaLng}
      />
      <Text style={{ color: colors.textMuted, marginBottom: 12 }}>@{campania.autor.username}</Text>

      {campania.descripcion ? <Text style={{ color: colors.text, marginBottom: 16 }}>{campania.descripcion}</Text> : null}

      <Pressable style={[styles.button, styles.buttonOutline, { borderColor: colors.primary }]} onPress={onCompartir}>
        <Text style={{ color: colors.primary, fontWeight: '600' }}>↗ {t('feed.share')}</Text>
      </Pressable>

      {campania.mensajeAviso ? (
        <View style={[styles.avisoCaja, { backgroundColor: colors.accentSoft, borderColor: colors.border }]}>
          <Ionicons name="information-circle" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>{campania.mensajeAviso}</Text>
        </View>
      ) : null}

      {campania.requiereInscripcion ? (
        campania.esDueno ? (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={() =>
              router.push({
                pathname: '/(app)/campanias/[id]/administrar',
                params: { id: campania.campaniaId },
              })
            }
          >
            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
              {t('campanias.administrar')} ({campania.totalInscriptos ?? 0}
              {campania.cupoMaximo !== null ? `/${campania.cupoMaximo}` : ''})
            </Text>
          </Pressable>
        ) : campania.miInscripcion ? (
          <>
            <View
              style={[
                styles.estadoCaja,
                {
                  borderColor:
                    campania.miInscripcion.estado === 'confirmada' ? colors.success : '#FF9F1C',
                  backgroundColor: colors.surface,
                },
              ]}
            >
              <Ionicons
                name={campania.miInscripcion.estado === 'confirmada' ? 'checkmark-circle' : 'hourglass'}
                size={20}
                color={campania.miInscripcion.estado === 'confirmada' ? colors.success : '#FF9F1C'}
              />
              <Text style={{ color: colors.text, flex: 1, fontWeight: '600' }}>
                {campania.miInscripcion.estado === 'confirmada'
                  ? t('campanias.yaInscripto')
                  : t('campanias.enListaEspera', { posicion: campania.miInscripcion.posicion })}
              </Text>
            </View>

            {/* Vencido el plazo de baja queda avisar, que es mejor que no
                aparecer sin decir nada. */}
            {campania.miInscripcion.puedeDarseBaja ? (
              <Pressable onPress={onDarmeDeBaja} style={styles.enlaceSecundario}>
                <Text style={{ color: colors.danger, fontSize: 13 }}>{t('campanias.darmeDeBaja')}</Text>
              </Pressable>
            ) : (
              <Pressable onPress={onAvisarAusencia} style={styles.enlaceSecundario}>
                <Text style={{ color: colors.primary, fontSize: 13 }}>{t('campanias.avisarNoVoy')}</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Pressable
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={onInscribirme}
            disabled={inscribiendo}
          >
            {inscribiendo ? (
              <ActivityIndicator color={colors.primaryText} />
            ) : (
              <Text style={{ color: colors.primaryText, fontWeight: '700' }}>
                {/* Cupo lleno ya no bloquea: se anota en lista de espera. */}
                {campania.cupoDisponible === 0
                  ? t('campanias.anotarmeEnEspera')
                  : t('campanias.inscribirmeButton')}
              </Text>
            )}
          </Pressable>
        )
      ) : null}

      {aviso ? (
        <View style={[styles.avisoCaja, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
          <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
          <Text style={{ color: colors.text, flex: 1, lineHeight: 20 }}>{aviso}</Text>
        </View>
      ) : null}
      {inscribiError ? <Text style={{ color: colors.danger, marginTop: 8 }}>{inscribiError}</Text> : null}

      {campania.esDueno ? (
        <Pressable onPress={onEliminar} style={styles.eliminarLink}>
          <Text style={{ color: colors.danger, fontSize: 12 }}>{t('campanias.eliminarButton')}</Text>
        </Pressable>
      ) : (
        <View style={styles.denunciaRow}>
          <DenunciaButtonStub userId={campania.autor.userId} campaniaId={campania.campaniaId} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { padding: 20, paddingBottom: 40 },
  avisoCaja: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  estadoCaja: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 12,
  },
  enlaceSecundario: { alignSelf: 'center', padding: 10, marginTop: 4 },
  titulo: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  button: { borderRadius: 10, padding: 14, alignItems: 'center', marginBottom: 12 },
  buttonOutline: { borderWidth: 1 },
  eliminarLink: { marginTop: 8, alignItems: 'center' },
  denunciaRow: { marginTop: 8, alignItems: 'center' },
});
