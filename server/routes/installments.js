const express = require('express');
const { db } = require('../database');
const router = express.Router();

// الحصول على كل خطط الأقساط
router.get('/', (req, res) => {
  try {
    const { status, search } = req.query;
    let query = `
      SELECT ip.*, c.name as customer_name, c.phone as customer_phone, 
        o.order_number,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM installment_payments WHERE plan_id = ip.id AND status = 'paid') as total_paid,
        (SELECT COUNT(*) FROM installment_payments WHERE plan_id = ip.id AND status = 'overdue') as overdue_count,
        (SELECT MIN(due_date) FROM installment_payments WHERE plan_id = ip.id AND status IN ('pending', 'overdue')) as next_due_date
      FROM installment_plans ip
      JOIN customers c ON ip.customer_id = c.id
      JOIN orders o ON ip.order_id = o.id
    `;
    const conditions = [];
    const params = [];

    if (status) {
      conditions.push('ip.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(c.name LIKE ? OR o.order_number LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ip.created_at DESC';

    const plans = db.prepare(query).all(...params);
    res.json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الحصول على خطة قسط واحدة مع الدفعات
router.get('/:id', (req, res) => {
  try {
    const plan = db.prepare(`
      SELECT ip.*, c.name as customer_name, c.phone as customer_phone,
        c.address as customer_address, o.order_number
      FROM installment_plans ip
      JOIN customers c ON ip.customer_id = c.id
      JOIN orders o ON ip.order_id = o.id
      WHERE ip.id = ?
    `).get(req.params.id);

    if (!plan) return res.status(404).json({ success: false, error: 'خطة القسط غير موجودة' });

    const payments = db.prepare(
      'SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date'
    ).all(req.params.id);

    res.json({ success: true, data: { ...plan, payments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تسجيل دفعة قسط
router.post('/:planId/pay/:paymentId', (req, res) => {
  try {
    const { amount, notes } = req.body;
    const payment = db.prepare(
      'SELECT * FROM installment_payments WHERE id = ? AND plan_id = ?'
    ).get(req.params.paymentId, req.params.planId);

    if (!payment) return res.status(404).json({ success: false, error: 'الدفعة غير موجودة' });

    const paidAmount = amount || payment.amount;
    const today = new Date().toISOString().split('T')[0];
    const newStatus = paidAmount >= payment.amount ? 'paid' : 'partial';

    db.prepare(`
      UPDATE installment_payments SET 
        paid_amount = ?, paid_date = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(paidAmount, today, newStatus, notes || '', req.params.paymentId);

    // تحديث المبلغ المدفوع في الأوردر
    const plan = db.prepare('SELECT * FROM installment_plans WHERE id = ?').get(req.params.planId);
    const totalPaid = db.prepare(`
      SELECT COALESCE(SUM(paid_amount), 0) as total 
      FROM installment_payments 
      WHERE plan_id = ? AND status IN ('paid', 'partial')
    `).get(req.params.planId);

    const totalPaidWithDown = plan.down_payment + totalPaid.total;
    
    db.prepare(`
      UPDATE orders SET 
        paid_amount = ?,
        remaining_amount = total_amount - ?
      WHERE id = ?
    `).run(totalPaidWithDown, totalPaidWithDown, plan.order_id);

    // التأكد لو كل الأقساط اتدفعت
    const pendingPayments = db.prepare(`
      SELECT COUNT(*) as count FROM installment_payments 
      WHERE plan_id = ? AND status IN ('pending', 'overdue', 'partial')
    `).get(req.params.planId);

    if (pendingPayments.count === 0) {
      db.prepare("UPDATE installment_plans SET status = 'completed' WHERE id = ?").run(req.params.planId);
      db.prepare("UPDATE orders SET status = 'completed', remaining_amount = 0 WHERE id = ?").run(plan.order_id);
    }

    res.json({ success: true, message: 'تم تسجيل الدفعة بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الأقساط المتأخرة
router.get('/status/overdue', (req, res) => {
  try {
    const overdue = db.prepare(`
      SELECT ip2.*, c.name as customer_name, c.phone as customer_phone, o.order_number,
        (SELECT COUNT(*) FROM installment_payments WHERE plan_id = ip2.id AND status = 'overdue') as overdue_count,
        (SELECT COALESCE(SUM(amount - paid_amount), 0) FROM installment_payments WHERE plan_id = ip2.id AND status = 'overdue') as overdue_amount
      FROM installment_plans ip2
      JOIN customers c ON ip2.customer_id = c.id
      JOIN orders o ON ip2.order_id = o.id
      WHERE ip2.status = 'active'
      AND EXISTS (SELECT 1 FROM installment_payments WHERE plan_id = ip2.id AND status = 'overdue')
      ORDER BY overdue_count DESC
    `).all();

    res.json({ success: true, data: overdue });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
