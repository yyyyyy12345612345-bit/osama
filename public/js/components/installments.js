// Installments Page Component
const InstallmentsPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const plans = await API.installments.getAll();
      content.innerHTML = `<div class="page-enter">${this.buildHTML(plans)}</div>`;
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(plans) {
    const overdue = plans.filter(p => p.overdue_count > 0);
    const active = plans.filter(p => p.status === 'active');
    const completed = plans.filter(p => p.status === 'completed');

    return `
      ${overdue.length > 0 ? `
        <div class="alert-card mb-24">
          <div class="alert-card-icon">🔴</div>
          <div class="alert-card-text">
            <strong>تنبيه: ${overdue.length} عميل عليه أقساط متأخرة!</strong>
          </div>
        </div>
      ` : ''}

      <div class="card-header" style="margin-bottom:20px;">
        <div class="filter-bar">
          <div class="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" class="form-input" id="installmentSearch" placeholder="بحث بالعميل أو رقم الأوردر..." oninput="InstallmentsPage.search()">
          </div>
          <select class="form-select" id="installmentStatusFilter" style="width:140px" onchange="InstallmentsPage.search()">
            <option value="">الكل</option>
            <option value="active">نشط</option>
            <option value="completed">مكتمل</option>
          </select>
          <a href="/api/export/installments/excel" class="btn btn-ghost" target="_blank">📥 Excel</a>
        </div>
      </div>

      <!-- إحصائيات الأقساط -->
      <div class="stats-grid mb-24" style="grid-template-columns: repeat(3, 1fr);">
        <div class="stat-card blue">
          <div class="stat-icon blue">💳</div>
          <div class="stat-info">
            <div class="stat-label">أقساط نشطة</div>
            <div class="stat-value">${active.length}</div>
          </div>
        </div>
        <div class="stat-card red">
          <div class="stat-icon red">⚠️</div>
          <div class="stat-info">
            <div class="stat-label">أقساط متأخرة</div>
            <div class="stat-value text-red">${overdue.length}</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <div class="stat-label">مكتملة</div>
            <div class="stat-value text-green">${completed.length}</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>العميل</th>
                <th>أوردر</th>
                <th>الإجمالي</th>
                <th>المقدم</th>
                <th>القسط الشهري</th>
                <th>المدفوع</th>
                <th>المتبقي</th>
                <th>القسط القادم</th>
                <th>الحالة</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody id="installmentsTableBody">
              ${this.renderRows(plans)}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderRows(plans) {
    if (plans.length === 0) {
      return '<tr><td colspan="10" class="text-center text-muted" style="padding:40px;">لا توجد أقساط</td></tr>';
    }
    return plans.map(p => {
      const remaining = p.total_amount - (p.total_paid || 0);
      const hasOverdue = p.overdue_count > 0;
      return `
        <tr style="${hasOverdue ? 'background:rgba(239,68,68,0.05);' : ''}">
          <td class="text-bold">${p.customer_name}</td>
          <td><a href="#/orders/${p.order_id}" class="text-blue">${p.order_number}</a></td>
          <td>${Format.currency(p.total_amount)}</td>
          <td class="text-muted">${Format.currency(p.down_payment)}</td>
          <td class="text-gold text-bold">${Format.currency(p.monthly_amount)}</td>
          <td class="text-green">${Format.currency(p.total_paid || 0)}</td>
          <td class="${remaining > 0 ? 'text-red text-bold' : 'text-green'}">${Format.currency(remaining)}</td>
          <td class="text-muted">${p.next_due_date ? Format.dateShort(p.next_due_date) : '-'}</td>
          <td>
            ${Format.installmentStatus(p.status)}
            ${hasOverdue ? `<span class="badge badge-danger" style="margin-right:4px;">${p.overdue_count} متأخر</span>` : ''}
          </td>
          <td>
            <button class="btn-icon edit" title="تفاصيل ودفع" onclick="InstallmentsPage.viewPlan('${p.id}')">💳</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  async viewPlan(id) {
    try {
      const plan = await API.installments.getOne(id);
      App.openModal(`أقساط ${plan.customer_name} - ${plan.order_number}`, `
        <div style="margin-bottom:20px;">
          <div class="flex-between mb-16">
            <span>الإجمالي:</span>
            <span class="text-bold">${Format.currency(plan.total_amount)}</span>
          </div>
          <div class="flex-between mb-16">
            <span>المقدم:</span>
            <span class="text-green">${Format.currency(plan.down_payment)}</span>
          </div>
          <div class="flex-between mb-16">
            <span>القسط الشهري:</span>
            <span class="text-gold text-bold">${Format.currency(plan.monthly_amount)}</span>
          </div>
          <div class="flex-between">
            <span>عدد الشهور:</span>
            <span>${plan.num_months}</span>
          </div>
        </div>

        <h4 style="margin-bottom:12px;">جدول الأقساط</h4>
        <div class="payment-timeline">
          ${plan.payments.map((p, i) => `
            <div class="payment-item" id="payment-${p.id}">
              <div class="payment-status-dot ${p.status}"></div>
              <div class="payment-info">
                <div>قسط ${i + 1}</div>
                <div class="payment-date">${Format.dateShort(p.due_date)}</div>
                ${p.paid_date ? `<div class="payment-date text-green">دُفع: ${Format.dateShort(p.paid_date)}</div>` : ''}
              </div>
              <div class="payment-amount">${Format.currency(p.amount)}</div>
              <div>${Format.paymentStatus(p.status)}</div>
              ${p.status !== 'paid' ? `
                <button class="btn btn-sm btn-success" onclick="InstallmentsPage.payInstallment('${plan.id}', '${p.id}', ${p.amount})">سداد</button>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `, 'wide');
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async payInstallment(planId, paymentId, suggestedAmount) {
    let inputAmount = prompt(`تأكيد سداد القسط:\nالمبلغ المطلوب: ${Format.currency(suggestedAmount)}\n\nأدخل المبلغ الذي سيتم سداده فعلياً:`, suggestedAmount);
    
    if (inputAmount === null) return; // User cancelled
    
    const amount = parseFloat(inputAmount);
    if (isNaN(amount) || amount <= 0) {
      return App.showToast('مبلغ غير صالح', 'error');
    }

    try {
      await API.installments.pay(planId, paymentId, { amount });
      App.showToast('تم تسجيل الدفعة بنجاح', 'success');
      // Refresh the plan details
      this.viewPlan(planId);
      // Also refresh the main list in background
      this.render();
    } catch (err) { App.showToast(err.message, 'error'); }
  },

  async search() {
    const query = document.getElementById('installmentSearch').value;
    const status = document.getElementById('installmentStatusFilter').value;
    try {
      const plans = await API.installments.getAll({ search: query, status });
      document.getElementById('installmentsTableBody').innerHTML = this.renderRows(plans);
    } catch (err) { /* ignore */ }
  }
};
