import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function FloatingReportButton() {
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.fab, { backgroundColor: colors.primary }]}
      onPress={() => router.push('/modal-reporte')}
      accessibilityLabel="Reportar o solicitar"
    >
      <Text style={styles.icon}>📣</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  icon: { fontSize: 24 },
});
