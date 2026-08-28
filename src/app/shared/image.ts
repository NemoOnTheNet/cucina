/**
 * Compression d'image avant envoi.
 *
 * Un téléphone produit des photos de 4 à 8 Mo dont on n'a aucun besoin : une
 * photo de recette s'affiche sur 400 px de large. On redimensionne côté client.
 */
const MAX_WIDTH = 1200;
const QUALITY = 0.82;

export async function compressImage(file: Blob, maxWidth = MAX_WIDTH): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return file;
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', QUALITY);
  });
  return blob ?? file;
}
