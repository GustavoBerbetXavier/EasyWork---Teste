import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CITIES } from '@/lib/cities';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { Sheet } from './Sheet';
import { AppIcon } from './ui';

/** Seletor de cidade (layout "dropdown-cidades": busca + cidade atual). */
export function CityPicker({
  visible,
  current,
  onSelect,
  onClose,
}: {
  visible: boolean;
  current: string;
  onSelect: (city: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return CITIES.filter((city) => city !== current && (!term || city.toLowerCase().includes(term)));
  }, [query, current]);
  const typed = query.trim();
  const canUseTyped = typed.length >= 3 && !CITIES.some((city) => city.toLowerCase() === typed.toLowerCase());

  const choose = (city: string) => {
    setQuery('');
    onSelect(city);
  };

  return (
    <Sheet visible={visible} title="Sua localização" onClose={onClose}>
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" color={C.muted} size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Pesquisar cidades"
          placeholderTextColor={C.muted}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
      {current ? (
        <TouchableOpacity style={[city.row, city.current]} onPress={() => choose(current)}>
          <AppIcon name="location" color={C.teal} size={17} />
          <Text style={[city.name, { color: C.tealDark }]}>{current}</Text>
          <Text style={city.badge}>Atual</Text>
        </TouchableOpacity>
      ) : null}
      {canUseTyped ? (
        <TouchableOpacity style={city.row} onPress={() => choose(typed)}>
          <AppIcon name="add-circle-outline" color={C.teal} size={17} />
          <Text style={city.name}>Usar “{typed}”</Text>
        </TouchableOpacity>
      ) : null}
      {results.map((item) => (
        <TouchableOpacity key={item} style={city.row} onPress={() => choose(item)}>
          <AppIcon name="location-outline" color={C.secondary} size={17} />
          <Text style={city.name}>{item}</Text>
        </TouchableOpacity>
      ))}
      {results.length === 0 && !canUseTyped ? <Text style={styles.emptyText}>Nenhuma cidade encontrada.</Text> : null}
    </Sheet>
  );
}

const city = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  current: { backgroundColor: C.tealLight, borderColor: '#99F6E4' },
  name: { flex: 1, color: C.navy, fontSize: 14, fontWeight: '700' },
  badge: { color: C.tealDark, fontSize: 11, fontWeight: '800' },
});
