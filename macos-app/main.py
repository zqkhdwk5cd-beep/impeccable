from __future__ import annotations
"""
Entry point — initialise DB, build QApplication, launch main window.
Run:
    python main.py
"""
import sys
import os

# Ensure imports work whether run directly or via PyInstaller bundle
if getattr(sys, "frozen", False):
    _base = sys._MEIPASS  # type: ignore[attr-defined]
    sys.path.insert(0, _base)

from PySide6.QtWidgets import QApplication
from PySide6.QtCore import Qt
from PySide6.QtGui import QFont, QFontDatabase

import db as DB
from app_window import MainWindow


def _pick_arabic_font(app: QApplication) -> QFont:
    """Return the best available Arabic font on this system."""
    candidates = ["SF Arabic", "Geeza Pro", "Arial Unicode MS", "Arial", "Helvetica Neue"]
    available  = QFontDatabase.families()
    for name in candidates:
        for fam in available:
            if name.lower() in fam.lower():
                f = QFont(fam, 13)
                f.setHintingPreference(QFont.HintingPreference.PreferNoHinting)
                return f
    return QFont("Arial", 13)


def main():
    # High-DPI support
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_UseHighDpiPixmaps)
    QApplication.setAttribute(Qt.ApplicationAttribute.AA_EnableHighDpiScaling)

    app = QApplication(sys.argv)
    app.setApplicationName("SalesPOS")
    app.setOrganizationName("SalesPOS")

    # Arabic RTL throughout
    app.setLayoutDirection(Qt.LayoutDirection.RightToLeft)
    app.setFont(_pick_arabic_font(app))

    # Initialise / migrate SQLite database
    DB.init_db()

    window = MainWindow()
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
