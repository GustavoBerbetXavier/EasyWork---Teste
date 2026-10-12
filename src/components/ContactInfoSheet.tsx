import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Profile } from '@/lib/types';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { Sheet } from './Sheet';
import { AppIcon, Avatar, PrimaryButton, type IconName } from './ui';

/** "Informações do contratante" / "Informações do profissional" (layout Informacoes no Figma). */
export function ContactInfoSheet({
  visible,
  person,
  subject,
  onClose,
}: {
  visible: boolean;
  person: Profile | null;
  subject: string;
  onClose: () => void;
}) {
  if (!person) return null;
  const isProvider = person.role === 'profissional';
  const rows: { icon: IconName; label: string; value: string; color: string }[] = [
    { icon: 'location-outline', label: 'LOCALIDADE', value: person.city || 'Não informada', color: C.teal },
    { icon: isProvider ? 'construct-outline' : 'notifications-outline', label: 'TIPO DE CONTA', value: isProvider ? `Prestador${person.specialty ? ` · ${person.specialty}` : ''}` : 'Contratante', color: '#6366F1' },
    { icon: 'clipboard-outline', label: 'SERVIÇO NESTA CONVERSA', value: subject || 'Não informado', color: '#D97706' },
  ];
  return (
    <Sheet visible={visible} title={isProvider ? 'Informações do profissional' : 'Informações do contratante'} onClose={onClose}>
      <View style={info.person}>
        <Avatar name={person.full_name} uri={person.avatar_url} size={50} />
        <View style={{ gap: 5 }}>
          <Text style={styles.modalPersonName}>{person.full_name}</Text>
          <View style={[info.badge, isProvider && { backgroundColor: C.amberLight }]}>
            <View style={[info.badgeDot, isProvider && { backgroundColor: '#D97706' }]} />
            <Text style={[info.badgeText, isProvider && { color: '#B45309' }]}>{isProvider ? 'PRESTADOR' : 'CONTRATANTE'}</Text>
          </View>
        </View>
      </View>
      <Text style={styles.modalEyebrow}>INFORMAÇÕES COMPARTILHADAS</Text>
      <View style={info.group}>
        {rows.map((row, index) => (
          <View key={row.label} style={[info.row, index > 0 && info.rowBorder]}>
            <AppIcon name={row.icon} color={row.color} size={19} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={styles.infoLabel}>{row.label}</Text>
              <Text style={styles.infoValue}>{row.value}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={info.notice}>
        <AppIcon name="checkmark-circle" color={C.teal} size={17} />
        <Text style={info.noticeText}>
          <Text style={{ fontWeight: '800' }}>Só aparecem dados compartilhados</Text> pelo {isProvider ? 'profissional' : 'contratante'}.
        </Text>
      </View>
      <PrimaryButton label="Fechar" onPress={onClose} />
    </Sheet>
  );
}

const info = StyleSheet.create({
  person: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: C.tealLight, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  badgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.teal },
  badgeText: { color: C.tealDark, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  group: { borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.tealLight, borderRadius: 12, padding: 12 },
  noticeText: { flex: 1, color: C.tealDark, fontSize: 11, lineHeight: 16 },
});
