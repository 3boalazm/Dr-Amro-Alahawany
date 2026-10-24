# النشر على Vercel

المشروع متجهّز بالكامل لهيكل Vercel، بس محتاج خطوة ربط واحدة من حسابك.

---

## ⚠️ خطوة مطلوبة منك (مرة واحدة)

Vercel مش قادر ينشر دلوقتي عن طريق الـ API لأنه بيرفض أي نشر جديد للمشروع
قبل ما يتأكد إنه قادر يكتشف نوع المشروع. الحل الرسمي هو **ربط GitHub**:

1. افتح [vercel.com/account/login-connections](https://vercel.com/account/login-connections)
2. عند **GitHub** اضغط **Connect**
3. امنح الصلاحية للريبو `3boalazm/Dr-Amro-Alahawany`

بعدها بقى أي `git push` على أي فرع بيتنشر تلقائيًا كـ Preview، و`main` كـ Production.
من غير أي خطوة يدوية تانية.

---

## الطريقة الأولى — استيراد الريبو من لوحة Vercel (موصى بها)

1. افتح [vercel.com/new](https://vercel.com/new)
2. اختار ريبو **Dr-Amro-Alahawany**
3. اضبط الإعدادات دي **قبل** الضغط على Deploy:

| الإعداد | القيمة |
| --- | --- |
| **Root Directory** | `clinic/prototype` |
| **Framework Preset** | `Other` |
| **Build Command** | *(اتركه فاضي)* |
| **Output Directory** | *(اتركه فاضي)* |
| **Install Command** | *(اتركه فاضي)* |

4. اضغط **Deploy**

النتيجة: الموقع بيطلع على `https://<project>.vercel.app`

> مفيش build ولا dependencies — الملفات الثابتة تُخدم من الجذر،
> وملفات `api/*.js` بتتحوّل تلقائيًا لـ Serverless Functions.

## ⚠️ حاجتين لازم تتظبط مرة واحدة من لوحة Vercel

### ١. إلغاء حماية النشر (عشان الموقع يفتح لأي حد)

المشروع الجديد على Vercel بيجي عليه **Vercel Authentication** مفعّل، وده بيعرض
شاشة تسجيل دخول Vercel لأي زائر. يعني المرضى مش هيقدروا يشوفوا الصفحة،
و**التطبيق مش هيتثبت** على موبايلهم.

`Settings → Deployment Protection → Vercel Authentication → Disabled`

### ٢. تأكيد إن نوع المشروع «Other» مش «Node»

لو Vercel شاف `package.json` جنب `app.js`، بيعتبر المشروع سيرفر Node وبياخد
`app.js` كنقطة دخول — في الصفحة الرئيسية تشتغل ملف المتصفح جوه دالة serverless
وتطلع خطأ. عشان كده فيه `.vercelignore` بيستثني `package.json` و`server.js`
و`tools/` من الرفع، و`framework: null` في `vercel.json`.

**علامة إن ده حصل:** في الـ build log تلاقي
`Build complete — Using app.js as the root entrypoint`.
لو ظهر، راجع `.vercelignore` الأول.

---

`vercel.json` جاهز في `clinic/prototype` وبيظبط حاجتين:
- **يمنع الوصول** لـ `server.js` و`package.json` و`lib/` و`tools/` (404 بدل تحميل الكود).
- **كاش صحيح** لـ `manifest.webmanifest` و`sw.js` (بدون كاش للـ service worker
  عشان التحديثات توصل فورًا) وأيقونات الـ PWA بصلاحية سنة.

### التحقق بعد النشر (PWA)

```bash
curl -sI https://<project>.vercel.app/manifest.webmanifest | grep -i content-type
curl -sI https://<project>.vercel.app/sw.js | grep -i service-worker
curl -s -o /dev/null -w '%{http_code}\n' https://<project>.vercel.app/server.js   # لازم 404
curl -s -o /dev/null -w '%{http_code}\n' https://<project>.vercel.app/icons/icon-512.png  # 200
```

بعدها افتح الموقع على **HTTPS** من الموبايل → هيظهر زر **«ثبّت التطبيق»**
في الهيدر، وأندروید كمان هيعرض بانر التثبيت التلقائي.
> التثبيت وservice worker **مش بيشتغلوا** على `http` أو `file://` — لازم localhost أو HTTPS.

---

## الطريقة التانية — Vercel CLI

من جذر الريبو:

```bash
cd clinic/prototype
npx vercel login
npx vercel --prod
```

أول مرة هيسألك:

```
Set up and deploy? → Y
Which scope? → حسابك
Link to existing project? → N
Project name? → dr-amro-booking
In which directory is your code located? → ./
Want to modify these settings? → N
```

---

## الطريقة التالتة — GitHub Actions (بدون ربط الحساب)

لو عايز نشر تلقائي بصلاحية محدودة، ضيف `VERCEL_TOKEN` في
`Settings → Secrets → Actions` ثم استخدم الـ workflow ده:

```yaml
name: Deploy booking UI
on:
  push:
    branches: [main]
    paths: ['clinic/prototype/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm i -g vercel@latest
      - run: vercel deploy --prod --yes --token=${{ secrets.VERCEL_TOKEN }}
        working-directory: clinic/prototype
```

---

## متغيّر بيئة اختياري

| المتغيّر | الافتراضي | الغرض |
| --- | --- | --- |
| `ALLOWED_ORIGIN` | `*` | تحديد الدومين المسموح له بالاتصال. اضبطه على `https://ahwani.com` قبل التشغيل الحقيقي. |

من لوحة Vercel: `Settings → Environment Variables`.

---

## التحقق بعد النشر

```bash
curl -s https://<project>.vercel.app/api/clinic | head -c 120
```

لازم ترجّع JSON فيه `clinic` و`services`. لو رجّع 404 يبقى الـ Root Directory غلط.

---

## ⚠️ حدود النسخة المنشورة

- `api/register` بيحفظ الحجوزات **في الذاكرة** — بتضيع مع كل cold start.
  لازم يتوصل بـ MySQL بتاعة Easy!Appointments أو Vercel Postgres قبل التشغيل الفعلي.
- بيانات المرضى الصحية على سيرفرات Vercel = **نقل بيانات خارج مصر**، وده محتاج
  تصريح من مركز حماية البيانات (قانون ١٥١/٢٠٢٠). للعرض والتجربة فقط؛
  التشغيل الحقيقي يبقى على سيرفر داخل مصر.
