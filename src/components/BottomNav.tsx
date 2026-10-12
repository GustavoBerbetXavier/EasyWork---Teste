import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useInbox } from '@/lib/inbox';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { AppIcon, type IconName } from './ui';

const ITEMS: Record<string, { label: string; icon: IconName; iconActive: IconName }> = {
  inicio: { label: 'Início', icon: 'home-outline', iconActive: 'home' },
  servicos: { label: 'Serviços', icon: 'briefcase-outline', iconActive: 'briefcase' },
  mensagens: { label: 'Mensagens', icon: 'chatbox-ellipses-outline', iconActive: 'chatbox-ellipses' },
  perfil: { label: 'Perfil', icon: 'person-outline', iconActive: 'person' },
};

/** Barra inferior do layout (Início · Serviços · Mensagens · Perfil). */
export function BottomNav({ state, navigation }: BottomTabBarProps) {
  const { unreadTotal } = useInbox();
  // Telas extras dentro das abas (Planos, Avaliações) mantêm "Início" destacado.
  const currentName = state.routes[state.index]?.name;
  const highlighted = currentName && ITEMS[currentName] ? currentName : 'inicio';
  return (
    <View style={styles.bottomNav}>
      {state.routes.map((route) => {
        const item = ITEMS[route.name];
        if (!item) return null;
        const active = route.name === highlighted;
        const badge = route.name === 'mensagens' && unreadTotal > 0 ? String(Math.min(unreadTotal, 99)) : null;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (currentName !== route.name && !event.defaultPrevented) navigation.navigate(route.name);
        };
        return (
          <TouchableOpacity
            key={route.key}
            style={styles.navItem}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={item.label}
          >
            <View style={styles.navIconWrap}>
              <AppIcon name={active ? item.iconActive : item.icon} color={active ? C.teal : C.secondary} size={21} />
              {badge ? (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>{badge}</Text>
                </View>
              ) : null}
            </View>
            <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
