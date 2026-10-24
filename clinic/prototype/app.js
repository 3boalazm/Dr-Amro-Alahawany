/* ══════════════════════════════════════════════════════════
   Dr. Amro Alahawany — booking flow
   ──────────────────────────────────────────────────────────
   i18n:   ar-EG (Egyptian) · ar-SA (Gulf) · en
   Theme:  light · dark
   API:    set API_BASE to the Easy!Appointments URL to go live.
   ══════════════════════════════════════════════════════════ */

const API_BASE = ''; // e.g. 'https://clinic.ahwani.com/index.php' — empty = same origin

const DEFAULT_LOCALE = 'ar-EG';
const STORAGE = { locale: 'dr-locale', theme: 'dr-theme' };

const state = {
  locale: DEFAULT_LOCALE,
  theme: 'light',
  clinic: null,
  services: [],
  service: null,
  calendar: [],
  slots: [],
  date: null,
  time: null,
  step: 1,
  submitting: false,
  appointment: null,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

/* ── i18n ── */

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

/** Pick the right variant out of a `{ 'ar-EG': …, en: … }` map. */
function localized(value) {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  return value[state.locale] ?? value[DEFAULT_LOCALE] ?? Object.values(value)[0] ?? '';
}

const currentLocaleMeta = () => window.LOCALES.find(l => l.id === state.locale) || window.LOCALES[0];

/* ── formatting ── */

function fmtDate(iso, opts) {
  if (!iso) return '';
  const locale = currentLocaleMeta().intl;
  return new Intl.DateTimeFormat(locale, { timeZone: 'Africa/Cairo', ...opts }).format(
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

function money(n) {
  return new Intl.NumberFormat(currentLocaleMeta().intl).format(n);
}

/* ── toast ── */

let toastTimer;
function toast(msg, tone = 'info') {
  const el = $('#toast');
  el.textContent = msg;
  el.dataset.tone = tone;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 4000);
}

/* ── api ── */

async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
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

/* ══════════════ Theme & locale ══════════════ */

function setTheme(theme, { persist = true } = {}) {
  state.theme = theme;
  document.documentElement.dataset.theme = theme;
  $('#themeColor')?.setAttribute('content', theme === 'dark' ? '#080f16' : '#faf7f2');
  $('#themeBtn')?.setAttribute(
    'aria-label',
    // Names the mode in the reader's own language; the old label ended
    // with the English word "dark"/"light" even in Arabic.
    theme === 'dark' ? t('a11y.themeDark') : t('a11y.themeLight'),
  );
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

  document.title = t('meta.title');
  $('meta[name="description"]')?.setAttribute('content', t('meta.desc'));

  if (persist) {
    try {
      localStorage.setItem(STORAGE.locale, meta.id);
    } catch {}
  }

  if ($('#langSelect')) $('#langSelect').value = meta.id;

  applyStaticText();
  renderServices();
  if (state.calendar.length) renderDates();
  if (state.slots.length || state.date) renderSlots(state.slots);
  renderSuccess();
  updateStepper();
  updateSticky();
  setTheme(state.theme, { persist: false });
}

function applyStaticText() {
  $$('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  $$('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  $$('[data-i18n-alt]').forEach(el => {
    el.setAttribute('alt', t(el.dataset.i18nAlt));
  });

  $('#privacyLink')?.setAttribute('href', '#');
  const langSelect = $('#langSelect');
  if (langSelect) {
    langSelect.setAttribute('aria-label', t('a11y.langLabel'));
    const meta = window.LOCALES.find(l => l.id === state.locale);
    if (meta) langSelect.title = meta.label;
  }
  $('#installBtn')?.setAttribute('aria-label', t('install.ariaInstall'));

  // Content that comes from clinic data rather than the dictionary
  if (state.clinic) $('#clinicAddress').textContent = localized(state.clinic.address);
}

/* ══════════════ Boot ══════════════ */

async function boot() {
  try {
    state.theme = document.documentElement.dataset.theme || 'light';
    const savedLocale = localStorage.getItem(STORAGE.locale);
    state.locale = window.LOCALES.some(l => l.id === savedLocale) ? savedLocale : DEFAULT_LOCALE;
  } catch {
    state.theme = 'light';
  }

  buildLangSelect();
  wireControls();
  wireInstall();

  try {
    const data = await api('/api/clinic');
    state.clinic = data.clinic;
    state.services = data.services;
    setLocale(state.locale, { persist: false });
    wireNav();
    go(1, { scroll: false });
  } catch (err) {
    toast(t('err.load'), 'error');
    console.error(err);
  }
}

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

function wireControls() {
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

/* ══════════════ Install (PWA) ══════════════ */

const SHARE_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
  '<path d="M12 15.5V4" stroke-linecap="round"/>' +
  '<path d="m7.8 8 4.2-4.2L16.2 8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M5.5 13.5v5a1.8 1.8 0 0 0 1.8 1.8h9.4a1.8 1.8 0 0 0 1.8-1.8v-5" stroke-linecap="round"/></svg>';

const MENU_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">' +
  '<circle cx="12" cy="5" r="1.4" fill="currentColor" stroke="none"/>' +
  '<circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/>' +
  '<circle cx="12" cy="19" r="1.4" fill="currentColor" stroke="none"/></svg>';

/** Steps shown when the browser has no native install prompt (iOS, Firefox…). */
function installStepsMarkup() {
  const ios = window.PWA?.isIOS?.();
  const rows = ios
    ? [`${t('install.ios1')} ${SHARE_ICON}`, t('install.ios2'), t('install.ios3')]
    : [`${t('install.android1').replace('(⋮)', '')} ${MENU_ICON}`, t('install.android2'), t('install.android3')];
  return rows.map(text => `<li>${text}</li>`).join('');
}

function openInstallSheet() {
  const sheet = $('#installSheet');
  if (!sheet) return;

  $('#installTitle').textContent = t('install.title');
  $('.sheet > p').textContent = t('install.desc');
  $('#installSteps').innerHTML = installStepsMarkup();

  const cta = $('#installCta');
  const canPrompt = window.PWA?.canInstall?.();
  cta.textContent = canPrompt ? t('install.cta') : t('install.ctaManual');
  cta.dataset.mode = canPrompt ? 'native' : 'manual';

  sheet.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#installClose').focus();
}

function closeInstallSheet() {
  const sheet = $('#installSheet');
  if (!sheet) return;
  sheet.hidden = true;
  document.body.style.overflow = '';
}

function wireInstall() {
  const btn = $('#installBtn');
  const sheet = $('#installSheet');
  if (!btn || !sheet) return;

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
    const installed = pwa.isStandalone();
    const actionable = pwa.canInstall() || pwa.isIOS();
    btn.hidden = installed || !actionable;
  };
  syncVisible();
  window.PWA?.onChange?.(syncVisible);

  btn.addEventListener('click', () => {
    const pwa = window.PWA;
    if (!pwa) return;
    if (pwa.isStandalone()) return toast(t('install.done'));
    // Native prompt if the browser offered one, otherwise show instructions.
    openInstallSheet();
  });

  $('#installClose')?.addEventListener('click', closeInstallSheet);

  sheet.addEventListener('click', e => {
    if (e.target === sheet) closeInstallSheet();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !sheet.hidden) closeInstallSheet();
  });

  $('#installCta')?.addEventListener('click', async e => {
    const cta = e.currentTarget;
    if (cta.dataset.mode !== 'native') return closeInstallSheet();

    const outcome = await window.PWA.prompt();
    if (outcome === 'accepted') {
      closeInstallSheet();
      toast(t('install.done'));
    } else {
      // Prompt dismissed — fall back to written instructions.
      openInstallSheet();
    }
  });

  window.addEventListener('appinstalled', () => {
    closeInstallSheet();
    toast(t('install.done'));
  });

  // "Add to home screen" deep link from the manifest shortcut.
  if (new URLSearchParams(location.search).get('action') === 'book') {
    window.addEventListener('load', () => {
      $('#booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
}

/* ══════════════ Step 1 — services ══════════════ */

const ICONS = {
  stethoscope:
    '<path d="M6 3v5a4 4 0 0 0 8 0V3" stroke-linecap="round"/><path d="M10 15v1.5a5 5 0 0 0 10 0V14" stroke-linecap="round"/><circle cx="20" cy="11.5" r="2.2"/>',
  repeat:
    '<path d="M4 9a5 5 0 0 1 5-5h9" stroke-linecap="round"/><path d="m15 1.5 2.8 2.5L15 6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 15a5 5 0 0 1-5 5H6" stroke-linecap="round"/><path d="m9 17.5-2.8 2.5L9 22.5" stroke-linecap="round" stroke-linejoin="round"/>',
  scan: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5" stroke-linecap="round"/><path d="M8 11h6M11 8v6" stroke-linecap="round"/>',
  cells:
    '<circle cx="8" cy="8" r="3.2"/><circle cx="16" cy="9" r="2.6"/><circle cx="10" cy="16" r="2.8"/><circle cx="17" cy="16.5" r="2.2"/>',
  video:
    '<rect x="3" y="6" width="12" height="12" rx="2.5"/><path d="m15 11 5.5-3v8L15 13z" stroke-linejoin="round"/>',
};

const icon = name =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${
    ICONS[name] || ICONS.stethoscope
  }</svg>`;

function renderServices() {
  const list = $('#serviceList');
  if (!list) return;

  list.innerHTML = state.services
    .map(s => {
      const selected = state.service?.id === s.id;
      return `
      <button type="button" class="service-card${selected ? ' is-selected' : ''}"
              role="radio" aria-checked="${selected}" data-service="${s.id}">
        <span class="sc-icon">${icon(s.icon)}</span>
        <span class="sc-body">
          <span class="sc-title">
            ${localized(s.name)}
            ${s.tag ? `<span class="sc-tag">${t(`tag.${s.tag}`)}</span>` : ''}
          </span>
          <span class="sc-desc">${localized(s.desc)}</span>
        </span>
        <span class="sc-side">
          <span class="sc-price">${money(s.price)} <small>${t('unit.currency')}</small></span>
          <span class="sc-dur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8" stroke-linecap="round"/>
            </svg>
            ${s.duration} ${t('unit.minutes')}
          </span>
        </span>
      </button>`;
    })
    .join('');

  if (!list.dataset.bound) {
    list.addEventListener('click', e => {
      const card = e.target.closest('.service-card');
      if (card) selectService(card.dataset.service);
    });
    list.addEventListener('keydown', e => {
      const cards = $$('.service-card');
      const i = cards.indexOf(document.activeElement);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        cards[(i + 1) % cards.length]?.focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        cards[(i - 1 + cards.length) % cards.length]?.focus();
      }
    });
    list.dataset.bound = '1';
  }

  appendActions($('#panel-1'), 'next1');
  const next1 = $('#next1');
  if (next1) next1.disabled = !state.service;
}

async function selectService(id) {
  const service = state.services.find(s => s.id === id) || null;
  if (!service) return;
  state.service = service;

  $$('.service-card').forEach(c => {
    const on = c.dataset.service === id;
    c.classList.toggle('is-selected', on);
    c.setAttribute('aria-checked', String(on));
  });

  const next1 = $('#next1');
  if (next1) next1.disabled = false;

  // Reset downstream selections
  state.date = null;
  state.time = null;
  state.slots = [];
  const next2 = $('#next2');
  if (next2) next2.disabled = true;

  try {
    const data = await api('/api/calendar', { service_id: id });
    state.calendar = data.calendar || [];
    renderDates();
  } catch {
    toast(t('err.load'), 'error');
  }

  updateSticky();
}

/* ══════════════ Step 2 — date & time ══════════════ */

function renderDates() {
  const rail = $('#dateRail');
  if (!rail) return;

  rail.innerHTML = state.calendar
    .map(d => {
      const dt = new Date(`${d.date}T12:00:00`);
      const locale = currentLocaleMeta().intl;
      const dow = new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(dt);
      const day = new Intl.DateTimeFormat(locale, { day: 'numeric' }).format(dt);
      const mon = new Intl.DateTimeFormat(locale, { month: 'short' }).format(dt);
      const disabled = d.available === 0;
      const label = disabled
        ? d.closed
          ? t('panel2.closed')
          : t('panel2.full')
        : t('panel2.count', { n: money(d.available) });
      const selected = state.date === d.date;

      return `<button type="button" class="date-chip${selected ? ' is-selected' : ''}"
                data-date="${d.date}" ${disabled ? 'disabled' : ''} role="option" aria-selected="${selected}">
          <span class="dow">${dow}</span>
          <span class="day">${day}</span>
          <span class="mon">${mon}</span>
          <span class="cnt">${label}</span>
        </button>`;
    })
    .join('');

  if (!rail.dataset.bound) {
    rail.addEventListener('click', e => {
      const chip = e.target.closest('.date-chip');
      if (chip && !chip.disabled) selectDate(chip.dataset.date);
    });
    rail.dataset.bound = '1';
  }

  if (!state.date) {
    const firstOpen = state.calendar.find(d => d.available > 0);
    if (firstOpen) selectDate(firstOpen.date, { silent: true });
  }

  updateRailArrows();
  updateSticky();
}

async function selectDate(date, { silent = false } = {}) {
  state.date = date;
  state.time = null;
  const next2 = $('#next2');
  if (next2) next2.disabled = true;

  $$('.date-chip').forEach(c => {
    const on = c.dataset.date === date;
    c.classList.toggle('is-selected', on);
    c.setAttribute('aria-selected', String(on));
  });

  try {
    const data = await api('/api/availability', {
      service_id: state.service.id,
      selected_date: date,
      provider_id: '1',
    });
    state.slots = data.slots || [];
    renderSlots(state.slots);
  } catch {
    toast(t('err.loadSlots'), 'error');
  }

  if (!silent) updateSticky();
}

function renderSlots(slots) {
  const grid = $('#slotGrid');
  if (!grid) return;

  if (!slots || !slots.length) {
    grid.innerHTML = `<p class="empty-state">${state.date ? t('panel2.noSlots') : t('panel2.pickDay')}</p>`;
    updateSticky();
    return;
  }

  const duration = state.service?.duration || 30;
  const taken = new Set(slots.map(s => s.time));
  const startH = state.clinic?.workingHours?.start ?? 14;
  const endH = state.clinic?.workingHours?.end ?? 22;

  const all = [];
  for (let m = startH * 60; m + duration <= endH * 60; m += 30) {
    all.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }

  grid.innerHTML = all
    .map(tm => {
      if (!taken.has(tm)) return `<button type="button" class="slot" disabled>${fmtTime(tm)}</button>`;
      const on = state.time === tm;
      return `<button type="button" class="slot${on ? ' is-selected' : ''}" data-time="${tm}">${fmtTime(tm)}</button>`;
    })
    .join('');

  grid.onclick = e => {
    const el = e.target.closest('.slot');
    if (!el || el.disabled) return;
    state.time = el.dataset.time;
    $$('.slot').forEach(s => s.classList.toggle('is-selected', s.dataset.time === state.time));
    const btn = $('#next2');
    if (btn) btn.disabled = false;
    updateSticky();
  };

  updateSticky();
}

function updateRailArrows() {
  const rail = $('#dateRail');
  if (!rail) return;
  const sync = () => {
    const rtl = document.documentElement.dir === 'rtl';
    const start = rtl ? rail.scrollLeft * -1 : rail.scrollLeft;
    $('#railPrev').disabled = start <= 2;
    $('#railNext').disabled = start + rail.clientWidth >= rail.scrollWidth - 2;
  };
  rail.onscroll = sync;
  setTimeout(sync, 60);
}

/* ══════════════ Navigation ══════════════ */

function appendActions(panel, id) {
  if (!panel || panel.querySelector(`#${id}`)) return;
  const row = document.createElement('div');
  row.className = 'form-actions';
  row.style.marginTop = '22px';
  row.innerHTML = `<span></span>
    <button type="button" class="primary-btn" id="${id}" disabled>
      <span></span>
      <svg class="dir-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m14 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
  row.querySelector('span').textContent = t('btn.continue');
  panel.appendChild(row);
}

function wireNav() {
  appendActions($('#panel-2'), 'next2');
  const next2 = $('#next2');
  if (next2) next2.disabled = true;

  $('#next1')?.addEventListener('click', () => go(2));
  $('#next2')?.addEventListener('click', () => go(3));
  $('#backTo2')?.addEventListener('click', () => go(2));
  $('#railPrev')?.addEventListener('click', () => {
    $('#dateRail').scrollLeft -= 240;
  });
  $('#railNext')?.addEventListener('click', () => {
    $('#dateRail').scrollLeft += 240;
  });
  $('#restartBtn')?.addEventListener('click', () => location.reload());
  $('#icsBtn')?.addEventListener('click', downloadIcs);
  $('#stickyCta')?.addEventListener('click', () => {
    if (state.step === 1 && state.service) go(2);
    else if (state.step === 2 && state.time) go(3);
  });

  $('#privacyLink')?.addEventListener('click', e => {
    e.preventDefault();
    toast(t('err.privacy'));
  });

  $('#detailsForm')?.addEventListener('submit', submitBooking);
  $('#phone')?.addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
  });
}

function go(step, { scroll = true } = {}) {
  if (step === 2 && !state.service) return toast(t('err.pickService'));
  if (step === 3 && !state.time) return toast(t('err.pickTime'));

  state.step = step;
  [1, 2, 3, 4].forEach(n => {
    const panel = $(`#panel-${n}`);
    if (panel) panel.hidden = n !== step;
  });

  updateStepper();
  updateSticky();

  if (scroll) {
    const y = $('#booking').getBoundingClientRect().top + window.scrollY - 84;
    window.scrollTo({ top: Math.max(y, 0), behavior: 'smooth' });
  }

  if (step === 3) setTimeout(() => $('#firstName')?.focus(), 420);
}

function updateStepper() {
  $$('.step').forEach(li => {
    const n = Number(li.dataset.stepDot);
    li.classList.toggle('is-active', n === state.step);
    li.classList.toggle('is-done', n < state.step);
  });
  const progress = $('#stepperProgress');
  if (progress) progress.style.width = `${((state.step - 1) / 3) * 100}%`;
}

/* ══════════════ Sticky bar ══════════════ */

function updateSticky() {
  const bar = $('#stickyBar');
  if (!bar) return;

  const show = !!state.service && (state.step === 1 || state.step === 2);
  bar.hidden = !show;
  if (!show) return;

  $('#stickyService').textContent = localized(state.service.name);

  let when = t('panel2.pickDayShort');
  if (state.date) when = fmtDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' });
  if (state.time) when += ` — ${fmtTime(state.time)}`;
  $('#stickyWhen').textContent = when;

  const cta = $('#stickyCta');
  cta.disabled = state.step === 2 && !state.time;
  cta.textContent = state.step === 1 ? t('btn.chooseTime') : t('btn.continue');
}

/* ══════════════ Validation & submit ══════════════ */

function setError(field, message) {
  const input = $(`#${field}`);
  const err = $(`[data-err="${field}"]`);
  if (err) err.textContent = message || '';
  if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
}

function validate() {
  let ok = true;
  const first = $('#firstName').value.trim();
  const phone = $('#phone').value.trim();
  const email = $('#email').value.trim();

  ['firstName', 'phone', 'email', 'consent'].forEach(f => setError(f, ''));

  if (first.length < 2) {
    setError('firstName', t('err.name'));
    ok = false;
  }
  if (!/^01[0-9]{9}$/.test(phone)) {
    setError('phone', t('err.phone'));
    ok = false;
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    setError('email', t('err.email'));
    ok = false;
  }
  if (!$('#consent').checked) {
    setError('consent', t('err.consent'));
    ok = false;
  }

  if (!ok) {
    document.querySelector('[aria-invalid="true"]')?.focus();
    toast(t('err.form'), 'error');
  }
  return ok;
}

async function submitBooking(e) {
  e.preventDefault();
  if (state.submitting || !validate()) return;

  state.submitting = true;
  const btn = $('#submitBtn');
  const label = btn.querySelector('span');
  btn.disabled = true;
  label.textContent = t('btn.confirming');

  const start = `${state.date} ${state.time}:00`;

  try {
    const data = await api('/api/register', {
      post_data: {
        appointment: {
          start_datetime: start,
          end_datetime: addMinutes(start, state.service.duration),
          service_id: state.service.id,
          provider_id: '1',
        },
        customer: {
          first_name: $('#firstName').value.trim(),
          last_name: $('#lastName').value.trim(),
          phone_number: $('#phone').value.trim(),
          email: $('#email').value.trim(),
          discreet_notifications: $('#discreet').checked,
        },
        manage_mode: false,
      },
      consent: {
        accepted: true,
        version: state.clinic?.consentVersion || 'v1',
        scope: ['booking', 'reminders', 'health_data'],
      },
      captcha: null,
    });

    state.appointment = data.appointment;
    renderSuccess();
    go(4);
  } catch (err) {
    toast(err.message || t('err.generic'), 'error');
    btn.disabled = false;
    label.textContent = t('btn.confirm');

    // The slot went away between picking it and confirming. Sending the
    // patient back to the time list is the only useful next step — leaving
    // them on the form invites them to fail again.
    if (err.code === 'slot_taken' || err.code === 'slot_unavailable') {
      state.time = null;
      go(2);
      if (state.date) selectDate(state.date, { silent: true });
    }
  } finally {
    state.submitting = false;
  }
}

function addMinutes(datetime, mins) {
  const d = new Date(datetime.replace(' ', 'T'));
  d.setMinutes(d.getMinutes() + mins);
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/* ══════════════ Success ══════════════ */

function renderSuccess() {
  const appt = state.appointment;
  if (!appt || !state.service) return;

  const discreet = appt.discreet_notifications;
  $('#successSub').textContent = t(discreet ? 'success.subDiscreet' : 'success.subNormal');
  $('#refCode').textContent = appt.reference;
  $('#sumService').textContent = localized(state.service.name);
  $('#sumDate').textContent = fmtDate(state.date, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  $('#sumTime').textContent = fmtTime(state.time);
  $('#sumDuration').textContent = `${state.service.duration} ${t('unit.minutes')}`;

  const date = fmtDate(state.date, { day: 'numeric', month: 'long' });
  const msg = t(discreet ? 'wa.discreet' : 'wa.normal', {
    ref: appt.reference,
    date,
    time: fmtTime(state.time),
    service: localized(state.service.name),
  });

  $('#whatsappBtn').href = `https://wa.me/${state.clinic.whatsapp}?text=${encodeURIComponent(msg)}`;
}

/* ── Calendar export (.ics) ── */

function cairoOffsetMinutes(date) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    timeZoneName: 'shortOffset',
  });
  const part = dtf.formatToParts(date).find(p => p.type === 'timeZoneName')?.value || 'GMT+2';
  const m = part.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!m) return 120;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] || 0));
}

function nowUtcStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function toUtcStamp(localDatetime) {
  const local = new Date(`${localDatetime.replace(' ', 'T')}:00`);
  const utc = new Date(local.getTime() - cairoOffsetMinutes(local) * 60000);
  const p = n => String(n).padStart(2, '0');
  return (
    `${utc.getUTCFullYear()}${p(utc.getUTCMonth() + 1)}${p(utc.getUTCDate())}` +
    `T${p(utc.getUTCHours())}${p(utc.getUTCMinutes())}00Z`
  );
}

function downloadIcs() {
  const appt = state.appointment;
  if (!appt) return;

  const start = `${state.date} ${state.time}`;
  const end = addMinutes(start, state.service.duration).slice(0, 16);
  const discreet = appt.discreet_notifications;

  const title = t(discreet ? 'ics.title' : 'ics.titleFull', { service: localized(state.service.name) });
  const ref = t('ics.ref', { ref: appt.reference });
  const description = discreet
    ? ref
    : `${ref}\\n${localized(state.service.name)}\\n${localized(state.clinic.address)}`;
  const location = discreet ? '' : localized(state.clinic.address).replace(/,/g, '\\,');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dr Amro Alahawany//Booking//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${appt.hash}@ahwani.com`,
    `DTSTAMP:${nowUtcStamp()}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${t('ics.alarm')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${appt.reference}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(t('err.ics'));
}

/* ── go ── */
document.addEventListener('DOMContentLoaded', boot);
