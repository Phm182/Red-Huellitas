import { Ionicons } from '@expo/vector-icons';
import { router, Tabs } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { elevation, radii } from '../../../src/theme/elevation';
import { fonts } from '../../../src/theme/typography';
import { useTheme } from '../../../src/theme/ThemeProvider';

function TabIcon({
  name,
  color,
  focused,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.iconWrap,
        focused && { backgroundColor: colors.primarySoft },
      ]}
    >
      <Ionicons name={name} size={22} color={color} />
    </View>
  );
}

export default function TabsLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.displaySemi, fontSize: 18 },
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 11, marginBottom: 2 },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('feed.tabTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'paw' : 'paw-outline'} color={String(color)} focused={focused} />
          ),
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/(app)/publicaciones/nueva')}
              style={[styles.composeBtn, { backgroundColor: colors.primary }, elevation.sm]}
            >
              <Ionicons name="add" size={22} color={colors.primaryText} />
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="noticias"
        options={{
          title: t('noticias.tabTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'newspaper' : 'newspaper-outline'} color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shorts"
        options={{
          title: t('shorts.tabTitle'),
          headerShown: false,
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'play-circle' : 'play-circle-outline'} color={String(color)} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="mas"
        options={{
          title: t('home.masTabTitle'),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} color={String(color)} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 40,
    height: 28,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeBtn: {
    marginRight: 14,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
