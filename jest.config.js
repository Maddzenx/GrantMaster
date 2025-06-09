const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!uuid|@supabase|@paralleldrive|@noble)/', // allow ESM for uuid, @supabase, @paralleldrive, @noble
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/cypress/', '/mocha-tests/'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  moduleNameMapper: {
    '^app/lib/supabase$': '<rootDir>/app/lib/supabase.js',
    '^app/lib/supabase.js$': '<rootDir>/app/lib/supabase.js',
    '^app/(.*)$': '<rootDir>/app/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^lib/supabaseClient$': '<rootDir>/lib/supabaseClient',
    '^\.\./\.\./lib/supabaseClient$': '<rootDir>/lib/supabaseClient',
  },
}

module.exports = createJestConfig(customJestConfig)