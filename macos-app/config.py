"""
Global colours, fonts and constants.
Colours are approximations of the original OKLCH values used in the HTML.
"""

APP_NAME = "SalesPOS"

# ── Palette ───────────────────────────────────────────────────────────────────
C = {
    "sidebar_bg":        "#1C2B3A",
    "sidebar_hover":     "#243447",
    "sidebar_active":    "#2E4460",
    "sidebar_text":      "#7A93AA",
    "sidebar_text_on":   "#FFFFFF",
    "sidebar_border":    "#ffffff12",

    "content_bg":        "#F0F3F8",
    "card_bg":           "#FFFFFF",
    "border":            "#DDE3ED",

    "accent":            "#2DB87A",
    "accent_dark":       "#1D9060",
    "accent_light":      "#E5F8EF",

    "amber":             "#D4960F",
    "amber_light":       "#FFF5DC",

    "red":               "#D64545",
    "red_light":         "#FCEAEA",

    "blue":              "#3B82F6",
    "blue_light":        "#EFF6FF",

    "ink":               "#1A2535",
    "ink_2":             "#3D5068",
    "ink_3":             "#7A93AA",

    "badge_green_bg":    "#D1FAE5",
    "badge_green_fg":    "#065F46",
    "badge_amber_bg":    "#FEF3C7",
    "badge_amber_fg":    "#92400E",
    "badge_red_bg":      "#FEE2E2",
    "badge_red_fg":      "#991B1B",
    "badge_blue_bg":     "#DBEAFE",
    "badge_blue_fg":     "#1E40AF",
}

# ── Chart colours ─────────────────────────────────────────────────────────────
CHART_COLORS = [
    "#2DB87A", "#D4960F", "#3B82F6", "#D64545", "#8B5CF6",
    "#06B6D4", "#F59E0B", "#10B981", "#EF4444", "#6366F1",
]

# ── Arabic font priority ───────────────────────────────────────────────────────
ARABIC_FONTS = ["SF Arabic", "Geeza Pro", "Arial Unicode MS", "Arial", "Helvetica"]

# ── Global QSS ────────────────────────────────────────────────────────────────
def build_qss() -> str:
    return f"""
/* ── Base ──────────────────────────────── */
QWidget {{
    font-family: "SF Arabic", "Geeza Pro", "Arial Unicode MS", Arial;
    font-size: 13px;
    color: {C['ink']};
    background: transparent;
}}

QMainWindow, #content_bg {{
    background: {C['content_bg']};
}}

/* ── Scrollbars ────────────────────────── */
QScrollBar:vertical {{
    background: {C['border']}; width: 6px; border-radius: 3px;
}}
QScrollBar::handle:vertical {{
    background: {C['ink_3']}; border-radius: 3px; min-height: 20px;
}}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}
QScrollBar:horizontal {{
    background: {C['border']}; height: 6px; border-radius: 3px;
}}
QScrollBar::handle:horizontal {{
    background: {C['ink_3']}; border-radius: 3px;
}}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ width: 0; }}

/* ── Cards ─────────────────────────────── */
.card {{
    background: {C['card_bg']};
    border: 1px solid {C['border']};
    border-radius: 12px;
}}

/* ── Buttons ───────────────────────────── */
QPushButton {{
    border-radius: 8px;
    padding: 7px 16px;
    font-weight: 600;
    font-size: 12px;
    border: none;
    background: {C['border']};
    color: {C['ink_2']};
}}
QPushButton:hover {{ background: #CDD5E0; }}
QPushButton:pressed {{ background: #B8C3D0; }}

QPushButton[class="primary"] {{
    background: {C['accent']};
    color: white;
}}
QPushButton[class="primary"]:hover {{ background: {C['accent_dark']}; }}

QPushButton[class="danger"] {{
    background: {C['red']};
    color: white;
}}
QPushButton[class="danger"]:hover {{ background: #B83030; }}

QPushButton[class="amber"] {{
    background: {C['amber']};
    color: white;
}}

QPushButton:disabled {{
    background: {C['border']};
    color: {C['ink_3']};
    opacity: 0.6;
}}

/* ── Inputs ────────────────────────────── */
QLineEdit, QTextEdit, QSpinBox, QDoubleSpinBox, QComboBox {{
    background: {C['card_bg']};
    border: 1.5px solid {C['border']};
    border-radius: 8px;
    padding: 7px 10px;
    font-size: 13px;
    color: {C['ink']};
    selection-background-color: {C['accent_light']};
}}
QLineEdit:focus, QTextEdit:focus, QSpinBox:focus,
QDoubleSpinBox:focus, QComboBox:focus {{
    border-color: {C['accent']};
}}
QComboBox::drop-down {{ border: none; width: 24px; }}
QComboBox QAbstractItemView {{
    background: {C['card_bg']};
    border: 1px solid {C['border']};
    border-radius: 8px;
    selection-background-color: {C['accent_light']};
    outline: none;
}}
QSpinBox::up-button, QSpinBox::down-button,
QDoubleSpinBox::up-button, QDoubleSpinBox::down-button {{
    width: 20px;
    border: none;
}}

/* ── Tables ────────────────────────────── */
QTableWidget {{
    background: {C['card_bg']};
    border: 1px solid {C['border']};
    border-radius: 12px;
    gridline-color: {C['border']};
    outline: none;
}}
QTableWidget::item {{
    padding: 10px 12px;
    border-bottom: 1px solid {C['border']};
}}
QTableWidget::item:selected {{
    background: {C['accent_light']};
    color: {C['ink']};
}}
QHeaderView::section {{
    background: {C['content_bg']};
    color: {C['ink_3']};
    font-size: 11px;
    font-weight: 700;
    padding: 8px 12px;
    border: none;
    border-bottom: 1px solid {C['border']};
    text-transform: uppercase;
}}
QTableWidget QTableCornerButton::section {{
    background: {C['content_bg']};
    border: none;
}}

/* ── Sidebar ────────────────────────────── */
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
    padding: 9px 16px;
    border-radius: 10px;
    border: none;
    margin: 1px 6px;
}}
.nav_item:hover {{
    background: {C['sidebar_hover']};
    color: {C['sidebar_text_on']};
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
