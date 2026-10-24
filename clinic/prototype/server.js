#!/usr/bin/env node
/**
 * Dr. Amro Alahawany — Premium Booking Prototype
 * -------------------------------------------------
 * A dependency-free mock server that mirrors the *exact* request/response
 * shapes of Easy!Appointments' public booking endpoints, so the front-end
 * can be pointed at the real PHP backend by changing one constant in app.js.
 *
 * Maps 1:1 to Easy!Appointments controllers:
 *   POST /api/availability  ->  Booking::get_available_hours()
 *   POST /api/register      ->  Booking::register()
 *   GET  /api/clinic        ->  (config: services / providers / settings)
 *
 * Run:  node clinic/prototype/server.js
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 4173;
const PUBLIC_DIR = path.join(__dirname, 'public');

/* ------------------------------------------------------------------ *
 * Clinic configuration — everything here becomes an EA setting / record
 * ------------------------------------------------------------------ */

const CLINIC = {
  name: 'عيادة د. عمرو الأهواني',
  tagline: 'استشاري جراحات وأمراض الذكورة — كلية الطب، جامعة القاهرة',
  phone: '01200055755',
  whatsapp: '201200055755',
  address: '26 شارع البطل أحمد عبد العزيز — الدور الرابع، أعلى معمل ألفا، المهندسين',
  mapUrl: 'https://maps.google.com/?q=26+شارع+البطل+احمد+عبد+العزيز+المهندسين',
  // Consented PDPL wording version — bump when the policy text changes.
  consentVersion: '2026-10-v1',
  workingHours: { start: 14, end: 22 }, // 2 PM – 10 PM
  closedWeekdays: [5], // Friday
};

/** EA "services" table. `duration` is minutes, `price` EGP. */
const SERVICES = [
  {
    id: '1',
    name: 'استشارة أولى',
    desc: 'تقييم شامل وتاريخ مرضي وخطة علاج — للمرة الأولى.',
    duration: 30,
    price: 500,
    tag: 'الأكثر طلبًا',
    icon: 'stethoscope',
  },
  {
    id: '2',
    name: 'استشارة متابعة',
    desc: 'مراجعة النتائج وتعديل الخطة العلاجية للمرضى الحاليين.',
    duration: 20,
    price: 300,
    icon: 'repeat',
  },
  {
    id: '3',
    name: 'تقييم دوالي الخصية بالدوبلكس',
    desc: 'فحص بالموجات فوق الصوتية مع تقرير مفصل بالدرجة والنوع.',
    duration: 45,
    price: 700,
    icon: 'scan',
  },
  {
    id: '4',
    name: 'استشارة تأخر الإنجاب والحقن المجهري',
    desc: 'تقييم أسباب تأخر الإنجاب وخطة العلاج أو الحقن المجهري.',
    duration: 45,
    price: 600,
    icon: 'cells',
  },
  {
    id: '5',
    name: 'استشارة عن بُعد (فيديو)',
    desc: 'نفس الاستشارة من مكانك — عبر مكالمة فيديو آمنة.',
    duration: 30,
    price: 400,
    tag: 'جديد',
    icon: 'video',
    remote: true,
  },
];

const PROVIDERS = [{ id: '1', name: 'أ.د. عمرو الأهواني', serviceIds: ['1', '2', '3', '4', '5'] }];

