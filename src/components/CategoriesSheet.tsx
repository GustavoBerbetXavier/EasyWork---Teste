import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CATEGORIES } from '@/lib/categories';
import { C } from '@/theme/colors';
import { styles } from '@/theme/styles';
import { Sheet } from './Sheet';
import { AppIcon } from './ui';

/** Todas as categorias de serviço ("Ver todas" no Início). */
export function CategoriesSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (name: string) => void }) {
  const [query, setQuery] = useState('');
  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    return CATEGORIES.filter((item) => !term || `${item.name} ${item.keywords}`.toLowerCase().includes(term));
  }, [query]);

  return (
    <Sheet visible={visible} title="Todas as categorias" onClose={onClose}>
      <View style={styles.searchBar}>
        <AppIcon name="search-outline" color={C.muted} size={18} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Buscar categoria" placeholderTextColor={C.muted} style={styles.searchInput} autoCorrect={false} />
      </View>
      <View style={grid.wrap}>
        {list.map((item) => (
          <TouchableOpacity key={item.name} style={grid.card} onPress={() => onSelect(item.name)} accessibilityLabel={item.name}>
            <View style={[grid.icon, { backgroundColor: item.background }]}>
              <AppIcon name={item.icon} color={item.color} size={20} />
            </View>
            <Text style={grid.label} numberOfLines={2}>{item.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {list.length === 0 ? <Text style={styles.emptyText}>Nenhuma categoria encontrada.</Text> : null}
    </Sheet>
  );
}

const grid = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  card: { width: '31.6%', alignItems: 'center', gap: 6, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 4 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { color: '#334155', fontSize: 10, fontWeight: '700', textAlign: 'center' },
});
