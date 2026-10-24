/* ══════════════════════════════════════════════════════════
   Dr. Amro Alahawany — booking flow
   ──────────────────────────────────────────────────────────
   To point this UI at the real Easy!Appointments backend,
   change API_BASE below. Endpoint contracts are documented
   in clinic/prototype/README.md.
   ══════════════════════════════════════════════════════════ */

const API_BASE = ''; // e.g. 'https://clinic.example.com/index.php' — empty = same origin

const state = {
  clinic: null,
  services: [],
  service: null,
  calendar: [],
  date: null,
  time: null,
  step: 1,
  submitting: false,
  appointment: null,
};

const $ = sel => document.querySelector(sel);
const $$ = sel => [...document.querySelectorAll(sel)];

/* ── icons ── */
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

function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${
    ICONS[name] || ICONS.stethoscope
  }</svg>`;
}

/* ── formatting ── */
const AR_LOCALE = 'ar-EG-u-nu-latn';

function fmtDate(iso, opts) {
  return new Intl.DateTimeFormat(AR_LOCALE, { timeZone: 'Africa/Cairo', ...opts }).format(
    new Date(`${iso}T12:00:00`),
  );
}

function fmtTime(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
}

function money(n) {
  return new Intl.NumberFormat(AR_LOCALE).format(n);
}

/* ── toast ── */
let toastTimer;
function toast(msg, tone = 'info') {
  const el = $('#toast');
  el.textContent = msg;
  el.dataset.tone = tone;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (el.hidden = true), 3800);
}

/* ── api ── */
async function api(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'تعذّر إتمام الطلب. يرجى المحاولة مرة أخرى.');
  return data;
}

/* ══════════════ Boot ══════════════ */

async function boot() {
  $('#year').textContent = new Date().getFullYear();

  try {
    const data = await api('/api/clinic');
    state.clinic = data.clinic;
    state.services = data.services;
    renderServices();
    wireNav();
    updateStepper();
  } catch (err) {
    toast('تعذّر تحميل بيانات العيادة.', 'error');
    console.error(err);
  }
}

/* ══════════════ Step 1 — services ══════════════ */

function renderServices() {
  const list = $('#serviceList');
  list.innerHTML = state.services
    .map(
      s => `
      <button type="button" class="service-card" role="radio" aria-checked="false"
              data-service="${s.id}">
        <div class="sc-top">
          <span class="sc-icon">${icon(s.icon)}</span>
          ${s.tag ? `<span class="sc-tag">${s.tag}</span>` : ''}
        </div>
        <span class="sc-title">${s.name}</span>
        <span class="sc-desc">${s.desc}</span>
        <div class="sc-meta">
          <span class="sc-dur">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8" stroke-linecap="round"/>
            </svg>
            ${s.duration} دقيقة
          </span>
          <span class="sc-price">${money(s.price)} <small>ج.م</small></span>
        </div>
      </button>`,
    )
    .join('');

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

  // continue button for step 1
  appendActions(list.parentElement, 'next1');
}

async function selectService(id) {
  state.service = state.services.find(s => s.id === id) || null;

  $$('.service-card').forEach(c => {
    const on = c.dataset.service === id;
    c.classList.toggle('is-selected', on);
    c.setAttribute('aria-checked', String(on));
  });

  const btn = $('#next1');
  if (btn) btn.disabled = !state.service;

  updateSticky();
  if (!state.service) return;

  try {
    const data = await api('/api/calendar', { service_id: id });

    // Reset downstream selections before re-rendering the rail, otherwise the
    // auto-selected first open day would be wiped by a stale re-render.
    state.calendar = data.calendar || [];
    state.date = null;
    state.time = null;
    const next2El = $('#next2');
    if (next2El) next2El.disabled = true;

    renderDates();
  } catch {
    toast('تعذّر تحميل المواعيد المتاحة.', 'error');
  }
}

/* ══════════════ Step 2 — date & time ══════════════ */

function renderDates() {
  const rail = $('#dateRail');
  const firstOpen = state.calendar.find(d => d.available > 0);

  rail.innerHTML = state.calendar
    .map(d => {
      const dt = new Date(`${d.date}T12:00:00`);
      const dow = new Intl.DateTimeFormat(AR_LOCALE, { weekday: 'short' }).format(dt);
      const day = new Intl.DateTimeFormat(AR_LOCALE, { day: 'numeric' }).format(dt);
      const mon = new Intl.DateTimeFormat(AR_LOCALE, { month: 'short' }).format(dt);
      const disabled = d.available === 0;
      const label = disabled
        ? d.closed
          ? 'مغلق'
          : 'مكتمل'
        : `${new Intl.NumberFormat(AR_LOCALE).format(d.available)} موعد`;
      return `<button type="button" class="date-chip" data-date="${d.date}"
                ${disabled ? 'disabled' : ''} role="option" aria-selected="false">
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

  if (firstOpen) selectDate(firstOpen.date, { silent: true });
  updateRailArrows();
}

