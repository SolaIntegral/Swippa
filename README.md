# Swippa Web App

TypeScript + Firebase + CSS/JavaScript/HTMLで構築されたWebアプリケーションです。

## 機能

- Firebase認証（メール/パスワード）
- レスポンシブデザイン
- ダーク/ライトテーマ切り替え
- SPA（Single Page Application）構造

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Firebase設定

1. [Firebase Console](https://console.firebase.google.com/)でプロジェクトを作成
2. プロジェクト設定 → 全般 → マイアプリ → Webアプリの設定から設定値を取得
3. `.env.local.example`をコピーして`.env.local`を作成
   ```bash
   cp .env.local.example .env.local
   ```
4. `.env.local`にFirebase設定値を入力
   ```env
   VITE_FIREBASE_API_KEY=実際のAPIキー
   VITE_FIREBASE_AUTH_DOMAIN=swippa-7e91c.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=swippa-7e91c
   VITE_FIREBASE_STORAGE_BUCKET=swippa-7e91c.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=実際の送信者ID
   VITE_FIREBASE_APP_ID=実際のアプリID
   ```
5. 設定を反映
   ```bash
   npm run load-env
   ```
6. Authenticationを有効化
   - Firebase Console → Authentication → 始める
   - サインイン方法 → Googleを有効化

### 3. 開発サーバーの起動

```bash
npm run serve
```

このコマンドは自動的に`.env.local`から設定を読み込んで`config.js`を生成してからサーバーを起動します。

ブラウザで `http://localhost:3000` にアクセス

**注意**: `.env.local`を変更した場合は、再度`npm run serve`を実行するか、`npm run load-env`を実行して設定を反映してください。

### 4. TypeScriptのコンパイル（開発時）

```bash
npm run dev
```

## プロジェクト構造

```
Swippa/
├── public/                # 静的ファイル
│   ├── index.html         # メインHTMLファイル
│   ├── styles/            # CSSファイル
│   └── js/                # JavaScriptファイル
│       ├── main.js        # メインアプリケーション
│       ├── config.js      # Firebase設定（.env.localから自動生成）
│       ├── firestore-service.js
│       ├── tasks.js
│       ├── schedule.js
│       ├── main-screen.js
│       ├── dashboard.js
│       ├── onboarding.js
│       └── ai-service.js
├── scripts/               # ビルドスクリプト
│   └── load-env.js        # 環境変数読み込みスクリプト
├── docs/                   # ドキュメント
├── .env.local.example      # 環境変数テンプレート
├── .env.local              # 環境変数（.gitignoreに含まれる）
├── package.json            # プロジェクト設定
├── firebase.json           # Firebase設定
├── firestore.rules         # Firestore Security Rules
└── .gitignore             # Git除外設定
```

## 環境変数の管理

Firebase設定は`.env.local`ファイルで管理します：

1. `.env.local.example`をコピーして`.env.local`を作成
2. Firebase Consoleから取得した設定値を`.env.local`に記入
3. `npm run load-env`で`public/js/config.js`を生成
4. `.env.local`と`config.js`は`.gitignore`に含まれているため、Gitにコミットされません

## 技術スタック

- **TypeScript**: 型安全なJavaScript
- **Firebase**: 認証、データベース、ストレージ
- **CSS3**: モダンなスタイリング
- **HTML5**: セマンティックマークアップ

## 今後の拡張予定

- React/Vue.jsの統合
- Firestoreデータベースの活用
- ファイルアップロード機能
- リアルタイムチャット機能