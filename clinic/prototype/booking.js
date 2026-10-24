/* ══════════════════════════════════════════════════════════════
   booking.js — the four-step booking flow (booking.html only).

   Every step can be revisited: the stepper is clickable, each step
   has a back control, and the summary above the form lets you jump
   straight back to the service or the time without walking the
   whole flow again. Browser back/forward works too.
   ══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const APP = window.APP;
  if (!APP || document.body.dataset.page !== 'booking') return;

  const { t, localized, api, fmtDate, fmtTime, money, toast, $, $$ } = APP;
  const state = APP.state;

  Object.assign(state, {
    service: null,
    calendar: [],
    slots: [],
    date: null,
    time: null,
    step: 1,
    submitting: false,
    appointment: null,
  });

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

    syncButtons();
  }

  async function selectService(id, { silent = false } = {}) {
    const service = state.services.find(s => s.id === id) || null;
    if (!service) return;

    // Coming back to change the service only resets the parts that depend
    // on it — a picked day and time are meaningless for a different visit.
    const changed = state.service && state.service.id !== service.id;
    state.service = service;

    $$('.service-card').forEach(c => {
      const on = c.dataset.service === id;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-checked', String(on));
    });

    if (changed) {
      state.date = null;
      state.time = null;
      state.slots = [];
      state.calendar = [];
      renderSlots([]);
      renderSummary();
      if (!silent) toast(t('toast.serviceChanged'));
    }

    syncButtons();

    try {
      const data = await api('/api/calendar', { service_id: id });
      state.calendar = data.calendar || [];
      renderDates();
    } catch {
      toast(t('err.load'), 'error');
    }
  }

  /* ══════════════ Step 2 — date & time ══════════════ */

  function renderDates() {
    const rail = $('#dateRail');
    if (!rail) return;

    rail.innerHTML = state.calendar
      .map(d => {
        const dt = new Date(`${d.date}T12:00:00`);
        const locale = window.LOCALES.find(l => l.id === state.locale).intl;
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
    syncButtons();
  }

  async function selectDate(date, { silent = false } = {}) {
    state.date = date;
    state.time = null;

    $$('.date-chip').forEach(c => {
      const on = c.dataset.date === date;
      c.classList.toggle('is-selected', on);
      c.setAttribute('aria-selected', String(on));
    });

    syncButtons();

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

    if (!silent) renderSummary();
  }

  function renderSlots(slots) {
    const grid = $('#slotGrid');
    if (!grid) return;

    if (!slots || !slots.length) {
      grid.innerHTML = `<p class="empty-state">${state.date ? t('panel2.noSlots') : t('panel2.pickDay')}</p>`;
      syncButtons();
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
      syncButtons();
      renderSummary();
    };

    syncButtons();
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

  /* ══════════════ Summary — go back and change a choice ══════════════ */

  function renderSummary() {
    const box = $('#summary');
    if (!box) return;

    const visible = state.step > 1 && state.step < 4 && !!state.service;
    box.hidden = !visible;
    if (!visible) return;

    $('#sumService').textContent = localized(state.service.name);

    let when = t('sum.none');
    if (state.date) when = fmtDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' });
    if (state.time) when += ` — ${fmtTime(state.time)}`;
    $('#sumWhen').textContent = when;

    box.querySelector('[data-edit="2"]').disabled = !state.date;
  }

  /* ══════════════ Navigation ══════════════ */

  /* A step is open as soon as the choice it shows exists — not once it has
     been visited. That is what makes jumping back and forth feel free. */
  function canGo(step) {
    if (step === 2) return !!state.service;
    if (step === 3) return !!state.time;
    if (step === 4) return !!state.appointment;
    return true;
  }

  function syncButtons() {
    const next1 = $('#next1');
    if (next1) next1.disabled = !state.service;
    const next2 = $('#next2');
    if (next2) next2.disabled = !state.time;

    $$('.step-btn').forEach(btn => {
      btn.disabled = !canGo(Number(btn.dataset.go));
    });

    renderSummary();
  }

  function go(step, { push = true, scroll = true } = {}) {
    if (!canGo(step)) {
      toast(state.service ? t('err.pickTime') : t('err.pickService'));
      return;
    }

    state.step = step;

    [1, 2, 3, 4].forEach(n => {
      const panel = $(`#panel-${n}`);
      if (panel) panel.hidden = n !== step;
    });

    updateStepper();
    syncButtons();

    if (push) {
      const url = step === 1 ? location.pathname : `${location.pathname}#${step}`;
      try {
        history.pushState({ step }, '', url);
      } catch {}
    }

    if (scroll) {
      const top = $('.stepper').getBoundingClientRect().top + window.scrollY - 84;
      window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    }

    if (step === 3) setTimeout(() => $('#firstName')?.focus(), 420);
  }

  function updateStepper() {
    $$('.step').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('is-active', n === state.step);
      li.classList.toggle('is-done', n < state.step);
      li.querySelector('.step-btn')?.setAttribute('aria-current', n === state.step ? 'step' : 'false');
    });
    const progress = $('#stepperProgress');
    if (progress) progress.style.width = `${((state.step - 1) / 3) * 100}%`;
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
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

  function addMinutes(datetime, mins) {
    const d = new Date(datetime.replace(' ', 'T'));
    d.setMinutes(d.getMinutes() + mins);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:00`;
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

  /* ══════════════ Success ══════════════ */

  function renderSuccess() {
    const appt = state.appointment;
    if (!appt || !state.service) return;

    const discreet = appt.discreet_notifications;
    $('#successSub').textContent = t(discreet ? 'success.subDiscreet' : 'success.subNormal');
    $('#refCode').textContent = appt.reference;
    $('#sumServiceName').textContent = localized(state.service.name);
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
    toast(t('toast.ics'));
  }

  /* ══════════════ Wire it up ══════════════ */

  function restart() {
    Object.assign(state, {
      service: null,
      calendar: [],
      slots: [],
      date: null,
      time: null,
      appointment: null,
    });
    $$('.service-card').forEach(c => {
      c.classList.remove('is-selected');
      c.setAttribute('aria-checked', 'false');
    });
    $('#slotGrid').innerHTML = '';
    $('#detailsForm').reset();
    $('#discreet').checked = true;
    renderServices();
    renderSlots([]);
    go(1, { scroll: false });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function wire() {
    // Stepper doubles as a back control: any step you have already reached
    // is one tap away, which is the whole point of showing it as buttons.
    $$('.step-btn').forEach(btn =>
      btn.addEventListener('click', () => go(Number(btn.dataset.go))),
    );

    $('#next1')?.addEventListener('click', () => go(2));
    $('#next2')?.addEventListener('click', () => go(3));
    $('#backTo1')?.addEventListener('click', () => go(1));
    $('#backTo2')?.addEventListener('click', () => go(2));

    // Summary rows: jump straight back to the choice they show.
    $$('#summary .summary-row').forEach(row =>
      row.addEventListener('click', () => go(Number(row.dataset.edit))),
    );

    $('#railPrev')?.addEventListener('click', () => {
      $('#dateRail').scrollLeft -= 240;
    });
    $('#railNext')?.addEventListener('click', () => {
      $('#dateRail').scrollLeft += 240;
    });

    $('#restartBtn')?.addEventListener('click', restart);
    $('#icsBtn')?.addEventListener('click', downloadIcs);
    $('#detailsForm')?.addEventListener('submit', submitBooking);
    $('#phone')?.addEventListener('input', e => {
      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
    });

    window.addEventListener('popstate', () => {
      const step = Number(location.hash.slice(1)) || 1;
      if (step !== state.step) go(step, { push: false });
    });

    document.addEventListener('localechange', () => {
      renderServices();
      if (state.calendar.length) renderDates();
      if (state.slots.length || state.date) renderSlots(state.slots);
      renderSuccess();
      updateStepper();
      syncButtons();
    });
  }

  function start() {
    if (!state.services.length) return;

    renderServices();
    wire();

    // A service card on the home page links here with ?service=<id>, so
    // the visitor lands with that visit already chosen.
    const wanted = new URLSearchParams(location.search).get('service');
    if (wanted && state.services.some(s => s.id === wanted)) {
      selectService(wanted, { silent: true }).then(() => go(2, { push: false, scroll: false }));
    } else {
      go(1, { push: false, scroll: false });
    }
    try {
      history.replaceState({ step: state.step }, '', location.pathname + location.search);
    } catch {}
  }

  document.addEventListener('clinicready', start);
  // The event may have fired before this file ran (core caches its data).
  if (state.clinic) start();
})();
