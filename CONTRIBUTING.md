# Set up for local development

First, ensure that the following are installed globally on your machine:

- Node.js 18.7+
- Yarn

1. In the root directory, run `yarn install`
2. Run all packages by running `yarn dev` from the root folder.
3. To run any individual package from it's directory, run `yarn dev`, but you may need to rebuild any other packages

# Changesets

All PRs with meaningful changes should have a changeset which is a short description of the modifications being made to each package. Changesets are automatically converted into a changelog when the repo manager runs a release process.

## Add a new changeset

yarn changeset

## Create new versions of packages

yarn changeset version

## Publish all changed packages to npm

yarn changeset publish
git push --follow-tags origin main
