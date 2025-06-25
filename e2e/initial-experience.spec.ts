import { expect, test } from '@playwright/test';

/**
 * E2E Tests for Initial User Experience
 *
 * These tests cover the complete onboarding flow for new WorshipWise users:
 *
 * 1. Homepage detection (setup required vs existing users)
 * 2. Setup wizard UI and navigation (church info → admin account)
 * 3. Form validation and error handling
 * 4. Data persistence during navigation
 * 5. Timezone auto-detection and hemisphere calculation
 *
 * Tests are designed to work without a live PocketBase instance by focusing
 * on UI behavior and client-side validation rather than backend integration.
 */

test.beforeEach(async ({ page }) => {
	// Mock the initial setup API call
	await page.route('**/api/collections/churches/records', (route) => {
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				id: 'mock_church_id',
				name: 'Test Church',
				slug: 'test-church',
				timezone: 'UTC'
			})
		});
	});

	await page.route('**/api/collections/users/records', (route) => {
		return route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				id: 'mock_user_id',
				email: 'admin@test.com',
				name: 'Admin'
			})
		});
	});
});
test.describe('Initial User Experience', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to home page for each test
		await page.goto('/');
	});

	test('displays initial setup flow UI correctly', async ({ page }) => {
		// Wait for page to load and check initial state
		await page.waitForLoadState('networkidle');

		// The page should show the WorshipWise title
		await expect(page.locator('h1')).toContainText('WorshipWise');

		// Check for either setup or login content
		const setupContent = page.locator('text=Initial Setup Required');
		const loginContent = page.locator('text=Welcome back to WorshipWise');
		const generalWelcome = page.locator('text=Welcome to WorshipWise');

		// At least one of these should be visible
		const hasSetup = await setupContent.isVisible();
		const hasLogin = await loginContent.isVisible();
		const hasWelcome = await generalWelcome.isVisible();

		expect(hasSetup || hasLogin || hasWelcome).toBeTruthy();

		// Test navigation to setup page works
		if (hasSetup) {
			await page.click('text=Begin Setup');
			await expect(page).toHaveURL('/setup');
		} else {
			// Navigate directly to setup to test it
			await page.goto('/setup');
			await expect(page).toHaveURL('/setup');
		}
	});

	test('setup page displays correctly and validates input', async ({ page }) => {
		// Navigate directly to setup page
		await page.goto('/setup');
		await page.waitForLoadState('networkidle');

		// Test setup page UI elements
		await expect(page.locator('h1')).toContainText('WorshipWise');
		await expect(page.locator('h2')).toContainText('Church Information');

		// Verify progress indicator shows step 1 active
		const step1 = page.locator('.rounded-full').nth(0);
		const step2 = page.locator('.rounded-full').nth(1);
		await expect(step1).toHaveClass(/bg-primary/);
		await expect(step2).toHaveClass(/bg-gray-200/);

		// Test form fields exist and can be filled
		await page.fill('[name="churchName"]', 'Grace Community Church');
		await page.selectOption('select', 'America/New_York');

		// Verify hemisphere detection appears
		await expect(page.locator('text=Northern Hemisphere')).toBeVisible();

		// Test navigation to step 2
		await page.click('text=Next Step');
		await expect(page.locator('h2')).toContainText('Admin Account');

		// Verify progress indicator updated
		await expect(step2).toHaveClass(/bg-primary/);

		// Test admin form fields
		await page.fill('[name="adminName"]', 'John Smith');
		await page.fill('[name="adminEmail"]', 'admin@test.com');
		await page.fill('[name="password"]', 'password123');
		await page.fill('[name="confirmPassword"]', 'password123');

		// Verify setup summary shows entered data
		await expect(page.locator('text=Grace Community Church')).toBeVisible();
		await expect(page.locator('text=John Smith')).toBeVisible();

		// Test back navigation
		await page.click('text=Back');
		await expect(page.locator('h2')).toContainText('Church Information');
		await expect(page.locator('[name="churchName"]')).toHaveValue('Grace Community Church');

		// Navigate forward again
		await page.click('text=Next Step');
		await expect(page.locator('h2')).toContainText('Admin Account');
	});

	test(
		'shows validation errors in setup form',
		async ({ page }) => {
			test.slow(); // Mark test as slow since it involves multiple UI interactions

			await page.goto('/setup');
			await page.waitForLoadState('networkidle');

			// Test step 1 validation - empty church name
			await page.click('text=Next Step');
			await expect(page.locator('text=Church name is required')).toBeVisible();

			// Fill church name and proceed to step 2
			await page.fill('[name="churchName"]', 'Test Church');
			await page.selectOption('select', 'UTC'); // Ensure timezone is set
			await page.click('text=Next Step');

			// Test step 2 validation
			await page.click('text=Complete Setup');
			await expect(page.locator('text=Admin name is required')).toBeVisible();

			// Test password length validation
			await page.fill('[name="adminName"]', 'Admin');
			await page.fill('[name="adminEmail"]', 'admin@test.com');
			await page.fill('[name="password"]', '123');
			await page.fill('[name="confirmPassword"]', '123');
			await page.click('text=Complete Setup');
			await expect(page.locator('text=Password must be at least 6 characters')).toBeVisible();

			// Test password mismatch validation
			await page.fill('[name="password"]', 'password123');
			await page.fill('[name="confirmPassword"]', 'different123');
			await page.click('text=Complete Setup');
			await expect(page.locator('text=Passwords do not match')).toBeVisible();
		},
		{ timeout: 10000 }
	); // Reduce timeout to 10 seconds since we're mocking API calls

	test('preserves form data during navigation', async ({ page }) => {
		await page.goto('/setup');
		await page.waitForLoadState('networkidle');

		// Fill step 1 data
		await page.fill('[name="churchName"]', 'Test Church');
		await page.selectOption('select', 'UTC');

		// Navigate to step 2
		await page.click('text=Next Step');

		// Navigate back to step 1
		await page.click('text=Back');

		// Verify data is preserved
		await expect(page.locator('[name="churchName"]')).toHaveValue('Test Church');
		await expect(page.locator('select')).toHaveValue('UTC');
	});

	test('displays timezone auto-detection', async ({ page }) => {
		await page.goto('/setup');
		await page.waitForLoadState('networkidle');

		// Timezone select should have a pre-selected value
		const timezoneSelect = page.locator('select');
		const selectedValue = await timezoneSelect.inputValue();
		expect(selectedValue).toBeTruthy();

		// Should show hemisphere detection text
		await expect(page.locator('text=Hemisphere')).toBeVisible();
	});
});
