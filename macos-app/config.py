from __future__ import annotations
"""
Global colours, fonts and constants.
Aligned to Team Store Design System v1.
All hex values are sRGB approximations of the OKLCH tokens.
"""

APP_NAME = "SalesPOS"

# ── Palette (OKLCH → sRGB hex) ────────────────────────────────────────────────
C = {
    # Sidebar
    "sidebar_bg":      "#1C2B3A",   # oklch(0.22 0.02 250)
    "sidebar_hover":   "#243244",   # oklch(0.27 0.025 250)
    "sidebar_active":  "#2B3D52",   # oklch(0.30 0.03 250)
    "sidebar_text":    "#B0BEC8",   # oklch(0.78 0.01 250)
    "sidebar_muted":   "#6A7A88",   # oklch(0.52 0.01 250)
    "sidebar_text_on": "#E5F2EA",   # oklch(0.96 0.01 158) — green-tinted white
    "sidebar_border":  "#ffffff12", # oklch(1 0 0 / 0.07)

    # Backgrounds
    "content_bg":      "#F5F6FA",   # oklch(0.97 0.005 250)  → --bg
    "card_bg":         "#FFFFFF",   # oklch(1 0 0)            → --surface
    "surface_2":       "#F2F3F8",   # oklch(0.96 0.005 250)  → --surface-2

    # Borders
    "border":          "#E3E7EE",   # oklch(0.90 0.006 250)
    "border_strong":   "#CDD4DE",   # oklch(0.82 0.008 250)

    # Text
    "ink":             "#1A2535",   # oklch(0.18 0.015 250)
    "ink_2":           "#556070",   # oklch(0.42 0.01 250)
    "ink_3":           "#7E8D9A",   # oklch(0.60 0.008 250)

    # Accent — green
    "accent":          "#2A9B6E",   # oklch(0.63 0.18 158)
    "accent_dark":     "#1B7A52",   # oklch(0.50 0.18 158)
    "accent_light":    "#E2F5EC",   # oklch(0.94 0.06 158)

    # Amber
    "amber":           "#CC8F00",   # oklch(0.72 0.15 70)
    "amber_light":     "#FDF3D0",   # oklch(0.96 0.06 70)

    # Red
    "red":             "#C0392B",   # oklch(0.55 0.20 25)
    "red_light":       "#FDECEA",   # oklch(0.95 0.06 25)

    # Blue
    "blue":            "#2060A8",   # oklch(0.55 0.18 240)
    "blue_light":      "#DDE8F8",   # oklch(0.94 0.06 240)

    # Badge tokens
    "badge_green_bg":  "#E2F5EC",
    "badge_green_fg":  "#1B7A52",
    "badge_amber_bg":  "#FDF3D0",
    "badge_amber_fg":  "#8A6000",
    "badge_red_bg":    "#FDECEA",
    "badge_red_fg":    "#C0392B",
    "badge_blue_bg":   "#DDE8F8",
    "badge_blue_fg":   "#2060A8",
}

# ── Chart colours ─────────────────────────────────────────────────────────────
CHART_COLORS = [
    "#2A9B6E", "#CC8F00", "#2060A8", "#C0392B", "#7C3AED",
    "#0891B2", "#D97706", "#059669", "#DC2626", "#4F46E5",
]

# ── Arabic font priority ───────────────────────────────────────────────────────
ARABIC_FONTS = ["SF Arabic", "Geeza Pro", "Arial Unicode MS", "Arial", "Helvetica"]

