import Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  db.exec(`PRAGMA journal_mode = WAL;`)
  db.exec(`PRAGMA foreign_keys = ON;`)

  // migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      version INTEGER NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  const applied = db.prepare('SELECT version FROM migrations').all() as { version: number }[]
  const versions = new Set(applied.map((r) => r.version))

  const migrations: { version: number; sql: string }[] = [
    { version: 1, sql: migration_001 },
    { version: 2, sql: migration_002 },
  ]

  for (const m of migrations) {
    if (!versions.has(m.version)) {
      db.transaction(() => {
        db.exec(m.sql)
        db.prepare('INSERT INTO migrations (version) VALUES (?)').run(m.version)
      })()
      console.log(`Applied migration v${m.version}`)
    }
  }
}

const migration_001 = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK(role IN ('admin','employee')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  secondary_phone TEXT,
  national_id TEXT,
  address TEXT,
  contact_type TEXT NOT NULL DEFAULT 'buyer' CHECK(contact_type IN ('seller','buyer','both')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(name);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL DEFAULT 'Apple',
  model TEXT NOT NULL,
  storage TEXT NOT NULL,
  color TEXT NOT NULL,
  condition TEXT NOT NULL DEFAULT 'used' CHECK(condition IN ('new','used','refurbished')),
  serial_number TEXT UNIQUE,
  imei1 TEXT UNIQUE,
  imei2 TEXT UNIQUE,
  battery_health INTEGER,
  box_status TEXT NOT NULL DEFAULT 'without_box' CHECK(box_status IN ('with_box','without_box','damaged_box')),
  accessories TEXT,
  technical_notes TEXT,
  purchase_price REAL NOT NULL DEFAULT 0,
  extra_costs REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  expected_sale_price REAL,
  final_sale_price REAL,
  status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available','reserved','sold','returned','repair','archived')),
  purchase_transaction_id INTEGER,
  sale_transaction_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_serial ON devices(serial_number);
CREATE INDEX IF NOT EXISTS idx_devices_imei1 ON devices(imei1);
CREATE INDEX IF NOT EXISTS idx_devices_imei2 ON devices(imei2);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_model ON devices(model);

CREATE TABLE IF NOT EXISTS purchase_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  seller_contact_id INTEGER NOT NULL REFERENCES contacts(id),
  purchase_date TEXT NOT NULL,
  purchase_price REAL NOT NULL DEFAULT 0,
  extra_costs REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','transfer','check','other')),
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_purchases_device ON purchase_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_purchases_seller ON purchase_transactions(seller_contact_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchase_transactions(purchase_date);

CREATE TABLE IF NOT EXISTS sale_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  buyer_contact_id INTEGER NOT NULL REFERENCES contacts(id),
  sale_date TEXT NOT NULL,
  sale_price REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  paid_amount REAL NOT NULL DEFAULT 0,
  remaining_amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','transfer','check','other')),
  profit REAL NOT NULL DEFAULT 0,
  invoice_id INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sales_device ON sale_transactions(device_id);
CREATE INDEX IF NOT EXISTS idx_sales_buyer ON sale_transactions(buyer_contact_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sale_transactions(sale_date);

CREATE TABLE IF NOT EXISTS invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_number TEXT NOT NULL UNIQUE,
  sale_transaction_id INTEGER NOT NULL REFERENCES sale_transactions(id),
  buyer_contact_id INTEGER NOT NULL REFERENCES contacts(id),
  issue_date TEXT NOT NULL,
  amount_due REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  policy_text TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_buyer ON invoices(buyer_contact_id);

CREATE TABLE IF NOT EXISTS invoice_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id),
  device_id INTEGER NOT NULL REFERENCES devices(id),
  description TEXT NOT NULL,
  serial_or_imei TEXT,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('purchase','sale')),
  transaction_id INTEGER NOT NULL,
  contact_id INTEGER NOT NULL REFERENCES contacts(id),
  amount REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cash' CHECK(payment_method IN ('cash','transfer','check','other')),
  payment_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id),
  expense_type TEXT NOT NULL DEFAULT 'other' CHECK(expense_type IN ('repair','cleaning','accessories','transport','unlocking','other')),
  amount REAL NOT NULL DEFAULT 0,
  expense_date TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_expenses_device ON expenses(device_id);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('store_name', 'Team Store'),
  ('store_address', '9 ش ترعه السواحل / الوراق - الجيزه - مصر'),
  ('store_phone', ''),
  ('invoice_start_number', '1'),
  ('currency', 'EGP'),
  ('daily_backup_enabled', 'true'),
  ('backups_to_keep', '30'),
  ('backup_location', ''),
  ('last_backup_date', ''),
  ('default_policy_text', 'سياسه الاستبدال

خلال 14 يوم اذا شاب السلعه عيب او كانت غير مطابقه للمواصفات او الغرض الذي تم التعاقد عليه من اجله.

للأجهزه المستعمله لا يوجد استرجاع. في حاله طلب العميل استرجاع سيتم خصم من ٥٪ ل ١٠٪ من اجمالي الفاتوره.

في حاله وجود عيوب صناعه في الجهاز المستعمل يستبدل بجهاز مماثل له بشرط توافر الاتي:

1 - ضروره توافر اصل الفاتوره مع العميل و ان تكون بأسمه.

2 - لا يجوز للمستهلك ان يباشر حقه في الحالات التاليه:
اذا كانت طبيعه السلعه او خصائصها او طريقه التعبئه او التغليف تحول دون استبدالها او ردها الي الحاله التي كانت عليها عند التعاقد.
اذا كانت السلعه من السلع الاستهلاكيه القابله للتلف.
اذا لم تكن السلعه بذات الحاله التي كانت عليه وقت الشراء.

3 - الشركه غير مسئوله عن فقدان او نسيان كلمه المرور او الدخول للحساب الشخصي للمستخدم تطبيقا لقانون حمايه الملكيه الفكريه.

4 - لا يوجد ضمان علي نسبه البطاريه.

5 - يسري الضمان او الحق في استبدال الاجهزه والاكسسوارات لأي سبب يشمل عيوب صناعه ولا يشمل الاتلاف او الكسر او السقوط في الماء او سوء الاستخدام.

برجاء الاحتفاظ بالفاتوره مع العلم انه لا يمكن اصدار اي نسخ اخري اضافيه.

الاحتفاظ بالفاتوره هي مسئوليه العميل و يجب عليه تقديمها عند طلب الحصول علي خدمات ما بعد البيع.

لا يوجد مرتجع لأي منتج عند تغير الاسعار.

مده الضمان للايفون المستعمل ٣٠ يوم من ايفون 6 الى ايفون XS Max.

مده الضمان للايفون المستعمل ٣ شهور من ايفون 11 الى ايفون 15 برو ماكس.

توقيع العميل: .............');
`

const migration_002 = `
-- future migrations go here
SELECT 1;
`
