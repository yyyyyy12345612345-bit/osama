// Orders Page Component
const OrdersPage = {
  orderItems: [],

  async render(orderId) {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      if (orderId) {
        const order = await API.orders.getOne(orderId);
        content.innerHTML = `<div class="page-enter">${this.buildDetailHTML(order)}</div>`;
      } else {
        const orders = await API.orders.getAll();
        content.innerHTML = `<div class="page-enter">${this.buildHTML(orders)}</div>`;
      }
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(orders) {
    return `
      <div class="card-header" style="margin-bottom:20px;">
        <div class="filter-bar">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="orderSearch" placeholder="بحث برقم الأوردر أو اسم العميل..." oninput="OrdersPage.search()">
          </div>
          <select class="form-select" style="width:140px" id="orderPaymentFilter" onchange="OrdersPage.search()">
            <option value="">كل الدفع</option>
            <option value="cash">كاش</option>
            <option value="installment">قسط</option>
          </select>
          <select class="form-select" style="width:140px" id="orderStatusFilter" onchange="OrdersPage.search()">
            <option value="">كل الحالات</option>
            <option value="completed">مكتمل</option>
            <option value="pending">قيد السداد</option>
            <option value="cancelled">ملغي</option>
          </select>
          <a href="/api/export/orders/excel" class="btn btn-ghost" target="_blank">📥 Excel</a>
        </div>
        <button class="btn btn-primary" onclick="OrdersPage.openCreateModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          أوردر جديد
        </button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>رقم الأوردر</th>
                <th>العميل</th>
                <th>الإجمالي</th>
                <th>المكسب</th>
                <th>الدفع</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>الحالة</th>
                <th>التاريخ</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="ordersTableBody">
              ${this.renderRows(orders)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(orders) {
    if (orders.length === 0) {
      return '<tr><td colspan="10" class="text-center text-muted" style="padding:40px;">لا توجد أوردرات</td></tr>';
    }
    return orders.map(o => `
      <tr>
        <td><a href="#/orders/${o.id}" class="text-blue text-bold">${o.order_number}</a></td>
        <td>${o.customer_name}</td>
        <td class="text-bold">${Format.currency(o.total_amount)}</td>
        <td class="text-green">${Format.currency(o.profit)}</td>
        <td>${Format.paymentMethod(o.payment_method)}</td>
        <td class="text-green">${Format.currency(o.paid_amount)}</td>
        <td>${o.remaining_amount > 0 ? `<span class="text-red">${Format.currency(o.remaining_amount)}</span>` : '<span class="text-muted">-</span>'}</td>
        <td>${Format.orderStatus(o.status)}</td>
        <td class="text-muted">${Format.dateShort(o.created_at)}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn-icon" title="فاتورة" onclick="Invoice.generate('${o.id}')">🧾</button>
            ${o.status !== 'cancelled' ? `<button class="btn-icon danger" title="إلغاء" onclick="OrdersPage.cancelOrder('${o.id}')">❌</button>` : ''}
          </div>
        </td>
      </tr>
    `).join('');
  },

  buildDetailHTML(order) {
    return `
      <div style="margin-bottom:16px;">
        <button class="btn btn-ghost" onclick="window.location.hash='#/orders'">→ رجوع للأوردرات</button>
      </div>

      <div class="card mb-24">
        <div class="card-header">
          <div class="card-title">📋 أوردر ${order.order_number}</div>
          <div class="flex gap-8">
            <button class="btn btn-sm btn-primary" onclick="Invoice.generate(${order.id})">🧾 تنزيل فاتورة</button>
            ${order.status !== 'cancelled' ? `<button class="btn btn-sm btn-danger" onclick="OrdersPage.cancelOrder(${order.id})">❌ إلغاء</button>` : ''}
          </div>
        </div>

        <div class="grid-2">
          <div>
            <h4 style="margin-bottom:12px;color:var(--text-muted)">بيانات العميل</h4>
            <p><strong>الاسم:</strong> ${order.customer_name}</p>
            <p><strong>التليفون:</strong> ${order.customer_phone || '-'}</p>
            <p><strong>العنوان:</strong> ${order.customer_address || '-'}</p>
            <p><strong>العربية:</strong> ${order.vehicle_type || '-'} - ${order.vehicle_plate || '-'}</p>
          </div>
          <div>
            <h4 style="margin-bottom:12px;color:var(--text-muted)">بيانات الأوردر</h4>
            <p><strong>الحالة:</strong> ${Format.orderStatus(order.status)}</p>
            <p><strong>طريقة الدفع:</strong> ${Format.paymentMethod(order.payment_method)}</p>
            <p><strong>التاريخ:</strong> ${Format.dateTime(order.created_at)}</p>
            <p><strong>ملاحظات:</strong> ${order.notes || '-'}</p>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="card-title mb-16">📦 المنتجات</div>
        <div class="table-container">
          <table>
            <thead><tr><th>المنتج</th><th>الكمية</th><th>سعر القطعة</th><th>الإجمالي</th></tr></thead>
            <tbody>
              ${order.items.map(item => `
                <tr>
                  <td class="text-bold">${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${Format.currency(item.unit_price)}</td>
                  <td class="text-bold">${Format.currency(item.total)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--border-color);">
          <div class="flex-between mb-16">
            <span>الإجمالي:</span>
            <span class="text-bold" style="font-size:1.2rem">${Format.currency(order.total_amount)}</span>
          </div>
          ${order.discount > 0 ? `<div class="flex-between mb-16"><span>الخصم:</span><span class="text-red">- ${Format.currency(order.discount)}</span></div>` : ''}
          <div class="flex-between mb-16">
            <span>التكلفة:</span><span class="text-muted">${Format.currency(order.cost_amount)}</span>
          </div>
          <div class="flex-between mb-16">
            <span>المكسب:</span><span class="text-green text-bold" style="font-size:1.1rem">${Format.currency(order.profit)}</span>
          </div>
          <div class="flex-between mb-16">
            <span>المدفوع:</span><span class="text-green">${Format.currency(order.paid_amount)}</span>
          </div>
          ${order.remaining_amount > 0 ? `<div class="flex-between"><span>المتبقي:</span><span class="text-red text-bold">${Format.currency(order.remaining_amount)}</span></div>` : ''}
        </div>
      </div>

      ${order.installment ? `
        <div class="card">
          <div class="card-title mb-16">💳 جدول الأقساط</div>
          <div style="margin-bottom:16px;">
            <span class="badge badge-info">المقدم: ${Format.currency(order.installment.down_payment)}</span>
            <span class="badge badge-purple" style="margin-right:8px;">القسط: ${Format.currency(order.installment.monthly_amount)}/شهر</span>
            <span class="badge badge-muted" style="margin-right:8px;">${order.installment.num_months} شهر</span>
          </div>
          <div class="payment-timeline">
            ${order.installment.payments.map((p, i) => `
              <div class="payment-item">
                <div class="payment-status-dot ${p.status}"></div>
                <div class="payment-info">
                  <div>قسط ${i + 1}</div>
                  <div class="payment-date">${Format.dateShort(p.due_date)}</div>
                </div>
                <div class="payment-amount">${Format.currency(p.amount)}</div>
                <div>${Format.paymentStatus(p.status)}</div>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },

  async openCreateModal() {
    this.orderItems = [];
    let products = [];
    try {
      products = await API.products.getAll();
      this.customers = await API.customers.getAll();
    } catch (err) { App.showToast(err.message, 'error'); return; }

    App.openModal('إنشاء أوردر جديد', `
      <form id="createOrderForm" onsubmit="OrdersPage.createOrder(event)">
        <!-- اختيار العميل -->
        <div class="form-group">
          <label class="form-label">العميل *</label>
          <div class="flex gap-8">
            <input list="customersDatalist" class="form-input" id="orderCustomerInput" placeholder="ابحث باسم العميل أو رقم التليفون..." required style="flex:1" autocomplete="off">
            <datalist id="customersDatalist">
              ${this.customers.map(c => `<option value="${c.name} - ${c.phone || ''}"></option>`).join('')}
            </datalist>
            <button type="button" class="btn btn-ghost" onclick="CustomersPage.openAddModal()">+ جديد</button>
          </div>
        </div>

        <!-- إضافة منتجات -->
        <div class="form-group">
          <label class="form-label">المنتجات *</label>
          <div class="flex gap-8 mb-16">
            <select class="form-select" id="addProductSelect" style="flex:2">
              <option value="">اختر منتج...</option>
              ${products.filter(p => p.quantity > 0).map(p => `<option value="${p.id}" data-cost="${p.cost}" data-max="${p.quantity}">${p.name} - متاح: ${p.quantity}</option>`).join('')}
            </select>
            <input type="number" class="form-input" id="addProductPrice" min="0" step="0.01" style="width:100px" placeholder="سعر البيع">
            <input type="number" class="form-input" id="addProductQty" value="1" min="1" style="width:80px" placeholder="كمية">
            <button type="button" class="btn btn-ghost" onclick="OrdersPage.showProductCost()" title="عرض التكلفة">👁️</button>
            <button type="button" class="btn btn-success" onclick="OrdersPage.addItem()">إضافة</button>
          </div>
          <div id="orderItemsList" class="order-items-list"></div>
          <div id="orderItemsTotal" style="text-align:left;font-size:1.1rem;font-weight:700;margin-top:8px;"></div>
        </div>

        <!-- طريقة الدفع -->
        <div class="form-group">
          <label class="form-label">طريقة الدفع *</label>
          <select class="form-select" name="payment_method" id="paymentMethodSelect" required onchange="OrdersPage.toggleInstallment()">
            <option value="cash">كاش</option>
            <option value="installment">قسط</option>
          </select>
        </div>

        <!-- بيانات القسط -->
        <div id="installmentFields" style="display:none;">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">المقدم</label>
              <input type="number" class="form-input" id="down_payment" name="down_payment" min="0" value="0" oninput="OrdersPage.calcInstallment(OrdersPage.lastCalcMode || 'months')">
            </div>
            <div class="form-group">
              <label class="form-label">عدد الشهور</label>
              <input type="number" class="form-input" id="num_months" name="num_months" min="1" value="1" oninput="OrdersPage.calcInstallment('months')">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">القسط الشهري</label>
              <input type="number" class="form-input" id="monthly_amount" name="monthly_amount" min="0" value="0" oninput="OrdersPage.calcInstallment('amount')">
            </div>
            <div class="form-group">
              <label class="form-label">الحالة</label>
              <div id="installmentCalc" style="padding:10px;background:var(--bg-input);border-radius:8px;font-size:0.9rem;color:var(--text-secondary);"></div>
            </div>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">خصم</label>
          <input type="number" class="form-input" name="discount" min="0" value="0">
        </div>

        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <textarea class="form-textarea" name="notes" rows="2"></textarea>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary">إنشاء الأوردر</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
        </div>
      </form>
    `, 'wide');
  },

  showProductCost() {
    const select = document.getElementById('addProductSelect');
    if (!select.value) return App.showToast('اختر منتج أولاً', 'warning');
    const option = select.options[select.selectedIndex];
    const cost = parseFloat(option.dataset.cost || 0);
    App.showToast('التكلفة: ' + Format.currency(cost), 'info');
  },

  addItem() {
    const select = document.getElementById('addProductSelect');
    const priceInput = document.getElementById('addProductPrice');
    const qtyInput = document.getElementById('addProductQty');
    if (!select.value) return App.showToast('اختر منتج', 'warning');
    
    const price = parseFloat(priceInput.value);
    if (isNaN(price) || price <= 0) return App.showToast('أدخل سعر البيع', 'warning');

    const option = select.options[select.selectedIndex];
    const productId = option.value;
    const qty = parseInt(qtyInput.value) || 1;
    const maxQty = parseInt(option.dataset.max) || 0;
    const name = option.text.split('-')[0].trim();

    // Check if already added
    const existing = this.orderItems.find(i => i.product_id === productId);
    if (existing) {
      if (existing.quantity + qty > maxQty) {
        return App.showToast(`الكمية المتاحة: ${maxQty}`, 'error');
      }
      existing.quantity += qty;
    } else {
      if (qty > maxQty) {
        return App.showToast(`الكمية المتاحة: ${maxQty}`, 'error');
      }
      this.orderItems.push({ product_id: productId, name, quantity: qty, price, maxQty });
    }

    this.renderOrderItems();
    select.value = '';
    qtyInput.value = 1;
    priceInput.value = '';
  },

  removeItem(index) {
    this.orderItems.splice(index, 1);
    this.renderOrderItems();
  },

  renderOrderItems() {
    const list = document.getElementById('orderItemsList');
    const totalDiv = document.getElementById('orderItemsTotal');
    let total = 0;

    list.innerHTML = this.orderItems.map((item, i) => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      return `
        <div class="order-item-row">
          <span class="item-name">${item.name}</span>
          <span class="item-qty">${item.quantity} ×</span>
          <span class="item-price">${Format.currency(item.price)}</span>
          <span class="item-price">${Format.currency(itemTotal)}</span>
          <button type="button" class="btn-icon danger" onclick="OrdersPage.removeItem(${i})">✕</button>
        </div>
      `;
    }).join('');

    totalDiv.innerHTML = this.orderItems.length > 0 ? `الإجمالي: <span class="text-gold">${Format.currency(total)}</span>` : '';
    this.calcInstallment();
  },

  toggleInstallment() {
    const method = document.getElementById('paymentMethodSelect').value;
    document.getElementById('installmentFields').style.display = method === 'installment' ? 'block' : 'none';
  },

  calcInstallment(mode = 'months') {
    const calc = document.getElementById('installmentCalc');
    if (!calc) return;
    this.lastCalcMode = mode;

    const form = document.getElementById('createOrderForm');
    const total = this.orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0) - (parseFloat(form.discount.value) || 0);
    const down = parseFloat(form.down_payment.value) || 0;
    const remaining = Math.max(0, total - down);

    let months = parseInt(form.num_months.value) || 1;
    let monthly = parseFloat(form.monthly_amount.value) || 0;

    if (mode === 'months') {
      monthly = remaining > 0 ? remaining / months : 0;
      monthly = Math.round(monthly * 100) / 100;
      form.monthly_amount.value = monthly;
    } else if (mode === 'amount') {
      if (monthly > 0) {
        months = Math.ceil(remaining / monthly);
      } else {
        months = 1;
      }
      form.num_months.value = months;
    }

    if (months > 0) {
      const lastMonthDiff = remaining - (monthly * (months - 1));
      let detailHtml = `القسط: <strong>${Format.currency(monthly)}</strong> شهرياً`;
      if (Math.abs(lastMonthDiff - monthly) > 1 && mode === 'amount' && months > 1) {
         detailHtml += `<br><span style="font-size:0.85rem;color:var(--text-muted)">*الشهر الأخير سيكون ${Format.currency(lastMonthDiff)}</span>`;
      }

      calc.innerHTML = `
        المتبقي: <strong>${Format.currency(remaining)}</strong><br>
        ${detailHtml}<br>
        <span class="text-green">✅ سيتم تقسيم المبلغ على ${months} شهور</span>
      `;
    } else {
      calc.innerHTML = 'حدد القسط الشهري وعدد الشهور';
    }
  },

  async createOrder(e) {
    e.preventDefault();
    if (this.orderItems.length === 0) return App.showToast('أضف منتج واحد على الأقل', 'error');

    const form = e.target;
    const customerInput = document.getElementById('orderCustomerInput').value;
    const selectedCustomer = this.customers.find(c => `${c.name} - ${c.phone || ''}` === customerInput);
    
    if (!selectedCustomer) {
      return App.showToast('برجاء اختيار عميل صحيح من القائمة', 'error');
    }

    const data = {
      customer_id: selectedCustomer.id,
      items: this.orderItems.map(i => ({ product_id: i.product_id, quantity: i.quantity, price: i.price })),
      payment_method: form.payment_method.value,
      discount: parseFloat(form.discount.value) || 0,
      notes: form.notes.value
    };

    if (data.payment_method === 'installment') {
      data.down_payment = parseFloat(form.down_payment.value) || 0;
      data.monthly_amount = parseFloat(form.monthly_amount.value) || 0;
      data.num_months = parseInt(form.num_months.value) || 1;
    }

    try {
      const order = await API.orders.create(data);
      App.closeModal();
      App.showToast(`تم إنشاء الأوردر ${order.order_number} بنجاح`, 'success');
      this.orderItems = [];
      this.render();
    } catch (err) {
      App.showToast(err.message, 'error');
    } finally {
      App.setLoading(btn, false);
    }
  },

  async cancelOrder(id) {
    if (!confirm('هل أنت متأكد من إلغاء هذا الأوردر؟ سيتم إرجاع المنتجات للمخزون.')) return;
    try {
      await API.orders.cancel(id);
      App.showToast('تم إلغاء الأوردر', 'success');
      this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async search() {
    const query = document.getElementById('orderSearch').value;
    const payment = document.getElementById('orderPaymentFilter').value;
    const status = document.getElementById('orderStatusFilter').value;
    try {
      const orders = await API.orders.getAll({ search: query, payment_method: payment, status });
      document.getElementById('ordersTableBody').innerHTML = this.renderRows(orders);
    } catch (err) { /* ignore */ }
  }
};
