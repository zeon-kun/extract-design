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

// ── Helpers ───────────────────────────────────────────────────────────────────

async function loadPage(browser, url, width, height) {
  const page = await browser.newPage();
  await page.setViewportSize({ width, height });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
  await page.waitForTimeout(1000);
  return page;
}

async function scrollTo(page, percent) {
  await page.evaluate((p) => {
    const maxScroll = document.body.scrollHeight - window.innerHeight;
    window.scrollTo({ top: Math.round(maxScroll * p / 100), behavior: 'instant' });
  }, percent);
  await page.waitForTimeout(500);
}

// ── Stage B: DOM analysis ─────────────────────────────────────────────────────

async function extractDOMData(page) {
  return page.evaluate(() => {
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

    const fontFamilies = [...document.fonts].map(f => ({
      family: f.family,
      weight: f.weight,
      style: f.style,
      status: f.status,
    }));

    const scriptSrcs = [...document.querySelectorAll('script[src]')].map(s => s.src);

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

    const rootBg = getComputedStyle(document.documentElement).backgroundColor;

    return { cssVars, fontFamilies, scriptSrcs, computedStyles, rootBg };
  });
}

// ── Stage D: Dynamic atom discovery ──────────────────────────────────────────
// Discovers interactive atoms (buttons, links, inputs, badges) by structural
// and visual scoring — never by class name. Works on Tailwind, CSS-in-JS,
// hashed names, and custom BEM equally.

