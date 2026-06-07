from __future__ import annotations
"""
Add / Edit product dialog.
Handles name, category, unit, cost, price, qty, min_qty, and image upload.
"""
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QGridLayout, QLabel, QLineEdit,
    QPushButton, QDoubleSpinBox, QSpinBox, QComboBox, QFileDialog,
    QScrollArea, QWidget, QSizePolicy, QFrame
)
from PySide6.QtCore import Qt, QSize
from PySide6.QtGui import QPixmap, QIcon
from config import C
import os


class ProductDialog(QDialog):
    def __init__(self, categories: list[str], product: dict | None = None, parent=None):
        super().__init__(parent)
        self._categories  = categories
        self._product     = product
        self._image_bytes = None
        self._clear_image = False
        is_edit = product is not None
        self.setWindowTitle("تعديل المنتج" if is_edit else "إضافة منتج جديد")
        self.setMinimumWidth(520)
        self.setModal(True)
        self._build()
        if is_edit:
            self._fill(product)

    # ── Build UI ─────────────────────────────────────────────────────────────

    def _build(self):
        root = QVBoxLayout(self)
        root.setSpacing(0)
        root.setContentsMargins(0, 0, 0, 0)

        # Header
        header = QFrame()
        header.setFixedHeight(56)
        header.setStyleSheet(
            f"background:{C['card_bg']}; border-bottom:1px solid {C['border']};"
        )
        h_row = QHBoxLayout(header)
        h_row.setContentsMargins(20, 0, 20, 0)
        self.title_label = QLabel(
            "تعديل المنتج" if self._product else "إضافة منتج جديد"
        )
        self.title_label.setStyleSheet(
            f"font-size:15px; font-weight:700; color:{C['ink']};"
        )
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(30, 30)
        close_btn.setStyleSheet(
            f"background:transparent; color:{C['ink_3']}; font-size:14px; border:none;"
        )
        close_btn.clicked.connect(self.reject)
        h_row.addWidget(self.title_label)
        h_row.addStretch()
        h_row.addWidget(close_btn)
        root.addWidget(header)

        # Scrollable body
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        body_w = QWidget()
        body_w.setStyleSheet(f"background:{C['content_bg']};")
        body   = QVBoxLayout(body_w)
        body.setSpacing(14)
        body.setContentsMargins(20, 20, 20, 20)
        scroll.setWidget(body_w)
        root.addWidget(scroll)

        # Grid fields
        grid = QGridLayout()
        grid.setSpacing(12)

        # Name (full width)
        grid.addWidget(self._lbl("اسم المنتج *"), 0, 0, 1, 2)
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("مثال: مياه معدنية 500مل")
        grid.addWidget(self.name_input, 1, 0, 1, 2)

        # Category
        grid.addWidget(self._lbl("الفئة"), 2, 0)
        self.cat_input = QComboBox()
        self.cat_input.setEditable(True)
        self.cat_input.setInsertPolicy(QComboBox.InsertPolicy.InsertAtTop)
        self.cat_input.addItem("")
        for c in self._categories:
            self.cat_input.addItem(c)
        self.cat_input.lineEdit().setPlaceholderText("مثال: مشروبات")
        grid.addWidget(self.cat_input, 3, 0)

        # Unit
        grid.addWidget(self._lbl("الوحدة"), 2, 1)
        self.unit_input = QLineEdit()
        self.unit_input.setPlaceholderText("قطعة / كيلو / لتر")
        grid.addWidget(self.unit_input, 3, 1)

        # Cost
        grid.addWidget(self._lbl("سعر التكلفة (ج.م) *"), 4, 0)
        self.cost_input = QDoubleSpinBox()
        self.cost_input.setRange(0, 9_999_999)
        self.cost_input.setDecimals(2)
        self.cost_input.setSuffix(" ج.م")
        grid.addWidget(self.cost_input, 5, 0)

        # Price
        grid.addWidget(self._lbl("سعر البيع (ج.م) *"), 4, 1)
        self.price_input = QDoubleSpinBox()
        self.price_input.setRange(0, 9_999_999)
        self.price_input.setDecimals(2)
        self.price_input.setSuffix(" ج.م")
        grid.addWidget(self.price_input, 5, 1)

        # Qty
        grid.addWidget(self._lbl("الكمية"), 6, 0)
        self.qty_input = QSpinBox()
        self.qty_input.setRange(0, 999_999)
        grid.addWidget(self.qty_input, 7, 0)

        # Min qty
        grid.addWidget(self._lbl("الحد الأدنى للتنبيه"), 6, 1)
        self.min_qty_input = QSpinBox()
        self.min_qty_input.setRange(0, 999_999)
        self.min_qty_input.setValue(5)
        grid.addWidget(self.min_qty_input, 7, 1)

        body.addLayout(grid)

        # Image section
        img_lbl = self._lbl("صورة المنتج")
        body.addWidget(img_lbl)

        self.img_frame = QFrame()
        self.img_frame.setFixedHeight(140)
        self.img_frame.setStyleSheet(
            f"background:{C['card_bg']}; border:2px dashed {C['border']};"
            f"border-radius:10px;"
        )
        img_layout = QVBoxLayout(self.img_frame)
        img_layout.setAlignment(Qt.AlignmentFlag.AlignCenter)
        img_layout.setSpacing(6)

        self.img_preview = QLabel()
        self.img_preview.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.img_preview.setFixedHeight(90)
        self.img_preview.hide()

        self.img_placeholder = QLabel("اضغط لرفع صورة\nJPG · PNG · WEBP · الحجم الأقصى 2 ميجا")
        self.img_placeholder.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.img_placeholder.setStyleSheet(f"color:{C['ink_3']}; font-size:12px;")

        self.img_remove_btn = QPushButton("× حذف الصورة")
        self.img_remove_btn.setStyleSheet(
            f"background:{C['red_light']}; color:{C['red']}; border:none; "
            f"border-radius:6px; font-size:11px; padding:3px 10px;"
        )
        self.img_remove_btn.hide()
        self.img_remove_btn.clicked.connect(self._remove_image)

        img_layout.addWidget(self.img_preview)
        img_layout.addWidget(self.img_placeholder)
        img_layout.addWidget(self.img_remove_btn)
        self.img_frame.mousePressEvent = lambda _: self._pick_image()
        self.img_frame.setCursor(Qt.CursorShape.PointingHandCursor)
        body.addWidget(self.img_frame)
        body.addStretch()

        # Footer
        footer = QFrame()
        footer.setFixedHeight(60)
        footer.setStyleSheet(
            f"background:{C['card_bg']}; border-top:1px solid {C['border']};"
        )
        f_row = QHBoxLayout(footer)
        f_row.setContentsMargins(20, 0, 20, 0)
        f_row.setSpacing(10)

        cancel = QPushButton("إلغاء")
        cancel.setFixedHeight(38)
        cancel.clicked.connect(self.reject)

        self.save_btn = QPushButton(
            "حفظ التغييرات" if self._product else "إضافة المنتج"
        )
        self.save_btn.setFixedHeight(38)
        self.save_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        self.save_btn.clicked.connect(self._on_save)

        f_row.addStretch()
        f_row.addWidget(cancel)
        f_row.addWidget(self.save_btn)
        root.addWidget(footer)

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _lbl(text: str) -> QLabel:
        lbl = QLabel(text)
        lbl.setStyleSheet(f"font-size:11px; font-weight:700; color:{C['ink_3']}; background:transparent;")
        return lbl

    def _fill(self, p: dict):
        self.name_input.setText(p.get("name", ""))
        idx = self.cat_input.findText(p.get("category", ""))
        if idx >= 0:
            self.cat_input.setCurrentIndex(idx)
        else:
            self.cat_input.lineEdit().setText(p.get("category", ""))
        self.unit_input.setText(p.get("unit", ""))
        self.cost_input.setValue(p.get("cost", 0))
        self.price_input.setValue(p.get("price", 0))
        self.qty_input.setValue(p.get("qty", 0))
        self.min_qty_input.setValue(p.get("min_qty", 5))
        if p.get("image"):
            self._image_bytes = p["image"]
            self._show_image(p["image"])

    def _pick_image(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "اختر صورة", "",
            "Images (*.png *.jpg *.jpeg *.webp *.bmp)"
        )
        if not path:
            return
        if os.path.getsize(path) > 2 * 1024 * 1024:
            return  # file too large, silently ignore
        with open(path, "rb") as f:
            data = f.read()
        self._image_bytes = data
        self._clear_image = False
        self._show_image(data)

    def _show_image(self, data: bytes):
        pixmap = QPixmap()
        pixmap.loadFromData(data)
        scaled = pixmap.scaled(
            QSize(120, 80),
            Qt.AspectRatioMode.KeepAspectRatio,
            Qt.TransformationMode.SmoothTransformation
        )
        self.img_preview.setPixmap(scaled)
        self.img_preview.show()
        self.img_placeholder.hide()
        self.img_remove_btn.show()

    def _remove_image(self):
        self._image_bytes = None
        self._clear_image = True
        self.img_preview.clear()
        self.img_preview.hide()
        self.img_placeholder.show()
        self.img_remove_btn.hide()

    def _on_save(self):
        if not self.name_input.text().strip():
            self.name_input.setStyleSheet(
                f"border:1.5px solid {C['red']}; border-radius:8px; padding:7px 10px;"
            )
            return
        if self.price_input.value() <= 0:
            self.price_input.setStyleSheet(
                f"border:1.5px solid {C['red']}; border-radius:8px; padding:7px 10px;"
            )
            return
        self.accept()

    # ── Result ────────────────────────────────────────────────────────────────

    def get_data(self) -> dict:
        return {
            "name":     self.name_input.text().strip(),
            "category": self.cat_input.currentText().strip(),
            "unit":     self.unit_input.text().strip(),
            "cost":     self.cost_input.value(),
            "price":    self.price_input.value(),
            "qty":      self.qty_input.value(),
            "min_qty":  self.min_qty_input.value(),
            "image":    self._image_bytes,
            "clear_image": self._clear_image,
        }
