# واجهة الحجز — تطبيق ويب قابل للتثبيت

واجهة حجز لعيادة أ.د. عمرو الأهواني، مبنية على نفس عقود Easy!Appointments API،
ومصممة mobile-first عشان تتثبّت على الموبايل وتشتغل كتطبيق.

## المميزات

| | |
| --- | --- |
| **قابل للتثبيت** | PWA كامل — يتثبّت على أندروید و iOS من المتصفح، ويفتح standalone بدون شريط عنوان |
| **يعمل جزئيًا أوفلاين** | service worker بيخزّن الواجهة، والمواعيد دايمًا من الشبكة |
| **٣ لغات** | مصري · خليجي · إنجليزي — تبديل فوري، والاتجاه RTL/LTR بيقلب معاها |
| **لايت / دارك** | بيتذكر اختيارك، وبيتبع النظام أول مرة، وبدون وميض عند التحميل |
| **موبايل أولًا** | breakpoints من 320px، أهداف لمس ≥ 40px، ومساحات آمنة للشاشات ذات النوتش |
| **خصوصية** | «إشعارات سرّية» بتشيل اسم العيادة والتخصص من التأكيد وملف التقويم |
| **امتثال** | موافقة صريحة بنسخة وتاريخ (قانون ١٥١/٢٠٢٠) |
| **بدون dependencies** | صفر مكتبات — Node 18+ فقط |

## التشغيل المحلي

```bash
node clinic/prototype/server.js
# http://localhost:4173
```

> التثبيت والـ service worker بيشتغلوا على `localhost` أو HTTPS فقط.

## النشر على Vercel

**Root Directory** لازم يكون `clinic/prototype`. التفاصيل في [`../DEPLOY.md`](../DEPLOY.md).

## الهيكل

```
prototype/
├── index.html              ← الهيكل (كل النصوص عبر data-i18n)
├── styles.css              ← التصميم، mobile-first، لايت/دارك
├── i18n.js                 ← القواميس الثلاثة + إعدادات اللغات
├── app.js                  ← منطق الحجز + الترجمة + الثيم + واجهة التثبيت
├── install.js              ← تسجيل service worker + تنبيه التثبيت
├── sw.js                   ← كاش الواجهة (بدون كاش للـ API)
├── manifest.webmanifest    ← بيانات التطبيق والأيقونات والاختصارات
├── vercel.json             ← إعدادات النشر (منع الوصول للملفات الداخلية)
├── icons/                  ← أيقونات PWA (any + maskable + apple-touch)
├── favicon.ico             ← أيقونة المتصفح (16/32/48)
├── img/                    ← صورة الطبيب (WebP + JPEG، مقاسين)
├── tools/
│   ├── make-icons.py       ← مولّد الأيقونات (Pillow)
│   ├── make-photo.py       ← ضغط صورة الطبيب
│   └── smoke.js            ← فحص النشرة (محلي أو Vercel)
├── api/                    ← Vercel serverless functions
│   ├── clinic.js
│   ├── calendar.js
│   ├── availability.js
│   └── register.js
├── lib/
│   ├── clinic-data.js      ← بيانات العيادة + منطق المواعيد + التحقق
│   └── api-core.js         ← معالجات مشتركة بين السيرفر المحلي وVercel
└── server.js               ← سيرفر تطوير محلي (مش بينشر)
```

## الفحص

تلات طبقات — الأولى والتانية من غير أي اعتماديات، والتالتة محتاجة jsdom.

```bash
npm run audit                       # فحص ثابت: CSS · classes · ترجمة · ملفات
npm run smoke                       # ٥٨ فحص على نشرة (محلي أو Vercel)
npm run smoke -- https://<project>.vercel.app

npm install && npm run check:ui     # دورة حجز كاملة في DOM
```

| الأداة | بتكشف إيه |
| --- | --- |
| `audit.js` | قوس CSS مفتوح، class من غير تنسيق، مفتاح ترجمة ناقص في لغة، ملف مش موجود على القرص، صورة ناقصة من الـ allowlist |
| `smoke.js` | الصفحة نفسها هي التطبيق مش صفحة خطأ، كل ملف ثابت ونوعه، الملفات الداخلية محجوبة، `/api/*` بيرد |
| `ui-check.js` | ٥٢ فحص على السلوك: الخطوات الأربعة، الـ validation، الـ ٣ لغات، الثيم، وشيت التثبيت |

> `jsdom` اعتمادية تطوير بس — الموقع المنشور فضل **صفر مكتبات**،
> و`package.json` نفسه مستثنى من الرفع في `.vercelignore`.

## الصور

`tools/make-photo.py` و`tools/make-avatar.py` بيضغطوا صورة الدكتور.

### صورة الطبيب

الصورة الأصلية ٤٥٧×٧٠٠ PNG وحجمها ٥٧٠ كيلو — تقيلة جدًا على موبايل.
`tools/make-photo.py` بيطلع نسختين (240 و480) بصيغتين:

```bash
python3 tools/make-photo.py [مسار-الصورة]
```

| | JPG | WebP |
| --- | --- | --- |
| 240 | 13 KB | 7.6 KB |
| 480 | 37 KB | 19 KB |

الصفحة بتستخدم `<picture>` بـ `srcset`، فالموبايل بينزّل **7.6 كيلو بس**.

### أفاتار الهيدر

```bash
python3 tools/make-avatar.py
```

بوكس ٢٤٠×٢٤٠ حوالين الوش من نسخة 480، بيطلع `avatar-96` و`avatar-192`
بصيغتين (2.2 كيلو و5 كيلو WebP). الهيدر بيعرضه دايرة بإطار ذهبي.

> **الأيقونة (favicon / PWA) فضلت الـ ECG mark** مش صورة الوجه — عند ١٦ بكسل
> الوش بيتحوّل لبقعة، والرمز بيفضل مقروء.

## إعادة توليد الأيقونات

```bash
pip install pillow
python3 tools/make-icons.py
```

## استراتيجية الكاش

| النوع | السياسة | السبب |
| --- | --- | --- |
| التنقل (HTML) | Network-first + fallback | يلتقط أي تحديث جديد فورًا |
| أصول ثابتة (CSS/JS/أيقونات) | Cache-first + revalidate | تحميل فوري، وتحديث في الخلفية |
| `/api/*` | **Network-only** | قائمة مواعيد قديمة = حجزين في نفس الوقت |

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

الاستجابة عند الخطأ بترجّع **كود** (`code`) مش رسالة، والواجهة بتترجمه
(`invalid_phone` · `consent_required` · `consent_stale` · `slot_taken`).

## إضافة لغة جديدة

1. أضف القاموس في `i18n.js` بنفس المفاتيح.
2. أضف عنصرًا في `window.LOCALES` بـ `id` و`dir` و`intl`.
3. أضف ترجمة أسماء الخدمات في `lib/clinic-data.js`.

مفيش نص مكتوب جوه `index.html` — كله من القاموس.

## ⚠️ قبل التشغيل الفعلي

1. **الأسعار** في `lib/clinic-data.js` (`SERVICES`) قيم افتراضية — عدّلها.
2. **مواعيد العمل** `workingHours` و`closedWeekdays` تحتاج تأكيد من العيادة.
3. **سياسة الخصوصية** — `#privacyLink` لازم يوصل لصفحة حقيقية.
4. **التخزين** — `BOOKINGS` في الذاكرة وبتضيع مع كل cold start.
5. **موافقة PDPC** — يُراجع الترخيص مع محامٍ (قانون ١٥١/٢٠٢٠، م. ١٢).
6. **`discreet_notifications`** حقل إضافي لازم يُضاف لجدول `customers`.
