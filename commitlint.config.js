export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', [
      'feat',     // New feature
      'fix',      // Bug fix
      'refactor', // Code refactor
      'style',    // UI/style changes
      'docs',     // Documentation
      'chore',    // Dependencies, config, build
      'test',     // Tests
      'perf',     // Performance
      'ci',       // CI/CD
      'revert',   // Revert
    ]],
    'subject-case': [0],
    'body-max-line-length': [0],
  },
};
