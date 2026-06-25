// Main App - Router & Global Functions
const App = {
  async init() {
    this.createToastContainer();
    
    // Auth Guard
    firebase.auth().onAuthStateChanged((user) => {
      if (!user) {
        window.location.href = 'login.html';
      } else {
        // Only load app data if user is logged in
        this.loadAppData();
      }
    });
  },

  async loadAppData() {
    try {
      Sidebar.init();
      
      // Set up modal close
      document.getElementById('modalClose').addEventListener('click', () => this.closeModal());
      document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === document.getElementById('modalOverlay')) this.closeModal();
      });

      // Handle escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeModal();
      });

      this.updateDate();
      setInterval(() => this.updateDate(), 60000);
      
      this.setupRouter();
      this.navigate(window.location.hash || '#/');
    } catch(err) {
      this.showToast('خطأ في تحميل البيانات: ' + err.message, 'error');
    }
  },

  createToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      document.body.appendChild(container);
    }
  },

  setupRouter() {
    window.addEventListener('hashchange', () => {
      this.navigate(window.location.hash);
    });
  },

  navigate(hash) {
    const path = hash.replace('#', '') || '/';
    const parts = path.split('/').filter(Boolean);
    const page = parts[0] || 'dashboard';
    const id = parts[1] || null;

    Sidebar.setActive(page === '' ? 'dashboard' : page);

    switch (page) {
      case '':
      case 'dashboard':
        Sidebar.setActive('dashboard');
        DashboardPage.render();
        break;
      case 'products':
        ProductsPage.render();
        break;
      case 'orders':
        OrdersPage.render(id);
        break;
      case 'customers':
        CustomersPage.render();
        break;
      case 'installments':
        InstallmentsPage.render();
        break;
      case 'reports':
        ReportsPage.render();
        break;
      case 'settings':
        SettingsPage.render();
        break;
      default:
        DashboardPage.render();
    }
  },

  // Modal
  openModal(title, bodyHTML, size) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    const modal = document.getElementById('modalContainer');
    modal.className = 'modal' + (size ? ` ${size}` : '');
    document.getElementById('modalOverlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  },

  // Toast notifications
  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]}</span>
      <span class="toast-message">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  },

  // Update date display
  updateDate() {
    const dateEl = document.getElementById('currentDate');
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
      });
    }
  },
  
  // Button loading state
  setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;margin-left:8px;vertical-align:middle;"></span> جاري التحميل...';
      btn.disabled = true;
    } else {
      if (btn.dataset.originalText) {
        btn.innerHTML = btn.dataset.originalText;
      }
      btn.disabled = false;
    }
  },

  async logout() {
    try {
      await firebase.auth().signOut();
    } catch(err) {
      this.showToast('خطأ في تسجيل الخروج', 'error');
    }
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
