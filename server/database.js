const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initDatabase() {
  db.exec(`
    -- جدول المنتجات
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      price REAL NOT NULL DEFAULT 0,
      cost REAL NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 0,
      category TEXT DEFAULT '',
      min_stock INTEGER NOT NULL DEFAULT 5,
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول العملاء
    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT DEFAULT '',
      phone2 TEXT DEFAULT '',
      address TEXT DEFAULT '',
      national_id TEXT DEFAULT '',
      vehicle_plate TEXT DEFAULT '',
      vehicle_type TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول الأوردرات
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'installment')),
      total_amount REAL NOT NULL DEFAULT 0,
      cost_amount REAL NOT NULL DEFAULT 0,
      profit REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      remaining_amount REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'pending', 'cancelled')),
      notes TEXT DEFAULT '',
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- جدول تفاصيل الأوردر
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0,
      unit_cost REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    -- جدول خطط الأقساط
    CREATE TABLE IF NOT EXISTS installment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      down_payment REAL NOT NULL DEFAULT 0,
      monthly_amount REAL NOT NULL DEFAULT 0,
      num_months INTEGER NOT NULL DEFAULT 1,
      start_date DATE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'defaulted')),
      created_at DATETIME DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );

    -- جدول دفعات الأقساط
    CREATE TABLE IF NOT EXISTS installment_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      plan_id INTEGER NOT NULL,
      due_date DATE NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      paid_amount REAL NOT NULL DEFAULT 0,
      paid_date DATE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'partial')),
      notes TEXT DEFAULT '',
      FOREIGN KEY (plan_id) REFERENCES installment_plans(id) ON DELETE CASCADE
    );

    -- جدول المصاريف (اختياري - للمصاريف اليومية)
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      category TEXT DEFAULT 'عام',
      expense_date DATE DEFAULT (date('now', 'localtime')),
      created_at DATETIME DEFAULT (datetime('now', 'localtime'))
    );

    -- جدول إعدادات المحل
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    -- إعدادات افتراضية
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_name', 'معرض الرضا');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_address', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('shop_phone', '');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'ج.م');
  `);

  // Update overdue installments
  db.exec(`
    UPDATE installment_payments 
    SET status = 'overdue' 
    WHERE status = 'pending' 
    AND due_date < date('now', 'localtime')
  `);

  console.log('✅ Database initialized successfully');
}

// Generate order number
function generateOrderNumber() {
  const year = new Date().getFullYear();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM orders 
    WHERE order_number LIKE ?
  `).get(`ORD-${year}-%`);
  
  const num = (row.count || 0) + 1;
  return `ORD-${year}-${String(num).padStart(4, '0')}`;
}

module.exports = { db, initDatabase, generateOrderNumber };
