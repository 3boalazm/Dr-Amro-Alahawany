#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Behaviour check — runs the real app in a DOM and walks the flow.

     node server.js &          # the check talks to the live server
     node tools/ui-check.js

   Requires jsdom (devDependency only; the deployed site has none).
   Covers: boot, the four booking steps, validation, all three
   locales, both themes, and the PWA install sheet.
   ══════════════════════════════════════════════════════════════ */

const fs = require('node:fs');
const path = require('node:path');

let JSDOM;
try {
  ({ JSDOM } = require('jsdom'));
} catch {
  console.error('\n  jsdom مش مثبّت.  npm install\n');
  process.exit(2);
}

const ROOT = path.join(__dirname, '..');
const BASE = process.argv[2] || 'http://localhost:4173';
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

  const dom = new JSDOM(read('index.html'), {
    url: BASE,
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const { window } = dom;

  window.scrollTo = () => {};
  window.fetch = (u, o) => fetch(new URL(u, BASE).toString(), o);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  // jsdom has no matchMedia or serviceWorker; the app must tolerate both.
  window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });

  const errors = [];
  window.addEventListener('error', e => errors.push(e.message));

  window.eval(read('i18n.js'));
  window.eval(read('install.js'));
  window.eval(read('app.js') + '\nwindow.__state = state;');

  const $ = s => window.document.querySelector(s);
  const $$ = s => [...window.document.querySelectorAll(s)];
  const out = [];
  const check = (n, ok, d = '') => out.push({ n, ok: !!ok, d });
  const st = () => window.__state;

  await sleep(300);
  if (!st() || !st().services.length) window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await sleep(900);

  /* ── boot ── */
  check('app boots with 5 services', $$('.service-card').length === 5, `${$$('.service-card').length}`);
  check('no runtime errors on boot', errors.length === 0, errors.join(' | '));

  /* ── header ── */
  check('one pill wraps the whole header', !!$('.nav-pill'));
  check('header renders exactly one pill', $$('.nav-pill').length === 1, `${$$('.nav-pill').length}`);

  const avatar = $('.brand-avatar img');
  check('header shows the portrait', !!avatar);
  check('header avatar has a 2x source', (avatar?.getAttribute('srcset') || '').includes('2x'));
  check('header avatar is decorative (empty alt)', avatar?.getAttribute('alt') === '');
  check('old SVG tile is gone', !$('.brand-mark'));

  // The bug that shipped: <picture> is inline, so the logo rendered at its
  // intrinsic 96px and spilled out of the bar.
  const frame = $('.brand-avatar');
  check('avatar frame is a block, not a <picture>', frame?.tagName === 'SPAN', frame?.tagName);
  check('avatar frame owns the sizing', !frame?.querySelector(':scope > picture[style]'));

  check('brand name localised', $('.brand-text strong').textContent.trim().length > 3,
    $('.brand-text strong').textContent);
  check('CTA sits inside the pill', !!$('.nav-pill .nav-cta'));
  check('CTA is a real phone link', ($('.nav-cta')?.getAttribute('href') || '').startsWith('tel:'),
    $('.nav-cta')?.getAttribute('href'));
  check('CTA keeps an accessible label', $('.nav-cta').textContent.trim().length > 0,
    $('.nav-cta').textContent.trim());
  check('theme button inside the pill', !!$('.nav-pill #themeBtn'));
  check('language picker inside the pill', !!$('.nav-pill #langSelect'));
  check('install button inside the pill', !!$('.nav-pill #installBtn'));
  check('hero portrait present', !!$('.doctor-photo img'));
  check('hero portrait has srcset', !!$('.doctor-photo img')?.getAttribute('srcset'));
  check('hero credential crest present', !!$('.doctor-crest svg'));
  check('hero name localised', $('.doctor-name').textContent === 'أ.د. عمرو الأهواني', $('.doctor-name').textContent);
  check('hero role localised', $('.doctor-role').textContent.includes('جامعة القاهرة'), $('.doctor-role').textContent);
  check('hero alt localised', $('.doctor-photo img').alt === 'صورة أ.د. عمرو الأهواني', $('.doctor-photo img').alt);

  /* ── PWA ── */
  check('install sheet starts closed', $('#installSheet').hidden === true);
  check('window.PWA exposed', !!window.PWA);
  check('PWA.isStandalone works', window.PWA.isStandalone() === false);
  // jsdom offers no native install prompt and is not iOS, so there is
  // nothing the button could do and it must stay out of the way.
  check('install button hidden when not actionable', $('#installBtn').hidden === true);

  /* ── install sheet ──
     Dispatching on a hidden button is deliberate: it exercises the manual
     instructions path, which is what iOS users get. */
  $('#installBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  check('tapping install opens the sheet', $('#installSheet').hidden === false);
  check('sheet lists 3 steps', $$('#installSteps li').length === 3, `${$$('#installSteps li').length}`);
  check('body scroll locked while open', window.document.body.style.overflow === 'hidden');
  $('#installClose').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  check('closing restores scrolling', window.document.body.style.overflow === '');

  $('#installBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(120);
  window.document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await sleep(120);
  check('Escape closes the sheet', $('#installSheet').hidden === true);

  /* ── locales ── */
  check('defaults to ar-EG', st().locale === 'ar-EG', st().locale);
  check('defaults to light theme', window.document.documentElement.dataset.theme === 'light');

  $('#langSelect').value = 'ar-SA';
  $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(350);
  check('switch to Gulf', st().locale === 'ar-SA');
  check('Gulf hero copy', $('.hero h1').textContent.includes('موعدك عندنا'), $('.hero h1').textContent.trim());

  $('#langSelect').value = 'en';
  $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(350);
  check('switch to English', st().locale === 'en');
  check('dir flips to ltr', window.document.documentElement.dir === 'ltr');
  check('doctor name in English', $('.doctor-name').textContent === 'Prof. Dr. Amro Alahawany', $('.doctor-name').textContent);
  check('doctor alt in English', $('.doctor-photo img').alt === 'Portrait of Prof. Dr. Amro Alahawany', $('.doctor-photo img').alt);

  /* ── theme ── */
  $('#themeBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  check('dark mode applies', window.document.documentElement.dataset.theme === 'dark');
  check('theme persisted', window.localStorage.getItem('dr-theme') === 'dark');
  $('#themeBtn').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(150);
  check('back to light', window.document.documentElement.dataset.theme === 'light');

  $('#langSelect').value = 'ar-EG';
  $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(350);

  /* ── booking flow ── */
  check('next-1 disabled before choosing', $('#next1').disabled);
  $$('.service-card')[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(700);
  check('service selected', st().service && st().service.id === '1', st().service?.id);
  check('sticky bar appears', $('#stickyBar').hidden === false);

  $('#next1').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(600);
  check('step 2 reached', st().step === 2);
  check('slots rendered', $$('.slot').length > 0, `${$$('.slot').length}`);
  check('busy slots disabled', $$('.slot[disabled]').length > 0, `${$$('.slot[disabled]').length}`);
  check('next-2 disabled without a time', $('#next2').disabled);

  const chips = $$('.date-chip').filter(c => !c.disabled);
  if (chips.length > 1) {
    $$('.slot').find(s => !s.disabled)?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(120);
    check('time chosen', !!st().time, String(st().time));
    chips[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await sleep(500);
    check('changing day clears the time', st().time === null, String(st().time));
    check('next-2 disabled again', $('#next2').disabled);
  }

  $$('.slot').find(s => !s.disabled)?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(120);
  $('#next2').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await sleep(600);
  check('step 3 reached', st().step === 3);

  /* ── validation ── */
  $('#detailsForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(300);
  check('empty form is blocked', st().step === 3);
  check('name error shown', $('[data-err="firstName"]').textContent.length > 0);
  check('consent error shown', $('[data-err="consent"]').textContent.length > 0);

  $('#firstName').value = 'أحمد';
  $('#phone').value = '12345';
  $('#detailsForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(300);
  check('short phone rejected', $('[data-err="phone"]').textContent.includes('11'));

  /* ── confirmation ── */
  $('#phone').value = '01012345678';
  $('#consent').checked = true;
  $('#detailsForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await sleep(1000);

  check('reached confirmation', st().step === 4, String(st().step));
  const ref = $('#refCode').textContent;
  check('reference generated', /^[A-Z]{2}-\d{4}$/.test(ref), ref);
  check('sticky bar hidden on confirmation', $('#stickyBar').hidden === true);
  check('whatsapp link built', $('#whatsappBtn').href.startsWith('https://wa.me/201200055755?text='));

  $('#langSelect').value = 'en';
  $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
  await sleep(350);
  check('confirmation translated', $('.panel-success h2').textContent === 'Booking confirmed', $('.panel-success h2').textContent);
  check('booking data survives locale change', $('#sumService').textContent.includes('First consultation'), $('#sumService').textContent);

  /* ── report ── */
  if (errors.length) console.log('\n  runtime errors:', errors);

  let failed = 0;
  for (const r of out) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.n}${!r.ok && r.d ? `   [${r.d}]` : ''}`);
  }
  console.log(`\n  ${out.length - failed}/${out.length} passed${failed ? ` — ${failed} FAILED` : ''}\n`);
  process.exit(failed ? 1 : 0);
})();
