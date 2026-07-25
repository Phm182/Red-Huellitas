import * as ImageManipulator from 'expo-image-manipulator';

/**
 * Comprime/redimensiona una imagen local antes de subirla (cap ~1600px,
 * JPEG calidad 0.7). Usado por ImagePickerField y MultiImagePickerField
 * para no duplicar esta lógica.
 */
export async function comprimirImagen(uri: string): Promise<string> {
  const result = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1600 } }], {
    compress: 0.7,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return result.uri;
}
