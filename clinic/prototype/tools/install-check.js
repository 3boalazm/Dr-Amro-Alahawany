#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Android / PWA install-readiness check — no dependencies, no browser.

     node tools/install-check.js

   Chrome installs a web app only when a long list of small conditions
   all hold at once, and when one of them is missing the install button
   simply never appears — no error, no clue. This walks the list
   against the files on disk so "it doesn't install" has an answer
   before it reaches a patient's phone.

   Exits 1 on any failure so it can gate a commit.
   ══════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const exists = f => fs.existsSync(path.join(ROOT, f));

const PAGES = ['index.html', 'booking.html', 'clinic.html', 'about.html', 'studio.html', 'privacy.html'];
/* Documents rather than app screens: they still carry the manifest so the
   browser keeps offering the install, but they load no app scripts. */
const DOCS = ['dossier.html'];

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

/* Advisory only: a value that cannot exist until a human runs the first
   Android build. Reported, never fatal — a permanently red check teaches
   people to ignore the whole suite. */
const advisories = [];
const advise = (name, ok, detail = '') => advisories.push({ name, ok: !!ok, detail });

/* ───────────────────────── the manifest ───────────────────────── */

const manifest = JSON.parse(read('manifest.webmanifest'));

check('manifest is valid JSON', true);
check('name is set', typeof manifest.name === 'string' && manifest.name.trim().length > 0);
check(
  'short_name fits an Android launcher (≤12 chars)',
  typeof manifest.short_name === 'string' && manifest.short_name.length <= 12,
  `${(manifest.short_name || '').length}`,
);
check('id is set and root-relative', manifest.id === '/', manifest.id);
check('start_url is set', typeof manifest.start_url === 'string' && manifest.start_url.length > 0);
check('scope is root', manifest.scope === '/', manifest.scope);
check(
  'start_url sits inside scope',
  (manifest.start_url || '/').startsWith(manifest.scope || '/'),
  `${manifest.start_url} vs ${manifest.scope}`,
);
check(
  'display is standalone',
  manifest.display === 'standalone' ||
    (manifest.display_override || []).includes('standalone'),
  manifest.display,
);
check('dir is declared', manifest.dir === 'rtl' || manifest.dir === 'ltr', manifest.dir);
check('lang is declared', !!manifest.lang, manifest.lang);
check(
  'background_color is a hex colour',
  /^#[0-9a-f]{6}$/i.test(manifest.background_color || ''),
  manifest.background_color,
);
check(
  'theme_color is a hex colour',
  /^#[0-9a-f]{6}$/i.test(manifest.theme_color || ''),
  manifest.theme_color,
);
check(
  'prefer_related_applications is false',
  manifest.prefer_related_applications === false,
  String(manifest.prefer_related_applications),
);
check(
  'launch_handler keeps one window',
  manifest.launch_handler?.client_mode === 'navigate-existing',
  JSON.stringify(manifest.launch_handler),
);

/* ───────────────────────── the icons ───────────────────────── */

const icons = manifest.icons || [];
const sizes = new Set(icons.map(i => i.sizes));
check('192×192 icon declared', sizes.has('192x192'));
check('512×512 icon declared', sizes.has('512x512'));
check('maskable icon declared (Android adaptive)', icons.some(i => i.purpose === 'maskable'));
check('every icon is a PNG', icons.every(i => i.type === 'image/png'));

/* Read the real pixel size out of each PNG's IHDR — a mislabelled file
   is the classic reason Chrome silently refuses to install. */
function pngSize(file) {
  const buf = fs.readFileSync(path.join(ROOT, file));
  const signature = buf.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), bytes: buf.length };
}

