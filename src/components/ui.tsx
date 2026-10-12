import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { initialsOf } from '@/lib/format';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];

const logoHorizontal = require('../../assets/brand/logo-horizontal.png');

export function AppIcon({ name, color = C.secondary, size = 20 }: { name: IconName; color?: string; size?: number }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Logo EASY WORK. `login`: grande e centralizada; `header`: pequena, no topo das telas. */
export function Brand({ variant = 'header', badge }: { variant?: 'login' | 'header'; badge?: string }) {
  if (variant === 'login') {
    return (
      <View style={ui.brandLogin}>
        <Image source={logoHorizontal} style={ui.brandLoginImage} resizeMode="contain" accessibilityLabel="EASY WORK" />
        {badge ? <Text style={ui.brandBadge} numberOfLines={1}>{badge}</Text> : null}
      </View>
    );
  }
  return <Image source={logoHorizontal} style={ui.brandHeaderImage} resizeMode="contain" accessibilityLabel="EASY WORK" />;
}

const AVATAR_TONES = [
  { background: C.tealLight, border: '#99F6E4', text: C.tealDark },
  { background: '#EEF2F7', border: C.border, text: '#475569' },
  { background: C.amberLight, border: '#FDE68A', text: '#B45309' },
  { background: '#FCE7F3', border: '#FBCFE8', text: '#BE185D' },
  { background: '#DBEAFE', border: '#BFDBFE', text: '#1D4ED8' },
];

/** Cor estável por pessoa (como nos avatares MC / RL / AC / LN do layout). */
export function avatarTone(seed: string) {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export function Avatar({
  name,
  size = 46,
  uri,
  shape = 'circle',
  placeholder = 'initials',
  tone,
}: {
  name: string;
  size?: number;
  uri?: string | null;
  shape?: 'circle' | 'rounded';
  placeholder?: 'initials' | 'person';
  tone?: (typeof AVATAR_TONES)[number];
}) {
  const colors = tone ?? (placeholder === 'person' ? AVATAR_TONES[0] : avatarTone(name));
  const radius = shape === 'circle' ? size / 2 : size * 0.22;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        overflow: 'hidden',
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: uri ? 0 : 1,
        borderColor: colors.border,
      }}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      ) : placeholder === 'person' ? (
        <AppIcon name="person" color={C.teal} size={size * 0.5} />
      ) : (
        <Text style={{ color: colors.text, fontSize: size * 0.29, fontWeight: '800' }}>{initialsOf(name) || '?'}</Text>
      )}
    </View>
  );
}

