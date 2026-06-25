/**
 * Firebase Sync Module
 * مزامنة البيانات من SQLite المحلي إلى Firebase Firestore كـ backup
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, deleteDoc, getDocs, writeBatch } = require('firebase/firestore');
const { db } = require('./database');

// ====== إعدادات Firebase ======
const firebaseConfig = {
  apiKey: "AIzaSyBUlsPbGCznAkncC7tZjRfDYMoTC0H_QaI",
  authDomain: "rubber-f0574.firebaseapp.com",
  projectId: "rubber-f0574",
  storageBucket: "rubber-f0574.firebasestorage.app",
  messagingSenderId: "608921253339",
  appId: "1:608921253339:web:35e350e02608777fab23fe",
  measurementId: "G-NX8J03S6Y2"
};

let firestore = null;
let firebaseReady = false;

function initFirebaseSync() {
  try {
    const app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
    firebaseReady = true;
    console.log('✅ Firebase Firestore متصل بنجاح (backup سحابي)');

    // sync البيانات الموجودة
    setTimeout(() => initialSync(), 3000);
  } catch (err) {
    console.log('⚠️  Firebase Sync فشل:', err.message);
    console.log('   السيستم يشتغل محلي فقط (SQLite)');
    firebaseReady = false;
  }
}

// مزامنة أولية - رفع كل البيانات المحلية لـ Firebase
async function initialSync() {
  if (!firebaseReady || !firestore) return;

  try {
    console.log('🔄 جاري مزامنة البيانات مع Firebase...');

    // Sync products
    const products = db.prepare('SELECT * FROM products').all();
    for (const product of products) {
      await setDoc(doc(firestore, 'products', String(product.id)), product, { merge: true });
    }

    // Sync customers
    const customers = db.prepare('SELECT * FROM customers').all();
    for (const customer of customers) {
      await setDoc(doc(firestore, 'customers', String(customer.id)), customer, { merge: true });
    }

    // Sync orders with items
    const orders = db.prepare('SELECT * FROM orders').all();
    for (const order of orders) {
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
      await setDoc(doc(firestore, 'orders', String(order.id)), { ...order, items }, { merge: true });
    }

    // Sync installment plans with payments
    const plans = db.prepare('SELECT * FROM installment_plans').all();
    for (const plan of plans) {
      const payments = db.prepare('SELECT * FROM installment_payments WHERE plan_id = ?').all(plan.id);
      await setDoc(doc(firestore, 'installmentPlans', String(plan.id)), { ...plan, payments }, { merge: true });
    }

    // Sync expenses
    const expenses = db.prepare('SELECT * FROM expenses').all();
    for (const expense of expenses) {
      await setDoc(doc(firestore, 'expenses', String(expense.id)), expense, { merge: true });
    }

    // Sync settings
    const settings = {};
    db.prepare('SELECT * FROM settings').all().forEach(s => { settings[s.key] = s.value; });
    await setDoc(doc(firestore, 'settings', 'config'), settings, { merge: true });

    console.log('✅ المزامنة مع Firebase تمت بنجاح');
  } catch (err) {
    console.log('⚠️  خطأ في المزامنة:', err.message);
  }
}

// مزامنة عملية واحدة
async function syncToFirebase(collectionName, id, data) {
  if (!firebaseReady || !firestore) return;

  try {
    await setDoc(doc(firestore, collectionName, String(id)), data, { merge: true });
  } catch (err) {
    console.log(`⚠️  فشل sync ${collectionName}/${id}:`, err.message);
  }
}

// حذف من Firebase
async function deleteFromFirebase(collectionName, id) {
  if (!firebaseReady || !firestore) return;

  try {
    await deleteDoc(doc(firestore, collectionName, String(id)));
  } catch (err) {
    console.log(`⚠️  فشل delete ${collectionName}/${id}:`, err.message);
  }
}

// استعادة من Firebase إلى SQLite
async function restoreFromFirebase() {
  if (!firebaseReady || !firestore) {
    console.log('❌ Firebase غير متصل');
    return false;
  }

  try {
    console.log('🔄 جاري استعادة البيانات من Firebase...');

    // Restore products
    const productsSnap = await getDocs(collection(firestore, 'products'));
    const insertProduct = db.prepare(`
      INSERT OR REPLACE INTO products (id, name, price, cost, quantity, category, min_stock, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    productsSnap.forEach(docSnap => {
      const p = docSnap.data();
      insertProduct.run(p.id, p.name, p.price, p.cost, p.quantity, p.category || '', p.min_stock || 5, p.notes || '', p.created_at, p.updated_at);
    });

    // Restore customers
    const customersSnap = await getDocs(collection(firestore, 'customers'));
    const insertCustomer = db.prepare(`
      INSERT OR REPLACE INTO customers (id, name, phone, phone2, address, national_id, vehicle_plate, vehicle_type, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    customersSnap.forEach(docSnap => {
      const c = docSnap.data();
      insertCustomer.run(c.id, c.name, c.phone || '', c.phone2 || '', c.address || '', c.national_id || '', c.vehicle_plate || '', c.vehicle_type || '', c.notes || '', c.created_at);
    });

    // Restore orders
    const ordersSnap = await getDocs(collection(firestore, 'orders'));
    const insertOrder = db.prepare(`
      INSERT OR REPLACE INTO orders (id, order_number, customer_id, payment_method, total_amount, cost_amount, profit, discount, paid_amount, remaining_amount, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO order_items (id, order_id, product_id, product_name, quantity, unit_price, unit_cost, total)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    ordersSnap.forEach(docSnap => {
      const o = docSnap.data();
      insertOrder.run(o.id, o.order_number, o.customer_id, o.payment_method, o.total_amount, o.cost_amount, o.profit, o.discount, o.paid_amount, o.remaining_amount, o.status, o.notes || '', o.created_at);
      if (o.items) {
        o.items.forEach(item => {
          insertItem.run(item.id, o.id, item.product_id, item.product_name, item.quantity, item.unit_price, item.unit_cost, item.total);
        });
      }
    });

    console.log('✅ الاستعادة من Firebase تمت بنجاح');
    return true;
  } catch (err) {
    console.log('❌ خطأ في الاستعادة:', err.message);
    return false;
  }
}

function isFirebaseReady() {
  return firebaseReady;
}

module.exports = { initFirebaseSync, syncToFirebase, deleteFromFirebase, restoreFromFirebase, isFirebaseReady };
