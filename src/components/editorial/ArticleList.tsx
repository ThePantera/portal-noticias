import type { ArticleCardData } from "@/types/public";
import { ArticleCard } from "./ArticleCard";

/** Lista de notas en columnas, para secciones, etiquetas y resultados de búsqueda. */
export function ArticleList({
  articles,
  showCategory = true,
}: {
  articles: ArticleCardData[];
  showCategory?: boolean;
}) {
  return (
    <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleCard article={article} variant="list" headingLevel="h2" showCategory={showCategory} />
        </li>
      ))}
    </ul>
  );
}
