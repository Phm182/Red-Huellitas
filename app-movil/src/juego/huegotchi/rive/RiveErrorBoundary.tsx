import React, { Component, ReactNode } from 'react';
import { Text, View } from 'react-native';

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  onError?: (error: Error) => void;
};

type State = { failed: boolean };

/**
 * Evita que un crash de Rive deje la app en blanco.
 */
export class RiveErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.failed) return <>{this.props.fallback}</>;
    return this.props.children;
  }
}

export function RiveCrashFallback({ message }: { message?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <Text style={{ textAlign: 'center', opacity: 0.6 }}>
        {message ?? 'No se pudo mostrar Rive'}
      </Text>
    </View>
  );
}
