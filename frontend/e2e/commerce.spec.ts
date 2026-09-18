import { expect, test } from '@playwright/test';

test('creates a WooCommerce order through the headless UI', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'A production-shaped headless commerce playground.',
    }),
  ).toBeVisible();

  await expect(page.getByText('Backend connected')).toBeVisible();

  const addButtons = page.getByRole('button', { name: 'Add to cart' });
  await expect(addButtons.first()).toBeVisible();
  await addButtons.first().click();

  await expect(page.locator('.cart-count')).toHaveText('1');
  await expect(
    page.getByRole('button', { name: 'Continue to demo checkout' }),
  ).toBeEnabled();

  await page.getByRole('button', { name: 'Continue to demo checkout' }).click();

  await expect(page.getByText('Store API checkout')).toBeVisible();
  await expect(page.getByLabel('Email')).toHaveValue('customer@example.com');

  await page.getByRole('button', { name: 'Create WooCommerce order' }).click();

  await expect(page.getByText(/Order #\d+ created/)).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByText(/Status:/)).toBeVisible();
});

test('cart controls update quantity and remove an item', async ({ page }) => {
  await page.goto('/');

  const firstProduct = page.locator('.product-card').first();
  const productName = (await firstProduct.getByRole('heading', { level: 2 }).textContent())?.trim();

  expect(productName).toBeTruthy();

  await firstProduct.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page.locator('.cart-count')).toHaveText('1');

  await page.getByRole('button', { name: `Increase ${productName} quantity` }).click();
  await expect(page.locator('.cart-count')).toHaveText('2');

  await page.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('.cart-count')).toHaveText('0');
  await expect(page.getByText('Add a seeded product to exercise the WooCommerce Store API session.')).toBeVisible();
});
