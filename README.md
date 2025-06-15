# WorshipWise

A modern worship song tracking and setlist management system built for worship teams. WorshipWise helps prevent song repetition, streamlines setlist planning, and provides valuable insights into your church's worship patterns.

**🎯 Current Status**: Sprint 3 Complete (25% - 3/12 sprints)  
**🚧 In Progress**: Sprint 4 - Song Usage Tracking & Setlist Foundation

## ✨ Features

### ✅ **Completed Features**
- **Complete Authentication System** with role-based access (musicians, leaders, admins)
- **Comprehensive Song Management** with CRUD operations, search, and filtering
- **File Upload System** for chord charts, sheet music, and audio files
- **Real-Time Collaboration** with WebSocket subscriptions
- **Responsive Design** that works on all devices
- **Modern UI Component Library** built with Tailwind CSS

### 🚧 **In Development**
- **Song Usage Tracking** to prevent repetition
- **Basic Setlist Management** for service planning
- **Visual Indicators** for song availability (green/yellow/red system)

### 🎯 **Planned Features**
- Advanced setlist builder with drag-and-drop
- Analytics dashboard with usage patterns
- Team collaboration tools
- Mobile PWA with offline support
- Smart song recommendations

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/worshipwise.git
cd worshipwise

# Install dependencies
npm install

# Start development servers (both PocketBase and SvelteKit)
npm run dev:all
```

### First Time Setup

1. **Access PocketBase Admin Panel**:
   - Go to http://localhost:8090/_/
   - Create your admin account (one-time setup)

2. **Access the Application**:
   - Frontend: http://localhost:5173
   - Register your first worship leader account

3. **Start Managing Songs**:
   - Add your first song with details and attachments
   - Create your first setlist

## 🛠 Development

### Available Commands

```bash
# Development
npm run dev                    # Start SvelteKit only
npm run pb:start              # Start PocketBase only  
npm run dev:all               # Start both simultaneously
./scripts/start-dev.sh        # Recommended startup script

# Building
npm run build                 # Build for production
npm run preview              # Preview production build

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

### Architecture

**Tech Stack:**
- **Frontend**: SvelteKit 5 with Svelte Runes for state management
- **Backend**: PocketBase (Go-based backend with SQLite)
- **Database**: SQLite with PocketBase ORM
- **Styling**: Tailwind CSS with custom design system
- **File Storage**: PocketBase file system
- **Real-Time**: WebSocket subscriptions via PocketBase
- **Testing**: Vitest (unit) + Playwright (E2E)

**Deployment Architecture:**
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
│   │   │   ├── ui/             # Shared UI components
│   │   │   └── auth/           # Authentication components
│   │   ├── stores/             # Svelte 5 runes-based stores
│   │   │   ├── auth.svelte.ts       # Authentication state
│   │   │   └── songs.svelte.ts      # Song management state
│   │   ├── api/                # PocketBase integration
│   │   │   ├── client.ts            # PocketBase client setup
│   │   │   └── songs.ts             # Song API operations
│   │   └── types/              # TypeScript definitions
│   ├── routes/                 # SvelteKit pages and layouts
│   └── app.html               # Application shell
├── pocketbase/
│   ├── pocketbase             # PocketBase binary
│   └── pb_data/               # Database and uploaded files
├── plan/                      # Project documentation
│   ├── DEVELOPMENT_ROADMAP.md      # Detailed development plan
│   └── README_DEVELOPMENT.md       # Development setup guide
└── scripts/
    └── start-dev.sh           # Development startup script
```

## 🗄️ Database Schema

### Core Collections
- **Users** - Authentication with roles (musician, leader, admin)
- **Songs** - Song catalog with metadata, keys, and file attachments
- **Setlists** - Service planning with themes and dates
- **Setlist Songs** - Junction table for song ordering in setlists
- **Song Usage** - Analytics tracking for repetition prevention

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests (requires dev servers running)
npm run test:e2e

# Run all tests
npm test
```

## 📈 Development Progress

### ✅ **Phase 1: Foundation Setup (Completed)**
- Sprint 1: Project Infrastructure ✅
- Sprint 2: Authentication & Basic UI ✅

### ✅ **Phase 2: Core Song Management (In Progress)**
- Sprint 3: Songs CRUD & Library ✅
- Sprint 4: Song Usage Tracking & Setlist Foundation 🚧

### 🎯 **Upcoming Phases**
- Phase 3: Advanced Setlist Features (Sprints 5-6)
- Phase 4: Analytics & Reporting (Sprints 7-8)
- Phase 5: Mobile & PWA (Sprints 9-10)
- Phase 6: Testing & Polish (Sprints 11-12)

See [plan/DEVELOPMENT_ROADMAP.md](plan/DEVELOPMENT_ROADMAP.md) for detailed development plan.

## 🔗 API Endpoints

### PocketBase URLs (Development)
- **API Base**: http://localhost:8090/api/
- **Admin Panel**: http://localhost:8090/_/
- **File Storage**: http://localhost:8090/api/files/

### Production
- Single-origin deployment: PocketBase serves both API and static assets
- No environment configuration needed (auto-detects URLs)

## 🤝 Contributing

1. Check the [development roadmap](plan/DEVELOPMENT_ROADMAP.md) for current priorities
2. Set up your development environment following this README
3. Create a feature branch from `main`
4. Follow the existing code patterns and TypeScript conventions
5. Add tests for new functionality
6. Run `npm run lint` and `npm run check` before committing
7. Submit a pull request with a clear description

## 📋 Development Workflow

1. **Start Development**: `./scripts/start-dev.sh`
2. **Check Current Tasks**: Review `plan/DEVELOPMENT_ROADMAP.md`
3. **Make Changes**: Follow TypeScript and component patterns
4. **Test Changes**: Run relevant test suites
5. **Quality Check**: `npm run lint && npm run check`
6. **Commit**: Follow conventional commit format

## 🔒 Security

- Role-based authentication with PocketBase
- Input validation on both client and server
- File upload restrictions and scanning
- XSS prevention with proper escaping
- CSRF protection via PocketBase

## 📚 Documentation

- **Development Setup**: [README_DEVELOPMENT.md](README_DEVELOPMENT.md)
- **Project Roadmap**: [plan/DEVELOPMENT_ROADMAP.md](plan/DEVELOPMENT_ROADMAP.md)
- **PocketBase Setup**: [plan/POCKETBASE_SETUP.md](plan/POCKETBASE_SETUP.md)
- **Component Guide**: [plan/COMPONENT_GUIDE.md](plan/COMPONENT_GUIDE.md)
- **Claude Integration**: [CLAUDE.md](CLAUDE.md)

## 🆘 Support

For development questions or issues:
1. Check the documentation in the `plan/` directory
2. Review the development roadmap for context
3. Check existing issues and discussions
4. Create a new issue with detailed information

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for worship teams everywhere**
