#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Static audit — no dependencies, no browser.

     node tools/audit.js

   Catches the mistakes that are invisible until someone opens the
   page: an unbalanced brace swallowing half the stylesheet, a class in
   the markup with no rule, a translation key that exists in one locale
   and not another, an icon the manifest points at but which was never
   generated.

   Exits 1 on any failure so it can gate a commit.
   ══════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const html = read('index.html');
const css = read('styles.css');
const app = read('app.js');
const i18n = read('i18n.js');

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

/* ───────────────────────── CSS integrity ───────────────────────── */

{
  let depth = 0;
  let min = 0;
  for (const ch of css.replace(/\/\*[\s\S]*?\*\//g, '')) {
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth < min) min = depth;
    }
  }
  check('CSS braces balanced', depth === 0, `final depth ${depth}`);
  check('CSS never closes below zero', min === 0, `min ${min}`);
  check('no empty declarations', !/:\s*;/.test(css));

  const declared = new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map(m => m[1]));
  const used = new Set([...css.matchAll(/var\((--[a-z0-9-]+)/g)].map(m => m[1]));
  const missing = [...used].filter(v => !declared.has(v));
  check('all CSS variables declared', missing.length === 0, missing.join(', '));

  // color-mix() has no fallback in old browsers, so every use needs a
  // solid declaration directly above it.
  const gradMix = [...css.matchAll(/background:\s*linear-gradient\([^;]*color-mix/g)].length;
  const solids = [...css.matchAll(/background:\s*var\(--[\w-]+\);\s*\n\s*background:\s*linear-gradient/g)].length;
  check('every color-mix gradient has a solid fallback', gradMix <= solids, `${gradMix} gradients, ${solids} fallbacks`);
}

/* ─────────────────── class cross-reference ─────────────────── */

{
  const cssClasses = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map(m => m[1]));
  const used = new Set();
  for (const m of (html + app).matchAll(/class="([^"]*)"/g)) {
    // Interpolated lists are dynamic; their static fragments are covered
    // by the `critical` list below.
    if (m[1].includes('${')) continue;
    m[1].split(/\s+/).filter(Boolean).forEach(c => used.add(c));
  }
  const orphans = [...used].filter(c => !cssClasses.has(c));
  check('every markup class has styles', orphans.length === 0, orphans.join(', '));

  const critical = [
    'brand-avatar', 'doctor', 'doctor-badge', 'doctor-crest', 'doctor-photo',
    'doctor-id', 'doctor-name', 'doctor-role',
    'service-card', 'sc-icon', 'sc-body', 'sc-side', 'sc-title', 'sc-price', 'sc-dur',
    'date-chip', 'slot', 'sheet', 'sheet-cta', 'sticky-bar', 'toast', 'ticket', 'stepper',
  ];
  const miss = critical.filter(c => !cssClasses.has(c));
  check('critical component classes styled', miss.length === 0, miss.join(', '));

  // Nothing should still reference the old SVG header tile.
  check('no dead .brand-mark rules', !cssClasses.has('brand-mark'));
}

/* ─────────────────────── responsive ─────────────────────── */

