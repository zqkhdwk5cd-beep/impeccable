"""
Sales history view — full transaction log, click to view receipt.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QLabel, QTableWidget, QTableWidgetItem,
    QHeaderView, QAbstractItemView, QFrame
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor
from config import C
import db as DB
from datetime import datetime


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


def _fmt_dt(iso: str) -> str:
    try:
        return datetime.fromisoformat(iso).strftime("%Y/%m/%d  %H:%M")
    except Exception:
        return iso


class HistoryView(QWidget):
    view_receipt = Signal(int)   # sale_id

    def __init__(self, parent=None):
        super().__init__(parent)
        self._build()

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(14)
        self.setStyleSheet(f"background:{C['content_bg']};")

        hint = QLabel("اضغط على أي صف لعرض الفاتورة.")
        hint.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")
        layout.addWidget(hint)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(
            ["رقم الفاتورة", "التاريخ والوقت", "المنتجات", "الخصم", "الإجمالي", "الربح"]
        )
        self.table.horizontalHeader().setSectionResizeMode(2, QHeaderView.ResizeMode.Stretch)
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
        self.table.cellDoubleClicked.connect(self._on_row_click)
        layout.addWidget(self.table)

        self.empty_lbl = QLabel("🧾  لا يوجد سجل مبيعات بعد.")
        self.empty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.empty_lbl.setStyleSheet(f"font-size:14px; color:{C['ink_3']}; padding:40px;")
        self.empty_lbl.hide()
        layout.addWidget(self.empty_lbl)

    def refresh(self):
        sales = DB.get_sales()
        self.table.setRowCount(0)

        if not sales:
            self.table.hide()
            self.empty_lbl.show()
            return
        self.table.show()
        self.empty_lbl.hide()

        for s in sales:  # already DESC from DB
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setRowHeight(row, 48)

            # Store sale_id in first column's data
            id_item = QTableWidgetItem(f"#{s['id']}")
            id_item.setData(Qt.ItemDataRole.UserRole, s["id"])
            id_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignVCenter)
            id_item.setForeground(QColor(C["ink_2"]))
            self.table.setItem(row, 0, id_item)

            self._item(row, 1, _fmt_dt(s["ts"]))

            items_str = "، ".join(
                f"{it['product_name']} ×{it['qty']}" for it in s.get("items", [])
            )
            items_item = QTableWidgetItem(items_str)
            items_item.setForeground(QColor(C["ink_3"]))
            items_item.setTextAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)
            f = items_item.font()
            f.setPointSize(10)
            items_item.setFont(f)
            self.table.setItem(row, 2, items_item)

            self._item(row, 3, _fmt(s["discount"]) if s.get("discount", 0) > 0 else "—")
            self._item(row, 4, _fmt(s["total"]), bold=True)

            profit_color = C["accent_dark"] if s["profit"] >= 0 else C["red"]
            self._item(row, 5, _fmt(s["profit"]), color=profit_color, bold=True)

    def _on_row_click(self, row: int, _col: int):
        item = self.table.item(row, 0)
        if item:
            sale_id = item.data(Qt.ItemDataRole.UserRole)
            if sale_id:
                self.view_receipt.emit(sale_id)

    def _item(self, row, col, text, color=None, bold=False):
        it = QTableWidgetItem(text)
        it.setTextAlignment(Qt.AlignmentFlag.AlignCenter | Qt.AlignmentFlag.AlignVCenter)
        if color:
            it.setForeground(QColor(color))
        if bold:
            f = it.font()
            f.setBold(True)
            it.setFont(f)
        self.table.setItem(row, col, it)
