// Firebase コンソールで取得した設定をここに貼り付けてください。
// （Firebase コンソール → プロジェクトの設定 → マイアプリ → ウェブアプリ）
//
// 未設定のままでも、この端末だけに保存される「オフラインモード」で動きます。

export const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT.firebaseapp.com',
  projectId: 'YOUR_PROJECT',
  storageBucket: 'YOUR_PROJECT.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID'
};

// 設定が入っているかどうかの判定に使います（編集不要）
export const isConfigured = !firebaseConfig.apiKey.startsWith('YOUR_');
