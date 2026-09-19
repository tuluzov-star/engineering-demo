import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const baseURL = process.env.PORTFOLIO_BASE_URL ?? 'http://127.0.0.1:3001';
const outputDir = path.resolve(process.cwd(), 'portfolio-video');
const rawVideo = path.join(outputDir, 'engineering-demo.webm');

await fs.rm(outputDir, { recursive: true, force: true });
await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: outputDir,
    size: { width: 1280, height: 720 },
  },
  colorScheme: 'dark',
});
const page = await context.newPage();
const video = page.video();

if (!video) {
  throw new Error('Playwright video recording did not start.');
}

async function pause(milliseconds = 700) {
  await page.waitForTimeout(milliseconds);
}

async function caption(title, detail, milliseconds = 1450) {
  await page.evaluate(
    ({ title, detail }) => {
      document.querySelector('#engineering-demo-caption')?.remove();

      const overlay = document.createElement('div');
      overlay.id = 'engineering-demo-caption';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.innerHTML = `
        <strong>${title}</strong>
        <span>${detail}</span>
      `;
      Object.assign(overlay.style, {
        position: 'fixed',
        zIndex: '2147483647',
        left: '28px',
        bottom: '28px',
        display: 'grid',
        gap: '5px',
        maxWidth: '520px',
        padding: '16px 18px',
        border: '1px solid rgba(121, 212, 255, 0.45)',
        borderRadius: '14px',
        background: 'rgba(5, 10, 16, 0.92)',
        color: '#f7f9fc',
        boxShadow: '0 18px 50px rgba(0, 0, 0, 0.34)',
        backdropFilter: 'blur(14px)',
        fontFamily: 'Inter, system-ui, sans-serif',
        pointerEvents: 'none',
      });

      const strong = overlay.querySelector('strong');
      const span = overlay.querySelector('span');

      Object.assign(strong.style, {
        color: '#79d4ff',
        fontSize: '15px',
        letterSpacing: '-0.01em',
      });

      Object.assign(span.style, {
        color: '#c5d0dc',
        fontSize: '12px',
        lineHeight: '1.5',
      });

      document.body.appendChild(overlay);
    },
    { title, detail },
  );

  await pause(milliseconds);
  await page.evaluate(() => {
    document.querySelector('#engineering-demo-caption')?.remove();
  });
  await pause(250);
}

try {
  await page.goto(baseURL, { waitUntil: 'networkidle' });
  await page.getByText('Backend connected').waitFor();
  await pause(800);

  await caption(
    'WordPress × WooCommerce × Next.js',
    'Production Docker target · headless Store API commerce · HPOS',
    1750,
  );

  await page.locator('#architecture').scrollIntoViewIfNeeded();
  await pause(700);
  await caption(
    'Clear application boundaries',
    'Browser → Next.js BFF → WooCommerce Store API → HPOS',
  );

  await page.locator('#commerce').scrollIntoViewIfNeeded();
  await pause(700);

  await page.getByRole('button', { name: 'Add to cart' }).first().click();
  await page.locator('.cart-count').filter({ hasText: '1' }).waitFor();
  await pause(500);

  await page.getByRole('button', { name: /^Increase .* quantity$/ }).first().click();
  await page.locator('.cart-count').filter({ hasText: '2' }).waitFor();
  await caption(
    'Cart mutations stay behind the BFF',
    'HttpOnly Cart-Token · bounded JSON · validation · rate limits',
  );

  await page.getByRole('button', { name: 'Continue to demo checkout' }).click();
  await page.getByText('Store API checkout').waitFor();
  await pause(650);
  await caption(
    'WooCommerce remains authoritative',
    'Next.js validates input early; WooCommerce creates the real order.',
  );

  await page.getByRole('button', { name: 'Create WooCommerce order' }).click();
  await page.getByText(/Order #\d+ created/).waitFor({ timeout: 15_000 });
  await pause(900);

  await caption(
    'Order created with HPOS enabled',
    'Verified by PHPUnit · Vitest · Docker smoke · Playwright · axe · performance budgets',
    2200,
  );

  await pause(500);
} finally {
  await page.close();
  await context.close();
  await browser.close();
}

const recordedPath = await video.path();
await fs.rename(recordedPath, rawVideo);

const stats = await fs.stat(rawVideo);
console.log(
  JSON.stringify(
    {
      status: 'ok',
      baseURL,
      output: rawVideo,
      bytes: stats.size,
    },
    null,
    2,
  ),
);
