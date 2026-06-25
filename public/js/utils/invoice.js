// Invoice PDF generation using html2pdf.js
const Invoice = {
  async generate(orderId) {
    try {
      const data = await API.export.invoice(orderId);
      const html = this.buildHTML(data);

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>فاتورة رقم ${data.order.number}</title>
            <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800&display=swap" rel="stylesheet">
            <style>
              body { font-family: 'Cairo', sans-serif; background: #fff; color: #111; padding: 20px; direction: rtl; }
              .invoice-wrap { max-width: 800px; margin: 0 auto; background: #fff; color: #111; padding: 20px; }
              .inv-header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 20px; }
              .inv-shop-name { font-size: 1.5rem; font-weight: 800; color: #1e40af; }
              .inv-shop-info { color: #4b5563; font-size: 0.9rem; }
              .inv-title { font-size: 1.5rem; font-weight: 800; color: #1e40af; text-align: left; }
              .inv-number { color: #4b5563; font-size: 0.9rem; text-align: left; }
              .inv-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .inv-section-title { font-weight: 700; color: #374151; margin-bottom: 10px; font-size: 1.1rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
              .inv-detail-row { display: flex; margin-bottom: 5px; }
              .inv-detail-label { color: #6b7280; width: 80px; }
              .inv-detail-value { font-weight: 600; }
              table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 20px; }
              th, td { border: 1px solid #e5e7eb; padding: 10px; text-align: right; }
              th { background: #f3f4f6; font-weight: 700; color: #374151; }
              .inv-totals { width: 300px; margin-right: auto; margin-top: 20px; }
              .inv-total-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e5e7eb; }
              .inv-total-row.final { font-weight: 800; font-size: 1.2rem; border-bottom: 2px solid #111; color: #1e40af; }
              @media print {
                @page { margin: 10mm; }
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      
      // Wait for fonts to load before printing
      setTimeout(() => {
        printWindow.print();
      }, 500);

      App.showToast('تم تجهيز الفاتورة للطباعة', 'success');
    } catch (err) {
      App.showToast('خطأ في طباعة الفاتورة: ' + err.message, 'error');
    }
  },

  buildHTML(data) {
    const { shop, order, customer, items, totals, installment } = data;

    let installmentHTML = '';
    if (installment) {
      installmentHTML = `
        <div style="margin-top:20px;">
          <h3 style="font-size:14px;font-weight:700;margin-bottom:10px;color:#374151;">تفاصيل الأقساط</h3>
          <table>
            <thead>
              <tr>
                <th>رقم القسط</th>
                <th>تاريخ الاستحقاق</th>
                <th>المبلغ</th>
                <th>الحالة</th>
              </tr>
            </thead>
            <tbody>
              ${installment.payments.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${Format.dateShort(p.dueDate)}</td>
                  <td>${Format.currency(p.amount)}</td>
                  <td>${p.status === 'paid' ? 'مسدد ✅' : p.status === 'overdue' ? 'متأخر ❌' : 'قادم ⏳'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div style="margin-top:10px;font-size:13px;">
            <strong>المقدم:</strong> ${Format.currency(installment.downPayment || installment.down_payment || 0)} |
            <strong>القسط الشهري:</strong> ${Format.currency(installment.monthlyAmount || installment.monthly_amount || 0)} |
            <strong>عدد الشهور:</strong> ${installment.numMonths || installment.num_months || 1}
          </div>
        </div>
      `;
    }

    return `
      <div class="invoice-wrap">
        <div class="inv-header">
          <div>
            <div class="inv-shop-name">${shop.name}</div>
            <div class="inv-shop-info">${shop.address || ''}</div>
            <div class="inv-shop-info">${shop.phone || ''}</div>
          </div>
          <div>
            <div class="inv-title">فاتورة</div>
            <div class="inv-number">${order.number}</div>
            <div class="inv-number">${Format.date(order.date)}</div>
          </div>
        </div>

        <div class="inv-details">
          <div>
            <div class="inv-section-title">بيانات العميل</div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">الاسم:</span>
              <span class="inv-detail-value">${customer.name}</span>
            </div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">التليفون:</span>
              <span class="inv-detail-value">${customer.phone || '-'}</span>
            </div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">العنوان:</span>
              <span class="inv-detail-value">${customer.address || '-'}</span>
            </div>
          </div>
          <div>
            <div class="inv-section-title">بيانات العربية</div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">اللوحة:</span>
              <span class="inv-detail-value">${customer.vehiclePlate || '-'}</span>
            </div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">النوع:</span>
              <span class="inv-detail-value">${customer.vehicleType || '-'}</span>
            </div>
            <div class="inv-detail-row">
              <span class="inv-detail-label">الدفع:</span>
              <span class="inv-detail-value">${order.paymentMethod}</span>
            </div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>السعر</th>
              <th>الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>${Format.currency(item.unitPrice)}</td>
                <td>${Format.currency(item.total)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="inv-totals">
          <div class="inv-totals-table">
            ${totals.discount > 0 ? `
              <div class="inv-total-row">
                <span>المجموع:</span>
                <span>${Format.currency(totals.subtotal)}</span>
              </div>
              <div class="inv-total-row">
                <span>الخصم:</span>
                <span style="color:#ef4444;">- ${Format.currency(totals.discount)}</span>
              </div>
            ` : ''}
            <div class="inv-total-row final">
              <span>الإجمالي:</span>
              <span>${Format.currency(totals.total)}</span>
            </div>
            <div class="inv-total-row">
              <span>المدفوع:</span>
              <span style="color:#10b981;">${Format.currency(totals.paid)}</span>
            </div>
            ${totals.remaining > 0 ? `
              <div class="inv-total-row">
                <span>المتبقي:</span>
                <span style="color:#ef4444;">${Format.currency(totals.remaining)}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${installmentHTML}

        <div style="margin-top:40px;text-align:center;font-size:12px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:15px;">
          شكراً لتعاملكم معنا - ${shop.name}
        </div>
      </div>
    `;
  }
};
