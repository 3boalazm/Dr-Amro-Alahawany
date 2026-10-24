#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Behaviour check — runs the real pages in a DOM and walks them.

     node server.js &          # the check talks to the live server
     node tools/ui-check.js

   Requires jsdom (devDependency only; the deployed site has none).
   Covers: the shell (menu, footer, theme, three locales), the home
   page, and the booking flow including going *back* to change a
   choice — the thing most easily broken by a refactor.
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
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');

const out = [];
const check = (n, ok, d = '') => out.push({ n, ok: !!ok, d });

async function mount(page, scripts = []) {
  const dom = new JSDOM(read(page), {
    url: `${BASE}/${page}`,
    pretendToBeVisual: true,
    runScripts: 'outside-only',
  });
  const { window } = dom;

  window.scrollTo = () => {};
  window.fetch = (u, o) => fetch(new URL(u, BASE).toString(), o);
  window.HTMLElement.prototype.scrollIntoView = () => {};
  // jsdom has no matchMedia, serviceWorker or history.scrollRestoration.
  window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });

  const errors = [];
  window.addEventListener('error', e => errors.push(e.message));

  window.eval(read('i18n.js'));
  window.eval(read('core.js'));
  window.eval(read('install.js'));
  for (const s of scripts) window.eval(read(s));

  // jsdom already fired DOMContentLoaded before the scripts ran.
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await sleep(900);

  return { window, errors, $: s => window.document.querySelector(s), $$: s => [...window.document.querySelectorAll(s)] };
}

const click = (window, el) => el.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

/* Waiting for a condition beats sleeping for a guessed number of
   milliseconds — the flow makes two round trips before slots appear, and a
   fixed sleep is exactly how a suite starts failing on a slow day. */
async function waitFor(fn, ms = 5000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(50);
  }
  return false;
}

