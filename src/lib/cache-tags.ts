/**
 * Etiquetas de caché del contenido público. Las páginas que muestran notas usan
 * `cacheTag(ARTICLES_TAG)` y cada nota además `cacheTag(articleTag(id))`; los cambios
 * de estado las invalidan. Las secciones de la navegación usan `CATEGORIES_TAG`.
 */
export const ARTICLES_TAG = "articles";
export const CATEGORIES_TAG = "categories";

export function articleTag(id: string): string {
  return `article:${id}`;
}
