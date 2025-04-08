import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import google from 'eslint-config-google';
import eslintConfigPrettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  google,
  eslintConfigPrettier,
  {
    files: ['**/*.ts'],
  },
  {
    ignores: ['lib'],
  },
  {
    rules: {
      // Needs to be turned off due to Google rules not ready for ESLint v9
      'require-jsdoc': 'off',
      'valid-jsdoc': 'off',
    },
  }
);
