# Repository Guidelines

## Project Structure & Module Organization
- `src/`: SvelteKit app code.
  - `src/lib/components/`: UI, auth, songs, analytics (PascalCase `.svelte`).
  - `src/lib/{api,stores,types,utils}/`: PocketBase client, runes stores, TS types, helpers.
  - `src/routes/`: Pages and layouts (kebab-case routes, grouped folders).
- `tests/`: Server-side tests and helpers; co-located component tests live next to components.
- `e2e/`: Playwright specs (runs against `preview`).
- `pocketbase/`: Binary, `pb_migrations/`, and ignored `pb_data/` (database/files).
- `plan/`: Roadmap and technical guides. `static/`: static assets.

## Build, Test, and Development Commands
- `just setup`: Install PocketBase, npm deps, Playwright browsers.
- `just dev` or `npm run dev`: Start SvelteKit (script auto-starts PocketBase if needed).
- `npm run build` / `npm run preview`: Production build and local preview.
- `npm test`: Run Vitest projects then Playwright E2E.
- `npm run test:unit` / `npm run test:e2e`: Unit or E2E only.
- `npm run check` / `npm run lint` / `npm run format`: TS checks, ESLint+Prettier, format.

## Coding Style & Naming Conventions
- Language: TypeScript + Svelte 5 runes; Tailwind for styling.
- Prettier: tabs, single quotes, print width 100, no trailing commas.
- ESLint: Svelte + TS configs (tests are ignored in lint config).
- Naming: `PascalCase.svelte` for components; lowercase for `types`/`utils`; routes in kebab-case.
- Keep component tests near components (e.g., `Button.svelte.test.ts`).

## Testing Guidelines
- Unit/Integration: Vitest. Client tests use jsdom and `vitest-setup-client.ts`.
- E2E: Playwright in `e2e/` with HTML reporter; web server runs `build` + `preview`.
- File patterns: `src/**/*.{test,spec}.{ts,js}` and `src/**/*.svelte.{test,spec}.{ts,js}`; server tests also under `tests/**/*`.
- Target: 80%+ coverage overall; write deterministic tests and use helpers in `tests/helpers/`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat:`, `fix:`, `docs:`, `refactor:`) as in git history.
- PRs: Clear description, linked issue, and screenshots/GIFs for UI changes.
- Quality gates: `npm run lint`, `npm run check`, and `npm test` must pass.
- Scope PRs narrowly; update docs when behavior or APIs change.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit secrets. Use `VITE_` vars for client-side config.
- PocketBase data lives in `pocketbase/pb_data/` (git-ignored); run `just migrate` if schema changes.
- Avoid committing generated artifacts (build outputs, reports).
# Repository Guidelines

## Project Structure & Module Organization
- `src/`: SvelteKit app (routes, components, lib).
- `pocketbase/`: PocketBase server, binary, and `pb_migrations/` scripts.
- `tests/`: Unit/component tests; `e2e/`: Playwright end-to-end tests.
- `static/`: Static assets served as-is.
- `scripts/`: Local helper scripts (e.g., `start-dev.sh`).

## Build, Test, and Development Commands
- Dev app: `npm run dev` (SvelteKit on Vite).
- Dev PocketBase: `npm run pb:start` (serves PB with --dev).
- Run both (example): in two shells, run `npm run pb:start` then `npm run dev`.
- Build: `npm run build` (production build).
- Preview: `npm run preview` (serve built app).
- Tests: `npm test` (runs unit then e2e), `npm run test:unit`, `npm run test:e2e`.
- PocketBase migrations: `npm run pb:migrate` or `just migrate up`.

## Coding Style & Naming Conventions
- TypeScript throughout; Svelte 5 components.
- Formatting: Prettier (`npm run format`), 2-space indent, semicolonless style.
- Linting: ESLint + `eslint-config-prettier` (`npm run lint`, `npm run check`).
- Names: kebab-case for files and routes, PascalCase for Svelte components, camelCase for vars/functions.

## Testing Guidelines
- Unit/component: Vitest + Testing Library (`tests/`); name tests `*.test.ts`.
- E2E: Playwright (`e2e/`); install browsers with `npx playwright install` (done by `just setup`).
- Keep tests hermetic; seed test data via PocketBase migrations or setup hooks.

## Commit & Pull Request Guidelines
- Commits: concise, imperative summary (e.g., "add service approval fields").
- Group related changes; reference files/areas touched.
- PRs: clear description, linked issue, steps to verify, and screenshots or logs when UI/db changes apply.
- Include schema or migration notes whenever `pocketbase/pb_migrations/` changes.

## Security & Configuration Tips
- Never commit secrets. Copy `.env.example` to `.env` locally.
- PocketBase data (`pocketbase/pb_data/`) is local state; exclude from PRs unless explicitly needed.
- Validate access rules in migrations; prefer field-on-left comparisons in PB rules.
