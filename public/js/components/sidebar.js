// Sidebar component
const Sidebar = {
  init() {
    const toggle = document.getElementById('sidebarToggle');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');

    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Close sidebar on mobile when clicking outside
    document.addEventListener('click', (e) => {
      if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        if (!sidebar.contains(e.target) && e.target !== mobileBtn) {
          sidebar.classList.remove('open');
        }
      }
    });
  },

  setActive(page) {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });

    const titles = {
      dashboard: 'لوحة التحكم',
      products: 'المنتجات',
      orders: 'الأوردرات',
      customers: 'العملاء',
      installments: 'الأقساط',
      reports: 'التقارير',
      settings: 'الإعدادات'
    };

    document.getElementById('pageTitle').textContent = titles[page] || 'لوحة التحكم';

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');
  }
};
