import { Tabs } from 'expo-router';
import React from 'react';

/**
 * Huelligram es la única pantalla de este grupo: Noticias y Huetube pasaron a
 * ser solapas adentro, y "Más" se mudó a /(app)/configuracion. El menú inferior
 * y el header los dibuja AppChrome en el layout padre, por eso el tabBar y el
 * header de Tabs quedan apagados.
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none', height: 0 },
      }}
    >
      <Tabs.Screen name="index" />
    </Tabs>
  );
}
