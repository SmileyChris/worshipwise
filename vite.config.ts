import tailwindcss from '@tailwindcss/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

const pocketbaseStub = resolve(
	fileURLToPath(new URL('.', import.meta.url)),
	'tests/helpers/stubs/pocketbase.ts'
);

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	resolve: process.env.VITEST
		? {
			alias: {
				pocketbase: pocketbaseStub
			}
		}
		: undefined,
	test: {
		pool: 'forks',
		fileParallelism: false,
		poolOptions: {
			forks: {
				singleFork: true
			}
		},
		projects: [
			{
				extends: './vite.config.ts',
				plugins: [svelteTesting()],
				test: {
					name: 'client',
					environment: 'jsdom',
					clearMocks: true,
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**'],
					setupFiles: ['./vitest-setup-client.ts']
				},
				// Tell Vitest to use browser entry points for Svelte 5 reactivity
				resolve: process.env.VITEST
					? {
							conditions: ['browser']
						}
					: undefined
			},
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}', 'tests/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					setupFiles: ['./tests/helpers/setup.ts']
				}
			}
		]
	}
});
