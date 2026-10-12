// Notificações no celular (APK / build de desenvolvimento) via Expo Push.
// A versão do navegador fica em push.web.ts.
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { forgetDeviceToken, rememberDeviceToken } from './pushStore';

export type PushStatus = 'granted' | 'denied' | 'default' | 'unsupported';

// Com o app aberto, a notificação também aparece como banner.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const pushUnsupportedHint = 'Notificações funcionam no aplicativo instalado (APK), não no Expo Go.';

export async function getPushStatus(): Promise<PushStatus> {
  if (!Device.isDevice) return 'unsupported';
  const { status, canAskAgain } = await Notifications.getPermissionsAsync();
  if (status === 'granted') return 'granted';
  return canAskAgain ? 'default' : 'denied';
}

async function registerToken(userId: string) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('mensagens', {
      name: 'Mensagens',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0D9488',
    });
  }
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await rememberDeviceToken(userId, 'expo', token, null);
}

/** Pede permissão e registra este celular. Devolve `true` se as notificações ficaram ativas. */
export async function enablePush(userId: string): Promise<boolean> {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') return false;
  try {
    await registerToken(userId);
    return true;
  } catch {
    // No Expo Go (Android) não existe token de push: só no app instalado.
    return false;
  }
}

/** Se a permissão já foi dada, garante que este aparelho está registrado (sem perguntar nada). */
export async function syncPush(userId: string) {
  if ((await getPushStatus()) !== 'granted') return;
  await registerToken(userId).catch(() => {});
}

export async function disablePushForThisDevice() {
  await forgetDeviceToken();
}

/** Ao tocar na notificação, abre a conversa. */
export function usePushNavigation(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const open = (response: Notifications.NotificationResponse | null) => {
      const url = response?.notification.request.content.data?.url;
      if (typeof url === 'string') router.push(url as never);
    };
    open(Notifications.getLastNotificationResponse());
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [enabled]);
}
