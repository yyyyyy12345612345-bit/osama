// Products Page Component
const ProductsPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const products = await API.products.getAll();
      content.innerHTML = `<div class="page-enter">${this.buildHTML(products)}</div>`;
      this.attachEvents();
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(products) {
    return `
      <div class="card-header" style="margin-bottom:20px;">
        <div class="filter-bar">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="productSearch" placeholder="بحث بالاسم..." oninput="ProductsPage.search()">
          </div>
          <button class="btn btn-ghost" onclick="ProductsPage.filterLowStock()">📦 مخزون منخفض</button>
          <a href="/api/export/products/excel" class="btn btn-ghost" target="_blank">📥 تصدير Excel</a>
        </div>
        <button class="btn btn-primary" onclick="ProductsPage.openAddModal()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          إضافة منتج
        </button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>اسم المنتج</th>
                <th>التصنيف</th>
                <th>التكلفة</th>
                <th>الكمية</th>
                <th>الحد الأدنى</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="productsTableBody">
              ${this.renderRows(products)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(products) {
    if (products.length === 0) {
      return '<tr><td colspan="8" class="text-center text-muted" style="padding:40px;">لا توجد منتجات بعد - اضغط "إضافة منتج" للبدء</td></tr>';
    }
    return products.map(p => {
      const profit = p.price - p.cost;
      const isLow = p.quantity <= (p.minStock || 5);
      return `
        <tr>
          <td class="text-bold">${p.name}</td>
          <td class="text-muted">${p.category || '-'}</td>
          <td>
            <span class="cost-value" style="display:none">${Format.currency(p.cost)}</span>
            <span class="cost-hidden">***</span>
            <button class="btn-icon" onclick="const el = this.previousElementSibling; const val = el.previousElementSibling; if(val.style.display==='none'){val.style.display='inline'; el.style.display='none';}else{val.style.display='none'; el.style.display='inline';}">👁️</button>
          </td>
          <td>
            <span class="${isLow ? 'badge badge-danger' : ''}" style="${isLow ? '' : 'font-weight:600'}">${p.quantity}</span>
          </td>
          <td class="text-muted">${p.minStock || 5}</td>
          <td>
            <div class="flex gap-8">
              <button class="btn-icon edit" title="تعديل" onclick="ProductsPage.openEditModal('${p.id}')">✏️</button>
              <button class="btn-icon danger" title="حذف" onclick="ProductsPage.deleteProduct('${p.id}', '${p.name}')">🗑️</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    App.openModal('إضافة منتج جديد', `
      <form id="addProductForm" onsubmit="ProductsPage.addProduct(event)">
        <div class="form-group">
          <label class="form-label">اسم المنتج *</label>
          <input type="text" class="form-input" name="name" required placeholder="مثال: كاوتيش 12.00 - دفعة يناير">
        </div>
        <div class="form-row">
          <div class="form-group" style="position:relative">
            <label class="form-label">التكلفة (سعر الشراء) *</label>
            <input type="password" class="form-input" name="cost" required min="0" step="0.01" placeholder="0">
            <button type="button" style="position:absolute; left:10px; top:35px; background:none; border:none; cursor:pointer;" onclick="const inp = this.previousElementSibling; inp.type = inp.type === 'password' ? 'text' : 'password'">👁️</button>
          </div>
          <div class="form-group">
            <label class="form-label">الكمية</label>
            <input type="number" class="form-input" name="quantity" min="0" value="0">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">التصنيف (مقاس)</label>
            <input type="text" class="form-input" name="category" placeholder="مثال: 12.00">
          </div>
          <div class="form-group">
            <label class="form-label">الحد الأدنى للمخزون</label>
            <input type="number" class="form-input" name="min_stock" min="0" value="5">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <input type="text" class="form-input" name="notes" placeholder="اختياري">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ المنتج</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
        </div>
      </form>
    `);
  },

  async addProduct(e) {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value,
      price: 0,
      cost: parseFloat(form.cost.value),
      quantity: parseInt(form.quantity.value) || 0,
      category: form.category.value,
      min_stock: parseInt(form.min_stock.value) || 5,
      notes: form.notes.value
    };

    const btn = form.querySelector('button[type="submit"]');
    App.setLoading(btn, true);
    try {
      await API.products.create(data);
      App.closeModal();
      App.showToast('تم إضافة المنتج بنجاح', 'success');
      this.render();
    } catch (err) { 
      App.showToast(err.message, 'error'); 
      App.setLoading(btn, false);
    }
  },

  async openEditModal(id) {
    try {
      const p = await API.products.getOne(id);
      App.openModal('تعديل المنتج', `
        <form onsubmit="ProductsPage.updateProduct(event, ${id})">
          <div class="form-group">
            <label class="form-label">اسم المنتج *</label>
            <input type="text" class="form-input" name="name" required value="${p.name}">
          </div>
          <div class="form-row">
          <div class="form-group" style="position:relative">
            <label class="form-label">التكلفة (سعر الشراء) *</label>
            <input type="password" class="form-input" name="cost" required min="0" step="0.01" value="${p.cost}">
            <button type="button" style="position:absolute; left:10px; top:35px; background:none; border:none; cursor:pointer;" onclick="const inp = this.previousElementSibling; inp.type = inp.type === 'password' ? 'text' : 'password'">👁️</button>
          </div>
          <div class="form-group">
            <label class="form-label">الكمية</label>
            <input type="number" class="form-input" name="quantity" min="0" value="${p.quantity}">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">التصنيف (مقاس)</label>
            <input type="text" class="form-input" name="category" value="${p.category || ''}">
          </div>
          <div class="form-group">
            <label class="form-label">الحد الأدنى للمخزون</label>
            <input type="number" class="form-input" name="min_stock" min="0" value="${p.min_stock || 5}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">ملاحظات</label>
          <input type="text" class="form-input" name="notes" value="${p.notes || ''}">
        </div>
          <div class="form-actions">
            <button type="submit" class="btn btn-primary">حفظ التعديلات</button>
            <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
          </div>
        </form>
      `);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async updateProduct(e, id) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    App.setLoading(btn, true);
    try {
      await API.products.update(id, {
        name: form.name.value,
        cost: parseFloat(form.cost.value),
        quantity: parseInt(form.quantity.value),
        category: form.category.value,
        minStock: parseInt(form.min_stock.value),
        notes: form.notes.value
      });
      App.closeModal();
      App.showToast('تم تعديل المنتج', 'success');
      this.render();
    } catch (err) { 
      App.showToast(err.message, 'error'); 
      App.setLoading(btn, false);
    }
  },

  openAddStockModal(id, name) {
    App.openModal(`إضافة مخزون - ${name}`, `
      <form onsubmit="ProductsPage.addStock(event, ${id})">
        <div class="form-group">
          <label class="form-label">الكمية المضافة</label>
          <input type="number" class="form-input" name="quantity" required min="1" placeholder="أدخل الكمية">
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-success">إضافة</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
        </div>
      </form>
    `);
  },

  async addStock(e, id) {
    e.preventDefault();
    try {
      await API.products.addStock(id, parseInt(e.target.quantity.value));
      App.closeModal();
      App.showToast('تم إضافة المخزون', 'success');
      this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteProduct(id, name) {
    if (!confirm(`هل أنت متأكد من حذف ${name}؟\nلن تتمكن من استرجاع البيانات.`)) return;
    
    // Add loading effect to row
    document.getElementById('contentArea').style.opacity = '0.5';
    
    try {
      await API.products.delete(id);
      App.showToast('تم حذف المنتج', 'success');
      this.render();
    } catch (err) { 
      App.showToast(err.message, 'error'); 
      document.getElementById('contentArea').style.opacity = '1';
    }
  },

  async search() {
    const query = document.getElementById('productSearch').value;
    try {
      const products = await API.products.getAll({ search: query });
      document.getElementById('productsTableBody').innerHTML = this.renderRows(products);
    } catch (err) { /* ignore */ }
  },

  async filterLowStock() {
    try {
      const products = await API.products.getAll({ low_stock: 'true' });
      document.getElementById('productsTableBody').innerHTML = this.renderRows(products);
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  attachEvents() {}
};
