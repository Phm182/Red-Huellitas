import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Red de seguridad global: sin esto, cualquier excepción sin capturar
 * durante un render (una pantalla con un caso borde no contemplado, un dato
 * inesperado del servidor, etc.) tira abajo la app ENTERA en un build de
 * release — en desarrollo se ve el LogBox rojo y parece "un error nomás",
 * pero en TestFlight/producción no hay LogBox: la app simplemente se
 * cierra, sin ningún cartel. Reportado así con el mapa ("entrás y se
 * cierra la aplicación") — un candidato real, porque el mapa es la pantalla
 * con más lógica de render (estilos dinámicos de MapLibre, ubicación en
 * vivo) y no había ningún Error Boundary en toda la app que lo frenara.
 *
 * Deliberadamente sin depender de `ThemeProvider`/i18n: si el problema fuera
 * justamente en uno de esos providers, un fallback que dependa de ellos
 * fallaría también. Colores y texto fijos, a propósito.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary] excepción sin capturar:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 10, textAlign: 'center' }}>
            Algo salió mal
          </Text>
          <Text style={{ color: '#B0B0B0', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>
            La pantalla tuvo un error inesperado. Podés intentar de nuevo.
          </Text>
          <ScrollView style={{ maxHeight: 90, marginVertical: 10 }}>
            <Text style={{ color: '#707070', fontSize: 11, textAlign: 'center' }}>{this.state.error.message}</Text>
          </ScrollView>
          <Pressable
            onPress={() => this.setState({ error: null })}
            style={{ backgroundColor: '#0F766E', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 28, marginTop: 8 }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Reintentar</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}
