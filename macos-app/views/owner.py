"""
Owner settings panel — password-protected admin area.
Store name, receipt footer, max discount, password change, backup, danger zone.
"""
from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel, QPushButton, QLineEdit,
    QFrame, QScrollArea, QSpinBox, QFileDialog, QMessageBox, QSizePolicy
)
from PySide6.QtCore import Qt, Signal
from config import C
import db as DB
import json


class OwnerView(QWidget):
    locked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
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
        layout.setContentsMargins(24, 24, 24, 24)
        layout.setSpacing(16)
        layout.setAlignment(Qt.AlignmentFlag.AlignTop)
        scroll.setWidget(container)

        # Max width wrapper
        inner = QWidget()
        inner.setMaximumWidth(600)
        inner_layout = QVBoxLayout(inner)
        inner_layout.setSpacing(16)
        inner_layout.setContentsMargins(0, 0, 0, 0)
        layout.addWidget(inner)
        layout.setAlignment(inner, Qt.AlignmentFlag.AlignHCenter)

        # ── Store identity card ───────────────────────────────────────────────
        store_card = self._card("🏪  بيانات المتجر")
        store_body = QVBoxLayout()
        store_body.setSpacing(12)

        store_body.addWidget(self._lbl("اسم المتجر"))
        self.store_name_input = QLineEdit()
        self.store_name_input.setPlaceholderText("اسم متجرك")
        self.store_name_input.setFixedHeight(38)
        store_body.addWidget(self.store_name_input)

        store_body.addWidget(self._lbl("رسالة أسفل الفاتورة"))
        self.footer_input = QLineEdit()
        self.footer_input.setPlaceholderText("مثال: شكراً لزيارتكم")
        self.footer_input.setFixedHeight(38)
        store_body.addWidget(self.footer_input)

        store_card.layout().addLayout(store_body)
        inner_layout.addWidget(store_card)

        # ── Discount control card ─────────────────────────────────────────────
        disc_card = self._card("🏷  صلاحيات الخصم")
        disc_body = QVBoxLayout()
        disc_body.setSpacing(10)

        disc_body.addWidget(self._lbl("أقصى نسبة خصم مسموح بها للكاشير (%)"))
        disc_row = QHBoxLayout()
        self.max_disc_spin = QSpinBox()
        self.max_disc_spin.setRange(0, 100)
        self.max_disc_spin.setSuffix(" %")
        self.max_disc_spin.setFixedWidth(120)
        self.max_disc_spin.setFixedHeight(38)
        self.max_disc_spin.valueChanged.connect(self._update_discount_bar)
        hint = QLabel("٠ = لا خصم · ١٠٠ = بلا حد")
        hint.setStyleSheet(f"font-size:11px; color:{C['ink_3']};")
        disc_row.addWidget(self.max_disc_spin)
        disc_row.addWidget(hint)
        disc_row.addStretch()
        disc_body.addLayout(disc_row)

        self.disc_status = QLabel()
        self.disc_status.setFixedHeight(36)
        self.disc_status.setStyleSheet(
            f"border-radius:8px; padding:6px 12px; font-size:12px; font-weight:600;"
        )
        disc_body.addWidget(self.disc_status)

        disc_card.layout().addLayout(disc_body)
        inner_layout.addWidget(disc_card)

        # ── Password card ─────────────────────────────────────────────────────
        pass_card = self._card("🔒  تغيير كلمة المرور")
        pass_body = QHBoxLayout()
        pass_body.setSpacing(12)

        new_col = QVBoxLayout()
        new_col.addWidget(self._lbl("كلمة المرور الجديدة"))
        self.new_pass = QLineEdit()
        self.new_pass.setEchoMode(QLineEdit.EchoMode.Password)
        self.new_pass.setPlaceholderText("••••••")
        self.new_pass.setFixedHeight(38)
        new_col.addWidget(self.new_pass)

        conf_col = QVBoxLayout()
        conf_col.addWidget(self._lbl("تأكيد كلمة المرور"))
        self.confirm_pass = QLineEdit()
        self.confirm_pass.setEchoMode(QLineEdit.EchoMode.Password)
        self.confirm_pass.setPlaceholderText("••••••")
        self.confirm_pass.setFixedHeight(38)
        conf_col.addWidget(self.confirm_pass)

        pass_body.addLayout(new_col)
        pass_body.addLayout(conf_col)
        pass_card.layout().addLayout(pass_body)
        inner_layout.addWidget(pass_card)

        # ── Backup card ───────────────────────────────────────────────────────
        bk_card = self._card("💾  نسخ احتياطي")
        bk_body = QVBoxLayout()
        bk_body.setSpacing(10)

        bk_info = QLabel("احفظ نسخة من بياناتك واستعدلها لو احتجت.")
        bk_info.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")
        bk_body.addWidget(bk_info)

        bk_row = QHBoxLayout()
        export_btn = QPushButton("⬇  تصدير البيانات")
        export_btn.setFixedHeight(36)
        export_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        export_btn.clicked.connect(self._export)

        import_btn = QPushButton("⬆  استيراد بيانات")
        import_btn.setFixedHeight(36)
        import_btn.setStyleSheet(
            f"background:{C['content_bg']}; color:{C['ink_2']}; border:1px solid {C['border']}; "
            f"border-radius:8px; font-weight:700;"
        )
        import_btn.clicked.connect(self._import)

        bk_row.addWidget(export_btn)
        bk_row.addWidget(import_btn)
        bk_row.addStretch()
        bk_body.addLayout(bk_row)
        bk_card.layout().addLayout(bk_body)
        inner_layout.addWidget(bk_card)

        # ── Danger zone ───────────────────────────────────────────────────────
        dz_card = QFrame()
        dz_card.setStyleSheet(
            f"background:{C['card_bg']}; border:1.5px solid {C['red']}44; border-radius:12px;"
        )
        dz_layout = QVBoxLayout(dz_card)
        dz_layout.setContentsMargins(18, 16, 18, 16)
        dz_layout.setSpacing(10)

        dz_title = QLabel("⚠  منطقة الخطر")
        dz_title.setStyleSheet(f"font-size:14px; font-weight:700; color:{C['red']};")
        dz_warn = QLabel("هذه الإجراءات لا يمكن التراجع عنها.")
        dz_warn.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")

        dz_row = QHBoxLayout()
        reset_sales_btn = QPushButton("مسح جميع المبيعات")
        reset_sales_btn.setFixedHeight(36)
        reset_sales_btn.setStyleSheet(
            f"background:{C['red']}; color:white; border:none; border-radius:8px; font-weight:700;"
        )
        reset_sales_btn.clicked.connect(self._reset_sales)

        reset_all_btn = QPushButton("مسح كل البيانات")
        reset_all_btn.setFixedHeight(36)
        reset_all_btn.setStyleSheet(
            f"background:{C['red']}; color:white; border:none; border-radius:8px; font-weight:700;"
        )
        reset_all_btn.clicked.connect(self._reset_all)

        dz_row.addWidget(reset_sales_btn)
        dz_row.addWidget(reset_all_btn)
        dz_row.addStretch()

        dz_layout.addWidget(dz_title)
        dz_layout.addWidget(dz_warn)
        dz_layout.addLayout(dz_row)
        inner_layout.addWidget(dz_card)

        # ── Action footer ─────────────────────────────────────────────────────
        footer_row = QHBoxLayout()
        lock_btn = QPushButton("🔒  قفل وخروج")
        lock_btn.setFixedHeight(38)
        lock_btn.clicked.connect(self._lock)

        save_btn = QPushButton("حفظ الإعدادات")
        save_btn.setFixedHeight(38)
        save_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        save_btn.clicked.connect(self._save)

        footer_row.addWidget(lock_btn)
        footer_row.addStretch()
        footer_row.addWidget(save_btn)
        inner_layout.addLayout(footer_row)

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _card(title: str) -> QFrame:
        card = QFrame()
        card.setStyleSheet(
            f"background:{C['card_bg']}; border:1px solid {C['border']}; border-radius:12px;"
        )
        layout = QVBoxLayout(card)
        layout.setContentsMargins(18, 14, 18, 16)
        layout.setSpacing(12)
        t = QLabel(title)
        t.setStyleSheet(f"font-size:13px; font-weight:700; color:{C['ink']}; background:transparent;")
        layout.addWidget(t)
        return card

    @staticmethod
    def _lbl(text: str) -> QLabel:
        l = QLabel(text)
        l.setStyleSheet(f"font-size:11px; font-weight:700; color:{C['ink_3']}; background:transparent;")
        return l

    def _update_discount_bar(self, val: int):
        if val == 0:
            self.disc_status.setStyleSheet(
                f"background:{C['red_light']}; color:{C['red']}; border-radius:8px; "
                f"padding:6px 12px; font-size:12px; font-weight:600;"
            )
            self.disc_status.setText("🚫  الكاشير مش هيقدر يضيف أي خصم")
        elif val == 100:
            self.disc_status.setStyleSheet(
                f"background:{C['amber_light']}; color:{C['amber']}; border-radius:8px; "
                f"padding:6px 12px; font-size:12px; font-weight:600;"
            )
            self.disc_status.setText("⚠  الكاشير يقدر يضيف خصم بدون حد")
        else:
            self.disc_status.setStyleSheet(
                f"background:{C['accent_light']}; color:{C['accent_dark']}; border-radius:8px; "
                f"padding:6px 12px; font-size:12px; font-weight:600;"
            )
            self.disc_status.setText(f"✓  الكاشير يقدر يضيف خصم لحد {val}% بس")

    # ── Load / Save ───────────────────────────────────────────────────────────

    def load_settings(self):
        s = DB.get_all_settings()
        self.store_name_input.setText(s.get("store_name", "متجري"))
        self.footer_input.setText(s.get("receipt_footer", ""))
        disc = int(s.get("max_discount", "100"))
        self.max_disc_spin.setValue(disc)
        self._update_discount_bar(disc)
        self.new_pass.clear()
        self.confirm_pass.clear()

    def _save(self):
        new_pass = self.new_pass.text()
        conf     = self.confirm_pass.text()
        if new_pass:
            if new_pass != conf:
                self._msg("خطأ", "كلمة المرور غير متطابقة", error=True)
                return
            if len(new_pass) < 4:
                self._msg("خطأ", "كلمة المرور يجب أن تكون 4 أحرف على الأقل", error=True)
                return
            DB.set_setting("password", new_pass)

        store_name = self.store_name_input.text().strip()
        if not store_name:
            self._msg("خطأ", "يرجى إدخال اسم المتجر", error=True)
            return

        DB.set_setting("store_name",      store_name)
        DB.set_setting("receipt_footer",  self.footer_input.text().strip())
        DB.set_setting("max_discount",    str(self.max_disc_spin.value()))
        self._msg("تم", "تم حفظ الإعدادات بنجاح")

    def _lock(self):
        self.locked.emit()

    # ── Backup ────────────────────────────────────────────────────────────────

    def _export(self):
        path, _ = QFileDialog.getSaveFileName(
            self, "حفظ نسخة احتياطية", "backup.json", "JSON (*.json)"
        )
        if not path:
            return
        try:
            data = DB.export_json()
            with open(path, "w", encoding="utf-8") as f:
                f.write(data)
            self._msg("تم", f"تم تصدير البيانات إلى:\n{path}")
        except Exception as e:
            self._msg("خطأ", str(e), error=True)

    def _import(self):
        path, _ = QFileDialog.getOpenFileName(
            self, "استيراد بيانات", "", "JSON (*.json)"
        )
        if not path:
            return
        reply = QMessageBox.question(
            self, "تأكيد",
            "هل تريد استيراد البيانات؟ سيتم استبدال البيانات الحالية.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply != QMessageBox.StandardButton.Yes:
            return
        try:
            with open(path, "r", encoding="utf-8") as f:
                data = f.read()
            DB.import_json(data)
            self._msg("تم", "تم استيراد البيانات بنجاح. سيُحدَّث التطبيق.")
        except Exception as e:
            self._msg("خطأ", f"فشل الاستيراد:\n{e}", error=True)

    # ── Danger ────────────────────────────────────────────────────────────────

    def _reset_sales(self):
        reply = QMessageBox.question(
            self, "تأكيد",
            "هل أنت متأكد من مسح جميع المبيعات؟ لا يمكن التراجع.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            DB.delete_all_sales()
            self._msg("تم", "تم مسح جميع المبيعات")

    def _reset_all(self):
        reply = QMessageBox.question(
            self, "تأكيد",
            "هل أنت متأكد من مسح كل البيانات؟ (المنتجات + المبيعات)\nلا يمكن التراجع.",
            QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No
        )
        if reply == QMessageBox.StandardButton.Yes:
            DB.delete_all_data()
            self._msg("تم", "تم مسح كل البيانات")

    @staticmethod
    def _msg(title: str, text: str, error: bool = False):
        msg = QMessageBox()
        msg.setWindowTitle(title)
        msg.setText(text)
        if error:
            msg.setIcon(QMessageBox.Icon.Warning)
        else:
            msg.setIcon(QMessageBox.Icon.Information)
        msg.exec()
