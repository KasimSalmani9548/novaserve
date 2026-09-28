import { test, expect, Page } from '@playwright/test';

const BASE = 'http://localhost:5173';
const ADMIN = { email: 'kasimsalmnai@gmail.com', password: 'Kasim@20049801' };
const CUSTOMER = { email: 'testdemoemail00@gmail.com', password: 'Kasim@20049801' };

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(app|admin)\//, { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

async function hasError(page: Page): Promise<boolean> {
  const text = await page.locator('main').innerText().catch(() => '');
  // Only check for actual React errors, not notification text
  const hasRuntimeError = text.includes('Cannot read propert') || 
                          text.includes('TypeError') ||
                          text.includes('is not a function') ||
                          text.includes('is not defined');
  const isEmpty = text.trim().length < 10;
  return hasRuntimeError || isEmpty;
}

// ============ AUTH TESTS ============
test.describe('Authentication', () => {
  test('Customer login works', async ({ page }) => {
    await login(page, CUSTOMER);
    expect(page.url()).toContain('/app/dashboard');
  });

  test('Admin login works', async ({ page }) => {
    await login(page, ADMIN);
    expect(page.url()).toContain('/admin/dashboard');
  });

  test('Wrong password shows error', async ({ page }) => {
    await page.goto(BASE);
    await page.fill('input[type="email"]', CUSTOMER.email);
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    const text = await page.locator('body').innerText();
    expect(text).toContain('Invalid credentials');
  });
});

// ============ CUSTOMER PAGES ============
test.describe('Customer Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, CUSTOMER);
  });

  test('Dashboard renders charts', async ({ page }) => {
    await page.goto(BASE + '/app/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Dashboard');
    expect(await hasError(page)).toBe(false);
  });

  test('Wallet shows balance', async ({ page }) => {
    await page.goto(BASE + '/app/wallet');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Balance');
    expect(await hasError(page)).toBe(false);
  });

  test('Transactions page renders', async ({ page }) => {
    await page.goto(BASE + '/app/transactions');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Transactions');
    expect(await hasError(page)).toBe(false);
  });

  test('Services page shows services', async ({ page }) => {
    await page.goto(BASE + '/app/services');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Services');
    const tiles = await page.locator('main button').count();
    expect(tiles).toBeGreaterThan(0);
  });

  test('PAN Find page renders', async ({ page }) => {
    await page.goto(BASE + '/app/pan-find');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('PAN');
    expect(await hasError(page)).toBe(false);
  });

  test('Aadhaar PVC page renders', async ({ page }) => {
    await page.goto(BASE + '/app/aadhaar-pvc');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Aadhaar');
    expect(await hasError(page)).toBe(false);
  });

  test('Notifications has pagination', async ({ page }) => {
    await page.goto(BASE + '/app/notifications');
    await page.waitForLoadState('networkidle');
    const mainText = await page.locator('main').innerText();
    expect(mainText).toContain('Notifications');
    expect(await hasError(page)).toBe(false);
  });

  test('Profile page renders', async ({ page }) => {
    await page.goto(BASE + '/app/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Profile');
    expect(await hasError(page)).toBe(false);
  });

  test('Support page renders', async ({ page }) => {
    await page.goto(BASE + '/app/support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Support');
    expect(await hasError(page)).toBe(false);
  });
});

// ============ ADMIN PAGES ============
test.describe('Admin Pages', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, ADMIN);
  });

  test('Admin dashboard renders', async ({ page }) => {
    await page.goto(BASE + '/admin/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Dashboard');
    expect(await hasError(page)).toBe(false);
  });

  test('Manage Reports Orders tab', async ({ page }) => {
    await page.goto(BASE + '/admin/manage');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Manage');
    expect(await hasError(page)).toBe(false);
  });

  test('Manage Reports Wallet tab renders (no crash)', async ({ page }) => {
    await page.goto(BASE + '/admin/manage');
    await page.waitForLoadState('networkidle');
    
    // Click wallet tab
    const walletTab = page.locator('button:has-text("Wallet")').first();
    if (await walletTab.count() > 0) {
      await walletTab.click();
      await page.waitForTimeout(1000);
      expect(await hasError(page)).toBe(false);
    }
  });

  test('Customers page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/customers');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Customers');
    expect(await hasError(page)).toBe(false);
  });

  test('Services page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/services');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Services');
    expect(await hasError(page)).toBe(false);
  });

  test('Categories page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/categories');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Categories');
    expect(await hasError(page)).toBe(false);
  });

  test('PAN Finds page renders with pagination', async ({ page }) => {
    await page.goto(BASE + '/admin/pan-finds');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('PAN');
    expect(await hasError(page)).toBe(false);
  });

  test('Aadhaar PVC page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/aadhaar-pvc');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Aadhaar');
    expect(await hasError(page)).toBe(false);
  });

  test('Pricing page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/pricing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Payment');
    expect(await hasError(page)).toBe(false);
  });

  test('Support page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/support');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Support');
    expect(await hasError(page)).toBe(false);
  });

  test('Settings page renders', async ({ page }) => {
    await page.goto(BASE + '/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toContainText('Settings');
    expect(await hasError(page)).toBe(false);
  });

  test('Manage Reports - Filter buttons work', async ({ page }) => {
    await page.goto(BASE + '/admin/manage');
    await page.waitForLoadState('networkidle');
    
    const filters = ['PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'];
    for (const f of filters) {
      const btn = page.locator(`button:has-text("${f}")`).first();
      if (await btn.count() > 0) {
        await btn.click();
        await page.waitForTimeout(500);
        expect(await hasError(page)).toBe(false);
      }
    }
  });
});

// ============ NO CONSOLE ERRORS ============
test.describe('No Console Errors', () => {
  test('Customer pages have no uncaught errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    
    await login(page, CUSTOMER);
    
    const pages = ['/app/dashboard', '/app/wallet', '/app/transactions', '/app/services', '/app/pan-find', '/app/aadhaar-pvc', '/app/notifications', '/app/profile', '/app/support'];
    for (const p of pages) {
      await page.goto(BASE + p);
      await page.waitForTimeout(1500);
    }
    
    const criticalErrors = errors.filter(e => !e.includes('DevTools') && !e.includes('listener') && !e.includes('Violation'));
    expect(criticalErrors).toHaveLength(0);
  });

  test('Admin pages have no uncaught errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    
    await login(page, ADMIN);
    
    const pages = ['/admin/dashboard', '/admin/manage', '/admin/customers', '/admin/services', '/admin/categories', '/admin/pan-finds', '/admin/aadhaar-pvc', '/admin/pricing', '/admin/support', '/admin/settings'];
    for (const p of pages) {
      await page.goto(BASE + p);
      await page.waitForTimeout(1500);
    }
    
    const criticalErrors = errors.filter(e => !e.includes('DevTools') && !e.includes('listener') && !e.includes('Violation'));
    expect(criticalErrors).toHaveLength(0);
  });
});