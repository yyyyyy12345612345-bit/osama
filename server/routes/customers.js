const express = require('express');
const { db } = require('../database');
const router = express.Router();

// الحصول على كل العملاء
router.get('/', (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT c.*, 
        (SELECT COUNT(*) FROM orders WHERE customer_id = c.id) as total_orders,
        (SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE customer_id = c.id AND status != 'cancelled') as total_spent,
        (SELECT COUNT(*) FROM installment_plans WHERE customer_id = c.id AND status = 'active') as active_installments
      FROM customers c
    `;
    const params = [];

    if (search) {
      query += ' WHERE c.name LIKE ? OR c.phone LIKE ? OR c.vehicle_plate LIKE ?';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += ' ORDER BY c.created_at DESC';

    const customers = db.prepare(query).all(...params);
    res.json({ success: true, data: customers });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الحصول على عميل واحد مع تفاصيله
router.get('/:id', (req, res) => {
  try {
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!customer) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    // أوردرات العميل
    const orders = db.prepare(`
      SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC
    `).all(req.params.id);

    // أقساط العميل
    const installments = db.prepare(`
      SELECT ip.*, o.order_number,
        (SELECT COUNT(*) FROM installment_payments WHERE plan_id = ip.id AND status IN ('overdue', 'pending')) as remaining_payments,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM installment_payments WHERE plan_id = ip.id AND status = 'paid') as total_paid
      FROM installment_plans ip
      JOIN orders o ON ip.order_id = o.id
      WHERE ip.customer_id = ?
      ORDER BY ip.created_at DESC
    `).all(req.params.id);

    res.json({ success: true, data: { ...customer, orders, installments } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إضافة عميل جديد
router.post('/', (req, res) => {
  try {
    const { name, phone, phone2, address, national_id, vehicle_plate, vehicle_type, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'اسم العميل مطلوب' });

    const result = db.prepare(`
      INSERT INTO customers (name, phone, phone2, address, national_id, vehicle_plate, vehicle_type, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, phone || '', phone2 || '', address || '', national_id || '', vehicle_plate || '', vehicle_type || '', notes || '');

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تعديل عميل
router.put('/:id', (req, res) => {
  try {
    const { name, phone, phone2, address, national_id, vehicle_plate, vehicle_type, notes } = req.body;
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    db.prepare(`
      UPDATE customers SET 
        name = ?, phone = ?, phone2 = ?, address = ?, 
        national_id = ?, vehicle_plate = ?, vehicle_type = ?, notes = ?
      WHERE id = ?
    `).run(
      name || existing.name,
      phone !== undefined ? phone : existing.phone,
      phone2 !== undefined ? phone2 : existing.phone2,
      address !== undefined ? address : existing.address,
      national_id !== undefined ? national_id : existing.national_id,
      vehicle_plate !== undefined ? vehicle_plate : existing.vehicle_plate,
      vehicle_type !== undefined ? vehicle_type : existing.vehicle_type,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: customer });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// حذف عميل
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'العميل غير موجود' });

    // التأكد من عدم وجود أوردرات
    const orders = db.prepare('SELECT COUNT(*) as count FROM orders WHERE customer_id = ?').get(req.params.id);
    if (orders.count > 0) {
      return res.status(400).json({ success: false, error: 'لا يمكن حذف العميل لأن لديه أوردرات' });
    }

    db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف العميل بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
