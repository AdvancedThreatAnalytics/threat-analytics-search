module.exports = {
  preset: "jest-puppeteer",
  testMatch: [
    "**/tests/**/*.spec.js"
  ],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  verbose: true,
  testEnvironment: "node"
}