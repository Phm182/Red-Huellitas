import { Redirect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../src/auth/AuthProvider';
import { isSetupCompleto } from '../src/legal/setupStorage';
import { useTheme } from '../src/theme/ThemeProvider';

export default function Index() {
  const { isLoading, user, token } = useAuth();
  const { colors } = useTheme();
  const [setupReady, setSetupReady] = useState(false);
  const [setupOk, setSetupOk] = useState(false);

  useEffect(() => {
    isSetupCompleto().then((ok) => {
      setSetupOk(ok);
      setSetupReady(true);
    });
  }, []);

  if (isLoading || !setupReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!setupOk) {
    return <Redirect href="/(setup)" />;
  }

  if (!token || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (!user.onboardingCompleto) {
    return <Redirect href="/(onboarding)/usuario-zona" />;
  }

  return <Redirect href="/(app)/(tabs)" />;
}