async function discoverAtoms(page) {
  return page.evaluate(() => {
    const STOPWORDS = new Set([
      'the','a','an','of','for','and','your','to','with','our',
      'in','on','is','it','get','learn','read','click','see','view',
      'more','new','all','as','by','at','be','or','we','us',
    ]);

    const TAG_BANLIST = new Set([
      'html','body','main','nav','header','footer','aside',
      'section','form','script','style','noscript',
    ]);

    function sanitizeSlug(s) {
      return s.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 32) || null;
    }

    function topWord(el) {
      const text = (el.innerText || '').trim();
      if (text) {
        for (const word of text.split(/\s+/)) {
          const w = word.replace(/[^a-z]/gi, '').toLowerCase();
          if (w.length > 1 && !STOPWORDS.has(w)) return sanitizeSlug(w);
        }
      }
      // Fall back to aria-label on self or first SVG child
      const label = el.getAttribute('aria-label') ||
        el.querySelector('svg')?.getAttribute('aria-label') ||
        el.querySelector('title')?.textContent;
      if (label) {
        const w = label.trim().split(/\s+/)[0].replace(/[^a-z]/gi, '').toLowerCase();
        if (w.length > 1 && !STOPWORDS.has(w)) return sanitizeSlug(w);
      }
      return null;
    }

    function classifyAtom(el, s, box) {
      const tag = el.tagName.toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();

      // Native form inputs always classify directly
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return 'input';

      // Check SVG-only content for icon-button
      const hasSvgOnly = () => {
        const children = [...el.children];
        const nonSvg = children.filter(c => c.tagName.toLowerCase() !== 'svg' && c.tagName.toLowerCase() !== 'img');
        const hasSvg = children.some(c => ['svg','img'].includes(c.tagName.toLowerCase()));
        const text = (el.innerText || '').trim();
        return hasSvg && nonSvg.length === 0 && text.length === 0;
      };

      const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
      const hasRadius = parseFloat(s.borderRadius) > 0;
      const hasPad = (() => {
        const pt = parseFloat(s.paddingTop), pb = parseFloat(s.paddingBottom);
        const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight);
        return Math.max(pt, pb, pl, pr) >= 4;
      })();

      // pill / pill-link: very round radius
      const rVal = parseFloat(s.borderRadius);
      if (rVal >= 999 || (box.height > 0 && rVal / box.height >= 0.45)) {
        return (tag === 'a' || role === 'link') ? 'pill-link' : 'pill';
      }

      // button / icon-button
      if (tag === 'button' || role === 'button') {
        return hasSvgOnly() ? 'icon-button' : 'button';
      }

      // button-link: <a> styled like a button
      if (tag === 'a' && hasBg && hasRadius && hasPad) return 'button-link';

      // link: plain <a>
      if (tag === 'a') return 'link';

      // badge / tag: small, text, bg
      if (box.width < 100 && box.height < 32 && hasBg) return 'badge';

      return 'atom';
    }

    function scoreAtom(el, s, box) {
      let score = 0;

      // Native form element — always above cutoff
      const tag = el.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return 10;

      // Native interactive with short text
      if (tag === 'a' || tag === 'button') {
        const text = (el.innerText || '').trim();
        if (text.length >= 1 && text.length <= 32) score += 2;
      }

      const pt = parseFloat(s.paddingTop), pb = parseFloat(s.paddingBottom);
      const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight);
      if (Math.max(pt, pb, pl, pr) >= 4) score += 1;
      if (parseFloat(s.borderRadius) >= 2) score += 1;

      const hasBg = s.backgroundColor !== 'rgba(0, 0, 0, 0)' && s.backgroundColor !== 'transparent';
      const hasBorder = s.borderStyle !== 'none' && parseFloat(s.borderWidth || '0') > 0;
      if (hasBg || hasBorder) score += 2;

      if (s.boxShadow && s.boxShadow !== 'none') score += 2;
      if (s.transition && s.transition !== 'none' && !s.transition.startsWith('all')) score += 1;

      // SVG/icon child in 12–32px range
      const svgChild = el.querySelector('svg, img');
      if (svgChild) {
        const svgBox = svgChild.getBoundingClientRect();
        if (svgBox.width >= 12 && svgBox.width <= 32) score += 2;
      }

      const ar = box.width / box.height;
      if (ar >= 0.3 && ar <= 8) score += 1;
      if (s.cursor === 'pointer') score += 1;

      // Sibling similarity
      const parent = el.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c !== el && c.tagName === el.tagName);
        const similarSibling = siblings.some(sib => {
          const sibBox = sib.getBoundingClientRect();
          return Math.abs(sibBox.width - box.width) / Math.max(box.width, 1) <= 0.1;
        });
        if (similarSibling) score += 2;
      }

      return score;
    }

    function passesAtomHardGates(el, s, box) {
      const tag = el.tagName.toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();

      if (box.width < 24 || box.height < 16) return false;
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (!el.offsetParent && tag !== 'body' && tag !== 'html') return false;

      // width constraint — not a full-width wrapper
      if (box.width > window.innerWidth * 0.6 || box.height > 120) {
        // Native inputs excepted
        if (tag !== 'input' && tag !== 'textarea' && tag !== 'select') return false;
      }

      // Must be interactive
      const INTERACTIVE_TAGS = new Set(['a','button','input','select','textarea']);
      const INTERACTIVE_ROLES = new Set(['button','link','checkbox','radio','switch','tab']);
      const tabIndex = parseInt(el.getAttribute('tabindex') ?? '-1', 10);
      const isInteractive =
        INTERACTIVE_TAGS.has(tag) ||
        INTERACTIVE_ROLES.has(role) ||
        tabIndex >= 0 ||
        s.cursor === 'pointer';
      if (!isInteractive) return false;

      // Has content
      const text = (el.innerText || '').trim();
      const hasSvgOrImg = !!el.querySelector('svg, img');
      if (text.length === 0 && !hasSvgOrImg && tag !== 'input' && tag !== 'select' && tag !== 'textarea') return false;

      // Not a banned container
      if (TAG_BANLIST.has(tag)) return false;

      // Not too deep in descendants (keeps it atomic)
      if (el.children.length > 8) return false;

      return true;
    }

    // Walk DOM, collect candidates
    const candidates = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    const skipUntil = new WeakSet();

    let node = walker.nextNode();
    while (node) {
      const el = node;

      // Skip nodes that are inside an already-accepted subtree
      if (skipUntil.has(el)) {
        node = walker.nextNode();
        continue;
      }

      const tag = el.tagName.toLowerCase();
      // Fast early exits
      if (['script','style','noscript','svg','path'].includes(tag)) {
        node = walker.nextNode();
        continue;
      }

      const box = el.getBoundingClientRect();
      // Skip zero-size elements cheaply
      if (box.width === 0 && box.height === 0) {
        node = walker.nextNode();
        continue;
      }

      const s = getComputedStyle(el);
      if (!passesAtomHardGates(el, s, box)) {
        node = walker.nextNode();
        continue;
      }

      const score = scoreAtom(el, s, box);
      if (score >= 4) {
        const label = classifyAtom(el, s, box);
        const tw = topWord(el);
        candidates.push({ el, score, label, topWord: tw, box });
        // Mark this subtree as handled
        const descendants = el.querySelectorAll('*');
        for (const d of descendants) skipUntil.add(d);
      }

      node = walker.nextNode();
    }

    // Sibling clustering: group by (tagName, label, roundedW, roundedH) → keep top 2
    const clusterKey = c =>
      `${c.el.tagName}|${c.label}|${Math.round(c.box.width/10)*10}|${Math.round(c.box.height/4)*4}`;
    const clusters = new Map();
    for (const c of candidates) {
      const key = clusterKey(c);
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key).push(c);
    }
    const clustered = [];
    for (const group of clusters.values()) {
      group.sort((a, b) => b.score - a.score);
      clustered.push(...group.slice(0, 2));
    }

    // Ancestor dedup: drop any candidate whose ancestor is already kept
    clustered.sort((a, b) => b.score - a.score);
    const kept = [];
    for (const c of clustered) {
      const dominated = kept.some(k => k.el.contains(c.el) || c.el.contains(k.el));
      if (!dominated) kept.push(c);
      if (kept.length >= 20) break;
    }

    // Slug + counter generation
    const slugCounters = new Map();
    const result = kept.map((c, i) => {
      const tw = c.topWord || '';
      const key = `${c.label}-${tw}`;
      const idx = slugCounters.get(key) ?? 0;
      slugCounters.set(key, idx + 1);
      const slug = sanitizeSlug(tw ? `${c.label}-${tw}-${idx}` : `${c.label}-${idx}`) || `atom-${i}`;

      // Tag element for Node-side locator binding
      c.el.setAttribute('data-xd-atom', String(i));
      c.el.setAttribute('data-xd-atom-slug', slug);

      return { index: i, slug, label: c.label, score: c.score };
    });

    return result;
  });
}

