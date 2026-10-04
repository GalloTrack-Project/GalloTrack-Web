import '@testing-library/jest-dom/vitest';

// Component tests may transitively import modules that create the Supabase
// client at module scope. Provide harmless defaults so import never throws;
// any call made from a test is intercepted by per-test mocks or fails soft.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://unit-test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'unit-test-anon-key';
