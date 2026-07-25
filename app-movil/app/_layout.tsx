import { Stack } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import '../src/i18n/i18n';
import { AuthProvider } from '../src/auth/AuthProvider';
import { FontBootstrap } from '../src/theme/FontBootstrap';
import { fonts } from '../src/theme/typography';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';

function StackWithTheme() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(setup)" options={{ headerShown: false }} />
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
      <FontBootstrap>
        <AuthProvider>
          <StackWithTheme />
        </AuthProvider>
      </FontBootstrap>
    </ThemeProvider>
  );
}
