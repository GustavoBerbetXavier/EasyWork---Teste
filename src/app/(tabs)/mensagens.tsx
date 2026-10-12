import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { NotificationsPrompt } from '@/components/NotificationsPrompt';
import { AppIcon, Avatar, DotPill, EmptyState, ErrorBanner } from '@/components/ui';
import { useSignedIn } from '@/lib/auth';
import { formatInboxTime } from '@/lib/format';
import { useInbox } from '@/lib/inbox';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function MensagensScreen() {
  const { userId, profile } = useSignedIn();
  const { conversations, loading, error, refresh } = useInbox();
  const [search, setSearch] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const unreadCount = conversations.filter((item) => item.unread > 0).length;
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return conversations.filter((item) => {
      const matches = !term || `${item.other.full_name} ${item.last_message} ${item.subject}`.toLowerCase().includes(term);
      return matches && (!unreadOnly || item.unread > 0);
    });
  }, [conversations, search, unreadOnly]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.screenBg}
      contentContainerStyle={styles.pageContent}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} colors={[C.teal]} />}
    >
      <View style={{ gap: 6 }}>
        <DotPill label="CAIXA DE ENTRADA" />
        <Text style={inbox.title}>Mensagens</Text>
        <Text style={inbox.subtitle}>Conversas com clientes e profissionais.</Text>
      </View>
      <NotificationsPrompt userId={userId} compact />
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" color={C.muted} size={20} />
        <TextInput value={search} onChangeText={setSearch} placeholder="Buscar conversas..." placeholderTextColor={C.muted} style={styles.searchInput} />
      </View>
      <View style={styles.filterChips}>
        <TouchableOpacity style={[styles.filterChip, !unreadOnly && styles.filterChipActive]} onPress={() => setUnreadOnly(false)}>
          <Text style={[styles.filterChipText, !unreadOnly && styles.filterChipTextActive]}>Todas {conversations.length}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.filterChip, unreadOnly && styles.filterChipActive]} onPress={() => setUnreadOnly(true)}>
          <Text style={[styles.filterChipText, unreadOnly && styles.filterChipTextActive]}>Não lidas {unreadCount}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.inboxLabelRow}>
        <Text style={inbox.recent}>Recentes</Text>
      </View>
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading && conversations.length === 0 ? <ActivityIndicator color={C.teal} /> : null}
      {filtered.map((conversation) => {
        const isProvider = conversation.other.role === 'profissional';
        return (
          <TouchableOpacity key={conversation.id} style={styles.conversationCard} onPress={() => router.push(`/chat/${conversation.id}`)}>
            <Avatar name={conversation.other.full_name} uri={conversation.other.avatar_url} size={50} />
            <View style={styles.conversationBody}>
              <View style={styles.conversationTop}>
                <Text style={styles.conversationName} numberOfLines={1}>{conversation.other.full_name}</Text>
                <Text style={styles.conversationTime}>{formatInboxTime(conversation.last_message_at)}</Text>
              </View>
              <View style={[inbox.roleChip, isProvider && { backgroundColor: C.amberLight }]}>
                <Text style={[inbox.roleText, isProvider && { color: '#B45309' }]}>{isProvider ? 'PRESTADOR' : 'CONTRATANTE'}</Text>
              </View>
              <Text style={[styles.conversationPreview, conversation.unread > 0 && inbox.previewUnread]} numberOfLines={2}>
                {conversation.last_message || conversation.subject || 'Conversa iniciada'}
              </Text>
            </View>
            {conversation.unread > 0 ? (
              <View style={styles.unreadBubble}>
                <Text style={styles.unreadBubbleText}>{conversation.unread}</Text>
              </View>
            ) : (
              <AppIcon name="chevron-forward" color={C.muted} size={18} />
            )}
          </TouchableOpacity>
        );
      })}
      {!loading && conversations.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          text={profile.role === 'contratante' ? 'Você ainda não conversou com nenhum profissional.' : 'Quando um cliente entrar em contato, a conversa aparece aqui.'}
          action={profile.role === 'contratante' ? 'Encontrar profissionais' : undefined}
          onAction={() => router.navigate('/servicos')}
        />
      ) : null}
      {conversations.length > 0 && filtered.length === 0 ? (
        <EmptyState
          icon="chatbubbles-outline"
          text="Nenhuma conversa corresponde ao filtro."
          action="Limpar filtros"
          onAction={() => {
            setSearch('');
            setUnreadOnly(false);
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const inbox = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 31, color: C.navy, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  subtitle: { color: C.secondary, fontSize: 12, lineHeight: 18 },
  recent: { color: C.navy, fontSize: 12, fontWeight: '800' },
  roleChip: { alignSelf: 'flex-start', backgroundColor: C.tealLight, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  roleText: { color: C.tealDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  previewUnread: { color: C.navy, fontWeight: '600' },
});
