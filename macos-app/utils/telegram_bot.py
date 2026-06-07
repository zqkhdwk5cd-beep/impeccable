from __future__ import annotations
"""
Non-blocking Telegram notification — runs in a daemon thread.
"""
import threading
import urllib.request
import urllib.parse
import json


def send_sale_notification(token: str, chat_id: str, sale: dict, store_name: str):
    def _fmt(n):
        return f"{round(n):,} ج.م"

    items_text = "\n".join(
        f"  • {it['product_name']} ×{it['qty']} — {_fmt(it['price'] * it['qty'])}"
        for it in sale.get("items", [])
    )
    discount_line = f"\n🏷 خصم: {_fmt(sale['discount'])}" if sale.get("discount", 0) > 0 else ""
    from datetime import datetime
    ts = datetime.fromisoformat(sale["ts"]).strftime("%I:%M %p")

    msg = (
        f"🛍 *بيعة جديدة — {store_name}*\n"
        f"━━━━━━━━━━━━━━\n"
        f"{items_text}\n"
        f"━━━━━━━━━━━━━━"
        f"{discount_line}\n"
        f"💰 *الإجمالي: {_fmt(sale['total'])}*\n"
        f"🕐 {ts}\n"
        f"🧾 فاتورة #{sale['id']}"
    )

    def _send():
        try:
            url  = f"https://api.telegram.org/bot{token}/sendMessage"
            data = json.dumps({
                "chat_id":    chat_id,
                "text":       msg,
                "parse_mode": "Markdown",
            }).encode()
            req = urllib.request.Request(
                url, data=data,
                headers={"Content-Type": "application/json"},
                method="POST"
            )
            urllib.request.urlopen(req, timeout=10)
        except Exception:
            pass

    threading.Thread(target=_send, daemon=True).start()
