import { router } from 'expo-router';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { formatInboxTime } from '@/lib/format';
import { useInbox } from '@/lib/inbox';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { Sheet } from './Sheet';
import { AppIcon, Avatar, EmptyState } from './ui';

/** Sino do topo: mostra as conversas com mensagens novas. */
export function NotificationsButton() {
  const { conversations, unreadTotal } = useInbox();
  const [open, setOpen] = useState(false);
  const unread = conversations.filter((item) => item.unread > 0);

  return (
    <>
      <TouchableOpacity style={styles.iconCircle} onPress={() => setOpen(true)} accessibilityLabel={`Notificações${unreadTotal ? `, ${unreadTotal} novas` : ''}`}>
        <AppIcon name="notifications-outline" color={C.navy} size={21} />
        {unreadTotal > 0 ? <View style={styles.notificationDot} /> : null}
      </TouchableOpacity>
      <Sheet visible={open} title="Notificações" onClose={() => setOpen(false)}>
        {unread.length === 0 ? (
          <EmptyState icon="notifications-off-outline" text="Tudo em dia! Você não tem mensagens novas." />
        ) : (
          unread.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.conversationCard}
              onPress={() => {
                setOpen(false);
                router.push(`/chat/${item.id}`);
              }}
            >
              <Avatar name={item.other.full_name} uri={item.other.avatar_url} size={44} />
              <View style={styles.conversationBody}>
                <View style={styles.conversationTop}>
                  <Text style={styles.conversationName} numberOfLines={1}>{item.other.full_name}</Text>
                  <Text style={styles.conversationTime}>{formatInboxTime(item.last_message_at)}</Text>
                </View>
                <Text style={styles.conversationPreview} numberOfLines={2}>
                  {item.unread === 1 ? 'Nova mensagem: ' : `${item.unread} novas mensagens: `}
                  {item.last_message}
                </Text>
              </View>
              <AppIcon name="chevron-forward" color={C.muted} size={18} />
            </TouchableOpacity>
          ))
        )}
      </Sheet>
    </>
  );
}
