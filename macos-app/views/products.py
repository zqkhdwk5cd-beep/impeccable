"""
Products management view — searchable table with CRUD actions.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QLineEdit,
    QFrame, QTableWidget, QTableWidgetItem, QHeaderView, QComboBox,
    QSizePolicy, QAbstractItemView
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QPixmap, QColor
from config import C
import db as DB


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


class ProductsView(QWidget):
    request_add    = Signal()
    request_edit   = Signal(dict)
    request_delete = Signal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._products: list[dict] = []
        self._build()

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(16)
        self.setStyleSheet(f"background:{C['content_bg']};")

        # Toolbar
        toolbar = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍  ابحث في المنتجات...")
        self.search_input.setFixedHeight(36)
        self.search_input.setMaximumWidth(320)
        self.search_input.textChanged.connect(self._filter)

        self.cat_filter = QComboBox()
        self.cat_filter.setFixedHeight(36)
        self.cat_filter.setMinimumWidth(140)
        self.cat_filter.currentTextChanged.connect(self._filter)

        add_btn = QPushButton("+ إضافة منتج")
        add_btn.setFixedHeight(36)
        add_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        add_btn.clicked.connect(self.request_add)

        toolbar.addWidget(self.search_input)
        toolbar.addWidget(self.cat_filter)
        toolbar.addStretch()
        toolbar.addWidget(add_btn)
        layout.addLayout(toolbar)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(8)
        self.table.setHorizontalHeaderLabels(
            ["المنتج", "الفئة", "التكلفة", "السعر", "الهامش%", "الكمية", "الحالة", "إجراءات"]
        )
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(7, QHeaderView.ResizeMode.Fixed)
        self.table.setColumnWidth(7, 130)
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setAlternatingRowColors(False)
        self.table.setShowGrid(False)
        self.table.setStyleSheet(
            f"QTableWidget {{ background:{C['card_bg']}; border:1px solid {C['border']}; "
            f"border-radius:12px; outline:none; }}"
            f"QTableWidget::item {{ padding:10px 12px; border-bottom:1px solid {C['border']}; }}"
            f"QTableWidget::item:selected {{ background:{C['accent_light']}; color:{C['ink']}; }}"
            f"QHeaderView::section {{ background:{C['content_bg']}; color:{C['ink_3']}; "
            f"font-size:11px; font-weight:700; padding:10px 12px; border:none; "
            f"border-bottom:1px solid {C['border']}; }}"
        )
        layout.addWidget(self.table)

    def refresh(self):
        self._products = DB.get_products()
        cats = ["كل الفئات"] + DB.get_categories()
        current_cat = self.cat_filter.currentText()
        self.cat_filter.blockSignals(True)
        self.cat_filter.clear()
        self.cat_filter.addItems(cats)
        idx = self.cat_filter.findText(current_cat)
        self.cat_filter.setCurrentIndex(idx if idx >= 0 else 0)
        self.cat_filter.blockSignals(False)
        self._filter()

    def _filter(self):
        q   = self.search_input.text().lower().strip()
        cat = self.cat_filter.currentText()
        filtered = [
            p for p in self._products
            if (not q or q in p["name"].lower() or q in (p.get("category") or "").lower())
            and (cat in ("كل الفئات", "") or p.get("category") == cat)
        ]
        self._render(filtered)

    def _render(self, products: list[dict]):
        self.table.setRowCount(len(products))
        self.table.setRowCount(0)
        for p in products:
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setRowHeight(row, 52)

            # Product name (with thumbnail)
            name_widget = QWidget()
            name_layout = QHBoxLayout(name_widget)
            name_layout.setContentsMargins(12, 4, 4, 4)
            name_layout.setSpacing(8)
            if p.get("image"):
                pix = QPixmap()
                pix.loadFromData(p["image"])
                img_lbl = QLabel()
                img_lbl.setPixmap(
                    pix.scaled(36, 36, Qt.AspectRatioMode.KeepAspectRatio,
                               Qt.TransformationMode.SmoothTransformation)
                )
                img_lbl.setFixedSize(36, 36)
                name_layout.addWidget(img_lbl)
            info_col = QVBoxLayout()
            info_col.setSpacing(0)
            n_lbl = QLabel(p["name"])
            n_lbl.setStyleSheet(f"font-size:12px; font-weight:600; color:{C['ink']}; background:transparent;")
            info_col.addWidget(n_lbl)
            if p.get("unit"):
                u_lbl = QLabel(p["unit"])
                u_lbl.setStyleSheet(f"font-size:10px; color:{C['ink_3']}; background:transparent;")
                info_col.addWidget(u_lbl)
            name_layout.addLayout(info_col)
            name_layout.addStretch()
            self.table.setCellWidget(row, 0, name_widget)

            # Category badge
            self._set_badge(row, 1, p.get("category") or "—",
                            C["badge_blue_bg"], C["badge_blue_fg"])

            # Cost
            self._set_text(row, 2, _fmt(p["cost"]))

            # Price
            self._set_text(row, 3, _fmt(p["price"]))

            # Margin
            margin = ((p["price"] - p["cost"]) / p["price"] * 100) if p["price"] > 0 else 0
            m_col  = C["accent_dark"] if margin >= 30 else (C["amber"] if margin >= 15 else C["red"])
            self._set_text(row, 4, f"{round(margin)}%", m_col, bold=True)

            # Qty
            self._set_text(row, 5, str(p["qty"]))

            # Status badge
            if p["qty"] == 0:
                self._set_badge(row, 6, "نفذ", C["badge_red_bg"], C["badge_red_fg"])
            elif p["qty"] <= p["min_qty"]:
                self._set_badge(row, 6, "منخفض", C["badge_amber_bg"], C["badge_amber_fg"])
            else:
                self._set_badge(row, 6, "متاح", C["badge_green_bg"], C["badge_green_fg"])

            # Actions
            actions_w = QWidget()
            actions_l = QHBoxLayout(actions_w)
            actions_l.setContentsMargins(8, 4, 8, 4)
            actions_l.setSpacing(6)

            edit_btn = QPushButton("تعديل")
            edit_btn.setFixedHeight(28)
            edit_btn.setStyleSheet(
                f"background:{C['content_bg']}; color:{C['ink_2']}; border:1px solid {C['border']}; "
                f"border-radius:6px; font-size:11px; font-weight:600;"
            )
            edit_btn.clicked.connect(lambda _, prod=p: self.request_edit.emit(prod))

            del_btn = QPushButton("حذف")
            del_btn.setFixedHeight(28)
            del_btn.setStyleSheet(
                f"background:{C['red_light']}; color:{C['red']}; border:none; "
                f"border-radius:6px; font-size:11px; font-weight:600;"
            )
            del_btn.clicked.connect(lambda _, prod=p: self.request_delete.emit(prod))

            actions_l.addWidget(edit_btn)
            actions_l.addWidget(del_btn)
            self.table.setCellWidget(row, 7, actions_w)

    def _set_text(self, row, col, text, color=None, bold=False):
        item = QTableWidgetItem(text)
        item.setTextAlignment(Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignVCenter)
        if color:
            item.setForeground(QColor(color))
        if bold:
            font = item.font()
            font.setBold(True)
            item.setFont(font)
        self.table.setItem(row, col, item)

    def _set_badge(self, row, col, text, bg_color, fg_color):
        badge = QWidget()
        badge_l = QHBoxLayout(badge)
        badge_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        badge_l.setContentsMargins(0, 0, 0, 0)
        lbl = QLabel(text)
        lbl.setStyleSheet(
            f"background:{bg_color}; color:{fg_color}; border-radius:5px; "
            f"font-size:11px; font-weight:700; padding:2px 10px;"
        )
        lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        badge_l.addWidget(lbl)
        self.table.setCellWidget(row, col, badge)
