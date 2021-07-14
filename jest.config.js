module.exports = {
  testMatch: [
    "**/tests/**/*.spec.js"
  ],
  transform: {
    "^.+\\.jsx?$": "babel-jest"
  },
  verbose: true,
  testEnvironment: "jsdom"
}