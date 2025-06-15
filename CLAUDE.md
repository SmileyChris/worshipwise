# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

WorshipWise is a worship song tracking system built with SvelteKit 5 + PocketBase. It uses a single-server deployment architecture where PocketBase serves both the backend API and the static frontend.

**Key Technologies:**

- SvelteKit with Static Adapter (pre-rendered SPA)
- Svelte 5 Runes for state management
- PocketBase as backend API + file server
- TypeScript throughout
- Tailwind CSS for styling
- Vitest for unit testing
- Playwright for E2E testing

## Development Commands

```bash
# Development
npm run dev                    # Start dev server
npm run dev -- --open        # Start dev server and open browser

# Building
npm run build                 # Build for production
npm run preview              # Preview production build

# Code Quality
npm run check                # Type checking with svelte-check
npm run check:watch          # Type checking in watch mode
npm run format               # Format code with Prettier
npm run lint                 # Run ESLint and Prettier checks

# Testing
npm run test:unit            # Run unit tests with Vitest
npm run test                 # Run both unit and E2E tests
npm run test:e2e             # Run Playwright E2E tests
```

## Architecture

### Deployment Strategy

- **Single Server**: PocketBase serves both API (`/api/*`) and static frontend (`/pb_public/`)
- **Build Output**: SvelteKit builds to `build/` directory, which gets copied to PocketBase's `pb_public/` folder
- **No CORS Issues**: Frontend and backend share same origin
- **Static Adapter Configuration**: Uses `adapter-static` with SPA mode for client-side routing

### Core Collections (PocketBase Schema)

1. **Users** - Auth-enabled worship leaders with roles
2. **Songs** - Central repository with metadata, keys, tempo
3. **Setlists** - Service planning with dates and themes
4. **Setlist Songs** - Junction table for drag-and-drop ordering
5. **Song Usage** - Analytics tracking (populated on service completion)
6. **Analytics View** - Pre-aggregated reporting data

### Project Structure

```
src/
├── lib/
│   ├── components/
│   │   ├── songs/          # Song management components
│   │   ├── setlists/       # Setlist builder components
│   │   ├── analytics/      # Reporting components
│   │   └── ui/             # Shared UI components
│   ├── stores/             # Svelte 5 runes-based stores
│   │   ├── auth.svelte.ts       # PocketBase auth state
│   │   ├── songs.svelte.ts      # Song management
│   │   ├── setlists.svelte.ts   # Setlist state with real-time
│   │   └── analytics.svelte.ts  # Analytics data
│   ├── api/                # PocketBase client and operations
│   │   ├── client.ts            # PocketBase initialization
│   │   ├── songs.ts             # Song CRUD operations
│   │   ├── setlists.ts          # Setlist operations
│   │   └── realtime.ts          # WebSocket subscriptions
│   └── utils/              # Helper functions
├── routes/                 # SvelteKit pages and layouts
└── app.html               # App shell
```

## Key Features

### Authentication & Authorization

- PocketBase handles auth with role-based permissions
- Protected routes via `+layout.svelte` auth checks
- Users have roles: musician, leader, admin with different access levels

### Smart Song Management

- **Repetition Prevention**: Tracks usage and provides visual indicators (green/yellow/red)
- **Key Transposition**: Songs can be transposed for different setlists
- **File Attachments**: Sheet music, audio files, chord charts

### Real-Time Collaboration

- WebSocket subscriptions for live setlist editing
- Optimistic UI updates with rollback on failure
- Connection recovery handling for offline scenarios

### Analytics & Reporting

- Usage frequency tracking per song
- Heat maps showing service patterns
- Top songs analysis with date filtering

## Development Guidelines

### State Management with Svelte 5 Runes

- Use `$state()` for reactive data
- Use `$derived()` for computed values
- Stores are classes with runes, not traditional Svelte stores
- PocketBase client initialization uses relative URLs for same-origin requests

### API Integration Patterns

- PocketBase client: `new PocketBase(browser ? window.location.origin : '')`
- Real-time subscriptions for collaborative features
- Client-side caching with smart invalidation
- Optimistic updates for better UX

### Testing Strategy

- Unit tests with Vitest for stores and utilities
- Component tests with Testing Library for Svelte
- E2E tests with Playwright for user workflows
- Mock PocketBase API calls in tests

### Performance Considerations

- Lazy loading for heavy components (charts, analytics)
- API response caching with TTL
- Code splitting for route-based chunks
- PWA support with service worker for offline functionality

## Deployment

### Production Build Process

1. `npm run build` - Creates static files in `build/`
2. Copy `build/*` to PocketBase `pb_public/` directory
3. PocketBase serves both API and static assets from single port
4. No environment variables needed (same-origin requests)

### PocketBase Configuration

- Use static adapter in `svelte.config.js`
- SPA mode with `fallback: 'index.html'` for client-side routing
- PocketBase rules handle API security and rate limiting

## Memories

- Ensure we use and update the plan/DEVELOPMENT_ROADMAP.md
