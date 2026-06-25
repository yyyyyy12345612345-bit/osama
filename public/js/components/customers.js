// Customers Page Component
const CustomersPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const customers = await API.customers.getAll();
      content.innerHTML = `<div class="page-enter">${this.buildHTML(customers)}</div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(customers) {
    return `
      <div class="card-header" style="margin-bottom:20px;">
        <div class="filter-bar">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="customerSearch" placeholder="بحث بالاسم أو التليفون أو اللوحة..." oninput="CustomersPage.search()">
          </div>
        </div>
        <button class="btn btn-primary" onclick="CustomersPage.openAddModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة عميل
        </button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>التليفون</th>
                <th>نوع العربية</th>
                <th>اللوحة</th>
                <th>الأوردرات</th>
                <th>إجمالي المشتريات</th>
                <th>أقساط نشطة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="customersTableBody">
              ${this.renderRows(customers)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(customers) {
    if (customers.length === 0) {
      return '<tr><td colspan="8" class="text-center text-muted" style="padding:40px;">لا يوجد عملاء بعد</td></tr>';
    }
    return customers.map(c => `
      <tr>
        <td class="text-bold" style="cursor:pointer" onclick="CustomersPage.viewCustomer('${c.id}')">${c.name}</td>
        <td>${c.phone || '-'}</td>
        <td class="text-muted">${c.vehicle_type || '-'}</td>
        <td class="text-muted">${c.vehicle_plate || '-'}</td>
        <td><span class="badge badge-info">${c.total_orders || 0}</span></td>
        <td class="text-bold">${Format.currency(c.total_spent || 0)}</td>
        <td>${c.active_installments > 0 ? `<span class="badge badge-warning">${c.active_installments}</span>` : '<span class="text-muted">-</span>'}</td>
        <td>
          <div class="flex gap-8">
            <button class="btn-icon" title="عرض" onclick="CustomersPage.viewCustomer('${c.id}')">👁️</button>
            <button class="btn-icon edit" title="تعديل" onclick="CustomersPage.openEditModal('${c.id}')">✏️</button>
            <button class="btn-icon danger" title="حذف" onclick="CustomersPage.deleteCustomer('${c.id}', '${c.name}')">🗑️</button>
          </div>
        </td>
      </tr>
    `).join('');
  },

  openAddModal() {
    App.openModal('إضافة عميل جديد', `
      <form onsubmit="CustomersPage.addCustomer(event)">
        <div class="form-group">
          <label class="form-label">اسم العميل *</label>
          <input type="text" class="form-input" name="name" required>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">رقم التليفون</label>
            <input type="text" class="form-input" name="phone" placeholder="01xxxxxxxxx">
          </div>
          <div class="form-group">
            <label class="form-label">تليفون احتياطي</label>
            <input type="text" class="form-input" name="phone2">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">العنوان</label>
          <input type="text" class="form-input" name="address">
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label">رقم البطاقة</label>
            <input type="text" class="form-input" name="national_id">
          </div>
          <div class="form-group">
            <label class="form-label">ملاحظات</label>
            <input type="text" class="form-input" name="notes">
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ العميل</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
        </div>
      </form>
    `);
  },

  async addCustomer(e) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    App.setLoading(btn, true);

    try {
      await API.customers.create({
        name: form.name.value, phone: form.phone.value, phone2: form.phone2.value,
        address: form.address.value, national_id: form.national_id.value,
        notes: form.notes.value
      });
      App.closeModal();
      App.showToast('تم إضافة العميل بنجاح', 'success');
      this.render();
    } catch (err) { 
      App.showToast(err.message, 'error'); 
      App.setLoading(btn, false);
    }
  },

  async openEditModal(id) {
    try {
      const c = await API.customers.getOne(id);
      App.openModal('تعديل بيانات العميل', `
        <form onsubmit="CustomersPage.updateCustomer(event, ${id})">
          <div class="form-group">
            <label class="form-label">اسم العميل *</label>
            <input type="text" class="form-input" name="name" required value="${c.name}">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">رقم التليفون</label>
              <input type="text" class="form-input" name="phone" value="${c.phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">تليفون احتياطي</label>
              <input type="text" class="form-input" name="phone2" value="${c.phone2 || ''}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">العنوان</label>
            <input type="text" class="form-input" name="address" value="${c.address || ''}">
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">رقم البطاقة</label>
              <input type="text" class="form-input" name="national_id" value="${c.national_id || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">ملاحظات</label>
              <input type="text" class="form-input" name="notes" value="${c.notes || ''}">
            </div>
          </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">حفظ</button>
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
          </div>
        </form>
      `);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async updateCustomer(e, id) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    App.setLoading(btn, true);

    try {
      await API.customers.update(id, {
        name: form.name.value,
        phone: form.phone.value,
        address: form.address.value,
        notes: form.notes.value
      });
      App.closeModal();
      App.showToast('تم تعديل بيانات العميل', 'success');
      this.render();
    } catch (err) { 
      App.showToast(err.message, 'error'); 
      App.setLoading(btn, false);
    }
  },

  async viewCustomer(id) {
    try {
      const c = await API.customers.getOne(id);
      App.openModal(`ملف العميل - ${c.name}`, `
        <div style="margin-bottom:20px;">
          <div class="form-row" style="margin-bottom:12px;">
            <div><strong>التليفون:</strong> ${c.phone || '-'}</div>
            <div><strong>تليفون 2:</strong> ${c.phone2 || '-'}</div>
          </div>
          <div class="form-row" style="margin-bottom:12px;">
            <div><strong>العنوان:</strong> ${c.address || '-'}</div>
            <div><strong>البطاقة:</strong> ${c.national_id || '-'}</div>
          </div>
          <div class="form-row">
            <div><strong>العربية:</strong> ${c.vehicle_type || '-'}</div>
            <div><strong>اللوحة:</strong> ${c.vehicle_plate || '-'}</div>
          </div>
        </div>

        <h4 style="margin-bottom:12px;">📋 الأوردرات (${c.orders.length})</h4>
        <div class="table-container" style="margin-bottom:20px;">
          <table>
            <thead><tr><th>رقم</th><th>الإجمالي</th><th>الدفع</th><th>الحالة</th><th>التاريخ</th><th>إجراء</th></tr></thead>
            <tbody>
              ${c.orders.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">لا توجد أوردرات</td></tr>' :
                c.orders.map(o => `
                  <tr>
                    <td class="text-blue">${o.order_number}</td>
                    <td class="text-bold">${Format.currency(o.total_amount)}</td>
                    <td>${Format.paymentMethod(o.payment_method)}</td>
                    <td>${Format.orderStatus(o.status)}</td>
                    <td class="text-muted">${Format.dateShort(o.created_at)}</td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="Invoice.generate('${o.id}')" title="طباعة الفاتورة">🧾</button>
                    </td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>

        ${c.installments.length > 0 ? `
          <h4 style="margin-bottom:12px;">💳 الأقساط (${c.installments.length})</h4>
          <div class="table-container">
            <table>
              <thead><tr><th>أوردر</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th><th>إجراء</th></tr></thead>
              <tbody>
                ${c.installments.map(ip => `
                  <tr>
                    <td class="text-blue">${ip.order_number}</td>
                    <td>${Format.currency(ip.total_amount)}</td>
                    <td class="text-green">${Format.currency(ip.total_paid)}</td>
                    <td class="text-red">${Format.currency(ip.total_amount - ip.total_paid)}</td>
                    <td>${Format.installmentStatus(ip.status)}</td>
                    <td>
                      <button class="btn btn-sm btn-ghost" onclick="Invoice.generate('${ip.orderId}')" title="طباعة الفاتورة">🧾</button>
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}
      `, 'wide');
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteCustomer(id, name) {
    if (!confirm(`هل أنت متأكد من حذف "${name}"؟`)) return;
    try {
      await API.customers.delete(id);
      App.showToast('تم حذف العميل', 'success');
      this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async search() {
    const query = document.getElementById('customerSearch').value;
    try {
      const customers = await API.customers.getAll({ search: query });
      document.getElementById('customersTableBody').innerHTML = this.renderRows(customers);
    } catch (err) { /* ignore */ }
  }
};
