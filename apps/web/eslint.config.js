import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    ignores: [
      "node_modules/",
      ".output/",
      "dist/",
      "coverage/",
      "playwright-report/",
      "src/routeTree.gen.ts",
    ],
  },
);
