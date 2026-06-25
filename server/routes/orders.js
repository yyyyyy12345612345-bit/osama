const express = require('express');
const { db, generateOrderNumber } = require('../database');
const router = express.Router();

// الحصول على كل الأوردرات
router.get('/', (req, res) => {
  try {
    const { search, payment_method, status, date_from, date_to } = req.query;
    let query = `
      SELECT o.*, c.name as customer_name, c.phone as customer_phone
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
    `;
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('(o.order_number LIKE ? OR c.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (payment_method) {
      conditions.push('o.payment_method = ?');
      params.push(payment_method);
    }
    if (status) {
      conditions.push('o.status = ?');
      params.push(status);
    }
    if (date_from) {
      conditions.push('date(o.created_at) >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('date(o.created_at) <= ?');
      params.push(date_to);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);
    res.json({ success: true, data: orders });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الحصول على أوردر واحد مع التفاصيل
router.get('/:id', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone, 
        c.address as customer_address, c.vehicle_plate, c.vehicle_type
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.id);

    if (!order) return res.status(404).json({ success: false, error: 'الأوردر غير موجود' });

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);

    let installment = null;
    if (order.payment_method === 'installment') {
      installment = db.prepare('SELECT * FROM installment_plans WHERE order_id = ?').get(req.params.id);
      if (installment) {
        installment.payments = db.prepare(
          'SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date'
        ).all(installment.id);
      }
    }

    res.json({ success: true, data: { ...order, items, installment } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إنشاء أوردر جديد
router.post('/', (req, res) => {
  try {
    const {
      customer_id, items, payment_method, discount,
      down_payment, monthly_amount, num_months, notes
    } = req.body;

    if (!customer_id) return res.status(400).json({ success: false, error: 'العميل مطلوب' });
    if (!items || items.length === 0) return res.status(400).json({ success: false, error: 'المنتجات مطلوبة' });
    if (!payment_method) return res.status(400).json({ success: false, error: 'طريقة الدفع مطلوبة' });

    // التأكد من توفر المنتجات
    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      if (!product) return res.status(400).json({ success: false, error: `المنتج غير موجود: ${item.product_id}` });
      if (product.quantity < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `الكمية غير متوفرة للمنتج "${product.name}". المتاح: ${product.quantity}` 
        });
      }
    }

    const orderNumber = generateOrderNumber();

    // حساب الإجمالي والتكلفة
    let totalAmount = 0;
    let costAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id);
      const itemTotal = product.price * item.quantity;
      const itemCost = product.cost * item.quantity;
      totalAmount += itemTotal;
      costAmount += itemCost;
      orderItems.push({
        product_id: product.id,
        product_name: product.name,
        quantity: item.quantity,
        unit_price: product.price,
        unit_cost: product.cost,
        total: itemTotal
      });
    }

    const discountAmount = discount || 0;
    const finalTotal = totalAmount - discountAmount;
    const profit = finalTotal - costAmount;

    let paidAmount = finalTotal;
    let remainingAmount = 0;
    let orderStatus = 'completed';

    if (payment_method === 'installment') {
      paidAmount = down_payment || 0;
      remainingAmount = finalTotal - paidAmount;
      orderStatus = 'pending';
    }

    // Transaction
    const createOrder = db.transaction(() => {
      // إنشاء الأوردر
      const orderResult = db.prepare(`
        INSERT INTO orders (order_number, customer_id, payment_method, total_amount, cost_amount, 
          profit, discount, paid_amount, remaining_amount, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderNumber, customer_id, payment_method, finalTotal, costAmount, profit,
        discountAmount, paidAmount, remainingAmount, orderStatus, notes || '');

      const orderId = orderResult.lastInsertRowid;

      // إضافة تفاصيل الأوردر
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, unit_cost, total)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const item of orderItems) {
        insertItem.run(orderId, item.product_id, item.product_name, item.quantity,
          item.unit_price, item.unit_cost, item.total);
      }

      // خصم من المخزون
      const updateStock = db.prepare('UPDATE products SET quantity = quantity - ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?');
      for (const item of items) {
        updateStock.run(item.quantity, item.product_id);
      }

      // إنشاء خطة الأقساط لو الدفع بالتقسيط
      if (payment_method === 'installment') {
        const monthlyAmt = monthly_amount || 0;
        const months = num_months || 1;
        const startDate = new Date();

        const planResult = db.prepare(`
          INSERT INTO installment_plans (order_id, customer_id, total_amount, down_payment, 
            monthly_amount, num_months, start_date, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
        `).run(orderId, customer_id, remainingAmount, paidAmount, monthlyAmt, months,
          startDate.toISOString().split('T')[0]);

        const planId = planResult.lastInsertRowid;

        // إنشاء دفعات الأقساط
        const insertPayment = db.prepare(`
          INSERT INTO installment_payments (plan_id, due_date, amount, paid_amount, status)
          VALUES (?, ?, ?, 0, 'pending')
        `);

        for (let i = 0; i < months; i++) {
          const dueDate = new Date(startDate);
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          insertPayment.run(planId, dueDate.toISOString().split('T')[0], monthlyAmt);
        }
      }

      return orderId;
    });

    const orderId = createOrder();

    // جلب الأوردر الكامل
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(orderId);

    res.status(201).json({ success: true, data: order });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إلغاء أوردر
router.post('/:id/cancel', (req, res) => {
  try {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'الأوردر غير موجود' });
    if (order.status === 'cancelled') {
      return res.status(400).json({ success: false, error: 'الأوردر ملغي بالفعل' });
    }

    const cancelOrder = db.transaction(() => {
      // إرجاع المنتجات للمخزون
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id);
      const updateStock = db.prepare('UPDATE products SET quantity = quantity + ? WHERE id = ?');
      for (const item of items) {
        updateStock.run(item.quantity, item.product_id);
      }

      // تحديث حالة الأوردر
      db.prepare("UPDATE orders SET status = 'cancelled' WHERE id = ?").run(req.params.id);

      // إلغاء خطة الأقساط لو موجودة
      if (order.payment_method === 'installment') {
        db.prepare("UPDATE installment_plans SET status = 'completed' WHERE order_id = ?").run(req.params.id);
      }
    });

    cancelOrder();
    res.json({ success: true, message: 'تم إلغاء الأوردر بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
