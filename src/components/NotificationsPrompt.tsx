import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { notify } from '@/lib/format';
import { enablePush, getPushStatus, pushUnsupportedHint, type PushStatus } from '@/lib/push';
import { C } from '@/theme/colors';
import { AppIcon } from './ui';

/**
 * Convite para ativar as notificações de mensagens neste aparelho.
 * `compact`: só aparece enquanto não estiver ativado (usado em Mensagens).
 */
export function NotificationsPrompt({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const [status, setStatus] = useState<PushStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getPushStatus().then((value) => active && setStatus(value));
      return () => {
        active = false;
      };
    }, []),
  );

  const enable = async () => {
    setLoading(true);
    try {
      const ok = await enablePush(userId);
      setStatus(await getPushStatus());
      if (!ok) {
        const current = await getPushStatus();
        notify(
          'Notificações não ativadas',
          current === 'denied'
            ? 'As notificações estão bloqueadas. Libere nas configurações do navegador ou do celular e tente de novo.'
            : current === 'unsupported'
              ? pushUnsupportedHint
              : 'Não foi possível ativar agora. Tente novamente.',
        );
      }
    } catch (err) {
      notify('Notificações não ativadas', err instanceof Error ? err.message : undefined);
    } finally {
      setLoading(false);
    }
  };

  if (status === null) return null;
  if (compact && (status === 'granted' || status === 'unsupported')) return null;

  if (status === 'granted') {
    return (
      <View style={[p.card, p.on]}>
        <AppIcon name="notifications" color={C.teal} size={19} />
        <View style={{ flex: 1 }}>
          <Text style={p.title}>Notificações ativadas</Text>
          <Text style={p.text}>Você será avisado quando chegar mensagem nova neste aparelho.</Text>
        </View>
      </View>
    );
  }

  const blocked = status === 'denied';
  const unsupported = status === 'unsupported';
  return (
    <View style={p.card}>
      <View style={p.icon}>
        <AppIcon name={blocked ? 'notifications-off-outline' : 'notifications-outline'} color={C.tealDark} size={19} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={p.title}>{blocked ? 'Notificações bloqueadas' : 'Ative as notificações'}</Text>
        <Text style={p.text}>
          {unsupported
            ? pushUnsupportedHint
            : blocked
              ? 'Libere as notificações do EASY WORK nas configurações do navegador ou do celular.'
              : 'Saiba na hora quando chegar mensagem nova, no computador e no celular.'}
        </Text>
      </View>
      {!blocked && !unsupported ? (
        <TouchableOpacity style={p.button} onPress={enable} disabled={loading} accessibilityRole="button">
          {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={p.buttonText}>Ativar</Text>}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const p = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.tealLight, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 14, padding: 12 },
  on: { backgroundColor: C.white, borderColor: C.border },
  icon: { width: 34, height: 34, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  title: { color: C.navy, fontSize: 12, fontWeight: '800' },
  text: { color: C.tealDark, fontSize: 11, lineHeight: 15 },
  button: { backgroundColor: C.navy, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9, minWidth: 64, alignItems: 'center' },
  buttonText: { color: C.white, fontSize: 12, fontWeight: '800' },
});
