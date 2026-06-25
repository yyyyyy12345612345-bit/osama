const express = require('express');
const { db } = require('../database');
const router = express.Router();

// Dashboard stats
router.get('/dashboard', (req, res) => {
  try {
    // Update overdue installments first
    db.exec(`
      UPDATE installment_payments 
      SET status = 'overdue' 
      WHERE status = 'pending' 
      AND due_date < date('now', 'localtime')
    `);

    const today = new Date().toISOString().split('T')[0];
    const monthStart = today.substring(0, 7) + '-01';
    const yearStart = today.substring(0, 4) + '-01-01';

    // مبيعات اليوم
    const todaySales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(profit), 0) as profit, COUNT(*) as count
      FROM orders WHERE date(created_at) = ? AND status != 'cancelled'
    `).get(today);

    // مبيعات الشهر
    const monthSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(profit), 0) as profit, COUNT(*) as count
      FROM orders WHERE date(created_at) >= ? AND status != 'cancelled'
    `).get(monthStart);

    // مبيعات السنة
    const yearSales = db.prepare(`
      SELECT COALESCE(SUM(total_amount), 0) as total, COALESCE(SUM(profit), 0) as profit, COUNT(*) as count
      FROM orders WHERE date(created_at) >= ? AND status != 'cancelled'
    `).get(yearStart);

    // مكسب كاش vs قسط
    const cashProfit = db.prepare(`
      SELECT COALESCE(SUM(profit), 0) as profit 
      FROM orders WHERE payment_method = 'cash' AND status != 'cancelled'
    `).get();

    const installmentProfit = db.prepare(`
      SELECT COALESCE(SUM(profit), 0) as profit 
      FROM orders WHERE payment_method = 'installment' AND status != 'cancelled'
    `).get();

    // حالة المخزون
    const totalStock = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM products').get();
    const lowStock = db.prepare('SELECT COUNT(*) as count FROM products WHERE quantity <= min_stock').get();
    const lowStockProducts = db.prepare(
      'SELECT id, name, quantity, min_stock FROM products WHERE quantity <= min_stock ORDER BY quantity ASC LIMIT 10'
    ).all();

    // أقساط متأخرة
    const overdueInstallments = db.prepare(`
      SELECT COUNT(DISTINCT ip.id) as count,
        COALESCE(SUM(ipy.amount - ipy.paid_amount), 0) as total_overdue
      FROM installment_plans ip
      JOIN installment_payments ipy ON ipy.plan_id = ip.id
      WHERE ip.status = 'active' AND ipy.status = 'overdue'
    `).get();

    // آخر 10 أوردرات
    const recentOrders = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      ORDER BY o.created_at DESC LIMIT 10
    `).all();

    // مبيعات آخر 7 أيام
    const last7Days = db.prepare(`
      SELECT date(created_at) as day, 
        COALESCE(SUM(total_amount), 0) as total,
        COALESCE(SUM(profit), 0) as profit
      FROM orders
      WHERE date(created_at) >= date('now', '-7 days', 'localtime') AND status != 'cancelled'
      GROUP BY date(created_at)
      ORDER BY day
    `).all();

    // توزيع المبيعات حسب المنتج (top 6)
    const productSales = db.prepare(`
      SELECT oi.product_name, SUM(oi.quantity) as total_qty, SUM(oi.total) as total_sales
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY total_sales DESC
      LIMIT 6
    `).all();

    // عدد العملاء
    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get();
    const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get();

    res.json({
      success: true,
      data: {
        today: todaySales,
        month: monthSales,
        year: yearSales,
        cashProfit: cashProfit.profit,
        installmentProfit: installmentProfit.profit,
        totalStock: totalStock.total,
        lowStock: lowStock.count,
        lowStockProducts,
        overdueInstallments,
        recentOrders,
        last7Days,
        productSales,
        totalCustomers: totalCustomers.count,
        totalProducts: totalProducts.count
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// كشف حساب يومي
router.get('/daily', (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const orders = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE date(o.created_at) = ? AND o.status != 'cancelled'
      ORDER BY o.created_at
    `).all(targetDate);

    const summary = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(cost_amount), 0) as total_cost,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN total_amount ELSE 0 END), 0) as installment_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN profit ELSE 0 END), 0) as cash_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN profit ELSE 0 END), 0) as installment_profit
      FROM orders
      WHERE date(created_at) = ? AND status != 'cancelled'
    `).get(targetDate);

    // مصاريف اليوم
    const expenses = db.prepare(`
      SELECT * FROM expenses WHERE expense_date = ? ORDER BY created_at
    `).all(targetDate);

    const totalExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date = ?
    `).get(targetDate);

    // دفعات أقساط اليوم
    const installmentPayments = db.prepare(`
      SELECT ipy.*, c.name as customer_name, o.order_number
      FROM installment_payments ipy
      JOIN installment_plans ip ON ipy.plan_id = ip.id
      JOIN customers c ON ip.customer_id = c.id
      JOIN orders o ON ip.order_id = o.id
      WHERE ipy.paid_date = ? AND ipy.status = 'paid'
    `).all(targetDate);

    const totalInstallmentCollected = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total
      FROM installment_payments
      WHERE paid_date = ? AND status = 'paid'
    `).get(targetDate);

    res.json({
      success: true,
      data: {
        date: targetDate,
        orders,
        summary,
        expenses,
        totalExpenses: totalExpenses.total,
        installmentPayments,
        totalInstallmentCollected: totalInstallmentCollected.total,
        netProfit: summary.total_profit - totalExpenses.total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// كشف حساب شهري
router.get('/monthly', (req, res) => {
  try {
    const { year, month } = req.query;
    const y = year || new Date().getFullYear();
    const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
    const monthStr = `${y}-${m}`;

    const dailySummary = db.prepare(`
      SELECT date(created_at) as day,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN total_amount ELSE 0 END), 0) as installment_sales
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
      GROUP BY date(created_at)
      ORDER BY day
    `).all(monthStr);

    const monthTotal = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(cost_amount), 0) as total_cost,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN profit ELSE 0 END), 0) as cash_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN profit ELSE 0 END), 0) as installment_profit
      FROM orders
      WHERE strftime('%Y-%m', created_at) = ? AND status != 'cancelled'
    `).get(monthStr);

    const monthExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
      WHERE strftime('%Y-%m', expense_date) = ?
    `).get(monthStr);

    res.json({
      success: true,
      data: {
        month: monthStr,
        dailySummary,
        total: monthTotal,
        totalExpenses: monthExpenses.total,
        netProfit: monthTotal.total_profit - monthExpenses.total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// كشف حساب سنوي
router.get('/yearly', (req, res) => {
  try {
    const { year } = req.query;
    const y = year || new Date().getFullYear();

    const monthlySummary = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month,
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN total_amount ELSE 0 END), 0) as installment_sales
      FROM orders
      WHERE strftime('%Y', created_at) = ? AND status != 'cancelled'
      GROUP BY strftime('%Y-%m', created_at)
      ORDER BY month
    `).all(String(y));

    const yearTotal = db.prepare(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_sales,
        COALESCE(SUM(cost_amount), 0) as total_cost,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN profit ELSE 0 END), 0) as cash_profit,
        COALESCE(SUM(CASE WHEN payment_method = 'installment' THEN profit ELSE 0 END), 0) as installment_profit
      FROM orders
      WHERE strftime('%Y', created_at) = ? AND status != 'cancelled'
    `).get(String(y));

    const yearExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total FROM expenses 
      WHERE strftime('%Y', expense_date) = ?
    `).get(String(y));

    res.json({
      success: true,
      data: {
        year: y,
        monthlySummary,
        total: yearTotal,
        totalExpenses: yearExpenses.total,
        netProfit: yearTotal.total_profit - yearExpenses.total
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إدارة المصاريف
router.post('/expenses', (req, res) => {
  try {
    const { description, amount, category, expense_date } = req.body;
    if (!description || !amount) {
      return res.status(400).json({ success: false, error: 'الوصف والمبلغ مطلوبان' });
    }

    const result = db.prepare(`
      INSERT INTO expenses (description, amount, category, expense_date)
      VALUES (?, ?, ?, ?)
    `).run(description, amount, category || 'عام', expense_date || new Date().toISOString().split('T')[0]);

    const expense = db.prepare('SELECT * FROM expenses WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/expenses/:id', (req, res) => {
  try {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف المصروف' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إعدادات المحل
router.get('/settings', (req, res) => {
  try {
    const settings = {};
    const rows = db.prepare('SELECT * FROM settings').all();
    rows.forEach(row => { settings[row.key] = row.value; });
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/settings', (req, res) => {
  try {
    const update = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    const updateAll = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        update.run(key, value);
      }
    });
    updateAll(req.body);
    res.json({ success: true, message: 'تم تحديث الإعدادات' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
