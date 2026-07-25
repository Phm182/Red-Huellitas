import * as Linking from 'expo-linking';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { NoticiaExterna } from '../types';
import { useTheme } from '../theme/ThemeProvider';

interface NoticiaExternaCardProps {
  noticia: NoticiaExterna;
}

export function NoticiaExternaCard({ noticia }: NoticiaExternaCardProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Pressable
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => Linking.openURL(noticia.urlOriginal)}
    >
      {noticia.imagenUrl ? <Image source={{ uri: noticia.imagenUrl }} style={styles.imagen} /> : null}
      <View style={styles.body}>
        <Text style={{ color: colors.textMuted, fontSize: 11, marginBottom: 4 }}>
          {noticia.fuente.toUpperCase()}
        </Text>
        <Text style={{ color: colors.text, fontWeight: '700', fontSize: 15, marginBottom: 4 }}>
          {noticia.titulo}
        </Text>
        {noticia.resumen ? (
          <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={3}>
            {noticia.resumen}
          </Text>
        ) : null}
        <Text style={{ color: colors.primary, fontSize: 12, marginTop: 8, fontWeight: '600' }}>
          {t('noticias.readMore')} ↗
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 12, marginBottom: 12, overflow: 'hidden' },
  imagen: { width: '100%', height: 160 },
  body: { padding: 12 },
});
