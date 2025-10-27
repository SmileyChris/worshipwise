import { test, expect, request } from '@playwright/test';

const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';

test('create church and verify membership', async ({ page }) => {
  // 1) Prepare PocketBase request context
  const api = await request.newContext({ baseURL: PB_URL });

  // 2) Create a user directly via PB API
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'P@ssw0rd1234';

  const createRes = await api.post('/api/collections/users/records', {
    data: {
      email,
      password,
      passwordConfirm: password,
      name: 'E2E User',
      emailVisibility: true
    }
  });
  expect(createRes.ok()).toBeTruthy();
  const user = await createRes.json();

  // 3) Authenticate to get token + model
  const authRes = await api.post('/api/collections/users/auth-with-password', {
    data: { identity: email, password }
  });
  expect(authRes.ok()).toBeTruthy();
  const auth = await authRes.json();
  const token = auth.token as string;
  const model = auth.record;

  // 4) Preload pb_auth in localStorage before app scripts run
  await page.addInitScript(({ token, model }) => {
    window.localStorage.setItem('pb_auth', JSON.stringify({ token, model }));
  }, { token, model });

  // 5) Go to app and open add-church page
  await page.goto('/dashboard');
  await page.goto('/churches/add');

  // 6) Fill church form
  const churchName = `E2E Test Church ${Date.now()}`;
  await page.getByLabel('Church Name', { exact: false }).fill(churchName);

  // optional fields
  await page.getByLabel('City', { exact: false }).fill('Testville');
  await page.getByLabel('State/Province', { exact: false }).fill('TS');
  await page.getByLabel('Country', { exact: false }).fill('Testland');

  // Timezone select should already have a value; ensure it exists
  await expect(page.getByLabel('Timezone', { exact: false })).toBeVisible();

  // Submit
  await page.getByRole('button', { name: /Create Church/i }).click();

  // 7) After create, expect navigation to dashboard and new church shown under username
  await page.waitForURL('**/dashboard');
  await expect(page.getByText(churchName).first()).toBeVisible();

  // 8) Verify membership exists in PB
  // Find the church id by name
  const churchQuery = await api.get('/api/collections/churches/records', {
    params: {
      page: '1',
      perPage: '1',
      filter: `name = "${churchName}"`
    },
    headers: {
      Authorization: token
    }
  });
  expect(churchQuery.ok()).toBeTruthy();
  const churchList = await churchQuery.json();
  expect(churchList.totalItems).toBeGreaterThan(0);
  const churchId = churchList.items[0].id as string;

  // Query membership for the user and this church
  const membershipRes = await api.get('/api/collections/church_memberships/records', {
    params: {
      page: '1',
      perPage: '1',
      filter: `church_id = "${churchId}" && user_id = "${user.id}"`
    },
    headers: {
      Authorization: token
    }
  });
  expect(membershipRes.ok()).toBeTruthy();
  const membershipList = await membershipRes.json();
  expect(membershipList.totalItems).toBeGreaterThan(0);
});

