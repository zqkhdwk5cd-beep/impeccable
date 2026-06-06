#!/bin/bash
# Double-click this file in Finder to open فاحص الآيفون

cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Check Node.js
if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Node.js مش مثبت" message "ثبّتي Node.js من nodejs.org"'
  exit 1
fi

# Install dependencies on first run
if [ ! -f "node_modules/.bin/electron" ] && [ ! -f "node_modules/electron/dist/Electron.app/Contents/MacOS/Electron" ]; then
  echo "⏳ جاري تثبيت المتطلبات... (مرة واحدة فقط)"
  npm install --silent
fi

echo "🚀 جاري فتح فاحص الآيفون..."
npx electron .
