// .env.local を読み込んで config.js を生成するスクリプト
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const configPath = path.join(__dirname, '..', 'public', 'js', 'config.js');

// .env.local を読み込む
let envVars = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim();
        // 引用符を削除（シングルクォートまたはダブルクォート）
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        envVars[key.trim()] = value;
      }
    }
  });
}

// config.js を生成（値のエスケープ処理）
function escapeForJS(str) {
  if (!str) return str;
  // JavaScriptの文字列として安全にエスケープ
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

const configContent = `// Firebase設定ファイル（自動生成）
// このファイルは .env.local から自動生成されます
// 手動で編集しないでください

// 環境変数から読み込んだ設定
const firebaseConfig = {
  apiKey: "${escapeForJS(envVars.VITE_FIREBASE_API_KEY) || 'your-api-key-here'}",
  authDomain: "${escapeForJS(envVars.VITE_FIREBASE_AUTH_DOMAIN) || 'your-project-id.firebaseapp.com'}",
  projectId: "${escapeForJS(envVars.VITE_FIREBASE_PROJECT_ID) || 'your-project-id'}",
  storageBucket: "${escapeForJS(envVars.VITE_FIREBASE_STORAGE_BUCKET) || 'your-project-id.appspot.com'}",
  messagingSenderId: "${escapeForJS(envVars.VITE_FIREBASE_MESSAGING_SENDER_ID) || 'your-sender-id'}",
  appId: "${escapeForJS(envVars.VITE_FIREBASE_APP_ID) || 'your-app-id'}"
};

// 設定をエクスポート
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { firebaseConfig };
} else {
  window.firebaseConfig = firebaseConfig;
}
`;

// 設定ファイルを書き込み
fs.writeFileSync(configPath, configContent, 'utf8');
console.log('✅ Firebase設定ファイルを生成しました:', configPath);

