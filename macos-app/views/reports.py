from __future__ import annotations
"""
Reports view — period filter, KPI cards, two charts, daily summary table.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QComboBox,
    QTableWidget, QTableWidgetItem, QHeaderView, QAbstractItemView,
    QFrame, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor
from config import C, CHART_COLORS
import db as DB
from datetime import datetime, timedelta


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


try:
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    MATPLOTLIB_OK = True
except ImportError:
    MATPLOTLIB_OK = False


class ReportsView(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._daily_canvas  = None
        self._top_canvas    = None
        self._build()

    def _build(self):
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet(f"background:{C['content_bg']};")

        outer = QVBoxLayout(self)
        outer.setContentsMargins(0, 0, 0, 0)
        outer.addWidget(scroll)

        container = QWidget()
        container.setStyleSheet(f"background:{C['content_bg']};")
        layout = QVBoxLayout(container)
        layout.setContentsMargins(24, 20, 24, 24)
        layout.setSpacing(18)
        scroll.setWidget(container)

        # Period filter
        filter_row = QHBoxLayout()
        filter_lbl = QLabel("الفترة:")
        filter_lbl.setStyleSheet(f"font-size:13px; font-weight:600; color:{C['ink_2']};")
        self.period_combo = QComboBox()
        self.period_combo.setFixedHeight(36)
        self.period_combo.setMinimumWidth(160)
        self.period_combo.addItems([
            "اليوم", "هذا الأسبوع", "هذا الشهر", "هذه السنة", "كل الوقت"
        ])
        self.period_combo.setCurrentIndex(2)
        self.period_combo.currentIndexChanged.connect(self.refresh)
        filter_row.addWidget(filter_lbl)
        filter_row.addWidget(self.period_combo)
        filter_row.addStretch()
        layout.addLayout(filter_row)

        # KPI row
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(12)
        self.kpi_revenue = self._kpi_card("إجمالي الإيرادات",  C["accent_dark"])
        self.kpi_cost    = self._kpi_card("إجمالي التكاليف",   C["ink"])
        self.kpi_profit  = self._kpi_card("صافي الربح",        C["amber"])
        self.kpi_txn     = self._kpi_card("عدد المعاملات",     C["ink"])
        for card in (self.kpi_revenue, self.kpi_cost, self.kpi_profit, self.kpi_txn):
            card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            kpi_row.addWidget(card)
        layout.addLayout(kpi_row)

        # Charts row
        charts_row = QHBoxLayout()
        charts_row.setSpacing(14)

        # Daily bar chart
        self.daily_card = self._chart_card("الإيرادات والأرباح اليومية")
        charts_row.addWidget(self.daily_card, 3)

        # Top products bar
        self.top_card = self._chart_card("أعلى المنتجات مبيعاً")
        charts_row.addWidget(self.top_card, 2)

        layout.addLayout(charts_row)

        # Daily summary table
        tbl_lbl = QLabel("ملخص يومي")
        tbl_lbl.setStyleSheet(f"font-size:14px; font-weight:700; color:{C['ink']};")
        layout.addWidget(tbl_lbl)

        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(
            ["التاريخ", "المنتجات", "التكلفة", "الإيراد", "الخصم", "الربح"]
        )
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.ResizeMode.Stretch)
        self.table.verticalHeader().setVisible(False)
        self.table.setEditTriggers(QAbstractItemView.EditTrigger.NoEditTriggers)
        self.table.setShowGrid(False)
        self.table.setStyleSheet(
            f"QTableWidget {{ background:{C['card_bg']}; border:1px solid {C['border']}; "
            f"border-radius:12px; outline:none; }}"
            f"QTableWidget::item {{ padding:8px 12px; border-bottom:1px solid {C['border']}; }}"
            f"QTableWidget::item:selected {{ background:{C['accent_light']}; color:{C['ink']}; }}"
            f"QHeaderView::section {{ background:{C['content_bg']}; color:{C['ink_3']}; "
            f"font-size:11px; font-weight:700; padding:8px 12px; border:none; "
            f"border-bottom:1px solid {C['border']}; }}"
        )
        self.table.setFixedHeight(280)
        layout.addWidget(self.table)
        layout.addStretch()

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _kpi_card(self, label: str, value_color: str) -> QFrame:
        card = QFrame()
        card.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:10px;"
        )
        l = QVBoxLayout(card)
        l.setContentsMargins(20, 18, 20, 18)
        l.setSpacing(4)
        lbl = QLabel(label)
        lbl.setStyleSheet(f"font-size:10px; font-weight:700; color:{C['ink_3']}; background:transparent;")
        val = QLabel("0 ج.م")
        val.setStyleSheet(f"font-size:20px; font-weight:800; color:{value_color}; background:transparent;")
        val.setObjectName("kpi_val")
        l.addWidget(lbl)
        l.addWidget(val)
        card._value_label = val
        return card

    def _chart_card(self, title: str) -> QFrame:
        card = QFrame()
        card.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:12px;"
        )
        card.setFixedHeight(240)
        l = QVBoxLayout(card)
        l.setContentsMargins(16, 12, 16, 12)
        l.setSpacing(6)
        t = QLabel(title)
        t.setStyleSheet(f"font-size:13px; font-weight:700; color:{C['ink']}; background:transparent;")
        l.addWidget(t)
        if MATPLOTLIB_OK:
            fig = Figure(figsize=(5, 2), dpi=96)
            fig.patch.set_facecolor("none")
            canvas = FigureCanvas(fig)
            canvas.setStyleSheet("background:transparent;")
            ax = fig.add_subplot(111)
            ax.set_facecolor("none")
            l.addWidget(canvas)
            card._fig    = fig
            card._canvas = canvas
            card._ax     = ax
        return card

    # ── Data ─────────────────────────────────────────────────────────────────

    def _get_period_sales(self) -> list[dict]:
        idx = self.period_combo.currentIndex()
        now = datetime.now()
        if idx == 0:   # Today
            from_dt = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif idx == 1: # Week
            from_dt = now - timedelta(days=now.weekday())
            from_dt = from_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        elif idx == 2: # Month
            from_dt = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        elif idx == 3: # Year
            from_dt = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            return DB.get_sales()
        return DB.get_sales(from_ts=from_dt.isoformat())

    def refresh(self):
        sales = self._get_period_sales()

        revenue = sum(s["total"]  for s in sales)
        cost    = sum(
            sum(it["cost"] * it["qty"] for it in s.get("items", []))
            for s in sales
        )
        profit  = sum(s["profit"] for s in sales)

        self.kpi_revenue._value_label.setText(_fmt(revenue))
        self.kpi_cost._value_label.setText(_fmt(cost))
        self.kpi_profit._value_label.setText(_fmt(profit))
        self.kpi_txn._value_label.setText(str(len(sales)))

        self._draw_daily(sales)
        self._draw_top_products(sales)
        self._render_table(sales)

    @staticmethod
    def _clean_ax(ax):
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

    def _draw_daily(self, sales):
        if not MATPLOTLIB_OK or not hasattr(self.daily_card, "_ax"):
            return
        ax = self.daily_card._ax
        ax.cla()
        ax.set_facecolor("none")

        if not sales:
            self._clean_ax(ax)
            ax.text(0.5, 0.5, "لا توجد مبيعات في هذه الفترة",
                    ha="center", va="center",
                    color=C["ink_3"], fontsize=10, transform=ax.transAxes)
            self.daily_card._canvas.draw()
            return

        daily: dict[str, dict] = {}
        for s in sales:
            d = datetime.fromisoformat(s["ts"]).strftime("%m/%d")
            if d not in daily:
                daily[d] = {"rev": 0, "profit": 0}
            daily[d]["rev"]    += s["total"]
            daily[d]["profit"] += s["profit"]

        keys = list(daily.keys())[-10:]
        x    = range(len(keys))
        w    = 0.35

        ax.bar([i - w/2 for i in x], [daily[k]["rev"]    for k in keys],
               width=w, color=C["accent"], alpha=0.85, label="الإيرادات")
        ax.bar([i + w/2 for i in x], [daily[k]["profit"] for k in keys],
               width=w, color=C["amber"], alpha=0.85, label="الأرباح")

        ax.set_xticks(list(x))
        ax.set_xticklabels(keys, fontsize=8, color=C["ink_3"])
        ax.yaxis.set_tick_params(labelsize=8, colors=C["ink_3"])
        ax.spines["left"].set_color(C["border"])
        ax.spines["bottom"].set_color(C["border"])
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.grid(axis="y", color=C["border"], linewidth=0.6)
        ax.legend(fontsize=8, frameon=False, loc="upper left")

        self.daily_card._fig.tight_layout(pad=0.4)
        self.daily_card._canvas.draw()

    def _draw_top_products(self, sales):
        if not MATPLOTLIB_OK or not hasattr(self.top_card, "_ax"):
            return
        ax = self.top_card._ax
        ax.cla()
        ax.set_facecolor("none")

        prod_map: dict[str, int] = {}
        for s in sales:
            for it in s.get("items", []):
                prod_map[it["product_name"]] = prod_map.get(it["product_name"], 0) + it["qty"]

        top = sorted(prod_map.items(), key=lambda x: x[1], reverse=True)[:6]
        if not top:
            self._clean_ax(ax)
            ax.text(0.5, 0.5, "لا توجد مبيعات", ha="center", va="center",
                    color=C["ink_3"], fontsize=10, transform=ax.transAxes)
            self.top_card._canvas.draw()
            return

        names  = [n[:12] + "…" if len(n) > 12 else n for n, _ in top]
        values = [v for _, v in top]
        colors = [CHART_COLORS[i % len(CHART_COLORS)] for i in range(len(top))]

        ax.barh(names, values, color=colors, height=0.55)
        ax.xaxis.set_tick_params(labelsize=8, colors=C["ink_3"])
        ax.yaxis.set_tick_params(labelsize=8, colors=C["ink_2"])
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.spines["left"].set_color(C["border"])
        ax.spines["bottom"].set_color(C["border"])
        ax.grid(axis="x", color=C["border"], linewidth=0.6)

        self.top_card._fig.tight_layout(pad=0.4)
        self.top_card._canvas.draw()

    def _render_table(self, sales):
        # Group by date
        grouped: dict[str, dict] = {}
        for s in sales:
            d = datetime.fromisoformat(s["ts"]).strftime("%Y/%m/%d")
            if d not in grouped:
                grouped[d] = {"rev": 0, "cost": 0, "profit": 0, "discount": 0, "items": set()}
            grouped[d]["rev"]      += s["total"]
            grouped[d]["cost"]     += sum(it["cost"] * it["qty"] for it in s.get("items", []))
            grouped[d]["profit"]   += s["profit"]
            grouped[d]["discount"] += s.get("discount", 0)
            for it in s.get("items", []):
                grouped[d]["items"].add(it["product_name"])

        self.table.setRowCount(0)
        for date, g in sorted(grouped.items(), reverse=True):
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setRowHeight(row, 44)
            self._tbl_item(row, 0, date)
            items_str = "، ".join(list(g["items"])[:3])
            if len(g["items"]) > 3:
                items_str += "..."
            self._tbl_item(row, 1, items_str, align_left=True, small=True)
            self._tbl_item(row, 2, _fmt(g["cost"]))
            self._tbl_item(row, 3, _fmt(g["rev"]))
            self._tbl_item(row, 4, _fmt(g["discount"]) if g["discount"] > 0 else "—")
            p_color = C["accent_dark"] if g["profit"] >= 0 else C["red"]
            self._tbl_item(row, 5, _fmt(g["profit"]), color=p_color, bold=True)

    def _tbl_item(self, row, col, text, color=None, bold=False, small=False, align_left=False):
        item = QTableWidgetItem(text)
        align = Qt.AlignmentFlag.AlignVCenter
        align |= Qt.AlignmentFlag.AlignRight if not align_left else Qt.AlignmentFlag.AlignLeft
        item.setTextAlignment(align)
        if color:
            item.setForeground(QColor(color))
        f = item.font()
        if bold:
            f.setBold(True)
        if small:
            f.setPointSize(10)
        item.setFont(f)
        self.table.setItem(row, col, item)
