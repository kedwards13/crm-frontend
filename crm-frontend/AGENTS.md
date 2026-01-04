# Repository Guidelines

## Project Structure & Module Organization
- `src/` contains runtime code; domain components live in `src/components/` (Auth, Leads, Marketing, Settings, etc.).
- API wrappers are in `src/api/` and share the axios instance in `src/apiClient.js` (base URL from `REACT_APP_API_URL`, default `https://os.abon.ai/api`).
- Shared logic sits in `src/helpers/`, `src/hooks/`, `src/utils/`, and `src/constants/`; design tokens and global styles live in `src/theme/` and `src/styles/`.
- Assets belong in `src/assets/`; `public/` holds static files; `build/` is generated output—never edit directly.
- Tests sit beside code as `*.test.js` (see `src/App.test.js`, `src/setupTests.js` for setup).

## Build, Test, and Development Commands
- `npm install` installs dependencies (use Node 18+).
- `npm start` runs the CRA dev server on `localhost:3000` with hot reload.
- `npm test` launches Jest + React Testing Library in watch mode; add `CI=true` for single-pass runs.
- `npm run build` creates the production bundle in `build/`.
- `npm run eject` copies CRA config—avoid unless the team agrees it is necessary.

## Coding Style & Naming Conventions
- Prefer functional React components; components/contexts use PascalCase (`CustomersPage.js`), hooks use `useCamelCase`.
- Match existing style: 2-space indentation, semicolons, and single quotes.
- Keep styling in `src/styles/` or Tailwind utilities per `tailwind.config.js`; collocate feature-specific assets and styles.
- Route API traffic through `src/apiClient.js` to inherit auth and tenant headers; avoid ad-hoc `fetch` calls.
- New environment variables must start with `REACT_APP_`; note defaults and usage in PRs.

## Testing Guidelines
- Add `*.test.js` next to the module; prefer Testing Library queries that reflect user behavior and minimize mocking.
- Deterministic run: `CI=true npm test -- --watch=false`.
- Cover auth flows, routing guards, and API adapters; include fixtures for tenant/token state where needed.

## Commit & Pull Request Guidelines
- Commit messages should be concise, present-tense summaries; a `feat|fix|chore` prefix is welcome when it clarifies intent.
- PRs should describe scope, link tickets, list test commands executed, and include screenshots/GIFs for UI changes.
- Call out config/env changes (e.g., new `REACT_APP_` values) and any rollout or migration steps.