(async () => {
  try {
    await fetch(BASE, { signal: AbortSignal.timeout(5000) });
  } catch {
    console.error(`\n  مفيش سيرفر على ${BASE}\n  شغّل:  node server.js\n`);
    process.exit(2);
  }

  /* ═══════════════ Home page + shared shell ═══════════════ */
  {
    const { window, errors, $, $$ } = await mount('index.html', ['home.js']);
    const doc = window.document;
    const APP = window.APP;

    check('home boots without errors', errors.length === 0, errors.join(' | '));
    check('APP is exposed', !!APP);
    check('chrome injected a header', !!$('.site-header .nav-pill'));
    check('exactly one header pill', $$('.nav-pill').length === 1, `${$$('.nav-pill').length}`);
    check('skip link comes first', doc.body.firstElementChild.classList.contains('skip-link'));
    check('skip link targets main', $('.skip-link').getAttribute('href') === '#main');

    const avatar = $('.brand-avatar img');
    check('header shows the portrait', !!avatar);
    check('avatar frame is a block span', $('.brand-avatar')?.tagName === 'SPAN');
    check('avatar has a 2x source', (avatar?.getAttribute('srcset') || '').includes('2x'));

    /* ── nav ── */
    const links = $$('.nav-link');
    check('desktop nav has 6 links', links.length === 6, `${links.length}`);
    check('nav labels are translated', links.every(l => l.textContent.trim().length > 0), links.map(l => l.textContent).join('/'));
    check('nav order is home, booking, clinic, about, privacy, studio',
      links.map(l => l.getAttribute('href')).join(',') ===
        'index.html,booking.html,clinic.html,about.html,privacy.html,studio.html',
      links.map(l => l.getAttribute('href')).join(','));
    check('current page is marked', $('.nav-link.is-active')?.getAttribute('href') === 'index.html');
    check('current page has aria-current', $('.nav-link.is-active')?.getAttribute('aria-current') === 'page');
    check('menu button exists', !!$('#menuBtn'));

    /* ── menu sheet ── */
    check('menu starts closed', $('#menuSheet').hidden === true);
    click(window, $('#menuBtn'));
    await sleep(120);
    check('menu opens', $('#menuSheet').hidden === false);
    check('menu shows 6 links', $$('.menu-link').length === 6, `${$$('.menu-link').length}`);
    check('menu marks the current page', $('.menu-link.is-active')?.getAttribute('href') === 'index.html');
    check('body scroll locked while open', doc.body.style.overflow === 'hidden');
    check('menu button reports expanded', $('#menuBtn').getAttribute('aria-expanded') === 'true');
    doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await sleep(120);
    check('Escape closes the menu', $('#menuSheet').hidden === true);
    check('scroll restored', doc.body.style.overflow === '');
    check('menu contact links present', $$('.menu-contact').length === 2);

    /* ── install sheet (still shared chrome) ── */
    check('install sheet starts closed', $('#installSheet').hidden === true);
    check('PWA helper exposed', !!window.PWA);
    // jsdom offers no native prompt and is not iOS, so there is nothing the
    // button could do and it must stay out of the way.
    check('install button hidden when not actionable', $('#installBtn').hidden === true);
    click(window, $('#installBtn'));
    await sleep(150);
    check('tapping install opens the sheet', $('#installSheet').hidden === false);
    check('sheet lists 3 steps', $$('#installSteps li').length === 3, `${$$('#installSteps li').length}`);
    check('body scroll locked while open', doc.body.style.overflow === 'hidden');
    click(window, $('#installClose'));
    await sleep(150);
    check('closing restores scrolling', doc.body.style.overflow === '');

    /* ── the home-page install card ── */
    check('home offers an install card', !!$('#installCard'));
    check('card is visible on a first visit', $('#installCard').hidden === false);
    check('card names the benefit', ($('#installCard h3')?.textContent || '').trim().length > 0);
    click(window, $('#installCardBtn'));
    await sleep(160);
    check('card opens the same install sheet', $('#installSheet').hidden === false);
    click(window, $('#installClose'));
    await sleep(140);
    click(window, $('#installCardClose'));
    await sleep(140);
    check('dismissing hides the card', $('#installCard').hidden === true);
    check('dismissal is remembered', window.localStorage.getItem('dr-install-hidden') === '1');

    /* ── install: the two Android routes ── */
    check('menu carries a labelled install row', !!$('#menuInstall'));
    check('install row is offered before install', $('#menuInstall').hidden === false);

    click(window, $('#menuInstall'));
    await sleep(160);
    check('menu install row opens the sheet', $('#installSheet').hidden === false);
    check('an ordinary browser gets manual steps', $$('#installSteps li').length === 3);
    check('copy-link fallback is offered', $('#installCopy').hidden === false);
    check('in-app warning stays hidden normally', $('#installAlert').hidden === true);

    /* WhatsApp and Instagram open links in a WebView that cannot install a
       PWA. The sheet must say so and hand over to Chrome — showing steps
       that cannot work is the bug that makes people think it is broken. */
    const realInApp = window.PWA.isInAppBrowser;
    const realIntent = window.PWA.chromeIntent;
    window.PWA.isInAppBrowser = () => true;
    window.PWA.chromeIntent = () => 'intent://example#Intent;end';

    click(window, $('#installClose'));
    await sleep(140);
    click(window, $('#menuInstall'));
    await sleep(160);
    check('an in-app WebView is called out', $('#installAlert').hidden === false);
    check('the warning explains itself', $('#installAlert').textContent.trim().length > 20);
    check('dead manual steps are removed', $$('#installSteps li').length === 0, `${$$('#installSteps li').length}`);
    check('CTA hands off to Chrome', $('#installCta').dataset.mode === 'chrome', $('#installCta').dataset.mode);
    check('CTA is labelled for the hand-off', $('#installCta').textContent.includes('Chrome'), $('#installCta').textContent);

    window.PWA.isInAppBrowser = realInApp;
    window.PWA.chromeIntent = realIntent;
    click(window, $('#installClose'));
    await sleep(140);
    click(window, $('#menuInstall'));
    await sleep(160);
    check('sheet returns to normal outside the WebView', $$('#installSteps li').length === 3);
    check('the warning is hidden again', $('#installAlert').hidden === true);
    click(window, $('#installClose'));
    await sleep(140);

    /* ── footer ── */
    check('footer rendered', !!$('.site-footer .footer-inner'));
    check('footer has the phone link', ($('.footer-links a')?.getAttribute('href') || '').startsWith('tel:'));
    check('footer year interpolated', /20\d\d/.test($('.site-footer').textContent), $('.site-footer').textContent.trim().slice(0, 40));
    check('footer links the developer page', ($('.footer-docs a')?.getAttribute('href')) === 'studio.html');
    check('footer links the research file', $$('.footer-docs a').some(a => a.getAttribute('href') === 'dossier.html'));
    check('footer carries the build credit', ($('.footer-credit a')?.textContent || '').includes('Code'));

    /* ── home content ── */
    check('hero headline present', $('.hero h1').textContent.includes('دقيقة'), $('.hero h1').textContent);
    check('hero portrait present', !!$('.doctor-photo img'));
    check('hero portrait has srcset', !!$('.doctor-photo img')?.getAttribute('srcset'));
    check('hero name localised', $('.doctor-name').textContent === 'أ.د. عمرو الأهواني', $('.doctor-name').textContent);
    check('hero has a booking CTA', $('.hero-cta .primary-btn')?.getAttribute('href') === 'booking.html');
    check('hero has a clinic CTA', $('.hero-cta .ghost-btn')?.getAttribute('href') === 'clinic.html');
    check('clinic status line filled', $('#statusLine').textContent.trim().length > 5, $('#statusLine').textContent);
    check('status line knows the day', ['open', 'closed', 'later'].includes($('#statusLine').dataset.state), $('#statusLine').dataset.state);

    const rows = $$('.svc-row');
    check('home lists 5 services', rows.length === 5, `${rows.length}`);
    check('service links preselect the visit', rows.every(r => r.getAttribute('href').startsWith('booking.html?service=')),
      rows[0]?.getAttribute('href'));
    check('service price shown', /\d/.test($('.svc-price')?.textContent || ''), $('.svc-price')?.textContent);

    /* ── theme ── */
    check('defaults to light', doc.documentElement.dataset.theme === 'light');
    check('theme label is Arabic, not "dark"',
      !/dark|light/i.test($('#themeBtn').getAttribute('aria-label')),
      $('#themeBtn').getAttribute('aria-label'));
    click(window, $('#themeBtn'));
    await sleep(120);
    check('dark mode applies', doc.documentElement.dataset.theme === 'dark');
    check('theme persisted', window.localStorage.getItem('dr-theme') === 'dark');
    check('dark label now names the light mode', $('#themeBtn').getAttribute('aria-label') === 'الوضع النهاري',
      $('#themeBtn').getAttribute('aria-label'));
    click(window, $('#themeBtn'));
    await sleep(120);
    check('back to light', doc.documentElement.dataset.theme === 'light');

    /* ── locales, rendered on the new chrome ── */
    $('#langSelect').value = 'ar-SA';
    $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
    await sleep(400);
    check('switches to Gulf', APP.state.locale === 'ar-SA');
    check('Gulf hero copy', $('.hero h1').textContent.includes('خذ موعدك'), $('.hero h1').textContent.trim());
    check('Gulf nav label', $$('.nav-link')[1].textContent === 'الحجز', $$('.nav-link')[1].textContent);
    check('Gulf status line', /الدوام|مفتوح|مقفل/.test($('#statusLine').textContent), $('#statusLine').textContent);
    check('Gulf menu label', $('#menuBtn').getAttribute('aria-label') === 'القائمة', $('#menuBtn').getAttribute('aria-label'));

    $('#langSelect').value = 'en';
    $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
    await sleep(400);
    check('switches to English', APP.state.locale === 'en');
    check('direction flips to ltr', doc.documentElement.dir === 'ltr');
    check('English nav labels', $$('.nav-link')[0].textContent === 'Home', $$('.nav-link')[0].textContent);
    check('English page title', doc.title.startsWith('Book an appointment') || doc.title.includes('Dr. Amro'), doc.title);
    check('English hero copy', $('.hero h1').textContent.toLowerCase().includes('minute'), $('.hero h1').textContent);
  }

  /* ═══════════════ Static pages ═══════════════ */
  {
    const { window, $, $$, errors } = await mount('clinic.html');
    check('clinic page has no errors', errors.length === 0, errors.join(' | '));
    check('clinic tab title comes from the dictionary',
      window.document.title === 'العيادة والموقع — د. عمرو الأهواني', window.document.title);
    check('clinic shows the address from the API', ($('[data-clinic="address"]')?.textContent || '').includes('البطل'),
      $('[data-clinic="address"]')?.textContent);
    check('clinic marks its own nav item', $('.nav-link.is-active')?.getAttribute('href') === 'clinic.html');
    check('clinic offers a call button', ($('.contact-btn')?.getAttribute('href') || '').startsWith('tel:'));
    check('clinic has three info cards', $$('.info-card').length === 3, `${$$('.info-card').length}`);
    check('each card has an icon', $$('.info-card .info-icon svg').length === 3, `${$$('.info-card .info-icon svg').length}`);
    check('address row is filled on every page', $$('[data-clinic="address"]').length === 1);
  }

  {
    const { window, $, $$, errors } = await mount('privacy.html');
    check('privacy page has no errors', errors.length === 0, errors.join(' | '));
    check('privacy has five sections', $$('.prose-block').length === 5, `${$$('.prose-block').length}`);
    check('privacy lists data rights', $$('.prose-list li').length >= 6, `${$$('.prose-list li').length}`);
    check('privacy keeps the PDPL citation', $('.prose').textContent.includes('151'), 'PDPL');
    check('privacy marks its own nav item', $('.nav-link.is-active')?.getAttribute('href') === 'privacy.html');
    check('privacy links back to booking', ($('.page-cta a')?.getAttribute('href')) === 'booking.html');
    check('privacy tab title from the dictionary',
      window.document.title === 'الخصوصية والأمان — د. عمرو الأهواني', window.document.title);
  }

  {
    const { window, $, $$, errors } = await mount('about.html');
    check('about page has no errors', errors.length === 0, errors.join(' | '));
    check('about marks its own nav item', $('.nav-link.is-active')?.getAttribute('href') === 'about.html');
    check('about shows four numbers', $$('.about-stat').length === 4, `${$$('.about-stat').length}`);
    check('about lists eight credentials', $$('.cred-item').length === 8, `${$$('.cred-item').length}`);
    check('about lists five procedures', $$('.prose-block .prose-list li').length === 5);
    check('about lists publications', $$('.pub-row').length === 5, `${$$('.pub-row').length}`);
    check('about keeps paper titles in English order', $('.pub-title')?.getAttribute('dir') !== 'rtl');
    check('about links to the real Scholar profile',
      ($('.prose .text-link')?.getAttribute('href') || '').includes('scholar.google.com'));
    check('about title comes from the dictionary',
      window.document.title === 'عن الدكتور — عمرو الأهواني', window.document.title);
    check('about keeps the booking CTA', $('.page-cta a')?.getAttribute('href') === 'booking.html');
  }

  {
    const { window, $, $$, errors } = await mount('studio.html');
    check('studio page has no errors', errors.length === 0, errors.join(' | '));
    check('studio marks its own nav item', $('.nav-link.is-active')?.getAttribute('href') === 'studio.html');
    check('studio names both founders', $$('.studio-person').length === 2, `${$$('.studio-person').length}`);
    const review = $('.review-card .primary-btn') || $('#review .primary-btn');
    check('studio sends the doctor to the questionnaire',
      (review?.getAttribute('href') || '') === 'https://codeandcanvas.net/amro-alahawany-review/', review?.getAttribute('href'));
    check('questionnaire link opens in a new tab', review?.getAttribute('target') === '_blank');
    check('questionnaire link is marked noopener', (review?.getAttribute('rel') || '').includes('noopener'));
    check('questionnaire uses the doctor-specific URL',
      (review?.getAttribute('href') || '').includes('amro-alahawany-review'),
      review?.getAttribute('href'));
    check('the retired questionnaire URL is gone', !window.document.body.innerHTML.includes('clinic-review/'));
    check('studio credits the studio site',
      ($('.prose a[href="https://codeandcanvas.net/"]') || null) !== null);
    check('studio links the research file', ($('a[href="dossier.html"]') || null) !== null);
    check('studio footer credit links out',
      (($('.footer-credit a') || {}).getAttribute?.('href') || '').includes('codeandcanvas.net'));
  }

  /* ═══════════════ Booking flow ═══════════════ */
  {
    const { window, errors, $, $$ } = await mount('booking.html', ['booking.js']);
    const doc = window.document;
    const state = window.APP.state;

  /* A day can genuinely have nothing left by the evening, so pick the first
     day that does have a free slot instead of assuming today does. */
  async function pickFreeSlot($$, click, window) {
    for (let i = 0; i < 6; i++) {
      const free = $$('.slot').find(s => !s.disabled);
      if (free) return free;
      const days = $$('.date-chip:not([disabled])');
      const next = days[i + 1];
      if (!next) return null;
      click(window, next);
      await sleep(600);
    }
    return null;
  }

    check('booking boots without errors', errors.length === 0, errors.join(' | '));
    check('booking has 5 services', $$('.service-card').length === 5, `${$$('.service-card').length}`);
    check('starts at step 1', state.step === 1, String(state.step));
    check('next-1 disabled before choosing', $('#next1').disabled);
    check('summary hidden on step 1', $('#summary').hidden === true);
    check('step 2 not reachable yet', $$('.step-btn')[1].disabled === true);
    check('consent links to the privacy page',
      $('.consent-row a')?.getAttribute('href') === 'privacy.html', $('.consent-row a')?.getAttribute('href'));
    check('no sticky bar any more', $('.sticky-bar') === null);

    /* ── pick a service ── */
    click(window, $$('.service-card')[0]);
    await waitFor(() => $$('.date-chip').length > 0);
    check('service selected', state.service?.id === '1', state.service?.id);
    check('next-1 enabled after choosing', $('#next1').disabled === false);
    check('step 2 becomes reachable', $$('.step-btn')[1].disabled === false);

    click(window, $('#next1'));
    await waitFor(() => $$('.slot').length > 0);
    check('moved to step 2', state.step === 2, String(state.step));
    check('slots rendered', $$('.slot').length > 0, `${$$('.slot').length}`);
    check('busy slots disabled', $$('.slot[disabled]').length > 0, `${$$('.slot[disabled]').length}`);
    check('next-2 disabled without a time', $('#next2').disabled);

    /* ── summary shows the choice and offers the way back ── */
    check('summary appears on step 2', $('#summary').hidden === false);
    check('summary names the service', $('#sumService').textContent.length > 3, $('#sumService').textContent);
    check('summary shows a date before a time is picked', /\d/.test($('#sumWhen').textContent), $('#sumWhen').textContent);
    check('summary has two edit rows', $$('#summary .summary-row').length === 2, `${$$('#summary .summary-row').length}`);

    /* ── pick a time ── */
    const free = await pickFreeSlot($$, click, window);
    check('a free slot exists somewhere in the rail', !!free);
    click(window, free);
    await sleep(200);
    check('time chosen', !!state.time, String(state.time));
    check('next-2 enabled', $('#next2').disabled === false);
    check('summary now includes the time', $('#sumWhen').textContent.includes(window.APP.fmtTime(state.time)),
      $('#sumWhen').textContent);

    /* ── back from step 2 to change the service ── */
    click(window, $('#backTo1'));
    await sleep(400);
    check('back button returns to step 1', state.step === 1, String(state.step));
    check('summary hidden again on step 1', $('#summary').hidden === true);

    const other = $$('.service-card')[1];
    click(window, other);
    await waitFor(() => $$('.date-chip').length > 0);
    check('picking another service resets the time', state.time === null, String(state.time));
    check('URL follows the step', !window.location.hash || window.location.hash === '#1', window.location.hash);
    check('a toast explains the reset', $('#toast').hidden === false, $('#toast').textContent);

    click(window, $('#next1'));
    await waitFor(() => $$('.slot').length > 0);
    check('back on step 2 with the new service', state.step === 2 && state.service.id === other.dataset.service,
      `${state.step}/${state.service?.id}`);

    const free2 = await pickFreeSlot($$, click, window);
    click(window, free2);
    await sleep(200);
    click(window, $('#next2'));
    await sleep(500);
    check('moved to step 3', state.step === 3, String(state.step));
    check('URL tracks the step', window.location.hash === '#3', window.location.hash);
    check('summary still visible on step 3', $('#summary').hidden === false);

    /* ── stepper: jump straight back to the time ── */
    click(window, $$('.step-btn')[1]);
    await sleep(400);
    check('stepper jumps back to step 2', state.step === 2, String(state.step));
    check('the chosen time survived', !!state.time, String(state.time));
    click(window, $$('.step-btn')[2]);
    await sleep(400);
    check('stepper jumps forward again', state.step === 3, String(state.step));

    /* ── summary row jumps back too ── */
    click(window, $('#summary .summary-row[data-edit="1"]'));
    await sleep(400);
    check('summary row returns to the service step', state.step === 1, String(state.step));
    click(window, $$('.step-btn')[1]);
    await sleep(400);
    click(window, $$('.step-btn')[2]);
    await sleep(500);

    /* ── validation ── */
    click(window, $('#submitBtn'));
    await sleep(250);
    check('empty form is blocked', state.step === 3, String(state.step));
    check('name error shown', $('[data-err="firstName"]').textContent.length > 0);
    check('consent error shown', $('[data-err="consent"]').textContent.length > 0);

    $('#firstName').value = 'أحمد';
    $('#phone').value = '010';
    $('#phone').dispatchEvent(new window.Event('input', { bubbles: true }));
    click(window, $('#submitBtn'));
    await sleep(200);
    check('short phone rejected', $('[data-err="phone"]').textContent.includes('11'), $('[data-err="phone"]').textContent);

    /* ── success ── */
    $('#phone').value = '01012345678';
    $('#consent').checked = true;
    click(window, $('#submitBtn'));
    await sleep(900);
    check('reached confirmation', state.step === 4, String(state.step));
    const ref = $('#refCode').textContent.trim();
    check('reference generated', /^[A-Z]{2}-\d{4}$/.test(ref), ref);
    check('whatsapp link built', $('#whatsappBtn').href.startsWith('https://wa.me/201200055755?text='));
    check('summary hidden on confirmation', $('#summary').hidden === true);
    check('stepper shows step 4 active', $$('.step')[3].classList.contains('is-active'));

    /* ── restart ── */
    click(window, $('#restartBtn'));
    await sleep(400);
    check('restart returns to step 1', state.step === 1, String(state.step));
    check('restart clears the service', state.service === null);
    check('restart re-enables nothing', $('#next1').disabled === true);

    /* ── locale change mid-flow keeps the data ── */
    $('#langSelect').value = 'en';
    $('#langSelect').dispatchEvent(new window.Event('change', { bubbles: true }));
    await sleep(400);
    check('English step labels', $('.stepper').textContent.includes('Confirm'), $('.stepper').textContent.trim());
    check('booking still at step 1', state.step === 1, String(state.step));
    check('English summary labels', window.APP.t('sum.edit') === 'Change', window.APP.t('sum.edit'));
    check('no runtime errors across the flow', errors.length === 0, errors.join(' | '));
  }

  /* ═══════════════ deep link ═══════════════ */
  {
    const dom = new JSDOM(read('booking.html'), {
      url: `${BASE}/booking.html?service=2`,
      pretendToBeVisual: true,
      runScripts: 'outside-only',
    });
    const { window } = dom;
    window.scrollTo = () => {};
    window.fetch = (u, o) => fetch(new URL(u, BASE).toString(), o);
    window.HTMLElement.prototype.scrollIntoView = () => {};
    window.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
    window.eval(read('i18n.js'));
    window.eval(read('core.js'));
    window.eval(read('install.js'));
    window.eval(read('booking.js'));
    window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await sleep(1000);

    check('deep link preselects the service', window.APP.state.service?.id === '2', window.APP.state.service?.id);
    check('deep link lands on step 2', window.APP.state.step === 2, String(window.APP.state.step));
    check('deep link keeps the query string', window.location.search === '?service=2', window.location.search);
  }

  /* ═══════════════ report ═══════════════ */
  let failed = 0;
  for (const r of out) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.n}${!r.ok && r.d ? `   [${r.d}]` : ''}`);
  }
  console.log(`\n  ${out.length - failed}/${out.length} passed${failed ? ` — ${failed} FAILED` : ''}\n`);
  process.exit(failed ? 1 : 0);
})();
