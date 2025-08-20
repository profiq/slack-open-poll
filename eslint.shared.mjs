// Shared ESLint config fragments for the monorepo
// Keep this minimal to avoid conflicts; app-level configs can extend further
import { globalIgnores } from 'eslint/config';

export default [
  // Ignore common build output across workspaces
  globalIgnores(['**/node_modules', '**/dist', 'functions/lib']),
];