# ── Global QSS ────────────────────────────────────────────────────────────────
def build_qss() -> str:
    return f"""
/* ── Base ──────────────────────────────── */
QWidget {{
    font-family: "SF Arabic", "SF Pro Text", system-ui, "Segoe UI", Arial;
    font-size: 13px;
    color: {C['ink']};
    background: transparent;
}}
QMainWindow, #content_bg {{
    background: {C['content_bg']};
}}

/* ── Scrollbars ────────────────────────── */
QScrollBar:vertical {{
    background: transparent; width: 6px; border-radius: 3px; margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {C['ink_3']}50; border-radius: 3px; min-height: 24px;
}}
QScrollBar::handle:vertical:hover {{ background: {C['ink_3']}90; }}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
QScrollBar:horizontal {{
    background: transparent; height: 6px; border-radius: 3px; margin: 0;
}}
QScrollBar::handle:horizontal {{
    background: {C['ink_3']}50; border-radius: 3px; min-width: 24px;
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ width: 0; }}

/* ── Buttons (§4 Design System) ─────────── */
QPushButton {{
    border-radius: 6px;
    padding: 7px 16px;
    font-weight: 600;
    font-size: 12px;
    border: 1px solid {C['border_strong']};
    background: {C['card_bg']};
    color: {C['ink_2']};
}}
QPushButton:hover  {{ background: {C['surface_2']}; }}
QPushButton:pressed {{ background: {C['border']}; }}

QPushButton[class="primary"] {{
    background: {C['accent']}; color: white; border: none;
}}
QPushButton[class="primary"]:hover  {{ background: {C['accent_dark']}; }}
QPushButton[class="primary"]:pressed {{ background: {C['accent_dark']}; }}

QPushButton[class="danger"] {{
    background: {C['red_light']}; color: {C['red']};
    border: 1px solid {C['red']}30;
}}
QPushButton[class="danger"]:hover {{ background: #F5D0CE; }}

QPushButton[class="amber"] {{
    background: {C['amber']}; color: white; border: none;
}}

QPushButton:disabled {{
    background: {C['border']};
    color: {C['ink_3']};
    border: none;
}}

/* ── Inputs (§8 Design System) ─────────── */
QLineEdit, QTextEdit, QSpinBox, QDoubleSpinBox, QComboBox {{
    background: {C['card_bg']};
    border: 1px solid {C['border_strong']};
    border-radius: 6px;
    padding: 7px 11px;
    font-size: 13px;
    color: {C['ink']};
    selection-background-color: {C['accent_light']};
    selection-color: {C['ink']};
}}
QLineEdit:focus, QTextEdit:focus, QSpinBox:focus,
QDoubleSpinBox:focus, QComboBox:focus {{
    border-color: {C['accent']};
}}
QLineEdit::placeholder, QTextEdit::placeholder {{ color: {C['ink_3']}; }}
QComboBox::drop-down  {{ border: none; width: 24px; }}
QComboBox QAbstractItemView {{
    background: {C['card_bg']};
    border: 1px solid {C['border']};
    border-radius: 6px;
    selection-background-color: {C['accent_light']};
    selection-color: {C['ink']};
    outline: none;
}}
QSpinBox::up-button, QSpinBox::down-button,
QDoubleSpinBox::up-button, QDoubleSpinBox::down-button {{
    width: 20px; border: none;
}}

/* ── Tables (§6 Design System) ─────────── */
QTableWidget {{
    background: {C['card_bg']};
    border: 1px solid {C['border']};
    border-radius: 10px;
    gridline-color: transparent;
    outline: none;
}}
QTableWidget::item {{
    padding: 10px 16px;
    border-bottom: 1px solid {C['border']};
    color: {C['ink_2']};
}}
QTableWidget::item:selected {{
    background: {C['accent_light']};
    color: {C['ink']};
}}
QHeaderView::section {{
    background: {C['surface_2']};
    color: {C['ink_3']};
    font-size: 11px;
    font-weight: 700;
    padding: 10px 16px;
    border: none;
    border-bottom: 1px solid {C['border']};
}}
QTableWidget QTableCornerButton::section {{
    background: {C['surface_2']};
    border: none;
}}

/* ── Sidebar (§3 Design System) ─────────── */
#sidebar {{
    background: {C['sidebar_bg']};
    border-left: 1px solid {C['sidebar_border']};
}}
#sidebar_logo_label {{
    color: {C['sidebar_text_on']};
    font-size: 15px;
    font-weight: 700;
}}
.nav_item {{
    background: transparent;
    color: {C['sidebar_text']};
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    padding: 8px 10px;
    border-radius: 6px;
    border: none;
    margin: 1px 8px;
}}
.nav_item:hover {{
    background: {C['sidebar_hover']};
    color: #FFFFFF;
}}
.nav_item[active="true"] {{
    background: {C['sidebar_active']};
    color: {C['sidebar_text_on']};
    font-weight: 700;
}}

/* ── Topbar ─────────────────────────────── */
#topbar {{
    background: {C['card_bg']};
    border-bottom: 1px solid {C['border']};
}}
#topbar_title {{
    font-size: 16px;
    font-weight: 700;
    color: {C['ink']};
}}
"""
