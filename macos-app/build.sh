#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
#  Build script — produces SalesPOS.app inside dist/
#  Requirements: Python 3.12+, pip install -r requirements.txt
#  Run:   chmod +x build.sh && ./build.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP_NAME="نظام المبيعات"
ENTRY="main.py"
ICON=""           # set to path of a .icns file if you have one, e.g. icon.icns

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Building $APP_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Install / verify dependencies
echo "[1/4] Installing dependencies..."
pip install -r requirements.txt -q

# 2. Clean previous build artefacts
echo "[2/4] Cleaning old build..."
rm -rf build dist __pycache__

# 3. Build with PyInstaller
echo "[3/4] Running PyInstaller..."

ICON_FLAG=""
if [ -n "$ICON" ] && [ -f "$ICON" ]; then
    ICON_FLAG="--icon=$ICON"
fi

pyinstaller \
    --name "$APP_NAME" \
    --windowed \
    --onedir \
    --noconfirm \
    $ICON_FLAG \
    --add-data "." \
    --hidden-import PySide6.QtPrintSupport \
    --hidden-import matplotlib.backends.backend_qtagg \
    --collect-all PySide6 \
    --collect-all matplotlib \
    "$ENTRY"

# 4. Report result
echo "[4/4] Done."
echo ""
echo "  ✅  Application bundle:"
echo "      dist/$APP_NAME.app"
echo ""
echo "  To run directly (without building):"
echo "      python main.py"
echo ""
echo "  To distribute: zip or drag dist/$APP_NAME.app to /Applications"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
