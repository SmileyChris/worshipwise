# CLAUDE.md

## Project Overview

WorshipWise is a sophisticated worship song tracking system built with SvelteKit 5 + PocketBase. Single-server deployment where PocketBase serves both API and static frontend.

**Status:** Advanced (62% complete - Sprint 7 ~80% done) - Production-ready authentication, song management, real-time collaboration, analytics, AI insights, ratings, labels, notifications, approval workflows

**Stack:** SvelteKit + Static Adapter, Svelte 5 Runes, PocketBase, TypeScript, Tailwind CSS, Vitest, Playwright

**Docs:**

- Current: @plan/DEVELOPMENT_ROADMAP.md, @plan/COMPONENT_GUIDE.md, @plan/TESTING_GUIDE.md
- Setup: @plan/POCKETBASE_SETUP.md, @plan/SVELTE.md, @plan/PB_SVELTE.md

## Development Commands

**Development:** `just dev` | `npm run dev`  
**Building:** `npm run build` | `npm run preview`  
**Quality:** `just check` | `npm run format` | `npm run lint`  
**Testing:** `just test` | `npm run test:unit` | `npm run test:e2e`  
**PocketBase:** `cd pocketbase && ./pocketbase serve --dev`

## Architecture

**Deployment:** PocketBase serves API + static frontend (single origin, no CORS)  
**Collections:** Users, Churches, Church Memberships, Songs, Services, Service Songs, Song Usage, Roles, User Roles, Skills, User Skills, Song Ratings, Labels, Song Labels, Service Comments, Notifications  
**Structure:** `src/lib/{components,stores,api,utils}` + `routes/`

## Key Features

**Church-Centric:** Multi-tenant with `/setup` flow, timezone-aware operations
**Authentication:** PocketBase auth with flexible permission-based system (manage-songs/services/members/church)
**Permission System:** Flexible roles with custom permissions + separate skills for worship positions
**Song Management:** Usage tracking (green/yellow/red), key transposition, file attachments, ratings, labels
**Services:** Templates, duplication, team assignment, approval workflows, real-time comments
**Real-Time:** WebSocket collaboration, optimistic UI updates, notifications
**Analytics:** Usage tracking, heat maps, AI insights, seasonal trending
**AI Integration:** Mistral API for lyrics analysis, theme extraction, smart recommendations
**Integrations:** Elvanto import, public song sharing

## Development Guidelines

**Svelte 5 Runes:** `$state()` for reactive data, `$derived()` for computed, `$effect()` sparingly  
**PocketBase:** Single global instance, disable auto-cancellation, church-based scoping  
**Real-time:** WebSocket subscriptions with proper cleanup in `onDestroy`

**Testing:** Multi-project Vitest setup with dependency injection. 612/612 tests passing (100%), component tests, E2E tests. See `plan/TESTING_GUIDE.md`

**Performance:** Lazy loading, virtual lists, caching, code splitting, optimistic updates

**Components:** Follow patterns in `plan/COMPONENT_GUIDE.md` - TypeScript interfaces, Svelte 5 runes, test coverage

## Deployment

**Build:** `npm run build` → copy `build/*` to `pocketbase/pb_public/`  
**PocketBase:** Run from `pocketbase/` directory, migrations in `pb_migrations/`

## Guidelines

- Follow roadmap in `plan/DEVELOPMENT_ROADMAP.md`
- Update docs when completing major features
- NEVER create files unless absolutely necessary
- ALWAYS prefer editing existing files
- Create/fix tests after feature changes
- Commit changes after completing significant features or fixes
