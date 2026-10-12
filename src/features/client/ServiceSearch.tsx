import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { AppIcon, Avatar, EmptyState, ErrorBanner, LoadingView } from '@/components/ui';
import { searchProviders } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { CATEGORY_NAMES } from '@/lib/categories';
import { formatRating } from '@/lib/format';
import { planBadge } from '@/lib/plans';
import type { Profile } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

const FILTERS = ['Todos', ...CATEGORY_NAMES];

export function ServiceSearch() {
  const params = useLocalSearchParams<{ q?: string; categoria?: string; t?: string }>();
  const { profile, isDemo } = useSignedIn();
  const [query, setQuery] = useState(params.q ?? '');
  const [category, setCategory] = useState(params.categoria ?? '');
  const [allCities, setAllCities] = useState(isDemo);
  const [results, setResults] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Parâmetros vindos da tela Início (busca ou categoria). Cada navegação traz um `t` novo.
  const [lastToken, setLastToken] = useState(params.t);
  if (params.t !== lastToken) {
    setLastToken(params.t);
    setQuery(params.q ?? '');
    setCategory(params.categoria ?? '');
  }

  useEffect(() => {
    let active = true;
    const timer = setTimeout(async () => {
      try {
        setError(null);
        const list = await searchProviders({ q: query, category, city: allCities ? '' : profile.city });
        if (active) setResults(list);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Não foi possível buscar agora.');
      }
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query, category, allCities, profile.city, reloadKey]);

  const label = isDemo ? (results?.length === 1 ? 'resultado demonstrativo' : 'resultados demonstrativos') : results?.length === 1 ? 'resultado' : 'resultados';

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
      <Text style={styles.eyebrow}>DESCUBRA SERVIÇOS</Text>
      <Text style={styles.pageTitle}>Encontre profissionais</Text>
      <Text style={styles.pageSubtitle}>Busque por serviço, categoria ou região.</Text>
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" color={C.muted} size={20} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Ex.: encanador, computador..."
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {query ? (
          <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Limpar busca">
            <AppIcon name="close-circle" color={C.muted} size={18} />
          </TouchableOpacity>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -18 }} contentContainerStyle={[styles.filterChips, { flexWrap: 'nowrap', paddingHorizontal: 18 }]}>
        {/* A categoria escolhida aparece logo depois de "Todos", sempre visível. */}
        {(category ? ['Todos', category, ...FILTERS.filter((item) => item !== 'Todos' && item !== category)] : FILTERS).map((filter) => {
          const active = filter === 'Todos' ? !category : category === filter;
          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setCategory(filter === 'Todos' ? '' : filter)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{filter}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {!isDemo ? (
        <TouchableOpacity style={styles.locationLine} onPress={() => setAllCities((value) => !value)}>
          <AppIcon name={allCities ? 'globe-outline' : 'location-outline'} color={C.teal} size={14} />
          <Text style={styles.serviceArea}>{allCities ? 'Todas as cidades' : profile.city || 'Sua cidade'}</Text>
          <Text style={styles.actionText}>{allCities ? 'Só minha cidade' : 'Ver todas as cidades'}</Text>
        </TouchableOpacity>
      ) : null}
      {error ? <ErrorBanner message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
      {results === null && !error ? <View style={{ height: 160 }}><LoadingView /></View> : null}
      {results ? <Text style={styles.resultLabel}>{results.length} {label.toUpperCase()}</Text> : null}
      {results?.map((provider) => (
        <TouchableOpacity key={provider.id} onPress={() => router.push(`/profissional/${provider.id}`)} style={styles.serviceCard}>
          <Avatar name={provider.full_name} uri={provider.avatar_url} size={50} />
          <View style={styles.serviceCardInfo}>
            <View style={styles.rowWrap}>
              <Text style={styles.professionalName}>{provider.full_name}</Text>
              {isDemo ? (
                <View style={styles.miniDemoTag}><Text style={styles.miniDemoTagText}>DEMO</Text></View>
              ) : planBadge(provider.plan) ? (
                <View style={styles.miniDemoTag}><Text style={styles.miniDemoTagText}>{planBadge(provider.plan)}</Text></View>
              ) : null}
            </View>
            <Text style={styles.professionalSpecialty}>{provider.specialty || provider.category}</Text>
            <Text style={styles.serviceArea}>
              <AppIcon name="location-outline" size={13} color={C.secondary} /> {[provider.area, provider.city].filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.ratingRow}>
              <AppIcon name="star" color={C.amber} size={13} />
              {provider.rating_count > 0 ? (
                <>
                  <Text style={styles.ratingScore}>{formatRating(provider.rating_avg)}</Text>
                  <Text style={styles.ratingCount}>{provider.rating_count} {provider.rating_count === 1 ? 'avaliação' : 'avaliações'}</Text>
                </>
              ) : (
                <Text style={styles.ratingCount}>Sem avaliações ainda</Text>
              )}
            </View>
          </View>
          <AppIcon name="chevron-forward" size={18} color={C.muted} />
        </TouchableOpacity>
      ))}
      {results && results.length === 0 ? (
        <EmptyState
          icon="search-outline"
          text={allCities ? 'Não encontramos serviços com esse termo.' : `Não encontramos profissionais em ${profile.city || 'sua cidade'} com esse filtro.`}
          action={allCities ? 'Limpar filtros' : 'Buscar em todas as cidades'}
          onAction={() => {
            if (allCities) {
              setQuery('');
              setCategory('');
            } else {
              setAllCities(true);
            }
          }}
        />
      ) : null}
      {isDemo ? (
        <View style={styles.demoInfoWide}>
          <AppIcon name="information-circle-outline" color={C.tealDark} size={17} />
          <Text style={styles.demoNoticeText}>Os profissionais e as avaliações desta tela são fictícios e servem apenas para visualizar a interface.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
