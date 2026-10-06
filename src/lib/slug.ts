const MAX_SLUG_LENGTH = 80;

/**
 * Convierte un título en un slug para URL:
 * "Argentina anuncia nuevas medidas económicas" → "argentina-anuncia-nuevas-medidas-economicas".
 * Quita acentos, pasa a minúsculas, reemplaza todo lo que no sea [a-z0-9] por guiones
 * y corta en el último guion antes de 80 caracteres para no partir palabras.
 */
export function slugify(input: string): string {
  const base = input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ñ/gi, "n")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (base.length <= MAX_SLUG_LENGTH) return base;
  const cut = base.slice(0, MAX_SLUG_LENGTH);
  const lastDash = cut.lastIndexOf("-");
  return (lastDash > 0 ? cut.slice(0, lastDash) : cut).replace(/-+$/g, "");
}

/**
 * Devuelve un slug libre: `base`, o `base-2`, `base-3`… según `isTaken`.
 * `isTaken` consulta la base (artículos e historial de slugs) en la capa de servicios.
 */
export async function uniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const root = base || "nota";
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const suffix = `-${n}`;
    const candidate = `${root.slice(0, MAX_SLUG_LENGTH - suffix.length).replace(/-+$/g, "")}${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`No se encontró un slug libre para "${root}"`);
}
