// This configuration only applies to the package manager root.
/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["@framesjs/eslint-config/library.js"],
  parserOptions: {
    project: true,
  },
};
