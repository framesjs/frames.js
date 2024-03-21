/** @type {import('jest').Config} */
export default {
  testEnvironment: "node",
  transform: {
    ".*\\.(tsx?|jsx?)$": [
      "@swc/jest",
      {
        jsc: {
          transform: {
            react: {
              runtime: "automatic",
            },
          },
        },
      },
    ],
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx"],
  transformIgnorePatterns: [],
  testPathIgnorePatterns: ["/dist/", "/node_modules/"],
};
