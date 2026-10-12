import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { NotificationsButton } from '@/components/NotificationsButton';
import { ServiceForm } from '@/components/ServiceForm';
import { AppIcon, Brand, DotPill, EmptyState, ErrorBanner, type IconName } from '@/components/ui';
import { addPortfolioPhoto, deletePortfolioPhoto, listMyServices, listPortfolio } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { confirmAction, notify } from '@/lib/format';
import { pickImage } from '@/lib/images';
import { PLAN_LIMITS, planName } from '@/lib/plans';
import type { PortfolioPhoto, Service } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

const SERVICE_ICONS: { icon: IconName; background: string; color: string }[] = [
  { icon: 'water-outline', background: C.tealLight, color: C.teal },
  { icon: 'call-outline', background: C.blueLight, color: '#475569' },
  { icon: 'albums-outline', background: C.amberLight, color: '#D97706' },
];

export function MyServices() {
  const { userId, profile, isDemo } = useSignedIn();
  const [services, setServices] = useState<Service[] | null>(null);
  const [photos, setPhotos] = useState<PortfolioPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Service | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const limits = isDemo ? PLAN_LIMITS.plus : PLAN_LIMITS[profile.plan];
  const portfolioAllowed = limits.photos > 0;

  const load = useCallback(async () => {
    try {
      setError(null);
      const [list, gallery] = await Promise.all([listMyServices(userId), listPortfolio(userId)]);
      setServices(list);
      setPhotos(gallery);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar seus serviços.');
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const openForm = (service: Service | null) => {
    if (!service && services && services.length >= limits.services) {
      confirmAction(
        'Limite de serviços',
        `O ${planName(profile.plan)} permite até ${limits.services} ${limits.services === 1 ? 'serviço' : 'serviços'}. Conheça os planos para cadastrar mais.`,
        'Ver planos',
        () => router.push('/planos'),
      );
      return;
    }
    setEditing(service);
    setFormOpen(true);
  };

  const addPhoto = async () => {
    if (!portfolioAllowed) {
      router.push('/planos');
      return;
    }
    if (photos.length >= limits.photos) {
      confirmAction('Limite de fotos', `Seu plano permite até ${limits.photos} fotos. Remova uma foto ou conheça os planos.`, 'Ver planos', () => router.push('/planos'));
      return;
    }
    const image = await pickImage();
    if (!image) return;
    setUploading(true);
    try {
      const photo = await addPortfolioPhoto(userId, image.uri, image.mimeType);
      setPhotos((current) => [photo, ...current]);
    } catch (err) {
      notify('Não foi possível enviar a foto', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photo: PortfolioPhoto) => {
    confirmAction('Remover foto', 'Deseja remover esta foto do seu portfólio?', 'Remover', async () => {
      try {
        await deletePortfolioPhoto(photo.id);
        setPhotos((current) => current.filter((item) => item.id !== photo.id));
      } catch (err) {
        notify('Não foi possível remover', err instanceof Error ? err.message : undefined);
      }
    }, true);
  };

  const published = services?.filter((item) => item.active).length ?? 0;

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
      <View style={styles.homeHeader}>
        <Brand />
        <NotificationsButton />
      </View>
      <View style={{ gap: 6 }}>
        <DotPill label={isDemo ? 'ÁREA DO PROFISSIONAL · DEMO' : 'ÁREA DO PROFISSIONAL'} />
        <Text style={mine.title}>Meus serviços</Text>
        <Text style={mine.subtitle}>Organize o que você oferece aos clientes.</Text>
      </View>

      <View style={mine.summary}>
        <View style={mine.summaryIcon}>
          <AppIcon name="reorder-three-outline" color="#99F6E4" size={22} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={mine.summaryEyebrow}>SERVIÇOS NO PERFIL</Text>
          <Text style={mine.summaryValue}>{published} {published === 1 ? 'publicado' : 'publicados'}</Text>
          <Text style={mine.summaryLimit}>{services?.length ?? 0} de {limits.services} no seu plano</Text>
        </View>
        <View style={mine.statusPill}>
          <View style={[mine.statusDot, { backgroundColor: profile.is_active ? '#5EEAD4' : C.muted }]} />
          <Text style={mine.statusText}>{profile.is_active ? 'ATIVO' : 'PAUSADO'}</Text>
        </View>
      </View>

      <TouchableOpacity style={mine.addButton} onPress={() => openForm(null)} accessibilityRole="button">
        <AppIcon name="add-circle-outline" color={C.white} size={24} />
        <Text style={mine.addText}>Adicionar serviço</Text>
        <AppIcon name="chevron-forward" color={C.white} size={20} />
      </TouchableOpacity>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Serviços cadastrados</Text>
        {isDemo ? <Text style={styles.resultLabel}>EXEMPLOS</Text> : null}
      </View>
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {services === null && !error ? <ActivityIndicator color={C.teal} /> : null}
      {services?.length === 0 ? (
        <EmptyState icon="briefcase-outline" text="Você ainda não cadastrou serviços. Adicione o primeiro para aparecer melhor nas buscas." action="Adicionar serviço" onAction={() => openForm(null)} />
      ) : null}
      {services?.map((service, index) => {
        const look = SERVICE_ICONS[index % SERVICE_ICONS.length];
        return (
          <View key={service.id} style={mine.serviceCard}>
            <View style={mine.serviceTop}>
              <View style={[mine.serviceIcon, { backgroundColor: look.background }]}>
                <AppIcon name={look.icon} color={look.color} size={24} />
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={mine.serviceTitle}>{service.title}</Text>
                <Text style={styles.professionalSpecialty}>{[service.category, service.subcategory].filter(Boolean).join(' · ')}</Text>
              </View>
              <View style={[mine.activePill, !service.active && { backgroundColor: '#F1F5F9' }]}>
                <View style={[mine.statusDot, { backgroundColor: service.active ? C.teal : C.muted }]} />
                <Text style={[mine.activeText, !service.active && { color: C.secondary }]}>{service.active ? 'ATIVO' : 'PAUSADO'}</Text>
              </View>
            </View>
            {service.description ? <Text style={mine.serviceDescription}>{service.description}</Text> : null}
            <View style={mine.serviceFooter}>
              <Text style={mine.price}>Valor: {service.price_label}</Text>
              <TouchableOpacity onPress={() => openForm(service)}>
                <Text style={mine.edit}>Editar</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      })}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fotos de trabalhos</Text>
        {portfolioAllowed ? <Text style={styles.resultLabel}>{photos.length} DE {limits.photos} FOTOS</Text> : null}
      </View>
      {portfolioAllowed ? (
        <View style={mine.gallery}>
          <TouchableOpacity style={[mine.photo, mine.addPhoto]} onPress={addPhoto} disabled={uploading}>
            {uploading ? <ActivityIndicator color={C.teal} /> : <AppIcon name="camera-outline" color={C.teal} size={24} />}
            <Text style={mine.addPhotoText}>Adicionar foto</Text>
          </TouchableOpacity>
          {photos.map((photo) => (
            <TouchableOpacity key={photo.id} style={mine.photo} onLongPress={() => removePhoto(photo)} onPress={() => removePhoto(photo)}>
              <Image source={{ uri: photo.url }} style={mine.photoImage} />
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <TouchableOpacity style={mine.lockedCard} onPress={() => router.push('/planos')}>
          <AppIcon name="images-outline" color={C.tealDark} size={20} />
          <View style={{ flex: 1 }}>
            <Text style={mine.lockedTitle}>Mostre fotos dos seus trabalhos</Text>
            <Text style={styles.demoNoticeText}>Disponível a partir do plano Plus+ (até 5 fotos). Toque para conhecer os planos.</Text>
          </View>
          <AppIcon name="chevron-forward" color={C.tealDark} size={17} />
        </TouchableOpacity>
      )}

      <ServiceForm
        visible={formOpen}
        userId={userId}
        service={editing}
        defaultCategory={profile.specialty}
        onClose={() => setFormOpen(false)}
        onSaved={() => {
          setFormOpen(false);
          load();
        }}
      />
    </ScrollView>
  );
}

const mine = StyleSheet.create({
  title: { fontSize: 26, lineHeight: 31, color: C.navy, fontWeight: '900', letterSpacing: -0.7, marginTop: 4 },
  subtitle: { color: C.secondary, fontSize: 12, lineHeight: 18 },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.navy, borderRadius: 16, padding: 14 },
  summaryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  summaryEyebrow: { color: '#CBD5E1', fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  summaryValue: { color: C.white, fontSize: 15, fontWeight: '900', marginTop: 2 },
  summaryLimit: { color: '#94A3B8', fontSize: 10, marginTop: 2 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#1E293B', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 7 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: C.white, fontSize: 9, fontWeight: '800' },
  addButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.teal, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 15 },
  addText: { flex: 1, color: C.white, fontSize: 15, fontWeight: '800' },
  serviceCard: { backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 13, gap: 10 },
  serviceTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  serviceIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  serviceTitle: { color: C.navy, fontSize: 13, fontWeight: '800' },
  activePill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.tealLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4 },
  activeText: { color: C.tealDark, fontSize: 8, fontWeight: '800' },
  serviceDescription: { color: '#334155', fontSize: 11, lineHeight: 16 },
  serviceFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: C.border, paddingTop: 9 },
  price: { color: C.muted, fontSize: 10 },
  edit: { color: C.tealDark, fontSize: 12, fontWeight: '800' },
  gallery: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photo: { width: '31.5%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: C.white, borderWidth: 1, borderColor: C.border },
  photoImage: { width: '100%', height: '100%' },
  addPhoto: { alignItems: 'center', justifyContent: 'center', gap: 6, borderStyle: 'dashed', borderColor: '#99F6E4', backgroundColor: C.tealLight },
  addPhotoText: { color: C.tealDark, fontSize: 10, fontWeight: '800' },
  lockedCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.tealLight, borderWidth: 1, borderColor: '#99F6E4', borderRadius: 14, padding: 12 },
  lockedTitle: { color: C.tealDark, fontSize: 12, fontWeight: '800', marginBottom: 2 },
});
