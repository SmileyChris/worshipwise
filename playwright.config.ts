import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: 'e2e',
	timeout: 30 * 1000, // 30 seconds per test
	expect: {
		timeout: 5 * 1000 // 5 seconds for assertions
	},
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'html',
	use: {
		baseURL: 'http://localhost:4173',
		trace: 'on-first-retry',
		screenshot: 'only-on-failure'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] }
		}
		// Uncomment for cross-browser testing
		// {
		//   name: 'firefox',
		//   use: { ...devices['Desktop Firefox'] },
		// },
		// {
		//   name: 'webkit',
		//   use: { ...devices['Desktop Safari'] },
		// },
	],
	webServer: [
		{
			command: 'node scripts/pb-test-server.mjs',
			port: 8090,
			reuseExistingServer: !process.env.CI,
			stdout: 'pipe',
			stderr: 'pipe'
		},
		{
			command: 'npm run build && npm run preview',
			port: 4173,
			reuseExistingServer: !process.env.CI,
			stdout: 'ignore',
			stderr: 'pipe',
			env: {
				VITE_PB_URL: 'http://127.0.0.1:8090'
			}
		}
	]
});
