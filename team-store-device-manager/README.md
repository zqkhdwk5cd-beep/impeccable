# Team Store Device Manager
## نظام إدارة أجهزة Team Store

تطبيق سطح مكتب لإدارة شراء وبيع أجهزة iPhone في متجر Team Store.

---

## المتطلبات

- Node.js 18+
- npm 9+

---

## تثبيت وتشغيل التطبيق للتطوير

```bash
# تثبيت الحزم
npm install

# بناء العملية الرئيسية
npm run build:main

# تشغيل خادم واجهة المستخدم
npm run dev:renderer
# ثم في نافذة أخرى:
npx electron dist/main/main/index.js
```

---

## بناء للإنتاج

```bash
# بناء الكل
npm run build

# تشغيل الملف المجمّع
npx electron .

# إنشاء ملف تثبيت
npm run dist
```

---

## موقع قاعدة البيانات

- **macOS:** `~/Library/Application Support/team-store-device-manager/Team Store Device Manager/team_store.db`
- **Windows:** `C:\Users\USERNAME\AppData\Roaming\team-store-device-manager\Team Store Device Manager\team_store.db`
- **Linux:** `~/.config/team-store-device-manager/Team Store Device Manager/team_store.db`

---

## النسخ الاحتياطية

تُحفظ النسخ الاحتياطية في:
- **macOS:** `~/Library/Application Support/team-store-device-manager/Team Store Device Manager/backups/`
- **Windows:** `C:\Users\USERNAME\AppData\Roaming\team-store-device-manager\Team Store Device Manager\backups\`

يمكن تغيير مسار النسخ الاحتياطية من الإعدادات.

النسخ اليومي التلقائي يعمل كل 24 ساعة ويحتفظ بآخر 30 نسخة.

---

## هيكل المشروع

```
src/
├── main/              # Electron main process
│   ├── index.ts       # نقطة البداية
│   ├── database.ts    # اتصال SQLite
│   ├── schema.ts      # مخطط قاعدة البيانات والترحيل
│   ├── backup.ts      # خدمة النسخ الاحتياطي
│   ├── ipc-handlers.ts # معالجات IPC
│   └── repositories/  # طبقة البيانات
├── renderer/          # React frontend
│   ├── pages/         # صفحات التطبيق
│   ├── components/    # مكونات مشتركة
│   ├── context/       # React Context
│   └── lib/api.ts     # واجهة IPC للـ Renderer
├── preload/
│   └── index.ts       # Electron preload script
└── types/
    └── index.ts       # TypeScript types
```

---

## الميزات

- ✅ قاعدة بيانات SQLite دائمة وآمنة
- ✅ ترحيل آمن للبيانات (لا يحذف البيانات القديمة)
- ✅ نسخ احتياطي يومي تلقائي
- ✅ نسخ احتياطي يدوي
- ✅ استرجاع النسخ الاحتياطية مع نسخة طوارئ
- ✅ حذف ناعم (soft delete) لجميع السجلات
- ✅ سجل نشاط (audit logs) لجميع العمليات
- ✅ واجهة عربية RTL
- ✅ بحث شامل (سريال، IMEI، موبايل، فاتورة)
- ✅ فواتير قابلة للطباعة وتصدير PDF
- ✅ تقارير وتصدير CSV
- ✅ نظام مستخدمين (مدير/موظف)
- ✅ لوحة تحكم مع إحصائيات
- ✅ إدارة المصاريف الإضافية على الأجهزة
- ✅ تتبع المدفوعات والمتبقيات
