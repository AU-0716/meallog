// Firebase コンソールで取得した設定
export const firebaseConfig = {
  apiKey: 'AIzaSyCWCcDYAcpSLcb8enrY6f4kDopqrDgDQcM',
  authDomain: 'meallog-317be.firebaseapp.com',
  projectId: 'meallog-317be',
  storageBucket: 'meallog-317be.firebasestorage.app',
  messagingSenderId: '544945232012',
  appId: '1:544945232012:web:405719b1e4c89552ec03a9'
};

export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');
