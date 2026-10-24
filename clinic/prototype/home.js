/* ══════════════════════════════════════════════════════════════
   home.js — the landing page: the service list as links into the
   booking flow, and one honest line about whether the clinic is
   open right now. Nothing else needs JavaScript here.
   ══════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const APP = window.APP;
  if (!APP || document.body.dataset.page !== 'home') return;

  const { t, localized, money, fmtTime, $ } = APP;

  const chevron =
    '<svg class="svc-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="m14 5-7 7 7 7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function renderServices() {
    const list = $('#serviceList');
    if (!list) return;

    list.innerHTML = APP.state.services
      .map(
        s => `
        <a class="svc-row" href="booking.html?service=${s.id}">
          <span class="svc-main">
            <span class="svc-name">
              ${localized(s.name)}
              ${s.tag ? `<span class="sc-tag">${t(`tag.${s.tag}`)}</span>` : ''}
            </span>
            <span class="svc-desc">${localized(s.desc)}</span>
          </span>
          <span class="svc-side">
            <span class="svc-price">${money(s.price)} <small>${t('unit.currency')}</small></span>
            <span class="svc-meta">${s.duration} ${t('unit.minutes')}</span>
          </span>
          ${chevron}
        </a>`,
      )
      .join('');
  }

  function renderStatus() {
    const el = $('#statusLine');
    if (!el) return;

    const clinic = APP.state.clinic;
    if (!clinic) {
      el.hidden = true;
      return;
    }

    const at = h => fmtTime(`${String(h).padStart(2, '0')}:00`).replace(/^0/, '');
    const hours = `${at(clinic.workingHours.start)} – ${at(clinic.workingHours.end)}`;

    // Which weekday it is in Cairo, not where the visitor happens to be.
    const dowIndex = new Date(
      `${new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date())}T12:00:00`,
    ).getDay();

    const cairoHour = Number(
      new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hour12: false }).format(
        new Date(),
      ),
    );

    const closedToday = (clinic.closedWeekdays || []).includes(dowIndex);
    const openNow = !closedToday && cairoHour >= clinic.workingHours.start && cairoHour < clinic.workingHours.end;

    el.dataset.state = closedToday ? 'closed' : openNow ? 'open' : 'later';
    el.textContent = closedToday
      ? t('home.status.closed')
      : openNow
        ? t('home.status.open')
        : t('home.status.later', { hours });
  }

  function render() {
    renderServices();
    renderStatus();
  }

  document.addEventListener('clinicready', render);
  document.addEventListener('localechange', render);
  if (APP.state.clinic) render();
})();
