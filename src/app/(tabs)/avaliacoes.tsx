import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { ReviewItem } from '@/components/ReviewItem';
import { AppIcon, EmptyState, ErrorBanner, LoadingView } from '@/components/ui';
import { listReviews } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { formatRating } from '@/lib/format';
import type { Review } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function AvaliacoesScreen() {
  const { userId, profile } = useSignedIn();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setReviews(await listReviews(userId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar as avaliações.');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const counts = [5, 4, 3, 2, 1].map((stars) => ({ stars, total: reviews?.filter((item) => item.rating === stars).length ?? 0 }));
  const max = Math.max(1, ...counts.map((item) => item.total));

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent}>
      <TouchableOpacity style={page.back} onPress={() => (router.canGoBack() ? router.back() : router.navigate('/inicio'))} accessibilityLabel="Voltar">
        <AppIcon name="arrow-back" color={C.navy} size={22} />
      </TouchableOpacity>
      <Text style={styles.eyebrow}>O QUE OS CLIENTES DIZEM</Text>
      <Text style={styles.pageTitle}>Minhas avaliações</Text>
      <View style={page.summary}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Text style={page.average}>{profile.rating_count ? formatRating(profile.rating_avg) : '–'}</Text>
          <View style={{ flexDirection: 'row', gap: 2 }}>
            {[1, 2, 3, 4, 5].map((value) => (
              <AppIcon key={value} name={value <= Math.round(profile.rating_avg) ? 'star' : 'star-outline'} color={C.amber} size={13} />
            ))}
          </View>
          <Text style={styles.ratingCount}>{profile.rating_count} {profile.rating_count === 1 ? 'avaliação' : 'avaliações'}</Text>
        </View>
        <View style={{ flex: 1, gap: 5 }}>
          {counts.map((item) => (
            <View key={item.stars} style={page.barRow}>
              <Text style={page.barLabel}>{item.stars}</Text>
              <View style={page.barTrack}>
                <View style={[page.barFill, { width: `${(item.total / max) * 100}%` }]} />
              </View>
            </View>
          ))}
        </View>
      </View>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {reviews === null && !error ? <View style={{ height: 120 }}><LoadingView /></View> : null}
      {reviews?.length === 0 ? (
        <EmptyState icon="star-outline" text="Você ainda não recebeu avaliações. Elas aparecem aqui quando um cliente avaliar seu serviço." />
      ) : null}
      {reviews?.length ? (
        <View style={page.list}>
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const page = StyleSheet.create({
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16 },
  average: { color: C.navy, fontSize: 34, fontWeight: '900' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 10, color: C.secondary, fontSize: 11, fontWeight: '700' },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#F1F5F9', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.amber },
  list: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 14, paddingBottom: 14 },
});
