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
    home: {
      morning: 'صباح الخير', evening: 'مساء الخير',
      odometer: 'قراءة العداد', updated: 'آخر تحديث', switchCar: 'تبديل', chooseCar: 'اختر السيارة', addCar: 'إضافة سيارة',
      thisMonth: 'مصروف هذا الشهر', lastMonth: 'الشهر الماضي', avg: 'متوسط الاستهلاك', fromFills: 'من {n} تعبئات', needFills: 'سجّل تعبئتين بخزان ممتلئ',
      upcoming: 'التذكيرات القادمة', noReminders: 'لا توجد تذكيرات بعد', recent: 'آخر العمليات', seeAll: 'عرض الكل',
      noRecords: 'لا توجد عمليات بعد', noRecordsText: 'اضغط زر + لتسجيل أول تعبئة أو صيانة.',
      inKm: 'بعد {n} كم', overKm: 'متأخر {n} كم', inDays: 'بعد {n} يوم', overDays: 'متأخر {n} يوم', due: 'مستحق', soon: 'قريبًا', ok: 'جيد',
      welcomeTitle: 'سجل سيارتك، بدون إعلانات', welcomeText: 'تابع الوقود والصيانة والمصاريف، واعرف استهلاك سيارتك وتكلفة كل كيلومتر.', tryDemo: 'جرّب ببيانات نموذجية',
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
    home: {
      morning: 'Good morning', evening: 'Good evening',
      odometer: 'Odometer', updated: 'Updated', switchCar: 'Switch', chooseCar: 'Choose a car', addCar: 'Add a car',
      thisMonth: 'Spent this month', lastMonth: 'Last month', avg: 'Average consumption', fromFills: 'From {n} fill-ups', needFills: 'Log two full-tank fill-ups',
      upcoming: 'Upcoming reminders', noReminders: 'No reminders yet', recent: 'Recent activity', seeAll: 'See all',
      noRecords: 'No activity yet', noRecordsText: 'Tap + to log your first fill-up or service.',
      inKm: 'In {n} km', overKm: '{n} km overdue', inDays: 'In {n} days', overDays: '{n} days overdue', due: 'Due', soon: 'Soon', ok: 'Good',
      welcomeTitle: 'Your car log, without ads', welcomeText: 'Track fuel, service and expenses, and see your consumption and cost per km.', tryDemo: 'Try with sample data',
      viewOptions: 'Options', settings: 'Settings', noPhoto: 'No photo', liter: 'L'
    }
  }
};
