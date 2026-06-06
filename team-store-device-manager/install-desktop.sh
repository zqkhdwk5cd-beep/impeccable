#!/usr/bin/env bash

DEST="$HOME/Desktop/تيم ستور سيستم"

echo ""
echo "══════════════════════════════════════"
echo "  Team Store — بناء وتثبيت النظام"
echo "══════════════════════════════════════"
echo ""

# 1. Build TypeScript + Renderer
echo "▶ [1/3]  جاري البناء..."
npm run build
if [ $? -ne 0 ]; then
  echo "❌  فشل البناء. توقف."
  exit 1
fi
echo "✔  اكتمل البناء"
echo ""

# 2. Package with electron-builder (zip only, skip DMG)
echo "▶ [2/3]  جاري تحزيم التطبيق..."
npx electron-builder --mac zip --publish never
if [ $? -ne 0 ]; then
  echo "❌  فشل التحزيم. توقف."
  exit 1
fi
echo "✔  اكتمل التحزيم"
echo ""

# 3. Find the zip (flexible — works with any version/arch)
ZIP=$(ls release/*-mac.zip 2>/dev/null | head -1)
if [ -z "$ZIP" ]; then
  echo "❌  لم يُعثر على ملف zip داخل مجلد release/"
  echo "   الملفات الموجودة:"
  ls release/ 2>/dev/null || echo "   (المجلد فارغ أو غير موجود)"
  exit 1
fi
echo "▶ [3/3]  النسخ إلى سطح المكتب..."
echo "   المصدر:  $ZIP"
echo "   الهدف:   $DEST"
echo ""

# Create destination and extract
mkdir -p "$DEST"
unzip -o "$ZIP" -d "$DEST"
if [ $? -ne 0 ]; then
  echo "❌  فشل فك الضغط."
  exit 1
fi

echo ""
echo "══════════════════════════════════════"
echo "  ✅  تم التثبيت بنجاح!"
echo "══════════════════════════════════════"
echo ""
echo "  لتشغيل البرنامج:"
echo "  open \"$DEST/System Team Store.app\""
echo ""
