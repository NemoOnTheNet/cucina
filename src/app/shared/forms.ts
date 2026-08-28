/** Lit la valeur d'un champ sans passer par `any` ni par les formulaires Angular. */
export function inputValue(event: Event): string {
  const target = event.target;
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return target.value;
  }
  return '';
}

/** Lit un nombre saisi ; une saisie vide ou invalide vaut `null`, jamais 0. */
export function numberValue(event: Event): number | null {
  const raw = inputValue(event).replace(',', '.').trim();
  if (raw === '') return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function checkedValue(event: Event): boolean {
  const target = event.target;
  return target instanceof HTMLInputElement ? target.checked : false;
}

/** Fichier sélectionné dans un `<input type="file">`. */
export function fileValue(event: Event): File | null {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return null;
  return target.files?.[0] ?? null;
}
