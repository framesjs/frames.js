const { resolve } = require("node:path");

const project = resolve(process.cwd(), "tsconfig.json");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: [
    require.resolve("@vercel/style-guide/eslint/node"),
    require.resolve("@vercel/style-guide/eslint/jest-react"),
    require.resolve("@vercel/style-guide/eslint/react"),
    require.resolve("@vercel/style-guide/eslint/typescript"),
  ],
  settings: {
    "import/resolver": {
      typescript: {
        project,
      },
    },
  },
  ignorePatterns: [
    // Ignore dotfiles
    ".*.js",
    "node_modules/",
    "dist/",
  ],
  overrides: [
    {
      files: ["*.js?(x)", "*.ts?(x)"],
    },
  ],
  rules: {
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/require-await": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unnecessary-condition": "warn",
    "@typescript-eslint/consistent-type-imports": "error",
    "jest/expect-expect": "warn",
    "react/jsx-sort-props": "off",
    "unicorn/filename-case": "off",
    eqeqeq: "off",
    "no-await-in-loop": "off",
    "no-implicit-coercion": "off",
    "import/no-extraneous-dependencies": [
      "error",
      {
        devDependencies: false,
        peerDependencies: true,
      },
    ],
  },
};