const badDims = [];
const tooBig = [];
const missing = [];
for (const icon of icons) {
  if (!exists(icon.src)) {
    missing.push(icon.src);
    continue;
  }
  const [w, h] = icon.sizes.split('x').map(Number);
  const real = pngSize(icon.src);
  if (!real || real.w !== w || real.h !== h) badDims.push(`${icon.src} → ${real ? `${real.w}×${real.h}` : 'not a PNG'}`);
  if (real && real.bytes > 200 * 1024) tooBig.push(`${icon.src} (${Math.round(real.bytes / 1024)}KB)`);
}
check('every manifest icon exists on disk', missing.length === 0, missing.join(', '));
check('icon pixels match their declared sizes', badDims.length === 0, badDims.join(', '));
check('icons stay under 200KB', tooBig.length === 0, tooBig.join(', '));

/* ───────────────────────── shortcuts ───────────────────────── */

const shortcuts = manifest.shortcuts || [];
check('launcher shortcuts declared', shortcuts.length > 0 && shortcuts.length <= 4, `${shortcuts.length}`);
check(
  'every shortcut points inside the app',
  shortcuts.filter(s => s.url.startsWith('/') && !s.url.startsWith('//')).length ===
    shortcuts.filter(s => s.url.startsWith('/')).length,
);
const pagesInShortcuts = shortcuts.filter(s => s.url.endsWith('.html')).map(s => s.url.slice(1));
check(
  'shortcut pages exist',
  pagesInShortcuts.every(exists),
  pagesInShortcuts.filter(p => !exists(p)).join(', '),
);

/* ───────────────────── the service worker ───────────────────── */

const sw = read('sw.js');
check("service worker handles 'fetch'", /addEventListener\(\s*'fetch'/.test(sw));
check('service worker versions its cache', /\bVERSION\s*=\s*'v\d+'/.test(sw));
check('service worker calls skipWaiting', sw.includes('skipWaiting'));
check('service worker calls clients.claim', sw.includes('clients.claim'));

const uncachedPages = PAGES.filter(p => !sw.includes(`'/${p}'`));
check('all pages are precached', uncachedPages.length === 0, uncachedPages.join(', '));

const uncachedScripts = ['core.js', 'booking.js', 'i18n.js', 'install.js', 'styles.css'].filter(
  f => !sw.includes(`'/${f}'`),
);
check('all scripts are precached', uncachedScripts.length === 0, uncachedScripts.join(', '));
check('manifest itself is precached', sw.includes("'/manifest.webmanifest'"));
check('/api/ is never served from cache', sw.includes("startsWith('/api/')"));

/* ──────────────────── every page is installable ──────────────── */

for (const page of PAGES) {
  const html = read(page);
  const has = re => re.test(html);
  check(`${page} links the manifest`, has(/<link[^>]+rel="manifest"/));
  check(`${page} sets a theme-color`, has(/<meta[^>]+name="theme-color"/));
  check(`${page} declares a viewport`, has(/<meta[^>]+name="viewport"/) && has(/width=device-width/));
  check(`${page} has an apple-touch-icon`, has(/rel="apple-touch-icon"/));
  check(`${page} is web-app-capable on iOS`, has(/apple-mobile-web-app-capable/));
  check(`${page} loads the installer`, has(/src="install\.js"/));
  check(`${page} loads the shared shell`, has(/src="core\.js"/));
}

for (const doc of DOCS) {
  const html = read(doc);
  check(`${doc} links the manifest`, /<link[^>]+rel="manifest"/.test(html));
  check(`${doc} sets a theme-color`, /<meta[^>]+name="theme-color"/.test(html));
  check(`${doc} declares a viewport`, /width=device-width/.test(html));
}

/* ───────────────────── the install experience ───────────────── */

const installer = read('install.js');
check('installer captures beforeinstallprompt', installer.includes("beforeinstallprompt"));
check(
  'installer exposes the PWA surface',
  ['canInstall', 'isStandalone', 'prompt', 'isIOS'].every(k =>
    new RegExp(`\\b${k}\\b`).test(installer),
  ),
);
check('installer detects in-app browsers', installer.includes('isInAppBrowser'));
check('installer can hand off to Chrome', installer.includes('chromeIntent'));
check('installer registers the service worker', installer.includes("register('/sw.js')"));

const core = read('core.js');
check('menu carries a labelled install entry', core.includes('menuInstall'));
check('install sheet explains the in-app case', core.includes('installAlert'));
check('install sheet offers the Chrome hand-off', core.includes("mode === 'chrome'"), '');
check('install sheet offers a clipboard fallback', core.includes('installCopy'));

const i18n = read('i18n.js');
check(
  'install copy exists in all three locales',
  (i18n.match(/inAppDesc:/g) || []).length === 3 &&
    (i18n.match(/openChrome:/g) || []).length === 3 &&
    (i18n.match(/copied:/g) || []).length === 3,
);

/* ─────────────────────── deployment wiring ───────────────────── */

const vercel = JSON.parse(read('vercel.json'));
const manifestHeader = (vercel.headers || []).find(h => h.source === '/manifest.webmanifest');
check(
  'Vercel serves the manifest as application/manifest+json',
  !!manifestHeader &&
    manifestHeader.headers.some(
      h => h.key.toLowerCase() === 'content-type' && h.value.includes('application/manifest+json'),
    ),
);
check(
  'Vercel sets Service-Worker-Allowed on sw.js',
  (vercel.headers || [])
    .filter(h => h.source === '/sw.js')
    .some(h => h.headers.some(x => x.key === 'Service-Worker-Allowed')),
);
const blocked = (vercel.rewrites || []).map(r => r.source);
check(
  'Vercel does not block the manifest, the icons or assetlinks',
  !blocked.some(s => /manifest|icons|\.well-known/.test(s)),
  blocked.join(', '),
);

check('.well-known/assetlinks.json exists', exists('.well-known/assetlinks.json'));
if (exists('.well-known/assetlinks.json')) {
  let links = null;
  try {
    links = JSON.parse(read('.well-known/assetlinks.json'));
  } catch {}
  check('assetlinks.json is valid JSON', !!links);
  const entry = Array.isArray(links) ? links[0] : null;
  check(
    'assetlinks targets the clinic package',
    entry?.target?.package_name === 'com.ahwani.clinic',
    entry?.target?.package_name,
  );
  const prints = entry?.target?.sha256_cert_fingerprints || [];
  advise(
    'assetlinks fingerprint filled in (needed for a TWA without an address bar)',
    Array.isArray(prints) && prints.length > 0 && prints.every(p => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p)),
    prints.length ? 'malformed fingerprint' : 'empty until the first Android build — see ANDROID.md',
  );
}

