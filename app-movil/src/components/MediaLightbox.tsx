import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../theme/typography';

type Props = {
  visible: boolean;
  uris: string[];
  initialIndex?: number;
  onClose: () => void;
};

const { width: W, height: H } = Dimensions.get('window');

/** Visor a pantalla completa para una o varias fotos. */
export function MediaLightbox({ visible, uris, initialIndex = 0, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<string>>(null);
  const [indice, setIndice] = useState(initialIndex);

  useEffect(() => {
    if (visible) {
      setIndice(initialIndex);
      requestAnimationFrame(() => {
        listRef.current?.scrollToIndex({ index: initialIndex, animated: false });
      });
    }
  }, [visible, initialIndex]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setIndice(viewableItems[0].index);
  }).current;

  if (!visible || uris.length === 0) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Pressable style={styles.cerrar} onPress={onClose} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>

        {uris.length > 1 ? (
          <Text style={styles.contador}>
            {indice + 1} / {uris.length}
          </Text>
        ) : null}

        <FlatList
          ref={listRef}
          data={uris}
          horizontal
          pagingEnabled
          keyExtractor={(u, i) => `${u}-${i}`}
          renderItem={({ item }) => (
            <View style={styles.slide}>
              <Image source={{ uri: item }} style={styles.foto} contentFit="contain" />
            </View>
          )}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.index * W, animated: false });
          }}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
          showsHorizontalScrollIndicator={false}
          getItemLayout={(_, index) => ({ length: W, offset: W * index, index })}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  cerrar: { position: 'absolute', top: 16, right: 16, zIndex: 2, padding: 8 },
  contador: {
    position: 'absolute',
    top: 22,
    alignSelf: 'center',
    zIndex: 2,
    color: '#fff',
    fontFamily: fonts.bodySemi,
    fontSize: 14,
  },
  slide: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  foto: { width: W, height: H * 0.85 },
});
