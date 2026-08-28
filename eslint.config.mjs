import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // SDK vanilla-JS distribuito così com'è a domini di terze parti (Step 9):
    // codice ES5-style intenzionale, fuori dal dominio TS/React del resto dell'app.
    "public/sdk/**",
  ]),
]);

export default eslintConfig;
