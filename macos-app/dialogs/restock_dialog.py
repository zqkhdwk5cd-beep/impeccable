"""
Restock dialog — adds quantity to a product.
"""
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QSpinBox, QPushButton, QFrame
)
from PySide6.QtCore import Qt
from config import C


class RestockDialog(QDialog):
    def __init__(self, product: dict, parent=None):
        super().__init__(parent)
        self._product = product
        self.setWindowTitle("إعادة تعبئة المخزون")
        self.setFixedWidth(360)
        self.setModal(True)
        self._build()

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(24, 24, 24, 20)

        icon = QLabel("📦")
        icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon.setStyleSheet("font-size:36px;")
        layout.addWidget(icon)

        title = QLabel("إعادة تعبئة المخزون")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet(f"font-size:16px; font-weight:700; color:{C['ink']};")
        layout.addWidget(title)

        p = self._product
        unit = p.get("unit") or "قطعة"
        info = QLabel(f"{p['name']} · الكمية الحالية: {p['qty']} {unit}")
        info.setAlignment(Qt.AlignmentFlag.AlignCenter)
        info.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")
        info.setWordWrap(True)
        layout.addWidget(info)

        qty_lbl = QLabel("الكمية المضافة")
        qty_lbl.setStyleSheet(f"font-size:11px; font-weight:700; color:{C['ink_3']};")
        layout.addWidget(qty_lbl)

        self.qty_spin = QSpinBox()
        self.qty_spin.setRange(1, 999_999)
        self.qty_spin.setValue(1)
        self.qty_spin.setFixedHeight(44)
        self.qty_spin.setStyleSheet(
            f"font-size:18px; text-align:center; font-weight:700;"
        )
        layout.addWidget(self.qty_spin)

        row = QHBoxLayout()
        cancel = QPushButton("إلغاء")
        cancel.setFixedHeight(38)
        cancel.clicked.connect(self.reject)

        confirm = QPushButton("إضافة للمخزون")
        confirm.setFixedHeight(38)
        confirm.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        confirm.clicked.connect(self.accept)

        row.addWidget(cancel)
        row.addWidget(confirm)
        layout.addLayout(row)

    def get_qty(self) -> int:
        return self.qty_spin.value()
