/**
 * Extract a user-friendly error message from various error types.
 * Handles PocketBase ClientResponseError format and standard Error objects.
 *
 * PocketBase errors typically have:
 * - data.message: Validation or business logic errors
 * - data.error: General error messages
 * - message: Top-level error message
 */
export function getErrorMessage(error: unknown): string {
	// Handle PocketBase ClientResponseError
	if (error && typeof error === 'object') {
		const pbError = error as { data?: { message?: string; error?: string }; message?: string };
		if (pbError.data?.message) {
			return pbError.data.message;
		}
		if (pbError.data?.error) {
			return pbError.data.error;
		}
		if (pbError.message) {
			return pbError.message;
		}
	}

	if (error instanceof Error) {
		return error.message;
	}

	return 'An unexpected error occurred';
}
