import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAuth } from '../../auth/AuthProvider';
import { StoredAccount } from '../../auth/accountsStorage';
import { radii } from '../../theme/elevation';
import { fonts, type } from '../../theme/typography';
import { useTheme } from '../../theme/ThemeProvider';
import { useAvatarDisplay } from '../../utils/avatarDisplayStore';
import { rhAvatarUrl } from '../../utils/media';

type Props = {
  visible: boolean;
  onClose: () => void;
};

function labelCuenta(account: StoredAccount): string {
  return account.user.username
    ? `@${account.user.username}`
    : account.user.nombreCompleto || account.user.email;
}

export function AccountSwitcherModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { user, accounts, switchAccount, avatarBust } = useAuth();
  const avatarDisplay = useAvatarDisplay();

  const onSelect = async (userId: number) => {
    if (user?.userId === userId) {
      onClose();
      return;
    }
    const res = await switchAccount(userId);
    onClose();
    if (res.success) {
      router.replace('/(app)/(tabs)');
    }
  };

  const onAdd = () => {
    onClose();
    router.push('/(auth)/login');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={[styles.title, { color: colors.text }]}>{t('home.switchAccountTitle')}</Text>
          <ScrollView style={styles.list} bounces={false}>
            {accounts.map((account) => {
              const active = account.user.userId === user?.userId;
              return (
                <Pressable
                  key={account.user.userId}
                  onPress={() => onSelect(account.user.userId)}
                  style={[
                    styles.row,
                    {
                      backgroundColor: active ? colors.primarySoft : 'transparent',
                      borderColor: colors.border,
                    },
                  ]}
                >
                  {account.user.avatarPath || (active && avatarDisplay.uri) ? (
                    <Image
                      key={`acc-av-${account.user.userId}-${active ? avatarDisplay.version : 0}`}
                      source={{
                        uri:
                          active && avatarDisplay.uri
                            ? avatarDisplay.uri
                            : rhAvatarUrl(
                                account.user.avatarPath!,
                                active ? avatarBust : (account.user.avatarBust ?? 0)
                              ),
                      }}
                      style={styles.avatar}
                      contentFit="cover"
                      cachePolicy="none"
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.border }]}>
                      <Ionicons name="person" size={18} color={colors.textMuted} />
                    </View>
                  )}
                  <View style={styles.meta}>
                    <Text style={[type.bodySm, { color: colors.text, fontFamily: fonts.bodySemi }]} numberOfLines={1}>
                      {labelCuenta(account)}
                    </Text>
                    <Text style={[type.caption, { color: colors.textMuted }]} numberOfLines={1}>
                      {account.user.nombreCompleto}
                    </Text>
                  </View>
                  {active ? (
                    <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                  ) : (
                    <View style={{ width: 22 }} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <Pressable
            onPress={onAdd}
            style={[styles.addBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="person-add-outline" size={20} color={colors.primary} />
            <Text style={[type.label, { color: colors.primary }]}>{t('home.addAccount')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 18, 16, 0.45)',
    justifyContent: 'flex-start',
    paddingTop: 72,
    paddingHorizontal: 16,
  },
  sheet: {
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    maxHeight: 420,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontFamily: fonts.displaySemi,
    fontSize: 16,
    marginBottom: 10,
  },
  list: { maxHeight: 280 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    marginBottom: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: { flex: 1, minWidth: 0 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
