import React, { useState } from 'react';
import { StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { deleteService, saveService, type ServiceInput } from '@/lib/api';
import { confirmAction } from '@/lib/format';
import type { Service } from '@/lib/types';
import { C } from '@/theme/colors';
import { Sheet } from './Sheet';
import { PrimaryButton } from './ui';

const EMPTY: ServiceInput = { title: '', category: '', subcategory: 'Residencial', description: '', price_label: 'sob consulta', active: true };

type ServiceFormProps = {
  visible: boolean;
  userId: string;
  service: Service | null;
  defaultCategory: string;
  onClose: () => void;
  onSaved: () => void;
};

/** Formulário para cadastrar ou editar um serviço do profissional. */
export function ServiceForm(props: ServiceFormProps) {
  return (
    <Sheet visible={props.visible} title={props.service ? 'Editar serviço' : 'Adicionar serviço'} onClose={props.onClose}>
      {/* Montado só com a janela aberta: cada abertura começa com os dados certos. */}
      {props.visible ? <ServiceFormBody {...props} /> : null}
    </Sheet>
  );
}

function ServiceFormBody({ userId, service, defaultCategory, onSaved }: ServiceFormProps) {
  const [form, setForm] = useState<ServiceInput>(() => (service ? { ...service } : { ...EMPTY, category: defaultCategory }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = <K extends keyof ServiceInput>(key: K, value: ServiceInput[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await saveService(userId, form);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o serviço.');
    } finally {
      setLoading(false);
    }
  };

  const remove = () => {
    if (!service) return;
    confirmAction('Excluir serviço', `Deseja excluir “${service.title}” do seu perfil?`, 'Excluir', async () => {
      try {
        await deleteService(service.id);
        onSaved();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Não foi possível excluir.');
      }
    }, true);
  };

  return (
    <>
      <FormField label="Nome do serviço" value={form.title} onChangeText={(value) => set('title', value)} placeholder="Ex.: Instalação de torneiras" maxLength={80} />
      <View style={form_.row}>
        <View style={{ flex: 1 }}>
          <FormField label="Área" value={form.category} onChangeText={(value) => set('category', value)} placeholder="Ex.: Encanamento" maxLength={40} />
        </View>
        <View style={{ flex: 1 }}>
          <FormField label="Tipo" value={form.subcategory} onChangeText={(value) => set('subcategory', value)} placeholder="Ex.: Residencial" maxLength={40} />
        </View>
      </View>
      <FormField
        label="Descrição"
        value={form.description}
        onChangeText={(value) => set('description', value)}
        placeholder="Conte o que está incluso no serviço."
        multiline
        maxLength={500}
      />
      <FormField label="Valor" value={form.price_label} onChangeText={(value) => set('price_label', value)} placeholder="Ex.: sob consulta, a partir de R$ 80" maxLength={40} />
      <View style={form_.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={form_.label}>Serviço ativo</Text>
          <Text style={form_.hint}>Serviços pausados não aparecem para os clientes.</Text>
        </View>
        <Switch value={form.active} onValueChange={(value) => set('active', value)} trackColor={{ true: C.teal, false: C.border }} thumbColor={C.white} />
      </View>
      {error ? <Text style={form_.error}>{error}</Text> : null}
      <PrimaryButton label="Salvar serviço" onPress={submit} loading={loading} tone="teal" icon="checkmark" />
      {service ? (
        <TouchableOpacity style={form_.delete} onPress={remove}>
          <Text style={form_.deleteText}>Excluir serviço</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

export function FormField({
  label,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={form_.group}>
      <Text style={form_.label}>{label}</Text>
      <TextInput
        placeholderTextColor={C.muted}
        style={[form_.input, multiline && form_.multiline]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

export const form_ = StyleSheet.create({
  group: { gap: 6 },
  row: { flexDirection: 'row', gap: 10 },
  label: { color: C.text, fontSize: 12, fontWeight: '700' },
  hint: { color: C.secondary, fontSize: 11, marginTop: 2 },
  input: { minHeight: 46, borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text },
  multiline: { minHeight: 90 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  error: { color: C.red, fontSize: 12 },
  delete: { alignItems: 'center', paddingVertical: 10 },
  deleteText: { color: C.red, fontSize: 13, fontWeight: '800' },
});
