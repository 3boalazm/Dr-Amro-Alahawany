#!/usr/bin/env node
/* ══════════════════════════════════════════════════════════════
   Smoke test — نادي على أي نشرة واتأكد إنها شغالة فعلاً.

     node tools/smoke.js                       # السيرفر المحلي
     node tools/smoke.js https://example.com   # نشرة على Vercel

   بيفشل (exit 1) لو أي حاجة مش مظبوطة، وبيميّز بين:
     • 500  → الدالة بتقع
     • تسجيل دخول Vercel → حماية النشر مفعّلة
   ══════════════════════════════════════════════════════════════ */

const BASE = (process.argv[2] || 'http://localhost:4173').replace(/\/+$/, '');

const results = [];
const check = (name, ok, detail = '') => results.push({ name, ok: !!ok, detail });

const ASSETS = [
  ['/styles.css', 'text/css'],
  ['/core.js', 'javascript'],
  ['/booking.js', 'javascript'],
  ['/home.js', 'javascript'],
  ['/i18n.js', 'javascript'],
  ['/install.js', 'javascript'],
  ['/sw.js', 'javascript'],
  ['/manifest.webmanifest', 'manifest'],
  ['/icons/icon-192.png', 'image/png'],
  ['/icons/icon-512.png', 'image/png'],
  ['/icons/apple-touch-icon.png', 'image/png'],
  ['/favicon.ico', 'image'],
  ['/img/doctor-480.webp', 'image/webp'],
  ['/img/doctor-480.jpg', 'image/jpeg'],
  ['/img/avatar-96.webp', 'image/webp'],
  ['/img/avatar-192.jpg', 'image/jpeg'],
];

const BLOCKED = ['/server.js', '/package.json', '/lib/api-core.js', '/tools/make-icons.py'];

async function get(path, init) {
  const res = await fetch(BASE + path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(15000),
    ...init,
  });
  const body = await res.text();
  return { res, body, status: res.status, type: res.headers.get('content-type') || '' };
}