async function captureAtomStates(page, atomsMeta, screenshotsDir) {
  const results = [];
  for (const { index, slug, label, score } of atomsMeta) {
    const el = page.locator(`[data-xd-atom="${index}"]`).first();
    if ((await el.count()) === 0) continue;

    const stateFiles = {};
    try {
      await el.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(300);

      // default
      const defaultPath = join(screenshotsDir, `atom-${slug}-default.png`);
      await el.screenshot({ path: defaultPath, timeout: 5000 });
      stateFiles.default = `screenshots/atom-${slug}-default.png`;

      // hover
      try {
        await el.hover({ timeout: 3000 });
        await page.waitForTimeout(250);
        const hoverPath = join(screenshotsDir, `atom-${slug}-hover.png`);
        await el.screenshot({ path: hoverPath, timeout: 5000 });
        stateFiles.hover = `screenshots/atom-${slug}-hover.png`;
      } catch { /* not hoverable */ }

      // focus
      try {
        await el.focus({ timeout: 3000 });
        await page.waitForTimeout(250);
        const focusPath = join(screenshotsDir, `atom-${slug}-focus.png`);
        await el.screenshot({ path: focusPath, timeout: 5000 });
        stateFiles.focus = `screenshots/atom-${slug}-focus.png`;
        await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      } catch { /* not focusable */ }

    } catch (err) {
      console.log(`  atom ${slug}: skipped — ${err.message.split('\n')[0]}`);
      continue;
    }

    const states = Object.keys(stateFiles);
    results.push({ slug, label, score, states, stateFiles });
    console.log(`  ${slug} [${label}]: [${states.join(', ')}]`);
  }
  return results;
}

// ── Stage D2: Dynamic compound-component discovery ────────────────────────────
// Discovers compound interactive components (cards, feature blocks, pricing
// tiles, etc.) by structural + visual scoring — no class-name reads.

