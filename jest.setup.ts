// jest.setup.ts
import '@testing-library/jest-dom'

// Provide stub values so modules that validate env vars at import time don't throw in tests.
// Individual test files that import these modules should still mock them with jest.mock().
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key'