async function selectDate(date, { silent = false } = {}) {
  state.date = date;
  state.time = null;
  const nextBtn = $('#next2');
  if (nextBtn) nextBtn.disabled = true;

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
    renderSlots(data.slots || []);
  } catch {
    toast('تعذّر تحميل الأوقات المتاحة.', 'error');
  }

  if (!silent) updateSticky();
}

function renderSlots(slots) {
  const grid = $('#slotGrid');
  const duration = state.service?.duration || 30;

  if (slots === undefined) {
    grid.innerHTML = '<p class="empty-state">اختر يومًا من الأعلى لعرض الأوقات المتاحة.</p>';
    return;
  }

  if (!slots.length) {
    grid.innerHTML = '<p class="empty-state">لا توجد أوقات متاحة في هذا اليوم. جرّب يومًا آخر.</p>';
    updateSticky();
    return;
  }

  // Build the full working window so booked slots render as disabled (honest UI).
  const taken = new Set(slots.map(s => s.time));
  const [startH] = (state.clinic?.workingHours.start ?? 14).toString().split(':');
  const endH = state.clinic?.workingHours.end ?? 22;
  const all = [];
  for (let m = Number(startH) * 60; m + duration <= endH * 60; m += 30) {
    all.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }

  grid.innerHTML = all
    .map(t =>
      taken.has(t)
        ? `<button type="button" class="slot" data-time="${t}">${fmtTime(t)}</button>`
        : `<button type="button" class="slot" disabled>${fmtTime(t)}</button>`,
    )
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
  const sync = () => {
    $('#railPrev').disabled = rail.scrollLeft >= -2;
    $('#railNext').disabled = rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 2;
  };
  rail.onscroll = sync;
  setTimeout(sync, 60);
}

/* ══════════════ Navigation ══════════════ */

function appendActions(panel, id) {
  if (panel.querySelector(`#${id}`)) return;
  const row = document.createElement('div');
  row.className = 'form-actions';
  row.style.marginTop = '22px';
  row.innerHTML = `<span></span>
    <button type="button" class="primary-btn" id="${id}" disabled>
      <span>متابعة</span>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="m14 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>`;
  panel.appendChild(row);
}

function wireNav() {
  appendActions($('#panel-2'), 'next2');
  const next2 = $('#next2');
  if (next2) next2.disabled = true;

  $('#next1').addEventListener('click', () => go(2));
  $('#next2').addEventListener('click', () => go(3));
  $('#backTo2').addEventListener('click', () => go(2));
  $('#railPrev').addEventListener('click', () => ($('#dateRail').scrollLeft -= 240));
  $('#railNext').addEventListener('click', () => ($('#dateRail').scrollLeft += 240));
  $('#restartBtn').addEventListener('click', () => location.reload());
  $('#icsBtn').addEventListener('click', downloadIcs);
  $('#stickyCta').addEventListener('click', () => {
    if (state.step === 1 && state.service) go(2);
    else if (state.step === 2 && state.time) go(3);
  });

  $('#privacyLink').addEventListener('click', e => {
    e.preventDefault();
    toast('سيتم ربط سياسة الخصوصية بصفحة منفصلة قبل التشغيل.');
  });

  $('#detailsForm').addEventListener('submit', submitBooking);
  $('#phone').addEventListener('input', e => {
    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 11);
  });
}

function go(step) {
  if (step === 2 && !state.service) return toast('اختر الخدمة أولًا.');
  if (step === 3 && !state.time) return toast('اختر الوقت أولًا.');

  state.step = step;

  [1, 2, 3, 4].forEach(n => {
    const panel = $(`#panel-${n}`);
    if (panel) panel.hidden = n !== step;
  });

  updateStepper();
  updateSticky();

  const y = $('#booking').getBoundingClientRect().top + window.scrollY - 84;
  window.scrollTo({ top: y, behavior: 'smooth' });

  if (step === 3) setTimeout(() => $('#firstName')?.focus(), 420);
}

function updateStepper() {
  $$('.step').forEach(li => {
    const n = Number(li.dataset.stepDot);
    li.classList.toggle('is-active', n === state.step);
    li.classList.toggle('is-done', n < state.step);
  });
  $('#stepperProgress').style.width = `${((state.step - 1) / 3) * 100}%`;
}

/* ══════════════ Sticky bar ══════════════ */

