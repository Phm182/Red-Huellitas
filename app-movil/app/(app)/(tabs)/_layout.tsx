import { router, Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';
import { useTheme } from '../../../src/theme/ThemeProvider';

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('feed.tabTitle'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🐾</Text>,
          headerRight: () => (
            <Pressable onPress={() => router.push('/(app)/publicaciones/nueva')} style={{ marginRight: 16 }}>
              <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>+</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="noticias"
        options={{
          title: t('noticias.tabTitle'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📰</Text>,
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: t('shorts.tabTitle'),
          headerShown: false,
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>▶️</Text>,
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: t('home.masTabTitle'),
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>☰</Text>,
        }}
      />
    </Tabs>
  );
}
