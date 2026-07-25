import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { adminApi } from '../../../src/api/adminApi';
import { ReporteEstado, ReportePendiente, ReporteTipo } from '../../../src/types';
import { centeredContent } from '../../../src/theme/layout';
import { useTheme } from '../../../src/theme/ThemeProvider';

const ESTADOS: ReporteEstado[] = ['pendiente', 'resuelto', 'descartado'];
const TIPOS: (ReporteTipo | null)[] = [null, 'mejora', 'falla'];

export default function AdminReportesScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [estado, setEstado] = useState<ReporteEstado>('pendiente');
  const [tipo, setTipo] = useState<ReporteTipo | null>(null);
  const [items, setItems] = useState<ReportePendiente[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [mensaje, setMensaje] = useState<{ texto: string; error: boolean } | null>(null);

  const cargar = useCallback((estadoActual: ReporteEstado, tipoActual: ReporteTipo | null) => {
    setLoading(true);
    adminApi.reportesListar(estadoActual, tipoActual).then((res) => {
      if (res.success && res.data) {
        setItems(res.data.reportes);
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
      cargar(estado, tipo);
    }, [cargar, estado, tipo])
  );

  const cargarMas = async () => {
    if (!nextCursor || cargandoMas) return;
    setCargandoMas(true);
    const res = await adminApi.reportesListar(estado, tipo, { cursor: nextCursor });
    setCargandoMas(false);
    if (res.success && res.data) {
      setItems((previos) => [...previos, ...res.data!.reportes]);
      setNextCursor(res.data.nextCursor);
    }
  };

  const resolver = async (item: ReportePendiente, nuevoEstado: 'resuelto' | 'descartado') => {
    setBusyId(item.reporteId);
    const nota = (notas[item.reporteId] ?? '').trim();
    const res = await adminApi.reporteResolver(item.reporteId, nuevoEstado, nota || undefined);
    setBusyId(null);
    setMensaje({ texto: res.message, error: !res.success });
    if (res.success) {
      setItems((previos) => previos.filter((x) => x.reporteId !== item.reporteId));
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
                {t(`admin.estadoReporte_${op}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.chipRow}>
        {TIPOS.map((op) => {
          const activo = tipo === op;
          return (
            <Pressable
              key={op ?? 'todos'}
              onPress={() => setTipo(op)}
              style={[
                styles.chip,
                { borderColor: colors.border, backgroundColor: activo ? colors.border : 'transparent' },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>
                {op ? t(`admin.tipoReporte_${op}`) : t('admin.tipoReporteTodos')}
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
            key={item.reporteId}
            style={[styles.tarjeta, { borderColor: colors.border, backgroundColor: colors.surface }]}
          >
            <View style={styles.encabezado}>
              <View
                style={[
                  styles.etiqueta,
                  { backgroundColor: item.tipo === 'falla' ? colors.danger : colors.primary },
                ]}
              >
                <Text style={{ color: colors.primaryText, fontSize: 11, fontWeight: '700' }}>
                  {t(`admin.tipoReporte_${item.tipo}`)}
                </Text>
              </View>
              {item.pantallaOrigen ? (
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>{item.pantallaOrigen}</Text>
              ) : null}
            </View>

            <Text style={{ color: colors.text, marginTop: 8 }}>{item.detalle}</Text>

            <View style={[styles.datos, { borderColor: colors.border }]}>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {item.usuario?.nombreCompleto ?? '—'} · {item.createdAt}
              </Text>
            </View>

            <TextInput
              value={notas[item.reporteId] ?? ''}
              onChangeText={(texto) => setNotas((previos) => ({ ...previos, [item.reporteId]: texto }))}
              placeholder={t('admin.notaPlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, { borderColor: colors.border, color: colors.text }]}
              multiline
            />

            <View style={styles.acciones}>
              <Pressable
                disabled={busyId === item.reporteId}
                onPress={() => resolver(item, 'resuelto')}
                style={[styles.boton, { backgroundColor: colors.primary, opacity: busyId === item.reporteId ? 0.6 : 1 }]}
              >
                <Text style={{ color: colors.primaryText, fontWeight: '600' }}>{t('admin.marcarResuelto')}</Text>
              </Pressable>
              <Pressable
                disabled={busyId === item.reporteId}
                onPress={() => resolver(item, 'descartado')}
                style={[styles.boton, styles.botonSecundario, { borderColor: colors.border, opacity: busyId === item.reporteId ? 0.6 : 1 }]}
              >
                <Text style={{ color: colors.text, fontWeight: '600' }}>{t('admin.descartar')}</Text>
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
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  etiqueta: { borderRadius: 12, paddingVertical: 3, paddingHorizontal: 10 },
  datos: { borderTopWidth: 1, marginTop: 12, paddingTop: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 12, minHeight: 44 },
  acciones: { flexDirection: 'row', gap: 8, marginTop: 12 },
  boton: { flex: 1, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  botonSecundario: { borderWidth: 1, backgroundColor: 'transparent' },
});
