#!/usr/bin/env node
/**
 * Playwright capture script for the extract-design skill.
 *
 * Usage:
 *   node scripts/playwright-capture.mjs <url> <output-dir> [brand-slug]
 *
 * output-dir is typically: .extract-design/<brand-slug>
 * brand-slug is optional — derived from the URL hostname when omitted.
 *
 * Prerequisites:
 *   npx playwright install chromium
 */

import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { URL } from 'url';

const [,, rawUrl, rawOutputDir, explicitSlug] = process.argv;

if (!rawUrl || !rawOutputDir) {
  console.error('Usage: node scripts/playwright-capture.mjs <url> <output-dir> [brand-slug]');
  process.exit(1);
}

function slugFromUrl(urlStr) {
  try {
    const { hostname } = new URL(urlStr);
    return hostname
      .replace(/^www\./, '')
      .split('.')[0]
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
  } catch {
    return 'unknown-brand';
  }
}

// ── Configuration ─────────────────────────────────────────────────────────────

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet',  width: 768,  height: 1024 },
  { name: 'mobile',  width: 375,  height: 812 },
];

const SCROLL_STOPS = [0, 25, 50, 75, 100];

// Ordered by likelihood of finding an element — first match wins per label
const HOVER_TARGETS = [
  {
    label: 'cta-primary',
    selector: [
      'a[href*="sign-up"]', 'a[href*="signup"]', 'a[href*="get-started"]',
      'a[href*="try"]', 'a[href*="start"]', 'button[type="submit"]',
      '[class*="btn-primary"]', '[class*="button-primary"]',
    ].join(', '),
  },
  {
    label: 'nav-link',
    selector: 'nav a, header nav a, [role="navigation"] a',
  },
  {
    label: 'card',
    selector: '[class*="card"] a, [class*="Card"] a, article a',
  },
  {
    label: 'input',
    selector: 'input[type="text"], input[type="email"], input[type="search"]',
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadPage(browser, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  // Extra settle time for JS-driven layout (hero animations, web fonts)
  await page.waitForTimeout(1000);
  return page;
}

async function scrollTo(page, percent) {
  await page.evaluate((p) => {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.round(maxScroll * p / 100), behavior: 'instant' });
  }, percent);
  // Let scroll-triggered animations (IntersectionObserver, GSAP ScrollTrigger) settle
  await page.waitForTimeout(500);
}

// ── Stage B: DOM analysis ─────────────────────────────────────────────────────

async function extractDOMData(page) {
  return page.evaluate(() => {
    // 1. CSS custom properties from all accessible stylesheets
    const cssVars = {};
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          const matches = [...(rule.cssText || '').matchAll(/--([\w-]+)\s*:\s*([^;}\n]+)/g)];
          for (const [, name, value] of matches) {
            cssVars[`--${name}`] = value.trim();
          }
        }
      } catch {
        // Cross-origin sheet — inaccessible, expected
      }
    }

    // 2. Loaded font faces
    const fontFamilies = [...document.fonts].map(f => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status,
    }));

    // 3. Script srcs — used for motion library detection in Phase 1
    const scriptSrcs = [...document.querySelectorAll('script[src]')].map(s => s.src);

    // 4. Sampled computed styles — feeds Phase 2 token extraction
    const sampleMap = {
      'h1':            'h1',
      'h2':            'h2',
      'h3':            'h3',
      'body-text':     'p',
      'button-primary':'button, [role="button"]',
      'nav-link':      'nav a',
      'card':          '[class*="card"], [class*="Card"], article',
      'input':         'input[type="text"], input[type="email"]',
      'link-inline':   'p a, main a',
    };
    const computedStyles = {};
    for (const [label, selector] of Object.entries(sampleMap)) {
      const el = document.querySelector(selector);
      if (!el) continue;
      const s = getComputedStyle(el);
      computedStyles[label] = {
        color:           s.color,
        backgroundColor: s.backgroundColor,
        fontFamily:      s.fontFamily,
        fontSize:        s.fontSize,
        fontWeight:      s.fontWeight,
        lineHeight:      s.lineHeight,
        letterSpacing:   s.letterSpacing,
        borderRadius:    s.borderRadius,
        padding:         s.padding,
        margin:          s.margin,
        boxShadow:       s.boxShadow,
        border:          s.border,
        transition:      s.transition,
      };
    }

    // 5. Root-level background (often the page background token)
    const rootBg = getComputedStyle(document.documentElement).backgroundColor;

    return { cssVars, fontFamilies, scriptSrcs, computedStyles, rootBg };
  });
}

