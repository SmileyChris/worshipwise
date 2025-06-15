# WorshipWise Development Setup

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or pnpm
- PocketBase (already downloaded)

### Development Commands

```bash
# Start PocketBase only
npm run pb:start

# Start SvelteKit only  
npm run dev

# Start both simultaneously
npm run dev:all

# Use the custom script (recommended)
./scripts/start-dev.sh
```

## 📁 Project Structure

```
worshipwise/
├── src/
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts        # PocketBase client setup
│   │   │   └── songs.ts         # Songs API methods
│   │   └── types/
│   │       ├── auth.ts          # Authentication types
│   │       └── song.ts          # Song-related types
├── pocketbase/
│   ├── pocketbase               # PocketBase binary
│   └── pb_data/                 # Database and files (created on first run)
└── scripts/
    └── start-dev.sh             # Development startup script
```

## 🗄️ PocketBase Setup

### First Time Setup

1. **Start PocketBase** to initialize the database:
   ```bash
   npm run pb:start
   ```

2. **Access Admin Panel**: 
   - Go to http://localhost:8090/_/
   - Create your admin account
   - This only needs to be done once

3. **Create Collections**: Follow the schema in `plan/POCKETBASE_SETUP.md`

### PocketBase URLs

- **API**: http://localhost:8090/api/
- **Admin Panel**: http://localhost:8090/_/
- **Health Check**: http://localhost:8090/api/health

## 🔧 Development Workflow

### 1. Environment Setup
- PocketBase runs on port 8090
- SvelteKit dev server runs on port 5173
- The client automatically detects development vs production URLs

### 2. API Integration
- Use `src/lib/api/client.ts` for PocketBase connection
- API methods are organized by feature (songs, setlists, etc.)
- Real-time subscriptions available for collaborative features

### 3. Type Safety
- All PocketBase responses are typed in `src/lib/types/`
- TypeScript strict mode enabled
- Use interfaces for data structures

## 🧪 Testing

```bash
# Run unit tests
npm run test:unit

# Run E2E tests  
npm run test:e2e

# Run all tests
npm test
```

## 📝 Next Development Steps

### Current Status: ✅ Sprint 1 Complete
- [x] PocketBase downloaded and configured
- [x] Client integration created
- [x] Development scripts set up
- [x] Type definitions established

### Next: Sprint 2 - Authentication & Basic UI
1. **Create auth store with Svelte 5 runes**
2. **Build login/register pages**
3. **Set up protected route layout**
4. **Create basic UI component library**

### Ready to Start
The foundation is now in place! You can:

1. **Start development servers**: `./scripts/start-dev.sh`
2. **Access PocketBase admin**: http://localhost:8090/_/
3. **View SvelteKit app**: http://localhost:5173
4. **Begin implementing authentication**

## 🔗 Useful Links

- **PocketBase Docs**: https://pocketbase.io/docs/
- **SvelteKit Docs**: https://kit.svelte.dev/docs
- **Svelte 5 Runes**: https://svelte.dev/docs/svelte/what-are-runes
- **Project Plan**: `plan/PLAN.md`
- **Component Guide**: `plan/COMPONENT_GUIDE.md`
- **Testing Guide**: `plan/TESTING_GUIDE.md`