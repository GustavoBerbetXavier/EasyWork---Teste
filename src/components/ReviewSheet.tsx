import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { saveReview } from '@/lib/api';
import { notify } from '@/lib/format';
import { C } from '@/theme/colors';
import { FormField } from './ServiceForm';
import { Sheet } from './Sheet';
import { AppIcon, PrimaryButton } from './ui';

const LABELS = ['', 'Ruim', 'Regular', 'Bom', 'Muito bom', 'Excelente'];

type ReviewSheetProps = {
  visible: boolean;
  providerId: string;
  providerName: string;
  clientId: string;
  onClose: () => void;
  onSaved?: () => void;
};

/** Contratante avalia um profissional (1 a 5 estrelas + comentário). */
export function ReviewSheet(props: ReviewSheetProps) {
  return (
    <Sheet visible={props.visible} title={`Avaliar ${props.providerName}`} onClose={props.onClose}>
      {/* O formulário só existe com a janela aberta: cada abertura começa em branco. */}
      {props.visible ? <ReviewForm {...props} /> : null}
    </Sheet>
  );
}

function ReviewForm({ providerId, clientId, onClose, onSaved }: ReviewSheetProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!rating) {
      setError('Toque nas estrelas para dar sua nota.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await saveReview(providerId, clientId, rating, comment);
      onClose();
      onSaved?.();
      notify('Obrigado!', 'Sua avaliação foi enviada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a avaliação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={review.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <TouchableOpacity key={value} onPress={() => setRating(value)} accessibilityLabel={`${value} estrela${value > 1 ? 's' : ''}`}>
            <AppIcon name={value <= rating ? 'star' : 'star-outline'} color={value <= rating ? C.amber : C.muted} size={36} />
          </TouchableOpacity>
        ))}
      </View>
      <Text style={review.label}>{rating ? LABELS[rating] : 'Como foi o serviço?'}</Text>
      <FormField label="Comentário (opcional)" value={comment} onChangeText={setComment} placeholder="Conte como foi o atendimento." multiline maxLength={500} />
      {error ? <Text style={review.error}>{error}</Text> : null}
      <PrimaryButton label="Enviar avaliação" onPress={submit} loading={loading} />
    </>
  );
}

const review = StyleSheet.create({
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  label: { textAlign: 'center', color: C.navy, fontSize: 14, fontWeight: '800' },
  error: { color: C.red, fontSize: 12 },
});
