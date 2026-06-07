from __future__ import annotations
"""
Receipt dialog — displays the sale receipt and handles printing.
"""
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QPushButton,
    QFrame, QScrollArea, QWidget
)
from PySide6.QtCore import Qt
from PySide6.QtPrintSupport import QPrinter, QPrintDialog
from PySide6.QtGui import QTextDocument
from config import C
from datetime import datetime


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


def _fmt_dt(iso: str) -> str:
    try:
        dt = datetime.fromisoformat(iso)
        return dt.strftime("%Y/%m/%d  %H:%M")
    except Exception:
        return iso


class ReceiptDialog(QDialog):
    def __init__(self, sale: dict, settings: dict, parent=None):
        super().__init__(parent)
        self._sale     = sale
        self._settings = settings
        self.setWindowTitle("فاتورة المبيعة")
        self.setFixedWidth(400)
        self.setModal(True)
        self._build()

    def _build(self):
        root = QVBoxLayout(self)
        root.setSpacing(0)
        root.setContentsMargins(0, 0, 0, 0)

        # Header bar
        header = QFrame()
        header.setFixedHeight(52)
        header.setStyleSheet(
            f"background:{C['card_bg']}; border-bottom:1px solid {C['border']};"
        )
        h_row = QHBoxLayout(header)
        h_row.setContentsMargins(16, 0, 16, 0)
        title = QLabel("🧾 الفاتورة")
        title.setStyleSheet(f"font-size:15px; font-weight:700; color:{C['ink']};")
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(28, 28)
        close_btn.setStyleSheet(
            f"background:transparent; color:{C['ink_3']}; font-size:14px; border:none;"
        )
        close_btn.clicked.connect(self.accept)
        h_row.addWidget(title)
        h_row.addStretch()
        h_row.addWidget(close_btn)
        root.addWidget(header)

        # Receipt paper
        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet(f"background:{C['content_bg']};")

        paper = QWidget()
        paper.setStyleSheet(
            f"background:{C['card_bg']}; border-radius:0px; margin:20px;"
        )
        paper_layout = QVBoxLayout(paper)
        paper_layout.setSpacing(0)
        paper_layout.setContentsMargins(24, 24, 24, 24)

        s = self._settings
        store_name = s.get("store_name", "متجري")
        footer_text = s.get("receipt_footer", "")

        # Store name
        store_lbl = QLabel(store_name)
        store_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        store_lbl.setStyleSheet(
            f"font-size:18px; font-weight:800; color:{C['ink']}; padding:4px 0;"
        )
        paper_layout.addWidget(store_lbl)

        divider_top = self._divider()
        paper_layout.addWidget(divider_top)

        # Invoice meta
        meta_grid = QWidget()
        meta_layout = QHBoxLayout(meta_grid)
        meta_layout.setContentsMargins(0, 8, 0, 8)
        meta_layout.setSpacing(0)
        inv_no = QLabel(f"فاتورة #{self._sale['id']}")
        inv_no.setStyleSheet(f"font-size:11px; color:{C['ink_3']};")
        inv_date = QLabel(_fmt_dt(self._sale["ts"]))
        inv_date.setStyleSheet(f"font-size:11px; color:{C['ink_3']};")
        meta_layout.addWidget(inv_no)
        meta_layout.addStretch()
        meta_layout.addWidget(inv_date)
        paper_layout.addWidget(meta_grid)

        divider_items_top = self._divider()
        paper_layout.addWidget(divider_items_top)

        # Column headers
        col_header = QWidget()
        col_layout = QHBoxLayout(col_header)
        col_layout.setContentsMargins(0, 6, 0, 6)
        for txt, stretch in [("الصنف", 3), ("الكمية", 1), ("السعر", 1), ("الإجمالي", 1)]:
            l = QLabel(txt)
            l.setStyleSheet(f"font-size:10px; font-weight:700; color:{C['ink_3']};")
            l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            col_layout.addWidget(l, stretch)
        paper_layout.addWidget(col_header)

        # Items
        for item in self._sale.get("items", []):
            row_w = QWidget()
            row_l = QHBoxLayout(row_w)
            row_l.setContentsMargins(0, 5, 0, 5)
            row_l.setSpacing(4)

            name_l = QLabel(item["product_name"])
            name_l.setStyleSheet(f"font-size:12px; color:{C['ink']};")
            name_l.setWordWrap(True)

            qty_l = QLabel(str(item["qty"]))
            qty_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            qty_l.setStyleSheet(f"font-size:12px; color:{C['ink_2']};")

            price_l = QLabel(str(round(item["price"])))
            price_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            price_l.setStyleSheet(f"font-size:12px; color:{C['ink_2']};")

            total_l = QLabel(str(round(item["price"] * item["qty"])))
            total_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
            total_l.setStyleSheet(f"font-size:12px; font-weight:600; color:{C['ink']};")

            row_l.addWidget(name_l, 3)
            row_l.addWidget(qty_l, 1)
            row_l.addWidget(price_l, 1)
            row_l.addWidget(total_l, 1)
            paper_layout.addWidget(row_w)

        divider_items_bot = self._divider()
        paper_layout.addWidget(divider_items_bot)

        # Totals
        subtotal = self._sale.get("subtotal", self._sale["total"])
        paper_layout.addWidget(self._total_row("المجموع", _fmt(subtotal), False))
        if self._sale.get("discount", 0) > 0:
            paper_layout.addWidget(
                self._total_row("الخصم", "− " + _fmt(self._sale["discount"]), False)
            )
        paper_layout.addWidget(self._total_row("الإجمالي", _fmt(self._sale["total"]), True))

        divider_footer = self._divider()
        paper_layout.addWidget(divider_footer)

        # Footer message
        if footer_text:
            footer_lbl = QLabel(footer_text)
            footer_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
            footer_lbl.setStyleSheet(f"font-size:11px; color:{C['ink_3']}; padding:8px 0;")
            footer_lbl.setWordWrap(True)
            paper_layout.addWidget(footer_lbl)

        scroll.setWidget(paper)
        root.addWidget(scroll, 1)

        # Actions footer
        actions = QFrame()
        actions.setFixedHeight(60)
        actions.setStyleSheet(
            f"background:{C['card_bg']}; border-top:1px solid {C['border']};"
        )
        a_row = QHBoxLayout(actions)
        a_row.setContentsMargins(16, 0, 16, 0)
        a_row.setSpacing(10)

        print_btn = QPushButton("🖨  طباعة")
        print_btn.setFixedHeight(38)
        print_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        print_btn.clicked.connect(self._print_receipt)

        close_btn2 = QPushButton("إغلاق")
        close_btn2.setFixedHeight(38)
        close_btn2.clicked.connect(self.accept)

        a_row.addStretch()
        a_row.addWidget(close_btn2)
        a_row.addWidget(print_btn)
        root.addWidget(actions)

        self.setMinimumHeight(520)

    @staticmethod
    def _divider() -> QFrame:
        line = QFrame()
        line.setFrameShape(QFrame.Shape.HLine)
        line.setFixedHeight(1)
        line.setStyleSheet(f"background: #E0E0E0; border:none;")
        return line

    @staticmethod
    def _total_row(label: str, value: str, bold: bool) -> QWidget:
        from config import C
        w = QWidget()
        row = QHBoxLayout(w)
        row.setContentsMargins(0, 4, 0, 4)
        lbl = QLabel(label)
        val = QLabel(value)
        style = f"font-size:{'14' if bold else '12'}px; " \
                f"font-weight:{'800' if bold else '500'}; color:{C['ink']};"
        lbl.setStyleSheet(style)
        val.setStyleSheet(style)
        row.addWidget(lbl)
        row.addStretch()
        row.addWidget(val)
        return w

    def _print_receipt(self):
        s = self._settings
        store  = s.get("store_name", "متجري")
        footer = s.get("receipt_footer", "")
        items_html = ""
        for it in self._sale.get("items", []):
            items_html += (
                f"<tr>"
                f"<td>{it['product_name']}</td>"
                f"<td style='text-align:center'>{it['qty']}</td>"
                f"<td style='text-align:center'>{round(it['price'])}</td>"
                f"<td style='text-align:center'>{round(it['price']*it['qty'])}</td>"
                f"</tr>"
            )
        disc_row = ""
        if self._sale.get("discount", 0) > 0:
            disc_row = f"<tr><td colspan='3'>الخصم</td><td>- {round(self._sale['discount'])}</td></tr>"

        html = f"""
        <html><head>
        <meta charset='UTF-8'>
        <style>
          body {{ font-family: Arial, sans-serif; direction: rtl; font-size: 12px; }}
          h1   {{ text-align:center; font-size:18px; margin-bottom:4px; }}
          .meta{{ font-size:10px; color:#666; text-align:center; margin-bottom:8px; }}
          table{{ width:100%; border-collapse:collapse; margin:8px 0; }}
          th, td{{ padding:4px 6px; border-bottom:1px solid #ddd; }}
          th   {{ background:#f5f5f5; font-weight:bold; }}
          .total{{ font-weight:bold; font-size:14px; }}
          .footer{{ text-align:center; font-size:10px; color:#888; margin-top:12px; }}
        </style></head><body>
        <h1>{store}</h1>
        <div class='meta'>فاتورة #{self._sale['id']} · {_fmt_dt(self._sale['ts'])}</div>
        <hr>
        <table>
          <tr><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr>
          {items_html}
        </table>
        <hr>
        <table>
          <tr><td colspan='3'>المجموع</td><td>{round(self._sale.get('subtotal', self._sale['total']))}</td></tr>
          {disc_row}
          <tr class='total'><td colspan='3'>الإجمالي</td><td>{round(self._sale['total'])} ج.م</td></tr>
        </table>
        <div class='footer'>{footer}</div>
        </body></html>
        """
        doc = QTextDocument()
        doc.setHtml(html)

        printer = QPrinter(QPrinter.PrinterMode.HighResolution)
        dlg = QPrintDialog(printer, self)
        if dlg.exec() == QPrintDialog.DialogCode.Accepted:
            doc.print_(printer)
