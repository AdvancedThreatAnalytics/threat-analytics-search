import globals from "globals";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import svelte from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";

export default [
  // Base JS recommended rules
  js.configs.recommended,

  // Global environment settings (replaces "env" in eslintrc)
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
        ...globals.webextensions,
      },
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: "module",
      },
    },
  },

  // Svelte files
  {
    files: ["**/*.svelte"],
    plugins: { svelte },
    processor: svelte.processors[".svelte"],
    languageOptions: {
      parser: svelteParser,
    },
    rules: {
      ...svelte.configs.recommended.rules,
    },
  },

  // Prettier must be last — disables formatting rules that conflict with prettier
  prettier,
];
