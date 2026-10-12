import React from 'react';
import { ActivityIndicator, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import type { Education, Experience, Profile, Project } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { AppIcon, Avatar } from './ui';

/** Capa do perfil (layout Perfil no Figma): foto de capa, avatar, nome, @usuário e frase. */
export function ProfileCover({
  profile,
  verified,
  editing,
  draftName,
  draftUsername,
  draftHeadline,
  onChangeName,
  onChangeUsername,
  onChangeHeadline,
  onEditCover,
  onEditAvatar,
  uploading,
  badge,
  showHeadline = true,
}: {
  showHeadline?: boolean;
  profile: Profile;
  badge?: string | null;
  verified?: boolean;
  editing?: boolean;
  draftName?: string;
  draftUsername?: string;
  draftHeadline?: string;
  onChangeName?: (value: string) => void;
  onChangeUsername?: (value: string) => void;
  onChangeHeadline?: (value: string) => void;
  onEditCover?: () => void;
  onEditAvatar?: () => void;
  uploading?: 'avatar' | 'cover' | null;
}) {
  const content = (
    <View style={cover.overlay}>
      {!profile.cover_url ? (
        <>
          <View style={cover.glowA} />
          <View style={cover.glowB} />
        </>
      ) : null}
      <View style={styles.profileCoverTop}>
        {verified || badge ? (
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {verified ? (
              <View style={cover.pill}>
                <AppIcon name="checkmark-circle-outline" color={C.white} size={14} />
                <Text style={cover.pillText}>Perfil verificado</Text>
              </View>
            ) : null}
            {badge ? (
              <View style={[cover.pill, { backgroundColor: 'rgba(245,158,11,0.9)', borderColor: 'transparent' }]}>
                <AppIcon name="star" color={C.white} size={12} />
                <Text style={cover.pillText}>{badge}</Text>
              </View>
            ) : null}
          </View>
        ) : <View />}
        {onEditCover ? (
          <TouchableOpacity style={cover.pill} onPress={onEditCover} disabled={uploading === 'cover'} accessibilityLabel="Editar capa">
            {uploading === 'cover' ? <ActivityIndicator color={C.white} size="small" /> : <AppIcon name="camera-outline" color={C.white} size={14} />}
            <Text style={cover.pillText}>Editar capa</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <View style={styles.profileHeaderUser}>
        <TouchableOpacity onPress={onEditAvatar} disabled={!onEditAvatar || uploading === 'avatar'} accessibilityLabel="Trocar foto de perfil">
          <View style={cover.avatarRing}>
            <Avatar name={draftName || profile.full_name} uri={profile.avatar_url} size={70} tone={{ background: '#CCFBF1', border: '#CCFBF1', text: C.tealDark }} />
          </View>
          {onEditAvatar ? (
            <View style={cover.avatarBadge}>
              {uploading === 'avatar' ? <ActivityIndicator color={C.white} size="small" /> : <AppIcon name="camera" color={C.white} size={12} />}
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.profileNameArea}>
          {editing ? (
            <>
              <TextInput value={draftName} onChangeText={onChangeName} style={styles.profileNameInput} placeholder="Seu nome" placeholderTextColor="#CBD5E1" maxLength={60} />
              <View style={cover.usernameRow}>
                <Text style={styles.profileHandle}>@</Text>
                <TextInput
                  value={draftUsername}
                  onChangeText={(value) => onChangeUsername?.(value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                  style={cover.usernameInput}
                  placeholder="usuario"
                  placeholderTextColor="#94A3B8"
                  autoCapitalize="none"
                  maxLength={30}
                />
              </View>
              {showHeadline ? <TextInput
                value={draftHeadline}
                onChangeText={onChangeHeadline}
                style={cover.headlineInput}
                placeholder="Uma frase sobre você"
                placeholderTextColor="#94A3B8"
                multiline
                maxLength={160}
              /> : null}
            </>
          ) : (
            <>
              <Text style={styles.profileName}>{profile.full_name}</Text>
              {profile.username ? <Text style={styles.profileHandle}>@{profile.username}</Text> : null}
              {showHeadline && profile.headline ? <Text style={styles.profileSummary} numberOfLines={3}>{profile.headline}</Text> : null}
            </>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={cover.card}>
      {profile.cover_url ? (
        <ImageBackground source={{ uri: profile.cover_url }} style={cover.image} resizeMode="cover">
          {content}
        </ImageBackground>
      ) : (
        <View style={[cover.image, { backgroundColor: C.navy }]}>{content}</View>
      )}
    </View>
  );
}

export function ProfileCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.profileCard}>
      {title ? <Text style={styles.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function EmptyHint({ text }: { text: string }) {
  return <Text style={[styles.bodyText, { color: C.muted }]}>{text}</Text>;
}

export function SkillChips({ skills }: { skills: string[] }) {
  return (
    <View style={styles.skillWrap}>
      {skills.map((skill) => (
        <View key={skill} style={styles.skillTag}>
          <Text style={styles.skillText}>{skill}</Text>
        </View>
      ))}
    </View>
  );
}

const BADGE_COLORS = [C.teal, '#F5B232', C.navy, '#6366F1'];

export function ExperienceList({ items }: { items: Experience[] }) {
  return (
    <>
      {items.map((job, index) => (
        <View key={`${job.role}-${index}`} style={styles.timelineRow}>
          <View style={[styles.timelineLogo, { backgroundColor: BADGE_COLORS[index % BADGE_COLORS.length] }]}>
            <Text style={styles.timelineLogoText}>{initials(job.company || job.role)}</Text>
          </View>
          <View style={styles.timelineBody}>
            <Text style={styles.timelineRole}>{job.role}</Text>
            <Text style={styles.timelineCompany}>{[job.company, job.period].filter(Boolean).join(' • ')}</Text>
            {job.description ? <Text style={styles.bodyText}>{job.description}</Text> : null}
          </View>
        </View>
      ))}
    </>
  );
}

export function EducationList({ items }: { items: Education[] }) {
  return (
    <>
      {items.map((item, index) => (
        <View key={`${item.course}-${index}`} style={styles.educationRow}>
          <View style={[styles.educationLogo, { backgroundColor: index % 2 === 0 ? C.navy : C.teal }]}>
            <Text style={[styles.educationLogoText, { color: C.white }]}>{item.initials || initials(item.institution)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineRole}>{item.course}</Text>
            <Text style={[styles.timelineCompany, { color: C.secondary, fontWeight: '400' }]}>{[item.institution, item.period].filter(Boolean).join(' • ')}</Text>
          </View>
        </View>
      ))}
    </>
  );
}

export function ProjectList({ items }: { items: Project[] }) {
  return (
    <>
      {items.map((project, index) => (
        <View key={`${project.title}-${index}`} style={styles.projectRow}>
          <View style={[styles.projectIcon, index % 2 === 1 && { backgroundColor: C.amberLight }]}>
            <AppIcon name={index % 2 === 0 ? 'briefcase-outline' : 'layers-outline'} size={20} color={index % 2 === 0 ? C.teal : '#D97706'} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.timelineRole}>{project.title}</Text>
            {project.description ? <Text style={styles.bodyText}>{project.description}</Text> : null}
          </View>
        </View>
      ))}
    </>
  );
}

export function initials(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '•';
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
}

const cover = StyleSheet.create({
  card: { marginHorizontal: 15, marginTop: 12, borderRadius: 20, overflow: 'hidden' },
  image: { width: '100%' },
  overlay: { padding: 16, paddingBottom: 20, gap: 22, backgroundColor: 'rgba(15,23,42,0.45)' },
  glowA: { position: 'absolute', width: 220, height: 220, borderRadius: 110, right: -70, top: -90, backgroundColor: '#134E4A', opacity: 0.8 },
  glowB: { position: 'absolute', width: 160, height: 160, borderRadius: 80, left: 120, bottom: -110, backgroundColor: '#1E3A5F', opacity: 0.9 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(15,23,42,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  pillText: { color: C.white, fontSize: 10, fontWeight: '700' },
  avatarRing: { borderWidth: 2, borderColor: C.white, borderRadius: 37 },
  avatarBadge: { position: 'absolute', right: -2, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.teal, borderWidth: 2, borderColor: C.white, alignItems: 'center', justifyContent: 'center' },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  usernameInput: { flex: 1, color: '#CBD5E1', fontSize: 11, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: '#475569' },
  headlineInput: { color: '#E2E8F0', fontSize: 10, lineHeight: 15, marginTop: 4, paddingVertical: 2, borderBottomWidth: 1, borderBottomColor: '#475569' },
});
