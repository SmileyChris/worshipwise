# WorshipWise - Development Guide

This document contains technical setup, architecture details, and development workflows for WorshipWise contributors and developers.

## 🚀 Development Setup

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/worshipwise.git
cd worshipwise

# Complete setup (installs everything needed)
just setup

# Start development servers (recommended)
just dev
```

### First Time Setup

1. **Complete Setup** (if not done already):

   ```bash
   # Install everything needed (PocketBase, npm packages, Playwright browsers)
   just setup
   ```

2. **Access PocketBase Admin Panel**:

   - Go to http://localhost:8090/\_/
   - Create your admin account (one-time setup)

3. **Access the Application**:

   - Frontend: http://localhost:5173
   - Register your first worship leader account

4. **Start Managing Songs**:
   - Add your first song with details and attachments
   - Create your first service

## 🛠 Development Commands

### Recommended (using justfile):

```bash
# Development (recommended)
just dev                      # Start both servers with smart detection
just setup                    # Complete setup (PocketBase, npm install, Playwright)
just build                    # Build for production
just test                     # Run all tests (unit + E2E)
just test -- --run file.test.ts  # Run specific test file
just check                   # Type checking and code quality checks
```

### Direct npm scripts:

```bash
# Development
npm run dev                   # Start SvelteKit only
npm run pb:start             # Start PocketBase only
./scripts/start-dev.sh       # Start both (advanced script)

# Building
npm run build                # Build for production
npm run preview             # Preview production build

# Code Quality
npm run check                # TypeScript checking
npm run check:watch          # TypeScript checking in watch mode
npm run format               # Format code with Prettier
npm run lint                 # Run ESLint and Prettier checks

# Testing
npm run test:unit            # Run unit tests with Vitest
npm run test:e2e             # Run Playwright E2E tests
npm run test                 # Run all tests
```

## 🏗️ Architecture

### Tech Stack

- **Frontend**: SvelteKit 5 with Svelte Runes for state management
- **Backend**: PocketBase (Go-based backend with SQLite)
- **Database**: SQLite with PocketBase ORM
- **Styling**: Tailwind CSS with custom design system
- **File Storage**: PocketBase file system
- **Real-Time**: WebSocket subscriptions via PocketBase
- **Testing**: Vitest (unit) + Playwright (E2E)

### Deployment Architecture

- Single-server deployment where PocketBase serves both API and static frontend
- No CORS issues (same origin)
- SvelteKit builds to static files served by PocketBase

## 📁 Project Structure

```
worshipwise/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── songs/          # Song management components
│   │   │   ├── services/       # Service builder components
│   │   │   ├── analytics/      # Reporting components
│   │   │   ├── ui/             # Shared UI components
│   │   │   └── auth/           # Authentication components
│   │   ├── stores/             # Svelte 5 runes-based stores
│   │   │   ├── auth.svelte.ts       # Authentication state
│   │   │   ├── songs.svelte.ts      # Song management state
│   │   │   ├── services.svelte.ts   # Service state with real-time
│   │   │   └── analytics.svelte.ts  # Analytics data
│   │   ├── api/                # PocketBase integration
│   │   │   ├── client.ts            # PocketBase client setup
│   │   │   ├── songs.ts             # Song API operations
│   │   │   ├── services.ts          # Service operations
│   │   │   └── analytics.ts         # Analytics operations
│   │   ├── types/              # TypeScript definitions
│   │   │   ├── auth.ts              # User types
│   │   │   ├── church.ts            # Church and Membership types
│   │   │   ├── song.ts              # Song and SongUsage types
│   │   │   └── service.ts           # Service types
│   │   └── utils/              # Helper functions
│   ├── routes/                 # SvelteKit pages and layouts
│   └── app.html               # Application shell
├── pocketbase/
│   ├── pocketbase             # PocketBase binary
│   ├── pb_migrations/         # Database migrations
│   └── pb_data/               # Database and uploaded files
├── plan/                      # Project documentation
│   ├── DEVELOPMENT_ROADMAP.md      # Detailed development plan
│   ├── POCKETBASE_SETUP.md         # Database setup guide
│   ├── COMPONENT_GUIDE.md          # Component patterns
│   └── TESTING_GUIDE.md            # Testing strategies
├── scripts/
│   └── start-dev.sh           # Development startup script
└── tests/                     # Test files
    ├── unit/                  # Vitest unit tests
    ├── e2e/                   # Playwright E2E tests
    └── helpers/               # Test utilities
