/**
 * Shared request handlers.
 * Imported by both the local dev server (server.js) and the Vercel
 * serverless functions in /api, so behaviour is identical in both.
 */

const {
  CLINIC,
  SERVICES,
  PROVIDERS,
  buildSlots,
  availableDates,
  makeReference,
  validateBooking,
} = require('./clinic-data');

/**
 * Best-effort in-memory store.
 * On Vercel each function instance is short-lived, so this only prevents
 * double-booking inside a single warm instance. Replace with a real store
 * (Easy!Appointments' MySQL, or Vercel Postgres/KV) before going live.
 */
const BOOKINGS = [];

const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

/* ── helpers ── */

function send(res, { status = 200, body, headers = {} }) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Length': Buffer.byteLength(payload),
    ...headers,
  });
  res.end(payload);
}

function preflight(res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  });
  res.end();
}

/** Vercel may hand us a pre-parsed body; the local server hands us a stream. */
function readBody(req) {
  if (req.body !== undefined) {
    if (req.body === null || req.body === '') return Promise.resolve({});
    if (typeof req.body === 'object') return Promise.resolve(req.body);
    try {
      return Promise.resolve(JSON.parse(req.body));
    } catch {
      return Promise.reject(Object.assign(new Error('Invalid JSON'), { code: 'bad_json' }));
    }
  }

  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) reject(Object.assign(new Error('Payload too large'), { code: 'too_large' }));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { code: 'bad_json' }));
      }
    });
    req.on('error', reject);
  });
}

const fail = (status, code, extra = {}) => ({ status, body: { code, ...extra } });

/* ── handlers ── */

function clinic() {
  return {
    status: 200,
    body: {
      clinic: CLINIC,
      services: SERVICES,
      providers: PROVIDERS,
      fields: { email: 'optional', address: 'hidden', city: 'hidden' },
    },
  };
}

function calendar(body = {}) {
  if (!body.service_id) return fail(400, 'invalid_service');
  return { status: 200, body: { calendar: availableDates(body.service_id) } };
}

function availability(body = {}) {
  if (!body.service_id || !body.selected_date) return fail(400, 'invalid_appointment');

  return {
    status: 200,
    body: {
      service_id: body.service_id,
      selected_date: body.selected_date,
      slots: buildSlots(body.service_id, body.selected_date),
      calendar: availableDates(body.service_id),
    },
  };
}

function register(body = {}) {
  const error = validateBooking(body);
  if (error) {
    const status = error === 'consent_stale' ? 409 : 422;
    return fail(status, error);
  }

  const { appointment = {}, customer = {} } = body.post_data || {};
  const startDatetime = String(appointment.start_datetime);

  const clash = BOOKINGS.find(
    b => b.start_datetime === startDatetime && b.service_id === String(appointment.service_id),
  );
  if (clash) return fail(409, 'slot_taken');

  const record = {
    id: String(BOOKINGS.length + 1),
    hash: require('node:crypto').randomBytes(8).toString('hex'),
    service_id: String(appointment.service_id),
    provider_id: String(appointment.provider_id || '1'),
    start_datetime: startDatetime,
    end_datetime: appointment.end_datetime || null,
    customer: {
      first_name: customer.first_name,
      last_name: customer.last_name || '',
      phone_number: customer.phone_number,
      email: customer.email || '',
    },
    discreet_notifications: Boolean(customer.discreet_notifications),
    // PDPL art. 12 — the consent record must be verifiable.
    consent: {
      accepted: true,
      version: body.consent.version,
      scope: body.consent.scope || [],
      at: new Date().toISOString(),
    },
    reference: makeReference(),
    status: 'Booked',
  };

  BOOKINGS.push(record);
  console.log(`[booked] ${record.reference} ${record.start_datetime} service=${record.service_id}`);

  return { status: 201, body: { appointment: record } };
}

module.exports = { clinic, calendar, availability, register, send, preflight, readBody, BOOKINGS };
