import PocketBase from 'pocketbase';
import { browser } from '$app/environment';

// Create PocketBase instance
// When serving from PocketBase in production, use relative URL (same origin)
// In development, use localhost:8090
const url = browser
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
