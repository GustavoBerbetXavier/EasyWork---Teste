import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ContactInfoSheet } from '@/components/ContactInfoSheet';
import { ReviewSheet } from '@/components/ReviewSheet';
import { Sheet } from '@/components/Sheet';
import { AppIcon, Avatar, ErrorBanner, LoadingView, type IconName } from '@/components/ui';
import { getConversation, listMessages, markConversationRead, sendMessage, subscribeToMessages, uploadImage } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { formatDayDivider, formatTime, isSameDay, notify } from '@/lib/format';
import { pickImage } from '@/lib/images';
import { useInbox } from '@/lib/inbox';
import type { Message, Profile } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, profile, isDemo } = useSignedIn();
  const { refresh: refreshInbox } = useInbox();
  const [other, setOther] = useState<Profile | null>(null);
  const [subject, setSubject] = useState('');
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const listRef = useRef<FlatList<Message>>(null);

  const markRead = useCallback(async () => {
    await markConversationRead(id, userId);
    refreshInbox();
  }, [id, userId, refreshInbox]);

  const applyChat = useCallback(
    ([conversation, list]: [{ subject: string; other: Profile }, Message[]]) => {
      setError(null);
      setOther(conversation.other);
      setSubject(conversation.subject);
      setMessages(list);
      markRead();
    },
    [markRead],
  );

  const showError = (err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível abrir a conversa.');

  const load = useCallback(() => {
    Promise.all([getConversation(id, userId), listMessages(id)]).then(applyChat).catch(showError);
  }, [id, userId, applyChat]);

  useEffect(() => {
    let active = true;
    Promise.all([getConversation(id, userId), listMessages(id)])
      .then((result) => active && applyChat(result))
      .catch((err) => active && showError(err));
    return () => {
      active = false;
    };
  }, [id, userId, applyChat]);

  useEffect(() => {
    return subscribeToMessages(id, (message) => {
      setMessages((current) => {
        if (!current) return current;
        const exists = current.some((item) => item.id === message.id);
        if (exists) return current.map((item) => (item.id === message.id ? message : item));
        return [...current, message];
      });
      if (message.sender_id !== userId && !message.read_at) markRead();
    });
  }, [id, userId, markRead]);

  const send = async (imageUrl?: string) => {
    const text = draft.trim();
    if (!text && !imageUrl) return;
    setSending(true);
    try {
      const message = await sendMessage(id, userId, imageUrl ? '' : text, imageUrl);
      setMessages((current) => (current && !current.some((item) => item.id === message.id) ? [...current, message] : current));
      if (!imageUrl) setDraft('');
      refreshInbox();
    } catch (err) {
      notify('Mensagem não enviada', err instanceof Error ? err.message : undefined);
    } finally {
      setSending(false);
    }
  };

  const attach = async () => {
    const image = await pickImage();
    if (!image) return;
    setSending(true);
    try {
      const url = await uploadImage(userId, 'chat', image.uri, image.mimeType);
      await send(url);
    } catch (err) {
      notify('Foto não enviada', err instanceof Error ? err.message : undefined);
      setSending(false);
    }
  };

  const otherIsProvider = other?.role === 'profissional';
  const subtitle = isDemo
    ? `${otherIsProvider ? 'Prestador' : 'Contratante'} · conversa demonstrativa`
    : otherIsProvider
      ? `Prestador${other?.specialty ? ` · ${other.specialty}` : ''}`
      : `Contratante${other?.city ? ` · ${other.city}` : ''}`;

  const menuItems: { label: string; icon: IconName; onPress: () => void }[] = [
    { label: otherIsProvider ? 'Informações do profissional' : 'Informações do contratante', icon: 'information-circle-outline', onPress: () => setInfoOpen(true) },
  ];
  if (otherIsProvider && other) {
    menuItems.push({ label: 'Ver perfil do profissional', icon: 'person-circle-outline', onPress: () => router.push(`/profissional/${other.id}`) });
    if (profile.role === 'contratante') menuItems.push({ label: 'Avaliar profissional', icon: 'star-outline', onPress: () => setReviewOpen(true) });
  }

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const mine = item.sender_id === userId;
    const previous = messages?.[index - 1];
    const showDivider = !previous || !isSameDay(previous.created_at, item.created_at);
    return (
      <View style={{ gap: 13 }}>
        {showDivider ? (
          <View style={chat.dividerWrap}>
            <Text style={chat.dividerText}>{formatDayDivider(item.created_at)}</Text>
          </View>
        ) : null}
        <View style={[styles.messageRow, mine ? styles.messageRowMine : styles.messageRowOther]}>
          <View style={[styles.messageBubble, mine ? chat.bubbleMine : styles.messageOther]}>
            {item.image_url ? (
              <TouchableOpacity onPress={() => setViewer(item.image_url)}>
                <Image source={{ uri: item.image_url }} style={chat.image} />
              </TouchableOpacity>
            ) : null}
            {item.body ? <Text style={styles.messageText}>{item.body}</Text> : null}
            <View style={styles.messageMeta}>
              <Text style={styles.messageTime}>{formatTime(item.created_at)}</Text>
              {mine ? <AppIcon name={item.read_at ? 'checkmark-done' : 'checkmark'} color={item.read_at ? C.teal : C.muted} size={14} /> : null}
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeChat} edges={['top', 'bottom']}>
      <View style={styles.chatHeader}>
        <TouchableOpacity style={styles.backButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/mensagens'))} accessibilityLabel="Voltar">
          <AppIcon name="arrow-back" color={C.navy} size={22} />
        </TouchableOpacity>
        <Avatar name={other?.full_name ?? ''} uri={other?.avatar_url} size={40} />
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName} numberOfLines={1}>{other?.full_name ?? 'Carregando...'}</Text>
          <Text style={styles.chatHeaderRole} numberOfLines={1}>{other ? subtitle : ''}</Text>
        </View>
        <TouchableOpacity style={chat.menuButton} onPress={() => setMenu(true)} accessibilityLabel="Opções da conversa" disabled={!other}>
          <AppIcon name="reorder-three-outline" color={C.secondary} size={22} />
        </TouchableOpacity>
      </View>
      <KeyboardAvoidingView style={styles.chatScreen} behavior="padding" keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        {error ? <View style={{ padding: 16 }}><ErrorBanner message={error} onRetry={load} /></View> : null}
        {messages === null && !error ? <LoadingView /> : null}
        {messages ? (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={styles.chatContent}
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
            ListHeaderComponent={
              <View style={{ gap: 13, marginBottom: 13 }}>
                {isDemo ? (
                  <View style={chat.demoChip}>
                    <Text style={chat.demoChipText}>DADOS DE DEMONSTRAÇÃO</Text>
                  </View>
                ) : null}
                {subject ? (
                  <View style={[styles.subjectCard, { marginTop: 0 }]}>
                    <View style={[styles.subjectIcon, { backgroundColor: C.amberLight }]}>
                      <AppIcon name="clipboard-outline" color="#D97706" size={20} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjectEyebrow}>ASSUNTO DA CONVERSA</Text>
                      <Text style={styles.subjectTitle}>{subject}</Text>
                      <Text style={styles.subjectSub}>{isDemo ? 'Solicitação demonstrativa' : 'Combine detalhes, valores e horários por aqui.'}</Text>
                    </View>
                  </View>
                ) : null}
              </View>
            }
            ListEmptyComponent={
              <View style={styles.chatNotice}>
                <AppIcon name="information-circle-outline" size={17} color={C.tealDark} />
                <Text style={styles.chatNoticeText}>Envie a primeira mensagem para começar a conversa.</Text>
              </View>
            }
          />
        ) : null}
        <View style={styles.chatInputBar}>
          <TouchableOpacity onPress={attach} style={chat.attach} disabled={sending || !messages} accessibilityLabel="Enviar foto">
            <AppIcon name="add" size={24} color={C.secondary} />
          </TouchableOpacity>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            style={styles.chatInput}
            placeholder="Escreva uma mensagem..."
            placeholderTextColor={C.muted}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={() => send()}
            style={[chat.send, (!draft.trim() || sending) && styles.sendButtonDisabled]}
            disabled={!draft.trim() || sending}
            accessibilityLabel="Enviar mensagem"
          >
            {sending ? <ActivityIndicator color={C.white} size="small" /> : <AppIcon name="send" size={17} color={C.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Sheet visible={menu} title="Opções da conversa" onClose={() => setMenu(false)}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={chat.menuRow}
            onPress={() => {
              setMenu(false);
              item.onPress();
            }}
          >
            <View style={styles.modalInfoIcon}>
              <AppIcon name={item.icon} color={C.teal} size={19} />
            </View>
            <Text style={chat.menuLabel}>{item.label}</Text>
            <AppIcon name="chevron-forward" color={C.muted} size={18} />
          </TouchableOpacity>
        ))}
      </Sheet>
      <ContactInfoSheet visible={infoOpen} person={other} subject={subject} onClose={() => setInfoOpen(false)} />
      {other && otherIsProvider ? (
        <ReviewSheet visible={reviewOpen} providerId={other.id} providerName={other.full_name} clientId={userId} onClose={() => setReviewOpen(false)} />
      ) : null}
      <Modal visible={Boolean(viewer)} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={chat.viewer} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={chat.viewerImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const chat = StyleSheet.create({
  menuButton: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  dividerWrap: { alignItems: 'center' },
  dividerText: { color: C.muted, fontSize: 9, fontWeight: '700' },
  demoChip: { alignSelf: 'center', borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  demoChipText: { color: C.secondary, fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  bubbleMine: { backgroundColor: '#E6F6F3', borderWidth: 1, borderColor: '#BDEBE5', borderBottomRightRadius: 5 },
  image: { width: 200, height: 200, borderRadius: 10, marginBottom: 4, backgroundColor: C.border },
  attach: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 12 },
  menuLabel: { flex: 1, color: C.navy, fontSize: 13, fontWeight: '800' },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImage: { width: '100%', height: '80%' },
});
