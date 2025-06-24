# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WorshipWise is a sophisticated worship song tracking system built with SvelteKit 5 + PocketBase. It uses a single-server deployment architecture where PocketBase serves both the backend API and the static frontend.

**Current Project Status (June 2025):**

- **Maturity Level**: Advanced (42% complete - Sprint 5 finished)
- **Production Ready Features**: Complete authentication, song management with file uploads, real-time collaborative service editing, comprehensive analytics dashboard
- **Codebase Size**: 5,000+ lines of production-ready TypeScript code
- **Component Library**: 22+ implemented Svelte components
- **Advanced Features**: Real-time WebSocket subscriptions, Chart.js analytics, role-based permissions, responsive design

**Key Technologies:**

- SvelteKit with Static Adapter (pre-rendered SPA)
- Svelte 5 Runes for state management (no external state libraries needed)
- PocketBase as backend API + file server
- TypeScript throughout (100% coverage)
- Tailwind CSS for styling
- Vitest for unit testing (multi-project setup)
- Playwright for E2E testing

**Reference Documentation:**

_Note: Plan documents have been reorganized to reflect the project's advanced maturity state_

- **Current development status**: `plan/DEVELOPMENT_ROADMAP.md` (42% complete, Sprint 5 finished)
- **Active implementation guides** (currently in use):
  - Component patterns: `plan/COMPONENT_GUIDE.md` (22+ components implemented)
  - Testing strategy: `plan/TESTING_GUIDE.md` (multi-project Vitest setup ready)
  - PocketBase setup: `plan/POCKETBASE_SETUP.md`
  - Svelte 5 patterns: `plan/SVELTE.md` and `plan/PB_SVELTE.md`
- **Reference/historical** (architectural guidance):
  - Implementation reference: `plan/PLAN.md` (architectural patterns and examples)
- **Future planning** (not yet implemented):
  - Advanced features: `plan/DYNAMIC_SONG_AVAILABILITY.md` (Sprint 8-10)
  - Alternative deployment: `plan/CLOUDFLARE_MIGRATION_PLAN.md` (optional migration)

## Development Commands

```bash
# Development (recommended)
just dev                       # Start both PocketBase + SvelteKit with smart detection
npm run dev                    # Start SvelteKit dev server only
npm run dev -- --open        # Start dev server and open browser

# Building
npm run build                 # Build for production
npm run preview              # Preview production build

# Code Quality
just check                   # Run all checks (svelte-check, prettier, eslint)
npm run check                # Type checking with svelte-check
npm run check:watch          # Type checking in watch mode
npm run format               # Format code with Prettier
npm run lint                 # Run ESLint and Prettier checks

# Testing
npm run test:unit            # Run unit tests with Vitest
npm run test:unit:ui         # Run unit tests with UI
npm run test                 # Run both unit and E2E tests
npm run test:e2e             # Run Playwright E2E tests
npm run test:coverage        # Generate coverage report

# PocketBase (must be run from pocketbase/ directory)
cd pocketbase && ./pocketbase serve --dev    # Start PocketBase in development mode
cd pocketbase && ./pocketbase migrate        # Run database migrations
```

## Architecture

### Deployment Strategy

- **Single Server**: PocketBase serves both API (`/api/*`) and static frontend (`/pb_public/`)
- **Build Output**: SvelteKit builds to `build/` directory, which gets copied to PocketBase's `pb_public/` folder
- **No CORS Issues**: Frontend and backend share same origin
- **Static Adapter Configuration**: Uses `adapter-static` with SPA mode for client-side routing

### Core Collections (PocketBase Schema)

1. **Users** - Authentication with basic user data (email, password)
2. **Churches** - Church organizations with timezone, location, and admin setup
3. **Profiles** - Extended user metadata (name, role, church affiliation, preferences)
4. **Songs** - Central repository with metadata, keys, tempo, file attachments
5. **Services** - Service planning with dates and themes
6. **Service Songs** - Junction table for drag-and-drop ordering
7. **Song Usage** - Analytics tracking (populated on service completion)

