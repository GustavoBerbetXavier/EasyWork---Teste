// Notificações no navegador (computador e site instalado no celular) via Web Push.
import { forgetDeviceToken, rememberDeviceToken } from './pushStore';

export type PushStatus = 'granted' | 'denied' | 'default' | 'unsupported';

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? '';

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);

export const pushUnsupportedHint = isIOS()
  ? 'No iPhone, adicione o EASY WORK à Tela de Início (Compartilhar > Adicionar à Tela de Início) e abra por lá para ativar as notificações.'
  : 'Este navegador não permite notificações. Tente pelo Chrome, Edge ou Firefox.';

function supported() {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window && VAPID_PUBLIC_KEY.length > 0;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
}

export async function getPushStatus(): Promise<PushStatus> {
  if (!supported()) return 'unsupported';
  return Notification.permission as PushStatus;
}

async function registerSubscription(userId: string) {
  const registration = await navigator.serviceWorker.register('/sw.js');
  await navigator.serviceWorker.ready;
  const subscription =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) }));
  const json = subscription.toJSON();
  if (!json.endpoint) throw new Error('Não foi possível ativar as notificações neste navegador.');
  await rememberDeviceToken(userId, 'web', json.endpoint, json.keys ?? null);
}

/** Pede permissão e registra este navegador. Devolve `true` se as notificações ficaram ativas. */
export async function enablePush(userId: string): Promise<boolean> {
  if (!supported()) return false;
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return false;
  await registerSubscription(userId);
  return true;
}

/** Se a permissão já foi dada, garante que este navegador está registrado (sem perguntar nada). */
export async function syncPush(userId: string) {
  if ((await getPushStatus()) !== 'granted') return;
  await registerSubscription(userId).catch(() => {});
}

export async function disablePushForThisDevice() {
  await forgetDeviceToken();
}

/** No navegador, o clique na notificação é tratado pelo service worker (public/sw.js). */
export function usePushNavigation(_enabled: boolean) {}
