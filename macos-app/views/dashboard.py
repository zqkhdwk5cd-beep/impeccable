from __future__ import annotations
"""
Dashboard view — KPI cards + weekly bar chart + category pie + low-stock list.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QFrame, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt
from config import C, CHART_COLORS
import db as DB
from datetime import datetime, timedelta

try:
    from matplotlib.backends.backend_qtagg import FigureCanvasQTAgg as FigureCanvas
    from matplotlib.figure import Figure
    import matplotlib
    matplotlib.rcParams.update({
        "font.family":  ["Arial Unicode MS", "Arial", "DejaVu Sans"],
        "axes.spines.top":   False,
        "axes.spines.right": False,
    })
    MATPLOTLIB_OK = True
except ImportError:
    MATPLOTLIB_OK = False


def _fmt(n: float) -> str:
    return f"{round(n):,} ج.م"


# ── KPI Card ─────────────────────────────────────────────────────────────────

class KPICard(QFrame):
    def __init__(self, label: str, value_color: str = None):
        super().__init__()
        if value_color is None:
            value_color = C["ink"]
        self.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:10px;"
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(20, 18, 20, 18)
        layout.setSpacing(4)

        self.label_l = QLabel(label)
        self.label_l.setStyleSheet(f"font-size:11px; font-weight:700; color:{C['ink_3']}; background:transparent;")

        self.value_l = QLabel("0")
        self.value_l.setStyleSheet(f"font-size:22px; font-weight:800; color:{value_color}; background:transparent;")

        self.sub_l = QLabel("")
        self.sub_l.setStyleSheet(f"font-size:11px; color:{C['ink_3']}; background:transparent;")

        layout.addWidget(self.label_l)
        layout.addWidget(self.value_l)
        layout.addWidget(self.sub_l)

    def update(self, value: str, sub: str = ""):
        self.value_l.setText(value)
        self.sub_l.setText(sub)


# ── Chart widget ─────────────────────────────────────────────────────────────

class ChartCard(QFrame):
    def __init__(self, title: str, height: int = 200):
        super().__init__()
        self.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:12px;"
        )
        layout = QVBoxLayout(self)
        layout.setContentsMargins(16, 14, 16, 14)
        layout.setSpacing(8)

        title_l = QLabel(title)
        title_l.setStyleSheet(f"font-size:13px; font-weight:700; color:{C['ink']}; background:transparent;")
        layout.addWidget(title_l)

        if MATPLOTLIB_OK:
            self.figure = Figure(figsize=(5, height / 96), dpi=96)
            self.figure.patch.set_facecolor("none")
            self.canvas = FigureCanvas(self.figure)
            self.canvas.setStyleSheet("background: transparent;")
            self.ax = self.figure.add_subplot(111)
            self.ax.set_facecolor("none")
            layout.addWidget(self.canvas)
        else:
            fallback = QLabel("matplotlib غير متاح")
            fallback.setAlignment(Qt.AlignmentFlag.AlignCenter)
            fallback.setStyleSheet(f"color:{C['ink_3']};")
            layout.addWidget(fallback)
        self.title_widget = title_l
        self.setFixedHeight(height + 50)


# ── Dashboard view ────────────────────────────────────────────────────────────

class DashboardView(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._build()

    def _build(self):
        scroll = QScrollArea(self)
        scroll.setWidgetResizable(True)
        scroll.setFrameShape(QFrame.Shape.NoFrame)
        scroll.setStyleSheet(f"background:{C['content_bg']};")

        outer_layout = QVBoxLayout(self)
        outer_layout.setContentsMargins(0, 0, 0, 0)
        outer_layout.addWidget(scroll)

        container = QWidget()
        container.setStyleSheet(f"background:{C['content_bg']};")
        layout = QVBoxLayout(container)
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(20)
        scroll.setWidget(container)

        # KPI row
        kpi_row = QHBoxLayout()
        kpi_row.setSpacing(14)
        self.kpi_today   = KPICard("إجمالي المبيعات اليوم",  C["accent_dark"])
        self.kpi_month   = KPICard("مبيعات هذا الشهر",        C["ink"])
        self.kpi_profit  = KPICard("صافي الربح هذا الشهر",   C["amber"])
        self.kpi_low     = KPICard("منتجات تحتاج تجديد",      C["red"])
        for card in (self.kpi_today, self.kpi_month, self.kpi_profit, self.kpi_low):
            card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
            kpi_row.addWidget(card)
        layout.addLayout(kpi_row)

        # Charts row
        charts_row = QHBoxLayout()
        charts_row.setSpacing(14)

        # Weekly bar (left)
        self.weekly_chart = ChartCard("مبيعات آخر 7 أيام", 200)
        self.weekly_chart.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        charts_row.addWidget(self.weekly_chart, 3)

        # Right column
        right_col = QVBoxLayout()
        right_col.setSpacing(14)
        self.cat_chart = ChartCard("مبيعات حسب الفئة", 170)
        right_col.addWidget(self.cat_chart)

        # Low stock list
        low_card = QFrame()
        low_card.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:12px;"
        )
        low_card.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Expanding)
        low_layout = QVBoxLayout(low_card)
        low_layout.setContentsMargins(16, 14, 16, 14)
        low_layout.setSpacing(8)
        low_title = QLabel("تنبيهات المخزون المنخفض")
        low_title.setStyleSheet(f"font-size:13px; font-weight:700; color:{C['ink']}; background:transparent;")
        low_layout.addWidget(low_title)
        self.low_stock_inner = QVBoxLayout()
        self.low_stock_inner.setSpacing(4)
        low_layout.addLayout(self.low_stock_inner)
        low_layout.addStretch()
        right_col.addWidget(low_card)

        charts_row.addLayout(right_col, 2)
        layout.addLayout(charts_row)
        layout.addStretch()

    def refresh(self):
        sales    = DB.get_sales()
        products = DB.get_products()
        now      = datetime.now()
        today    = now.date()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        today_sales = [s for s in sales if datetime.fromisoformat(s["ts"]).date() == today]
        month_sales = [s for s in sales if datetime.fromisoformat(s["ts"]) >= month_start]

        today_rev    = sum(s["total"]  for s in today_sales)
        month_rev    = sum(s["total"]  for s in month_sales)
        month_profit = sum(s["profit"] for s in month_sales)
        margin       = (month_profit / month_rev * 100) if month_rev > 0 else 0
        low_count    = sum(1 for p in products if p["qty"] <= p["min_qty"])

        self.kpi_today.update(_fmt(today_rev),    f"{len(today_sales)} معاملة")
        self.kpi_month.update(_fmt(month_rev),    f"{len(month_sales)} معاملة")
        self.kpi_profit.update(_fmt(month_profit), f"هامش الربح: {round(margin)}%")
        self.kpi_low.update(str(low_count),        "أقل من الحد الأدنى")

        self._draw_weekly(sales)
        self._draw_category(sales, products)
        self._draw_low_stock(products)

    @staticmethod
    def _clean_ax(ax):
        """Hide all spines, ticks, and grid — for empty-state charts."""
        ax.set_xticks([])
        ax.set_yticks([])
        for spine in ax.spines.values():
            spine.set_visible(False)

    def _draw_weekly(self, sales):
        if not MATPLOTLIB_OK:
            return
        ax = self.weekly_chart.ax
        ax.cla()
        ax.set_facecolor("none")

        days = [(datetime.now().date() - timedelta(days=i)) for i in range(6, -1, -1)]
        revs = []
        lbls = []
        for d in days:
            day_rev = sum(
                s["total"]
                for s in sales
                if datetime.fromisoformat(s["ts"]).date() == d
            )
            revs.append(day_rev)
            lbls.append(f"{d.day}/{d.month}")

        if all(r == 0 for r in revs):
            self._clean_ax(ax)
            ax.text(0.5, 0.5, "لا توجد مبيعات بعد",
                    ha="center", va="center",
                    color=C["ink_3"], fontsize=11, transform=ax.transAxes)
            self.weekly_chart.figure.tight_layout(pad=0.5)
            self.weekly_chart.canvas.draw()
            return

        ax.bar(range(len(lbls)), revs, color=C["accent"], alpha=0.85, width=0.55)
        ax.set_xticks(range(len(lbls)))
        ax.set_xticklabels(lbls, fontsize=9, color=C["ink_3"])
        ax.yaxis.set_tick_params(labelsize=9, colors=C["ink_3"])
        ax.tick_params(axis="x", bottom=False)
        ax.set_ylim(0, max(revs) * 1.25)
        ax.spines["left"].set_color(C["border"])
        ax.spines["bottom"].set_color(C["border"])
        ax.spines["top"].set_visible(False)
        ax.spines["right"].set_visible(False)
        ax.grid(axis="y", color=C["border"], linewidth=0.7)

        self.weekly_chart.figure.tight_layout(pad=0.5)
        self.weekly_chart.canvas.draw()

    def _draw_category(self, sales, products):
        if not MATPLOTLIB_OK:
            return
        ax = self.cat_chart.ax
        ax.cla()
        ax.set_facecolor("none")

        cat_rev: dict[str, float] = {}
        for s in sales:
            for it in s.get("items", []):
                p = next((p for p in products if p["id"] == it.get("product_id")), None)
                cat = (p["category"] if p else "") or "أخرى"
                cat_rev[cat] = cat_rev.get(cat, 0) + it["price"] * it["qty"]

        if not cat_rev:
            self._clean_ax(ax)
            ax.text(0.5, 0.5, "لا توجد مبيعات بعد",
                    ha="center", va="center",
                    color=C["ink_3"], fontsize=10, transform=ax.transAxes)
            self.cat_chart.canvas.draw()
            return

        labels = list(cat_rev.keys())
        values = list(cat_rev.values())
        colors = [CHART_COLORS[i % len(CHART_COLORS)] for i in range(len(labels))]
        wedges, _ = ax.pie(
            values, labels=None, colors=colors,
            startangle=90, wedgeprops={"linewidth": 2, "edgecolor": "white"}
        )
        ax.legend(
            wedges, [f"{l} ({round(v/sum(values)*100)}%)" for l, v in zip(labels, values)],
            loc="lower center", fontsize=8,
            bbox_to_anchor=(0.5, -0.18), ncol=2,
            frameon=False
        )
        self.cat_chart.figure.tight_layout(pad=0.3)
        self.cat_chart.canvas.draw()

    def _draw_low_stock(self, products):
        # Clear previous items
        while self.low_stock_inner.count():
            item = self.low_stock_inner.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

        low = [p for p in products if p["qty"] <= p["min_qty"]]
        if not low:
            ok = QLabel("✓  جميع المنتجات بكميات كافية")
            ok.setStyleSheet(f"font-size:12px; color:{C['accent_dark']}; background:transparent;")
            self.low_stock_inner.addWidget(ok)
            return

        for p in low[:8]:
            row = QWidget()
            row.setStyleSheet(
                f"background:{C['red_light']}; border-radius:8px;"
            )
            row_l = QHBoxLayout(row)
            row_l.setContentsMargins(10, 7, 10, 7)
            name_l = QLabel(p["name"])
            name_l.setStyleSheet(f"font-size:12px; color:{C['ink']}; background:transparent;")
            qty_l = QLabel(f"{p['qty']} / {p['min_qty']}")
            qty_l.setStyleSheet(f"font-size:11px; color:{C['red']}; font-weight:700; background:transparent;")
            row_l.addWidget(name_l)
            row_l.addStretch()
            row_l.addWidget(qty_l)
            self.low_stock_inner.addWidget(row)
