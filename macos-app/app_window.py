from __future__ import annotations
"""
Main application window.
Sidebar navigation (RTL — appears on the right) + stacked content area.
Handles all inter-view signals (receipt, Telegram, toast notifications).
"""
import sys
from PySide6.QtWidgets import (
    QMainWindow, QWidget, QHBoxLayout, QVBoxLayout,
    QLabel, QPushButton, QFrame, QStackedWidget,
    QApplication, QSizePolicy, QGraphicsOpacityEffect
)
from PySide6.QtCore import Qt, QTimer, QPropertyAnimation, QEasingCurve, Signal, QSize
from PySide6.QtGui import QFont, QKeySequence, QShortcut

import db as DB
from config import C, build_qss

from views.dashboard  import DashboardView
from views.pos        import POSView
from views.products   import ProductsView
from views.inventory  import InventoryView
from views.reports    import ReportsView
from views.history    import HistoryView
from views.owner      import OwnerView

from dialogs.auth_dialog    import AuthDialog
from dialogs.product_dialog import ProductDialog
from dialogs.restock_dialog import RestockDialog
from dialogs.receipt_dialog import ReceiptDialog

from utils.telegram_bot import send_sale_notification


# ── Toast notification overlay ────────────────────────────────────────────────

class Toast(QFrame):
    def __init__(self, message: str, kind: str = "success", parent=None):
        super().__init__(parent)
        self.setFixedHeight(44)
        self.setMinimumWidth(260)
        self.setStyleSheet(
            f"background:{C['sidebar_bg']}; border-radius:10px;"
        )
        layout = QHBoxLayout(self)
        layout.setContentsMargins(16, 0, 16, 0)
        layout.setSpacing(8)

        icon_color = {
            "success": C["accent"],
            "error":   C["red"],
            "warning": C["amber"],
            "info":    C["blue"],
        }.get(kind, C["accent"])
        icon_char = {"success": "✓", "error": "✕", "warning": "⚠", "info": "i"}.get(kind, "✓")

        icon_lbl = QLabel(icon_char)
        icon_lbl.setStyleSheet(
            f"color:{icon_color}; font-size:14px; font-weight:800; background:transparent;"
        )
        lbl = QLabel(message)
        lbl.setStyleSheet(
            f"color:#F0F4F8; font-size:13px; font-weight:600; background:transparent;"
        )
        layout.addWidget(icon_lbl)
        layout.addWidget(lbl)

        self._effect = QGraphicsOpacityEffect(self)
        self.setGraphicsEffect(self._effect)
        self._effect.setOpacity(1.0)

    def fade_out(self, on_done):
        anim = QPropertyAnimation(self._effect, b"opacity", self)
        anim.setDuration(400)
        anim.setStartValue(1.0)
        anim.setEndValue(0.0)
        anim.setEasingCurve(QEasingCurve.Type.OutCubic)
        anim.finished.connect(on_done)
        anim.start(QPropertyAnimation.DeletionPolicy.DeleteWhenStopped)
        self._anim = anim


class ToastManager(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_TransparentForMouseEvents)
        layout = QVBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 20)
        layout.setSpacing(8)
        layout.setAlignment(Qt.AlignmentFlag.AlignBottom | Qt.AlignmentFlag.AlignHCenter)

    def show_toast(self, message: str, kind: str = "success"):
        toast = Toast(message, kind, self)
        self.layout().addWidget(toast)
        self.adjustSize()

        def _remove():
            toast.hide()
            self.layout().removeWidget(toast)
            toast.deleteLater()

        QTimer.singleShot(2800, lambda: toast.fade_out(_remove))


# ── Sidebar nav button ────────────────────────────────────────────────────────

class NavButton(QPushButton):
    def __init__(self, icon: str, label: str, view_id: str):
        super().__init__()
        self.view_id = view_id
        self.setFixedHeight(44)
        self.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        self.setProperty("class", "nav_item")
        self.setText(f"  {icon}  {label}")
        self.setCheckable(False)
        self._set_active(False)

    def _set_active(self, active: bool):
        self.setProperty("active", "true" if active else "false")
        self.style().unpolish(self)
        self.style().polish(self)

    def set_active(self, active: bool):
        self._set_active(active)


# ── Main window ───────────────────────────────────────────────────────────────

