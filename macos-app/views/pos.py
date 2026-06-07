from __future__ import annotations
"""
POS view — product grid + cart + checkout.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QLineEdit,
    QFrame, QScrollArea, QGridLayout, QSizePolicy, QDoubleSpinBox,
    QSpinBox, QSplitter
)
from PySide6.QtCore import Qt, Signal, QSize
from PySide6.QtGui import QPixmap
from config import C
import db as DB
from datetime import datetime


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


# ── Product tile ──────────────────────────────────────────────────────────────

class ProductTile(QPushButton):
    def __init__(self, product: dict, parent=None):
        super().__init__(parent)
        self.product = product
        self.setFixedSize(130, 150)
        self.setCursor(Qt.CursorShape.PointingHandCursor)
        self.setStyleSheet(self._tile_style(product))
        self._build(product)

    def _tile_style(self, p: dict) -> str:
        unavailable = p["qty"] == 0
        bg  = C["content_bg"] if unavailable else C["card_bg"]
        return (
            f"QPushButton {{ background:{bg}; border:1.5px solid {C['border']}; "
            f"border-radius:10px; text-align:center; }}"
            f"QPushButton:hover {{ border-color:{C['accent']}; background:{C['accent_light']}; }}"
        )

    def _build(self, p: dict):
        layout = QVBoxLayout(self)
        layout.setContentsMargins(8, 8, 8, 8)
        layout.setSpacing(4)
        layout.setAlignment(Qt.AlignmentFlag.AlignCenter)

        # Image or placeholder
        img_lbl = QLabel()
        img_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        img_lbl.setFixedSize(60, 60)
        if p.get("image"):
            pixmap = QPixmap()
            pixmap.loadFromData(p["image"])
            img_lbl.setPixmap(
                pixmap.scaled(60, 60, Qt.AspectRatioMode.KeepAspectRatio,
                              Qt.TransformationMode.SmoothTransformation)
            )
        else:
            img_lbl.setText("📦")
            img_lbl.setStyleSheet("font-size:28px; background:transparent;")
        layout.addWidget(img_lbl)

        name_l = QLabel(p["name"])
        name_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        name_l.setWordWrap(True)
        name_l.setStyleSheet(
            f"font-size:11px; font-weight:600; color:{C['ink']}; background:transparent;"
        )
        layout.addWidget(name_l)

        price_l = QLabel(_fmt(p["price"]))
        price_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        price_l.setStyleSheet(
            f"font-size:12px; font-weight:700; color:{C['accent_dark']}; background:transparent;"
        )
        layout.addWidget(price_l)

        unit = p.get("unit") or "قطعة"
        stock_txt = "نفذ" if p["qty"] == 0 else f"{p['qty']} {unit}"
        stock_color = C["red"] if p["qty"] == 0 else C["ink_3"]
        stock_l = QLabel(stock_txt)
        stock_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        stock_l.setStyleSheet(
            f"font-size:10px; color:{stock_color}; background:transparent;"
        )
        layout.addWidget(stock_l)


# ── Cart item row ─────────────────────────────────────────────────────────────

class CartItemRow(QWidget):
    qty_changed  = Signal(int, int)   # index, delta
    item_removed = Signal(int)        # index

    def __init__(self, item: dict, index: int, parent=None):
        super().__init__(parent)
        self._index = index
        self._build(item)

    def _build(self, item: dict):
        self.setStyleSheet(
            f"background:{C['card_bg']}; border-radius:8px; border:1px solid {C['border']};"
        )
        layout = QHBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(8)

        # Name + unit price
        info = QVBoxLayout()
        info.setSpacing(2)
        name_l = QLabel(item["name"])
        name_l.setStyleSheet(f"font-size:12px; font-weight:600; color:{C['ink']}; background:transparent;")
        unit_l = QLabel(_fmt(item["price"]))
        unit_l.setStyleSheet(f"font-size:10px; color:{C['ink_3']}; background:transparent;")
        info.addWidget(name_l)
        info.addWidget(unit_l)
        layout.addLayout(info, 1)

        # Qty controls
        minus_btn = QPushButton("−")
        minus_btn.setFixedSize(26, 26)
        minus_btn.setStyleSheet(
            f"background:{C['content_bg']}; border-radius:6px; font-size:14px; font-weight:700; border:1px solid {C['border']};"
        )
        minus_btn.clicked.connect(lambda: self.qty_changed.emit(self._index, -1))

        self.qty_lbl = QLabel(str(item["qty"]))
        self.qty_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.qty_lbl.setFixedWidth(28)
        self.qty_lbl.setStyleSheet(f"font-size:13px; font-weight:700; color:{C['ink']}; background:transparent;")

        plus_btn = QPushButton("+")
        plus_btn.setFixedSize(26, 26)
        plus_btn.setStyleSheet(
            f"background:{C['accent_light']}; border-radius:6px; font-size:14px; font-weight:700; "
            f"color:{C['accent_dark']}; border:1px solid {C['accent']}33;"
        )
        plus_btn.clicked.connect(lambda: self.qty_changed.emit(self._index, 1))

        # Line total
        total_l = QLabel(_fmt(item["price"] * item["qty"]))
        total_l.setStyleSheet(f"font-size:12px; font-weight:700; color:{C['ink']}; background:transparent;")
        total_l.setFixedWidth(72)
        total_l.setAlignment(Qt.AlignmentFlag.AlignRight | Qt.AlignmentFlag.AlignVCenter)

        remove_btn = QPushButton("✕")
        remove_btn.setFixedSize(20, 20)
        remove_btn.setStyleSheet(
            f"background:transparent; color:{C['ink_3']}; font-size:10px; border:none;"
        )
        remove_btn.clicked.connect(lambda: self.item_removed.emit(self._index))

        layout.addWidget(minus_btn)
        layout.addWidget(self.qty_lbl)
        layout.addWidget(plus_btn)
        layout.addWidget(total_l)
        layout.addWidget(remove_btn)


# ── POS view ──────────────────────────────────────────────────────────────────

class POSView(QWidget):
    sale_completed = Signal(dict)

    def __init__(self, parent=None):
        super().__init__(parent)
        self._cart: list[dict] = []
        self._products: list[dict] = []
        self._build()

    def _build(self):
        root = QHBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        splitter = QSplitter(Qt.Orientation.Horizontal)
        splitter.setHandleWidth(1)
        splitter.setStyleSheet(f"QSplitter::handle {{ background:{C['border']}; }}")

        # ── Products panel (right in RTL) ────────────────────────────────────
        prod_panel = QWidget()
        prod_panel.setStyleSheet(f"background:{C['content_bg']};")
        prod_layout = QVBoxLayout(prod_panel)
        prod_layout.setContentsMargins(20, 20, 20, 20)
        prod_layout.setSpacing(14)

        search_row = QHBoxLayout()
        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("🔍  ابحث عن منتج...")
        self.search_input.setFixedHeight(38)
        self.search_input.textChanged.connect(self._filter_products)
        search_row.addWidget(self.search_input)
        prod_layout.addLayout(search_row)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        self.grid_widget = QWidget()
        self.grid_widget.setStyleSheet(f"background:{C['content_bg']};")
        self.grid_layout = QGridLayout(self.grid_widget)
        self.grid_layout.setSpacing(10)
        self.grid_layout.setContentsMargins(0, 0, 0, 0)
        scroll.setWidget(self.grid_widget)
        prod_layout.addWidget(scroll)

        # ── Cart panel (left in RTL) ─────────────────────────────────────────
        cart_panel = QWidget()
        cart_panel.setStyleSheet(
            f"background:{C['card_bg']}; border-right:1px solid {C['border']};"
        )
        cart_layout = QVBoxLayout(cart_panel)
        cart_layout.setContentsMargins(16, 16, 16, 16)
        cart_layout.setSpacing(10)

        # Cart header
        cart_hdr = QHBoxLayout()
        cart_title = QLabel("🛒 السلة")
        cart_title.setStyleSheet(f"font-size:14px; font-weight:700; color:{C['ink']};")
        clear_btn = QPushButton("مسح")
        clear_btn.setFixedHeight(30)
        clear_btn.setStyleSheet(
            f"background:{C['red_light']}; color:{C['red']}; border:none; "
            f"border-radius:6px; font-size:11px; font-weight:700;"
        )
        clear_btn.clicked.connect(self._clear_cart)
        cart_hdr.addWidget(cart_title)
        cart_hdr.addStretch()
        cart_hdr.addWidget(clear_btn)
        cart_layout.addLayout(cart_hdr)

        # Cart scroll
        cart_scroll = QScrollArea()
        cart_scroll.setWidgetResizable(True)
        cart_scroll.setFrameShape(QFrame.Shape.NoFrame)
        self.cart_items_widget = QWidget()
        self.cart_items_widget.setStyleSheet(f"background:{C['card_bg']};")
        self.cart_items_layout = QVBoxLayout(self.cart_items_widget)
        self.cart_items_layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        self.cart_items_layout.setSpacing(8)
        self.cart_items_layout.setContentsMargins(0, 0, 0, 0)
        cart_scroll.setWidget(self.cart_items_widget)
        cart_layout.addWidget(cart_scroll, 1)

        # Totals
        sep = QFrame()
        sep.setFrameShape(QFrame.Shape.HLine)
        sep.setStyleSheet(f"background:{C['border']}; border:none;")
        sep.setFixedHeight(1)
        cart_layout.addWidget(sep)

        totals_l = QVBoxLayout()
        totals_l.setSpacing(6)

        subtotal_row = QHBoxLayout()
        subtotal_row.addWidget(QLabel("المجموع"))
        self.subtotal_lbl = QLabel("0 ج.م")
        self.subtotal_lbl.setAlignment(Qt.AlignmentFlag.AlignLeft)
        subtotal_row.addStretch()
        subtotal_row.addWidget(self.subtotal_lbl)
        totals_l.addLayout(subtotal_row)

        # Discount row
        disc_row = QHBoxLayout()
        disc_lbl = QLabel("خصم %")
        disc_lbl.setStyleSheet(f"color:{C['ink_2']};")
        self.discount_input = QDoubleSpinBox()
        self.discount_input.setRange(0, 100)
        self.discount_input.setDecimals(0)
        self.discount_input.setSuffix(" %")
        self.discount_input.setFixedWidth(90)
        self.discount_input.setFixedHeight(32)
        self.discount_input.valueChanged.connect(self._update_totals)
        disc_row.addWidget(disc_lbl)
        disc_row.addStretch()
        disc_row.addWidget(self.discount_input)
        totals_l.addLayout(disc_row)

        # Total
        total_row_l = QHBoxLayout()
        total_title = QLabel("الإجمالي")
        total_title.setStyleSheet(f"font-size:15px; font-weight:800; color:{C['ink']};")
        self.total_lbl = QLabel("0 ج.م")
        self.total_lbl.setStyleSheet(
            f"font-size:15px; font-weight:800; color:{C['accent_dark']};"
        )
        total_row_l.addWidget(total_title)
        total_row_l.addStretch()
        total_row_l.addWidget(self.total_lbl)
        totals_l.addLayout(total_row_l)

        cart_layout.addLayout(totals_l)

        # Checkout button
        self.checkout_btn = QPushButton("إتمام البيع  ✓")
        self.checkout_btn.setFixedHeight(46)
        self.checkout_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:10px; "
            f"font-size:15px; font-weight:700; border:none;"
        )
        self.checkout_btn.setEnabled(False)
        self.checkout_btn.clicked.connect(self._complete_sale)
        cart_layout.addWidget(self.checkout_btn)

        splitter.addWidget(cart_panel)
        splitter.addWidget(prod_panel)
        splitter.setSizes([340, 700])
        root.addWidget(splitter)

    # ── Public ────────────────────────────────────────────────────────────────

    def refresh(self):
        self._products = DB.get_products()
        # Enforce max discount from settings
        max_disc = int(DB.get_setting("max_discount", "100"))
        self.discount_input.setMaximum(max_disc)
        self._render_products(self._products)
        self._render_cart()

    # ── Products grid ─────────────────────────────────────────────────────────

    def _filter_products(self, text: str):
        q = text.lower().strip()
        filtered = [
            p for p in self._products
            if not q or q in p["name"].lower() or q in (p.get("category") or "").lower()
        ]
        self._render_products(filtered)

    def _render_products(self, products: list[dict]):
        # Clear grid
        while self.grid_layout.count():
            item = self.grid_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        cols = 4
        for i, p in enumerate(products):
            tile = ProductTile(p)
            tile.setEnabled(p["qty"] > 0)
            tile.clicked.connect(lambda _, pid=p["id"]: self._add_to_cart(pid))
            self.grid_layout.addWidget(tile, i // cols, i % cols)

        # Fill remaining cells
        remainder = len(products) % cols
        if remainder:
            for j in range(cols - remainder):
                spacer = QWidget()
                spacer.setFixedSize(130, 150)
                self.grid_layout.addWidget(spacer, len(products) // cols, remainder + j)

    # ── Cart ──────────────────────────────────────────────────────────────────

    def _add_to_cart(self, product_id: int):
        p = next((x for x in self._products if x["id"] == product_id), None)
        if not p or p["qty"] == 0:
            return
        existing = next((c for c in self._cart if c["product_id"] == product_id), None)
        if existing:
            if existing["qty"] >= p["qty"]:
                return
            existing["qty"] += 1
        else:
            self._cart.append({
                "product_id":   p["id"],
                "name":         p["name"],
                "qty":          1,
                "cost":         p["cost"],
                "price":        p["price"],
                "unit":         p.get("unit", ""),
            })
        self._render_cart()

    def _render_cart(self):
        # Clear
        while self.cart_items_layout.count():
            item = self.cart_items_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        if not self._cart:
            empty = QLabel("اضغط على منتج لإضافته")
            empty.setAlignment(Qt.AlignmentFlag.AlignCenter)
            empty.setStyleSheet(f"color:{C['ink_3']}; font-size:12px;")
            self.cart_items_layout.addWidget(empty)
            self.checkout_btn.setEnabled(False)
            self._update_totals()
            return

        for idx, item in enumerate(self._cart):
            row = CartItemRow(item, idx)
            row.qty_changed.connect(self._change_qty)
            row.item_removed.connect(self._remove_item)
            self.cart_items_layout.addWidget(row)

        self.checkout_btn.setEnabled(True)
        self._update_totals()

    def _change_qty(self, index: int, delta: int):
        if index >= len(self._cart):
            return
        item = self._cart[index]
        p = next((x for x in self._products if x["id"] == item["product_id"]), None)
        item["qty"] += delta
        if item["qty"] <= 0:
            self._cart.pop(index)
        elif p and item["qty"] > p["qty"]:
            item["qty"] = p["qty"]
        self._render_cart()

    def _remove_item(self, index: int):
        if index < len(self._cart):
            self._cart.pop(index)
        self._render_cart()

    def _clear_cart(self):
        self._cart = []
        self.discount_input.setValue(0)
        self._render_cart()

    def _update_totals(self):
        subtotal = sum(it["price"] * it["qty"] for it in self._cart)
        disc_pct = self.discount_input.value()
        disc_amt = subtotal * disc_pct / 100
        total    = subtotal - disc_amt
        self.subtotal_lbl.setText(_fmt(subtotal))
        self.total_lbl.setText(_fmt(total))

    # ── Checkout ──────────────────────────────────────────────────────────────

    def _complete_sale(self):
        if not self._cart:
            return
        subtotal = sum(it["price"] * it["qty"] for it in self._cart)
        disc_pct = self.discount_input.value()
        disc_amt = subtotal * disc_pct / 100
        total    = subtotal - disc_amt
        cost     = sum(it["cost"] * it["qty"] for it in self._cart)
        profit   = total - cost
        ts       = datetime.now().isoformat()

        items = [
            {
                "product_id":   it["product_id"],
                "product_name": it["name"],
                "qty":          it["qty"],
                "cost":         it["cost"],
                "price":        it["price"],
            }
            for it in self._cart
        ]

        # Deduct stock
        for it in self._cart:
            DB.deduct_stock(it["product_id"], it["qty"])

        sale_id = DB.save_sale(ts, subtotal, disc_amt, total, profit, items)
        sale = {
            "id":       sale_id,
            "ts":       ts,
            "subtotal": subtotal,
            "discount": disc_amt,
            "total":    total,
            "profit":   profit,
            "items":    items,
        }

        # Reset cart
        self._cart = []
        self.discount_input.setValue(0)
        self._products = DB.get_products()
        self._render_products(self._products)
        self._render_cart()

        self.sale_completed.emit(sale)
