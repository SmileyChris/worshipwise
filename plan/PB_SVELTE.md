# PocketBase + Svelte SPA Best Practices

## Core Architecture Patterns

### Client Setup

- **Single Global Instance**: Create one PocketBase client in `src/lib/pb.ts`
- **Disable Auto-Cancellation**: Use `pb.autoCancellation(false)` to prevent request cancellation during tab switching
- **Environment Configuration**: Use `PUBLIC_PB_URL` for browser-exposed URL, keep admin tokens server-side only

### Authentication & State Management

- **Built-in Persistence**: Default `LocalAuthStore` handles token/user persistence to localStorage
- **Reactive Auth State**: Wrap `pb.authStore.model` in Svelte stores and listen to `onChange` events
- **Component Integration**: Subscribe to auth stores instead of polling `pb.authStore` directly

### Real-time Features

- **SSE Subscriptions**: Use `pb.collection().subscribe()` for live updates
- **Proper Cleanup**: Always unsubscribe in `onDestroy` to prevent memory leaks
- **Event Handling**: Update local state through store operations when receiving real-time events

### Type Safety & Development

- **Generated Types**: Use `pocketbase-typegen` to generate TypeScript definitions from database schema
- **File URL Handling**: Use `pb.files.getUrl()` for consistent file access across environments
- **Request Optimization**: Use `requestKey: null` for expensive queries to prevent auto-cancellation

### Security Considerations

- **Rule-First Approach**: Always enforce PocketBase collection rules before client-side logic
- **No Admin Tokens**: Never expose admin/superuser tokens to the browser
- **Client-Side Assumptions**: Remember SPAs run entirely in user's browser - validate server-side

## Recommended Project Structure

```
src/
└─ lib/
   ├─ pb.ts          # Singleton PocketBase client
   ├─ stores.ts      # User auth and cached queries
   └─ types/         # Generated TypeScript definitions
routes/
└─ +layout.svelte    # Auth initialization and route protection
```

## Performance Tips

- Use Svelte `derived` stores for expensive list queries
- Implement request throttling for scroll-heavy interfaces
- Cache responses with appropriate TTL strategies
- Consider lazy loading for heavy analytics components

## Development Workflow

1. Set up single PocketBase client with proper configuration
2. Generate types from schema using `pocketbase-typegen`
3. Create reactive stores for auth and data management
4. Implement real-time subscriptions with proper cleanup
5. Focus on collection rules for security rather than client-side validation
