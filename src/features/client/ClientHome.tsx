import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CategoriesSheet } from '@/components/CategoriesSheet';
import { CityPicker } from '@/components/CityPicker';
import { NotificationsButton } from '@/components/NotificationsButton';
import { ProviderCard } from '@/components/ProviderCard';
import { AppIcon, Brand, EmptyState, ErrorBanner, LoadingView, SectionHeader } from '@/components/ui';
import { searchProviders } from '@/lib/api';
import { CATEGORIES } from '@/lib/categories';
import { useSignedIn } from '@/lib/auth';
import { notify } from '@/lib/format';
import type { Profile } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';


export function ClientHome() {
  const { profile, saveProfile } = useSignedIn();
  const [search, setSearch] = useState('');
  const [cityPicker, setCityPicker] = useState(false);
  const [allCategories, setAllCategories] = useState(false);
  const [providers, setProviders] = useState<Profile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const city = profile.city;

  const load = useCallback(async () => {
    try {
      setError(null);
      const list = await searchProviders({ city });
      setProviders(list.slice(0, 3));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os profissionais.');
    }
  }, [city]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const goSearch = (params: { q?: string; categoria?: string } = {}) =>
    router.navigate({ pathname: '/servicos', params: { q: '', categoria: '', ...params, t: String(Date.now()) } });

  const changeCity = async (value: string) => {
    setCityPicker(false);
    try {
      await saveProfile({ city: value });
    } catch (err) {
      notify('Não foi possível salvar', err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <View style={styles.homeHeader}>
        <Brand />
        <NotificationsButton />
      </View>
      <TouchableOpacity style={styles.locationBlock} onPress={() => setCityPicker(true)} accessibilityLabel="Trocar localização">
        <Text style={styles.eyebrow}>SUA LOCALIZAÇÃO</Text>
        <View style={styles.locationLine}>
          <AppIcon name="location-outline" color={C.teal} size={15} />
          <Text style={styles.locationValue}>{city || 'Escolha sua cidade'}</Text>
          <AppIcon name="chevron-down" color={C.secondary} size={15} />
        </View>
      </TouchableOpacity>
      <View style={styles.heroBanner}>
        <View style={styles.heroGlow} />
        <View style={home.heroGlowSmall} />
        <View style={styles.heroTag}>
          <View style={styles.heroTagDot} />
          <Text style={styles.heroTagText}>SERVIÇOS PERTO DE VOCÊ</Text>
        </View>
        <Text style={styles.heroTitle}>Encontre quem resolve.</Text>
        <Text style={styles.heroSubtitle}>PROFISSIONAIS LOCAIS, COM CONFIANÇA.</Text>
      </View>
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" color={C.secondary} size={22} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="O que você precisa?"
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          returnKeyType="search"
          onSubmitEditing={() => goSearch({ q: search.trim() })}
        />
      </View>
      <SectionHeader title="Categorias" action="Ver todas" onPress={() => setAllCategories(true)} />
      <View style={styles.categoryGrid}>
        {CATEGORIES.slice(0, 4).map((category) => (
          <TouchableOpacity key={category.name} style={home.categoryCard} onPress={() => goSearch({ categoria: category.name })} accessibilityLabel={category.name}>
            <View style={[home.categoryIcon, { backgroundColor: category.background }]}>
              <AppIcon name={category.icon} size={21} color={category.color} />
            </View>
            <Text style={styles.categoryLabel}>{category.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <SectionHeader title="Bem avaliados" action="Ver todos" onPress={() => goSearch()} />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {providers === null && !error ? <View style={{ height: 120 }}><LoadingView /></View> : null}
      {providers?.map((provider) => (
        <ProviderCard key={provider.id} provider={provider} onPress={() => router.push(`/profissional/${provider.id}`)} />
      ))}
      {providers && providers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          text={`Ainda não há profissionais cadastrados em ${city || 'sua cidade'}.`}
          action="Buscar em todas as cidades"
          onAction={() => goSearch({ q: '' })}
        />
      ) : null}
      <View style={styles.footerHint}>
        <AppIcon name="shield-checkmark-outline" size={16} color={C.teal} />
        <Text style={styles.footerHintText}>Apoie profissionais da sua região com a EASY WORK.</Text>
      </View>
      <CategoriesSheet
        visible={allCategories}
        onClose={() => setAllCategories(false)}
        onSelect={(name) => {
          setAllCategories(false);
          goSearch({ categoria: name });
        }}
      />
      <CityPicker visible={cityPicker} current={city} onClose={() => setCityPicker(false)} onSelect={changeCity} />
    </ScrollView>
  );
}

const home = StyleSheet.create({
  heroGlowSmall: { position: 'absolute', width: 110, height: 110, borderRadius: 55, right: 30, bottom: -60, backgroundColor: '#1E293B', opacity: 0.9 },
  categoryCard: { flex: 1, alignItems: 'center', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  categoryIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
