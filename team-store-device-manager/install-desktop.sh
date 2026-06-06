#!/usr/bin/env bash
set -e

DEST="$HOME/Desktop/تيم ستور سيستم"
APP_NAME="System Team Store"
VERSION="1.0.0"
ZIP="release/${APP_NAME}-${VERSION}-arm64-mac.zip"

echo "══════════════════════════════════════"
echo "  Team Store — بناء وتثبيت النظام"
echo "══════════════════════════════════════"

# 1. Build
echo ""
echo "▶  جاري البناء..."
npm run build
npx electron-builder --mac zip --publish never

# 2. Verify zip exists
if [ ! -f "$ZIP" ]; then
  echo "❌  الملف غير موجود: $ZIP"
  exit 1
fi

# 3. Create destination folder
mkdir -p "$DEST"

# 4. Extract app
echo ""
echo "▶  جاري النسخ إلى: $DEST"
unzip -o "$ZIP" -d "$DEST" > /dev/null

echo ""
echo "✅  تم التثبيت بنجاح!"
echo "   الموقع: $DEST/${APP_NAME}.app"
echo ""
echo "   لتشغيل البرنامج:"
echo "   open \"$DEST/${APP_NAME}.app\""
