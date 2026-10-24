/* ══════════════════════════════════════════════════════════
   UI translations — Egyptian Arabic · Gulf Arabic · English
   Keys are looked up with `t('some.key')`; `{var}` is interpolated.
   ══════════════════════════════════════════════════════════ */

window.I18N = {
  /* ─────────────── العربية المصرية ─────────────── */
  'ar-EG': {
    meta: {
      title: 'حجز موعد — عيادة د. عمرو الأهواني',
      desc: 'احجز موعدك أونلاين في عيادة أ.د. عمرو الأهواني — استشاري جراحات وأمراض الذكورة. خصوصية تامة وتأكيد فوري.',
    },
    a11y: { skip: 'تجاوز إلى الحجز', langLabel: 'اللغة', themeLabel: 'المظهر' },
    brand: { name: 'د. عمرو الأهواني', role: 'استشاري جراحات وأمراض الذكورة' },
    nav: { call: 'اتصل', secure: 'مشفّر' },

    hero: {
      doctorName: 'أ.د. عمرو الأهواني',
      doctorRole: 'أستاذ طب الذكورة — كلية الطب، جامعة القاهرة',
      doctorAlt: 'صورة أ.د. عمرو الأهواني',
      eyebrow: 'متاح الآن — حجز فوري بدون انتظار',
      title: 'احجز موعدك في أقل من <em>دقيقة</em>',
      lede: 'تقييم وعلاج أمراض الذكورة وتأخر الإنجاب، على يد أستاذ طب الذكورة بكلية الطب جامعة القاهرة. اختر الخدمة والوقت المناسب لك — والباقي علينا.',
      trust1: 'خصوصية تامة',
      trust2: 'خبرة 25 عامًا',
      trust3: 'زمالة أوروبية',
    },

    card: {
      live: 'العيادة مفتوحة اليوم',
      addressLabel: 'العنوان',
      hoursLabel: 'مواعيد العمل',
      hoursValue: 'يوميًا من 2 عصرًا حتى 10 مساءً',
      hoursMuted: '(الجمعة مغلق)',
      waitLabel: 'مدة الانتظار المتوقعة',
      waitValue: 'أقل من 10 دقائق',
      waitNote: '— لأن المواعيد مُوزّعة بدقة',
    },

    steps: { 1: 'الخدمة', 2: 'الموعد', 3: 'بياناتك', 4: 'التأكيد' },

    panel1: {
      title: 'اختر نوع الزيارة',
      desc: 'كل خدمة لها مدة مختلفة — والوقت المتاح بيتحسب على أساسها.',
    },
    panel2: {
      title: 'اختر اليوم والوقت',
      desc: 'المواعيد المعروضة متاحة فعليًا — وبمجرد الحجز بتُحجز لك وحدك.',
      slots: 'الأوقات المتاحة',
      free: 'متاح',
      busy: 'محجوز',
      pickDay: 'اختر يومًا من الأعلى لعرض الأوقات المتاحة.',
      pickDayShort: 'اختر اليوم',
      noSlots: 'لا توجد أوقات متاحة في هذا اليوم. جرّب يومًا آخر.',
      closed: 'مغلق',
      full: 'مكتمل',
      count: '{n} موعد',
    },
    panel3: {
      title: 'بياناتك',
      desc: 'نحتاج الحد الأدنى فقط من البيانات لإتمام الحجز — لا سجل طبي على الإنترنت.',
    },

    field: {
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      phone: 'رقم الموبايل',
      email: 'البريد الإلكتروني',
      optional: '(اختياري)',
      phonePlaceholder: '01xxxxxxxxx',
      emailPlaceholder: 'name@example.com',
    },

    discreet: {
      title: 'إشعارات سرّية',
      desc: 'تُرسل رسائل التأكيد والتذكير بدون اسم العيادة أو التخصص — من رقم محايد فقط، حتى لو شاهد أحد شاشة هاتفك.',
    },

    consent: {
      before: 'أوافق على ',
      link: 'سياسة الخصوصية',
      after:
        ' وعلى معالجة بياناتي الصحية لغرض إتمام الحجز وإدارة الزيارة فقط، وعلى التواصل معي بشأن الموعد. لي الحق في سحب الموافقة أو طلب حذف بياناتي في أي وقت.',
      note: 'وفقًا لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.',
    },

    btn: {
      continue: 'متابعة',
      back: 'رجوع',
      confirm: 'تأكيد الحجز',
      confirming: 'جارٍ التأكيد…',
      chooseTime: 'اختر الوقت',
      whatsapp: 'عرض التأكيد على واتساب',
      calendar: 'إضافة إلى التقويم',
      restart: 'حجز موعد آخر',
    },

    fineprint: 'بالضغط على تأكيد الحجز يتم حجز الموعد باسمك فورًا. الإلغاء متاح حتى 6 ساعات قبل الموعد.',

    success: {
      title: 'تم تأكيد حجزك',
      subDiscreet: 'هنبعتلك التأكيد والتذكير من رقم محايد وبدون أي تفاصيل طبية.',
      subNormal: 'هنبعتلك التأكيد والتذكير على واتساب خلال دقائق.',
      reference: 'رقم الحجز',
      service: 'الخدمة',
      date: 'التاريخ',
      time: 'الوقت',
      duration: 'المدة',
      step1: '<b>هيوصلك تأكيد</b> على واتساب خلال دقائق — بالاسم الأول فقط إن فعّلت الإشعارات السرّية.',
      step2: '<b>تذكير قبل الموعد بـ 24 ساعة</b> مع رابط الإلغاء أو إعادة الجدولة.',
      step3: '<b>تعال قبل الموعد 10 دقائق</b> ولو عندك تحاليل أو أشعة سابقة، هاتها معاك.',
    },

    trust: {
      title: 'بياناتك في أمان',
      text: 'الاتصال مشفّر بالكامل، وما بنحتفظش بأي سجل طبي على الصفحة دي. بتُحفظ فقط البيانات اللازمة لتأكيد الموعد، وبتقدر تطلب حذفها في أي وقت.',
      p1: 'تشفير TLS',
      p2: 'موافقة صريحة',
      p3: 'قانون 151/2020',
      p4: 'بدون إعلانات',
    },

    footer: { copy: '© {year} عيادة أ.د. عمرو الأهواني — جميع الحقوق محفوظة.', whatsapp: 'واتساب', site: 'الموقع الرسمي' },

    unit: { minutes: 'دقيقة', currency: 'ج.م' },

    tag: { popular: 'الأكثر طلبًا', new: 'جديد' },

    err: {
      name: 'اكتب الاسم الأول (حرفين على الأقل).',
      phone: 'رقم الموبايل لازم يكون 11 رقم ويبدأ بـ 01.',
      email: 'البريد الإلكتروني غير صحيح.',
      consent: 'لازم توافق على سياسة الخصوصية لإتمام الحجز.',
      form: 'راجع البيانات المطلوبة.',
      pickService: 'اختر الخدمة أولًا.',
      pickTime: 'اختر الوقت أولًا.',
      load: 'تعذّر تحميل البيانات. يرجى المحاولة مرة أخرى.',
      loadSlots: 'تعذّر تحميل الأوقات المتاحة.',
      privacy: 'سيتم ربط سياسة الخصوصية بصفحة منفصلة قبل التشغيل.',
      ics: 'تم تنزيل ملف الموعد — افتحه لإضافته للتقويم.',
      generic: 'تعذّر إتمام الطلب. يرجى المحاولة مرة أخرى.',
      invalid_appointment: 'بيانات الموعد غير مكتملة.',
      invalid_service: 'الخدمة المختارة غير متاحة.',
      invalid_name: 'اكتب الاسم الأول (حرفين على الأقل).',
      invalid_phone: 'رقم الموبايل غير صحيح — 11 رقم يبدأ بـ 01.',
      invalid_email: 'البريد الإلكتروني غير صحيح.',
      consent_required: 'الموافقة على سياسة الخصوصية مطلوبة لإتمام الحجز.',
      consent_stale: 'تم تحديث سياسة الخصوصية — يرجى إعادة الموافقة.',
      slot_taken: 'هذا الموعد تم حجزه للتو. اختر وقتًا آخر.',
      slot_unavailable: 'هذا الوقت لم يعد متاحًا. اختر وقتًا آخر من القائمة.',
    },

    install: {
      title: 'ثبّت التطبيق على موبايلك',
      desc: 'افتحه من الشاشة الرئيسية في أي وقت — أسرع، وبيفتح حتى لو النت ضعيف.',
      cta: 'تثبيت التطبيق',
      ctaManual: 'تمام، فهمت',
      ios1: 'اضغط زر المشاركة في شريط المتصفح',
      ios2: 'اختار «إضافة إلى الشاشة الرئيسية»',
      ios3: 'اضغط «إضافة»',
      android1: 'افتح قائمة المتصفح (⋮)',
      android2: 'اختار «تثبيت التطبيق»',
      android3: 'أكّد التثبيت',
      done: 'تم تثبيت التطبيق على جهازك',
      unavailable: 'التثبيت مش متاح في المتصفح ده — جرّب Chrome أو Safari.',
      ariaInstall: 'تثبيت التطبيق',
    },

    wa: {
      discreet: 'مرحبًا، أؤكد حجزي رقم {ref} يوم {date} الساعة {time}.',
      normal: 'مرحبًا، أؤكد موعدي في عيادة د. عمرو الأهواني — حجز رقم {ref}، {service}، يوم {date} الساعة {time}.',
    },

    ics: {
      title: 'موعد',
      titleFull: 'موعد — د. عمرو الأهواني ({service})',
      ref: 'رقم الحجز: {ref}',
      alarm: 'تذكير بموعدك',
    },
  },

  /* ─────────────── العربية الخليجية ─────────────── */
  'ar-SA': {
    meta: {
      title: 'احجز موعدك — عيادة د. عمرو الأهواني',
      desc: 'احجز موعدك أونلاين في عيادة أ.د. عمرو الأهواني — استشاري جراحات وأمراض الذكورة. خصوصية تامة وتأكيد فوري.',
    },
    a11y: { skip: 'تخطَّ إلى الحجز', langLabel: 'اللغة', themeLabel: 'المظهر' },
    brand: { name: 'د. عمرو الأهواني', role: 'استشاري جراحات وأمراض الذكورة' },
    nav: { call: 'اتصل', secure: 'مشفّر' },

    hero: {
      doctorName: 'أ.د. عمرو الأهواني',
      doctorRole: 'أستاذ طب الذكورة — كلية الطب، جامعة القاهرة',
      doctorAlt: 'صورة أ.د. عمرو الأهواني',
      eyebrow: 'متاح الحين — حجز فوري بدون انتظار',
      title: 'موعدك عندنا في أقل من <em>دقيقة</em>',
      lede: 'تقييم وعلاج أمراض الذكورة وتأخر الإنجاب عند أستاذ طب الذكورة بكلية الطب جامعة القاهرة. اختر الخدمة والوقت اللي يناسبك — والباقي علينا.',
      trust1: 'خصوصية تامة',
      trust2: 'خبرة 25 سنة',
      trust3: 'زمالة أوروبية',
    },

    card: {
      live: 'نستقبلك اليوم',
      addressLabel: 'الموقع',
      hoursLabel: 'أوقات العمل',
      hoursValue: 'يوميًا من 2 العصر إلى 10 بالليل',
      hoursMuted: '(الجمعة مغلق)',
      waitLabel: 'مدة الانتظار المتوقعة',
      waitValue: 'أقل من 10 دقائق',
      waitNote: '— لأن المواعيد موزّعة بدقة',
    },

    steps: { 1: 'الخدمة', 2: 'الموعد', 3: 'بياناتك', 4: 'التأكيد' },

    panel1: {
      title: 'اختر نوع الزيارة',
      desc: 'كل خدمة لها مدة مختلفة — والوقت المتاح يتحسب على أساسها.',
    },
    panel2: {
      title: 'اختر اليوم والوقت',
      desc: 'المواعيد المعروضة متاحة فعليًا — وبمجرد الحجز تصير لك وحدك.',
      slots: 'الأوقات المتاحة',
      free: 'متاح',
      busy: 'محجوز',
      pickDay: 'اختر يومًا من الأعلى لعرض الأوقات المتاحة.',
      pickDayShort: 'اختر اليوم',
      noSlots: 'ما فيه أوقات متاحة في هذا اليوم. جرّب يومًا ثاني.',
      closed: 'مغلق',
      full: 'مكتمل',
      count: '{n} موعد',
    },
    panel3: {
      title: 'بياناتك',
      desc: 'نحتاج أقل قدر من البيانات لإتمام الحجز — ما فيه سجل طبي على الإنترنت.',
    },

    field: {
      firstName: 'الاسم الأول',
      lastName: 'اسم العائلة',
      phone: 'رقم الجوال',
      email: 'البريد الإلكتروني',
      optional: '(اختياري)',
      phonePlaceholder: '01xxxxxxxxx',
      emailPlaceholder: 'name@example.com',
    },

    discreet: {
      title: 'إشعارات سرّية',
      desc: 'توصلك رسائل التأكيد والتذكير بدون اسم العيادة أو التخصص — من رقم محايد فقط، حتى لو أحد شاف شاشة جوالك.',
    },

    consent: {
      before: 'أوافق على ',
      link: 'سياسة الخصوصية',
      after:
        ' وعلى معالجة بياناتي الصحية لغرض إتمام الحجز وإدارة الزيارة فقط، وعلى التواصل معي بخصوص الموعد. ولدي الحق في سحب الموافقة أو طلب حذف بياناتي في أي وقت.',
      note: 'وفقًا لقانون حماية البيانات الشخصية المصري رقم 151 لسنة 2020.',
    },

    btn: {
      continue: 'متابعة',
      back: 'رجوع',
      confirm: 'تأكيد الحجز',
      confirming: 'جارٍ التأكيد…',
      chooseTime: 'اختر الوقت',
      whatsapp: 'عرض التأكيد على واتساب',
      calendar: 'إضافة إلى التقويم',
      restart: 'حجز موعد ثاني',
    },

    fineprint: 'بالضغط على تأكيد الحجز يتم حجز الموعد باسمك فورًا. الإلغاء متاح حتى 6 ساعات قبل الموعد.',

    success: {
      title: 'تم تأكيد حجزك',
      subDiscreet: 'بيوصلك التأكيد والتذكير من رقم محايد وبدون أي تفاصيل طبية.',
      subNormal: 'بيوصلك التأكيد والتذكير على واتساب خلال دقائق.',
      reference: 'رقم الحجز',
      service: 'الخدمة',
      date: 'التاريخ',
      time: 'الوقت',
      duration: 'المدة',
      step1: '<b>بيوصلك تأكيد</b> على واتساب خلال دقائق — بالاسم الأول فقط إذا فعّلت الإشعارات السرّية.',
      step2: '<b>تذكير قبل الموعد بـ 24 ساعة</b> مع رابط الإلغاء أو إعادة الجدولة.',
      step3: '<b>تعال قبل الموعد 10 دقائق</b>، وإذا عندك تحاليل أو أشعة سابقة جيبها معاك.',
    },

    trust: {
      title: 'بياناتك في أمان',
      text: 'الاتصال مشفّر بالكامل، وما نحتفظ بأي سجل طبي في هذي الصفحة. تُحفظ فقط البيانات اللازمة لتأكيد الموعد، وتقدر تطلب حذفها في أي وقت.',
      p1: 'تشفير TLS',
      p2: 'موافقة صريحة',
      p3: 'قانون 151/2020',
      p4: 'بدون إعلانات',
    },

    footer: { copy: '© {year} عيادة أ.د. عمرو الأهواني — جميع الحقوق محفوظة.', whatsapp: 'واتساب', site: 'الموقع الرسمي' },

    unit: { minutes: 'دقيقة', currency: 'ج.م' },

    tag: { popular: 'الأكثر طلبًا', new: 'جديد' },

    err: {
      name: 'اكتب الاسم الأول (حرفين على الأقل).',
      phone: 'رقم الجوال لازم يكون 11 رقم ويبدأ بـ 01.',
      email: 'البريد الإلكتروني غير صحيح.',
      consent: 'لازم توافق على سياسة الخصوصية لإتمام الحجز.',
      form: 'راجع البيانات المطلوبة.',
      pickService: 'اختر الخدمة أولًا.',
      pickTime: 'اختر الوقت أولًا.',
      load: 'تعذّر تحميل البيانات. جرّب مرة ثانية.',
      loadSlots: 'تعذّر تحميل الأوقات المتاحة.',
      privacy: 'سيتم ربط سياسة الخصوصية بصفحة منفصلة قبل التشغيل.',
      ics: 'تم تنزيل ملف الموعد — افتحه لإضافته للتقويم.',
      generic: 'تعذّر إتمام الطلب. جرّب مرة ثانية.',
      invalid_appointment: 'بيانات الموعد غير مكتملة.',
      invalid_service: 'الخدمة المختارة غير متاحة.',
      invalid_name: 'اكتب الاسم الأول (حرفين على الأقل).',
      invalid_phone: 'رقم الجوال غير صحيح — 11 رقم يبدأ بـ 01.',
      invalid_email: 'البريد الإلكتروني غير صحيح.',
      consent_required: 'الموافقة على سياسة الخصوصية مطلوبة لإتمام الحجز.',
      consent_stale: 'تم تحديث سياسة الخصوصية — نرجو إعادة الموافقة.',
      slot_taken: 'هذا الموعد انحجز للتو. اختر وقت ثاني.',
      slot_unavailable: 'هذا الوقت ما عاد متاح. اختر وقت ثاني من القائمة.',
    },

    install: {
      title: 'ثبّت التطبيق على جوالك',
      desc: 'افتحه من الشاشة الرئيسية في أي وقت — أسرع، ويفتح حتى لو النت ضعيف.',
      cta: 'تثبيت التطبيق',
      ctaManual: 'تمام، فهمت',
      ios1: 'اضغط زر المشاركة في شريط المتصفح',
      ios2: 'اختر «إضافة إلى الشاشة الرئيسية»',
      ios3: 'اضغط «إضافة»',
      android1: 'افتح قائمة المتصفح (⋮)',
      android2: 'اختر «تثبيت التطبيق»',
      android3: 'أكّد التثبيت',
      done: 'تم تثبيت التطبيق على جهازك',
      unavailable: 'التثبيت غير متاح في هذا المتصفح — جرّب Chrome أو Safari.',
      ariaInstall: 'تثبيت التطبيق',
    },

    wa: {
      discreet: 'مرحبًا، أؤكد حجزي رقم {ref} يوم {date} الساعة {time}.',
      normal: 'مرحبًا، أؤكد موعدي في عيادة د. عمرو الأهواني — حجز رقم {ref}، {service}، يوم {date} الساعة {time}.',
    },

    ics: {
      title: 'موعد',
      titleFull: 'موعد — د. عمرو الأهواني ({service})',
      ref: 'رقم الحجز: {ref}',
      alarm: 'تذكير بموعدك',
    },
  },

  /* ─────────────── English ─────────────── */
  en: {
    meta: {
      title: 'Book an appointment — Dr. Amro Alahawany Clinic',
      desc: 'Book online with Prof. Amro Alahawany, Consultant of Andrology & Male Surgery. Complete privacy and instant confirmation.',
    },
    a11y: { skip: 'Skip to booking', langLabel: 'Language', themeLabel: 'Appearance' },
    brand: { name: 'Dr. Amro Alahawany', role: 'Consultant of Andrology & Male Surgery' },
    nav: { call: 'Call', secure: 'Encrypted' },

    hero: {
      doctorName: 'Prof. Dr. Amro Alahawany',
      doctorRole: 'Professor of Andrology — Cairo University School of Medicine',
      doctorAlt: 'Portrait of Prof. Dr. Amro Alahawany',
      eyebrow: 'Available now — instant booking',
      title: 'Book your appointment in under a <em>minute</em>',
      lede: 'Assessment and treatment for andrology and fertility concerns, with a Professor of Andrology at Cairo University Faculty of Medicine. Pick your service and time — we handle the rest.',
      trust1: 'Complete privacy',
      trust2: '25 years of experience',
      trust3: 'European fellowship',
    },

    card: {
      live: 'Open today',
      addressLabel: 'Location',
      hoursLabel: 'Opening hours',
      hoursValue: 'Daily, 2 PM – 10 PM',
      hoursMuted: '(closed Friday)',
      waitLabel: 'Expected wait',
      waitValue: 'Under 10 minutes',
      waitNote: '— because appointments are precisely spaced',
    },

    steps: { 1: 'Service', 2: 'Time', 3: 'Details', 4: 'Confirmed' },

    panel1: {
      title: 'Choose your visit type',
      desc: 'Each service has a different duration — available times are calculated from it.',
    },
    panel2: {
      title: 'Choose a day and time',
      desc: 'These slots are genuinely available. Once booked, they are yours alone.',
      slots: 'Available times',
      free: 'Available',
      busy: 'Booked',
      pickDay: 'Pick a day above to see available times.',
      pickDayShort: 'Pick a day',
      noSlots: 'No available times on this day. Try another one.',
      closed: 'Closed',
      full: 'Full',
      count: '{n} slots',
    },
    panel3: {
      title: 'Your details',
      desc: 'We ask only for the minimum needed to book — no medical records are kept online.',
    },

    field: {
      firstName: 'First name',
      lastName: 'Last name',
      phone: 'Mobile number',
      email: 'Email address',
      optional: '(optional)',
      phonePlaceholder: '01xxxxxxxxx',
      emailPlaceholder: 'name@example.com',
    },

    discreet: {
      title: 'Discreet notifications',
      desc: 'Confirmations and reminders carry no clinic name or specialty — they come from a neutral number only, even if someone sees your phone screen.',
    },

    consent: {
      before: 'I agree to the ',
      link: 'Privacy Policy',
      after:
        ' and to the processing of my health data solely to complete this booking and manage my visit, and to being contacted about the appointment. I may withdraw consent or request deletion of my data at any time.',
      note: "In accordance with Egypt's Personal Data Protection Law No. 151 of 2020.",
    },

    btn: {
      continue: 'Continue',
      back: 'Back',
      confirm: 'Confirm booking',
      confirming: 'Confirming…',
      chooseTime: 'Choose a time',
      whatsapp: 'View confirmation on WhatsApp',
      calendar: 'Add to calendar',
      restart: 'Book another appointment',
    },

    fineprint: 'Confirming books the appointment in your name immediately. Cancellation is available up to 6 hours before the appointment.',

    success: {
      title: 'Booking confirmed',
      subDiscreet: 'Confirmation and reminders will arrive from a neutral number, with no medical details.',
      subNormal: 'Your confirmation and reminders will arrive on WhatsApp within minutes.',
      reference: 'Booking reference',
      service: 'Service',
      date: 'Date',
      time: 'Time',
      duration: 'Duration',
      step1: '<b>You will get a confirmation</b> on WhatsApp within minutes — first name only if you enabled discreet notifications.',
      step2: '<b>A reminder 24 hours before</b> your appointment, with a link to cancel or reschedule.',
      step3: '<b>Arrive 10 minutes early</b>, and bring any previous lab results or scans with you.',
    },

    trust: {
      title: 'Your data is safe',
      text: 'The connection is fully encrypted and no medical records are kept on this page. Only the data needed to confirm the appointment is stored, and you can request its deletion at any time.',
      p1: 'TLS encryption',
      p2: 'Explicit consent',
      p3: 'Law 151/2020',
      p4: 'No advertising',
    },

    footer: { copy: '© {year} Dr. Amro Alahawany Clinic — All rights reserved.', whatsapp: 'WhatsApp', site: 'Official website' },

    unit: { minutes: 'min', currency: 'EGP' },

    tag: { popular: 'Most booked', new: 'New' },

    err: {
      name: 'Please enter your first name (at least 2 characters).',
      phone: 'A mobile number must be 11 digits and start with 01.',
      email: 'That email address is not valid.',
      consent: 'You must accept the Privacy Policy to complete the booking.',
      form: 'Please check the required fields.',
      pickService: 'Choose a service first.',
      pickTime: 'Choose a time first.',
      load: 'Could not load the clinic data. Please try again.',
      loadSlots: 'Could not load available times.',
      privacy: 'The privacy policy will be linked to a dedicated page before launch.',
      ics: 'Appointment file downloaded — open it to add the event.',
      generic: 'Something went wrong. Please try again.',
      invalid_appointment: 'The appointment details are incomplete.',
      invalid_service: 'The selected service is not available.',
      invalid_name: 'Please enter your first name (at least 2 characters).',
      invalid_phone: 'Invalid mobile number — 11 digits starting with 01.',
      invalid_email: 'That email address is not valid.',
      consent_required: 'Privacy policy consent is required to complete the booking.',
      consent_stale: 'The privacy policy was updated — please accept it again.',
      slot_taken: 'That slot was just taken. Please choose another time.',
      slot_unavailable: 'That time is no longer available. Please pick another from the list.',
    },

    install: {
      title: 'Install the app',
      desc: 'Open it from your home screen any time — faster, and it loads even on a weak connection.',
      cta: 'Install app',
      ctaManual: 'Got it',
      ios1: 'Tap the Share button in the browser bar',
      ios2: 'Choose “Add to Home Screen”',
      ios3: 'Tap “Add”',
      android1: 'Open the browser menu (⋮)',
      android2: 'Choose “Install app”',
      android3: 'Confirm the install',
      done: 'App installed on your device',
      unavailable: 'Installing is not available in this browser — try Chrome or Safari.',
      ariaInstall: 'Install app',
    },

    wa: {
      discreet: 'Hello, confirming my booking {ref} on {date} at {time}.',
      normal: 'Hello, confirming my appointment at Dr. Amro Alahawany Clinic — booking {ref}, {service}, {date} at {time}.',
    },

    ics: {
      title: 'Appointment',
      titleFull: 'Appointment — Dr. Amro Alahawany ({service})',
      ref: 'Booking reference: {ref}',
      alarm: 'Reminder for your appointment',
    },
  },
};

/* `label` is the full name shown in the dropdown; `short` is what fits in
   the header pill, where "العربية (خليجي)" alone was wider than every other
   control combined. */
window.LOCALES = [
  { id: 'ar-EG', dir: 'rtl', intl: 'ar-EG-u-nu-latn', label: 'العربية (مصر)', short: 'مصري' },
  { id: 'ar-SA', dir: 'rtl', intl: 'ar-AE-u-nu-latn', label: 'العربية (خليجي)', short: 'خليجي' },
  { id: 'en', dir: 'ltr', intl: 'en-GB', label: 'English', short: 'EN' },
];
