/**
 * Publica a mano las notas programadas vencidas, lo mismo que hace el cron.
 * Uso: npm run jobs:publish-scheduled
 */
import "dotenv/config";
import { publishDueArticles } from "../src/server/jobs/publish-scheduled";

publishDueArticles()
  .then((published) => {
    console.log(
      published.length === 0
        ? "No había notas programadas vencidas."
        : `Publicadas: ${published.map((a) => a.slug).join(", ")}`,
    );
    process.exit(0);
  })
  .catch((error: Error) => {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  });
