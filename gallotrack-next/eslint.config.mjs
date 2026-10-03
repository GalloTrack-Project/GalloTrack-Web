import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import jsxA11y from 'eslint-plugin-jsx-a11y';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
  {
    rules: {
      // Gate 5 (Std §08): the full jsx-a11y recommended rule set as real tooling.
      // eslint-config-next already registers the plugin, so only the rules are
      // merged here — adding its flat config would re-register and throw.
      ...jsxA11y.flatConfigs.recommended.rules,
      // The default search depth of 2 cannot see a label whose copy sits at
      // label > div > span > text, which is exactly the toggle-row pattern.
      // Raising it only widens the *text* search; the association check
      // (htmlFor must be present) stays strict.
      'jsx-a11y/label-has-associated-control': ['error', { assert: 'either', depth: 4 }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
]);

export default eslintConfig;