For detailed schema and security rules, see `plan/POCKETBASE_SETUP.md`.

### Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── songs/          # Song management components
│   │   ├── services/       # Service builder components
│   │   ├── analytics/      # Reporting components
│   │   └── ui/             # Shared UI components
│   ├── stores/             # Svelte 5 runes-based stores
│   │   ├── auth.svelte.ts            # PocketBase auth state
│   │   ├── setup.svelte.ts           # Initial setup state management
│   │   ├── songs.svelte.ts           # Song management
│   │   ├── services.svelte.ts        # Service state with real-time
│   │   ├── analytics.svelte.ts       # Analytics data
│   │   └── recommendations.svelte.ts # AI insights and recommendations
│   ├── api/                # PocketBase client and operations
│   │   ├── client.ts            # PocketBase initialization
│   │   ├── churches.ts          # Church setup and management
│   │   ├── songs.ts             # Song CRUD operations
│   │   ├── services.ts          # Service operations
│   │   ├── recommendations.ts   # AI recommendations engine
│   │   └── realtime.ts          # WebSocket subscriptions
│   └── utils/              # Helper functions
├── routes/                 # SvelteKit pages and layouts
└── app.html               # App shell
```

## Key Features

### Church Foundation Architecture

- **Church-Centric Design**: All data is organized around church organizations as the foundational unit
- **Initial Setup Flow**: First-time deployments require creating a church and admin user through `/setup` route
- **Timezone-Aware Operations**: Churches have timezone settings for hemisphere-aware seasonal recommendations
- **Automated Detection**: Hemisphere automatically detected from timezone for accurate seasonal contexts

### Authentication & Authorization

- PocketBase handles auth with role-based permissions
- Church-based multi-tenancy with users belonging to specific churches
- Protected routes via `+layout.svelte` auth checks with setup guard
- User roles: pastor, admin, leader, musician, member with church-specific permissions

### Smart Song Management

- **Repetition Prevention**: Tracks usage and provides visual indicators (green/yellow/red)
- **Key Transposition**: Songs can be transposed for different services
- **File Attachments**: Sheet music, audio files, chord charts

### Real-Time Collaboration

- WebSocket subscriptions for live service editing
- Optimistic UI updates with rollback on failure
- Connection recovery handling for offline scenarios

### Analytics & Reporting

- Usage frequency tracking per song with church context
- Heat maps showing service patterns with seasonal awareness
- Top songs analysis with date filtering and hemisphere-specific recommendations
- AI-powered worship insights with rotation health and diversity analysis
- Church-specific seasonal trending based on timezone and location

## Development Guidelines

### State Management with Svelte 5 Runes

- Use `$state()` for reactive data (declare once at component init)
- Use `$derived()` for computed values (keep pure, no side effects)
- Use `$effect()` sparingly as escape hatch only
- Use `$props()` with destructuring and defaults
- Stores are classes with runes, not traditional Svelte stores
- Export functions/getters for cross-module state access
- PocketBase client initialization uses relative URLs for same-origin requests

See `plan/SVELTE.md` and `plan/PB_SVELTE.md` for detailed patterns.

### API Integration Patterns

- PocketBase client: `new PocketBase(browser ? window.location.origin : '')`
- Single global PocketBase instance
- Disable auto-cancellation for better UX: `pb.autoCancellation(false)`
- Church-based data scoping for multi-tenancy
- Initial setup detection with route guarding
- Real-time subscriptions for collaborative features
- Client-side caching with smart invalidation
- Optimistic updates for better UX
- Proper cleanup of subscriptions in `onDestroy`

### Testing Strategy

**Multi-layered testing approach optimized for Svelte 5 runes and PocketBase integration:**

#### **Unit Tests (Node.js Environment) - 190 store tests**

**✅ What Works Well:**

- API interactions and data mutations
- State management and business logic operations
- Error handling and edge cases
- Real-time subscription logic
- CRUD operations with mocked PocketBase
- Filter management and search functionality
- Builder state management (drag & drop logic)

**❌ Limitations in Node.js:**

- `$derived()` and `$derived.by()` runes don't execute outside Svelte runtime
- Browser-specific DOM APIs (CSV export, file handling)
- Reactive computations and insights generation
- Component-level reactive updates

#### **Integration/Component Tests (Browser Environment)**

**🎯 Should Cover:**

- Derived value calculations and reactive updates
- Component interactions with store state
- UI state changes and user interactions
- Form validation and error display
- Real-time UI updates from WebSocket events

#### **E2E Tests (Playwright) - Full User Workflows**

**🎯 Should Cover:**

- Complete drag & drop service building
- CSV export functionality with file downloads
- Real-time collaboration between multiple users
- Church setup and authentication flows
- Analytics dashboard interactions
- Complex workflows spanning multiple pages

#### **Testing Architecture:**

- Multi-project Vitest setup for client/server separation
- Comprehensive PocketBase API mocking for unit tests
- Mock WebSocket events for real-time testing
- Type-safe error handling validation
- Coverage requirements: 80% minimum for testable logic

#### **Svelte 5 Runes Testing Guidelines:**

- Test rune-based stores through method calls, not reactive values
- Use integration tests for derived value validation
- Test business logic separately from reactive computations
- Mock external dependencies to isolate store behavior
- Focus unit tests on state mutations and API interactions

See `plan/TESTING_GUIDE.md` for comprehensive testing patterns and examples.

### Performance Considerations

- Lazy loading for heavy components (charts, analytics)
- Virtual lists for long song lists
- API response caching with TTL
- Code splitting for route-based chunks
- Optimistic UI updates with rollback on failure
- PWA support with service worker for offline functionality

### Component Development

Follow the standardized component structure and patterns in `plan/COMPONENT_GUIDE.md`:

- Consistent import order and organization
- TypeScript interfaces for all props
- Proper Svelte 5 runes usage
- Comprehensive test coverage for new components

## Deployment

### Production Build Process

1. `npm run build` - Creates static files in `build/`
2. Copy `build/*` to PocketBase `pb_public/` directory
3. PocketBase serves both API and static assets from single port
4. No environment variables needed (same-origin requests)

### PocketBase Configuration

- **Important**: PocketBase must be executed from the `pocketbase/` directory
- Migrations are located in `pocketbase/pb_migrations/` (relative to PocketBase working directory)
- Database files are stored in `pocketbase/pb_data/`
- Use static adapter in `svelte.config.js`
- SPA mode with `fallback: 'index.html'` for client-side routing
- PocketBase rules handle API security and rate limiting
- JavaScript-based migrations for schema changes
- Daily automated backups with 30-day retention

See `plan/POCKETBASE_SETUP.md` for detailed configuration.

## Important Guidelines

- Always check and follow the development roadmap in `plan/DEVELOPMENT_ROADMAP.md`
- **Update progress tracking**: When completing work outlined in `plan/DEVELOPMENT_ROADMAP.md`, update the roadmap to mark completed tasks and reflect current sprint status
- **Update documentation when appropriate**:
  - **README.md**: Update sprint status, feature completions, and user-facing information when major features are completed
  - **README_DEVELOPMENT.md**: Update technical details, architecture changes, or development workflow modifications
  - **plan/DEVELOPMENT_ROADMAP.md**: Mark completed sprints/tasks and update current status
- Reference plan files for detailed implementation guidance
- Do what has been asked; nothing more, nothing less
- NEVER create files unless they're absolutely necessary for achieving your goal
- ALWAYS prefer editing an existing file to creating a new one
- NEVER proactively create documentation files (\*.md) or README files unless explicitly requested
- Follow the established patterns and conventions in the codebase
