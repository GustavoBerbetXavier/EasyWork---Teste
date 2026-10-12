import { Redirect, router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { Sheet } from '@/components/Sheet';
import { AppIcon, PrimaryButton, type IconName } from '@/components/ui';
import { cancelSubscription, createCheckout, listSubscriptions } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { confirmAction, notify } from '@/lib/format';
import { PROVIDER_PLANS, formatPrice, type PlanTone, type ProviderPlanDetails } from '@/lib/plans';
import type { Subscription } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

const TONES: Record<PlanTone, { card: object; bar: string; iconBg: string; iconColor: string; icon: IconName; name: string; tagline: string; bullet: string; text: string; price: string; ctaBg: string; ctaText: string }> = {
  gray: { card: { backgroundColor: C.white, borderColor: C.border }, bar: '#CBD5E1', iconBg: '#F1F5F9', iconColor: '#64748B', icon: 'reorder-three-outline', name: C.navy, tagline: C.muted, bullet: C.muted, text: '#334155', price: C.secondary, ctaBg: '#F1F5F9', ctaText: '#475569' },
  teal: { card: { backgroundColor: '#F4FCFA', borderColor: '#66C8BF' }, bar: C.teal, iconBg: C.tealLight, iconColor: C.teal, icon: 'add', name: C.navy, tagline: C.tealDark, bullet: C.teal, text: '#334155', price: C.tealDark, ctaBg: '#DDF4F0', ctaText: C.tealDark },
  amber: { card: { backgroundColor: '#FFFBF2', borderColor: '#F0D391' }, bar: '#D97706', iconBg: C.amberLight, iconColor: '#D97706', icon: 'star', name: C.navy, tagline: '#B45309', bullet: '#D97706', text: '#334155', price: '#B45309', ctaBg: '#FDF0C9', ctaText: '#92400E' },
  navy: { card: { backgroundColor: '#1E2B4A', borderColor: '#1E2B4A' }, bar: '#5EEAD4', iconBg: '#29416B', iconColor: '#CBD5E1', icon: 'albums-outline', name: C.white, tagline: '#5EEAD4', bullet: '#5EEAD4', text: '#E2E8F0', price: '#CBD5E1', ctaBg: '#29416B', ctaText: C.white },
};

export default function PlanosScreen() {
  const { userId, profile, reloadProfile } = useSignedIn();
  const [selected, setSelected] = useState<ProviderPlanDetails | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(false);
  const isProvider = profile.role === 'profissional';

  const refresh = useCallback(async () => {
    await reloadProfile();
    setSubscriptions(await listSubscriptions(userId).catch(() => []));
  }, [reloadProfile, userId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  // Ao voltar do pagamento no navegador, atualiza o plano.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const pending = subscriptions.find((item) => item.status === 'pending');

  const subscribe = async (plan: Subscription['plan']) => {
    setLoading(true);
    try {
      const url = await createCheckout(plan);
      setSelected(null);
      await WebBrowser.openBrowserAsync(url);
      refresh();
    } catch (err) {
      notify('Pagamento', err instanceof Error ? err.message : 'Não foi possível abrir o pagamento.');
    } finally {
      setLoading(false);
    }
  };

  const cancel = (plan: Subscription['plan'], name: string) => {
    confirmAction('Cancelar assinatura', `Deseja cancelar o ${name}? Os benefícios continuam até o fim do período já pago.`, 'Cancelar plano', async () => {
      try {
        await cancelSubscription(plan);
        setSelected(null);
        await refresh();
        notify('Assinatura cancelada', 'Seu plano foi cancelado.');
      } catch (err) {
        notify('Não foi possível cancelar', err instanceof Error ? err.message : undefined);
      }
    }, true);
  };

  const plan = selected;
  const isCurrent = plan ? profile.plan === plan.id : false;

  // Planos existem só para profissionais (o contratante usa o app de graça).
  if (!isProvider) return <Redirect href="/inicio" />;

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={plans.back} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/inicio'))} accessibilityLabel="Voltar">
        <AppIcon name="arrow-back" color={C.navy} size={22} />
      </TouchableOpacity>

      <View style={plans.hero}>
        <View style={plans.heroCircleA} />
        <View style={plans.heroCircleB} />
        <View style={plans.heroBadge}>
          <View style={plans.heroBadgeRing}>
            <View style={plans.heroCheck}>
              <AppIcon name="checkmark" color={C.navy} size={20} />
            </View>
          </View>
          <Text style={plans.heroPlus}>+</Text>
        </View>
        <View style={plans.heroTag}>
          <View style={styles.heroTagDot} />
          <Text style={styles.heroTagText}>PLANOS PARA PRESTADORES</Text>
        </View>
        <Text style={plans.heroTitle}>Destaque seu trabalho.</Text>
        <Text style={plans.heroSubtitle}>Escolha como divulgar seu perfil e serviços.</Text>
      </View>

      <View style={plans.notice}>
        <AppIcon name="checkmark-circle" color={C.teal} size={22} />
        <View style={{ flex: 1 }}>
          <Text style={plans.noticeTitle}>Mais divulgação não muda sua avaliação.</Text>
          <Text style={plans.noticeText}>Destaques promocionais serão identificados.</Text>
        </View>
      </View>

      {pending ? (
        <TouchableOpacity style={plans.pending} onPress={refresh}>
          <AppIcon name="time-outline" color="#B45309" size={17} />
          <Text style={plans.pendingText}>Pagamento em análise. Toque para atualizar.</Text>
        </TouchableOpacity>
      ) : null}

      {isProvider ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Compare os planos</Text>
            <View style={plans.countPill}><Text style={plans.countText}>{PROVIDER_PLANS.length} OPÇÕES</Text></View>
          </View>
          {PROVIDER_PLANS.map((item) => {
            const tone = TONES[item.tone];
            const current = profile.plan === item.id;
            return (
              <View key={item.id} style={[plans.card, tone.card]}>
                <View style={[plans.bar, { backgroundColor: tone.bar }]} />
                <View style={plans.cardTop}>
                  <View style={[plans.icon, { backgroundColor: tone.iconBg }]}>
                    <AppIcon name={tone.icon} color={tone.iconColor} size={20} />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={plans.nameRow}>
                      <Text style={[plans.name, { color: tone.name }]}>{item.name}</Text>
                      <Text style={[plans.price, { color: tone.price }]}>{formatPrice(item.price, item.pricePrefix)}</Text>
                    </View>
                    <Text style={[plans.tagline, { color: tone.tagline }]}>{item.label.toUpperCase()}</Text>
                  </View>
                </View>
                {current ? (
                  <View style={plans.currentPill}><Text style={plans.currentText}>SEU PLANO ATUAL</Text></View>
                ) : null}
                <Text style={[plans.feature, { color: tone.text, flex: 0 }]}>{item.description}</Text>
                <View style={{ gap: 4 }}>
                  {item.features.map((feature) => (
                    <View key={feature} style={plans.featureRow}>
                      <View style={[plans.bullet, { backgroundColor: tone.bullet }]} />
                      <Text style={[plans.feature, { color: tone.text }]}>{feature}</Text>
                    </View>
                  ))}
                  {item.note ? <Text style={[plans.note, { color: tone.price }]}>{item.note}</Text> : null}
                </View>
                <TouchableOpacity style={[plans.cta, { backgroundColor: tone.ctaBg }]} onPress={() => setSelected(item)}>
                  <Text style={[plans.ctaText, { color: tone.ctaText }]}>{item.cta}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      ) : null}

      <Sheet visible={selected !== null} title={plan ? `Plano ${plan.name}` : ''} onClose={() => setSelected(null)}>
        <Text style={plans.sheetPrice}>{plan ? formatPrice(plan.price, plan.pricePrefix) : ''}</Text>
        {plan ? <Text style={styles.bodyText}>{plan.description}</Text> : null}
        {(plan?.details ?? []).map((feature) => (
          <View key={feature} style={plans.featureRow}>
            <AppIcon name="checkmark-circle" color={C.teal} size={16} />
            <Text style={plans.feature}>{feature}</Text>
          </View>
        ))}
        {plan?.note ? <Text style={styles.bodyText}>{plan.note}</Text> : null}
        {isCurrent ? (
          <>
            <View style={plans.currentPill}><Text style={plans.currentText}>ESTE É O SEU PLANO ATUAL</Text></View>
            <TouchableOpacity style={plans.cancel} onPress={() => plan && cancel(plan.id, `plano ${plan.name}`)}>
              <Text style={plans.cancelText}>Cancelar assinatura</Text>
            </TouchableOpacity>
          </>
        ) : plan && plan.price === null ? (
          <>
            <Text style={styles.bodyText}>O valor deste plano ainda não foi definido. Ele estará disponível em breve.</Text>
            <PrimaryButton label="Em breve" onPress={() => {}} disabled />
          </>
        ) : (
          <PrimaryButton
            label={`Assinar por ${formatPrice(plan?.price ?? null, plan?.pricePrefix)}`}
            onPress={() => plan && subscribe(plan.id)}
            loading={loading}
            tone="teal"
            icon="lock-closed-outline"
          />
        )}
      </Sheet>
    </ScrollView>
  );
}

const plans = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  hero: { backgroundColor: C.navy, borderRadius: 22, padding: 18, paddingRight: 110, overflow: 'hidden', minHeight: 140, justifyContent: 'center' },
  heroCircleA: { position: 'absolute', width: 190, height: 190, borderRadius: 95, right: -60, top: -60, backgroundColor: '#1E2B4A' },
  heroCircleB: { position: 'absolute', width: 120, height: 120, borderRadius: 60, right: -30, bottom: -70, backgroundColor: '#1E2B4A' },
  heroBadge: { position: 'absolute', right: 18, top: 28, alignItems: 'center' },
  heroBadgeRing: { width: 62, height: 62, borderRadius: 31, borderWidth: 1, borderColor: '#35517C', alignItems: 'center', justifyContent: 'center' },
  heroCheck: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#55D2C4', alignItems: 'center', justifyContent: 'center' },
  heroPlus: { color: C.amber, fontSize: 24, fontWeight: '300', marginTop: -6, marginLeft: -40 },
  heroTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E2B4A', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 10 },
  heroTitle: { color: C.white, fontSize: 21, lineHeight: 26, fontWeight: '900', letterSpacing: -0.5 },
  heroSubtitle: { color: '#CBD5E1', fontSize: 11, lineHeight: 16, marginTop: 6 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E8F6F4', borderRadius: 14, padding: 12 },
  noticeTitle: { color: C.tealDark, fontSize: 12, fontWeight: '800' },
  noticeText: { color: C.tealDark, fontSize: 10.5, marginTop: 2 },
  pending: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.amberLight, borderRadius: 12, padding: 11 },
  pendingText: { flex: 1, color: '#92400E', fontSize: 11, fontWeight: '700' },
  countPill: { borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 4 },
  countText: { color: C.secondary, fontSize: 9.5, fontWeight: '800' },
  card: { borderWidth: 1.5, borderRadius: 18, padding: 14, paddingLeft: 16, gap: 10, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderRadius: 2 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  name: { color: C.navy, fontSize: 16, fontWeight: '900' },
  price: { fontSize: 8.5, fontWeight: '800', letterSpacing: 0.3, marginTop: 3 },
  tagline: { fontSize: 9.5, fontWeight: '800', letterSpacing: 0.6 },
  currentPill: { alignSelf: 'flex-start', backgroundColor: C.teal, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  currentText: { color: C.white, fontSize: 8.5, fontWeight: '900', letterSpacing: 0.5 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bullet: { width: 5, height: 5, borderRadius: 3 },
  feature: { flex: 1, color: '#334155', fontSize: 11 },
  note: { fontSize: 10, marginTop: 2 },
  cta: { borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  ctaText: { fontSize: 11, fontWeight: '800' },
  sheetPrice: { color: C.navy, fontSize: 22, fontWeight: '900' },
  cancel: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { color: C.red, fontSize: 13, fontWeight: '800' },
});
