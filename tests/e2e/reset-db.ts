import { resetE2eDatabase } from "./e2e-database";

resetE2eDatabase().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
