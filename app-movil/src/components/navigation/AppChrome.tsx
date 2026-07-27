import { usePathname } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  APP_HEADER_HEIGHT,
  APP_TAB_BAR_HEIGHT,
  chromeForPath,
} from '../../navigation/chrome';
import { MAX_CONTENT_WIDTH } from '../../theme/layout';
import { useTheme } from '../../theme/ThemeProvider';
import { AppBottomNav } from './AppBottomNav';
import { AppTopHeader } from './AppTopHeader';
import { FloatingDock } from './FloatingDock';

type Props = {
  children: React.ReactNode;
};

/**
 * Columna centrada + header y menú inferior fijos en todas las pantallas (app).
 * El Stack hijo no dibuja su propio header/tab bar.
 */
export function AppChrome({ children }: Props) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const chrome = chromeForPath(pathname);
  const columnRef = useRef<View>(null);

  const [columnLeft, setColumnLeft] = useState(0);
  const [columnWidth, setColumnWidth] = useState(Math.min(MAX_CONTENT_WIDTH, windowWidth));

  const measureColumn = useCallback(() => {
    columnRef.current?.measureInWindow((x, _y, w) => {
      if (typeof w === 'number' && w > 0) {
        setColumnLeft(x);
        setColumnWidth(w);
      }
    });
  }, []);

  useEffect(() => {
    measureColumn();
  }, [measureColumn, windowWidth, pathname]);

  const onColumnLayout = useCallback(
    (_e: LayoutChangeEvent) => {
      measureColumn();
    },
    [measureColumn]
  );

  const headerOffset = chrome.header ? APP_HEADER_HEIGHT + insets.top : 0;
  const tabOffset = chrome.tabBar ? APP_TAB_BAR_HEIGHT + Math.max(insets.bottom - 8, 0) : 0;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View
        ref={columnRef}
        style={[
          styles.column,
          { backgroundColor: colors.background },
          Platform.OS === 'web' ? ({ height: '100vh' } as object) : null,
        ]}
        onLayout={onColumnLayout}
      >
        <View
          style={[
            styles.content,
            {
              paddingTop: headerOffset,
              paddingBottom: tabOffset,
              backgroundColor: colors.background,
            },
          ]}
        >
          {children}
        </View>

        {chrome.header ? <AppTopHeader columnWidth={columnWidth} columnLeft={columnLeft} /> : null}
        {chrome.dock ? (
          <FloatingDock
            columnWidth={columnWidth}
            columnLeft={columnLeft}
            tabBarVisible={chrome.tabBar}
          />
        ) : null}
        {chrome.tabBar ? <AppBottomNav columnWidth={columnWidth} columnLeft={columnLeft} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  column: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  content: {
    flex: 1,
  },
});
