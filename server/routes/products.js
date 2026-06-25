const express = require('express');
const { db } = require('../database');
const router = express.Router();

// الحصول على كل المنتجات
router.get('/', (req, res) => {
  try {
    const { search, category, low_stock } = req.query;
    let query = 'SELECT * FROM products';
    const conditions = [];
    const params = [];

    if (search) {
      conditions.push('name LIKE ?');
      params.push(`%${search}%`);
    }
    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }
    if (low_stock === 'true') {
      conditions.push('quantity <= min_stock');
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC';

    const products = db.prepare(query).all(...params);
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الحصول على منتج واحد
router.get('/:id', (req, res) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إضافة منتج جديد
router.post('/', (req, res) => {
  try {
    const { name, price, cost, quantity, category, min_stock, notes } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'اسم المنتج مطلوب' });

    const result = db.prepare(`
      INSERT INTO products (name, price, cost, quantity, category, min_stock, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(name, price || 0, cost || 0, quantity || 0, category || '', min_stock || 5, notes || '');

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'اسم المنتج موجود بالفعل' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// تعديل منتج
router.put('/:id', (req, res) => {
  try {
    const { name, price, cost, quantity, category, min_stock, notes } = req.body;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });

    db.prepare(`
      UPDATE products SET 
        name = ?, price = ?, cost = ?, quantity = ?, 
        category = ?, min_stock = ?, notes = ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(
      name || existing.name,
      price !== undefined ? price : existing.price,
      cost !== undefined ? cost : existing.cost,
      quantity !== undefined ? quantity : existing.quantity,
      category !== undefined ? category : existing.category,
      min_stock !== undefined ? min_stock : existing.min_stock,
      notes !== undefined ? notes : existing.notes,
      req.params.id
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(400).json({ success: false, error: 'اسم المنتج موجود بالفعل' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// حذف منتج
router.delete('/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!existing) return res.status(404).json({ success: false, error: 'المنتج غير موجود' });

    db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// إضافة كمية للمخزون
router.post('/:id/add-stock', (req, res) => {
  try {
    const { quantity } = req.body;
    if (!quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: 'الكمية مطلوبة ويجب أن تكون أكبر من صفر' });
    }

    db.prepare(`
      UPDATE products SET 
        quantity = quantity + ?,
        updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(quantity, req.params.id);

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// الحصول على التصنيفات
router.get('/meta/categories', (req, res) => {
  try {
    const categories = db.prepare(
      "SELECT DISTINCT category FROM products WHERE category != '' ORDER BY category"
    ).all();
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
