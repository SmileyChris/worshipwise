import { test, expect } from '@playwright/test'

// Ensures the Songs page loads without a church-selection error
// when a user is authenticated and has exactly one active church.
test.describe('Songs page church context', () => {
  test.beforeEach(async ({ page }) => {
    // Prime PocketBase auth localStorage before app scripts run
    await page.addInitScript(() => {
      const auth = {
        token: 'mock-token',
        model: {
          id: 'mock_user_id',
          email: 'user@test.com',
          name: 'Test User'
        }
      }
      try {
        localStorage.setItem('pb_auth', JSON.stringify(auth))
      } catch {}
    })

    const churchId = 'mock_church_id'
    const membershipRecord = {
      id: 'mem_1',
      user_id: 'mock_user_id',
      church_id: churchId,
      status: 'active',
      is_active: true,
      expand: {
        church_id: {
          id: churchId,
          name: 'Test Church',
          slug: 'test-church',
          timezone: 'UTC'
        }
      }
    }

    const category = { id: 'cat_1', name: 'Praise' }
    const songs = [
      {
        id: 'song_1',
        title: 'Amazing Grace',
        artist: 'Traditional',
        church_id: churchId,
        category: category.id,
        is_active: true,
        is_retired: false,
        expand: { category }
      }
    ]

    // Mock church memberships (both paginated getList and getFullList)
    await page.route('**/api/collections/church_memberships/records**', (route) => {
      const url = new URL(route.request().url())
      const isPaginated = url.searchParams.has('page')
      const body = isPaginated
        ? {
            page: 1,
            perPage: 1,
            totalItems: 1,
            totalPages: 1,
            items: [membershipRecord]
          }
        : [membershipRecord]
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    })

    // Mock roles/skills lookups to keep permissions simple
    for (const coll of ['roles', 'user_roles', 'user_skills']) {
      await page.route(`**/api/collections/${coll}/records**`, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      )
    }

    // Mock ratings and song_usage as empty
    for (const coll of ['song_ratings', 'song_usage']) {
      await page.route(`**/api/collections/${coll}/records**`, (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      )
    }

    // Mock songs (both paginated and full list)
    await page.route('**/api/collections/songs/records**', (route) => {
      const url = new URL(route.request().url())
      const isPaginated = url.searchParams.has('page')
      const body = isPaginated
        ? { page: 1, perPage: 20, totalItems: songs.length, totalPages: 1, items: songs }
        : songs
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body)
      })
    })
  })

  test('loads without church-selection error and shows content', async ({ page }) => {
    await page.goto('/songs')

    // Header should be visible
    await expect(page.getByRole('heading', { name: 'Song Library' })).toBeVisible()

    // Ensure the specific error isn’t shown
    await expect(
      page.locator('text=No church selected').first()
    ).toHaveCount(0)

    // Categories view is default; verify category or song content appears
    await expect(page.locator('text=Amazing Grace')).toBeVisible()
  })
})

