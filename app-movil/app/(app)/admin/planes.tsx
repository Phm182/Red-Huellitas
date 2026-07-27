import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { apiGet, apiPost } from '../../../src/api/client';
import { AppInput } from '../../../src/components/AppInput';
import { SkeletonList } from '../../../src/components/ui/Skeleton';
import { SuscripcionPlan } from '../../../src/types';
import { radii } from '../../../src/theme/elevation';
import { centeredContent } from '../../../src/theme/layout';
import { type } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';

type Modo = { tipo: 'lista' } | { tipo: 'editar'; plan: SuscripcionPlan | null };

/**
 * Admin: nombre, precio, beneficios y alta de planes HuePlus.
 */
export default function AdminPlanesScreen() {
  const { colors } = useTheme();
  const [planes, setPlanes] = useState<SuscripcionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<Modo>({ tipo: 'lista' });
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [orden, setOrden] = useState('0');
  const [sinComision, setSinComision] = useState(false);
  const [itemsTexto, setItemsTexto] = useState('');
  const [codigoNuevo, setCodigoNuevo] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargar = useCallback(() => {
    setLoading(true);
    apiGet<{ planes: SuscripcionPlan[] }>('ajax/admin/planes_listar.php', undefined, true).then((res) => {
      if (res.success && res.data) setPlanes(res.data.planes);
      setLoading(false);
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      cargar();
    }, [cargar])
  );

  const abrir = (plan: SuscripcionPlan | null) => {
    setMensaje(null);
    setModo({ tipo: 'editar', plan });
    if (plan) {
      setNombre(plan.nombre);
      setDescripcion(plan.descripcion || '');
      setMonto(String(plan.montoMensual));
      setOrden(String(plan.orden));
      setSinComision(plan.sinComision);
      setItemsTexto(plan.items.map((i) => i.texto).join('\n'));
      setCodigoNuevo(plan.codigo);
    } else {
      setNombre('');
      setDescripcion('');
      setMonto('3500');
      setOrden(String(planes.length + 1));
      setSinComision(false);
      setItemsTexto('');
      setCodigoNuevo('');
    }
  };

  const guardar = async () => {
    setGuardando(true);
    setMensaje(null);
    const items = itemsTexto
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .map((texto) => ({ texto }));
    const body: Record<string, unknown> = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
      montoMensual: monto,
      orden,
      sinComision: sinComision ? '1' : '0',
      estado: 'A',
      items: JSON.stringify(items),
    };
    if (modo.tipo === 'editar' && modo.plan) {
      body.planId = modo.plan.planId;
    } else {
      body.codigo = codigoNuevo.trim().toLowerCase().replace(/\s+/g, '_');
    }
    const res = await apiPost<{ plan: SuscripcionPlan }>('ajax/admin/plan_guardar.php', body, true);
    setGuardando(false);
    if (res.success) {
      setModo({ tipo: 'lista' });
      cargar();
      setMensaje('Plan guardado');
    } else {
      setMensaje(res.message || 'No se pudo guardar');
    }
  };

  if (loading) return <SkeletonList cantidad={3} />;

  if (modo.tipo === 'editar') {
    const esNuevo = !modo.plan;
    return (
      <ScrollView contentContainerStyle={[styles.wrap, centeredContent, { backgroundColor: colors.background }]}>
        <Text style={[type.section, { color: colors.text, marginBottom: 12 }]}>
          {esNuevo ? 'Nuevo plan' : `Editar ${modo.plan!.nombre}`}
        </Text>
        {esNuevo ? (
          <>
            <Text style={[type.label, { color: colors.textMuted }]}>Código</Text>
            <AppInput value={codigoNuevo} onChangeText={setCodigoNuevo} placeholder="hue_plus_extra" autoCapitalize="none" />
          </>
        ) : null}
        <Text style={[type.label, { color: colors.textMuted }]}>Nombre</Text>
        <AppInput value={nombre} onChangeText={setNombre} />
        <Text style={[type.label, { color: colors.textMuted }]}>Descripción</Text>
        <AppInput value={descripcion} onChangeText={setDescripcion} multiline style={{ minHeight: 72 }} />
        <Text style={[type.label, { color: colors.textMuted }]}>Monto mensual (ARS)</Text>
        <AppInput value={monto} onChangeText={setMonto} keyboardType="decimal-pad" />
        <Text style={[type.label, { color: colors.textMuted }]}>Orden</Text>
        <AppInput value={orden} onChangeText={setOrden} keyboardType="number-pad" />
        <View style={styles.switchRow}>
          <Text style={{ color: colors.text, flex: 1 }}>Sin comisión de venta</Text>
          <Switch value={sinComision} onValueChange={setSinComision} />
        </View>
        <Text style={[type.label, { color: colors.textMuted }]}>Beneficios (uno por línea)</Text>
        <AppInput
          value={itemsTexto}
          onChangeText={setItemsTexto}
          multiline
          style={{ minHeight: 120, textAlignVertical: 'top' }}
        />
        {mensaje ? <Text style={{ color: colors.danger, marginBottom: 8 }}>{mensaje}</Text> : null}
        <Pressable
          onPress={guardar}
          disabled={guardando}
          style={[styles.btn, { backgroundColor: colors.primary }]}
        >
          {guardando ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={{ color: colors.primaryText, fontWeight: '700' }}>Guardar</Text>
          )}
        </Pressable>
        <Pressable onPress={() => setModo({ tipo: 'lista' })} style={{ marginTop: 12, alignItems: 'center' }}>
          <Text style={{ color: colors.textMuted }}>Cancelar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.wrap, centeredContent, { backgroundColor: colors.background }]}>
      <Text style={[type.section, { color: colors.text, marginBottom: 12 }]}>Planes HuePlus</Text>
      {mensaje ? <Text style={{ color: colors.success, marginBottom: 8 }}>{mensaje}</Text> : null}

      {planes.map((p) => (
        <Pressable
          key={p.planId}
          onPress={() => abrir(p)}
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>{p.nombre}</Text>
          <Text style={{ color: colors.primary, marginTop: 4 }}>
            ${p.montoMensual.toLocaleString('es-AR')}/mes
            {p.sinComision ? ' · sin comisión' : ''}
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: 4 }}>{p.items.length} beneficios</Text>
        </Pressable>
      ))}

      <Pressable
        onPress={() => abrir(null)}
        style={[styles.card, { borderStyle: 'dashed', borderColor: colors.primary }]}
      >
        <Text style={{ color: colors.primary, fontWeight: '600' }}>+ Agregar plan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { padding: 16, flexGrow: 1 },
  card: { borderWidth: 1, borderRadius: radii.md, padding: 14, marginBottom: 10 },
  btn: { borderRadius: radii.md, padding: 14, alignItems: 'center', marginTop: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
});