async function discoverCompoundComponents(page) {
  return page.evaluate(() => {
    const STOPWORDS = new Set([
      'the','a','an','of','for','and','your','to','with','our',
      'in','on','is','it','get','learn','read','click','see','view',
      'more','new','all','as','by','at','be','or','we','us',
    ]);

    const TAG_BANLIST = new Set([
      'html','body','main','header','footer','nav','aside','form',
      'section','script','style','svg','path','button','a','input',
      'label','img','picture','video','textarea','select','option',
      'noscript',
    ]);

    const ROLE_BANLIST = new Set([
      'navigation','banner','contentinfo','main','form','search',
    ]);

    function sanitizeSlug(s) {
      return s.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || null;
    }

    function topWord(el) {
      const heading = el.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]');
      const source = heading || el;
      const text = (source.innerText || '').trim();
      for (const word of text.split(/\s+/)) {
        const w = word.replace(/[^a-z]/gi, '').toLowerCase();
        if (w.length > 1 && !STOPWORDS.has(w)) {
          return w.slice(0, 16);
        }
      }
      // Fall back to first interactive label
      const cta = el.querySelector('a[href], button');
      if (cta) {
        const ctaText = (cta.innerText || '').trim();
        for (const word of ctaText.split(/\s+/)) {
          const w = word.replace(/[^a-z]/gi, '').toLowerCase();
          if (w.length > 1 && !STOPWORDS.has(w)) return w.slice(0, 16);
        }
      }
      return null;
    }

    function deriveRole(el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'article') return 'article';
      if (tag === 'a' || tag === 'li') {
        const interactives = el.querySelectorAll('a[href], button, [role="button"]');
        if (interactives.length >= 1) return 'tile';
      }
      if (el.querySelector('form')) return 'form-card';

      // media-card: image/picture covers >30% of element area
      const box = el.getBoundingClientRect();
      const elArea = box.width * box.height;
      const media = el.querySelector('img, picture');
      if (media) {
        const mBox = media.getBoundingClientRect();
        if ((mBox.width * mBox.height) / elArea > 0.3) return 'media-card';
      }

      // Ancestor is <li>?
      let ancestor = el.parentElement;
      for (let d = 0; d < 4 && ancestor; d++, ancestor = ancestor.parentElement) {
        if (ancestor.tagName.toLowerCase() === 'li') return 'item';
      }

      // Default: card if has heading + interactive
      const hasHeading = !!el.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]');
      const hasInteractive = !!el.querySelector('a[href], button, [role="button"]');
      if (hasHeading && hasInteractive) return 'card';

      return 'block';
    }

    const parentBgCache = new WeakMap();
    function getParentBg(el) {
      const parent = el.parentElement;
      if (!parent) return 'rgba(0, 0, 0, 0)';
      if (parentBgCache.has(parent)) return parentBgCache.get(parent);
      const bg = getComputedStyle(parent).backgroundColor;
      parentBgCache.set(parent, bg);
      return bg;
    }

    function passesHardGates(el, s, box) {
      const tag = el.tagName.toLowerCase();
      const role = (el.getAttribute('role') || '').toLowerCase();

      if (box.width < 200 || box.height < 120) return false;
      if (s.display === 'none' || s.visibility === 'hidden') return false;
      if (!el.offsetParent) return false;

      // Not viewport-filling
      if (box.width > window.innerWidth * 0.95 || box.height > window.innerHeight * 1.5) return false;

      if (TAG_BANLIST.has(tag)) return false;
      if (ROLE_BANLIST.has(role)) return false;

      // Must have interactive descendant
      if (!el.querySelector('a[href], button, [role="button"], input, [tabindex]:not([tabindex="-1"])')) return false;

      // Must have text or media
      const text = (el.innerText || '').trim();
      const hasMedia = !!el.querySelector('img, svg, picture, video');
      if (text.length < 8 && !hasMedia) return false;

      // Child count sanity
      if (el.children.length < 2 || el.children.length > 30) return false;

      return true;
    }

    function scoreComponent(el, s, box) {
      let score = 0;

      const pt = parseFloat(s.paddingTop), pb = parseFloat(s.paddingBottom);
      const pl = parseFloat(s.paddingLeft), pr = parseFloat(s.paddingRight);
      if (Math.max(pt, pb) >= 16 || Math.max(pl, pr) >= 16) score += 2;

      const hasBorder = s.borderStyle !== 'none' && parseFloat(s.borderWidth || '0') > 0;
      if (hasBorder) score += 2;

      if (s.boxShadow && s.boxShadow !== 'none') score += 3;

      const ownBg = s.backgroundColor;
      const parentBg = getParentBg(el);
      if (ownBg !== 'rgba(0, 0, 0, 0)' && ownBg !== 'transparent' && ownBg !== parentBg) score += 2;

      if (parseFloat(s.borderRadius) >= 4) score += 2;

      const ar = box.width / box.height;
      if (ar >= 0.4 && ar <= 3.5) score += 1;

      if (el.querySelector('h1,h2,h3,h4,h5,h6,[role="heading"]')) score += 2;

      const interactives = el.querySelectorAll('a[href], button, [role="button"], input, [tabindex]:not([tabindex="-1"])');
      if (interactives.length >= 2) score += 2;

      if (s.transition && s.transition !== 'none' && !s.transition.startsWith('all')) score += 2;

      const tag = el.tagName.toLowerCase();
      if (s.cursor === 'pointer' || tag === 'a' || tag === 'button') score += 1;

      // Sibling similarity
      const parent = el.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter(c => c !== el && c.tagName === el.tagName);
        const similarSibling = siblings.some(sib => {
          const sibBox = sib.getBoundingClientRect();
          return Math.abs(sibBox.width - box.width) / Math.max(box.width, 1) <= 0.1;
        });
        if (similarSibling) score += 3;
      }

      const display = s.display;
      const flexDir = s.flexDirection;
      if (display === 'grid') score += 1;
      if (display === 'flex' && (flexDir === 'column' || flexDir === 'column-reverse') && el.children.length >= 3) score += 1;

      return score;
    }

    // DOM walk
    const candidates = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    const skipUntil = new WeakSet();

    let node = walker.nextNode();
    while (node) {
      const el = node;

      if (skipUntil.has(el)) {
        node = walker.nextNode();
        continue;
      }

      const tag = el.tagName.toLowerCase();
      if (['script','style','noscript','svg','path'].includes(tag)) {
        node = walker.nextNode();
        continue;
      }

      const box = el.getBoundingClientRect();
      if (box.width < 200 || box.height < 120) {
        node = walker.nextNode();
        continue;
      }

      const s = getComputedStyle(el);
      if (!passesHardGates(el, s, box)) {
        node = walker.nextNode();
        continue;
      }

      const score = scoreComponent(el, s, box);
      if (score >= 6) {
        candidates.push({ el, score, box });
        const descendants = el.querySelectorAll('*');
        for (const d of descendants) skipUntil.add(d);
      }

      node = walker.nextNode();
    }

    // Ancestor sweep: drop nested duplicates missed by the subtree skip
    candidates.sort((a, b) => a.el.compareDocumentPosition(b.el) & 4 ? -1 : 1);
    const sweepKept = [];
    for (const c of candidates) {
      const dominated = sweepKept.some(k => k.el.contains(c.el) || c.el.contains(k.el));
      if (!dominated) sweepKept.push(c);
    }

    // Sibling clustering: group by (parent tag, el tag, rounded width) → keep top 2
    const clusterKey = c =>
      `${c.el.parentElement?.tagName}|${c.el.tagName}|${Math.round(c.box.width/20)*20}`;
    const clusters = new Map();
    for (const c of sweepKept) {
      const key = clusterKey(c);
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key).push(c);
    }
    const clustered = [];
    for (const group of clusters.values()) {
      group.sort((a, b) => b.score - a.score);
      clustered.push(...group.slice(0, 2));
    }

    // Final sort + cap at 10
    clustered.sort((a, b) => b.score - a.score);
    const final = clustered.slice(0, 10);

    // Slug + counter generation
    const slugCounters = new Map();
    return final.map((c, i) => {
      const role = deriveRole(c.el);
      const tw = topWord(c.el) || '';
      const key = `${role}-${tw}`;
      const idx = slugCounters.get(key) ?? 0;
      slugCounters.set(key, idx + 1);

      const rawSlug = tw ? `${role}-${tw}-${idx}` : `${role}-${idx}`;
      const slug = rawSlug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || `block-${i}`;

      c.el.setAttribute('data-xd-comp', String(i));
      c.el.setAttribute('data-xd-comp-slug', slug);

      return { index: i, slug, label: role, score: c.score };
    });
  });
}

