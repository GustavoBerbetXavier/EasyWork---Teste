import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

import { NotificationsButton } from '@/components/NotificationsButton';
import { AppIcon, Brand, DotPill, type IconName } from '@/components/ui';
import { getProviderStats } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { formatRating, notify } from '@/lib/format';
import { PLAN_LIMITS, planName } from '@/lib/plans';
import type { ProviderStats } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export function ProviderDashboard() {
  const { userId, profile, isDemo, saveProfile } = useSignedIn();
  const [stats, setStats] = useState<ProviderStats | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<'is_active' | 'available' | null>(null);

  useFocusEffect(
    useCallback(() => {
      getProviderStats(userId).then(setStats).catch(() => setStats(null));
    }, [userId]),
  );

  const toggle = async (field: 'is_active' | 'available', value: boolean) => {
    setSaving(field);
    try {
      await saveProfile({ [field]: value });
    } catch (err) {
      notify('Não foi possível salvar', err instanceof Error ? err.message : undefined);
    } finally {
      setSaving(null);
    }
  };

  const firstName = profile.full_name.split(' ')[0] || 'profissional';
  // Visualizações e contatos fazem parte dos planos Premium e Empresarial.
  const statsUnlocked = isDemo || PLAN_LIMITS[profile.plan].stats;
  const items: { value: string; label: string; icon: IconName; background: string; color: string; locked?: boolean }[] = [
    { value: statsUnlocked ? String(stats?.views ?? 0) : '–', label: 'Visualizações', icon: 'stats-chart-outline', background: C.tealLight, color: C.teal, locked: !statsUnlocked },
    { value: statsUnlocked ? String(stats?.contacts ?? 0) : '–', label: 'Contatos', icon: 'chatbox-outline', background: C.amberLight, color: '#D97706', locked: !statsUnlocked },
    { value: stats && stats.rating_count > 0 ? formatRating(stats.rating_avg) : '–', label: 'Nota média', icon: 'star', background: C.amberLight, color: C.amber },
    { value: String(stats?.rating_count ?? 0), label: 'Avaliações', icon: 'reader-outline', background: '#EEF2FF', color: '#4F46E5' },
  ];

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <Brand />
        <NotificationsButton />
      </View>
      <View style={{ gap: 6 }}>
        <DotPill label={isDemo ? 'DEMONSTRAÇÃO DO PRESTADOR' : 'ÁREA DO PRESTADOR'} />
        <Text style={dash.hello}>Olá, {firstName}!</Text>
        <Text style={dash.subtitle}>Acompanhe seu perfil e seus resultados.</Text>
      </View>

      <View style={dash.statusCard}>
        <TouchableOpacity style={dash.statusRow} onPress={() => setExpanded((value) => !value)} accessibilityRole="button" accessibilityState={{ expanded }}>
          <View style={dash.statusIcon}>
            <AppIcon name="home-outline" color={C.teal} size={22} />
            <View style={[dash.statusDot, { backgroundColor: profile.is_active ? '#22C55E' : C.muted }]} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={dash.statusTitle}>{profile.is_active ? 'Seu perfil está ativo' : 'Seu perfil está pausado'}</Text>
            <Text style={dash.statusText}>{profile.is_active ? 'Visível para clientes da sua região' : 'Clientes não encontram você nas buscas'}</Text>
          </View>
          <AppIcon name={expanded ? 'chevron-up' : 'chevron-down'} color={C.secondary} size={18} />
        </TouchableOpacity>
        {expanded ? (
          <View style={dash.toggles}>
            <View style={dash.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={dash.toggleTitle}>Perfil visível nas buscas</Text>
                <Text style={dash.statusText}>Desligue para pausar seu perfil.</Text>
              </View>
              <Switch
                value={profile.is_active}
                disabled={saving !== null}
                onValueChange={(value) => toggle('is_active', value)}
                trackColor={{ true: C.teal, false: C.border }}
                thumbColor={C.white}
              />
            </View>
            <View style={dash.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={dash.toggleTitle}>Disponível para orçamento</Text>
                <Text style={dash.statusText}>Mostra o selo verde no seu perfil.</Text>
              </View>
              <Switch
                value={profile.available}
                disabled={saving !== null}
                onValueChange={(value) => toggle('available', value)}
                trackColor={{ true: C.teal, false: C.border }}
                thumbColor={C.white}
              />
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Desempenho</Text>
        <Text style={styles.resultLabel}>ÚLTIMOS 30 DIAS</Text>
      </View>
      <View style={dash.grid}>
        {items.map((item) => (
          <TouchableOpacity key={item.label} style={dash.statCard} disabled={!item.locked} onPress={() => router.push('/planos')}>
            <View style={[dash.statIcon, { backgroundColor: item.background }]}>
              <AppIcon name={item.icon} color={item.color} size={20} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={dash.statValue}>{item.value}</Text>
              <Text style={dash.statLabel}>{item.label}</Text>
              {item.locked ? <Text style={dash.statLock}>No plano Premium</Text> : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Acesso rápido</Text>
      <View style={{ gap: 10 }}>
        {[
          { label: 'Editar meu perfil', icon: 'create-outline' as IconName, background: C.tealLight, color: C.teal, onPress: () => router.navigate({ pathname: '/perfil', params: { editar: String(Date.now()) } }) },
          { label: 'Meus serviços e fotos', icon: 'albums-outline' as IconName, background: C.amberLight, color: '#D97706', onPress: () => router.navigate('/servicos') },
          { label: 'Ver minhas avaliações', icon: 'reader-outline' as IconName, background: '#EEF2FF', color: '#4F46E5', onPress: () => router.push('/avaliacoes') },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={dash.quickRow} onPress={item.onPress}>
            <View style={[dash.quickIcon, { backgroundColor: item.background }]}>
              <AppIcon name={item.icon} color={item.color} size={18} />
            </View>
            <Text style={dash.quickLabel}>{item.label}</Text>
            <AppIcon name="chevron-forward" color={C.muted} size={18} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={dash.planCard} onPress={() => router.push('/planos')} accessibilityRole="button">
        <View style={dash.planIcon}>
          <AppIcon name="star" color={C.amber} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dash.planEyebrow}>SEU PLANO</Text>
          <Text style={dash.planName}>{planName(profile.plan)}</Text>
        </View>
        <Text style={dash.planLink}>{profile.plan === 'gratuito' ? 'Conhecer planos' : 'Gerenciar plano'}</Text>
        <AppIcon name="chevron-forward" color="#99F6E4" size={17} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const dash = StyleSheet.create({
  hello: { fontSize: 24, lineHeight: 30, color: C.navy, fontWeight: '900', letterSpacing: -0.6, marginTop: 4 },
  subtitle: { color: C.secondary, fontSize: 12, lineHeight: 18 },
  statusCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center' },
  statusDot: { position: 'absolute', top: -2, right: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: C.white },
  statusTitle: { color: C.navy, fontSize: 13, fontWeight: '800' },
  statusText: { color: C.secondary, fontSize: 11, lineHeight: 15 },
  toggles: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border, gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleTitle: { color: C.navy, fontSize: 12, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: -6 },
  statCard: { width: '48%', flexGrow: 1, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 13, minHeight: 74 },
  statIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: C.navy, fontSize: 19, fontWeight: '900' },
  statLabel: { color: C.secondary, fontSize: 11, marginTop: 2 },
  statLock: { color: C.tealDark, fontSize: 9, fontWeight: '800', marginTop: 3 },
  quickRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 11 },
  quickIcon: { width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { flex: 1, color: C.navy, fontSize: 13, fontWeight: '800' },
  planCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.navy, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 13 },
  planIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  planEyebrow: { color: '#99F6E4', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  planName: { color: C.white, fontSize: 14, fontWeight: '900', marginTop: 2 },
  planLink: { color: '#5EEAD4', fontSize: 11, fontWeight: '800' },
});
