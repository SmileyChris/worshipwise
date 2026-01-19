import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './errors';

describe('getErrorMessage', () => {
	describe('PocketBase ClientResponseError format', () => {
		it('should extract data.message', () => {
			const error = { data: { message: 'Validation failed' } };
			expect(getErrorMessage(error)).toBe('Validation failed');
		});

		it('should extract data.error', () => {
			const error = { data: { error: 'Record not found' } };
			expect(getErrorMessage(error)).toBe('Record not found');
		});

		it('should prefer data.message over data.error', () => {
			const error = { data: { message: 'Primary message', error: 'Secondary error' } };
			expect(getErrorMessage(error)).toBe('Primary message');
		});

		it('should fall back to top-level message', () => {
			const error = { message: 'Top-level error' };
			expect(getErrorMessage(error)).toBe('Top-level error');
		});

		it('should handle full PocketBase error structure', () => {
			const error = {
				data: { message: 'Email already exists' },
				message: 'The request failed',
				status: 400
			};
			expect(getErrorMessage(error)).toBe('Email already exists');
		});
	});

	describe('Standard Error objects', () => {
		it('should extract message from Error instance', () => {
			const error = new Error('Something went wrong');
			expect(getErrorMessage(error)).toBe('Something went wrong');
		});

		it('should extract message from TypeError', () => {
			const error = new TypeError('Invalid type');
			expect(getErrorMessage(error)).toBe('Invalid type');
		});
	});

	describe('Edge cases', () => {
		it('should handle null', () => {
			expect(getErrorMessage(null)).toBe('An unexpected error occurred');
		});

		it('should handle undefined', () => {
			expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
		});

		it('should handle string errors', () => {
			expect(getErrorMessage('string error')).toBe('An unexpected error occurred');
		});

		it('should handle number errors', () => {
			expect(getErrorMessage(42)).toBe('An unexpected error occurred');
		});

		it('should handle empty object', () => {
			expect(getErrorMessage({})).toBe('An unexpected error occurred');
		});

		it('should handle object with empty data', () => {
			expect(getErrorMessage({ data: {} })).toBe('An unexpected error occurred');
		});
	});
});
