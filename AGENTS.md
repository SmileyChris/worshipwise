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
