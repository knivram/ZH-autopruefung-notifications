import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";

export default defineConfig([
  // Ignore all dist files (compiled JavaScript)
  { ignores: ["dist/**"] },
  { files: ["src/**/*.{js,mjs,cjs,ts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["src/**/*.{js,mjs,cjs,ts}"], languageOptions: { globals: globals.node } },
  ...tseslint.configs.recommended,
  { 
    files: ["src/**/*.{js,mjs,cjs,ts}"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "prefer-const": "error"
    }
  },
  
  // Markdown files
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },
]);