import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../src/i18n/i18n';
import { AuthProvider } from '../src/auth/AuthProvider';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

function StackWithTheme() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
      <Stack.Screen name="(app)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal-reporte"
        options={{ presentation: 'modal', title: t('report.title') }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StackWithTheme />
      </AuthProvider>
    </ThemeProvider>
  );
}
