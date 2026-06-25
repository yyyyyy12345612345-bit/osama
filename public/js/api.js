// API Layer - Direct Firestore Operations (No Backend!)
// كل العمليات بتتم مباشرة مع Firebase Firestore

const API = {
  // ========== Products ==========
  products: {
    async getAll(params = {}) {
      let query = db.collection('products').orderBy('createdAt', 'desc');

      const snapshot = await query.get();
      let products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (params.search) {
        const s = params.search.toLowerCase();
        products = products.filter(p => p.name.toLowerCase().includes(s));
      }
      if (params.category) {
        products = products.filter(p => p.category === params.category);
      }
      if (params.low_stock === 'true') {
        products = products.filter(p => p.quantity <= (p.minStock || 5));
      }

      return products;
    },

    async getOne(id) {
      const doc = await db.collection('products').doc(id).get();
      if (!doc.exists) throw new Error('المنتج غير موجود');
      return { id: doc.id, ...doc.data() };
    },

    async create(data) {
      // Check unique name
      const existing = await db.collection('products').where('name', '==', data.name).get();
      if (!existing.empty) throw new Error('اسم المنتج موجود بالفعل');

      const now = new Date().toISOString();
      const docRef = await db.collection('products').add({
        name: data.name,
        price: data.price || 0,
        cost: data.cost || 0,
        quantity: data.quantity || 0,
        category: data.category || '',
        minStock: data.min_stock || 5,
        notes: data.notes || '',
        createdAt: now,
        updatedAt: now
      });
      return { id: docRef.id, ...data };
    },

    async update(id, data) {
      const now = new Date().toISOString();
      const updateData = { updatedAt: now };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.cost !== undefined) updateData.cost = data.cost;
      if (data.quantity !== undefined) updateData.quantity = data.quantity;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.min_stock !== undefined) updateData.minStock = data.min_stock;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db.collection('products').doc(id).update(updateData);
      return this.getOne(id);
    },

    async delete(id) {
      await db.collection('products').doc(id).delete();
      return { message: 'تم حذف المنتج' };
    },

    async addStock(id, quantity) {
      const doc = await db.collection('products').doc(id).get();
      const current = doc.data().quantity || 0;
      await db.collection('products').doc(id).update({
        quantity: current + quantity,
        updatedAt: new Date().toISOString()
      });
      return this.getOne(id);
    }
  },

  // ========== Customers ==========
  customers: {
    async getAll(params = {}) {
      const snapshot = await db.collection('customers').orderBy('createdAt', 'desc').get();
      let customers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Enrich with order counts
      const ordersSnap = await db.collection('orders').get();
      const orders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const plansSnap = await db.collection('installmentPlans').where('status', '==', 'active').get();
      const plans = plansSnap.docs.map(d => d.data());

      customers = customers.map(c => {
        const custOrders = orders.filter(o => o.customerId === c.id && o.status !== 'cancelled');
        const custPlans = plans.filter(p => p.customerId === c.id);
        return {
          ...c,
          total_orders: custOrders.length,
          total_spent: custOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0),
          active_installments: custPlans.length
        };
      });

      if (params.search) {
        const s = params.search.toLowerCase();
        customers = customers.filter(c =>
          (c.name || '').toLowerCase().includes(s) ||
          (c.phone || '').includes(s) ||
          (c.vehiclePlate || '').includes(s)
        );
      }

      return customers;
    },

    async getOne(id) {
      const doc = await db.collection('customers').doc(id).get();
      if (!doc.exists) throw new Error('العميل غير موجود');
      const customer = { id: doc.id, ...doc.data() };

      // Get orders
      const ordersSnap = await db.collection('orders').where('customerId', '==', id).get();
      let ordersList = ordersSnap.docs.map(d => {
        const o = { id: d.id, ...d.data() };
        return {
          ...o,
          order_number: o.orderNumber || o.order_number,
          total_amount: o.totalAmount !== undefined ? o.totalAmount : o.total_amount,
          payment_method: o.paymentMethod || o.payment_method,
          status: o.status,
          created_at: o.createdAt || o.created_at
        };
      });
      customer.orders = ordersList.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

      // Get installments
      const plansSnap = await db.collection('installmentPlans').where('customerId', '==', id).get();
      customer.installments = plansSnap.docs.map(d => {
        const plan = { id: d.id, ...d.data() };
        const paidPayments = (plan.payments || []).filter(p => p.status === 'paid');
        const total_paid = paidPayments.reduce((sum, p) => sum + (p.paidAmount || p.paid_amount || 0), 0);
        return {
          ...plan,
          order_number: plan.orderNumber || plan.order_number,
          total_amount: plan.totalAmount !== undefined ? plan.totalAmount : plan.total_amount,
          status: plan.status,
          total_paid
        };
      });

      return customer;
    },

    async create(data) {
      const now = new Date().toISOString();
      const docRef = await db.collection('customers').add({
        name: data.name,
        phone: data.phone || '',
        phone2: data.phone2 || '',
        address: data.address || '',
        nationalId: data.national_id || '',
        vehiclePlate: data.vehicle_plate || '',
        vehicleType: data.vehicle_type || '',
        notes: data.notes || '',
        createdAt: now
      });
      return { id: docRef.id, ...data };
    },

    async update(id, data) {
      const updateData = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.phone2 !== undefined) updateData.phone2 = data.phone2;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.national_id !== undefined) updateData.nationalId = data.national_id;
      if (data.vehicle_plate !== undefined) updateData.vehiclePlate = data.vehicle_plate;
      if (data.vehicle_type !== undefined) updateData.vehicleType = data.vehicle_type;
      if (data.notes !== undefined) updateData.notes = data.notes;

      await db.collection('customers').doc(id).update(updateData);
      return this.getOne(id);
    },

    async delete(id) {
      const ordersSnap = await db.collection('orders').where('customerId', '==', id).limit(1).get();
      if (!ordersSnap.empty) throw new Error('لا يمكن حذف العميل لأن لديه أوردرات');
      await db.collection('customers').doc(id).delete();
      return { message: 'تم حذف العميل' };
    }
  },

  // ========== Orders ==========
  orders: {
    async getAll(params = {}) {
      let snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
      let orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (params.search) {
        const s = params.search.toLowerCase();
        orders = orders.filter(o =>
          (o.orderNumber || '').toLowerCase().includes(s) ||
          (o.customerName || '').toLowerCase().includes(s)
        );
      }
      if (params.payment_method) {
        orders = orders.filter(o => o.paymentMethod === params.payment_method);
      }
      if (params.status) {
        orders = orders.filter(o => o.status === params.status);
      }

      // Map field names for compatibility with components
      return orders.map(o => ({
        ...o,
        order_number: o.orderNumber,
        customer_name: o.customerName,
        payment_method: o.paymentMethod,
        total_amount: o.totalAmount,
        cost_amount: o.costAmount,
        paid_amount: o.paidAmount,
        remaining_amount: o.remainingAmount,
        created_at: o.createdAt
      }));
    },

    async getOne(id) {
      const doc = await db.collection('orders').doc(id).get();
      if (!doc.exists) throw new Error('الأوردر غير موجود');
      const o = { id: doc.id, ...doc.data() };

      // Map names
      const order = {
        ...o,
        order_number: o.orderNumber,
        customer_name: o.customerName,
        customer_phone: o.customerPhone || '',
        customer_address: o.customerAddress || '',
        vehicle_plate: o.vehiclePlate || '',
        vehicle_type: o.vehicleType || '',
        payment_method: o.paymentMethod,
        total_amount: o.totalAmount,
        cost_amount: o.costAmount,
        paid_amount: o.paidAmount,
        remaining_amount: o.remainingAmount,
        created_at: o.createdAt
      };

      // Map items
      order.items = (o.items || []).map(item => ({
        ...item,
        product_name: item.productName,
        unit_price: item.unitPrice,
        unit_cost: item.unitCost
      }));

      // Get installment if exists
      if (o.paymentMethod === 'installment') {
        const planSnap = await db.collection('installmentPlans').where('orderId', '==', id).limit(1).get();
        if (!planSnap.empty) {
          const planDoc = planSnap.docs[0];
          const plan = { id: planDoc.id, ...planDoc.data() };
          order.installment = {
            down_payment: plan.downPayment,
            monthly_amount: plan.monthlyAmount,
            num_months: plan.numMonths,
            payments: (plan.payments || []).map(p => ({
              id: p.id || Math.random().toString(36).substr(2, 9),
              due_date: p.dueDate,
              amount: p.amount,
              paid_amount: p.paidAmount || 0,
              paid_date: p.paidDate || null,
              status: p.status
            }))
          };
        }
      }

      return order;
    },

    async create(data) {
      const batch = db.batch();

      // Generate order number
      const year = new Date().getFullYear();
      const countSnap = await db.collection('orders').get();
      const orderNum = countSnap.size + 1;
      const orderNumber = `ORD-${year}-${String(orderNum).padStart(4, '0')}`;

      // Get products & calculate totals
      let totalAmount = 0;
      let costAmount = 0;
      const orderItems = [];

      for (const item of data.items) {
        const productDoc = await db.collection('products').doc(item.product_id).get();
        if (!productDoc.exists) throw new Error(`المنتج غير موجود`);
        const product = productDoc.data();

        const productQty = product.quantity || 0;
        if (productQty < item.quantity) {
          throw new Error(`الكمية غير متوفرة للمنتج "${product.name}". المتاح: ${productQty}`);
        }

        const itemPrice = item.price || product.price || 0;
        const itemTotal = itemPrice * item.quantity;
        const itemCost = (product.cost || 0) * item.quantity;
        totalAmount += itemTotal;
        costAmount += itemCost;

        orderItems.push({
          productId: item.product_id,
          productName: product.name,
          quantity: item.quantity,
          unitPrice: itemPrice,
          unitCost: product.cost || 0,
          total: itemTotal
        });

        // Deduct stock
        const productRef = db.collection('products').doc(item.product_id);
        batch.update(productRef, {
          quantity: productQty - item.quantity,
          updatedAt: new Date().toISOString()
        });
      }

      const discount = data.discount || 0;
      const finalTotal = totalAmount - discount;
      const profit = finalTotal - costAmount;

      let paidAmount = finalTotal;
      let remainingAmount = 0;
      let status = 'completed';

      if (data.payment_method === 'installment') {
        paidAmount = data.down_payment || 0;
        remainingAmount = finalTotal - paidAmount;
        status = 'pending';
      }

      // Get customer info
      const custDoc = await db.collection('customers').doc(data.customer_id).get();
      const custData = custDoc.exists ? custDoc.data() : {};

      // Create order
      const now = new Date().toISOString();
      const orderRef = db.collection('orders').doc();
      batch.set(orderRef, {
        orderNumber,
        customerId: data.customer_id,
        customerName: custData.name || '',
        customerPhone: custData.phone || '',
        customerAddress: custData.address || '',
        vehiclePlate: custData.vehiclePlate || '',
        vehicleType: custData.vehicleType || '',
        paymentMethod: data.payment_method,
        items: orderItems,
        totalAmount: finalTotal,
        costAmount,
        profit,
        discount,
        paidAmount,
        remainingAmount,
        status,
        notes: data.notes || '',
        createdAt: now
      });

      // Create installment plan if needed
      if (data.payment_method === 'installment') {
        const monthlyAmount = data.monthly_amount || 0;
        const numMonths = data.num_months || 1;
        const payments = [];
        let remainingToDistribute = remainingAmount;

        for (let i = 0; i < numMonths; i++) {
          const dueDate = new Date();
          dueDate.setMonth(dueDate.getMonth() + i + 1);
          
          let currentAmount = monthlyAmount;
          if (i === numMonths - 1) {
            currentAmount = remainingToDistribute; // Last month takes remainder
          } else if (remainingToDistribute < monthlyAmount) {
            currentAmount = remainingToDistribute;
          }
          currentAmount = Math.round(currentAmount * 100) / 100;

          payments.push({
            id: `pay_${i}`,
            dueDate: dueDate.toISOString().split('T')[0],
            amount: currentAmount,
            paidAmount: 0,
            paidDate: null,
            status: 'pending'
          });
          
          remainingToDistribute -= currentAmount;
        }

        const planRef = db.collection('installmentPlans').doc();
        batch.set(planRef, {
          orderId: orderRef.id,
          customerId: data.customer_id,
          customerName: custData.name || '',
          orderNumber,
          totalAmount: remainingAmount,
          downPayment: paidAmount,
          monthlyAmount,
          numMonths,
          startDate: now.split('T')[0],
          status: 'active',
          payments,
          createdAt: now
        });
      }

      await batch.commit();

      return {
        id: orderRef.id,
        order_number: orderNumber,
        customer_name: custData.name
      };
    },

    async cancel(id) {
      const doc = await db.collection('orders').doc(id).get();
      if (!doc.exists) throw new Error('الأوردر غير موجود');
      const order = doc.data();
      if (order.status === 'cancelled') throw new Error('الأوردر ملغي بالفعل');

      const batch = db.batch();

      // Return stock
      for (const item of (order.items || [])) {
        const productDoc = await db.collection('products').doc(item.productId).get();
        if (productDoc.exists) {
          batch.update(db.collection('products').doc(item.productId), {
            quantity: (productDoc.data().quantity || 0) + item.quantity,
            updatedAt: new Date().toISOString()
          });
        }
      }

      // Cancel order
      batch.update(db.collection('orders').doc(id), { status: 'cancelled' });

      // Cancel installment plan
      if (order.paymentMethod === 'installment') {
        const planSnap = await db.collection('installmentPlans').where('orderId', '==', id).get();
        planSnap.docs.forEach(d => {
          batch.update(d.ref, { status: 'completed' });
        });
      }

      await batch.commit();
      return { message: 'تم إلغاء الأوردر' };
    }
  },

  // ========== Installments ==========
  installments: {
    async getAll(params = {}) {
      let snapshot = await db.collection('installmentPlans').orderBy('createdAt', 'desc').get();
      let plans = snapshot.docs.map(doc => {
        const data = { id: doc.id, ...doc.data() };
        const today = new Date().toISOString().split('T')[0];

        // Update overdue statuses in memory
        let overdueCount = 0;
        const payments = (data.payments || []).map(p => {
          if (p.status === 'pending' && p.dueDate < today) {
            p.status = 'overdue';
            overdueCount++;
          }
          return p;
        });

        const paidPayments = payments.filter(p => p.status === 'paid');
        const totalPaid = paidPayments.reduce((sum, p) => sum + (p.paidAmount || 0), 0);
        const pendingPayments = payments.filter(p => p.status === 'pending' || p.status === 'overdue');
        const nextDue = pendingPayments.length > 0 ? pendingPayments.sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0] : null;

        // Update in Firestore if overdue changed
        if (overdueCount > 0) {
          db.collection('installmentPlans').doc(doc.id).update({ payments });
        }

        return {
          ...data,
          payments,
          customer_name: data.customerName,
          customer_phone: data.customerPhone || '',
          order_number: data.orderNumber,
          order_id: data.orderId,
          total_amount: data.totalAmount,
          down_payment: data.downPayment,
          monthly_amount: data.monthlyAmount,
          num_months: data.numMonths,
          total_paid: totalPaid,
          overdue_count: overdueCount,
          next_due_date: nextDue ? nextDue.dueDate : null
        };
      });

      if (params.search) {
        const s = params.search.toLowerCase();
        plans = plans.filter(p =>
          (p.customer_name || '').toLowerCase().includes(s) ||
          (p.order_number || '').toLowerCase().includes(s)
        );
      }
      if (params.status) {
        plans = plans.filter(p => p.status === params.status);
      }

      return plans;
    },

    async getOne(id) {
      const doc = await db.collection('installmentPlans').doc(id).get();
      if (!doc.exists) throw new Error('خطة القسط غير موجودة');
      const data = { id: doc.id, ...doc.data() };

      return {
        ...data,
        customer_name: data.customerName,
        customer_phone: data.customerPhone || '',
        order_number: data.orderNumber,
        total_amount: data.totalAmount,
        down_payment: data.downPayment,
        monthly_amount: data.monthlyAmount,
        num_months: data.numMonths,
        payments: (data.payments || []).map(p => ({
          ...p,
          id: p.id,
          due_date: p.dueDate,
          paid_date: p.paidDate,
          paid_amount: p.paidAmount || 0
        }))
      };
    },

    async pay(planId, paymentId, payData) {
      const doc = await db.collection('installmentPlans').doc(planId).get();
      if (!doc.exists) throw new Error('خطة القسط غير موجودة');
      const plan = doc.data();

      const today = new Date().toISOString().split('T')[0];
      const payments = (plan.payments || []).map(p => {
        if (p.id === paymentId) {
          p.paidAmount = payData.amount || p.amount;
          p.paidDate = today;
          p.status = p.paidAmount >= p.amount ? 'paid' : 'partial';
        }
        return p;
      });

      // Check if all paid
      const allPaid = payments.every(p => p.status === 'paid');
      const updateData = { payments };
      if (allPaid) updateData.status = 'completed';

      await db.collection('installmentPlans').doc(planId).update(updateData);

      // Update order paid amount
      const paidTotal = payments.filter(p => p.status === 'paid' || p.status === 'partial')
        .reduce((sum, p) => sum + (p.paidAmount || 0), 0);
      const totalPaidWithDown = plan.downPayment + paidTotal;

      const orderUpdate = {
        paidAmount: totalPaidWithDown,
        remainingAmount: plan.totalAmount + plan.downPayment - totalPaidWithDown
      };
      if (allPaid) {
        orderUpdate.status = 'completed';
        orderUpdate.remainingAmount = 0;
      }

      await db.collection('orders').doc(plan.orderId).update(orderUpdate);

      return { message: 'تم تسجيل الدفعة' };
    },

    async getOverdue() {
      const plans = await this.getAll();
      return plans.filter(p => p.overdue_count > 0);
    }
  },

  // ========== Reports ==========
  reports: {
    async dashboard() {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = today.substring(0, 7) + '-01';
      const yearStart = today.substring(0, 4) + '-01-01';

      const ordersSnap = await db.collection('orders').get();
      const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(o => o.status !== 'cancelled');

      const todayOrders = allOrders.filter(o => (o.createdAt || '').startsWith(today));
      const monthOrders = allOrders.filter(o => (o.createdAt || '') >= monthStart);
      const yearOrders = allOrders.filter(o => (o.createdAt || '') >= yearStart);

      const sum = (arr, key) => arr.reduce((s, o) => s + (o[key] || 0), 0);

      // Products
      const productsSnap = await db.collection('products').get();
      const products = productsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const totalStock = sum(products, 'quantity');
      const lowStockProducts = products.filter(p => p.quantity <= (p.minStock || 5));

      // Installments overdue
      const plansSnap = await db.collection('installmentPlans').where('status', '==', 'active').get();
      let overdueCount = 0;
      let overdueTotal = 0;
      plansSnap.docs.forEach(d => {
        const plan = d.data();
        (plan.payments || []).forEach(p => {
          if ((p.status === 'pending' || p.status === 'overdue') && p.dueDate < today) {
            overdueCount++;
            overdueTotal += (p.amount - (p.paidAmount || 0));
          }
        });
      });

      // Last 7 days
      const last7 = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const ds = d.toISOString().split('T')[0];
        const dayOrders = allOrders.filter(o => (o.createdAt || '').startsWith(ds));
        last7.push({ day: ds, total: sum(dayOrders, 'totalAmount'), profit: sum(dayOrders, 'profit') });
      }

      // Product sales
      const productSalesMap = {};
      allOrders.forEach(o => {
        (o.items || []).forEach(item => {
          if (!productSalesMap[item.productName]) productSalesMap[item.productName] = 0;
          productSalesMap[item.productName] += item.total || 0;
        });
      });
      const productSales = Object.entries(productSalesMap)
        .map(([name, total]) => ({ product_name: name, total_sales: total }))
        .sort((a, b) => b.total_sales - a.total_sales)
        .slice(0, 6);

      // Recent orders
      const recentOrders = allOrders
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
        .slice(0, 10)
        .map(o => ({
          ...o,
          order_number: o.orderNumber,
          customer_name: o.customerName,
          payment_method: o.paymentMethod,
          total_amount: o.totalAmount,
          created_at: o.createdAt
        }));

      const cashOrders = allOrders.filter(o => o.paymentMethod === 'cash');
      const installmentOrders = allOrders.filter(o => o.paymentMethod === 'installment');

      return {
        today: { total: sum(todayOrders, 'totalAmount'), profit: sum(todayOrders, 'profit'), count: todayOrders.length },
        month: { total: sum(monthOrders, 'totalAmount'), profit: sum(monthOrders, 'profit'), count: monthOrders.length },
        year: { total: sum(yearOrders, 'totalAmount'), profit: sum(yearOrders, 'profit'), count: yearOrders.length },
        cashProfit: sum(cashOrders, 'profit'),
        installmentProfit: sum(installmentOrders, 'profit'),
        totalStock,
        lowStock: lowStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 10).map(p => ({ name: p.name, quantity: p.quantity, min_stock: p.minStock || 5 })),
        overdueInstallments: { count: overdueCount, total_overdue: overdueTotal },
        recentOrders,
        last7Days: last7,
        productSales,
        totalCustomers: (await db.collection('customers').get()).size,
        totalProducts: products.length
      };
    },

    async daily(date) {
      const targetDate = date || new Date().toISOString().split('T')[0];
      const ordersSnap = await db.collection('orders').get();
      const allOrders = ordersSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const orders = allOrders.filter(o => (o.createdAt || '').startsWith(targetDate) && o.status !== 'cancelled')
        .map(o => ({ ...o, order_number: o.orderNumber, customer_name: o.customerName, payment_method: o.paymentMethod, total_amount: o.totalAmount, created_at: o.createdAt }));

      const sum = (arr, key) => arr.reduce((s, o) => s + (o[key] || 0), 0);
      const cashOrders = orders.filter(o => o.paymentMethod === 'cash');
      const instOrders = orders.filter(o => o.paymentMethod === 'installment');

      // Expenses
      const expSnap = await db.collection('expenses').get();
      const expenses = expSnap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(e => e.expenseDate === targetDate);
      const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);

      return {
        date: targetDate,
        orders,
        summary: {
          total_orders: orders.length,
          total_sales: sum(orders, 'totalAmount'),
          total_cost: sum(orders, 'costAmount'),
          total_profit: sum(orders, 'profit'),
          cash_sales: sum(cashOrders, 'totalAmount'),
          installment_sales: sum(instOrders, 'totalAmount'),
          cash_profit: sum(cashOrders, 'profit'),
          installment_profit: sum(instOrders, 'profit')
        },
        expenses,
        totalExpenses,
        installmentPayments: [],
        totalInstallmentCollected: 0,
        netProfit: sum(orders, 'profit') - totalExpenses
      };
    },

    async monthly(year, month) {
      const y = year || new Date().getFullYear();
      const m = month || String(new Date().getMonth() + 1).padStart(2, '0');
      const monthStr = `${y}-${m}`;

      const ordersSnap = await db.collection('orders').get();
      const allOrders = ordersSnap.docs.map(d => d.data())
        .filter(o => (o.createdAt || '').startsWith(monthStr) && o.status !== 'cancelled');

      const sum = (arr, key) => arr.reduce((s, o) => s + (o[key] || 0), 0);

      // Group by day
      const dayMap = {};
      allOrders.forEach(o => {
        const day = (o.createdAt || '').split('T')[0];
        if (!dayMap[day]) dayMap[day] = [];
        dayMap[day].push(o);
      });

      const dailySummary = Object.entries(dayMap).sort().map(([day, dayOrders]) => ({
        day,
        total_orders: dayOrders.length,
        total_sales: sum(dayOrders, 'totalAmount'),
        total_profit: sum(dayOrders, 'profit'),
        cash_sales: sum(dayOrders.filter(o => o.paymentMethod === 'cash'), 'totalAmount'),
        installment_sales: sum(dayOrders.filter(o => o.paymentMethod === 'installment'), 'totalAmount')
      }));

      const cashOrders = allOrders.filter(o => o.paymentMethod === 'cash');
      const instOrders = allOrders.filter(o => o.paymentMethod === 'installment');

      const expSnap = await db.collection('expenses').get();
      const monthExpenses = expSnap.docs.map(d => d.data())
        .filter(e => (e.expenseDate || '').startsWith(monthStr))
        .reduce((s, e) => s + (e.amount || 0), 0);

      return {
        month: monthStr,
        dailySummary,
        total: {
          total_orders: allOrders.length,
          total_sales: sum(allOrders, 'totalAmount'),
          total_cost: sum(allOrders, 'costAmount'),
          total_profit: sum(allOrders, 'profit'),
          cash_profit: sum(cashOrders, 'profit'),
          installment_profit: sum(instOrders, 'profit')
        },
        totalExpenses: monthExpenses,
        netProfit: sum(allOrders, 'profit') - monthExpenses
      };
    },

    async yearly(year) {
      const y = year || new Date().getFullYear();
      const yearStr = String(y);

      const ordersSnap = await db.collection('orders').get();
      const allOrders = ordersSnap.docs.map(d => d.data())
        .filter(o => (o.createdAt || '').startsWith(yearStr) && o.status !== 'cancelled');

      const sum = (arr, key) => arr.reduce((s, o) => s + (o[key] || 0), 0);

      const monthMap = {};
      allOrders.forEach(o => {
        const month = (o.createdAt || '').substring(0, 7);
        if (!monthMap[month]) monthMap[month] = [];
        monthMap[month].push(o);
      });

      const monthlySummary = Object.entries(monthMap).sort().map(([month, mOrders]) => ({
        month,
        total_orders: mOrders.length,
        total_sales: sum(mOrders, 'totalAmount'),
        total_profit: sum(mOrders, 'profit'),
        cash_sales: sum(mOrders.filter(o => o.paymentMethod === 'cash'), 'totalAmount'),
        installment_sales: sum(mOrders.filter(o => o.paymentMethod === 'installment'), 'totalAmount')
      }));

      const cashOrders = allOrders.filter(o => o.paymentMethod === 'cash');
      const instOrders = allOrders.filter(o => o.paymentMethod === 'installment');

      const expSnap = await db.collection('expenses').get();
      const yearExpenses = expSnap.docs.map(d => d.data())
        .filter(e => (e.expenseDate || '').startsWith(yearStr))
        .reduce((s, e) => s + (e.amount || 0), 0);

      return {
        year: y,
        monthlySummary,
        total: {
          total_orders: allOrders.length,
          total_sales: sum(allOrders, 'totalAmount'),
          total_cost: sum(allOrders, 'costAmount'),
          total_profit: sum(allOrders, 'profit'),
          cash_profit: sum(cashOrders, 'profit'),
          installment_profit: sum(instOrders, 'profit')
        },
        totalExpenses: yearExpenses,
        netProfit: sum(allOrders, 'profit') - yearExpenses
      };
    },

    async addExpense(data) {
      const now = new Date().toISOString();
      await db.collection('expenses').add({
        description: data.description,
        amount: data.amount,
        category: data.category || 'عام',
        expenseDate: data.expense_date || now.split('T')[0],
        createdAt: now
      });
      return { message: 'تم إضافة المصروف' };
    },

    async deleteExpense(id) {
      await db.collection('expenses').doc(id).delete();
      return { message: 'تم حذف المصروف' };
    },

    async getSettings() {
      const doc = await db.collection('settings').doc('config').get();
      if (!doc.exists) {
        return { shop_name: 'معرض الرضا', shop_address: '', shop_phone: '', currency: 'ج.م' };
      }
      return doc.data();
    },

    async updateSettings(data) {
      await db.collection('settings').doc('config').set(data, { merge: true });
      return { message: 'تم تحديث الإعدادات' };
    }
  },

  // ========== Export ==========
  export: {
    async invoice(orderId) {
      const order = await API.orders.getOne(orderId);
      const settings = await API.reports.getSettings();

      return {
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
        items: order.items.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          total: item.total
        })),
        totals: {
          subtotal: order.total_amount + (order.discount || 0),
          discount: order.discount || 0,
          total: order.total_amount,
          paid: order.paid_amount,
          remaining: order.remaining_amount
        },
        installment: order.installment || null
      };
    },

    async productsExcel() {
      const products = await API.products.getAll();
      const wsData = [['الاسم', 'سعر البيع', 'التكلفة', 'الكمية', 'التصنيف', 'الحد الأدنى']];
      products.forEach(p => wsData.push([p.name, p.price, p.cost, p.quantity, p.category || '', p.minStock || 5]));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'المنتجات');
      XLSX.writeFile(wb, 'products.xlsx');
    },

    async ordersExcel() {
      const orders = await API.orders.getAll();
      const wsData = [['رقم الأوردر', 'العميل', 'الإجمالي', 'المكسب', 'طريقة الدفع', 'المدفوع', 'المتبقي', 'الحالة', 'التاريخ']];
      orders.forEach(o => wsData.push([
        o.order_number, o.customer_name, o.total_amount, o.profit,
        o.payment_method === 'cash' ? 'كاش' : 'قسط',
        o.paid_amount, o.remaining_amount,
        o.status === 'completed' ? 'مكتمل' : o.status === 'pending' ? 'قيد السداد' : 'ملغي',
        o.created_at
      ]));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'الأوردرات');
      XLSX.writeFile(wb, 'orders.xlsx');
    },

    async installmentsExcel() {
      const plans = await API.installments.getAll();
      const wsData = [['أوردر', 'العميل', 'الإجمالي', 'المقدم', 'القسط الشهري', 'الشهور', 'المدفوع', 'الحالة']];
      plans.forEach(p => wsData.push([
        p.order_number, p.customer_name, p.total_amount, p.down_payment,
        p.monthly_amount, p.num_months, p.total_paid,
        p.status === 'active' ? 'نشط' : p.status === 'completed' ? 'مكتمل' : 'متعثر'
      ]));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'الأقساط');
      XLSX.writeFile(wb, 'installments.xlsx');
    }
  }
};
