// Format utilities
const Format = {
  // تنسيق المبالغ المالية
  currency(amount) {
    if (amount === null || amount === undefined) return '0 ج.م';
    return Number(amount).toLocaleString('ar-EG') + ' ج.م';
  },

  // تنسيق رقم
  number(num) {
    if (num === null || num === undefined) return '0';
    return Number(num).toLocaleString('ar-EG');
  },

  // تنسيق التاريخ
  date(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  },

  // تنسيق التاريخ المختصر
  dateShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  },

  // تنسيق الوقت
  dateTime(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  },

  // تاريخ اليوم
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // الشهر الحالي
  currentMonth() {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, '0');
  },

  // السنة الحالية
  currentYear() {
    return new Date().getFullYear();
  },

  // حالة الأوردر
  orderStatus(status) {
    const map = {
      completed: '<span class="badge badge-success">مكتمل</span>',
      pending: '<span class="badge badge-warning">قيد السداد</span>',
      cancelled: '<span class="badge badge-muted">ملغي</span>'
    };
    return map[status] || status;
  },

  // طريقة الدفع
  paymentMethod(method) {
    const map = {
      cash: '<span class="badge badge-success">كاش</span>',
      installment: '<span class="badge badge-purple">قسط</span>'
    };
    return map[method] || method;
  },

  // حالة القسط
  installmentStatus(status) {
    const map = {
      active: '<span class="badge badge-info">نشط</span>',
      completed: '<span class="badge badge-success">مكتمل</span>',
      defaulted: '<span class="badge badge-danger">متعثر</span>'
    };
    return map[status] || status;
  },

  // حالة الدفعة
  paymentStatus(status) {
    const map = {
      paid: '<span class="badge badge-success">✅ مسدد</span>',
      pending: '<span class="badge badge-warning">⏳ قادم</span>',
      overdue: '<span class="badge badge-danger">❌ متأخر</span>',
      partial: '<span class="badge badge-purple">جزئي</span>'
    };
    return map[status] || status;
  },

  // اسم الشهر
  monthName(monthNum) {
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    return months[parseInt(monthNum) - 1] || '';
  }
};
