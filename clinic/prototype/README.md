# واجهة الحجز — بروتوتايب

واجهة حجز عربية (RTL) لعيادة أ.د. عمرو الأهواني، مبنية على نفس عقود
Easy!Appointments API عشان تتحوّل لإنتاج بسهولة.

## التشغيل

```bash
node clinic/prototype/server.js
# http://localhost:4173
```

مفيش أي dependencies — Node 18+ فقط.

## الملفات

| الملف | الدور |
| --- | --- |
| `server.js` | سيرفر HTTP + API وهمي بنفس شكل Easy!Appointments |
| `public/index.html` | الهيكل (RTL) |
| `public/styles.css` | التصميم |
| `public/app.js` | منطق الحجز + التكامل |

## الربط بـ Easy!Appointments الحقيقي

في `public/app.js` غيّر سطر واحد:

```js
const API_BASE = 'https://clinic.ahwani.com/index.php';
```

بعدها وجّه كل endpoint لمساره الحقيقي:

| البروتوتايب | Easy!Appointments |
| --- | --- |
| `POST /api/availability` | `POST /booking/get_available_hours` |
| `POST /api/register` | `POST /booking/register` |
| `GET /api/clinic` | يُبنى من `services` + `providers` + `settings` |

### عقد `register` (مطابق للباك اند)

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

## اللي متطبّق بالفعل

**التدفّق**
- ٤ خطوات: خدمة → يوم/وقت → بيانات → تأكيد
- شريط تقدّم + تحقّق قبل كل انتقال
- اختيار تلقائي لأول يوم فيه مواعيد متاحة
- المواعيد المحجوزة تظهر معطّلة (مفيش تضليل)

**الخصوصية (الميزة الأساسية للتخصص)**
- مفتاح «إشعارات سرّية»: بيشيل اسم العيادة والتخصص من رسالة التأكيد وملف التقويم
- ملف التقويم (`.ics`) بيتغيّر عنوانه وموقعه حسب الوضع ده
- مفيش سجل طبي على الواجهة — الحد الأدنى من البيانات فقط

**الالتزام القانوني**
- موافقة صريحة إلزامية قبل الحجز، مربوطة برقم نسخة
- رفض أي حجز بدون موافقة (`422`)
- رفض الموافقة لو نسخة النص قديمة (`409`)

**تجربة الاستخدام**
- رقم موبايل مصري مُتحقَّق منه (١١ رقم يبدأ بـ 01)
- وقت بصيغة ١٢ ساعة عربية + أرقام لاتينية
- زر واتساب جاهز برسالة مسبقة
- إضافة للتقويم بتوقيت القاهرة الصحيح (بما في ذلك التوقيت الصيفي)
- دعم كامل للوحة المفاتيح + `prefers-reduced-motion`

## ⚠️ قبل التشغيل الفعلي

1. **الأسعار** في `server.js` (مصفوفة `SERVICES`) قيم افتراضية — عدّلها للأسعار الحقيقية.
2. **مواعيد العمل** `workingHours` و`closedWeekdays` تحتاج تأكيد من العيادة.
3. **سياسة الخصوصية** — الرابط `#privacyLink` لازم يوصل لصفحة حقيقية قبل التشغيل.
4. **موافقة مكتوبة** — يُراجع بند الترخيص من PDPC مع محامٍ (قانون ١٥١/٢٠٢٠، م. ١٢).
5. **مفتاح `discreet_notifications`** حقل إضافي لازم يُضاف لجدول `customers` أو جدول منفصل.
