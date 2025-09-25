// tests/smoke.spec.ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Mock Google Identity Services + gapi client
  await page.addInitScript(() => {
    // @ts-ignore
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: ({ callback }: any) => ({
            requestAccessToken: () => callback({ access_token: 'test-token' }),
          }),
        },
        id: { revoke: (_: any, cb: any) => cb && cb() },
      },
    };
    // @ts-ignore
    window.gapi = {
      load: (_: string, cb: any) => cb && cb(),
      client: {
        init: async () => {},
        load: async () => {},
        setToken: (_: any) => {},
        calendar: {
          events: {
            list: async () => ({
              result: {
                items: [
                  {
                    id: 'evt-1',
                    summary: 'Demo Event 1',
                    htmlLink: 'https://calendar.google.com/event?eid=evt-1',
                    start: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
                    end: { dateTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() },
                    attendees: [{ email: 'a@example.com', responseStatus: 'accepted' }],
                  },
                ],
              },
            }),
            insert: async ({ resource }: any) => ({ result: { id: 'new-evt', ...resource } }),
          },
        },
      },
    };
  });
});

test('home + calendar drawer smoke', async ({ page }) => {
  await page.goto('/');

  // Khẳng định trang render
  await expect(page.locator('text=TaskManage').first()).toBeVisible();

  // Mở Drawer Calendar
  // Ưu tiên button có data-testid để ổn định:
  const openBtn = page.locator('[data-testid="open-calendar"]').first();
  if (await openBtn.count()) {
    await openBtn.click();
  } else {
    // fallback theo text/role nếu bạn chưa set testid
    const altBtn = page.getByRole('button', { name: /lịch|calendar/i }).first();
    await altBtn.click();
  }

  await expect(page.getByText(/Sự kiện Google Calendar/i)).toBeVisible();

  // Nếu còn nút đăng nhập thì click (mock sẽ cấp token)
  const loginBtn = page.getByRole('button', { name: /đăng nhập google/i });
  if (await loginBtn.isVisible().catch(() => false)) {
    await loginBtn.click();
  }

  // Refresh để load events giả
  const refreshBtn = page.getByRole('button', { name: /làm mới/i });
  await refreshBtn.click();

  // Thấy sự kiện mẫu
  await expect(page.getByText('Demo Event 1')).toBeVisible();
  await expect(page.getByRole('link', { name: /xem trên google calendar/i })).toBeVisible();
});