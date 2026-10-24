/* ══════════════════════════════════════════════════════════════
   core.js — the shared shell every page loads first.

   Holds the three things that must behave identically on every
   page — language, theme and the page chrome (header, menu,
   install sheet, toast, footer) — so no page can drift from the
   others and nothing is copy-pasted four times.

   Pages declare themselves with  <body data-page="…">.
   Everything else here is exposed on window.APP for booking.js.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  const DEFAULT_LOCALE = 'ar-EG';
  const STORAGE = { locale: 'dr-locale', theme: 'dr-theme', installHidden: 'dr-install-hidden' };

  /* Order here is the order in the menu. */
  const PAGES = [
    { id: 'home', href: 'index.html', key: 'nav.home' },
    { id: 'booking', href: 'booking.html', key: 'nav.book' },
    { id: 'clinic', href: 'clinic.html', key: 'nav.clinic' },
    { id: 'about', href: 'about.html', key: 'nav.about' },
    { id: 'privacy', href: 'privacy.html', key: 'nav.privacy' },
    { id: 'studio', href: 'studio.html', key: 'nav.studio' },
  ];

  const PHONE = '+201200055755';
  const WHATSAPP = '201200055755';

  const state = {
    locale: DEFAULT_LOCALE,
    theme: 'light',
    page: document.body.dataset.page || 'home',
    clinic: null,
    services: [],
    servicesLoaded: false,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ───────────────────────────── icons ───────────────────────────── */

  const ICONS = {
    phone:
      '<path d="M6.6 3.5 9 3l1.6 4-2 1.4a12 12 0 0 0 6 6L16 12.4 20 14l-.5 2.4A2 2 0 0 1 17.4 18C10.2 17.6 6.4 13.8 6 6.6a2 2 0 0 1 .6-1.5Z" stroke-linecap="round" stroke-linejoin="round"/>',
    globe:
      '<circle cx="12" cy="12" r="8.6"/><path d="M3.6 12h16.8M12 3.4c2.2 2.3 3.4 5.3 3.4 8.6s-1.2 6.3-3.4 8.6c-2.2-2.3-3.4-5.3-3.4-8.6S9.8 5.7 12 3.4Z"/>',
    sun:
      '<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4" stroke-linecap="round"/>',
    moon: '<path d="M20 14.2A8.4 8.4 0 0 1 9.8 4a8.4 8.4 0 1 0 10.2 10.2Z" stroke-linejoin="round"/>',
    install:
      '<path d="M12 3.5v10.5" stroke-linecap="round"/><path d="m7.6 9.8 4.4 4.4 4.4-4.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2" stroke-linecap="round"/>',
    menu:
      '<path d="M4 7h16M4 12h16M4 17h16" stroke-linecap="round"/>',
    close:
      '<path d="m6 6 12 12M18 6 6 18" stroke-linecap="round"/>',
    chevron:
      '<path d="m14 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>',
    pin:
      '<path d="M12 21s6.5-5.4 6.5-10.2A6.5 6.5 0 0 0 5.5 10.8C5.5 15.6 12 21 12 21Z" stroke-linejoin="round"/><circle cx="12" cy="10.6" r="2.4"/>',
    clock:
      '<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8" stroke-linecap="round"/>',
    shield:
      '<path d="M12 3 4.5 6v5.5c0 4.4 3.1 8.2 7.5 9.5 4.4-1.3 7.5-5.1 7.5-9.5V6Z" stroke-linejoin="round"/><path d="m9 12 2.2 2.2L15.5 10" stroke-linecap="round" stroke-linejoin="round"/>',
    whatsapp:
      '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.1-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/>',
    calendar:
      '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4" stroke-linecap="round"/>',
    share:
      '<path d="M12 15.5V4" stroke-linecap="round"/><path d="m7.8 8 4.2-4.2L16.2 8" stroke-linecap="round" stroke-linejoin="round"/><path d="M5.5 13.5v5a1.8 1.8 0 0 0 1.8 1.8h9.4a1.8 1.8 0 0 0 1.8-1.8v-5" stroke-linecap="round"/>',
    dots:
      '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/>',
  };

  const ic = (name, width) =>
    `<svg${width ? ` style="width:${width}px;height:${width}px"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${
      ICONS[name] || ''
    }</svg>`;

  /* ───────────────────────────── i18n ───────────────────────────── */

  function flatten(obj, prefix = '', out = {}) {
    for (const [k, v] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${k}` : k;
      if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
      else out[key] = v;
    }
    return out;
  }

  const FLAT = {};
  for (const [id, dict] of Object.entries(window.I18N)) FLAT[id] = flatten(dict);

  function t(key, vars) {
    let value = FLAT[state.locale]?.[key] ?? FLAT[DEFAULT_LOCALE]?.[key] ?? key;
    if (vars) {
      value = String(value).replace(/\{(\w+)\}/g, (m, name) => (name in vars ? vars[name] : m));
    }
    return value;
  }

  /** Pick the right variant out of an `{ 'ar-EG': …, en: … }` map. */
  function localized(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    return value[state.locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? '';
  }

  const localeMeta = () => window.LOCALES.find(l => l.id === state.locale) || window.LOCALES[0];

  /* ─────────────────────────── formatting ─────────────────────────── */

  function fmtDate(iso, opts) {
    if (!iso) return '';
    return new Intl.DateTimeFormat(localeMeta().intl, { timeZone: 'Africa/Cairo', ...opts }).format(
      new Date(`${iso}T12:00:00`),
    );
  }

  function fmtTime(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const mm = String(m).padStart(2, '0');
    if (state.locale === 'en') return `${h12}:${mm} ${h >= 12 ? 'PM' : 'AM'}`;
    return `${String(h12).padStart(2, '0')}:${mm} ${h >= 12 ? 'م' : 'ص'}`;
  }

  const money = n => new Intl.NumberFormat(localeMeta().intl).format(n);

  /* ───────────────────────────── toast ───────────────────────────── */

  let toastTimer;
  function toast(msg, tone = 'info') {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.dataset.tone = tone;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 4000);
  }

  /* ────────────────────────────── api ─────────────────────────────── */

  async function api(path, body) {
    const res = await fetch(path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.code ? t(`err.${data.code}`) : t('err.generic'));
      err.code = data.code;
      throw err;
    }
    return data;
  }

  /** Clinic details + service list, fetched once per page. */
  async function loadClinic() {
    if (state.clinic) return state;
    const data = await api('/api/clinic');
    state.clinic = data.clinic;
    state.services = data.services || [];
    state.servicesLoaded = true;
    return state;
  }

  /* ──────────────────────────── chrome ────────────────────────────── */

  const avatar = `
    <span class="brand-avatar">
      <picture>
        <source type="image/webp" srcset="img/avatar-96.webp 1x, img/avatar-192.webp 2x" />
        <img src="img/avatar-96.jpg" srcset="img/avatar-96.jpg 1x, img/avatar-192.jpg 2x"
             width="96" height="96" alt="" decoding="async" />
      </picture>
    </span>`;

  function navLinks(cls) {
    return PAGES.map(
      p => `<a class="${cls}${p.id === state.page ? ' is-active' : ''}" href="${p.href}"
              data-i18n="${p.key}"${p.id === state.page ? ' aria-current="page"' : ''}></a>`,
    ).join('');
  }

  function headerMarkup() {
    // The header CTA is whatever the visitor most likely wants next: on the
    // booking page that is a phone call, everywhere else it is booking.
    const booking = state.page === 'booking';
    const cta = booking
      ? `<a class="nav-cta" id="navCta" href="tel:${PHONE}">${ic('phone')}<span data-i18n="nav.call"></span></a>`
      : `<a class="nav-cta" id="navCta" href="booking.html">${ic('calendar')}<span data-i18n="nav.cta"></span></a>`;

    return `
      <a class="skip-link" href="#main" data-i18n="a11y.skip"></a>
      <header class="site-header">
        <div class="wrap">
          <nav class="nav-pill" aria-label="Site">
            <a class="brand" href="index.html">
              ${avatar}
              <span class="brand-text">
                <strong data-i18n="brand.name"></strong>
                <span data-i18n="brand.role"></span>
              </span>
            </a>

            <div class="nav-links">${navLinks('nav-link')}</div>

            <div class="nav-actions">
              <button type="button" class="icon-btn install-btn" id="installBtn" hidden
                      data-i18n-aria="install.ariaInstall">
                ${ic('install')}
              </button>

              <div class="lang-control">
                <span class="lang-globe">${ic('globe')}</span>
                <select id="langSelect" class="lang-select" data-i18n-aria="a11y.langLabel"></select>
              </div>

              <button type="button" class="icon-btn" id="themeBtn" data-i18n-aria="a11y.themeDark">
                <span class="ico-sun">${ic('sun')}</span>
                <span class="ico-moon">${ic('moon')}</span>
              </button>

              <button type="button" class="icon-btn menu-btn" id="menuBtn"
                      aria-expanded="false" aria-controls="menuSheet" data-i18n-aria="nav.menu">
                ${ic('menu')}
              </button>

              ${cta}
            </div>
          </nav>
        </div>
      </header>`;
  }

  function menuMarkup() {
    return `
      <div class="sheet-backdrop" id="menuSheet" hidden>
        <div class="sheet menu-sheet" role="dialog" aria-modal="true" aria-labelledby="menuTitle">
          <div class="menu-head">
            <span class="menu-title" id="menuTitle" data-i18n="nav.menu"></span>
            <button type="button" class="sheet-close" id="menuClose" data-i18n-aria="nav.close">
              ${ic('close')}
            </button>
          </div>
          <nav class="menu-links">${navLinks('menu-link')}</nav>
          <button type="button" class="menu-install" id="menuInstall" hidden>
            ${ic('install')}<span data-i18n="nav.install"></span>${ic('chevron')}
          </button>
          <div class="menu-foot">
            <a class="menu-contact" href="tel:${PHONE}">${ic('phone')}<span>012 0005 5755</span></a>
            <a class="menu-contact" href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener">
              ${ic('whatsapp')}<span data-i18n="footer.whatsapp"></span>
            </a>
          </div>
        </div>
      </div>`;
  }

  function installMarkup() {
    return `
      <div class="sheet-backdrop" id="installSheet" hidden>
        <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="installTitle">
          <button class="sheet-close" id="installClose" aria-label="×">
            ${ic('close')}
          </button>
          <div class="sheet-icon" aria-hidden="true">
            <img src="icons/icon-192.png" alt="" width="64" height="64" />
          </div>
          <h3 id="installTitle" data-i18n="install.title"></h3>
          <p id="installDesc" data-i18n="install.desc"></p>
          <p class="install-alert" id="installAlert" hidden></p>
          <ol class="install-steps" id="installSteps"></ol>
          <button type="button" class="primary-btn sheet-cta" id="installCta" data-i18n="install.cta"></button>
          <button type="button" class="ghost-btn sheet-alt" id="installCopy" data-i18n="install.copy"></button>
        </div>
      </div>`;
  }

  function footerMarkup() {
    return `
      <div class="wrap footer-inner">
        <p data-i18n-html="footer.copy"></p>
        <p class="footer-links">
          <a href="tel:${PHONE}">01200055755</a>
          <span aria-hidden="true">·</span>
          <a href="https://wa.me/${WHATSAPP}" target="_blank" rel="noopener" data-i18n="footer.whatsapp"></a>
          <span aria-hidden="true">·</span>
          <a href="https://ahwani.com/" target="_blank" rel="noopener" data-i18n="footer.site"></a>
        </p>
        <p class="footer-docs">
          <a href="studio.html" data-i18n="footer.studio"></a>
          <span aria-hidden="true">·</span>
          <a href="dossier.html" data-i18n="footer.dossier"></a>
        </p>
        <p class="footer-credit">
          <span data-i18n="footer.credit"></span>
          <a href="https://codeandcanvas.net/" target="_blank" rel="noopener">Code &amp; Canvas</a>
        </p>
      </div>`;
  }

  /* ───────────────────────── theme & locale ───────────────────────── */

  function setTheme(theme, { persist = true } = {}) {
    state.theme = theme;
    document.documentElement.dataset.theme = theme;
    $('#themeColor')?.setAttribute('content', theme === 'dark' ? '#080f16' : '#faf7f2');

    const btn = $('#themeBtn');
    if (btn) {
      // The label must name the mode that is *coming*, in the reader's own
      // language — the old one ended in English "dark"/"light" even in Arabic.
      btn.setAttribute('aria-label', t(theme === 'dark' ? 'a11y.themeLight' : 'a11y.themeDark'));
      btn.setAttribute('aria-pressed', String(theme === 'dark'));
    }
    if (persist) {
      try {
        localStorage.setItem(STORAGE.theme, theme);
      } catch {}
    }
  }

  function setLocale(id, { persist = true } = {}) {
    const meta = window.LOCALES.find(l => l.id === id) || window.LOCALES[0];
    state.locale = meta.id;

    document.documentElement.lang = meta.id === 'en' ? 'en' : 'ar';
    document.documentElement.dir = meta.dir;

    if (persist) {
      try {
        localStorage.setItem(STORAGE.locale, meta.id);
      } catch {}
    }

    const select = $('#langSelect');
    if (select) {
      select.value = meta.id;
      select.title = meta.label;
    }

    applyText();
    document.dispatchEvent(new CustomEvent('localechange', { detail: meta.id }));
  }

  /** Fill every translated node in the document, chrome included. */
  function applyText() {
    $$('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
    $$('[data-i18n-html]').forEach(el => {
      el.innerHTML = t(el.dataset.i18nHtml, { year: new Date().getFullYear() });
    });
    $$('[data-i18n-alt]').forEach(el => {
      el.setAttribute('alt', t(el.dataset.i18nAlt));
    });
    $$('[data-i18n-aria]').forEach(el => {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    });

    if (document.body.dataset.title) document.title = t(document.body.dataset.title);
    $('meta[name="description"]')?.setAttribute('content', t('meta.desc'));

    // Content that comes from clinic data rather than the dictionary.
    if (state.clinic) {
      $$('[data-clinic="address"]').forEach(el => (el.textContent = localized(state.clinic.address)));
    }
  }

  /* ──────────────────────────── wiring ────────────────────────────── */

  function buildLangSelect() {
    const select = $('#langSelect');
    if (!select) return;
    // The full name would not fit in the header pill, so the option text is
    // the short form and the full name rides along as the title.
    select.innerHTML = window.LOCALES.map(
      l => `<option value="${l.id}" title="${l.label}">${l.short || l.label}</option>`,
    ).join('');
    select.value = state.locale;
    select.addEventListener('change', e => setLocale(e.target.value));
  }

  function wireTheme() {
    $('#themeBtn')?.addEventListener('click', () => {
      setTheme(state.theme === 'dark' ? 'light' : 'dark');
    });

    // Follow the OS only while the user has not picked a theme explicitly.
    window.matchMedia?.('(prefers-color-scheme: dark)')?.addEventListener?.('change', e => {
      let hasPreference = false;
      try {
        hasPreference = !!localStorage.getItem(STORAGE.theme);
      } catch {}
      if (!hasPreference) setTheme(e.matches ? 'dark' : 'light', { persist: false });
    });
  }

  /* ── overlays: one open at a time, Escape and backdrop close ── */

  const overlays = new Set();
  function openSheet(id) {
    const sheet = document.getElementById(id);
    if (!sheet) return;
    sheet.hidden = false;
    overlays.add(id);
    document.body.style.overflow = 'hidden';
    const btn = $('#menuBtn');
    if (btn) btn.setAttribute('aria-expanded', String(id === 'menuSheet'));
    sheet.querySelector('.sheet')?.querySelector('a, button')?.focus();
  }

  function closeSheets() {
    const fromMenu = overlays.has('menuSheet');
    overlays.forEach(id => {
      const sheet = document.getElementById(id);
      if (sheet) sheet.hidden = true;
    });
    overlays.clear();
    document.body.style.overflow = '';
    $('#menuBtn')?.setAttribute('aria-expanded', 'false');
    // Return focus to whatever opened the sheet, so the keyboard user is
    // not dropped back at the top of the document.
    if (fromMenu) $('#menuBtn')?.focus();
  }

  function wireMenu() {
    $('#menuBtn')?.addEventListener('click', () => openSheet('menuSheet'));
    $('#menuClose')?.addEventListener('click', closeSheets);
    $('#menuSheet')?.addEventListener('click', e => {
      if (e.target.id === 'menuSheet') closeSheets();
    });
    // Following a link leaves the sheet open behind the next page's
    // backdrop, so close it on the way out.
    $$('#menuSheet .menu-link').forEach(a => a.addEventListener('click', closeSheets));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeSheets();
    });
  }

  /* ── install (PWA) ── */

  function installStepsMarkup() {
    const ios = window.PWA?.isIOS?.();
    const rows = ios
      ? [`${t('install.ios1')} ${ic('share')}`, t('install.ios2'), t('install.ios3')]
      : [`${t('install.android1').replace('(⋮)', '')} ${ic('dots')}`, t('install.android2'), t('install.android3')];
    return rows.map(text => `<li>${text}</li>`).join('');
  }

  /* One sheet, five situations. Which one we are in decides the steps, the
     primary button and whether the in-app warning shows — a "تثبيت" button
     that cannot do anything is worse than no button. */
  function openInstallSheet() {
    const sheet = $('#installSheet');
    if (!sheet) return;

    const pwa = window.PWA || {};
    const standalone = pwa.isStandalone?.() === true;
    const canPrompt = pwa.canInstall?.() === true;
    const inApp = pwa.isInAppBrowser?.() === true;
    const intent = pwa.chromeIntent?.(location.href) || null;

    $('#installTitle').textContent = standalone ? t('install.done') : t('install.title');
    $('#installDesc').textContent = t('install.desc');
    $('#installDesc').hidden = standalone;

    const alert = $('#installAlert');
    alert.hidden = !inApp;
    alert.textContent = inApp ? t('install.inAppDesc') : '';

    $('#installSteps').innerHTML = standalone || inApp ? '' : installStepsMarkup();
    $('#installSteps').hidden = standalone || inApp;

    const cta = $('#installCta');
    let mode = 'close';
    if (!standalone) {
      if (canPrompt) {
        cta.textContent = t('install.cta');
        mode = 'native';
      } else if (intent) {
        cta.textContent = t('install.openChrome');
        mode = 'chrome';
      } else {
        cta.textContent = t('install.ctaManual');
      }
    } else {
      cta.textContent = t('install.ctaManual');
    }
    cta.dataset.mode = mode;

    $('#installCopy').hidden = standalone;

    openSheet('installSheet');
  }

  function wireInstall() {
    const btn = $('#installBtn');
    if (!btn) return;

    /* Show the button only when there is something it can do.
       `hidden = installed` alone left it on screen in desktop Firefox and
       Safari, where neither the native prompt nor the iOS instructions
       apply — tapping it led to a dead end. */
    const syncVisible = () => {
      const pwa = window.PWA;
      if (!pwa) {
        btn.hidden = true;
        return;
      }
      const actionable = pwa.canInstall() || pwa.isIOS() || pwa.isInAppBrowser?.() === true;
      const installed = pwa.isStandalone();
      btn.hidden = installed || !actionable;
      // The menu keeps a labelled entry even when the icon is hidden, so
      // "how do I get this on my phone?" always has an answer.
      const row = $('#menuInstall');
      if (row) row.hidden = installed;
    };
    syncVisible();
    window.PWA?.onChange?.(syncVisible);

    btn.addEventListener('click', () => {
      if (window.PWA?.isStandalone()) return toast(t('install.done'));
      openInstallSheet();
    });

    $('#menuInstall')?.addEventListener('click', () => {
      closeSheets();
      openInstallSheet();
    });

    $('#installCopy')?.addEventListener('click', async () => {
      const url = `${location.origin}/`;
      try {
        await navigator.clipboard.writeText(url);
        toast(t('install.copied'));
      } catch {
        // Clipboard API needs a secure context and a user gesture; when both
        // are missing, pointing at the address bar beats failing silently.
        toast(url);
      }
    });

    $('#installClose')?.addEventListener('click', closeSheets);
    $('#installSheet')?.addEventListener('click', e => {
      if (e.target.id === 'installSheet') closeSheets();
    });

    $('#installCta')?.addEventListener('click', async e => {
      const cta = e.currentTarget;
      if (cta.dataset.mode === 'chrome') {
        const intent = window.PWA.chromeIntent?.(location.href);
        if (intent) location.href = intent;
        return;
      }
      if (cta.dataset.mode !== 'native') return closeSheets();

      const outcome = await window.PWA.prompt();
      if (outcome === 'accepted') {
        closeSheets();
        toast(t('install.done'));
      } else {
        // Prompt dismissed — fall back to written instructions.
        openInstallSheet();
      }
    });

    window.addEventListener('appinstalled', () => {
      closeSheets();
      toast(t('install.done'));
      const card = $('#installCard');
      if (card) card.hidden = true;
    });
  }

  /* The home-page card is the only place a visitor who never opens the menu
     learns the app can live on their phone. It appears once, and stays gone
     after a dismissal — a prompt that keeps coming back is an advert. */
  function wireInstallCard() {
    const card = $('#installCard');
    if (!card) return;

    let hidden = true;
    try {
      hidden = localStorage.getItem(STORAGE.installHidden) === '1';
    } catch {}

    const sync = () => {
      // Already installed? The card has nothing left to offer.
      card.hidden = hidden || window.PWA?.isStandalone?.() === true;
    };
    sync();

    $('#installCardBtn')?.addEventListener('click', openInstallSheet);
    $('#installCardClose')?.addEventListener('click', () => {
      hidden = true;
      try {
        localStorage.setItem(STORAGE.installHidden, '1');
      } catch {}
      sync();
    });
  }

  /* ───────────────────────────── boot ─────────────────────────────── */

  let booted = false;

  function boot() {
    if (booted) return;
    booted = true;

    try {
      state.theme = document.documentElement.dataset.theme || 'light';
      const saved = localStorage.getItem(STORAGE.locale);
      state.locale = window.LOCALES.some(l => l.id === saved) ? saved : DEFAULT_LOCALE;
    } catch {
      state.theme = 'light';
    }

    buildLangSelect();
    wireTheme();
    wireMenu();
    wireInstall();
    wireInstallCard();
    setLocale(state.locale, { persist: false });

    // Give every page the clinic card, then let it render.
    loadClinic()
      .then(() => {
        applyText();
        document.dispatchEvent(new CustomEvent('clinicready', { detail: state }));
      })
      .catch(err => {
        console.error(err);
        toast(t('err.load'), 'error');
      });
  }

  /* Chrome is injected while <body> is still parsing, so the header is in
     place before the first paint — no layout shift, no flash of an empty
     nav. Text is applied immediately for the same reason. */
  document.body.insertAdjacentHTML('afterbegin', headerMarkup() + menuMarkup() + installMarkup());
  document.body.insertAdjacentHTML(
    'beforeend',
    '<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>',
  );

  try {
    const savedTheme = localStorage.getItem(STORAGE.theme);
    if (savedTheme === 'dark' || savedTheme === 'light') document.documentElement.dataset.theme = savedTheme;
    const savedLocale = localStorage.getItem(STORAGE.locale);
    if (window.LOCALES.some(l => l.id === savedLocale)) state.locale = savedLocale;
  } catch {}

  // Text for the chrome only; page content is not parsed yet.
  applyText();

  document.addEventListener('DOMContentLoaded', () => {
    const footer = $('footer.site-footer');
    if (footer) footer.innerHTML = footerMarkup();
    boot();
    applyText();
  });

  window.APP = {
    state,
    t,
    localized,
    applyText,
    api,
    loadClinic,
    setLocale,
    setTheme,
    toast,
    fmtDate,
    fmtTime,
    money,
    ic,
    $,
    $$,
    PHONE,
    WHATSAPP,
  };
})();
