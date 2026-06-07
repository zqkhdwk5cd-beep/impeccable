from __future__ import annotations
"""
Inventory view — stock levels table with restock action.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView, QFrame
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor
from config import C
import db as DB


class InventoryView(QWidget):
    request_restock = Signal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build()

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(28, 28, 28, 28)
        layout.setSpacing(16)
        self.setStyleSheet(f"background:{C['content_bg']};")

        # Header info
        info = QLabel("قائمة المخزون الحالي لجميع المنتجات. اضغط «تعبئة» لإضافة كميات.")
        info.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")
        layout.addWidget(info)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(
            ["المنتج", "الفئة", "الوحدة", "الكمية الحالية", "الحد الأدنى", "إجراءات"]
        )
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.ResizeMode.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(5, QHeaderView.ResizeMode.Fixed)
        self.table.setColumnWidth(5, 100)
        self.table.verticalHeader().setVisible(False)
        self.table.setSelectionBehavior(QAbstractItemView.SelectionBehavior.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
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
        products = DB.get_products()
        products_sorted = sorted(products, key=lambda p: (p["qty"] <= p["min_qty"]) * -1)
        self.table.setRowCount(0)

        for p in products_sorted:
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setRowHeight(row, 48)

            self._set_text(row, 0, p["name"], align_left=True)
            self._set_text(row, 1, p.get("category") or "—")
            self._set_text(row, 2, p.get("unit") or "قطعة")

            # Qty with colour coding
            qty = p["qty"]
            min_q = p["min_qty"]
            if qty == 0:
                qty_color = C["red"]
            elif qty <= min_q:
                qty_color = C["amber"]
            else:
                qty_color = C["accent_dark"]
            qty_item = QTableWidgetItem(str(qty))
            qty_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignVCenter)
            qty_item.setForeground(QColor(qty_color))
            font = qty_item.font()
            font.setBold(True)
            font.setPointSize(13)
            qty_item.setFont(font)
            self.table.setItem(row, 3, qty_item)

            self._set_text(row, 4, str(min_q))

            # Restock button
            btn_w = QWidget()
            btn_l = QHBoxLayout(btn_w)
            btn_l.setContentsMargins(8, 4, 8, 4)
            restock_btn = QPushButton("تعبئة")
            restock_btn.setFixedHeight(28)
            restock_btn.setStyleSheet(
                f"background:{C['accent_light']}; color:{C['accent_dark']}; border:none; "
                f"border-radius:6px; font-size:11px; font-weight:700;"
            )
            restock_btn.clicked.connect(lambda _, prod=p: self.request_restock.emit(prod))
            btn_l.addWidget(restock_btn)
            self.table.setCellWidget(row, 5, btn_w)

    def _set_text(self, row, col, text, align_left=False):
        item = QTableWidgetItem(text)
        align = Qt.AlignmentFlag.AlignVCenter
        align |= (Qt.AlignmentFlag.AlignRight if not align_left else Qt.AlignmentFlag.AlignLeft)
        item.setTextAlignment(align)
        self.table.setItem(row, col, item)
