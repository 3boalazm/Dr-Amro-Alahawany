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
