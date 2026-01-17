# Husky & lint-staged Setup

This project uses Husky for Git hooks and `lint-staged` to run checks on staged TypeScript files.

Quick setup (recommended):

```powershell
npm ci
npm run prepare
```

What this does:
- Installs dev dependencies (including `husky` and `lint-staged`).
- Runs `husky install` via the `prepare` script to set up `.husky/_` helper files.

Verify or install manually:

```powershell
npx husky install
npx husky add .husky/pre-commit "npx --no-install lint-staged || true && npm test --if-present"
```

Notes:
- The pre-commit hook runs `lint-staged` (which runs a TypeScript `--noEmit` check on staged `.ts`/`.tsx` files), then `npm test` if a test script exists.
- If you prefer additional linters (ESLint, Prettier), add them to `devDependencies` and extend the `lint-staged` config in `package.json`.
