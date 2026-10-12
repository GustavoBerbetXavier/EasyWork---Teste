// Recebe os avisos do Mercado Pago e atualiza a assinatura (e o plano do perfil, via trigger no banco).
// Configure em Mercado Pago > Suas integrações > Webhooks:
//   URL: https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook   Evento: "Planos e assinaturas"
// Segredos: MP_ACCESS_TOKEN e MP_WEBHOOK_SECRET (a "assinatura secreta" mostrada na tela de webhooks).
// Publique com: npx supabase functions deploy mercadopago-webhook --no-verify-jwt
import { createClient } from 'npm:@supabase/supabase-js@2';

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

const STATUS: Record<string, string> = { authorized: 'authorized', paused: 'paused', cancelled: 'cancelled', pending: 'pending' };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const dataId = url.searchParams.get('data.id') ?? body?.data?.id;
  const type = url.searchParams.get('type') ?? body?.type;
  if (!dataId || (type && !String(type).includes('preapproval'))) return new Response('ignored');

  // Confere a assinatura do aviso (x-signature) para garantir que veio do Mercado Pago.
  const secret = Deno.env.get('MP_WEBHOOK_SECRET');
  if (secret) {
    const parts = Object.fromEntries((req.headers.get('x-signature') ?? '').split(',').map((part) => part.trim().split('=')));
    const manifest = `id:${String(dataId).toLowerCase()};request-id:${req.headers.get('x-request-id') ?? ''};ts:${parts.ts};`;
    if (!parts.v1 || (await hmac(secret, manifest)) !== parts.v1) return new Response('invalid signature', { status: 401 });
  }

  const token = Deno.env.get('MP_ACCESS_TOKEN')!;
  const response = await fetch(`https://api.mercadopago.com/preapproval/${dataId}`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) return new Response('not found', { status: 404 });
  const preapproval = await response.json();
  const status = STATUS[preapproval.status] ?? 'pending';
  const [userId, plan] = String(preapproval.external_reference ?? '').split(':');
  if (!userId || !plan) return new Response('no reference');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: existing } = await admin.from('subscriptions').select('id').eq('external_id', preapproval.id).maybeSingle();
  const row = { user_id: userId, plan, status, external_id: preapproval.id, current_period_end: preapproval.next_payment_date ?? null };
  if (existing) await admin.from('subscriptions').update(row).eq('id', existing.id);
  else await admin.from('subscriptions').insert(row);

  // Ao trocar de plano, cancela o plano anterior do profissional no Mercado Pago.
  if (status === 'authorized' && plan !== 'contratante_mensal') {
    const { data: others } = await admin
      .from('subscriptions')
      .select('id, external_id')
      .eq('user_id', userId)
      .neq('plan', 'contratante_mensal')
      .neq('external_id', preapproval.id)
      .eq('status', 'authorized');
    for (const other of others ?? []) {
      await fetch(`https://api.mercadopago.com/preapproval/${other.external_id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      await admin.from('subscriptions').update({ status: 'cancelled' }).eq('id', other.id);
    }
  }
  return new Response('ok');
});
