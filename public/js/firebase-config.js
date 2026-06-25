// Firebase Configuration & Initialization
const firebaseConfig = {
  apiKey: "AIzaSyBUlsPbGCznAkncC7tZjRfDYMoTC0H_QaI",
  authDomain: "rubber-f0574.firebaseapp.com",
  projectId: "rubber-f0574",
  storageBucket: "rubber-f0574.firebasestorage.app",
  messagingSenderId: "608921253339",
  appId: "1:608921253339:web:35e350e02608777fab23fe",
  measurementId: "G-NX8J03S6Y2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Firestore
const db = firebase.firestore();

// Enable offline persistence (IndexedDB backup تلقائي!)
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.log('⚠️ Persistence فشل: المتصفح مفتوح في أكتر من تاب');
  } else if (err.code === 'unimplemented') {
    console.log('⚠️ المتصفح لا يدعم offline persistence');
  }
});

console.log('✅ Firebase initialized - Project: rubber-f0574');
console.log('✅ Offline persistence enabled (IndexedDB backup تلقائي)');
