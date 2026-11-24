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
    lang: { ar: 'العربية', en: 'English' }
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
    lang: { ar: 'العربية', en: 'English' }
  }
};
