import PocketBase from 'pocketbase';
import { browser } from '$app/environment';

// Create PocketBase instance
// Respect VITE_PB_URL override for tests/E2E; otherwise choose sensible default
const override = import.meta.env.VITE_PB_URL as string | undefined;
const url = override
  ? override
  : browser
    ? window.location.origin.includes('localhost:5173')
      ? 'http://localhost:8090'
      : window.location.origin
    : 'http://localhost:8090';

export const pb = new PocketBase(url);

// Enable auto cancellation for pending requests on page navigation
if (browser) {
	pb.autoCancellation(false);

	// Auto-refresh auth state on client side
	pb.authStore.onChange(() => {
		// Optionally trigger reactive updates here
		console.log('Auth state changed:', pb.authStore.isValid);
	});
}
