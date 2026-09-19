import { expect, test } from '@playwright/test';

test('capture production desktop and checkout states', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByText('Backend connected')).toBeVisible();

  await page.screenshot({
    path: 'portfolio-screenshots/home-desktop.png',
    fullPage: true,
  });
  await page.screenshot({
    path: '../docs/images/portfolio-overview.png',
  });

  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Continue to demo checkout' }).click();
  await expect(page.getByText('Store API checkout')).toBeVisible();

  await page.screenshot({
    path: 'portfolio-screenshots/checkout-desktop.png',
    fullPage: true,
  });
  await page.locator('#commerce').screenshot({
    path: '../docs/images/portfolio-checkout.png',
  });
});

test('capture production mobile state', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByText('Backend connected')).toBeVisible();

  await page.screenshot({
    path: 'portfolio-screenshots/home-mobile.png',
    fullPage: true,
  });
  await page.screenshot({
    path: '../docs/images/portfolio-mobile.png',
  });
});
