"""
SQLite database layer — all reads/writes go through here.
Database lives in ~/Library/Application Support/SalesPOS/ on macOS.
"""
import sqlite3
import os
import json
from datetime import datetime
from typing import Optional

DB_DIR  = os.path.expanduser("~/Library/Application Support/SalesPOS")
DB_PATH = os.path.join(DB_DIR, "sales_pos.db")


def _connect() -> sqlite3.Connection:
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = _connect()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS products (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            name       TEXT    NOT NULL,
            category   TEXT    DEFAULT '',
            unit       TEXT    DEFAULT '',
            cost       REAL    NOT NULL DEFAULT 0,
            price      REAL    NOT NULL DEFAULT 0,
            qty        INTEGER DEFAULT 0,
            min_qty    INTEGER DEFAULT 5,
            image      BLOB
        );

        CREATE TABLE IF NOT EXISTS sales (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ts         TEXT    NOT NULL,
            subtotal   REAL    DEFAULT 0,
            discount   REAL    DEFAULT 0,
            total      REAL    DEFAULT 0,
            profit     REAL    DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id      INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id   INTEGER,
            product_name TEXT    NOT NULL,
            qty          INTEGER NOT NULL,
            cost         REAL    NOT NULL,
            price        REAL    NOT NULL
        );

        CREATE TABLE IF NOT EXISTS settings (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    """)
    defaults = {
        "password":        "1234",
        "store_name":      "متجري",
        "receipt_footer":  "شكراً لتسوقكم معنا · يسعدنا خدمتكم دائماً",
        "max_discount":    "100",
        "telegram_token":  "8826205528:AAFmiskAYmxc5-Mlkpk08lJ0gcRR9BuZe4w",
        "telegram_chat_id":"8236942909",
    }
    for k, v in defaults.items():
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (k, v)
        )
    conn.commit()
    conn.close()


# ── Settings ──────────────────────────────────────────────────────────────────

def get_setting(key: str, default: str = "") -> str:
    conn = _connect()
    row  = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    conn = _connect()
    conn.execute(
        "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value)
    )
    conn.commit()
    conn.close()


def get_all_settings() -> dict:
    conn  = _connect()
    rows  = conn.execute("SELECT key, value FROM settings").fetchall()
    conn.close()
    return {r["key"]: r["value"] for r in rows}


def save_all_settings(s: dict):
    conn = _connect()
    for k, v in s.items():
        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (k, str(v))
        )
    conn.commit()
    conn.close()


# ── Products ──────────────────────────────────────────────────────────────────

def get_products() -> list[dict]:
    conn = _connect()
    rows = conn.execute(
        "SELECT id,name,category,unit,cost,price,qty,min_qty,image FROM products ORDER BY id"
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_product(pid: int) -> Optional[dict]:
    conn = _connect()
    row  = conn.execute("SELECT * FROM products WHERE id=?", (pid,)).fetchone()
    conn.close()
    return dict(row) if row else None


def add_product(name, category, unit, cost, price, qty, min_qty, image: Optional[bytes]) -> int:
    conn = _connect()
    cur  = conn.execute(
        "INSERT INTO products (name,category,unit,cost,price,qty,min_qty,image) "
        "VALUES (?,?,?,?,?,?,?,?)",
        (name, category, unit, cost, price, qty, min_qty, image)
    )
    pid = cur.lastrowid
    conn.commit()
    conn.close()
    return pid


def update_product(pid, name, category, unit, cost, price, qty, min_qty, image: Optional[bytes]):
    conn = _connect()
    if image is not None:
        conn.execute(
            "UPDATE products SET name=?,category=?,unit=?,cost=?,price=?,qty=?,min_qty=?,image=? WHERE id=?",
            (name, category, unit, cost, price, qty, min_qty, image, pid)
        )
    else:
        conn.execute(
            "UPDATE products SET name=?,category=?,unit=?,cost=?,price=?,qty=?,min_qty=? WHERE id=?",
            (name, category, unit, cost, price, qty, min_qty, pid)
        )
    conn.commit()
    conn.close()


def delete_product(pid: int):
    conn = _connect()
    conn.execute("DELETE FROM products WHERE id=?", (pid,))
    conn.commit()
    conn.close()


def restock_product(pid: int, added_qty: int):
    conn = _connect()
    conn.execute("UPDATE products SET qty = qty + ? WHERE id=?", (added_qty, pid))
    conn.commit()
    conn.close()


def deduct_stock(pid: int, qty: int):
    conn = _connect()
    conn.execute("UPDATE products SET qty = MAX(0, qty - ?) WHERE id=?", (qty, pid))
    conn.commit()
    conn.close()


def get_categories() -> list[str]:
    conn = _connect()
    rows = conn.execute(
        "SELECT DISTINCT category FROM products WHERE category != '' ORDER BY category"
    ).fetchall()
    conn.close()
    return [r[0] for r in rows]


# ── Sales ─────────────────────────────────────────────────────────────────────

def save_sale(ts, subtotal, discount, total, profit, items: list[dict]) -> int:
    conn = _connect()
    cur  = conn.execute(
        "INSERT INTO sales (ts,subtotal,discount,total,profit) VALUES (?,?,?,?,?)",
        (ts, subtotal, discount, total, profit)
    )
    sid = cur.lastrowid
    for it in items:
        conn.execute(
            "INSERT INTO sale_items (sale_id,product_id,product_name,qty,cost,price) "
            "VALUES (?,?,?,?,?,?)",
            (sid, it["product_id"], it["product_name"], it["qty"], it["cost"], it["price"])
        )
    conn.commit()
    conn.close()
    return sid


def get_sales(from_ts: Optional[str] = None) -> list[dict]:
    conn  = _connect()
    if from_ts:
        rows = conn.execute(
            "SELECT * FROM sales WHERE ts >= ? ORDER BY id DESC", (from_ts,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM sales ORDER BY id DESC").fetchall()
    sales = []
    for r in rows:
        s = dict(r)
        s["items"] = [dict(i) for i in conn.execute(
            "SELECT * FROM sale_items WHERE sale_id=?", (s["id"],)
        ).fetchall()]
        sales.append(s)
    conn.close()
    return sales


def get_sale(sid: int) -> Optional[dict]:
    conn = _connect()
    row  = conn.execute("SELECT * FROM sales WHERE id=?", (sid,)).fetchone()
    if not row:
        conn.close()
        return None
    s = dict(row)
    s["items"] = [dict(i) for i in conn.execute(
        "SELECT * FROM sale_items WHERE sale_id=?", (sid,)
    ).fetchall()]
    conn.close()
    return s


def delete_all_sales():
    conn = _connect()
    conn.execute("DELETE FROM sale_items")
    conn.execute("DELETE FROM sales")
    conn.commit()
    conn.close()


def delete_all_data():
    conn = _connect()
    conn.execute("DELETE FROM sale_items")
    conn.execute("DELETE FROM sales")
    conn.execute("DELETE FROM products")
    conn.commit()
    conn.close()


# ── Backup / Restore ──────────────────────────────────────────────────────────

def export_json() -> str:
    products = get_products()
    # Convert image bytes to list for JSON serialisation
    for p in products:
        if p.get("image"):
            import base64
            p["image"] = base64.b64encode(p["image"]).decode()
    sales = get_sales()
    settings = get_all_settings()
    return json.dumps({
        "version":    2,
        "exportedAt": datetime.now().isoformat(),
        "settings":   settings,
        "products":   products,
        "sales":      sales,
    }, ensure_ascii=False, indent=2)


def import_json(data: str):
    import base64
    payload  = json.loads(data)
    products = payload.get("products", [])
    sales    = payload.get("sales", [])
    settings = payload.get("settings", {})

    conn = _connect()
    conn.execute("DELETE FROM sale_items")
    conn.execute("DELETE FROM sales")
    conn.execute("DELETE FROM products")

    for p in products:
        img = None
        if p.get("image"):
            try:
                img = base64.b64decode(p["image"])
            except Exception:
                img = None
        conn.execute(
            "INSERT INTO products (id,name,category,unit,cost,price,qty,min_qty,image) "
            "VALUES (?,?,?,?,?,?,?,?,?)",
            (p.get("id"), p["name"], p.get("category",""), p.get("unit",""),
             p["cost"], p["price"], p.get("qty",0), p.get("min_qty",5), img)
        )

    for s in sales:
        conn.execute(
            "INSERT INTO sales (id,ts,subtotal,discount,total,profit) VALUES (?,?,?,?,?,?)",
            (s["id"], s["ts"], s.get("subtotal",0), s.get("discount",0),
             s["total"], s.get("profit",0))
        )
        for it in s.get("items", []):
            conn.execute(
                "INSERT INTO sale_items (sale_id,product_id,product_name,qty,cost,price) "
                "VALUES (?,?,?,?,?,?)",
                (s["id"], it.get("product_id"), it["product_name"],
                 it["qty"], it["cost"], it["price"])
            )

    for k, v in settings.items():
        conn.execute(
            "INSERT OR REPLACE INTO settings (key,value) VALUES (?,?)", (k, v)
        )

    conn.commit()
    conn.close()
