import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatRating } from '@/lib/format';
import { planBadge } from '@/lib/plans';
import type { Profile } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { AppIcon, Avatar } from './ui';

/** Card de profissional "Bem avaliados" (layout Interface do contratante). */
export function ProviderCard({ provider, onPress }: { provider: Profile; onPress: () => void }) {
  const badge = planBadge(provider.plan);
  return (
    <TouchableOpacity style={card.container} onPress={onPress} accessibilityRole="button" accessibilityLabel={provider.full_name}>
      <Avatar name={provider.full_name} uri={provider.avatar_url} size={64} shape="rounded" placeholder="person" />
      <View style={card.body}>
        {badge ? (
          <View style={[card.chip, { backgroundColor: C.amberLight }]}><Text style={[card.chipText, { color: '#92400E' }]}>{badge}</Text></View>
        ) : null}
        <Text style={styles.professionalName} numberOfLines={1}>{provider.full_name}</Text>
        <Text style={styles.professionalSpecialty} numberOfLines={1}>
          {[provider.specialty, provider.area].filter(Boolean).join(' · ') || provider.city}
        </Text>
        <View style={styles.ratingRow}>
          <AppIcon name="star" color={C.amber} size={13} />
          {provider.rating_count > 0 ? (
            <>
              <Text style={styles.ratingScore}>{formatRating(provider.rating_avg)}</Text>
              <Text style={styles.ratingCount}>({provider.rating_count} {provider.rating_count === 1 ? 'avaliação' : 'avaliações'})</Text>
            </>
          ) : (
            <Text style={styles.ratingCount}>Novo na EASY WORK</Text>
          )}
        </View>
        {provider.available ? (
          <View style={styles.availablePill}>
            <View style={styles.greenDot} />
            <Text style={styles.availableText}>Disponível para orçamento</Text>
          </View>
        ) : null}
      </View>
      <View style={card.pin}>
        <AppIcon name="location-outline" color="#64748B" size={15} />
      </View>
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, borderRadius: 16, padding: 13 },
  body: { flex: 1, gap: 3 },
  chip: { alignSelf: 'flex-start', backgroundColor: '#F1F5F9', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 3 },
  chipText: { color: '#475569', fontSize: 8, fontWeight: '800', letterSpacing: 0.4 },
  pin: { width: 26, height: 26, borderRadius: 13, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
});