export function SectionHeader({ title, action, onPress }: { title: string; action?: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action ? (
        <TouchableOpacity onPress={onPress}>
          <Text style={styles.actionText}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Selo com bolinha, como "CAIXA DE ENTRADA" e "DEMONSTRAÇÃO DO PRESTADOR". */
export function DotPill({ label, tone = 'teal', style }: { label: string; tone?: 'teal' | 'gray'; style?: StyleProp<ViewStyle> }) {
  const teal = tone === 'teal';
  return (
    <View style={[ui.dotPill, { backgroundColor: teal ? C.tealLight : '#F1F5F9' }, style]}>
      <View style={[ui.dotPillDot, { backgroundColor: teal ? C.teal : C.muted }]} />
      <Text style={[ui.dotPillText, { color: teal ? C.tealDark : C.secondary }]}>{label}</Text>
    </View>
  );
}

/** Campo das telas de acesso (medidas do layout de Login no Figma). */
export function AuthField({
  label,
  right,
  error,
  ...input
}: TextInputProps & { label: string; right?: React.ReactNode; error?: string | null }) {
  return (
    <View style={ui.authFieldGroup}>
      <Text style={ui.authLabel}>{label}</Text>
      <View style={[ui.authInputWrap, error ? ui.authInputError : null]}>
        <TextInput
          placeholderTextColor={C.muted}
          autoCorrect={false}
          style={ui.authInput}
          {...input}
        />
        {right}
      </View>
      {error ? <Text style={ui.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity style={styles.inputIconButton} onPress={onToggle} accessibilityLabel={visible ? 'Ocultar senha' : 'Mostrar senha'}>
      <AppIcon name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} />
    </TouchableOpacity>
  );
}

export function Checkbox({ checked, label, onToggle }: { checked: boolean; label: React.ReactNode; onToggle: () => void }) {
  return (
    <TouchableOpacity style={ui.checkboxRow} onPress={onToggle} accessibilityRole="checkbox" accessibilityState={{ checked }}>
      <View style={[ui.checkbox, checked && ui.checkboxChecked]}>{checked ? <AppIcon name="checkmark" color={C.white} size={14} /> : null}</View>
      {typeof label === 'string' ? <Text style={ui.checkboxLabel}>{label}</Text> : label}
    </TouchableOpacity>
  );
}

export function PrimaryButton({
  label,
  onPress,
  loading,
  disabled,
  icon,
  tone = 'navy',
  style,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  tone?: 'navy' | 'teal';
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <TouchableOpacity
      style={[ui.primaryButton, tone === 'teal' && { backgroundColor: C.teal }, (disabled || loading) && { opacity: 0.6 }, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading ? <ActivityIndicator color={C.white} /> : (
        <>
          {icon ? <AppIcon name={icon} color={C.white} size={18} /> : null}
          <Text style={ui.primaryButtonText}>{label}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function LoadingView({ label }: { label?: string }) {
  return (
    <View style={ui.centerFill}>
      <ActivityIndicator color={C.teal} size="large" />
      {label ? <Text style={styles.emptyText}>{label}</Text> : null}
    </View>
  );
}

export function EmptyState({ icon, text, action, onAction }: { icon: IconName; text: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.emptySearch}>
      <AppIcon name={icon} size={22} color={C.muted} />
      <Text style={styles.emptyText}>{text}</Text>
      {action ? (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.actionText}>{action}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={ui.errorBanner}>
      <AppIcon name="alert-circle-outline" color={C.red} size={17} />
      <Text style={ui.errorBannerText}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity onPress={onRetry}>
          <Text style={[styles.actionText, { color: C.red }]}>Tentar de novo</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

/** Aviso do modo demonstração (some quando o Supabase estiver configurado). */
export function DemoNotice({ text }: { text: string }) {
  return (
    <View style={styles.demoNotice}>
      <AppIcon name="information-circle-outline" color={C.tealDark} size={15} />
      <Text style={styles.demoNoticeText}>{text}</Text>
    </View>
  );
}

export const ui = StyleSheet.create({
  brandLogin: { alignSelf: 'center', width: 282, height: 128, maxWidth: '100%' },
  brandLoginImage: { width: '100%', height: '100%' },
  brandBadge: { position: 'absolute', top: 103, left: 126, width: 100, textAlign: 'center', color: C.navy, fontSize: 10, fontWeight: '800', letterSpacing: 1.6 },
  brandHeaderImage: { width: 150, height: 68, marginVertical: -6, marginLeft: -9 },
  dotPill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5 },
  dotPillDot: { width: 5, height: 5, borderRadius: 3 },
  dotPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.6 },
  authFieldGroup: { gap: 8 },
  authLabel: { color: C.text, fontSize: 14, fontWeight: '600' },
  authInputWrap: { minHeight: 52, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.white, paddingHorizontal: 16 },
  authInputError: { borderColor: '#FCA5A5' },
  authInput: { flex: 1, color: C.text, fontSize: 15, paddingVertical: 14 },
  fieldError: { color: C.red, fontSize: 12 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 1.5, borderColor: '#CBD5E1', borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  checkboxChecked: { backgroundColor: C.navy, borderColor: C.navy },
  checkboxLabel: { fontSize: 14, color: C.text },
  primaryButton: { minHeight: 52, backgroundColor: C.navy, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 9, paddingHorizontal: 16 },
  primaryButtonText: { color: C.white, fontWeight: '700', fontSize: 16 },
  centerFill: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: C.bg },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.redLight, borderWidth: 1, borderColor: '#FECACA', borderRadius: 12, padding: 12 },
  errorBannerText: { flex: 1, color: '#991B1B', fontSize: 12, lineHeight: 17 },
});
