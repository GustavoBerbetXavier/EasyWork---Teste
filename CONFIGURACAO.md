# EASY WORK — como ligar o banco de dados e os pagamentos

Sem estas etapas o app roda em **modo demonstração** (dados de exemplo, nada é salvo).

## 1. Banco de dados (Supabase)

1. Crie um projeto grátis em https://supabase.com (região: São Paulo).
2. **SQL Editor > New query**: cole todo o arquivo `supabase/migrations/0001_easywork.sql` e clique em **Run**.
3. **Project Settings > API Keys**: copie a **Project URL** e a chave **publishable** (ou "anon public").
4. Na pasta do projeto, copie `.env.example` para `.env` e cole os dois valores.
   Nunca use a chave `secret`/`service_role` no app.
5. Reinicie o Expo (`npx expo start -c`).

### Recuperação de senha por código
Em **Authentication > Emails > Reset Password**, troque o texto do e-mail para mostrar o código:

```
<h2>Redefinir senha</h2>
<p>Seu código para criar uma nova senha no EASY WORK é:</p>
<h1>{{ .Token }}</h1>
<p>Se você não pediu, ignore este e-mail.</p>
```

Em **Authentication > Sign In / Providers > Email**, decida se o cadastro exige confirmar o e-mail.
O plano grátis do Supabase limita os e-mails por hora; antes de lançar, configure um SMTP próprio.

## 2. Pagamentos (Mercado Pago)

1. Em https://www.mercadopago.com.br/developers > **Suas integrações**, crie uma aplicação e copie o **Access Token**
   (use as credenciais de teste primeiro).
2. Instale e publique as funções (no terminal, na pasta do projeto):

```
npx supabase login
npx supabase link --project-ref SEU-PROJETO
npx supabase secrets set MP_ACCESS_TOKEN=SEU_ACCESS_TOKEN
npx supabase functions deploy mercadopago-checkout
npx supabase functions deploy mercadopago-webhook --no-verify-jwt
```

3. No Mercado Pago, em **Webhooks**, cadastre
   `https://SEU-PROJETO.supabase.co/functions/v1/mercadopago-webhook` com o evento **Planos e assinaturas**,
   copie a assinatura secreta e rode `npx supabase secrets set MP_WEBHOOK_SECRET=...`.

Preços: `src/lib/plans.ts` (app) e `supabase/functions/mercadopago-checkout/index.ts` (servidor). Mantenha os dois iguais.

## 3. Gerar o APK

```
npx eas-cli@latest build -p android --profile preview
```
