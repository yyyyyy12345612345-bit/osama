const express = require('express');
const { db } = require('../database');
const ExcelJS = require('exceljs');

const router = express.Router();

// تصدير المنتجات لـ Excel
router.get('/products/excel', async (req, res) => {
  try {
    const products = db.prepare('SELECT * FROM products ORDER BY name').all();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('المنتجات');

    sheet.columns = [
      { header: 'الاسم', key: 'name', width: 30 },
      { header: 'سعر البيع', key: 'price', width: 15 },
      { header: 'التكلفة', key: 'cost', width: 15 },
      { header: 'الكمية', key: 'quantity', width: 12 },
      { header: 'التصنيف', key: 'category', width: 20 },
      { header: 'الحد الأدنى', key: 'min_stock', width: 12 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2332' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    products.forEach(p => sheet.addRow(p));
    sheet.views = [{ rightToLeft: true }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=products.xlsx');
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تصدير الأوردرات لـ Excel
router.get('/orders/excel', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    let query = `
      SELECT o.*, c.name as customer_name
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.status != 'cancelled'
    `;
    const params = [];
    if (date_from) { query += ' AND date(o.created_at) >= ?'; params.push(date_from); }
    if (date_to) { query += ' AND date(o.created_at) <= ?'; params.push(date_to); }
    query += ' ORDER BY o.created_at DESC';

    const orders = db.prepare(query).all(...params);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('الأوردرات');

    sheet.columns = [
      { header: 'رقم الأوردر', key: 'order_number', width: 20 },
      { header: 'العميل', key: 'customer_name', width: 25 },
      { header: 'الإجمالي', key: 'total_amount', width: 15 },
      { header: 'التكلفة', key: 'cost_amount', width: 15 },
      { header: 'المكسب', key: 'profit', width: 15 },
      { header: 'طريقة الدفع', key: 'payment_method', width: 15 },
      { header: 'المدفوع', key: 'paid_amount', width: 15 },
      { header: 'المتبقي', key: 'remaining_amount', width: 15 },
      { header: 'الحالة', key: 'status', width: 12 },
      { header: 'التاريخ', key: 'created_at', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2332' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    orders.forEach(o => {
      o.payment_method = o.payment_method === 'cash' ? 'كاش' : 'قسط';
      o.status = o.status === 'completed' ? 'مكتمل' : o.status === 'pending' ? 'قيد السداد' : 'ملغي';
      sheet.addRow(o);
    });

    sheet.views = [{ rightToLeft: true }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=orders.xlsx');
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تصدير الأقساط لـ Excel
router.get('/installments/excel', async (req, res) => {
  try {
    const plans = db.prepare(`
      SELECT ip.*, c.name as customer_name, c.phone as customer_phone, o.order_number,
        (SELECT COALESCE(SUM(paid_amount), 0) FROM installment_payments WHERE plan_id = ip.id AND status = 'paid') as total_paid
      FROM installment_plans ip
      JOIN customers c ON ip.customer_id = c.id
      JOIN orders o ON ip.order_id = o.id
      ORDER BY ip.created_at DESC
    `).all();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('الأقساط');

    sheet.columns = [
      { header: 'رقم الأوردر', key: 'order_number', width: 20 },
      { header: 'العميل', key: 'customer_name', width: 25 },
      { header: 'التليفون', key: 'customer_phone', width: 15 },
      { header: 'الإجمالي', key: 'total_amount', width: 15 },
      { header: 'المقدم', key: 'down_payment', width: 15 },
      { header: 'القسط الشهري', key: 'monthly_amount', width: 15 },
      { header: 'عدد الشهور', key: 'num_months', width: 12 },
      { header: 'المدفوع', key: 'total_paid', width: 15 },
      { header: 'الحالة', key: 'status', width: 12 },
    ];

    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2332' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    plans.forEach(p => {
      p.status = p.status === 'completed' ? 'مكتمل' : p.status === 'active' ? 'نشط' : 'متعثر';
      sheet.addRow(p);
    });

    sheet.views = [{ rightToLeft: true }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=installments.xlsx');
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// تصدير كشف حساب يومي لـ Excel
router.get('/daily-report/excel', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const orders = db.prepare(`
      SELECT o.order_number, c.name as customer_name, o.total_amount, o.profit, 
        o.payment_method, o.created_at
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE date(o.created_at) = ? AND o.status != 'cancelled'
      ORDER BY o.created_at
    `).all(targetDate);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`كشف حساب ${targetDate}`);

    sheet.columns = [
      { header: 'رقم الأوردر', key: 'order_number', width: 20 },
      { header: 'العميل', key: 'customer_name', width: 25 },
      { header: 'الإجمالي', key: 'total_amount', width: 15 },
      { header: 'المكسب', key: 'profit', width: 15 },
      { header: 'طريقة الدفع', key: 'payment_method', width: 15 },
      { header: 'الوقت', key: 'created_at', width: 20 },
    ];

    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a2332' } };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    orders.forEach(o => {
      o.payment_method = o.payment_method === 'cash' ? 'كاش' : 'قسط';
      sheet.addRow(o);
    });

    sheet.views = [{ rightToLeft: true }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=daily-report-${targetDate}.xlsx`);
    await workbook.xlsx.write(res);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// توليد فاتورة PDF
router.get('/invoice/:orderId', (req, res) => {
  try {
    const order = db.prepare(`
      SELECT o.*, c.name as customer_name, c.phone as customer_phone,
        c.address as customer_address, c.vehicle_plate, c.vehicle_type
      FROM orders o
      JOIN customers c ON o.customer_id = c.id
      WHERE o.id = ?
    `).get(req.params.orderId);

    if (!order) return res.status(404).json({ success: false, error: 'الأوردر غير موجود' });

    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.orderId);
    const settings = {};
    db.prepare('SELECT * FROM settings').all().forEach(s => { settings[s.key] = s.value; });

    // Build PDF content
    const fonts = {
      Roboto: {
        normal: 'node_modules/pdfmake/build/vfs_fonts.js'
      }
    };

    // Return JSON invoice data instead (frontend will render it)
    const invoiceData = {
      shop: {
        name: settings.shop_name || 'معرض الرضا',
        address: settings.shop_address || '',
        phone: settings.shop_phone || ''
      },
      order: {
        number: order.order_number,
        date: order.created_at,
        paymentMethod: order.payment_method === 'cash' ? 'كاش' : 'قسط',
        status: order.status
      },
      customer: {
        name: order.customer_name,
        phone: order.customer_phone,
        address: order.customer_address,
        vehiclePlate: order.vehicle_plate,
        vehicleType: order.vehicle_type
      },
      items: items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        total: item.total
      })),
      totals: {
        subtotal: order.total_amount + order.discount,
        discount: order.discount,
        total: order.total_amount,
        paid: order.paid_amount,
        remaining: order.remaining_amount
      }
    };

    // Add installment info if applicable
    if (order.payment_method === 'installment') {
      const plan = db.prepare('SELECT * FROM installment_plans WHERE order_id = ?').get(req.params.orderId);
      if (plan) {
        const payments = db.prepare('SELECT * FROM installment_payments WHERE plan_id = ? ORDER BY due_date').all(plan.id);
        invoiceData.installment = {
          downPayment: plan.down_payment,
          monthlyAmount: plan.monthly_amount,
          numMonths: plan.num_months,
          payments: payments.map(p => ({
            dueDate: p.due_date,
            amount: p.amount,
            status: p.status,
            paidDate: p.paid_date
          }))
        };
      }
    }

    res.json({ success: true, data: invoiceData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
