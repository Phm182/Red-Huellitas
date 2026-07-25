import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminApi } from '../../../src/api/adminApi';
import { DenunciaEstado, DenunciaPendiente } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

const ESTADOS: DenunciaEstado[] = ['pendiente', 'revisada', 'desestimada'];

/**
 * A qué pantalla lleva cada tipo de contenido denunciado. El panel no borra
 * contenido: abre el que ya existe para que el moderador lo juzgue ahí.
 * Las historias se abren por usuario porque la pantalla del visor recibe el
 * userId, no el id de la historia.
 */
function rutaDelContenido(denuncia: DenunciaPendiente): string | null {
  const contenido = denuncia.contenido;
  if (!contenido) return null;

  switch (contenido.tipo) {
    case 'publicacion':
      return `/(app)/publicaciones/${contenido.id}`;
    case 'historia':
      return denuncia.denunciado ? `/(app)/historias/${denuncia.denunciado.userId}` : null;
    case 'adopcion':
      return `/(app)/adopcion/${contenido.id}`;
    case 'campania':
      return `/(app)/campanias/${contenido.id}`;
    case 'perdido':
      return `/(app)/perdidos/${contenido.id}`;
    case 'transito':
      return `/(app)/transito/${contenido.id}`;
    case 'donacion':
      return `/(app)/donaciones/${contenido.id}`;
    case 'veterinaria':
      return `/(app)/veterinarias/${contenido.id}`;
    case 'producto':
      return `/(app)/productos/${contenido.id}`;
    default:
      return null;
  }
}

export default function AdminDenunciasScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [estado, setEstado] = useState<DenunciaEstado>('pendiente');
  const [items, setItems] = useState<DenunciaPendiente[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const cargar = useCallback((estadoActual: DenunciaEstado) => {
    setLoading(true);
    adminApi.denunciasListar(estadoActual).then((res) => {
      if (res.success && res.data) {
        setItems(res.data.denuncias);
        setNextCursor(res.data.nextCursor);
        setMensaje(null);
      } else {
        setMensaje({ texto: res.message, error: true });
      }
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar(estado);
    }, [cargar, estado])
  );

  const cargarMas = async () => {
    if (!nextCursor || cargandoMas) return;
    setCargandoMas(true);
    const res = await adminApi.denunciasListar(estado, { cursor: nextCursor });
    setCargandoMas(false);
    if (res.success && res.data) {
      setItems((previos) => [...previos, ...res.data!.denuncias]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const resolver = async (item: DenunciaPendiente, nuevoEstado: 'revisada' | 'desestimada') => {
    setBusyId(item.denunciaId);
    const nota = (notas[item.denunciaId] ?? '').trim();
    const res = await adminApi.denunciaResolver(item.denunciaId, nuevoEstado, nota || undefined);
    setBusyId(null);
    setMensaje({ texto: res.message, error: !res.success });
    if (res.success) {
      setItems((previos) => previos.filter((x) => x.denunciaId !== item.denunciaId));
    }
  };

  const suspender = async (item: DenunciaPendiente) => {
    if (!item.denunciado) return;
    const suspendiendo = item.denunciado.estado === 'A';
    setBusyId(item.denunciaId);
    const res = await adminApi.usuarioSuspender(item.denunciado.userId, suspendiendo);
    setBusyId(null);
    setMensaje({ texto: res.message, error: !res.success });
    if (res.success && res.data) {
      const nuevoEstadoUsuario = res.data.estado;
      // El mismo usuario puede aparecer en varias denuncias de la lista.
      setItems((previos) =>
        previos.map((x) =>
          x.denunciado && x.denunciado.userId === item.denunciado!.userId
            ? { ...x, denunciado: { ...x.denunciado, estado: nuevoEstadoUsuario } }
            : x
        )
      );
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.contenedor, { backgroundColor: colors.background }]}>
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
                {t(`admin.estadoDenuncia_${op}`)}
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
        items.map((item) => {
          const ruta = rutaDelContenido(item);
          const suspendido = item.denunciado?.estado === 'I';
          return (
            <View
              key={item.denunciaId}
              style={[styles.tarjeta, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={[styles.motivo, { color: colors.text }]}>{item.motivo}</Text>
              {item.detalle ? (
                <Text style={{ color: colors.text, marginTop: 4 }}>{item.detalle}</Text>
              ) : null}

              <View style={[styles.datos, { borderColor: colors.border }]}>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.denunciante')}: {item.denunciante?.nombreCompleto ?? '—'}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.denunciado')}: {item.denunciado?.nombreCompleto ?? '—'}
                  {suspendido ? ` · ${t('admin.usuarioSuspendido')}` : ''}
                </Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                  {t('admin.contenido')}:{' '}
                  {item.contenido ? t(`admin.contenido_${item.contenido.tipo}`) : t('admin.contenidoUsuario')}
                </Text>
              </View>

              {ruta ? (
                <Pressable onPress={() => router.push(ruta as never)} style={styles.link}>
                  <Text style={{ color: colors.primary, fontWeight: '600' }}>{t('admin.verContenido')} ›</Text>
                </Pressable>
              ) : null}

              <TextInput
                value={notas[item.denunciaId] ?? ''}
                onChangeText={(texto) => setNotas((previos) => ({ ...previos, [item.denunciaId]: texto }))}
                placeholder={t('admin.notaPlaceholder')}
                placeholderTextColor={colors.textMuted}
                style={[styles.input, { borderColor: colors.border, color: colors.text }]}
                multiline
              />

              <View style={styles.acciones}>
                <Pressable
                  disabled={busyId === item.denunciaId}
                  onPress={() => resolver(item, 'revisada')}
                  style={[styles.boton, { backgroundColor: colors.primary, opacity: busyId === item.denunciaId ? 0.6 : 1 }]}
                >
                  <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('admin.marcarRevisada')}</Text>
                </Pressable>
                <Pressable
                  disabled={busyId === item.denunciaId}
                  onPress={() => resolver(item, 'desestimada')}
                  style={[styles.boton, styles.botonSecundario, { borderColor: colors.border, opacity: busyId === item.denunciaId ? 0.6 : 1 }]}
                >
                  <Text style={{ color: colors.text, fontWeight: '600' }}>{t('admin.desestimar')}</Text>
                </Pressable>
              </View>

              {item.denunciado ? (
                <Pressable
                  disabled={busyId === item.denunciaId}
                  onPress={() => suspender(item)}
                  style={[styles.boton, styles.botonSecundario, { borderColor: colors.danger, marginTop: 8 }]}
                >
                  <Text style={{ color: colors.danger, fontWeight: '600' }}>
                    {suspendido ? t('admin.reactivarUsuario') : t('admin.suspenderUsuario')}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })
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
  motivo: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  datos: { borderTopWidth: 1, marginTop: 12, paddingTop: 8, gap: 2 },
  link: { marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12, minHeight: 44 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  boton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botonSecundario: { borderWidth: 1, backgroundColor: 'transparent' },
});
