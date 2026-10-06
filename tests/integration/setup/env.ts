// Los servicios usan `db` de src/server/db.ts, que lee DATABASE_URL: en los tests apunta a la base de tests.
import { testDatabaseUrl } from "./global";

process.env.DATABASE_URL = testDatabaseUrl();
