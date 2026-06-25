// Reports Page Component
const ReportsPage = {
  currentTab: 'daily',

  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = `<div class="page-enter">
      <div class="tabs mb-24">
        <div class="tab ${this.currentTab === 'daily' ? 'active' : ''}" onclick="ReportsPage.switchTab('daily')">📅 يومي</div>
        <div class="tab ${this.currentTab === 'monthly' ? 'active' : ''}" onclick="ReportsPage.switchTab('monthly')">📆 شهري</div>
        <div class="tab ${this.currentTab === 'yearly' ? 'active' : ''}" onclick="ReportsPage.switchTab('yearly')">📊 سنوي</div>
        <div class="tab ${this.currentTab === 'expenses' ? 'active' : ''}" onclick="ReportsPage.switchTab('expenses')">💸 المصاريف</div>
      </div>
      <div id="reportContent"><div class="loading"><div class="spinner"></div></div></div>
    </div>`;

    this.loadTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab:nth-child(${['daily', 'monthly', 'yearly', 'expenses'].indexOf(tab) + 1})`).classList.add('active');
    this.loadTab();
  },

  async loadTab() {
    const container = document.getElementById('reportContent');
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      switch (this.currentTab) {
        case 'daily': await this.loadDaily(container); break;
        case 'monthly': await this.loadMonthly(container); break;
        case 'yearly': await this.loadYearly(container); break;
        case 'expenses': await this.loadExpenses(container); break;
      }
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><p>${err.message}</p></div>`;
    }
  },

  async loadDaily(container) {
    const dateInput = `<div class="flex gap-12 mb-24">
      <input type="date" class="form-input" id="dailyDate" value="${Format.today()}" onchange="ReportsPage.loadTab()" style="width:200px">
      <a href="/api/export/daily-report/excel?date=${Format.today()}" class="btn btn-ghost" id="dailyExportBtn" target="_blank">📥 Excel</a>
    </div>`;

    const date = document.getElementById('dailyDate')?.value || Format.today();
    const data = await API.reports.daily(date);

    container.innerHTML = `
      ${dateInput}

      <div class="stats-grid mb-24">
        <div class="stat-card blue">
          <div class="stat-icon blue">🛒</div>
          <div class="stat-info">
            <div class="stat-label">عدد الأوردرات</div>
            <div class="stat-value">${data.summary.total_orders}</div>
          </div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon gold">💰</div>
          <div class="stat-info">
            <div class="stat-label">إجمالي المبيعات</div>
            <div class="stat-value">${Format.currency(data.summary.total_sales)}</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">📈</div>
          <div class="stat-info">
            <div class="stat-label">المكسب</div>
            <div class="stat-value text-green">${Format.currency(data.summary.total_profit)}</div>
          </div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">💸</div>
          <div class="stat-info">
            <div class="stat-label">المصاريف</div>
            <div class="stat-value text-red">${Format.currency(data.totalExpenses)}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">✨</div>
          <div class="stat-info">
            <div class="stat-label">صافي الربح</div>
            <div class="stat-value" style="color:${data.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${Format.currency(data.netProfit)}</div>
          </div>
        </div>
      </div>

      <div class="grid-2 mb-24">
        <div class="stat-card green">
          <div class="stat-info">
            <div class="stat-label">مبيعات كاش</div>
            <div class="stat-value">${Format.currency(data.summary.cash_sales)}</div>
            <div class="stat-sub">مكسب: ${Format.currency(data.summary.cash_profit)}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-info">
            <div class="stat-label">مبيعات قسط</div>
            <div class="stat-value">${Format.currency(data.summary.installment_sales)}</div>
            <div class="stat-sub">مكسب: ${Format.currency(data.summary.installment_profit)}</div>
          </div>
        </div>
      </div>

      ${data.totalInstallmentCollected > 0 ? `
        <div class="alert-card warning mb-24">
          <div class="alert-card-icon">💳</div>
          <div class="alert-card-text">
            <strong>تحصيل أقساط اليوم: ${Format.currency(data.totalInstallmentCollected)}</strong>
            <span>${data.installmentPayments.length} دفعة</span>
          </div>
        </div>
      ` : ''}

      <div class="card">
        <div class="card-title mb-16">أوردرات اليوم</div>
        <div class="table-container">
          <table>
            <thead><tr><th>رقم</th><th>العميل</th><th>الإجمالي</th><th>المكسب</th><th>الدفع</th><th>الحالة</th></tr></thead>
            <tbody>
              ${data.orders.length === 0 ? '<tr><td colspan="6" class="text-center text-muted" style="padding:30px;">لا توجد أوردرات</td></tr>' :
                data.orders.map(o => `
                  <tr>
                    <td><a href="#/orders/${o.id}" class="text-blue">${o.order_number}</a></td>
                    <td>${o.customer_name}</td>
                    <td class="text-bold">${Format.currency(o.total_amount)}</td>
                    <td class="text-green">${Format.currency(o.profit)}</td>
                    <td>${Format.paymentMethod(o.payment_method)}</td>
                    <td>${Format.orderStatus(o.status)}</td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Update export link
    const exportBtn = document.getElementById('dailyExportBtn');
    if (exportBtn) exportBtn.href = `/api/export/daily-report/excel?date=${date}`;
  },

  async loadMonthly(container) {
    const y = Format.currentYear();
    const m = Format.currentMonth();
    const data = await API.reports.monthly(y, m);

    container.innerHTML = `
      <div class="flex gap-12 mb-24">
        <select class="form-select" id="monthSelect" style="width:140px" onchange="ReportsPage.loadTab()">
          ${Array.from({length:12}, (_, i) => `<option value="${String(i+1).padStart(2,'0')}" ${String(i+1).padStart(2,'0') === m ? 'selected' : ''}>${Format.monthName(i+1)}</option>`).join('')}
        </select>
        <input type="number" class="form-input" id="monthYear" value="${y}" style="width:100px" onchange="ReportsPage.loadTab()">
      </div>

      <div class="stats-grid mb-24">
        <div class="stat-card gold">
          <div class="stat-icon gold">💰</div>
          <div class="stat-info">
            <div class="stat-label">إجمالي المبيعات</div>
            <div class="stat-value">${Format.currency(data.total.total_sales)}</div>
            <div class="stat-sub">${data.total.total_orders} أوردر</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">📈</div>
          <div class="stat-info">
            <div class="stat-label">إجمالي المكسب</div>
            <div class="stat-value text-green">${Format.currency(data.total.total_profit)}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">✨</div>
          <div class="stat-info">
            <div class="stat-label">صافي الربح</div>
            <div class="stat-value" style="color:${data.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${Format.currency(data.netProfit)}</div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="card-title mb-16">📊 المبيعات اليومية</div>
        <div class="chart-container"><canvas id="monthlyChart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-title mb-16">تفاصيل الأيام</div>
        <div class="table-container">
          <table>
            <thead><tr><th>اليوم</th><th>الأوردرات</th><th>المبيعات</th><th>كاش</th><th>قسط</th><th>المكسب</th></tr></thead>
            <tbody>
              ${data.dailySummary.map(d => `
                <tr>
                  <td class="text-bold">${Format.dateShort(d.day)}</td>
                  <td>${d.total_orders}</td>
                  <td>${Format.currency(d.total_sales)}</td>
                  <td class="text-green">${Format.currency(d.cash_sales)}</td>
                  <td style="color:var(--accent-purple)">${Format.currency(d.installment_sales)}</td>
                  <td class="text-green text-bold">${Format.currency(d.total_profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    setTimeout(() => {
      Charts.drawBarChart('monthlyChart', data.dailySummary.map(d => ({
        label: d.day.substring(8),
        value: d.total_sales
      })), { color: '#f59e0b' });
    }, 100);
  },

  async loadYearly(container) {
    const y = Format.currentYear();
    const data = await API.reports.yearly(y);

    container.innerHTML = `
      <div class="flex gap-12 mb-24">
        <input type="number" class="form-input" id="yearInput" value="${y}" style="width:100px" onchange="ReportsPage.loadTab()">
      </div>

      <div class="stats-grid mb-24">
        <div class="stat-card gold">
          <div class="stat-icon gold">💰</div>
          <div class="stat-info">
            <div class="stat-label">إجمالي السنة</div>
            <div class="stat-value">${Format.currency(data.total.total_sales)}</div>
            <div class="stat-sub">${data.total.total_orders} أوردر</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">📈</div>
          <div class="stat-info">
            <div class="stat-label">مكسب كاش</div>
            <div class="stat-value text-green">${Format.currency(data.total.cash_profit)}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">💳</div>
          <div class="stat-info">
            <div class="stat-label">مكسب قسط</div>
            <div class="stat-value" style="color:var(--accent-purple)">${Format.currency(data.total.installment_profit)}</div>
          </div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">✨</div>
          <div class="stat-info">
            <div class="stat-label">صافي الربح</div>
            <div class="stat-value" style="color:${data.netProfit >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}">${Format.currency(data.netProfit)}</div>
          </div>
        </div>
      </div>

      <div class="card mb-24">
        <div class="card-title mb-16">📊 المبيعات الشهرية</div>
        <div class="chart-container"><canvas id="yearlyChart"></canvas></div>
      </div>

      <div class="card">
        <div class="card-title mb-16">تفاصيل الشهور</div>
        <div class="table-container">
          <table>
            <thead><tr><th>الشهر</th><th>الأوردرات</th><th>المبيعات</th><th>كاش</th><th>قسط</th><th>المكسب</th></tr></thead>
            <tbody>
              ${data.monthlySummary.map(d => `
                <tr>
                  <td class="text-bold">${Format.monthName(d.month.split('-')[1])}</td>
                  <td>${d.total_orders}</td>
                  <td>${Format.currency(d.total_sales)}</td>
                  <td class="text-green">${Format.currency(d.cash_sales)}</td>
                  <td style="color:var(--accent-purple)">${Format.currency(d.installment_sales)}</td>
                  <td class="text-green text-bold">${Format.currency(d.total_profit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    setTimeout(() => {
      Charts.drawBarChart('yearlyChart', data.monthlySummary.map(d => ({
        label: Format.monthName(d.month.split('-')[1]).substring(0, 3),
        value: d.total_sales
      })), { color: '#3b82f6' });
    }, 100);
  },

  async loadExpenses(container) {
    const date = Format.today();
    const data = await API.reports.daily(date);

    container.innerHTML = `
      <div class="flex-between mb-24">
        <h3>مصاريف اليوم - ${Format.date(date)}</h3>
        <button class="btn btn-primary" onclick="ReportsPage.openAddExpenseModal()">+ إضافة مصروف</button>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead><tr><th>الوصف</th><th>التصنيف</th><th>المبلغ</th><th>إجراءات</th></tr></thead>
            <tbody>
              ${data.expenses.length === 0 ? '<tr><td colspan="4" class="text-center text-muted" style="padding:30px;">لا توجد مصاريف</td></tr>' :
                data.expenses.map(e => `
                  <tr>
                    <td>${e.description}</td>
                    <td class="text-muted">${e.category}</td>
                    <td class="text-red text-bold">${Format.currency(e.amount)}</td>
                    <td><button class="btn-icon danger" onclick="ReportsPage.deleteExpense('${e.id}')">🗑️</button></td>
                  </tr>
                `).join('')}
            </tbody>
          </table>
        </div>
        ${data.expenses.length > 0 ? `
          <div style="padding:12px 16px;border-top:1px solid var(--border-color);text-align:left;">
            <strong>إجمالي المصاريف: <span class="text-red">${Format.currency(data.totalExpenses)}</span></strong>
          </div>
        ` : ''}
      </div>
    `;
  },

  openAddExpenseModal() {
    App.openModal('إضافة مصروف', `
      <form onsubmit="ReportsPage.addExpense(event)">
        <div class="form-group">
          <label class="form-label">الوصف *</label>
          <input type="text" class="form-input" name="description" required placeholder="مثال: كهرباء">
        </div>
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">المبلغ *</label>
            <input type="number" class="form-input" name="amount" required min="0" step="0.01">
          </div>
          <div class="form-group">
            <label class="form-label">التصنيف</label>
            <select class="form-select" name="category">
              <option value="عام">عام</option>
              <option value="إيجار">إيجار</option>
              <option value="كهرباء">كهرباء</option>
              <option value="مياه">مياه</option>
              <option value="رواتب">رواتب</option>
              <option value="صيانة">صيانة</option>
              <option value="نقل">نقل</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">حفظ</button>
          <button type="button" class="btn btn-ghost" onclick="App.closeModal()">إلغاء</button>
        </div>
      </form>
    `);
  },

  async addExpense(e) {
    e.preventDefault();
    const form = e.target;
    try {
      await API.reports.addExpense({
        description: form.description.value,
        amount: parseFloat(form.amount.value),
        category: form.category.value
      });
      App.closeModal();
      App.showToast('تم إضافة المصروف', 'success');
      this.loadTab();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async deleteExpense(id) {
    if (!confirm('حذف هذا المصروف؟')) return;
    try {
      await API.reports.deleteExpense(id);
      App.showToast('تم حذف المصروف', 'success');
      this.loadTab();
    } catch (err) { App.showToast(err.message, 'error'); }
  }
};
