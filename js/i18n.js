// سيارتي · My Car — i18n
// Shared UI strings for the design system. Screens will add their own keys here.
export const STRINGS = {
  ar: {
    appName: 'سيارتي', appNameAlt: 'My Car',
    nav: { home: 'الرئيسية', log: 'السجل', reminders: 'التذكيرات', reports: 'التقارير', settings: 'الإعدادات', add: 'إضافة' },
    types: { fuel: 'وقود', service: 'صيانة', expense: 'مصروف', income: 'دخل' },
    action: { save: 'حفظ', cancel: 'إلغاء', delete: 'حذف', edit: 'تعديل', add: 'إضافة', retry: 'إعادة المحاولة', undo: 'تراجع', close: 'إغلاق', confirm: 'تأكيد', back: 'رجوع', more: 'المزيد' },
    state: {
      loading: 'جارٍ التحميل…',
      emptyTitle: 'لا توجد سجلات بعد', emptyText: 'ابدأ بتسجيل أول تعبئة وقود، وستظهر هنا مع الاستهلاك والتكلفة.',
      errorTitle: 'تعذّر تحميل البيانات', errorText: 'حدث خطأ أثناء قراءة بياناتك. بياناتك لم تُحذف — حاول مرة أخرى.',
      offlineTitle: 'أنت غير متصل', offlineText: 'التطبيق يعمل بدون إنترنت، وكل ما تسجله محفوظ على جهازك.'
    },
    unit: { km: 'كم', liter: 'لتر', currency: 'ر.ع', kmpl: 'كم/لتر', days: 'يوم' },
    theme: { light: 'فاتح', dark: 'داكن', auto: 'تلقائي' },
    lang: { ar: 'العربية', en: 'English' },
    month: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    entry: {
      pickTitle: 'ماذا تريد أن تسجّل؟', newReminder: 'تذكير صيانة جديد',
      desc: { fuel: 'تعبئة وقود', service: 'زيت، إطارات، فحص…', expense: 'تأمين، غسيل، مخالفة…', income: 'توصيل، رحلة…' },
      add: { fuel: 'إضافة تعبئة', service: 'إضافة صيانة', expense: 'إضافة مصروف', income: 'إضافة دخل' },
      edit: { fuel: 'تعديل التعبئة', service: 'تعديل الصيانة', expense: 'تعديل المصروف', income: 'تعديل الدخل' },
      date: 'التاريخ', odo: 'قراءة العداد', lastOdo: 'آخر قراءة مسجّلة: {n} {u}',
      liters: 'اللترات', ppl: 'سعر اللتر', total: 'المبلغ الإجمالي', autoCalc: 'يُحسب تلقائيًا', totalHint: 'اكتب أي رقمين من الثلاثة، ويُحسب الثالث.',
      fullTank: 'تعبئة الخزان بالكامل', fullTankDesc: 'يُستخدم لحساب الاستهلاك بدقة', station: 'المحطة',
      category: 'الصنف', incomeType: 'نوع الدخل', amount: 'المبلغ', workshop: 'الورشة أو المكان', place: 'المكان', note: 'ملاحظة',
      errTitle: 'لم يتم الحفظ', errLiters: 'أدخل عدد اللترات.', errTotal: 'أدخل المبلغ الإجمالي أو سعر اللتر.', errAmount: 'أدخل المبلغ.', errOdo: 'أدخل قراءة العداد — نحتاجها لحساب الاستهلاك.',
      warnTitle: 'تحقق من قراءة العداد',
      warnLower: 'أدخلت {odo} {u}، وهي أقل من تعبئة سابقة بتاريخ {date} ({prev} {u}). صحّح الرقم أو التاريخ، أو احفظ إن كانت القراءة صحيحة.',
      warnJump: 'زادت القراءة {n} {u} عن آخر سجل. تأكد من الرقم، أو احفظ إن كانت صحيحة.',
      checkOdo: 'تحقق من قراءة العداد', added: 'تمت الإضافة', updated: 'تم تحديث السجل', reminderReset: 'تم الحفظ وإعادة ضبط تذكير «{name}»',
      delete: 'حذف السجل', deleted: 'تم حذف السجل'
    },
    catalog: {
      title: 'كتالوج السيارات', color: 'اللون',
      fromCatalog: 'من الكتالوج', fromDevice: 'رفع صورة من الجهاز', use: 'استخدام هذه الصورة', setModel: 'تحديد الشركة والموديل', needModel: 'الكتالوج يعرض صورة موديل سيارتك فقط', needModelText: 'اختر شركة وموديل من القائمة في بيانات السيارة أولًا، أو ارفع صورة من الجهاز.', note: 'الرسومات توضيحية حسب شكل السيارة، وليست صورًا رسمية.',
      bodies: { sedan: 'سيدان', hatch: 'هاتشباك', crossover: 'كروس أوفر', suv: 'دفع رباعي', pickup: 'بيك أب' },
      colors: { white: 'أبيض', silver: 'فضي', gray: 'رمادي', black: 'أسود', red: 'أحمر', blue: 'أزرق', beige: 'بيج', green: 'أخضر' }
    },
    car: {
      title: 'تفاصيل السيارة', noPhoto: 'لا توجد صورة', addPhoto: 'إضافة صورة', changePhoto: 'تغيير الصورة', choosePhoto: 'اختر صورة', removePhoto: 'إزالة الصورة',
      plate: 'رقم اللوحة', expenses: 'ملخص المصروفات', allTime: 'منذ البداية', costKm: 'تكلفة الكيلومتر',
      tabService: 'الصيانة', tabFuel: 'الوقود', tabReminders: 'التذكيرات', tabDocs: 'المستندات', viewInLog: 'عرض الكل في السجل', partial: 'تعبئة جزئية',
      noService: 'لا توجد صيانة مسجّلة', addService: 'إضافة صيانة', noFuel: 'لا توجد تعبئات مسجّلة', addFuel: 'إضافة تعبئة', addReminder: 'إضافة تذكير',
      noDocs: 'لا توجد مستندات', noDocsText: 'احفظ صور التأمين والملكية وغيرها مع تاريخ انتهائها.', addDoc: 'إضافة مستند', editDoc: 'تعديل المستند',
      docType: 'نوع المستند', docTitle: 'الاسم', docTitlePh: 'مثال: تأمين شامل 2026', docNumber: 'الرقم', expiry: 'ينتهي', docImage: 'صورة المستند', hasImage: 'مع صورة',
      doc: { insurance: 'التأمين', registration: 'الملكية', inspection: 'الفحص الفني', license: 'رخصة القيادة', other: 'مستند آخر' },
      expired: 'منتهي', expiresIn: 'بعد {n} يوم', valid: 'ساري',
      editTitle: 'تعديل بيانات السيارة', make: 'الشركة', other: 'أخرى…', otherMake: 'اسم الشركة', otherModel: 'اسم الموديل', nick: 'اسم مميز', nickHint: 'يظهر بدل الشركة والموديل، مثل «سيارة العائلة».', name: 'اسم السيارة', namePh: 'مثال: سيارة العائلة', model: 'الموديل', modelPh: 'مثال: كامري', year: 'سنة الصنع', choose: 'اختر…',
      fuel: 'نوع الوقود', tank: 'سعة الخزان', odo0: 'العداد عند الإضافة', optional: 'اختياري',
      errName: 'اختر الشركة والموديل، أو اكتب اسمًا مميزًا.', errYear: 'سنة الصنع يجب أن تكون بين 1950 و {n}.', deleteCar: 'حذف السيارة وكل سجلاتها',
      deleteQ: 'حذف «{n}»؟', deleteText: 'ستُحذف السيارة مع كل سجلاتها وتذكيراتها ومستنداتها من هذا الجهاز. لا يمكن التراجع.', deleted: 'تم حذف السيارة',
      saved: 'تم حفظ بيانات السيارة', added: 'أُضيفت السيارة', photoSaved: 'تم تحديث الصورة', imageError: 'تعذّر قراءة الصورة. جرّب صورة أخرى.',
      storageFull: 'لم يتم الحفظ: مساحة التخزين في المتصفح ممتلئة. احذف صورًا قديمة أو احفظ نسخة احتياطية ثم حاول مرة أخرى.',
      docSaved: 'تم حفظ المستند', deleteDocQ: 'حذف هذا المستند؟', deleteDocText: 'سيُحذف المستند وصورته من هذا الجهاز.', docDeleted: 'تم حذف المستند'
    },
    home: {
      morning: 'صباح الخير', evening: 'مساء الخير',
      odometer: 'قراءة العداد', updated: 'آخر تحديث', switchCar: 'تبديل', chooseCar: 'اختر السيارة', addCar: 'إضافة سيارة',
      thisMonth: 'مصروف هذا الشهر', lastMonth: 'الشهر الماضي', avg: 'متوسط الاستهلاك', fromFills: 'من {n} تعبئات', needFills: 'سجّل تعبئتين بخزان ممتلئ',
      upcoming: 'التذكيرات القادمة', noReminders: 'لا توجد تذكيرات بعد', recent: 'آخر العمليات', seeAll: 'عرض الكل',
      noRecords: 'لا توجد عمليات بعد', noRecordsText: 'اضغط زر + لتسجيل أول تعبئة أو صيانة.',
      inKm: 'بعد {n} كم', overKm: 'متأخر {n} كم', inDays: 'بعد {n} يوم', overDays: 'متأخر {n} يوم', due: 'مستحق', soon: 'قريبًا', ok: 'جيد',
      welcomeTitle: 'كل تفاصيل سيارتك في مكان واحد', welcomeText: 'تابع الوقود والصيانة والمصاريف، واعرف استهلاك سيارتك وتكلفة كل كيلومتر.', tryDemo: 'جرّب ببيانات نموذجية',
      viewOptions: 'خيارات', settings: 'الإعدادات', noPhoto: 'لا توجد صورة', liter: 'لتر'
    }
  },
  en: {
    appName: 'My Car', appNameAlt: 'سيارتي',
    nav: { home: 'Home', log: 'Log', reminders: 'Reminders', reports: 'Reports', settings: 'Settings', add: 'Add' },
    types: { fuel: 'Fuel', service: 'Service', expense: 'Expense', income: 'Income' },
    action: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', retry: 'Try again', undo: 'Undo', close: 'Close', confirm: 'Confirm', back: 'Back', more: 'More' },
    state: {
      loading: 'Loading…',
      emptyTitle: 'No records yet', emptyText: 'Log your first fill-up and it will show here with consumption and cost.',
      errorTitle: 'Couldn’t load your data', errorText: 'Something went wrong while reading your data. Nothing was deleted — please try again.',
      offlineTitle: 'You’re offline', offlineText: 'The app works offline and everything you log is saved on this device.'
    },
    unit: { km: 'km', liter: 'L', currency: 'OMR', kmpl: 'km/L', days: 'days' },
    theme: { light: 'Light', dark: 'Dark', auto: 'Auto' },
    lang: { ar: 'العربية', en: 'English' },
    month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    entry: {
      pickTitle: 'What do you want to log?', newReminder: 'New service reminder',
      desc: { fuel: 'Fill-up', service: 'Oil, tyres, inspection…', expense: 'Insurance, wash, fine…', income: 'Delivery, trip…' },
      add: { fuel: 'Add fill-up', service: 'Add service', expense: 'Add expense', income: 'Add income' },
      edit: { fuel: 'Edit fill-up', service: 'Edit service', expense: 'Edit expense', income: 'Edit income' },
      date: 'Date', odo: 'Odometer', lastOdo: 'Last recorded: {n} {u}',
      liters: 'Liters', ppl: 'Price per liter', total: 'Total amount', autoCalc: 'Calculated', totalHint: 'Enter any two of the three; the third is calculated.',
      fullTank: 'Filled the tank completely', fullTankDesc: 'Used to calculate consumption accurately', station: 'Station',
      category: 'Category', incomeType: 'Income type', amount: 'Amount', workshop: 'Workshop or place', place: 'Place', note: 'Note',
      errTitle: 'Not saved', errLiters: 'Enter the liters.', errTotal: 'Enter the total amount or the price per liter.', errAmount: 'Enter the amount.', errOdo: 'Enter the odometer reading — it’s needed to calculate consumption.',
      warnTitle: 'Check the odometer',
      warnLower: 'You entered {odo} {u}, lower than an earlier fill-up on {date} ({prev} {u}). Fix the number or date, or save if the reading is right.',
      warnJump: 'That’s {n} {u} more than the last record. Check the number, or save if it’s right.',
      checkOdo: 'check the odometer', added: 'Added', updated: 'Record updated', reminderReset: 'Saved and reset the “{name}” reminder',
      delete: 'Delete record', deleted: 'Record deleted'
    },
    catalog: {
      title: 'Car catalog', color: 'Color',
      fromCatalog: 'From catalog', fromDevice: 'Upload from device', use: 'Use this picture', setModel: 'Set make and model', needModel: 'The catalog only shows your car’s model', needModelText: 'Choose a listed make and model in the vehicle details first, or upload a photo from your device.', note: 'Drawings illustrate the body shape; they are not official photos.',
      bodies: { sedan: 'Sedan', hatch: 'Hatchback', crossover: 'Crossover', suv: 'SUV', pickup: 'Pickup' },
      colors: { white: 'White', silver: 'Silver', gray: 'Gray', black: 'Black', red: 'Red', blue: 'Blue', beige: 'Beige', green: 'Green' }
    },
    car: {
      title: 'Vehicle details', noPhoto: 'No photo', addPhoto: 'Add photo', changePhoto: 'Change photo', choosePhoto: 'Choose photo', removePhoto: 'Remove photo',
      plate: 'Plate number', expenses: 'Expense summary', allTime: 'All time', costKm: 'Cost per km',
      tabService: 'Service', tabFuel: 'Fuel', tabReminders: 'Reminders', tabDocs: 'Documents', viewInLog: 'View all in log', partial: 'Partial fill',
      noService: 'No service records', addService: 'Add service', noFuel: 'No fill-ups yet', addFuel: 'Add fill-up', addReminder: 'Add reminder',
      noDocs: 'No documents', noDocsText: 'Keep photos of your insurance, registration and more, with their expiry dates.', addDoc: 'Add document', editDoc: 'Edit document',
      docType: 'Document type', docTitle: 'Name', docTitlePh: 'e.g. Comprehensive insurance 2026', docNumber: 'Number', expiry: 'Expires', docImage: 'Document photo', hasImage: 'With photo',
      doc: { insurance: 'Insurance', registration: 'Registration', inspection: 'Inspection', license: 'Driving licence', other: 'Other document' },
      expired: 'Expired', expiresIn: 'In {n} days', valid: 'Valid',
      editTitle: 'Edit vehicle', make: 'Make', other: 'Other…', otherMake: 'Make name', otherModel: 'Model name', nick: 'Nickname', nickHint: 'Shown instead of make and model, e.g. “Family car”.', name: 'Vehicle name', namePh: 'e.g. Family car', model: 'Model', modelPh: 'e.g. Camry', year: 'Year', choose: 'Choose…',
      fuel: 'Fuel type', tank: 'Tank capacity', odo0: 'Odometer when added', optional: 'optional',
      errName: 'Choose a make and model, or enter a nickname.', errYear: 'Year must be between 1950 and {n}.', deleteCar: 'Delete vehicle and all its records',
      deleteQ: 'Delete “{n}”?', deleteText: 'The vehicle and all its records, reminders and documents will be removed from this device. This can’t be undone.', deleted: 'Vehicle deleted',
      saved: 'Vehicle saved', added: 'Vehicle added', photoSaved: 'Photo updated', imageError: 'Couldn’t read that image. Try another one.',
      storageFull: 'Not saved: the browser’s storage is full. Remove old photos or save a backup, then try again.',
      docSaved: 'Document saved', deleteDocQ: 'Delete this document?', deleteDocText: 'The document and its photo will be removed from this device.', docDeleted: 'Document deleted'
    },
    home: {
      morning: 'Good morning', evening: 'Good evening',
      odometer: 'Odometer', updated: 'Updated', switchCar: 'Switch', chooseCar: 'Choose a car', addCar: 'Add a car',
      thisMonth: 'Spent this month', lastMonth: 'Last month', avg: 'Average consumption', fromFills: 'From {n} fill-ups', needFills: 'Log two full-tank fill-ups',
      upcoming: 'Upcoming reminders', noReminders: 'No reminders yet', recent: 'Recent activity', seeAll: 'See all',
      noRecords: 'No activity yet', noRecordsText: 'Tap + to log your first fill-up or service.',
      inKm: 'In {n} km', overKm: '{n} km overdue', inDays: 'In {n} days', overDays: '{n} days overdue', due: 'Due', soon: 'Soon', ok: 'Good',
      welcomeTitle: 'Everything about your car in one place', welcomeText: 'Track fuel, service and expenses, and see your consumption and cost per km.', tryDemo: 'Try with sample data',
      viewOptions: 'Options', settings: 'Settings', noPhoto: 'No photo', liter: 'L'
    }
  }
};