(async () => {
  console.log(`\n  فحص: ${BASE}\n`);

  /* ── 1. the page itself ── */
  let home;
  try {
    home = await get('/');
  } catch (err) {
    console.log(`  ✗ تعذّر الوصول للسيرفر: ${err.message}\n`);
    process.exit(1);
  }

  const isLogin =
    home.res.headers.get('x-vercel-protection') ||
    /vercel\.com\/login|Log in to Vercel|Authentication Required/i.test(home.body) ||
    (home.status >= 300 && home.status < 400 && /vercel\.com/.test(home.res.headers.get('location') || ''));

  if (isLogin) {
    console.log('  ✗ الصفحة محمية بـ Vercel Authentication.\n');
    console.log('    Settings → Deployment Protection → Vercel Authentication → Disabled\n');
    process.exit(1);
  }

  check('/ يرجّع 200', home.status === 200, `${home.status}`);
  check('/ يرجّع HTML', home.type.includes('text/html'), home.type);

  if (home.status === 500) {
    console.log('\n  ✗ 500 — الدالة بتقع. راجع فحص الـ serverless logs على Vercel.\n');
  }

  // The page must be the app, not an error page.
  check('الصفحة فيها التطبيق', home.body.includes('core.js') && home.body.includes('serviceList'));
  check('الصفحة مش صفحة خطأ', !/FUNCTION_INVOCATION_FAILED|Application error/i.test(home.body));
  check('الصفحة فيها manifest', home.body.includes('manifest.webmanifest'));
  check('الصفحة RTL عربي', home.body.includes('dir="rtl"'));
  check('فيها رابط الأيقونة', home.body.includes('favicon.ico'));
  check('HTML متطابق مع المستودع', home.body.length > 5000, `${home.body.length} حرف`);
  check('صورة الطبيب في الصفحة', home.body.includes('img/doctor-480.webp'));
  // الهيدر (والأفاتار) بقوا في core.js، بيتحقنوا في كل صفحة.
  check('أفاتار الهيدر موجود', (await get('/core.js')).body.includes('img/avatar-96.webp'));
  check('صورة الطبيب فيها alt', /img[^>]*data-i18n-alt/.test(home.body) || home.body.includes('data-i18n-alt'));

  /* ── 1b. الصفحات الأربعة ── */
  for (const page of ['/booking.html', '/clinic.html', '/privacy.html']) {
    try {
      const r = await get(page);
      check(`${page} 200`, r.status === 200, `${r.status}`);
      check(`${page} HTML`, r.type.includes('text/html'), r.type);
      check(`${page} بيحمّل core.js`, r.body.includes('src="core.js"'));
      check(`${page} مش صفحة خطأ`, !/FUNCTION_INVOCATION_FAILED|Application error/i.test(r.body));
    } catch (err) {
      check(`${page}`, false, err.message);
    }
  }

  /* ── 2. static assets ── */
  for (const [path, expected] of ASSETS) {
    try {
      const r = await get(path);
      const okType = r.type.toLowerCase().includes(expected);
      check(`${path} 200`, r.status === 200, `${r.status}`);
      check(`${path} النوع صح`, okType, r.type);
    } catch (err) {
      check(`${path}`, false, err.message);
    }
  }

  /* ── 3. internal files must not be downloadable ── */
  for (const path of BLOCKED) {
    try {
      const r = await get(path);
      check(`${path} محجوب`, r.status === 404, `${r.status}`);
    } catch (err) {
      check(`${path} محجوب`, false, err.message);
    }
  }

  /* ── 4. manifest is real JSON with icons that exist ── */
  try {
    const r = await get('/manifest.webmanifest');
    const m = JSON.parse(r.body);
    check('manifest JSON صالح', true);
    check('manifest standalone', m.display === 'standalone', m.display);
    check('manifest فيه 512', (m.icons || []).some(i => i.sizes === '512x512'));
    check('manifest فيه maskable', (m.icons || []).some(i => i.purpose === 'maskable'));

    for (const icon of m.icons || []) {
      const src = icon.src.startsWith('/') ? icon.src : `/${icon.src}`;
      const ri = await get(src);
      check(`أيقونة ${icon.sizes} موجودة`, ri.status === 200, `${ri.status}`);
    }
  } catch (err) {
    check('manifest', false, err.message);
  }

  /* ── 5. service worker flags ── */
  try {
    const r = await get('/sw.js');
    check('sw يمنع كاش الـ API', r.body.includes("'/api/'"));
    check('sw بيكاش الواجهة', r.body.includes("'/index.html'") && r.body.includes("'/booking.html'"));
  } catch (err) {
    check('sw', false, err.message);
  }

  /* ── 6. the API actually runs ── */
  try {
    const r = await get('/api/clinic');
    check('/api/clinic 200', r.status === 200, `${r.status}`);
    const j = JSON.parse(r.body);
    check('/api/clinic بيرجّع خدمات', Array.isArray(j.services) && j.services.length > 0,
      `${j.services && j.services.length}`);
    check('بيانات العيادة موجودة', !!j.clinic && !!j.clinic.phone);
  } catch (err) {
    check('/api/clinic', false, err.message);
  }

  try {
    const r = await get('/api/availability', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ service_id: 1, selected_date: tomorrow(), provider_id: 1 }),
    });
    check('/api/availability 200', r.status === 200, `${r.status}`);
    const j = JSON.parse(r.body);
    check('/api/availability بيرجّع مواعيد', Array.isArray(j.slots), `${j.slots && j.slots.length}`);
  } catch (err) {
    check('/api/availability', false, err.message);
  }

  /* ── report ── */
  let failed = 0;
  for (const r of results) {
    if (!r.ok) failed++;
    console.log(`${r.ok ? '  ✓' : '  ✗'} ${r.name}${!r.ok && r.detail ? `   [${r.detail}]` : ''}`);
  }
  console.log(`\n  ${results.length - failed}/${results.length} نجحت${failed ? ` — ${failed} فشلت` : ''}\n`);
  process.exit(failed ? 1 : 0);
})();

function tomorrow() {
  // Skip Friday, when the clinic is closed.
  const d = new Date();
  do d.setDate(d.getDate() + 1);
  while (d.getDay() === 5);
  return d.toISOString().slice(0, 10);
}
