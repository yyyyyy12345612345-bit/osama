// Dashboard Component
const DashboardPage = {
  async render() {
    const content = document.getElementById('contentArea');
    content.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
      const data = await API.reports.dashboard();
      content.innerHTML = `<div class="page-enter">${this.buildHTML(data)}</div>`;

      // Draw charts after DOM is ready
      setTimeout(() => {
        this.drawCharts(data);
        this.updateOverdueBadge(data.overdueInstallments);
      }, 100);
    } catch (err) {
      content.innerHTML = `<div class="empty-state"><div class="empty-state-icon">❌</div><h3>خطأ في تحميل البيانات</h3><p>${err.message}</p></div>`;
    }
  },

  buildHTML(data) {
    return `
      <!-- إحصائيات سريعة -->
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon blue">💰</div>
          <div class="stat-info">
            <div class="stat-label">مبيعات اليوم</div>
            <div class="stat-value">${Format.currency(data.today.total)}</div>
            <div class="stat-sub">${data.today.count} أوردر</div>
          </div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon green">📈</div>
          <div class="stat-info">
            <div class="stat-label">مكسب اليوم</div>
            <div class="stat-value text-green">${Format.currency(data.today.profit)}</div>
          </div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon gold">📅</div>
          <div class="stat-info">
            <div class="stat-label">مبيعات الشهر</div>
            <div class="stat-value">${Format.currency(data.month.total)}</div>
            <div class="stat-sub">${data.month.count} أوردر</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">📦</div>
          <div class="stat-info">
            <div class="stat-label">المخزون</div>
            <div class="stat-value">${Format.number(data.totalStock)}</div>
            <div class="stat-sub">${data.totalProducts} منتج</div>
          </div>
        </div>
      </div>

      <!-- تنبيهات -->
      ${data.overdueInstallments.count > 0 ? `
        <div class="alert-card">
          <div class="alert-card-icon">⚠️</div>
          <div class="alert-card-text">
            <strong>أقساط متأخرة!</strong>
            <span>${data.overdueInstallments.count} عميل عليه أقساط متأخرة بإجمالي ${Format.currency(data.overdueInstallments.total_overdue)}</span>
          </div>
          <a href="#/installments" class="btn btn-sm btn-danger">عرض التفاصيل</a>
        </div>
      ` : ''}

      ${data.lowStock > 0 ? `
        <div class="alert-card warning">
          <div class="alert-card-icon">📦</div>
          <div class="alert-card-text">
            <strong>مخزون منخفض!</strong>
            <span>${data.lowStock} منتج وصل للحد الأدنى</span>
          </div>
          <a href="#/products" class="btn btn-sm btn-warning">عرض المنتجات</a>
        </div>
      ` : ''}

      <!-- مكسب كاش vs قسط -->
      <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
        <div class="stat-card green">
          <div class="stat-icon green">💵</div>
          <div class="stat-info">
            <div class="stat-label">مكسب الكاش</div>
            <div class="stat-value text-green">${Format.currency(data.cashProfit)}</div>
          </div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon purple">💳</div>
          <div class="stat-info">
            <div class="stat-label">مكسب القسط</div>
            <div class="stat-value" style="color:var(--accent-purple)">${Format.currency(data.installmentProfit)}</div>
          </div>
        </div>
        <div class="stat-card blue">
          <div class="stat-icon blue">👥</div>
          <div class="stat-info">
            <div class="stat-label">عدد العملاء</div>
            <div class="stat-value">${Format.number(data.totalCustomers)}</div>
          </div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon gold">🏆</div>
          <div class="stat-info">
            <div class="stat-label">مكسب السنة</div>
            <div class="stat-value text-gold">${Format.currency(data.year.profit)}</div>
          </div>
        </div>
      </div>

      <!-- الرسوم البيانية -->
      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header">
            <div class="card-title">📊 مبيعات آخر 7 أيام</div>
          </div>
          <div class="chart-container">
            <canvas id="salesChart"></canvas>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title">🍩 توزيع المبيعات</div>
          </div>
          <div class="chart-container">
            <canvas id="productChart"></canvas>
          </div>
        </div>
      </div>

      <!-- آخر الأوردرات + مخزون منخفض -->
      <div class="grid-2 mt-24">
        <div class="card">
          <div class="card-header">
            <div class="card-title">🕐 آخر الأوردرات</div>
            <a href="#/orders" class="btn btn-sm btn-ghost">عرض الكل</a>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>رقم</th>
                  <th>العميل</th>
                  <th>الإجمالي</th>
                  <th>الدفع</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                ${data.recentOrders.length === 0 ? `
                  <tr><td colspan="5" class="text-center text-muted" style="padding:30px;">لا توجد أوردرات بعد</td></tr>
                ` : data.recentOrders.map(o => `
                  <tr style="cursor:pointer" onclick="window.location.hash='#/orders/${o.id}'">
                    <td><span class="text-blue">${o.order_number}</span></td>
                    <td>${o.customer_name}</td>
                    <td class="text-bold">${Format.currency(o.total_amount)}</td>
                    <td>${Format.paymentMethod(o.payment_method)}</td>
                    <td>${Format.orderStatus(o.status)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">📦 مخزون منخفض</div>
          </div>
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الكمية</th>
                  <th>الحد الأدنى</th>
                </tr>
              </thead>
              <tbody>
                ${data.lowStockProducts.length === 0 ? `
                  <tr><td colspan="3" class="text-center text-muted" style="padding:30px;">المخزون في حالة جيدة ✅</td></tr>
                ` : data.lowStockProducts.map(p => `
                  <tr>
                    <td>${p.name}</td>
                    <td><span class="text-red text-bold">${p.quantity}</span></td>
                    <td class="text-muted">${p.min_stock}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  },

  drawCharts(data) {
    // Sales chart (last 7 days)
    const salesData = data.last7Days.map(d => ({
      label: d.day.substring(5),
      value: d.total
    }));
    Charts.drawLineChart('salesChart', salesData, { color: '#3b82f6' });

    // Product distribution
    const productData = data.productSales.map(p => ({
      label: p.product_name.length > 15 ? p.product_name.substring(0, 15) + '...' : p.product_name,
      value: p.total_sales
    }));
    Charts.drawPieChart('productChart', productData);
  },

  updateOverdueBadge(overdueData) {
    const badge = document.getElementById('overdue-badge');
    const notifCount = document.getElementById('notificationCount');

    if (overdueData.count > 0) {
      badge.style.display = 'inline';
      badge.textContent = overdueData.count;
      notifCount.style.display = 'flex';
      notifCount.textContent = overdueData.count;
    }
  }
};
