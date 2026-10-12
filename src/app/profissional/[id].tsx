import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EducationList, ExperienceList, ProfileCard, ProfileCover, ProjectList, SkillChips } from '@/components/profile';
import { ReviewItem } from '@/components/ReviewItem';
import { ReviewSheet } from '@/components/ReviewSheet';
import { AppIcon, ErrorBanner, LoadingView } from '@/components/ui';
import { getProvider, listPortfolio, listReviews, recordProfileView, startConversation } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { formatRating, notify } from '@/lib/format';
import { useInbox } from '@/lib/inbox';
import { planBadge } from '@/lib/plans';
import type { PortfolioPhoto, Profile, Review, Service } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export default function ProviderProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { userId, profile: me } = useSignedIn();
  const { refresh: refreshInbox } = useInbox();
  const [provider, setProvider] = useState<Profile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [contacting, setContacting] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const isClient = me.role === 'contratante';

  const fetchAll = useCallback(() => Promise.all([getProvider(id), listPortfolio(id), listReviews(id)]), [id]);

  const apply = useCallback(([data, gallery, list]: Awaited<ReturnType<typeof fetchAll>>) => {
    setError(null);
    setProvider(data.profile);
    setServices(data.services);
    setPhotos(gallery);
    setReviews(list);
  }, []);

  const showError = (err: unknown) => setError(err instanceof Error ? err.message : 'Não foi possível abrir este perfil.');

  const load = () => {
    fetchAll().then(apply).catch(showError);
  };

  useEffect(() => {
    let active = true;
    fetchAll()
      .then((result) => active && apply(result))
      .catch((err) => active && showError(err));
    recordProfileView(id, userId).catch(() => {});
    return () => {
      active = false;
    };
  }, [fetchAll, apply, id, userId]);

  const contact = async (service?: Service) => {
    if (!provider) return;
    if (!isClient) {
      notify('Somente contratantes', 'Entre com uma conta de contratante para conversar com profissionais.');
      return;
    }
    setContacting(true);
    try {
      const subject = service ? `${service.title} · Orçamento` : provider.specialty ? `${provider.specialty} · Orçamento` : 'Orçamento';
      const conversationId = await startConversation(userId, provider.id, subject);
      refreshInbox();
      router.push(`/chat/${conversationId}`);
    } catch (err) {
      notify('Não foi possível iniciar a conversa', err instanceof Error ? err.message : undefined);
    } finally {
      setContacting(false);
    }
  };

  return (
    <SafeAreaView style={styles.appShell} edges={['top', 'bottom']}>
      <View style={page.header}>
        <TouchableOpacity style={page.back} onPress={() => (router.canGoBack() ? router.back() : router.replace('/inicio'))} accessibilityLabel="Voltar">
          <AppIcon name="arrow-back" color={C.navy} size={22} />
        </TouchableOpacity>
        <Text style={page.headerTitle}>Perfil do profissional</Text>
      </View>
      {error ? <View style={{ padding: 16 }}><ErrorBanner message={error} onRetry={load} /></View> : null}
      {!provider && !error ? <LoadingView /> : null}
      {provider ? (
        <ScrollView contentContainerStyle={styles.profilePage} showsVerticalScrollIndicator={false}>
          <ProfileCover profile={provider} badge={planBadge(provider.plan)} />
          <View style={styles.profileActionRow}>
            <TouchableOpacity style={[styles.profileSaveButton, contacting && { opacity: 0.7 }]} onPress={() => contact()} disabled={contacting}>
              <AppIcon name="chatbubble-ellipses-outline" color={C.white} size={16} />
              <Text style={styles.profileSaveText}>{contacting ? 'Abrindo...' : 'Enviar mensagem'}</Text>
            </TouchableOpacity>
            {isClient ? (
              <TouchableOpacity style={styles.profileOutlineButton} onPress={() => setReviewOpen(true)}>
                <AppIcon name="star-outline" color="#334155" size={15} />
                <Text style={styles.profileOutlineText}>Avaliar</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <ProfileCard>
            <View style={page.summaryRow}>
              <View style={page.ratingBox}>
                <AppIcon name="star" color={C.amber} size={18} />
                <Text style={page.ratingValue}>{provider.rating_count ? formatRating(provider.rating_avg) : '–'}</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={styles.professionalName}>{provider.specialty || 'Profissional'}</Text>
                <Text style={styles.professionalSpecialty}>
                  {provider.rating_count} {provider.rating_count === 1 ? 'avaliação' : 'avaliações'} · {[provider.area, provider.city].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
            {provider.available ? (
              <View style={styles.availablePill}>
                <View style={styles.greenDot} />
                <Text style={styles.availableText}>Disponível para orçamento</Text>
              </View>
            ) : (
              <Text style={styles.bodyText}>No momento sem agenda para novos orçamentos.</Text>
            )}
          </ProfileCard>

          <ProfileCard title="Serviços">
            {services.length === 0 ? <Text style={styles.bodyText}>Este profissional ainda não cadastrou serviços.</Text> : null}
            {services.map((service) => (
              <View key={service.id} style={page.service}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.timelineRole}>{service.title}</Text>
                  <Text style={styles.professionalSpecialty}>{[service.category, service.subcategory].filter(Boolean).join(' · ')}</Text>
                  {service.description ? <Text style={styles.bodyText}>{service.description}</Text> : null}
                  <Text style={page.price}>Valor: {service.price_label}</Text>
                </View>
                {isClient ? (
                  <TouchableOpacity style={page.ask} onPress={() => contact(service)}>
                    <Text style={page.askText}>Pedir orçamento</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
          </ProfileCard>

          {photos.length ? (
            <ProfileCard title="Fotos de trabalhos">
              <View style={page.gallery}>
                {photos.map((photo) => (
                  <Image key={photo.id} source={{ uri: photo.url }} style={page.photo} />
                ))}
              </View>
            </ProfileCard>
          ) : null}

          {provider.bio ? (
            <ProfileCard title="Biografia">
              <Text style={styles.bodyText}>{provider.bio}</Text>
            </ProfileCard>
          ) : null}
          {provider.skills.length ? <ProfileCard title="Habilidades"><SkillChips skills={provider.skills} /></ProfileCard> : null}
          {provider.experiences.length ? <ProfileCard title="Experiência profissional"><ExperienceList items={provider.experiences} /></ProfileCard> : null}
          {provider.education.length ? <ProfileCard title="Formação"><EducationList items={provider.education} /></ProfileCard> : null}
          {provider.projects.length ? <ProfileCard title="Projetos"><ProjectList items={provider.projects} /></ProfileCard> : null}
          {provider.objective ? <ProfileCard title="Objetivo profissional"><Text style={styles.bodyText}>{provider.objective}</Text></ProfileCard> : null}

          <ProfileCard title="Avaliações">
            {reviews.length === 0 ? <Text style={styles.bodyText}>Ainda não há avaliações. Seja o primeiro a avaliar!</Text> : null}
            {reviews.map((review) => (
              <ReviewItem key={review.id} review={review} />
            ))}
          </ProfileCard>
        </ScrollView>
      ) : null}
      {provider ? (
        <ReviewSheet
          visible={reviewOpen}
          providerId={provider.id}
          providerName={provider.full_name}
          clientId={userId}
          onClose={() => setReviewOpen(false)}
          onSaved={load}
        />
      ) : null}
    </SafeAreaView>
  );
}

const page = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 15, paddingVertical: 8 },
  back: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, borderColor: C.border, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: C.navy, fontSize: 15, fontWeight: '800' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingBox: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: C.amberLight, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8 },
  ratingValue: { color: C.navy, fontSize: 16, fontWeight: '900' },
  service: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  price: { color: C.muted, fontSize: 10, marginTop: 2 },
  ask: { backgroundColor: C.tealLight, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  askText: { color: C.tealDark, fontSize: 10, fontWeight: '800' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  photo: { width: '31.8%', aspectRatio: 1, borderRadius: 10, backgroundColor: C.border },
});
