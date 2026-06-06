#!/bin/bash
# Double-click this file in Finder to start iPhone Inspector

cd "$(dirname "$0")"

# Make sure node is found
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

# Check if node is installed
if ! command -v node &>/dev/null; then
  osascript -e 'display alert "Node.js مش مثبت" message "ثبّتي Node.js من nodejs.org"'
  exit 1
fi

echo "🚀 بدء تشغيل فاحص الآيفون..."
node server.js
