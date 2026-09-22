import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { elevation, radii } from '../theme/elevation';
import { fonts, type } from '../theme/typography';
import { useTheme } from '../theme/ThemeProvider';
import { ConfirmOpciones, registrarConfirmModal } from '../utils/confirmModal';

/**
 * Único modal de confirmación de toda la app (reemplaza `Alert.alert` donde
 * se lo pidió, empezando por HuePlay). Se monta una sola vez en la raíz —
 * ver `confirmModal.ts` para cómo se dispara desde cualquier lugar.
 */
export function ConfirmModalHost() {
  const { colors } = useTheme();
  const [pedido, setPedido] = useState<{ o: ConfirmOpciones; resolver: (v: boolean) => void } | null>(null);

  useEffect(() => registrarConfirmModal((o, resolver) => setPedido({ o, resolver })), []);

  const cerrar = (valor: boolean) => {
    pedido?.resolver(valor);
    setPedido(null);
  };

  return (
    <Modal visible={pedido !== null} transparent animationType="fade" onRequestClose={() => cerrar(false)}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => cerrar(false)} accessibilityRole="button" />
        {pedido ? (
          <View style={[styles.card, elevation.md, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.text }]}>{pedido.o.titulo}</Text>
            {pedido.o.mensaje ? <Text style={[styles.message, { color: colors.textMuted }]}>{pedido.o.mensaje}</Text> : null}
            <View style={styles.botonera}>
              <Pressable
                onPress={() => cerrar(false)}
                style={[styles.boton, styles.botonSec, { borderColor: colors.border }]}
              >
                <Text style={[styles.botonTexto, { color: colors.text }]}>{pedido.o.textoCancelar}</Text>
              </Pressable>
              <Pressable
                onPress={() => cerrar(true)}
                style={[styles.boton, { backgroundColor: pedido.o.destructivo ? colors.danger : colors.primary }]}
              >
                <Text style={[styles.botonTexto, { color: colors.primaryText }]}>{pedido.o.textoConfirmar}</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 16, 12, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 22,
    gap: 10,
  },
  title: { fontFamily: fonts.displaySemi, fontSize: 18 },
  message: { ...type.body, lineHeight: 22 },
  botonera: { flexDirection: 'row', gap: 10, marginTop: 8 },
  boton: { flex: 1, borderRadius: radii.pill, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  botonSec: { borderWidth: 1, backgroundColor: 'transparent' },
  botonTexto: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
