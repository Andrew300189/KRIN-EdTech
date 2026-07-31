const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "./" });

module.exports = createJestConfig({
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/unit/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
});
