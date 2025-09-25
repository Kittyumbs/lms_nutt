import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      ".vercel/**",
      "**/*.d.ts",
    ],
  },

  // JS base
  js.configs.recommended,

  // TS type-aware trên src
  ...tseslint.configs.recommendedTypeChecked,
  // hoặc mạnh hơn:
  // ...tseslint.configs.strictTypeChecked,

  // React
  {
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
      import: importPlugin,
    },
    languageOptions: {
      parserOptions: {
        // Bật type-aware: dùng tsconfig chính của dự án
        project: ["./tsconfig.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // React
      "react/jsx-uses-react": "off",
      "react/react-in-jsx-scope": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // A11y cơ bản
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/no-autofocus": "off",

      // Import hygiene
      "import/order": ["warn", {
        "groups": ["builtin", "external", "internal", "parent", "sibling", "index", "object", "type"],
        "newlines-between": "always",
        "alphabetize": { "order": "asc", "caseInsensitive": true }
      }],
      "import/no-default-export": "off",

      // TS strictness vừa phải
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": ["error", { "checksVoidReturn": { "attributes": false } }],
      "@typescript-eslint/consistent-type-imports": ["warn", { "prefer": "type-imports" }],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/require-await": "off",
    },
    settings: {
      react: { version: "detect" },
      // import resolver cho TS (nếu dùng path alias)
      // "import/resolver": { typescript: { project: "./tsconfig.json" } }
    },
  },
];
