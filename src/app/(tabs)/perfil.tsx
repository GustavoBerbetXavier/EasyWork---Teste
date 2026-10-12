import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CityPicker } from '@/components/CityPicker';
import {
  EducationList,
  EmptyHint,
  ExperienceList,
  ProfileCard,
  ProfileCover,
  ProjectList,
  SkillChips,
  initials,
} from '@/components/profile';
import { AppIcon, ErrorBanner } from '@/components/ui';
import { uploadImage } from '@/lib/api';
import { useSignedIn } from '@/lib/auth';
import { CATEGORY_NAMES } from '@/lib/categories';
import {
  birthDateToInput,
  confirmAction,
  formatBirthDate,
  inputToBirthDate,
  isValidEmail,
  maskDate,
  maskPhone,
  notify,
} from '@/lib/format';
import { pickImage } from '@/lib/images';
import { planName } from '@/lib/plans';
import type { Education, Experience, Profile, Project } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

type Draft = Pick<
  Profile,
  'full_name' | 'username' | 'headline' | 'bio' | 'tag' | 'city' | 'specialty' | 'category' | 'area' | 'skills' | 'experiences' | 'education' | 'projects' | 'objective'
> & { birth: string; contact_email: string; phone: string };

export default function PerfilScreen() {
  const params = useLocalSearchParams<{ editar?: string }>();
  const { userId, profile, privateInfo, email, emailConfirmed, saveProfile, signOut } = useSignedIn();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => toDraft(profile, privateInfo, email));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cityPicker, setCityPicker] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [uploading, setUploading] = useState<'avatar' | 'cover' | null>(null);
  const isProvider = profile.role === 'profissional';

  // "Editar meu perfil" no painel do profissional abre direto no modo de edição (cada toque traz um token novo).
  const [editToken, setEditToken] = useState(params.editar);
  if (params.editar && params.editar !== editToken) {
    setEditToken(params.editar);
    setDraft(toDraft(profile, privateInfo, email));
    setError(null);
    setSaved(false);
    setEditing(true);
  }

  const startEditing = () => {
    setDraft(toDraft(profile, privateInfo, email));
    setError(null);
    setSaved(false);
    setEditing(true);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    if (!editing) {
      notify('Nada para salvar', 'Toque em Editar para alterar seu perfil.');
      return;
    }
    const birth = inputToBirthDate(draft.birth);
    if (draft.full_name.trim().length < 2) return setError('Digite seu nome.');
    if (!/^[a-z0-9_.]{3,30}$/.test(draft.username)) return setError('O nome de usuário precisa ter de 3 a 30 letras, números, ponto ou _.');
    if (birth === undefined) return setError('Data de nascimento inválida. Use o formato DD/MM/AAAA.');
    if (draft.contact_email.trim() && !isValidEmail(draft.contact_email)) return setError('E-mail de contato inválido.');
    setError(null);
    setSaving(true);
    try {
      await saveProfile(
        {
          full_name: draft.full_name.trim(),
          username: draft.username,
          headline: draft.headline.trim(),
          bio: draft.bio.trim(),
          tag: draft.tag.trim(),
          city: draft.city.trim(),
          specialty: draft.specialty.trim(),
          category: draft.category,
          area: draft.area.trim(),
          skills: draft.skills,
          experiences: draft.experiences.filter((item) => item.role.trim() || item.company.trim()),
          education: draft.education
            .filter((item) => item.course.trim() || item.institution.trim())
            .map((item) => ({ ...item, initials: initials(item.institution || item.course) })),
          projects: draft.projects.filter((item) => item.title.trim()),
          objective: draft.objective.trim(),
        },
        { birth_date: birth, contact_email: draft.contact_email.trim(), phone: draft.phone.trim() },
      );
      setEditing(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const changeImage = async (kind: 'avatar' | 'cover') => {
    const image = await pickImage(kind === 'avatar' ? [1, 1] : [16, 9]);
    if (!image) return;
    setUploading(kind);
    try {
      const url = await uploadImage(userId, kind === 'avatar' ? 'avatars' : 'covers', image.uri, image.mimeType);
      await saveProfile(kind === 'avatar' ? { avatar_url: url } : { cover_url: url });
    } catch (err) {
      notify('Não foi possível enviar a foto', err instanceof Error ? err.message : undefined);
    } finally {
      setUploading(null);
    }
  };

  const addSkill = () => {
    const skill = newSkill.trim();
    if (!skill || draft.skills.some((item) => item.toLowerCase() === skill.toLowerCase())) return;
    set('skills', [...draft.skills, skill].slice(0, 20));
    setNewSkill('');
  };

  const updateItem = <T,>(key: 'experiences' | 'education' | 'projects', index: number, patch: Partial<T>) => {
    const list = [...(draft[key] as T[])];
    list[index] = { ...list[index], ...patch };
    set(key, list as never);
  };

  const removeItem = (key: 'experiences' | 'education' | 'projects', index: number) => {
    set(key, (draft[key] as unknown[]).filter((_, position) => position !== index) as never);
  };

  const logout = () => confirmAction('Sair da conta', 'Deseja mesmo sair?', 'Sair', () => signOut(), true);

  return (
    <ScrollView style={styles.screenBg} contentContainerStyle={styles.profilePage} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <ProfileCover
        profile={profile}
        verified={emailConfirmed}
        editing={editing}
        draftName={draft.full_name}
        draftUsername={draft.username}
        draftHeadline={draft.headline}
        onChangeName={(value) => set('full_name', value)}
        onChangeUsername={(value) => set('username', value)}
        onChangeHeadline={(value) => set('headline', value)}
        showHeadline={isProvider}
        onEditCover={() => changeImage('cover')}
        onEditAvatar={() => changeImage('avatar')}
        uploading={uploading}
      />

      <View style={styles.profileActionRow}>
        <TouchableOpacity style={styles.profileOutlineButton} onPress={() => (editing ? setEditing(false) : startEditing())}>
          <AppIcon name={editing ? 'close-outline' : 'pencil-outline'} color="#334155" size={15} />
          <Text style={styles.profileOutlineText}>{editing ? 'Cancelar edição' : 'Editar'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.profileSaveButton, saving && { opacity: 0.7 }]} onPress={save} disabled={saving}>
          <AppIcon name="checkmark" color={C.white} size={16} />
          <Text style={styles.profileSaveText}>{saving ? 'Salvando...' : saved && !editing ? 'Salvo' : 'Salvar'}</Text>
        </TouchableOpacity>
      </View>
      {error ? <View style={{ marginHorizontal: 15 }}><ErrorBanner message={error} /></View> : null}

      <ProfileCard>
        <View style={styles.infoGrid}>
          <InfoCell label="Localização">
            {editing ? (
              <TouchableOpacity onPress={() => setCityPicker(true)} style={edit.inlineButton}>
                <Text style={[styles.infoValue, !draft.city && { color: C.muted }]}>{draft.city || 'Escolher'}</Text>
                <AppIcon name="chevron-down" color={C.secondary} size={13} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.infoValue}>{profile.city || '—'}</Text>
            )}
          </InfoCell>
          <InfoCell label="Nascimento">
            {editing ? (
              <TextInput value={draft.birth} onChangeText={(value) => set('birth', maskDate(value))} placeholder="DD/MM/AAAA" keyboardType="number-pad" style={edit.inline} placeholderTextColor={C.muted} />
            ) : (
              <Text style={styles.infoValue}>{formatBirthDate(privateInfo?.birth_date ?? null) || '—'}</Text>
            )}
          </InfoCell>
          <InfoCell label="Contato">
            {editing ? (
              <TextInput value={draft.contact_email} onChangeText={(value) => set('contact_email', value)} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" style={edit.inline} placeholderTextColor={C.muted} />
            ) : (
              <Text style={styles.infoValue} numberOfLines={1}>{privateInfo?.contact_email || email || '—'}</Text>
            )}
          </InfoCell>
          <InfoCell label="Telefone">
            {editing ? (
              <TextInput value={draft.phone} onChangeText={(value) => set('phone', maskPhone(value))} placeholder="(44) 99999-0000" keyboardType="phone-pad" style={edit.inline} placeholderTextColor={C.muted} />
            ) : (
              <Text style={styles.infoValue}>{privateInfo?.phone || '—'}</Text>
            )}
          </InfoCell>
        </View>
        {editing ? <Text style={edit.privacy}>Nascimento, contato e telefone só aparecem para você.</Text> : null}
      </ProfileCard>

      {isProvider ? (
        <ProfileCard title="Informações profissionais">
          {editing ? (
            <>
              <EditField label="Especialidade" value={draft.specialty} onChangeText={(value) => set('specialty', value)} placeholder="Ex.: Encanamento" />
              <Text style={edit.label}>Categoria</Text>
              <View style={styles.filterChips}>
                {CATEGORY_NAMES.map((category) => (
                  <TouchableOpacity key={category} onPress={() => set('category', category)} style={[styles.filterChip, draft.category === category && styles.filterChipActive]}>
                    <Text style={[styles.filterChipText, draft.category === category && styles.filterChipTextActive]}>{category}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <EditField label="Bairro ou região de atendimento" value={draft.area} onChangeText={(value) => set('area', value)} placeholder="Ex.: Centro" />
            </>
          ) : profile.specialty || profile.category || profile.area ? (
            <View style={styles.infoGrid}>
              <InfoCell label="Especialidade"><Text style={styles.infoValue}>{profile.specialty || '—'}</Text></InfoCell>
              <InfoCell label="Categoria"><Text style={styles.infoValue}>{profile.category || '—'}</Text></InfoCell>
              <InfoCell label="Região"><Text style={styles.infoValue}>{profile.area || '—'}</Text></InfoCell>
            </View>
          ) : (
            <EmptyHint text="Conte sua especialidade e região para os clientes encontrarem você nas buscas." />
          )}
        </ProfileCard>
      ) : null}

      {/* Biografia, habilidades, experiência, formação, projetos e objetivo: só no perfil do profissional. */}
      {isProvider ? (
      <>
      <ProfileCard title="Biografia">
        {editing ? (
          <>
            <TextInput value={draft.bio} onChangeText={(value) => set('bio', value)} placeholder="Conte um pouco sobre você e seu trabalho." multiline maxLength={1200} style={[edit.input, edit.multiline]} placeholderTextColor={C.muted} textAlignVertical="top" />
            <EditField label="Etiqueta" value={draft.tag} onChangeText={(value) => set('tag', value)} placeholder="Ex.: Auto" />
          </>
        ) : (
          <>
            {profile.bio ? <Text style={styles.bodyText}>{profile.bio}</Text> : <EmptyHint text="Adicione uma biografia tocando em Editar." />}
            {profile.tag ? (
              <View style={styles.bioCategory}>
                <AppIcon name="pricetag-outline" size={13} color={C.tealDark} />
                <Text style={styles.bioCategoryText}>{profile.tag}</Text>
              </View>
            ) : null}
          </>
        )}
      </ProfileCard>

      <ProfileCard title="Habilidades">
        {editing ? (
          <>
            <View style={styles.skillWrap}>
              {draft.skills.map((skill) => (
                <TouchableOpacity key={skill} style={[styles.skillTag, edit.skillRemovable]} onPress={() => set('skills', draft.skills.filter((item) => item !== skill))}>
                  <Text style={styles.skillText}>{skill}</Text>
                  <AppIcon name="close" color={C.secondary} size={12} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={edit.addRow}>
              <TextInput value={newSkill} onChangeText={setNewSkill} placeholder="Nova habilidade" style={[edit.input, { flex: 1 }]} placeholderTextColor={C.muted} onSubmitEditing={addSkill} returnKeyType="done" maxLength={30} />
              <TouchableOpacity style={edit.addButton} onPress={addSkill} accessibilityLabel="Adicionar habilidade">
                <AppIcon name="add" color={C.white} size={20} />
              </TouchableOpacity>
            </View>
          </>
        ) : profile.skills.length ? (
          <SkillChips skills={profile.skills} />
        ) : (
          <EmptyHint text="Adicione suas habilidades tocando em Editar." />
        )}
      </ProfileCard>

      <ProfileCard title="Experiência profissional">
        {editing ? (
          <>
            {draft.experiences.map((job, index) => (
              <View key={index} style={edit.itemBox}>
                <EditField label="Cargo ou função" value={job.role} onChangeText={(value) => updateItem<Experience>('experiences', index, { role: value })} placeholder="Ex.: Eletricista" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1 }}><EditField label="Empresa" value={job.company} onChangeText={(value) => updateItem<Experience>('experiences', index, { company: value })} placeholder="Ex.: Autônomo" /></View>
                  <View style={{ flex: 1 }}><EditField label="Período" value={job.period} onChangeText={(value) => updateItem<Experience>('experiences', index, { period: value })} placeholder="2020 - Atual" /></View>
                </View>
                <EditField label="Descrição" value={job.description} onChangeText={(value) => updateItem<Experience>('experiences', index, { description: value })} placeholder="O que você fazia" multiline />
                <RemoveButton onPress={() => removeItem('experiences', index)} />
              </View>
            ))}
            <AddItemButton label="Adicionar experiência" onPress={() => set('experiences', [...draft.experiences, { role: '', company: '', period: '', description: '' }])} />
          </>
        ) : profile.experiences.length ? (
          <ExperienceList items={profile.experiences} />
        ) : (
          <EmptyHint text="Adicione suas experiências tocando em Editar." />
        )}
      </ProfileCard>

      <ProfileCard title="Formação">
        {editing ? (
          <>
            {draft.education.map((item, index) => (
              <View key={index} style={edit.itemBox}>
                <EditField label="Curso" value={item.course} onChangeText={(value) => updateItem<Education>('education', index, { course: value })} placeholder="Ex.: Técnico em Eletrotécnica" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <View style={{ flex: 1.4 }}><EditField label="Instituição" value={item.institution} onChangeText={(value) => updateItem<Education>('education', index, { institution: value })} placeholder="Ex.: SENAI" /></View>
                  <View style={{ flex: 1 }}><EditField label="Período" value={item.period} onChangeText={(value) => updateItem<Education>('education', index, { period: value })} placeholder="2018 - 2020" /></View>
                </View>
                <RemoveButton onPress={() => removeItem('education', index)} />
              </View>
            ))}
            <AddItemButton label="Adicionar formação" onPress={() => set('education', [...draft.education, { course: '', institution: '', period: '', initials: '' }])} />
          </>
        ) : profile.education.length ? (
          <EducationList items={profile.education} />
        ) : (
          <EmptyHint text="Adicione sua formação tocando em Editar." />
        )}
      </ProfileCard>

      <ProfileCard title="Projetos">
        {editing ? (
          <>
            {draft.projects.map((item, index) => (
              <View key={index} style={edit.itemBox}>
                <EditField label="Título" value={item.title} onChangeText={(value) => updateItem<Project>('projects', index, { title: value })} placeholder="Ex.: Reforma completa de banheiro" />
                <EditField label="Descrição" value={item.description} onChangeText={(value) => updateItem<Project>('projects', index, { description: value })} placeholder="Conte o resultado" multiline />
                <RemoveButton onPress={() => removeItem('projects', index)} />
              </View>
            ))}
            <AddItemButton label="Adicionar projeto" onPress={() => set('projects', [...draft.projects, { title: '', description: '' }])} />
          </>
        ) : profile.projects.length ? (
          <ProjectList items={profile.projects} />
        ) : (
          <EmptyHint text="Mostre projetos que você já fez tocando em Editar." />
        )}
      </ProfileCard>

      <ProfileCard title="Objetivo profissional">
        {editing ? (
          <TextInput value={draft.objective} onChangeText={(value) => set('objective', value)} placeholder="O que você busca?" multiline maxLength={800} style={[edit.input, edit.multiline]} placeholderTextColor={C.muted} textAlignVertical="top" />
        ) : profile.objective ? (
          <Text style={styles.bodyText}>{profile.objective}</Text>
        ) : (
          <EmptyHint text="Conte seu objetivo tocando em Editar." />
        )}
      </ProfileCard>
      </>
      ) : null}

      {editing ? (
        <TouchableOpacity style={[styles.profileSaveButton, edit.bottomSave]} onPress={save} disabled={saving}>
          <AppIcon name="checkmark" color={C.white} size={16} />
          <Text style={styles.profileSaveText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
        </TouchableOpacity>
      ) : null}

      {isProvider ? (
      <TouchableOpacity style={edit.planCard} onPress={() => router.push('/planos')}>
        <View style={edit.planIcon}>
          <AppIcon name="star" color={C.amber} size={18} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={edit.planEyebrow}>SEU PLANO</Text>
          <Text style={edit.planName}>
            {planName(profile.plan)}
          </Text>
        </View>
        <Text style={edit.planLink}>Ver planos</Text>
        <AppIcon name="chevron-forward" color="#99F6E4" size={17} />
      </TouchableOpacity>
      ) : null}

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <AppIcon name="log-out-outline" size={18} color={C.red} />
        <Text style={styles.logoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <CityPicker visible={cityPicker} current={draft.city} onClose={() => setCityPicker(false)} onSelect={(value) => { set('city', value); setCityPicker(false); }} />
    </ScrollView>
  );
}

function toDraft(profile: Profile, privateInfo: { birth_date: string | null; contact_email: string; phone: string } | null, email: string | null): Draft {
  return {
    full_name: profile.full_name,
    username: profile.username ?? '',
    headline: profile.headline,
    bio: profile.bio,
    tag: profile.tag,
    city: profile.city,
    specialty: profile.specialty,
    category: profile.category,
    area: profile.area,
    skills: [...profile.skills],
    experiences: profile.experiences.map((item) => ({ ...item })),
    education: profile.education.map((item) => ({ ...item })),
    projects: profile.projects.map((item) => ({ ...item })),
    objective: profile.objective,
    birth: birthDateToInput(privateInfo?.birth_date ?? null),
    contact_email: privateInfo?.contact_email || email || '',
    phone: privateInfo?.phone ?? '',
  };
}

function InfoCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.infoCell}>
      <Text style={styles.infoLabel}>{label}</Text>
      {children}
    </View>
  );
}

function EditField({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={{ gap: 5 }}>
      <Text style={edit.label}>{label}</Text>
      <TextInput
        style={[edit.input, multiline && edit.multilineSmall]}
        placeholderTextColor={C.muted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={edit.remove} onPress={onPress}>
      <AppIcon name="trash-outline" color={C.red} size={14} />
      <Text style={edit.removeText}>Remover</Text>
    </TouchableOpacity>
  );
}

function AddItemButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={edit.addItem} onPress={onPress}>
      <AppIcon name="add-circle-outline" color={C.tealDark} size={17} />
      <Text style={styles.actionText}>{label}</Text>
    </TouchableOpacity>
  );
}

const edit = StyleSheet.create({
  label: { color: C.muted, fontSize: 9, fontWeight: '800' },
  input: { minHeight: 40, borderWidth: 1, borderColor: C.border, borderRadius: 10, backgroundColor: C.bg, paddingHorizontal: 10, paddingVertical: 8, fontSize: 12, color: C.text },
  multiline: { minHeight: 100 },
  multilineSmall: { minHeight: 70 },
  inline: { color: C.text, fontSize: 11, fontWeight: '700', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  inlineButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  privacy: { color: C.muted, fontSize: 10 },
  skillRemovable: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  addButton: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' },
  itemBox: { gap: 8, padding: 10, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: '#FBFCFE' },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-end' },
  removeText: { color: C.red, fontSize: 11, fontWeight: '800' },
  addItem: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 4 },
  bottomSave: { marginHorizontal: 15, flex: 0, paddingVertical: 13 },
  planCard: { marginHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: C.navy, borderRadius: 15, paddingHorizontal: 13, paddingVertical: 13 },
  planIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' },
  planEyebrow: { color: '#99F6E4', fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  planName: { color: C.white, fontSize: 13, fontWeight: '900', marginTop: 2 },
  planLink: { color: '#5EEAD4', fontSize: 11, fontWeight: '800' },
});
