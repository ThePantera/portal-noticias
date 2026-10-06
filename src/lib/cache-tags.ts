/**
 * Etiquetas de caché del contenido público. Las páginas que muestran notas usan
 * `cacheTag(ARTICLES_TAG)` y cada nota además `cacheTag(articleTag(id))`; los cambios
 * de estado las invalidan.
 */
export const ARTICLES_TAG = "articles";

export function articleTag(id: string): string {
  return `article:${id}`;
}
