import * as ImagePicker from 'expo-image-picker';

import { notify } from './format';

/** Abre a galeria para escolher uma foto. Devolve `null` se a pessoa cancelar ou negar o acesso. */
export async function pickImage(aspect?: [number, number]) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    notify('Permissão necessária', 'Permita o acesso às fotos nas configurações do celular para escolher uma imagem.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Boolean(aspect),
    aspect,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType ?? 'image/jpeg' };
}