VIEWS = [
    ("dashboard",  "📊", "لوحة التحكم"),
    ("pos",        "🛒", "نقطة البيع"),
    ("products",   "📦", "المنتجات"),
    ("inventory",  "🗄",  "المخزون"),
    ("reports",    "📈", "التقارير"),
    ("history",    "🧾", "سجل المبيعات"),
]


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self._owner_unlocked = False
        self._current_view   = "dashboard"
        self._nav_buttons: dict[str, NavButton] = {}

        self.setWindowTitle("نظام المبيعات والمخزون")
        self.setMinimumSize(1100, 680)
        self.resize(1260, 740)
        self.setStyleSheet(build_qss())
        self.setLayoutDirection(Qt.LayoutDirection.RightToLeft)

        self._build_ui()
        self._setup_shortcuts()
        self._navigate("dashboard")

    # ── Build UI ──────────────────────────────────────────────────────────────

    def _build_ui(self):
        root = QWidget()
        root.setObjectName("content_bg")
        root_layout = QHBoxLayout(root)
        root_layout.setContentsMargins(0, 0, 0, 0)
        root_layout.setSpacing(0)
        self.setCentralWidget(root)

        # ── Sidebar ───────────────────────────────────────────────────────────
        sidebar = QWidget()
        sidebar.setObjectName("sidebar")
        sidebar.setFixedWidth(230)
        sidebar_layout = QVBoxLayout(sidebar)
        sidebar_layout.setContentsMargins(0, 0, 0, 0)
        sidebar_layout.setSpacing(0)

        # Logo / store name
        logo_area = QWidget()
        logo_area.setFixedHeight(72)
        logo_area.setStyleSheet(
            f"background:{C['sidebar_bg']}; border-bottom:1px solid {C['sidebar_border']};"
        )
        logo_layout = QVBoxLayout(logo_area)
        logo_layout.setContentsMargins(18, 0, 18, 0)
        self.store_name_lbl = QLabel(DB.get_setting("store_name", "متجري"))
        self.store_name_lbl.setObjectName("sidebar_logo_label")
        self.store_name_lbl.setStyleSheet(
            f"color:{C['sidebar_text_on']}; font-size:16px; font-weight:800;"
        )
        self.store_name_lbl.setAlignment(Qt.AlignmentFlag.AlignVCenter)
        logo_layout.addWidget(self.store_name_lbl)
        sidebar_layout.addWidget(logo_area)

        # Nav items
        nav_area = QWidget()
        nav_area.setStyleSheet(f"background:{C['sidebar_bg']};")
        nav_layout = QVBoxLayout(nav_area)
        nav_layout.setContentsMargins(0, 10, 0, 10)
        nav_layout.setSpacing(0)

        for view_id, icon, label in VIEWS:
            btn = NavButton(icon, label, view_id)
            btn.clicked.connect(lambda _, v=view_id: self._navigate(v))
            nav_layout.addWidget(btn)
            self._nav_buttons[view_id] = btn

        nav_layout.addStretch()

        # Owner button (bottom)
        sep = QFrame()
        sep.setFixedHeight(1)
        sep.setStyleSheet(f"background:{C['sidebar_border']};")
        nav_layout.addWidget(sep)

        owner_btn = QPushButton("  ⚙  إعدادات المالك")
        owner_btn.setFixedHeight(44)
        owner_btn.setSizePolicy(QSizePolicy.Policy.Expanding, QSizePolicy.Policy.Fixed)
        owner_btn.setProperty("class", "nav_item")
        owner_btn.setStyleSheet(
            f"QPushButton {{ background:transparent; color:{C['sidebar_text']}; "
            f"font-size:13px; font-weight:500; text-align:right; "
            f"padding:9px 16px; border-radius:10px; border:none; margin:1px 6px; }}"
            f"QPushButton:hover {{ background:{C['sidebar_hover']}; color:{C['sidebar_text_on']}; }}"
        )
        owner_btn.clicked.connect(self._open_owner)
        nav_layout.addWidget(owner_btn)

        sidebar_layout.addWidget(nav_area, 1)

        # Date footer
        from datetime import datetime
        date_lbl = QLabel(
            datetime.now().strftime("%A\n%d / %m / %Y")
        )
        date_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        date_lbl.setStyleSheet(
            f"color:{C['sidebar_text']}; font-size:10px; padding:10px 0;"
        )
        date_lbl.setFixedHeight(50)
        sidebar_layout.addWidget(date_lbl)

        # ── Main area ─────────────────────────────────────────────────────────
        main_area = QWidget()
        main_area.setStyleSheet(f"background:{C['content_bg']};")
        main_layout = QVBoxLayout(main_area)
        main_layout.setContentsMargins(0, 0, 0, 0)
        main_layout.setSpacing(0)

        # Topbar
        topbar = QWidget()
        topbar.setObjectName("topbar")
        topbar.setFixedHeight(56)
        topbar_layout = QHBoxLayout(topbar)
        topbar_layout.setContentsMargins(24, 0, 24, 0)
        topbar_layout.setSpacing(12)

        self.topbar_title = QLabel("لوحة التحكم")
        self.topbar_title.setObjectName("topbar_title")

        self.topbar_actions = QWidget()
        self.topbar_actions_layout = QHBoxLayout(self.topbar_actions)
        self.topbar_actions_layout.setContentsMargins(0, 0, 0, 0)
        self.topbar_actions_layout.setSpacing(8)

        topbar_layout.addWidget(self.topbar_title)
        topbar_layout.addStretch()
        topbar_layout.addWidget(self.topbar_actions)
        main_layout.addWidget(topbar)

        # Stacked views
        self.stack = QStackedWidget()
        self.stack.setStyleSheet(f"background:{C['content_bg']};")

        self.view_dashboard = DashboardView()
        self.view_pos       = POSView()
        self.view_products  = ProductsView()
        self.view_inventory = InventoryView()
        self.view_reports   = ReportsView()
        self.view_history   = HistoryView()
        self.view_owner     = OwnerView()

        for v in (self.view_dashboard, self.view_pos, self.view_products,
                  self.view_inventory, self.view_reports, self.view_history,
                  self.view_owner):
            self.stack.addWidget(v)

        main_layout.addWidget(self.stack, 1)

        # ── Wire signals ──────────────────────────────────────────────────────
        self.view_pos.sale_completed.connect(self._on_sale_completed)
        self.view_products.request_add.connect(self._on_add_product)
        self.view_products.request_edit.connect(self._on_edit_product)
        self.view_products.request_delete.connect(self._on_delete_product)
        self.view_inventory.request_restock.connect(self._on_restock)
        self.view_history.view_receipt.connect(self._show_receipt_by_id)
        self.view_owner.locked.connect(self._lock_owner)

        # ── Toast manager ─────────────────────────────────────────────────────
        self.toast_mgr = ToastManager(self)

        # ── Layout assembly ───────────────────────────────────────────────────
        # RTL: sidebar appears on the right, main content on the left
        # In RTL the first widget added goes to the RIGHT — sidebar belongs on the right
        root_layout.addWidget(sidebar)
        root_layout.addWidget(main_area, 1)

    # ── Navigation ────────────────────────────────────────────────────────────

    def _navigate(self, view_id: str):
        self._current_view = view_id
        titles = {
            "dashboard": "لوحة التحكم",
            "pos":       "نقطة البيع",
            "products":  "إدارة المنتجات",
            "inventory": "المخزون",
            "reports":   "التقارير",
            "history":   "سجل المبيعات",
            "owner":     "إعدادات المالك",
        }
        self.topbar_title.setText(titles.get(view_id, ""))

        for vid, btn in self._nav_buttons.items():
            btn.set_active(vid == view_id)

        # Topbar action button
        self._clear_topbar_actions()
        if view_id == "products":
            add_btn = QPushButton("+ إضافة منتج")
            add_btn.setFixedHeight(34)
            add_btn.setStyleSheet(
                f"background:{C['accent']}; color:white; border-radius:8px; "
                f"font-weight:700; font-size:12px;"
            )
            add_btn.clicked.connect(self._on_add_product)
            self.topbar_actions_layout.addWidget(add_btn)

        view_map = {
            "dashboard": (self.view_dashboard, 0),
            "pos":       (self.view_pos,       1),
            "products":  (self.view_products,  2),
            "inventory": (self.view_inventory, 3),
            "reports":   (self.view_reports,   4),
            "history":   (self.view_history,   5),
            "owner":     (self.view_owner,     6),
        }
        view, idx = view_map[view_id]
        self.stack.setCurrentIndex(idx)

        # Refresh on navigate
        if view_id == "dashboard":
            self.view_dashboard.refresh()
        elif view_id == "pos":
            self.view_pos.refresh()
        elif view_id == "products":
            self.view_products.refresh()
        elif view_id == "inventory":
            self.view_inventory.refresh()
        elif view_id == "reports":
            self.view_reports.refresh()
        elif view_id == "history":
            self.view_history.refresh()

    def _clear_topbar_actions(self):
        while self.topbar_actions_layout.count():
            item = self.topbar_actions_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()

    # ── Keyboard shortcuts ────────────────────────────────────────────────────

    def _setup_shortcuts(self):
        view_ids = ["dashboard", "pos", "products", "inventory", "reports", "history"]
        for i, vid in enumerate(view_ids, 1):
            sc = QShortcut(QKeySequence(f"Alt+{i}"), self)
            sc.activated.connect(lambda v=vid: self._navigate(v))

        # N — add product (when on products view)
        sc_n = QShortcut(QKeySequence("N"), self)
        sc_n.activated.connect(self._shortcut_n)

    def _shortcut_n(self):
        if self._current_view == "products":
            self._on_add_product()

    # ── Sale completed ────────────────────────────────────────────────────────

    def _on_sale_completed(self, sale: dict):
        # Show receipt
        settings = DB.get_all_settings()
        dlg = ReceiptDialog(sale, settings, self)
        dlg.exec()
        self.toast("تمت عملية البيع بنجاح ✓", "success")

        # Telegram notification
        token   = settings.get("telegram_token", "")
        chat_id = settings.get("telegram_chat_id", "")
        store   = settings.get("store_name", "متجري")
        if token and chat_id:
            send_sale_notification(token, chat_id, sale, store)

        # Refresh dashboard KPIs silently
        if self._current_view == "dashboard":
            self.view_dashboard.refresh()

    # ── Products CRUD ─────────────────────────────────────────────────────────

    def _on_add_product(self):
        cats = DB.get_categories()
        dlg  = ProductDialog(categories=cats, parent=self)
        if dlg.exec() != ProductDialog.DialogCode.Accepted:
            return
        d = dlg.get_data()
        DB.add_product(
            d["name"], d["category"], d["unit"],
            d["cost"], d["price"], d["qty"], d["min_qty"],
            d["image"]
        )
        self.view_products.refresh()
        self.toast(f"تمت إضافة {d['name']}", "success")

    def _on_edit_product(self, product: dict):
        cats = DB.get_categories()
        dlg  = ProductDialog(categories=cats, product=product, parent=self)
        if dlg.exec() != ProductDialog.DialogCode.Accepted:
            return
        d   = dlg.get_data()
        img = d["image"]
        if d.get("clear_image"):
            img = None
        elif img is None:
            img = product.get("image")   # keep existing
        DB.update_product(
            product["id"], d["name"], d["category"], d["unit"],
            d["cost"], d["price"], d["qty"], d["min_qty"],
            img
        )
        self.view_products.refresh()
        self.toast(f"تم تحديث {d['name']}", "success")

    def _on_delete_product(self, product: dict):
        from PySide6.QtWidgets import QMessageBox
        reply = QMessageBox.question(
            self, "تأكيد الحذف",
            f"هل تريد حذف المنتج «{product['name']}»؟",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            DB.delete_product(product["id"])
            self.view_products.refresh()
            self.toast(f"تم حذف {product['name']}", "warning")

    # ── Inventory restock ─────────────────────────────────────────────────────

    def _on_restock(self, product: dict):
        dlg = RestockDialog(product, parent=self)
        if dlg.exec() != RestockDialog.DialogCode.Accepted:
            return
        qty = dlg.get_qty()
        DB.restock_product(product["id"], qty)
        self.view_inventory.refresh()
        unit = product.get("unit") or "قطعة"
        self.toast(f"تمت إضافة {qty} {unit} إلى {product['name']}", "success")

    # ── Receipt (from history double-click) ───────────────────────────────────

    def _show_receipt_by_id(self, sale_id: int):
        sale = DB.get_sale(sale_id)
        if not sale:
            return
        settings = DB.get_all_settings()
        dlg = ReceiptDialog(sale, settings, self)
        dlg.exec()

    # ── Owner panel ───────────────────────────────────────────────────────────

    def _open_owner(self):
        if self._owner_unlocked:
            self._enter_owner_panel()
            return

        stored_pass = DB.get_setting("password", "1234")
        dlg = AuthDialog(self)

        # Keep prompting until correct or user cancels
        while True:
            result = dlg.exec()
            if result != AuthDialog.DialogCode.Accepted:
                return
            if dlg.get_password() == stored_pass:
                self._owner_unlocked = True
                self._enter_owner_panel()
                return
            dlg.show_error()

    def _enter_owner_panel(self):
        self.view_owner.load_settings()
        self._navigate("owner")
        # Update store name in sidebar after possible settings change
        self.store_name_lbl.setText(DB.get_setting("store_name", "متجري"))

    def _lock_owner(self):
        self._owner_unlocked = False
        self._navigate("dashboard")
        self.toast("تم قفل لوحة المالك", "info")

    # ── Toast ─────────────────────────────────────────────────────────────────

    def toast(self, message: str, kind: str = "success"):
        self.toast_mgr.show_toast(message, kind)

    # ── Resize — keep toast manager full-size ─────────────────────────────────

    def resizeEvent(self, event):
        super().resizeEvent(event)
        self.toast_mgr.setGeometry(0, 0, self.width(), self.height())
