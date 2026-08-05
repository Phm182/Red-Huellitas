import { Stack } from 'expo-router';
import React from 'react';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="usuario-zona" />
      <Stack.Screen name="verificacion" />
      {/* Sin gesto de volver: es bloqueante hasta que cargue la fecha. */}
      <Stack.Screen name="fecha-nacimiento" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
