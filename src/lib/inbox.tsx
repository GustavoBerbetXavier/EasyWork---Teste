import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { listConversations, subscribeToInbox } from './api';
import { useAuth } from './auth';
import type { ConversationSummary } from './types';

type InboxContextValue = {
  conversations: ConversationSummary[];
  unreadTotal: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const InboxContext = createContext<InboxContextValue>({
  conversations: [],
  unreadTotal: 0,
  loading: false,
  error: null,
  refresh: async () => {},
});

/** Mantém a lista de conversas e o total de mensagens não lidas sempre atualizados. */
export function InboxProvider({ children }: { children: React.ReactNode }) {
  const { userId, profile } = useAuth();
  const profileId = profile?.id ?? null;
  // Conversas ligadas ao usuário a que pertencem (ao sair, a lista some sozinha).
  const [data, setData] = useState<{ userId: string; conversations: ConversationSummary[]; error: string | null } | null>(null);

  const fetchInbox = useCallback(async (id: string) => {
    try {
      return { userId: id, conversations: await listConversations(id), error: null as string | null };
    } catch (err) {
      return { userId: id, conversations: null, error: err instanceof Error ? err.message : 'Não foi possível carregar as conversas.' };
    }
  }, []);

  const applyInbox = useCallback((result: Awaited<ReturnType<typeof fetchInbox>>) => {
    // Em caso de erro mantém a última lista conhecida.
    setData((current) => ({
      userId: result.userId,
      conversations: result.conversations ?? (current?.userId === result.userId ? current.conversations : []),
      error: result.error,
    }));
  }, []);

  const refresh = useCallback(async () => {
    if (!userId) return;
    applyInbox(await fetchInbox(userId));
  }, [userId, fetchInbox, applyInbox]);

  useEffect(() => {
    if (!userId || !profileId) return;
    let active = true;
    const load = () => fetchInbox(userId).then((result) => active && applyInbox(result));
    load();
    const unsubscribe = subscribeToInbox(userId, load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, [userId, profileId, fetchInbox, applyInbox]);

  const mine = data && data.userId === userId ? data : null;
  const conversations = useMemo(() => mine?.conversations ?? [], [mine]);

  const value = useMemo(() => ({
    conversations,
    unreadTotal: conversations.reduce((total, item) => total + item.unread, 0),
    loading: Boolean(userId && profileId && !mine),
    error: mine?.error ?? null,
    refresh,
  }), [conversations, mine, userId, profileId, refresh]);

  return <InboxContext.Provider value={value}>{children}</InboxContext.Provider>;
}

export function useInbox() {
  return useContext(InboxContext);
}
