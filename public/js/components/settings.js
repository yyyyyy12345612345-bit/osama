// Settings Page Component
const SettingsPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const settings = await API.reports.getSettings();
      content.innerHTML = `<div class="page-enter">${this.buildHTML(settings)}</div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(settings) {
    return `
      <div class="grid-2">
        <div class="card">
          <div class="card-title mb-16">🏪 بيانات المحل</div>
          <form onsubmit="SettingsPage.saveSettings(event)">
            <div class="form-group">
              <label class="form-label">اسم المحل</label>
              <input type="text" class="form-input" name="shop_name" value="${settings.shop_name || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">العنوان</label>
              <input type="text" class="form-input" name="shop_address" value="${settings.shop_address || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">رقم التليفون</label>
              <input type="text" class="form-input" name="shop_phone" value="${settings.shop_phone || ''}">
            </div>
            <div class="form-group">
              <label class="form-label">العملة</label>
              <input type="text" class="form-input" name="currency" value="${settings.currency || 'ج.م'}">
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn-primary">حفظ الإعدادات</button>
            </div>
          </form>
        </div>

        <div>
          <div class="card mb-24">
            <div class="card-title mb-16">💾 قاعدة البيانات</div>
            <div class="db-status mb-16">
              <span class="status-dot online"></span>
              <span>SQLite محلي - متصل ✅</span>
            </div>
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:12px;">
              ملف الداتابيز: <code>data.db</code> موجود على جهازك
            </p>
            <div id="firebaseStatus" class="db-status">
              <span class="status-dot" id="fbDot"></span>
              <span id="fbText">جاري الاتصال بـ Firebase...</span>
            </div>
          </div>

          <div class="card">
            <div class="card-title mb-16">ℹ️ معلومات السيستم</div>
            <div style="font-size:0.85rem;color:var(--text-secondary);line-height:2;">
              <p>📦 الإصدار: 1.0.0</p>
              <p>🗄️ قاعدة بيانات: SQLite + Firebase Backup</p>
              <p>🚛 سيستم إدارة كاوتيش عربيات النقل</p>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  async saveSettings(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.reports.updateSettings({
        shop_name: form.shop_name.value,
        shop_address: form.shop_address.value,
        shop_phone: form.shop_phone.value,
        currency: form.currency.value
      });
      App.showToast('تم حفظ الإعدادات بنجاح', 'success');
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};
