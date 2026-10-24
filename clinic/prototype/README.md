# واجهة الحجز — بروتوتايب

واجهة حجز عربية (RTL) لعيادة أ.د. عمرو الأهواني، مبنية على نفس عقود
Easy!Appointments API عشان تتحوّل لإنتاج بسهولة.

## المميزات

| | |
| --- | --- |
| **٣ لغات** | مصري · خليجي · إنجليزي — تبديل فوري بدون إعادة تحميل |
| **وضعين** | لايت / دارك — بيتذكر اختيارك، وبيتبع إعداد النظام أول مرة |
| **RTL/LTR** | الاتجاه بيتقلب تلقائيًا مع اللغة |
| **خصوصية** | وضع «الإشعارات السرّية» بيشيل اسم العيادة والتخصص من التأكيد وملف التقويم |
| **امتثال** | موافقة صريحة بنسخة وتاريخ (قانون ١٥١/٢٠٢٠) |
| **بدون dependencies** | صفر مكتبات — Node 18+ فقط |

## التشغيل المحلي

```bash
node clinic/prototype/server.js
# http://localhost:4173
```

## النشر على Vercel

المشروع متجهّز لهيكل Vercel Serverless. **Root Directory** لازم يكون:

```
clinic/prototype
```

يعني من لوحة Vercel: `Settings → General → Root Directory` → `clinic/prototype`.

مفيش build command ومفيش dependencies:
- الملفات الثابتة (`index.html`, `styles.css`, `app.js`, `i18n.js`) تُخدم من الجذر
- ملفات `api/*.js` بتتحوّل تلقائيًا لـ Serverless Functions

### متغيّر بيئة اختياري

| المتغيّر | الافتراضي | الغرض |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | `*` | تحديد الدومين المسموح له بالاتصال (مثلاً `https://ahwani.com`) |

> ⚠️ قبل التشغيل الحقيقي، اضبط `ALLOWED_ORIGIN` على دومين العيادة بدل `*`.

## الهيكل

```
prototype/
├── index.html          ← الهيكل (نصوص عبر data-i18n)
├── styles.css          ← التصميم + متغيّرات اللايت/الدارك
├── i18n.js             ← كل النصوص في ٣ لغات + إعدادات اللغات
├── app.js              ← منطق الحجز + الترجمة + الثيم
├── api/                ← Vercel functions
│   ├── clinic.js
│   ├── calendar.js
│   ├── availability.js
│   └── register.js
├── lib/
│   ├── clinic-data.js  ← بيانات العيادة + منطق المواعيد + التحقق
│   └── api-core.js     ← المعالجات المشتركة بين السيرفر المحلي وVercel
└── server.js           ← سيرفر تطوير محلي (مش بينشر)
```

## الربط بـ Easy!Appointments الحقيقي

في `app.js` غيّر سطر واحد:

```js
const API_BASE = 'https://clinic.ahwani.com/index.php';
```

| البروتوتايب | Easy!Appointments |
| --- | --- |
| `POST /api/availability` | `POST /booking/get_available_hours` |
| `POST /api/register` | `POST /booking/register` |
| `GET /api/clinic` | يُبنى من `services` + `providers` + `settings` |

### عقد `register`

```json
{
  "post_data": {
    "appointment": {
      "start_datetime": "2026-10-25 16:00:00",
      "end_datetime": "2026-10-25 16:30:00",
      "service_id": "1",
      "provider_id": "1"
    },
    "customer": {
      "first_name": "أحمد",
      "last_name": "السيد",
      "phone_number": "01012345678",
      "email": "",
      "discreet_notifications": true
    },
    "manage_mode": false
  },
  "consent": { "accepted": true, "version": "2026-10-v1" },
  "captcha": null
}
```

الاستجابة عند الخطأ بترجّع **كود** (`code`) مش رسالة، والواجهة بتترجمه:

| الكود | الحالة |
| --- | --- |
| `invalid_name` / `invalid_phone` / `invalid_email` | 422 |
| `consent_required` | 422 |
| `consent_stale` | 409 |
| `slot_taken` | 409 |

## إضافة لغة جديدة

1. أضف الكائن في `i18n.js` بنفس المفاتيح.
2. أضف عنصر في `window.LOCALES` بـ `id` و`dir` و`intl`.
3. أضف الترجمة لأسماء الخدمات في `lib/clinic-data.js`.

مفيش أي نص مكتوب جوه `index.html` — كله بيجي من القاموس.

## ⚠️ قبل التشغيل الفعلي

1. **الأسعار** في `lib/clinic-data.js` (`SERVICES`) قيم افتراضية — عدّلها.
2. **مواعيد العمل** `workingHours` و`closedWeekdays` تحتاج تأكيد من العيادة.
3. **سياسة الخصوصية** — الرابط `#privacyLink` لازم يوصل لصفحة حقيقية.
4. **التخزين** — `BOOKINGS` في الذاكرة وبيضيع مع كل cold start. لازم يتوصل
   بقاعدة بيانات (MySQL بتاعة Easy!Appointments أو Vercel Postgres).
5. **موافقة PDPC** — يُراجع بند الترخيص مع محامٍ (قانون ١٥١/٢٠٢٠، م. ١٢).
6. **`discreet_notifications`** حقل إضافي لازم يُضاف لجدول `customers`.