const twa = JSON.parse(read('twa-manifest.json'));
check('twa-manifest packageId matches assetlinks', twa.packageId === (JSON.parse(read('.well-known/assetlinks.json'))[0]?.target?.package_name));
check('twa-manifest points at the live host', typeof twa.host === 'string' && twa.host.includes('.'));
check('twa-manifest startUrl is root', twa.startUrl === '/');
check('twa-manifest has a version code', Number.isInteger(twa.appVersionCode) && twa.appVersionCode > 0);

/* The local server mirrors Vercel; a file it cannot serve is a file the
   install flow cannot be tested against locally. */
const server = read('server.js');
check('local server serves the manifest', server.includes("'/manifest.webmanifest'"));
check('local server serves the icons', server.includes("'/icons/"));
check('local server serves assetlinks', server.includes("'/.well-known/assetlinks.json'"));

/* ─────────────────────────── report ─────────────────────────── */

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}${!r.ok && r.detail ? `   [${r.detail}]` : ''}`);
}
for (const a of advisories) {
  console.log(`${a.ok ? '  ✓' : '  ○'} ${a.name}${!a.ok && a.detail ? `   [${a.detail}]` : ''}`);
}
const advNote = advisories.some(a => !a.ok) ? `, ${advisories.filter(a => !a.ok).length} advisory` : '';
console.log(
  `\n  ${results.length - failed}/${results.length} passed${advNote}${failed ? ` — ${failed} FAILED` : ''}\n`,
);
process.exit(failed ? 1 : 0);