```

## 🗄️ Database Schema

### Core Collections

#### User Management

- **Users** - Core authentication data (email, password, name, avatar)

  - This is the PocketBase auth collection
  - Contains basic user profile information
  - Used for login/authentication

- **Churches** - Church organizations

  - Church name, location, timezone, settings
  - Foundation for multi-church support

- **Church Memberships** - User-to-church relationships
  - Links users to churches with specific roles
  - Defines permissions within each church context
  - Replaces the old "profiles" pattern

#### Content Management

- **Songs** - Song catalog with metadata, keys, and file attachments
- **Services** - Service planning with themes and dates
- **Service Songs** - Junction table for song ordering in services
- **Song Usage** - Analytics tracking for repetition prevention

### Data Model Clarification

**User Profile vs Church Membership:**

- "Profile" refers to user-specific data stored in the Users collection (name, email, avatar)
- "Membership" refers to the user's role and permissions within a specific church
- A user can have multiple memberships (one per church they belong to)
- The `updateProfile()` method updates user data, not membership data

### Collection Relationships

```
Users (auth) ──┐
               ├── Church Memberships (user_id)
               ├── Songs (created_by)
               ├── Services (worship_leader)
               └── Song Usage (worship_leader)

Churches ──┐
           └── Church Memberships (church_id)

Songs ──┐
         ├── Service Songs (song_id)
         └── Song Usage (song_id)

Services ──┐
           ├── Service Songs (service_id)
           └── Song Usage (service_id)
```

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests (requires dev servers running)
npm run test:e2e

# Run all tests
npm test

# Generate coverage report
npm run test:coverage
```

### Testing Strategy

- **Unit Tests**: Component logic, stores, utilities
- **Integration Tests**: API operations, database interactions
- **E2E Tests**: Complete user workflows
- **Coverage Requirements**: 80% minimum for all metrics

## 🔗 API Endpoints

### PocketBase URLs (Development)

- **API Base**: http://localhost:8090/api/
- **Admin Panel**: http://localhost:8090/\_/
- **File Storage**: http://localhost:8090/api/files/

### Production

- Single-origin deployment: PocketBase serves both API and static assets
- No environment configuration needed (auto-detects URLs)

## 📈 Development Progress Tracking

### Sprint Status Format

Current status tracking in README.md uses this format:

```
**🎯 Current Status**: Sprint X Complete (Y% - X/12 sprints)
**🚧 In Progress**: Sprint Y - Feature Name
```

### Feature Status Icons

- ✅ **Completed** - Feature is implemented and tested
- 🚧 **In Development** - Currently being worked on
- 🎯 **Planned** - Scheduled for future development
- ⚠️ **Blocked** - Waiting on dependencies

### Progress Phases

- **Phase 1**: Foundation Setup (Sprints 1-2)
- **Phase 2**: Core Song Management (Sprints 3-4)
- **Phase 3**: Advanced Service Features (Sprints 5-6)
- **Phase 4**: Analytics & Reporting (Sprints 7-8)
- **Phase 5**: Mobile & PWA (Sprints 9-10)
- **Phase 6**: Testing & Polish (Sprints 11-12)

## 📋 Development Workflow

1. **Start Development**: `./scripts/start-dev.sh`
2. **Check Current Tasks**: Review `plan/DEVELOPMENT_ROADMAP.md`
3. **Make Changes**: Follow TypeScript and component patterns
4. **Test Changes**: Run relevant test suites
5. **Quality Check**: `npm run lint && npm run check`
6. **Commit**: Follow conventional commit format

### Code Standards

- **TypeScript**: 100% coverage, strict mode enabled
- **Components**: Follow patterns in `plan/COMPONENT_GUIDE.md`
- **State Management**: Use Svelte 5 runes exclusively
- **Styling**: Tailwind CSS with design system
- **Testing**: Cover all new functionality

### Git Workflow

- Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
- Create feature branches from `main`
- Ensure all tests pass before merging
- Update documentation for significant changes

## 🔒 Security Considerations

- Role-based authentication with PocketBase
- Input validation on both client and server
- File upload restrictions and scanning
- XSS prevention with proper escaping
- CSRF protection via PocketBase

## 🤝 Contributing

1. Check the [development roadmap](plan/DEVELOPMENT_ROADMAP.md) for current priorities
2. Set up your development environment following this guide
3. Create a feature branch from `main`
4. Follow the existing code patterns and TypeScript conventions
5. Add tests for new functionality
6. Run `npm run lint` and `npm run check` before committing
7. Submit a pull request with a clear description

## 📚 Related Documentation

- **User Documentation**: [README.md](README.md)
- **Project Roadmap**: [plan/DEVELOPMENT_ROADMAP.md](plan/DEVELOPMENT_ROADMAP.md)
- **PocketBase Setup**: [plan/POCKETBASE_SETUP.md](plan/POCKETBASE_SETUP.md)
- **Component Guide**: [plan/COMPONENT_GUIDE.md](plan/COMPONENT_GUIDE.md)
- **Testing Guide**: [plan/TESTING_GUIDE.md](plan/TESTING_GUIDE.md)
- **Claude Integration**: [CLAUDE.md](CLAUDE.md)

## 🆘 Development Support

For development questions or issues:

1. Check the documentation in the `plan/` directory
2. Review the development roadmap for context
3. Check existing issues and discussions
4. Create a new issue with detailed information

---

**For end-user documentation, see [README.md](README.md)**