// ── Stage D: Hover state captures ────────────────────────────────────────────

async function captureHoverStates(page, screenshotsDir) {
  const results = [];
  for (const { label, selector } of HOVER_TARGETS) {
    const el = page.locator(selector).first();
    if ((await el.count()) === 0) continue;
    try {
      await el.hover({ timeout: 3000 });
      // Wait for CSS transition to settle before snapping
      await page.waitForTimeout(350);
      const p = join(screenshotsDir, `hover-${label}.png`);
      await el.screenshot({ path: p, timeout: 5000 });
      results.push({ label, path: `screenshots/hover-${label}.png` });
    } catch {
      // Element not reachable or not hoverable — skip silently
    }
  }
  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const outputDir     = resolve(rawOutputDir);
  const screenshotsDir = join(outputDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  const slug = explicitSlug || slugFromUrl(rawUrl);

  const manifest = {
    slug,
    url: rawUrl,
    capturedAt: new Date().toISOString(),
    outputDir: outputDir,
    screenshots: {},
    domData: null,
    hoverStates: [],
  };

  const browser = await chromium.launch();
  try {
    // ── Stage A: Initial load + all-viewport fold + full-page screenshots ──
    console.log('\n[Stage A] Viewport captures…');
    for (const { name, width, height } of VIEWPORTS) {
      console.log(`  ${name} (${width}×${height})`);
      const page = await loadPage(browser, rawUrl, width, height);

      const foldPath = join(screenshotsDir, `${name}-fold.png`);
      const fullPath = join(screenshotsDir, `${name}-full.png`);
      await page.screenshot({ path: foldPath, fullPage: false });
      await page.screenshot({ path: fullPath, fullPage: true });

      manifest.screenshots[name] = {
        fold: `screenshots/${name}-fold.png`,
        full: `screenshots/${name}-full.png`,
      };
      await page.close();
    }

    // Open a persistent desktop page for Stages B–D
    console.log('\n[Stage B] DOM analysis…');
    const page = await loadPage(browser, rawUrl, 1440, 900);
    manifest.domData = await extractDOMData(page);
    console.log(`  CSS vars: ${Object.keys(manifest.domData.cssVars).length} found`);
    console.log(`  Fonts: ${manifest.domData.fontFamilies.length} loaded`);
    console.log(`  Scripts: ${manifest.domData.scriptSrcs.length} detected`);

    // ── Stage C: Scroll traversal ─────────────────────────────────────────
    console.log('\n[Stage C] Scroll traversal…');
    for (const pct of SCROLL_STOPS) {
      await scrollTo(page, pct);
      const p = join(screenshotsDir, `scroll-${pct}.png`);
      await page.screenshot({ path: p });
      manifest.screenshots[`scroll-${pct}pct`] = `screenshots/scroll-${pct}.png`;
      console.log(`  scroll ${pct}% captured`);
    }

    // ── Stage D: Hover states ─────────────────────────────────────────────
    console.log('\n[Stage D] Hover state captures…');
    await scrollTo(page, 0); // reset scroll before hover capture
    manifest.hoverStates = await captureHoverStates(page, screenshotsDir);
    console.log(`  ${manifest.hoverStates.length} hover state(s) captured`);

    await page.close();
  } finally {
    await browser.close();
  }

  // ── Stage E: Write manifest ───────────────────────────────────────────────
  console.log('\n[Stage E] Writing manifest…');
  const manifestPath = join(outputDir, 'capture-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n✓  Capture complete`);
  console.log(`   Manifest  → ${manifestPath}`);
  console.log(`   Screenshots → ${screenshotsDir}`);
  console.log(`   Brand slug  → ${slug}`);
}

main().catch(err => {
  console.error('\n✗  Capture failed:', err.message);
  process.exit(1);
});
