module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'services/**/*.js',
    'middleware/**/*.js',
    'models/**/*.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  // Don't transform ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(resend)/)'
  ]
};
