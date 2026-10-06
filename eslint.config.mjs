import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Reglas de capas (ADR 0002): lib/ es puro y los componentes no tocan el servidor.
  {
    files: ["src/lib/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/server/*", "**/server/*", "@/generated/*"],
              message:
                "lib/ y components/ no pueden importar código de servidor. Pasá los datos por props desde la página.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "src/generated/**", "coverage/**"]),
]);

export default eslintConfig;
