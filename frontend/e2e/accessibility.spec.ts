import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

async function expectNoAccessibilityViolations(page: Parameters<typeof AxeBuilder>[0]['page']) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(
    results.violations,
    results.violations
      .map((violation) => `${violation.id}: ${violation.help}`)
      .join('\n'),
  ).toEqual([]);
}

test('public catalogue has no automated WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Backend connected')).toBeVisible();

  await expectNoAccessibilityViolations(page);
});

test('open checkout has no automated WCAG A/AA violations', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await expect(page.locator('.cart-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Continue to demo checkout' }).click();
  await expect(page.getByText('Store API checkout')).toBeVisible();

  await expectNoAccessibilityViolations(page);
});
