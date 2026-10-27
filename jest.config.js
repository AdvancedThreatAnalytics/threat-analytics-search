module.exports = {
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  verbose: true,
  projects: [
    {
      displayName: "unit",
      testMatch: ["**/tests/unit/**/*.spec.js"],
      testEnvironment: "node"
    },
    {
      displayName: "e2e",
      preset: "jest-puppeteer",
      testMatch: ["**/tests/e2e/**/*.spec.js"]
    }
  ]
}