/**
 * Préparation d'une photo de recette avant envoi.
 *
 * Un téléphone produit des photos de 4 à 8 Mo dont on n'a aucun besoin : une
 * photo de recette s'affiche sur 400 px de large. On redimensionne côté client.
 */
const MAX_WIDTH = 1200;
const QUALITY = 0.82;

/**
 * Le navigateur n'a pas su lire ce fichier.
 *
 * Cas réel : les HEIC de l'iPhone, que Chrome et Firefox ne décodent pas. On ne
 * peut ni les redimensionner ni les afficher plus tard — les envoyer tels quels
 * remplirait le stockage d'images que personne ne verra jamais. Mieux vaut le
 * dire tout de suite, au moment de choisir la photo.
 */
export class UnreadableImageError extends Error {
  constructor() {
    super("Ce format d'image n'est pas lisible par ton navigateur. Essaie un JPEG ou un PNG.");
    this.name = 'UnreadableImageError';
  }
}

/**
 * Redimensionne et réencode en JPEG. Lève `UnreadableImageError` si le fichier
 * ne peut pas être décodé.
 *
 * `imageOrientation: 'from-image'` n'est pas un détail : sans lui, une partie des
 * navigateurs ignore l'EXIF, et une photo prise en portrait part couchée. Le
 * `<img>` de la prévisualisation, lui, respecte l'EXIF — on affichait donc une
 * image droite tout en enregistrant la même image tournée.
 */
export async function prepareRecipePhoto(file: Blob, maxWidth = MAX_WIDTH): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new UnreadableImageError();
  }

  const ratio = Math.min(1, maxWidth / bitmap.width);
  const width = Math.round(bitmap.width * ratio);
  const height = Math.round(bitmap.height * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new UnreadableImageError();
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, 'image/jpeg', QUALITY);
  });
  if (!blob) throw new UnreadableImageError();
  return blob;
}
