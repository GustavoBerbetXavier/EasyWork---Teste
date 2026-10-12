import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CityPicker } from '@/components/CityPicker';
import { AppIcon, Avatar, Brand, ErrorBanner, type IconName } from '@/components/ui';
import { saveService, uploadImage } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { CATEGORIES } from '@/lib/categories';
import { maskPhone } from '@/lib/format';
import { pickImage } from '@/lib/images';
import { C } from '@/theme/colors';

type StepId = 'foto' | 'servicos' | 'regiao' | 'primeiro-servico' | 'pronto';

const PROVIDER_STEPS: StepId[] = ['foto', 'servicos', 'regiao', 'primeiro-servico', 'pronto'];
const CLIENT_STEPS: StepId[] = ['foto', 'regiao', 'pronto'];

/** Passo a passo de configuração que aparece logo depois de criar a conta. */
export default function OnboardingScreen() {
  const { userId, profile, privateInfo, saveProfile, finishOnboarding } = useSignedIn();
  const isProvider = profile.role === 'profissional';
  const steps = isProvider ? PROVIDER_STEPS : CLIENT_STEPS;
  const [index, setIndex] = useState(0);
  const step = steps[index];

  const [name, setName] = useState(profile.full_name);
  const [headline, setHeadline] = useState(profile.headline);
  const [category, setCategory] = useState(profile.category);
  const [specialty, setSpecialty] = useState(profile.specialty);
  const [city, setCity] = useState(profile.city);
  const [area, setArea] = useState(profile.area);
  const [phone, setPhone] = useState(privateInfo?.phone ?? '');
  const [available, setAvailable] = useState(profile.available);
  const [service, setService] = useState({ title: '', description: '', price: '' });
  const [cityPicker, setCityPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const changePhoto = async () => {
    const image = await pickImage([1, 1]);
    if (!image) return;
    setUploading(true);
    try {
      const url = await uploadImage(userId, 'avatars', image.uri, image.mimeType);
      await saveProfile({ avatar_url: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  };

  /** Valida e salva o passo atual; devolve `false` se algo estiver faltando. */
  const saveStep = async (skip = false): Promise<boolean> => {
    if (step === 'foto') {
      if (name.trim().split(' ').filter(Boolean).length < 2) return fail('Digite seu nome e sobrenome.');
      await saveProfile({ full_name: name.trim(), headline: headline.trim() });
    }
    if (step === 'servicos') {
      if (!category) return fail('Escolha a categoria do seu trabalho.');
      if (specialty.trim().length < 3) return fail('Conte qual é a sua especialidade.');
      await saveProfile({ category, specialty: specialty.trim() });
    }
    if (step === 'regiao') {
      if (!city.trim()) return fail('Escolha sua cidade.');
      if (isProvider && phone.replace(/\D/g, '').length < 10) return fail('Digite um telefone com DDD para os clientes falarem com você.');
      await saveProfile(isProvider ? { city: city.trim(), area: area.trim(), available } : { city: city.trim() }, { phone: phone.trim() });
    }
    if (step === 'primeiro-servico' && !skip) {
      if (service.title.trim().length < 2) return fail('Dê um nome ao serviço ou toque em “Pular por enquanto”.');
      await saveService(userId, {
        title: service.title,
        category: specialty || category,
        subcategory: 'Residencial',
        description: service.description,
        price_label: service.price || 'sob consulta',
        active: true,
      });
    }
    return true;
  };

  const fail = (message: string) => {
    setError(message);
    return false;
  };

  const next = async (skip = false) => {
    setError(null);
    setSaving(true);
    try {
      if (await saveStep(skip)) setIndex((value) => Math.min(value + 1, steps.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const finish = async (destination: '/inicio' | '/planos' | '/servicos') => {
    setSaving(true);
    try {
      await finishOnboarding();
      // Ao concluir, o app libera as abas; em seguida abre a tela escolhida.
      setTimeout(() => router.navigate(destination), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível concluir. Tente novamente.');
      setSaving(false);
    }
  };

  const visibleSteps = steps.length - 1;
  const titles: Record<StepId, { title: string; subtitle: string }> = {
    foto: {
      title: isProvider ? 'Sua foto e apresentação' : 'Vamos começar pelo seu perfil',
      subtitle: isProvider ? 'Perfis com foto e uma boa apresentação recebem mais contatos.' : 'Uma foto ajuda os profissionais a reconhecerem você.',
    },
    servicos: { title: 'O que você faz?', subtitle: 'Escolha a categoria e conte sua especialidade para aparecer nas buscas certas.' },
    regiao: {
      title: isProvider ? 'Onde você atende' : 'Onde você está',
      subtitle: isProvider ? 'Clientes da sua região vão encontrar você.' : 'Mostramos primeiro os profissionais da sua cidade.',
    },
    'primeiro-servico': { title: 'Cadastre seu primeiro serviço', subtitle: 'Mostre aos clientes o que você oferece. Você pode editar depois em “Meus serviços”.' },
    pronto: { title: 'Tudo pronto!', subtitle: isProvider ? 'Seu perfil já está na EASY WORK.' : 'Agora é só encontrar quem resolve.' },
  };

  return (
    <SafeAreaView style={s.screen} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.header}>
          <Brand />
          {step !== 'pronto' ? <Text style={s.stepCount}>Passo {index + 1} de {visibleSteps}</Text> : null}
        </View>
        {step !== 'pronto' ? (
          <View style={s.progressTrack}>
            <View style={[s.progressFill, { width: `${((index + 1) / visibleSteps) * 100}%` }]} />
          </View>
        ) : null}

        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {step === 'pronto' ? (
            <View style={s.doneIcon}>
              <AppIcon name="checkmark" color={C.white} size={34} />
            </View>
          ) : null}
          <Text style={[s.title, step === 'pronto' && { textAlign: 'center' }]}>{titles[step].title}</Text>
          <Text style={[s.subtitle, step === 'pronto' && { textAlign: 'center' }]}>{titles[step].subtitle}</Text>

          {step === 'foto' ? (
            <>
              <TouchableOpacity style={s.photo} onPress={changePhoto} disabled={uploading} accessibilityLabel="Escolher foto de perfil">
                <Avatar name={name || profile.full_name} uri={profile.avatar_url} size={104} />
                <View style={s.photoBadge}>
                  {uploading ? <ActivityIndicator color={C.white} size="small" /> : <AppIcon name="camera" color={C.white} size={16} />}
                </View>
              </TouchableOpacity>
              <Text style={s.photoHint}>{profile.avatar_url ? 'Toque para trocar a foto' : 'Toque para adicionar uma foto'}</Text>
              <Field label="Nome completo" value={name} onChangeText={setName} placeholder="Seu nome e sobrenome" autoCapitalize="words" />
              {isProvider ? (
                <Field
                  label="Frase de apresentação"
                  value={headline}
                  onChangeText={setHeadline}
                  placeholder="Ex.: Eletricista com 10 anos de experiência"
                  maxLength={160}
                />
              ) : null}
            </>
          ) : null}

          {step === 'servicos' ? (
            <>
              <Text style={s.label}>Categoria</Text>
              <View style={s.categoryGrid}>
                {CATEGORIES.map((item) => {
                  const active = category === item.name;
                  return (
                    <TouchableOpacity
                      key={item.name}
                      style={[s.categoryCard, active && s.categoryActive]}
                      onPress={() => setCategory(item.name)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                    >
                      <View style={[s.categoryIcon, { backgroundColor: active ? C.white : item.background }]}>
                        <AppIcon name={item.icon} color={item.color} size={18} />
                      </View>
                      <Text style={[s.categoryLabel, active && { color: C.white }]} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Field label="Sua especialidade" value={specialty} onChangeText={setSpecialty} placeholder="Ex.: Eletricista residencial" maxLength={60} />
            </>
          ) : null}

          {step === 'regiao' ? (
            <>
              <Text style={s.label}>Cidade</Text>
              <TouchableOpacity style={s.select} onPress={() => setCityPicker(true)}>
                <AppIcon name="location-outline" color={C.teal} size={18} />
                <Text style={[s.selectText, !city && { color: C.muted }]}>{city || 'Escolha sua cidade'}</Text>
                <AppIcon name="chevron-down" color={C.secondary} size={18} />
              </TouchableOpacity>
              {isProvider ? <Field label="Bairro ou região de atendimento" value={area} onChangeText={setArea} placeholder="Ex.: Centro e bairros próximos" /> : null}
              <Field
                label={isProvider ? 'Telefone (WhatsApp)' : 'Telefone (opcional)'}
                value={phone}
                onChangeText={(value) => setPhone(maskPhone(value))}
                placeholder="(44) 99999-0000"
                keyboardType="phone-pad"
              />
              {isProvider ? (
                <View style={s.switchRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.switchTitle}>Disponível para orçamento</Text>
                    <Text style={s.hint}>Mostra o selo verde no seu perfil.</Text>
                  </View>
                  <Switch value={available} onValueChange={setAvailable} trackColor={{ true: C.teal, false: C.border }} thumbColor={C.white} />
                </View>
              ) : null}
            </>
          ) : null}

          {step === 'primeiro-servico' ? (
            <>
              <Field label="Nome do serviço" value={service.title} onChangeText={(value) => setService((current) => ({ ...current, title: value }))} placeholder="Ex.: Instalação de chuveiro" maxLength={80} />
              <Field
                label="Descrição"
                value={service.description}
                onChangeText={(value) => setService((current) => ({ ...current, description: value }))}
                placeholder="O que está incluso no serviço"
                multiline
                maxLength={500}
              />
              <Field label="Valor" value={service.price} onChangeText={(value) => setService((current) => ({ ...current, price: value }))} placeholder="Ex.: sob consulta, a partir de R$ 80" maxLength={40} />
              <Text style={s.hint}>No plano gratuito você pode ter 1 serviço. Nos planos pagos, até 50.</Text>
            </>
          ) : null}

          {step === 'pronto' ? (
            <View style={{ gap: 10, marginTop: 8 }}>
              {(isProvider
                ? [
                    { icon: 'person-circle-outline', text: 'Complete seu perfil com biografia, experiência e formação.' },
                    { icon: 'briefcase-outline', text: 'Cadastre mais serviços em “Meus serviços”.' },
                    { icon: 'star-outline', text: 'Assine um plano para aparecer em destaque nas buscas.' },
                  ]
                : [
                    { icon: 'search-outline', text: 'Busque por serviço, categoria ou região.' },
                    { icon: 'chatbubbles-outline', text: 'Converse direto com o profissional pelo app.' },
                    { icon: 'star-outline', text: 'Depois do serviço, avalie quem atendeu você.' },
                  ]
              ).map((tip) => (
                <View key={tip.text} style={s.tip}>
                  <View style={s.tipIcon}>
                    <AppIcon name={tip.icon as IconName} color={C.teal} size={18} />
                  </View>
                  <Text style={s.tipText}>{tip.text}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {error ? <ErrorBanner message={error} /> : null}
        </ScrollView>

        <View style={s.footer}>
          {step === 'pronto' ? (
            <>
              <TouchableOpacity style={s.primary} onPress={() => finish(isProvider ? '/inicio' : '/servicos')} disabled={saving}>
                {saving ? <ActivityIndicator color={C.white} /> : <Text style={s.primaryText}>{isProvider ? 'Ir para o meu painel' : 'Encontrar profissionais'}</Text>}
              </TouchableOpacity>
              {isProvider ? (
                <TouchableOpacity style={s.secondary} onPress={() => finish('/planos')} disabled={saving}>
                  <Text style={s.secondaryText}>Conhecer os planos</Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <View style={s.footerRow}>
                {index > 0 ? (
                  <TouchableOpacity style={s.back} onPress={() => { setError(null); setIndex((value) => value - 1); }} disabled={saving}>
                    <AppIcon name="arrow-back" color={C.navy} size={20} />
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity style={[s.primary, { flex: 1 }]} onPress={() => next()} disabled={saving || uploading}>
                  {saving ? <ActivityIndicator color={C.white} /> : (
                    <>
                      <Text style={s.primaryText}>Continuar</Text>
                      <AppIcon name="arrow-forward" color={C.white} size={18} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
              {step === 'primeiro-servico' ? (
                <TouchableOpacity style={s.skip} onPress={() => next(true)} disabled={saving}>
                  <Text style={s.skipText}>Pular por enquanto</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
      <CityPicker visible={cityPicker} current={city} onClose={() => setCityPicker(false)} onSelect={(value) => { setCity(value); setCityPicker(false); }} />
    </SafeAreaView>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
        autoCorrect={false}
        style={[s.input, multiline && { minHeight: 96 }]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  stepCount: { color: C.secondary, fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: C.border, marginHorizontal: 24, overflow: 'hidden', width: '100%', maxWidth: 512, alignSelf: 'center' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: C.teal },
  content: { padding: 24, gap: 16, width: '100%', maxWidth: 560, alignSelf: 'center' },
  title: { color: C.navy, fontSize: 26, lineHeight: 32, fontWeight: '900', letterSpacing: -0.6 },
  subtitle: { color: C.secondary, fontSize: 14, lineHeight: 21, marginTop: -8 },
  photo: { alignSelf: 'center', marginTop: 8 },
  photoBadge: { position: 'absolute', right: 2, bottom: 2, width: 34, height: 34, borderRadius: 17, backgroundColor: C.teal, borderWidth: 3, borderColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  photoHint: { textAlign: 'center', color: C.tealDark, fontSize: 12, fontWeight: '700', marginTop: -6 },
  label: { color: C.text, fontSize: 14, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: C.text },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: -6 },
  categoryCard: { width: '31.6%', alignItems: 'center', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 4 },
  categoryActive: { backgroundColor: C.navy, borderColor: C.navy },
  categoryIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  categoryLabel: { color: '#334155', fontSize: 10, fontWeight: '700', textAlign: 'center' },
  select: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white, paddingHorizontal: 16, marginTop: -6 },
  selectText: { flex: 1, color: C.text, fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  switchTitle: { color: C.navy, fontSize: 14, fontWeight: '700' },
  hint: { color: C.secondary, fontSize: 12, lineHeight: 17 },
  doneIcon: { alignSelf: 'center', width: 76, height: 76, borderRadius: 38, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 14 },
  tipIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center' },
  tipText: { flex: 1, color: C.navy, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  footer: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 16, gap: 8, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white },
  footerRow: { flexDirection: 'row', gap: 10, width: '100%', maxWidth: 512, alignSelf: 'center' },
  back: { width: 52, height: 52, borderRadius: 12, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
  primary: { minHeight: 52, borderRadius: 12, backgroundColor: C.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', maxWidth: 512, alignSelf: 'center' },
  primaryText: { color: C.white, fontSize: 16, fontWeight: '700' },
  secondary: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: C.tealDark, fontSize: 15, fontWeight: '800' },
  skip: { alignItems: 'center', paddingVertical: 6 },
  skipText: { color: C.secondary, fontSize: 14, fontWeight: '700' },
});