const MAX_CHILD_STATES = 3;

async function captureComponentStates(page, compsMeta, screenshotsDir) {
  const results = [];

  for (const { index, slug, label, score } of compsMeta) {
    const el = page.locator(`[data-xd-comp="${index}"]`).first();
    if ((await el.count()) === 0) continue;

    const box = await el.boundingBox().catch(() => null);
    if (!box || box.width < 150 || box.height < 60) continue;

    const stateFiles = {};

    try {
      await el.scrollIntoViewIfNeeded({ timeout: 3000 });
      await page.waitForTimeout(400);

      // default
      const defaultPath = join(screenshotsDir, `comp-${slug}-default.png`);
      await el.screenshot({ path: defaultPath, timeout: 5000 });
      stateFiles.default = `screenshots/comp-${slug}-default.png`;

      // hover (container)
      await el.hover({ timeout: 3000 });
      await page.waitForTimeout(400);
      const hoverPath = join(screenshotsDir, `comp-${slug}-hover.png`);
      await el.screenshot({ path: hoverPath, timeout: 5000 });
      stateFiles.hover = `screenshots/comp-${slug}-hover.png`;

      // per-child hover
      const childLoc = el.locator('button, a[href], [role="button"]');
      const childCount = await childLoc.count();
      for (let j = 0; j < Math.min(childCount, MAX_CHILD_STATES); j++) {
        const child = childLoc.nth(j);
        const childBox = await child.boundingBox().catch(() => null);
        if (!childBox || childBox.width < 8 || childBox.height < 8) continue;
        await child.hover({ timeout: 3000 });
        await page.waitForTimeout(300);
        const childPath = join(screenshotsDir, `comp-${slug}-child${j}-hover.png`);
        await el.screenshot({ path: childPath, timeout: 5000 });
        stateFiles[`child${j}-hover`] = `screenshots/comp-${slug}-child${j}-hover.png`;
      }

      // active / pressed
      const primaryCta = el.locator('button, a[href], [role="button"]').first();
      if ((await primaryCta.count()) > 0) {
        await primaryCta.dispatchEvent('mousedown');
        await page.waitForTimeout(120);
        const activePath = join(screenshotsDir, `comp-${slug}-active.png`);
        await el.screenshot({ path: activePath, timeout: 5000 });
        stateFiles.active = `screenshots/comp-${slug}-active.png`;
        await primaryCta.dispatchEvent('mouseup');
        await page.waitForTimeout(120);
      }

      // focus
      const focusable = el.locator('a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]').first();
      if ((await focusable.count()) > 0) {
        await focusable.focus({ timeout: 3000 });
        await page.waitForTimeout(300);
        const focusPath = join(screenshotsDir, `comp-${slug}-focus.png`);
        await el.screenshot({ path: focusPath, timeout: 5000 });
        stateFiles.focus = `screenshots/comp-${slug}-focus.png`;
        await page.evaluate(() => { if (document.activeElement) document.activeElement.blur(); });
      }

      const states = Object.keys(stateFiles);
      results.push({ slug, label, score, states, stateFiles });
      console.log(`  ${slug} [${label}]: [${states.join(', ')}]`);

    } catch (err) {
      console.log(`  comp ${slug}: skipped — ${err.message.split('\n')[0]}`);
    }
  }

  return results;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const outputDir      = resolve(rawOutputDir);
  const screenshotsDir = join(outputDir, 'screenshots');
  await mkdir(screenshotsDir, { recursive: true });

  const slug = explicitSlug || slugFromUrl(rawUrl);

  const manifest = {
    slug,
    url: rawUrl,
    capturedAt: new Date().toISOString(),
    outputDir,
    screenshots: {},
    domData: null,
    atoms: [],
    componentStates: [],
  };

  const browser = await chromium.launch();
  try {
    // ── Stage A: Viewport screenshots ─────────────────────────────────────
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

    // Open a persistent desktop page for Stages B–D2
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

    // ── Stage D: Atom discovery + state capture ───────────────────────────
    console.log('\n[Stage D] Atom discovery + state capture…');
    await scrollTo(page, 0);
    console.time('[Stage D] discovery');
    const atomsMeta = await discoverAtoms(page);
    console.timeEnd('[Stage D] discovery');
    console.log(`  ${atomsMeta.length} atom(s) discovered`);
    manifest.atoms = await captureAtomStates(page, atomsMeta, screenshotsDir);
    console.log(`  ${manifest.atoms.length} atom(s) captured`);

    // ── Stage D2: Compound component discovery + state matrix ─────────────
    console.log('\n[Stage D2] Compound component discovery + state matrix…');
    await scrollTo(page, 0);
    console.time('[Stage D2] discovery');
    const compsMeta = await discoverCompoundComponents(page);
    console.timeEnd('[Stage D2] discovery');
    console.log(`  ${compsMeta.length} component(s) discovered`);
    manifest.componentStates = await captureComponentStates(page, compsMeta, screenshotsDir);
    console.log(`  ${manifest.componentStates.length} component(s) captured`);

    await page.close();
  } finally {
    await browser.close();
  }

  // ── Stage E: Write manifest ───────────────────────────────────────────────
  console.log('\n[Stage E] Writing manifest…');
  const manifestPath = join(outputDir, 'capture-manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  console.log(`\n✓  Capture complete`);
  console.log(`   Manifest    → ${manifestPath}`);
  console.log(`   Screenshots → ${screenshotsDir}`);
  console.log(`   Brand slug  → ${slug}`);
  console.log(`   Atoms       → ${manifest.atoms.length}`);
  console.log(`   Components  → ${manifest.componentStates.length}`);
}

main().catch(err => {
  console.error('\n✗  Capture failed:', err.message);
  process.exit(1);
});
