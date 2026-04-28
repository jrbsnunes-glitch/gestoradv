import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('página de login exibe título principal', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Acessar o Sistema/i })).toBeVisible();
  });
});
