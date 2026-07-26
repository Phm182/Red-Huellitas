import { useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { adminApi } from '../../../src/api/adminApi';
import { useAuth } from '../../../src/auth/AuthProvider';
import { VerificacionArchivoTipo, VerificacionRevisionEstado, VerificacionPendiente } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';
import { fetchAuthenticatedImageUri } from '../../../src/utils/media';
import { AppInput } from '../../../src/components/AppInput';

const ESTADOS: VerificacionRevisionEstado[] = ['pendiente', 'aprobado', 'rechazado'];
const ARCHIVOS: VerificacionArchivoTipo[] = ['dniFrente', 'dniDorso', 'selfie'];

function labelMetodo(metodo: string | null | undefined, t: (k: string) => string): string | null {
  if (!metodo) return null;
  if (metodo === 'gemini' || metodo === 'automatica') return t('onboarding.verificationMethodAuto');
  if (metodo === 'gemini+renaper' || metodo === 'automatica_renaper') {
    return t('onboarding.verificationMethodRenaper');
  }
  if (metodo === 'manual' || metodo === 'gemini_error' || metodo === 'pendiente') {
    return t('onboarding.verificationMethodManual');
  }
  return metodo;
}

/**
 * Las imágenes de verificación no tienen URL pública: se sirven por un
 * endpoint que exige Bearer, así que hay que descargarlas y convertirlas a un
 * URI que <Image> pueda consumir.
 */
function ImagenProtegida({ userId, tipo }: { userId: number; tipo: VerificacionArchivoTipo }) {
  const { token } = useAuth();
  const { colors } = useTheme();
  const { t } = useTranslation();
  const [uri, setUri] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);

  useEffect(() => {
    let vigente = true;
    setUri(null);
    setFallo(false);
    fetchAuthenticatedImageUri(adminApi.verificacionArchivoUrl(userId, tipo), token).then((resultado) => {
      if (!vigente) return;
      if (resultado) {
        setUri(resultado);
      } else {
        setFallo(true);
      }
    });
    return () => {
      vigente = false;
    };
  }, [userId, tipo, token]);

  return (
    <View style={styles.imagenCaja}>
      <Text style={[styles.imagenLabel, { color: colors.textMuted }]}>{t(`admin.archivo_${tipo}`)}</Text>
      {uri ? (
        <Image
          source={{ uri }}
          style={[styles.imagen, { borderColor: colors.border }]}
          contentFit="cover"
          onError={() => {
            setUri(null);
            setFallo(true);
          }}
        />
      ) : (
        <View style={[styles.imagen, styles.imagenVacia, { borderColor: colors.border, backgroundColor: colors.background }]}>
          {fallo ? (
            <Text style={{ color: colors.danger, fontSize: 11, textAlign: 'center' }}>
              {t('admin.archivoNoDisponible')}
            </Text>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
        </View>
      )}
    </View>
  );
}

export default function AdminVerificacionesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [estado, setEstado] = useState<VerificacionRevisionEstado>('pendiente');
  const [items, setItems] = useState<VerificacionPendiente[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [motivos, setMotivos] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const cargar = useCallback(
    (estadoActual: VerificacionRevisionEstado) => {
      setLoading(true);
      adminApi.verificacionesListar(estadoActual).then((res) => {
        if (res.success && res.data) {
          setItems(res.data.verificaciones);
          setNextCursor(res.data.nextCursor);
          setMensaje(null);
        } else {
          setMensaje({ texto: res.message, error: true });
        }
        setLoading(false);
      });
    },
    []
  );

  useFocusEffect(
    useCallback(() => {
      cargar(estado);
    }, [cargar, estado])
  );

  const cargarMas = async () => {
    if (!nextCursor || cargandoMas) return;
    setCargandoMas(true);
    const res = await adminApi.verificacionesListar(estado, { cursor: nextCursor });
    setCargandoMas(false);
    if (res.success && res.data) {
      setItems((previos) => [...previos, ...res.data!.verificaciones]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const resolver = async (item: VerificacionPendiente, nuevoEstado: 'aprobado' | 'rechazado') => {
    const motivo = (motivos[item.userId] ?? '').trim();
    if (nuevoEstado === 'rechazado' && motivo === '') {
      setMensaje({ texto: t('admin.motivoObligatorio'), error: true });
      return;
    }
    setBusyUserId(item.userId);
    const res = await adminApi.verificacionResolver(item.userId, nuevoEstado, motivo || undefined);
    setBusyUserId(null);
    setMensaje({ texto: res.message, error: !res.success });
    if (res.success) {
      // Sale de la lista actual: ya no pertenece al filtro que se está viendo.
      setItems((previos) => previos.filter((x) => x.userId !== item.userId));
    }
  };

  const puntaje = (valor: number | null) => (valor === null ? '—' : `${Math.round(valor * 100)}%`);

  return (
    <ScrollView
      contentContainerStyle={[styles.contenedor, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    >
      <View style={styles.chipRow}>
        {ESTADOS.map((op) => {
          const activo = estado === op;
          return (
            <Pressable
              key={op}
              onPress={() => setEstado(op)}
              style={[
                styles.chip,
                { borderColor: colors.primary, backgroundColor: activo ? colors.primary : 'transparent' },
              ]}
            >
              <Text style={{ color: activo ? colors.primaryText : colors.primary, fontWeight: '600', fontSize: 13 }}>
                {t(`admin.estado_${op}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {mensaje ? (
        <Text style={{ color: mensaje.error ? colors.danger : colors.primary, marginBottom: 12 }}>
          {mensaje.texto}
        </Text>
      ) : null}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
      ) : items.length === 0 ? (
        <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 32 }}>{t('admin.sinPendientes')}</Text>
      ) : (
        items.map((item) => (
          <View
            key={item.verificacionId}
            style={[styles.tarjeta, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.nombre, { color: colors.text }]}>
              {item.usuario?.nombreCompleto ?? `#${item.userId}`}
            </Text>
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>{item.usuario?.email}</Text>

            <View style={styles.imagenFila}>
              {ARCHIVOS.map((tipo) => {
                const tiene =
                  tipo === 'dniFrente' ? item.tieneDniFrente : tipo === 'dniDorso' ? item.tieneDniDorso : item.tieneSelfie;
                return tiene ? <ImagenProtegida key={tipo} userId={item.userId} tipo={tipo} /> : null;
              })}
            </View>

            <View style={[styles.datos, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {t('admin.autoScore')}: {puntaje(item.autoScore)} · {t('admin.faceMatch')}: {puntaje(item.faceMatchScore)}
              </Text>
              {item.nombreExtraido ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.nombreExtraido')}: {item.nombreExtraido}
                </Text>
              ) : null}
              {item.dniNumeroExtraido ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.dniExtraido')}: {item.dniNumeroExtraido}
                </Text>
              ) : null}
              {item.autoMetodo ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.metodo')}: {labelMetodo(item.autoMetodo, t) ?? item.autoMetodo}
                </Text>
              ) : null}
              {item.motivoRechazo ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.motivoActual')}: {item.motivoRechazo}
                </Text>
              ) : null}
            </View>

            <AppInput
              value={motivos[item.userId] ?? ''}
              onChangeText={(texto) => setMotivos((previos) => ({ ...previos, [item.userId]: texto }))}
              placeholder={t('admin.motivoPlaceholder')}
              style={styles.input}
              multiline
            />

            <View style={styles.acciones}>
              <Pressable
                disabled={busyUserId === item.userId}
                onPress={() => resolver(item, 'aprobado')}
                style={[styles.boton, { backgroundColor: colors.primary, opacity: busyUserId === item.userId ? 0.6 : 1 }]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('admin.aprobar')}</Text>
              </Pressable>
              <Pressable
                disabled={busyUserId === item.userId}
                onPress={() => resolver(item, 'rechazado')}
                style={[styles.boton, styles.botonSecundario, { borderColor: colors.danger, opacity: busyUserId === item.userId ? 0.6 : 1 }]}
              >
                <Text style={{ color: colors.danger, fontWeight: '600' }}>{t('admin.rechazar')}</Text>
              </Pressable>
            </View>
          </View>
        ))
      )}

      {nextCursor ? (
        <Pressable
          onPress={cargarMas}
          style={[styles.boton, styles.botonSecundario, { borderColor: colors.primary, marginTop: 8 }]}
        >
          <Text style={{ color: colors.primary, fontWeight: '600' }}>
            {cargandoMas ? t('common.loading') : t('admin.cargarMas')}
          </Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  contenedor: { padding: 16, ...centeredContent },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { borderWidth: 1, borderRadius: 20, paddingVertical: 8, paddingHorizontal: 12 },
  tarjeta: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  nombre: { fontSize: 16, fontWeight: '700' },
  imagenFila: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  imagenCaja: { alignItems: 'center' },
  imagenLabel: { fontSize: 11, marginBottom: 4 },
  imagen: { width: 96, height: 96, borderRadius: 8, borderWidth: 1 },
  imagenVacia: { alignItems: 'center', justifyContent: 'center', padding: 4 },
  datos: { borderTopWidth: 1, marginTop: 12, paddingTop: 8, gap: 2 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12, minHeight: 44 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  boton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botonSecundario: { borderWidth: 1, backgroundColor: 'transparent' },
});
