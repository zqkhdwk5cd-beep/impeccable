# Team Store Device Manager
## نظام إدارة أجهزة Team Store

تطبيق سطح مكتب لإدارة شراء وبيع أجهزة iPhone — يعمل بدون إنترنت.

---

## تجربة المستخدم النهائي

```
تثبيت التطبيق  ←  دبل كليك على الأيقونة  ←  تسجيل الدخول  ←  استخدام النظام
```

**لا يحتاج Terminal. لا يحتاج npm. لا يحتاج إنترنت.**

---

## للمطور: تشغيل وضع التطوير

```bash
# 1. تثبيت الحزم
cd team-store-device-manager
npm install

# 2. تشغيل وضع التطوير
npm run dev
```

يفتح Vite على port 5173 وElectron معاً مع DevTools.  
إذا عدّلت ملفات main process، شغّل `npm run build:main` وأعد تشغيل `npm run dev`.

---

## بناء المثبّت للمستخدمين

### macOS

```bash
npm run dist:mac
```

**الناتج في `release/`:**
- `Team Store Device Manager-1.0.0.dmg`  ← افتحه واسحب لـ Applications
- `Team Store Device Manager-1.0.0-mac.zip`  ← نسخة مضغوطة

### Windows

```bash
npm run dist:win
```

**الناتج في `release/`:**
- `Team Store Device Manager Setup 1.0.0.exe`  ← يثبّت التطبيق ويخلق اختصار Desktop

> بناء Windows يحتاج جهاز Windows أو Wine على Linux/Mac.

### Linux

```bash
npm run dist:linux
```

**الناتج في `release/`:**
- `Team Store Device Manager-1.0.0.AppImage`  ← تشغيل مباشر
- `team-store-device-manager_1.0.0_amd64.deb`  ← تثبيت على Ubuntu/Debian

### اختبار Package بدون installer

```bash
npm run pack
# ← release/linux-unpacked/ أو release/mac/
```

---

## أين تُحفظ قاعدة البيانات؟

| نظام | المسار |
|---|---|
| macOS | `~/Library/Application Support/team-store-device-manager/Team Store Device Manager/team_store.db` |
| Windows | `C:\Users\<user>\AppData\Roaming\team-store-device-manager\Team Store Device Manager\team_store.db` |
| Linux | `~/.config/team-store-device-manager/Team Store Device Manager/team_store.db` |

**قاعدة البيانات خارج مجلد التطبيق تماماً:**
- تبقى بعد إغلاق وإعادة تشغيل التطبيق ✓
- تبقى بعد تحديث التطبيق إلى إصدار جديد ✓
- لا تُمسح أبداً تلقائياً ✓

---

## أين تُحفظ النسخ الاحتياطية؟

| نظام | المسار |
|---|---|
| macOS | `~/Library/Application Support/team-store-device-manager/Team Store Device Manager/backups/` |
| Windows | `C:\Users\<user>\AppData\Roaming\team-store-device-manager\Team Store Device Manager\backups\` |
| Linux | `~/.config/team-store-device-manager/Team Store Device Manager/backups/` |

يمكن تغيير المسار من **الإعدادات** داخل التطبيق.

---

## Scripts

| Script | الوصف |
|---|---|
| `npm run dev` | وضع التطوير كامل |
| `npm run build` | بناء كامل (renderer + main) |
| `npm run build:main` | main process فقط |
| `npm run pack` | اختبار package بدون installer |
| `npm run dist:mac` | مثبّت macOS (.dmg + .zip) |
| `npm run dist:win` | مثبّت Windows (.exe) |
| `npm run dist:linux` | مثبّت Linux (.AppImage + .deb) |

---

## أيقونة التطبيق

ضع الأيقونة في مجلد `build/`:

| الملف | النظام |
|---|---|
| `build/icon.icns` | macOS |
| `build/icon.ico` | Windows |
| `build/icon.png` | Linux (1024×1024 PNG) |

الملف `build/icon.png` موجود حالياً كـ placeholder.  
لتصميم أيقونة حقيقية: اصنع PNG 1024×1024 ثم حوّله على https://cloudconvert.com

---

## ضمانات أمان البيانات

| الضمان | التفاصيل |
|---|---|
| SQLite دائمة | مسار userData، خارج مجلد التطبيق |
| ترحيل آمن | additive فقط، لا حذف جداول أو أعمدة |
| حذف ناعم | حقل deleted_at على كل الجداول |
| نسخ يومي تلقائي | كل 24 ساعة |
| نسخة طوارئ | تُنشأ تلقائياً قبل أي استرجاع |
| سجل نشاط | كل عملية مسجلة بـ timestamp ومستخدم |
