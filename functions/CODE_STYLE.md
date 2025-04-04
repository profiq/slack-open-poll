# Code Style Guide for OpenPoll

This document outlines the code style guidelines for the OpenPoll project. We use ESLint v9 with the new flat configuration format and Prettier to enforce consistent code style across the project.

## ESLint

ESLint is a static code analysis tool that helps identify problematic patterns in JavaScript/TypeScript code. It enforces coding standards and helps catch bugs early. We're using ESLint v9 with the new flat configuration format.

### Running ESLint

To check your code for style issues:

```bash
npm run lint
```

To automatically fix issues that can be fixed:

```bash
npm run lint:fix
```

## Prettier

Prettier is an opinionated code formatter that ensures consistent code style across the project. It integrates with ESLint to provide a seamless experience.

### Running Prettier

To format your code:

```bash
npm run format
```

To check if your code is properly formatted without making changes:

```bash
npm run format:check
```

## Pre-commit Hooks (Recommended)

It's recommended to set up pre-commit hooks using Husky to automatically run linting and formatting before each commit. This ensures that all committed code follows the project's style guidelines.

### Setting up Husky (Optional)

1. Install Husky:

```bash
npm install --save-dev husky lint-staged
```

2. Add the following to your package.json:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,ts}": ["eslint --fix", "prettier --write"]
  }
}
```

## VS Code Integration

For the best development experience, install the ESLint and Prettier extensions for VS Code:

1. [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint)
2. [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

Then, add the following to your VS Code settings.json:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  }
}
```

This will automatically format your code and fix ESLint issues when you save a file.
