from __future__ import annotations
"""
Owner authentication dialog — password prompt before entering owner panel.
"""
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit, QPushButton, QFrame
)
from PySide6.QtCore import Qt
from config import C


class AuthDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("إعدادات المالك")
        self.setFixedWidth(340)
        self.setModal(True)
        self._build()

    def _build(self):
        layout = QVBoxLayout(self)
        layout.setSpacing(16)
        layout.setContentsMargins(28, 28, 28, 24)

        icon = QLabel("🔐")
        icon.setAlignment(Qt.AlignmentFlag.AlignCenter)
        icon.setStyleSheet("font-size: 40px;")
        layout.addWidget(icon)

        title = QLabel("إعدادات المالك")
        title.setAlignment(Qt.AlignmentFlag.AlignCenter)
        title.setStyleSheet(f"font-size:17px; font-weight:700; color:{C['ink']};")
        layout.addWidget(title)

        sub = QLabel("أدخل كلمة المرور للمتابعة")
        sub.setAlignment(Qt.AlignmentFlag.AlignCenter)
        sub.setStyleSheet(f"font-size:12px; color:{C['ink_3']};")
        layout.addWidget(sub)

        self.password_input = QLineEdit()
        self.password_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.password_input.setPlaceholderText("••••••")
        self.password_input.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.password_input.setStyleSheet(
            f"font-size:16px; letter-spacing:4px; padding:10px;"
            f"background:{C['card_bg']}; border:1.5px solid {C['border']}; border-radius:10px;"
        )
        self.password_input.returnPressed.connect(self.accept)
        layout.addWidget(self.password_input)

        self.error_label = QLabel("كلمة المرور غير صحيحة")
        self.error_label.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.error_label.setStyleSheet(f"color:{C['red']}; font-size:12px;")
        self.error_label.hide()
        layout.addWidget(self.error_label)

        row = QHBoxLayout()
        cancel_btn = QPushButton("إلغاء")
        cancel_btn.setFixedHeight(38)
        cancel_btn.clicked.connect(self.reject)

        confirm_btn = QPushButton("دخول")
        confirm_btn.setFixedHeight(38)
        confirm_btn.setProperty("class", "primary")
        confirm_btn.setStyleSheet(
            f"background:{C['accent']}; color:white; border-radius:8px; font-weight:700;"
        )
        confirm_btn.clicked.connect(self.accept)

        row.addWidget(cancel_btn)
        row.addWidget(confirm_btn)
        layout.addLayout(row)

    def get_password(self) -> str:
        return self.password_input.text()

    def show_error(self):
        self.error_label.show()
        self.password_input.clear()
        self.password_input.setFocus()