/* ------------------------------------------------------------------ *
 * Deterministic pseudo-randomness so slots look stable across refreshes
 * ------------------------------------------------------------------ */

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateKey(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/* ------------------------------------------------------------------ *
 * Availability — mirrors Booking::get_available_hours()
 * ------------------------------------------------------------------ */

function buildSlots(serviceId, dateKey) {
  const service = SERVICES.find(s => s.id === serviceId);
  if (!service) return [];

  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return [];
  if (date < new Date(new Date().toDateString())) return [];
  if (CLINIC.closedWeekdays.includes(date.getDay())) return [];

  const slots = [];
  const { start, end } = CLINIC.workingHours;

  for (let minutes = start * 60; minutes + service.duration <= end * 60; minutes += 30) {
    const hh = Math.floor(minutes / 60);
    const mm = minutes % 60;
    const time = `${pad(hh)}:${pad(mm)}`;

    // Sunday-dense / late-afternoon-dense realistic occupancy.
    const r = hash(`${dateKey}|${serviceId}|${time}`);
    const load = r * 0.9 + (mm === 0 ? 0.12 : 0) + (hh >= 18 ? 0.15 : 0);
    if (load < 0.42) continue;

    slots.push({ time, provider_id: PROVIDERS[0].id });
  }

  return slots;
}

function availableDates(serviceId, days = 21) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const key = toDateKey(d);
    const slots = buildSlots(serviceId, key).length;
    out.push({ date: key, available: slots, closed: CLINIC.closedWeekdays.includes(d.getDay()) });
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Persistence (in-memory — demo only)
 * ------------------------------------------------------------------ */

const APPOINTMENTS = [];

function makeReference() {
  // Human-readable + non-revealing: no service name, no specialty.
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const a = letters[Math.floor(Math.random() * letters.length)];
  const b = letters[Math.floor(Math.random() * letters.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}${b}-${n}`;
}

/* ------------------------------------------------------------------ *
 * HTTP helpers
 * ------------------------------------------------------------------ */

function sendJson(res, code, body) {
  const payload = JSON.stringify(body);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // SPA fallback
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) return res.writeHead(404).end('Not found');
        res.writeHead(200, { 'Content-Type': MIME['.html'] }).end(html);
      });
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
}

/* ------------------------------------------------------------------ *
 * Router
 * ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  try {
    if (pathname === '/api/clinic' && req.method === 'GET') {
      return sendJson(res, 200, {
        clinic: CLINIC,
        services: SERVICES,
        providers: PROVIDERS,
        // EA: booking_settings -> display_*/require_* flags
        fields: { email: 'optional', address: 'hidden', city: 'hidden' },
      });
    }

    if (pathname === '/api/availability' && req.method === 'POST') {
      const body = await readBody(req);
      // EA contract: { provider_id, service_id, selected_date, manage_mode? }
      const { service_id, selected_date } = body;
      if (!service_id || !selected_date) {
        return sendJson(res, 400, { message: 'service_id and selected_date are required.' });
      }
      return sendJson(res, 200, {
        service_id,
        selected_date,
        slots: buildSlots(service_id, selected_date),
        calendar: availableDates(service_id),
      });
    }

    if (pathname === '/api/calendar' && req.method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, { calendar: availableDates(body.service_id) });
    }

    if (pathname === '/api/register' && req.method === 'POST') {
      const body = await readBody(req);
      const postData = body.post_data || {};
      const appointment = postData.appointment || {};
      const customer = postData.customer || {};

      // Server-side validation — same spirit as Booking::register()
      if (!customer.first_name || String(customer.first_name).trim().length < 2) {
        return sendJson(res, 422, { message: 'الاسم مطلوب (حرفين على الأقل).' });
      }
      if (!/^01[0-9]{9}$/.test(String(customer.phone_number || '').replace(/\s|-/g, ''))) {
        return sendJson(res, 422, { message: 'رقم الموبايل غير صحيح — 11 رقم يبدأ بـ 01.' });
      }
      if (customer.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email)) {
        return sendJson(res, 422, { message: 'البريد الإلكتروني غير صحيح.' });
      }
      // Egypt PDPL art. 12 — explicit consent is mandatory for health data.
      if (!body.consent || !body.consent.accepted) {
        return sendJson(res, 422, { message: 'الموافقة على سياسة الخصوصية مطلوبة لإتمام الحجز.' });
      }
      if (body.consent.version !== CLINIC.consentVersion) {
        return sendJson(res, 409, { message: 'تم تحديث سياسة الخصوصية — يرجى إعادة الموافقة.' });
      }

      const taken = APPOINTMENTS.some(
        a => a.start_datetime === appointment.start_datetime && a.service_id === appointment.service_id,
      );
      if (taken) {
        return sendJson(res, 409, { message: 'هذا الموعد تم حجزه للتو. اختر وقتًا آخر.' });
      }

      const record = {
        id: String(APPOINTMENTS.length + 1),
        hash: require('node:crypto').randomBytes(8).toString('hex'),
        service_id: String(appointment.service_id),
        provider_id: String(appointment.provider_id || '1'),
        start_datetime: appointment.start_datetime,
        customer: {
          first_name: customer.first_name,
          last_name: customer.last_name || '',
          phone_number: customer.phone_number,
          email: customer.email || '',
        },
        discreet_notifications: Boolean(customer.discreet_notifications),
        consent: { accepted: true, version: body.consent.version, at: new Date().toISOString() },
        reference: makeReference(),
        status: 'Booked',
      };

      APPOINTMENTS.push(record);
      console.log(`[booked] ${record.reference}  ${record.start_datetime}  ${record.service_id}`);

      return sendJson(res, 201, {
        appointment: record,
        // EA returns: { appointment: {...}, ... }
        message: 'تم تأكيد حجزك بنجاح.',
      });
    }

    if (pathname === '/api/appointments' && req.method === 'GET') {
      return sendJson(res, 200, { appointments: APPOINTMENTS });
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { message: 'Unknown endpoint.' });
    }

    return serveStatic(req, res, pathname);
  } catch (err) {
    console.error(err);
    return sendJson(res, 500, { message: err.message || 'حدث خطأ غير متوقع.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  عيادة د. عمرو الأهواني — booking prototype`);
  console.log(`  http://localhost:${PORT}\n`);
});