function updateSticky() {
  const bar = $('#stickyBar');
  const show = !!state.service && (state.step === 1 || state.step === 2);
  bar.hidden = !show;
  if (!show) return;

  $('#stickyService').textContent = state.service?.name || '';
  $('#stickyWhen').textContent = state.time
    ? `${fmtDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' })} — ${fmtTime(state.time)}`
    : state.date
      ? fmtDate(state.date, { weekday: 'long', day: 'numeric', month: 'long' })
      : 'اختر الموعد';

  const cta = $('#stickyCta');
  cta.disabled = state.step === 2 && !state.time;
  cta.textContent = state.step === 1 ? 'اختر الوقت' : 'متابعة';
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

  setError('firstName', '');
  setError('phone', '');
  setError('email', '');
  setError('consent', '');

  if (first.length < 2) {
    setError('firstName', 'اكتب الاسم الأول (حرفين على الأقل).');
    ok = false;
  }
  if (!/^01[0-9]{9}$/.test(phone)) {
    setError('phone', 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01.');
    ok = false;
  }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    setError('email', 'البريد الإلكتروني غير صحيح.');
    ok = false;
  }
  if (!$('#consent').checked) {
    setError('consent', 'لازم توافق على سياسة الخصوصية لإتمام الحجز.');
    ok = false;
  }

  if (!ok) {
    const firstBad = document.querySelector('[aria-invalid="true"]');
    firstBad?.focus();
    toast('راجع البيانات المطلوبة.', 'error');
  }
  return ok;
}

async function submitBooking(e) {
  e.preventDefault();
  if (state.submitting || !validate()) return;

  state.submitting = true;
  const btn = $('#submitBtn');
  btn.disabled = true;
  btn.querySelector('span').textContent = 'جارٍ التأكيد…';

  // EA expects `start_datetime` as 'YYYY-MM-DD HH:MM:SS'
  const startDatetime = `${state.date} ${state.time}:00`;

  try {
    const payload = {
      // Mirrors Booking::register() request body exactly
      post_data: {
        appointment: {
          start_datetime: startDatetime,
          service_id: state.service.id,
          provider_id: '1',
          end_datetime: addMinutes(startDatetime, state.service.duration),
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
      // PDPL art. 12 — explicit, versioned, timestamped consent
      consent: {
        accepted: true,
        version: state.clinic?.consentVersion || 'v1',
        scope: ['booking', 'reminders', 'health_data'],
      },
      captcha: null,
    };

    const data = await api('/api/register', payload);
    state.appointment = data.appointment;
    showSuccess(data.appointment);
  } catch (err) {
    toast(err.message, 'error');
    btn.disabled = false;
    btn.querySelector('span').textContent = 'تأكيد الحجز';
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

function showSuccess(appt) {
  go(4);
  $('#stickyBar').hidden = true;

  const discreet = appt.discreet_notifications;
  $('#successSub').textContent = discreet
    ? 'هنبعتلك التأكيد والتذكير من رقم محايد وبدون أي تفاصيل طبية.'
    : 'هنبعتلك التأكيد والتذكير على واتساب خلال دقائق.';

  $('#refCode').textContent = appt.reference;
  $('#sumService').textContent = state.service.name;
  $('#sumDate').textContent = fmtDate(state.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  $('#sumTime').textContent = fmtTime(state.time);
  $('#sumDuration').textContent = `${state.service.duration} دقيقة`;

  const msg = discreet
    ? `مرحبًا، أؤكد حجزي رقم ${appt.reference} يوم ${fmtDate(state.date, { day: 'numeric', month: 'long' })} الساعة ${fmtTime(state.time)}.`
    : `مرحبًا، أؤكد موعدي في عيادة د. عمرو الأهواني — حجز رقم ${appt.reference}، ${state.service.name}، يوم ${fmtDate(
        state.date,
        { day: 'numeric', month: 'long' },
      )} الساعة ${fmtTime(state.time)}.`;

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
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (Number(m[2]) * 60 + Number(m[3] || 0));
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
  const local = new Date(localDatetime.replace(' ', 'T') + ':00');
  const offset = cairoOffsetMinutes(local);
  const utc = new Date(local.getTime() - offset * 60000);
  const p = n => String(n).padStart(2, '0');
  return (
    `${utc.getUTCFullYear()}${p(utc.getUTCMonth() + 1)}${p(utc.getUTCDate())}` +
    `T${p(utc.getUTCHours())}${p(utc.getUTCMinutes())}00Z`
  );
}

function downloadIcs() {
  if (!state.appointment) return;
  const start = `${state.date} ${state.time}`;
  const end = addMinutes(start, state.service.duration).slice(0, 16);
  const discreet = state.appointment.discreet_notifications;

  const title = discreet ? 'موعد' : `موعد — د. عمرو الأهواني (${state.service.name})`;
  const description = discreet
    ? `رقم الحجز: ${state.appointment.reference}`
    : `رقم الحجز: ${state.appointment.reference}\\nالخدمة: ${state.service.name}\\nالعيادة: ${state.clinic.address}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dr Amro Alahawany//Booking//AR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${state.appointment.hash}@ahwani.com`,
    `DTSTAMP:${nowUtcStamp()}`,
    `DTSTART:${toUtcStamp(start)}`,
    `DTEND:${toUtcStamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${discreet ? '' : state.clinic.address.replace(/,/g, '\\,')}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT24H',
    'ACTION:DISPLAY',
    'DESCRIPTION:تذكير بموعدك',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `appointment-${state.appointment.reference}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('تم تنزيل ملف الموعد — افتحه لإضافته للتقويم.');
}

/* ── go ── */
document.addEventListener('DOMContentLoaded', boot);
