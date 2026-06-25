const express = require('express');
const path = require('path');
const cors = require('cors');
const { initDatabase } = require('./database');
const { initFirebaseSync } = require('./firebase-sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Initialize database
initDatabase();

// Initialize Firebase sync (non-blocking)
initFirebaseSync();

// API Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/installments', require('./routes/installments'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/export', require('./routes/export'));

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.message);
  res.status(500).json({ success: false, error: 'خطأ في السيرفر' });
});

app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════╗
  ║   🚛  سيستم كاوتيش عربيات النقل          ║
  ║   ✅  السيرفر شغال على http://localhost:${PORT}  ║
  ╚════════════════════════════════════════════╝
  `);
});
