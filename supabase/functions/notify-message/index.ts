// Envia a notificação de "mensagem nova" para todos os aparelhos de quem recebeu a mensagem.
// O app chama esta função logo depois de enviar uma mensagem.
// Segredos (Supabase > Edge Functions > Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.
// Publique com: npx supabase functions deploy notify-message
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY');
const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY');
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT') ?? 'https://easywork-teste.vercel.app', vapidPublic, vapidPrivate);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await admin.auth.getUser(jwt);
  if (!auth.user) return json({ error: 'not authenticated' }, 401);

  const { message_id } = await req.json().catch(() => ({}));
  if (!message_id) return json({ error: 'message_id obrigatório' }, 400);

  const { data: message } = await admin
    .from('messages')
    .select('id, body, image_url, sender_id, conversation_id, conversations(client_id, provider_id)')
    .eq('id', message_id)
    .single();
  // Só quem enviou a mensagem pode pedir a notificação dela.
  if (!message || message.sender_id !== auth.user.id) return json({ error: 'mensagem não encontrada' }, 404);

  const conversation = message.conversations as unknown as { client_id: string; provider_id: string };
  const recipientId = conversation.client_id === message.sender_id ? conversation.provider_id : conversation.client_id;

  const [{ data: sender }, { data: devices }] = await Promise.all([
    admin.from('profiles').select('full_name').eq('id', message.sender_id).single(),
    admin.from('push_subscriptions').select('id, kind, token, keys').eq('user_id', recipientId),
  ]);
  if (!devices?.length) return json({ sent: 0 });

  const title = sender?.full_name ?? 'Nova mensagem';
  const body = message.body ? message.body.slice(0, 140) : '📷 Foto';
  const url = `/chat/${message.conversation_id}`;
  const expired: string[] = [];
  let sent = 0;

  // Navegadores (Web Push)
  for (const device of devices.filter((item) => item.kind === 'web')) {
    if (!vapidPublic || !vapidPrivate) break;
    try {
      await webpush.sendNotification(
        { endpoint: device.token, keys: device.keys as { p256dh: string; auth: string } },
        JSON.stringify({ title, body, url, tag: message.conversation_id }),
        { TTL: 60 * 60 * 24 },
      );
      sent++;
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) expired.push(device.id);
    }
  }

  // Celulares (Expo Push)
  const phones = devices.filter((item) => item.kind === 'expo');
  if (phones.length) {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        phones.map((device) => ({ to: device.token, title, body, sound: 'default', channelId: 'mensagens', data: { url } })),
      ),
    });
    const result = await response.json().catch(() => ({ data: [] }));
    (result.data ?? []).forEach((ticket: { status?: string; details?: { error?: string } }, index: number) => {
      if (ticket.status === 'ok') sent++;
      if (ticket.details?.error === 'DeviceNotRegistered') expired.push(phones[index].id);
    });
  }

  // Remove aparelhos que não existem mais (app desinstalado, permissão retirada).
  if (expired.length) await admin.from('push_subscriptions').delete().in('id', expired);

  return json({ sent });
});
