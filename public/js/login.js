document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMsg = document.getElementById('errorMsg');

  // Check if already logged in
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      window.location.href = 'index.html'; // Redirect to dashboard
    }
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // Show loading
    const originalText = loginBtn.innerHTML;
    loginBtn.innerHTML = 'جاري التحميل...';
    loginBtn.disabled = true;
    errorMsg.style.display = 'none';

    try {
      await firebase.auth().signInWithEmailAndPassword(email, password);
      // Success: onAuthStateChanged will handle redirection
    } catch (error) {
      console.error(error);
      loginBtn.innerHTML = originalText;
      loginBtn.disabled = false;
      errorMsg.style.display = 'block';
      
      switch(error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMsg.textContent = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
          break;
        case 'auth/too-many-requests':
          errorMsg.textContent = 'تم حظر الحساب مؤقتاً لمحاولات خاطئة كثيرة';
          break;
        default:
          errorMsg.textContent = 'حدث خطأ أثناء تسجيل الدخول: ' + error.message;
      }
    }
  });
});