{
  const bps = [...css.matchAll(/@media \(min-width:\s*(\d+)px\)/g)].map(m => Number(m[1]));
  check('breakpoints ascending', bps.join() === [...bps].sort((a, b) => a - b).join(), bps.join(', '));

  // Any element width over 300px would overflow a 320px phone.
  const wide = [...css.matchAll(/(?<![-\w])width:\s*(\d{3,})px/g)]
    .map(m => Number(m[1]))
    .filter(n => n > 300);
  check('no element wider than 300px', wide.length === 0, wide.join(', '));

  const cssNoMedia = css.replace(/@media[^{]*/g, '');
  check('no element min-width above 320px', !/min-width:\s*(3[2-9]\d|[4-9]\d\d)px/.test(cssNoMedia));

  check('inputs are 16px (no iOS zoom)', /\.field input\s*\{[^}]*font-size:\s*16px/.test(css));
  check('safe-area bottom used', /env\(safe-area-inset-bottom/.test(css));
  check('hidden attribute enforced', /\[hidden\]\s*\{\s*display:\s*none\s*!important/.test(css));
  check('images crop rather than squash', css.includes('object-fit: cover'));
}

/* ───────────────────────── i18n parity ───────────────────────── */

{
  const sandbox = { window: {} };
  new Function('window', i18n)(sandbox.window);
  const dicts = sandbox.window.I18N;

  check('3 locales defined', Object.keys(dicts).length === 3, Object.keys(dicts).join(', '));

  const flatten = (o, p = '', r = {}) => {
    for (const [k, v] of Object.entries(o)) {
      const key = p ? `${p}.${k}` : k;
      if (v && typeof v === 'object') flatten(v, key, r);
      else r[key] = v;
    }
    return r;
  };
  const maps = Object.fromEntries(Object.entries(dicts).map(([id, d]) => [id, flatten(d)]));
  const base = Object.keys(maps['ar-EG']);

  for (const id of Object.keys(maps)) {
    const keys = Object.keys(maps[id]);
    const missing = base.filter(k => !keys.includes(k));
    const extra = keys.filter(k => !base.includes(k));
    check(`[${id}] key parity with ar-EG`,
      missing.length === 0 && extra.length === 0,
      `missing: ${missing.slice(0, 4).join(',')} extra: ${extra.slice(0, 4).join(',')}`);

    const empty = keys.filter(k => !String(maps[id][k]).trim());
    check(`[${id}] no empty strings`, empty.length === 0, empty.slice(0, 4).join(', '));
  }

  // A key referenced from the markup or JS that no dictionary defines
  // renders as the literal string "undefined".
  const refs = new Set([
    ...[...html.matchAll(/data-i18n(?:-html|-alt)?="([^"]+)"/g)].map(m => m[1]),
    ...[...app.matchAll(/\bt\('([a-z0-9_.]+)'/gi)].map(m => m[1]),
  ]);
  const missingRefs = [...refs].filter(k => !base.includes(k));
  check('all referenced keys exist', missingRefs.length === 0, missingRefs.join(', '));

  // {year} in one locale and {yr} in another silently prints the wrong thing.
  const vars = s => [...String(s).matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
  const mismatch = base.filter(k =>
    vars(maps['ar-EG'][k]) !== vars(maps['en'][k]) || vars(maps['ar-EG'][k]) !== vars(maps['ar-SA'][k]));
  check('placeholders consistent', mismatch.length === 0, mismatch.slice(0, 4).join(', '));
}

/* ─────────────────────── assets on disk ─────────────────────── */

{
  // Every src/srcset href in the markup must exist.
  const refs = new Set();
  for (const m of html.matchAll(/(?:src|href)="([^"#?][^"]*)"/g)) {
    const v = m[1];
    if (/^(https?:|mailto:|tel:|data:)/.test(v)) continue;
    refs.add(v.startsWith('/') ? v.slice(1) : v);
  }
  const missing = [...refs].filter(f => !fs.existsSync(path.join(ROOT, f)));
  check('every local asset in the markup exists', missing.length === 0, missing.join(', '));

  // srcset entries too
  const srcsetRefs = new Set();
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) {
    for (const part of m[1].split(',')) {
      const f = part.trim().split(/\s+/)[0];
      if (f) srcsetRefs.add(f);
    }
  }
  const missingSrcset = [...srcsetRefs].filter(f => !fs.existsSync(path.join(ROOT, f)));
  check('every srcset candidate exists', missingSrcset.length === 0, missingSrcset.join(', '));

  // The local server has an allowlist; a file missing from it is a 404
  // locally while working on Vercel.
  const server = read('server.js');
  const notServed = [...refs].filter(f => !server.includes(`'/${f}'`));
  check('server allowlist covers the markup', notServed.length === 0, notServed.join(', '));

  const manifest = JSON.parse(read('manifest.webmanifest'));
  const badIcons = (manifest.icons || [])
    .map(i => i.src)
    .filter(src => !fs.existsSync(path.join(ROOT, src)));
  check('all manifest icons exist', badIcons.length === 0, badIcons.join(', '));
}

/* ─────────────────────────── report ─────────────────────────── */

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}${!r.ok && r.detail ? `   [${r.detail}]` : ''}`);
}
console.log(`\n  ${results.length - failed}/${results.length} passed${failed ? ` — ${failed} FAILED` : ''}\n`);
process.exit(failed ? 1 : 0);
