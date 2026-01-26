# Contributing to frames.js

Thank you for your interest in contributing to frames.js! This guide will help you get started.

## Prerequisites

Ensure that the following are installed globally on your machine:

- Node.js 18.7+
- Yarn (1.22.x)

## Set up for local development

1. Clone the repository:
   ```bash
   git clone https://github.com/framesjs/frames.js.git
   cd frames.js
   ```

2. Install dependencies:
   ```bash
   yarn install
   ```

3. Run all packages in development mode:
   ```bash
   yarn dev
   ```

4. To run any individual package from its directory:
   ```bash
   cd packages/<package-name>
   yarn dev
   ```
   Note: You may need to rebuild other packages first.

## Running Tests

Run the full test suite:
```bash
yarn test:ci
```

Run tests in watch mode (for development):
```bash
yarn test
```

## Code Style

- We use Prettier for code formatting. Run `yarn format` to format your code.
- Follow TypeScript best practices and ensure your code passes linting with `yarn lint`.
- Add JSDoc comments to public functions and classes.

## Changesets

All PRs with meaningful changes should have a changeset which is a short description of the modifications being made to each package. Changesets are automatically converted into a changelog when the repo manager runs a release process.

### Add a new changeset

```bash
yarn changeset
```

### Create new versions of packages

```bash
yarn changeset version
```

### Publish all changed packages to npm

```bash
yarn changeset publish
git push --follow-tags origin main
```

## Pull Request Checklist

Before submitting your PR, please ensure:

- [ ] Code follows the project's coding standards
- [ ] All tests pass (`yarn test:ci`)
- [ ] Linting passes (`yarn lint`)
- [ ] You've added a changeset if applicable
- [ ] You've added/updated tests for your changes
- [ ] You've updated documentation if needed
- [ ] Your commit messages follow conventional commits format

## Troubleshooting

### TypeScript Config Issues

If you encounter TypeScript configuration errors, try:
```bash
yarn build:ci
```

This will build all packages and resolve type dependencies.

### Dependency Issues

If packages aren't resolving correctly:
```bash
rm -rf node_modules
yarn install
```

## Need Help?

- Join the [/frames-dev](https://warpcast.com/frames-dev) channel on Farcaster
- Check existing issues on GitHub
- Read the [documentation](https://framesjs.org)
