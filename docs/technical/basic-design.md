# Visuy Cast - 基本設計書

## 1. システム概要

### 1.1 システム名
**Swippa**

### 1.2 システム目的
AIがユーザーの「やる気の波」や「キャパシティ」を能動的に管理し、罪悪感なく挑戦と休息を両立させる大学生向けスケジュール管理アプリ

### 1.3 システム構成
- **フロントエンド**: TypeScript + HTML5 + CSS3 + JavaScript
- **バックエンド**: Firebase (Authentication, Firestore, Storage)
- **デプロイ**: Firebase Hosting
- **開発環境**: Node.js + npm

## 2. アーキテクチャ設計

### 2.1 全体アーキテクチャ
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   フロントエンド   │    │   Firebase      │    │   外部API       │
│                │    │                │    │                │
│ - TypeScript    │◄──►│ - Authentication│    │ - 大学ポータル   │
│ - HTML5/CSS3   │    │ - Firestore     │    │ - シラバスAPI    │
│ - JavaScript    │    │ - Storage       │    │ - OCR API       │
│ - PWA対応       │    │ - Functions     │    │                │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### 2.2 モジュール構成
```
src/
├── components/          # UIコンポーネント
│   ├── Character/       # キャラクター表示
│   ├── TaskCard/        # タスクカード
│   ├── SwipeArea/       # スワイプ操作エリア
│   ├── Timer/           # タイマー表示
│   └── EmotionMatrix/   # 感情マトリクス入力
├── pages/               # ページコンポーネント
│   ├── Onboarding/      # オンボーディング
│   ├── Main/            # メイン画面
│   ├── TaskAdd/         # タスク追加
│   ├── Dashboard/       # ダッシュボード
│   └── Schedule/        # スケジュール管理
├── services/            # サービス層
│   ├── AuthService/     # 認証サービス
│   ├── TaskService/     # タスク管理サービス
│   ├── AIService/       # AI推論サービス
│   └── AnalyticsService/ # 分析サービス
├── utils/               # ユーティリティ
│   ├── Firebase/        # Firebase設定
│   ├── Storage/         # ローカルストレージ
│   └── Helpers/         # ヘルパー関数
└── types/               # 型定義
    ├── User.ts          # ユーザー型
    ├── Task.ts          # タスク型
    └── Schedule.ts      # スケジュール型
```

## 3. データベース設計

### 3.1 Firestore コレクション設計

#### 3.1.1 users コレクション
```typescript
interface User {
  uid: string;                    // Firebase Auth UID
  email: string;                   // メールアドレス
  displayName: string;             // 表示名
  createdAt: Timestamp;           // 作成日時
  updatedAt: Timestamp;           // 更新日時
  preferences: UserPreferences;   // ユーザー設定
  behaviorPattern: BehaviorPattern; // 行動パターン分析結果
}

interface UserPreferences {
  theme: 'light' | 'dark';        // テーマ設定
  notificationEnabled: boolean;   // 通知設定
  workDuration: number;           // 作業時間（分）
  breakDuration: number;          // 休憩時間（分）
  timezone: string;              // タイムゾーン
}

interface BehaviorPattern {
  type: 'morning' | 'evening' | 'mixed'; // 活動タイプ
  productivityPeak: string[];    // 生産性のピーク時間
  restPattern: RestPattern;      // 休息パターン
  lastAnalyzed: Timestamp;       // 最終分析日時
}
```

#### 3.1.2 tasks コレクション
```typescript
interface Task {
  id: string;                     // タスクID
  userId: string;                  // ユーザーID
  title: string;                  // タスク名
  description?: string;           // 説明
  deadline: Timestamp;            // 締切
  emotionMatrix: EmotionMatrix;    // 感情マトリクス
  status: TaskStatus;             // ステータス
  priority: TaskPriority;        // 優先度
  estimatedDuration: number;      // 推定所要時間（分）
  actualDuration?: number;        // 実際の所要時間（分）
  createdAt: Timestamp;           // 作成日時
  updatedAt: Timestamp;           // 更新日時
  completedAt?: Timestamp;        // 完了日時
  aiSuggestions: AISuggestion[]; // AI提案履歴
}

interface EmotionMatrix {
  achievement: number;            // 達成感 (0-100)
  resistance: number;             // 抵抗感 (0-100)
  energy: number;                // エネルギー (0-100)
  confidence: number;            // 自信 (0-100)
}

enum TaskStatus {
  PENDING = 'pending',           // 未着手
  IN_PROGRESS = 'in_progress',   // 進行中
  COMPLETED = 'completed',       // 完了
  POSTPONED = 'postponed',       // 延期
  CANCELLED = 'cancelled'        // キャンセル
}

enum TaskPriority {
  LOW = 'low',                   // 低
  MEDIUM = 'medium',             // 中
  HIGH = 'high',                 // 高
  URGENT = 'urgent'              // 緊急
}
```

#### 3.1.3 schedules コレクション
```typescript
interface Schedule {
  id: string;                     // スケジュールID
  userId: string;                  // ユーザーID
  title: string;                  // 予定名
  description?: string;           // 説明
  startTime: Timestamp;           // 開始時間
  endTime: Timestamp;             // 終了時間
  type: ScheduleType;             // 予定タイプ
  isRecurring: boolean;           // 繰り返し設定
  recurrencePattern?: RecurrencePattern; // 繰り返しパターン
  createdAt: Timestamp;           // 作成日時
  updatedAt: Timestamp;           // 更新日時
}

enum ScheduleType {
  CLASS = 'class',               // 授業
  WORK = 'work',                 // バイト
  PERSONAL = 'personal',          // 個人予定
  STUDY = 'study',               // 勉強時間
  BREAK = 'break'                // 休憩時間
}

interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  daysOfWeek?: number[];         // 曜日 (0=日曜日)
  interval: number;              // 間隔
  endDate?: Timestamp;           // 終了日
}
```

#### 3.1.4 sessions コレクション
```typescript
interface Session {
  id: string;                     // セッションID
  userId: string;                  // ユーザーID
  mode: SessionMode;              // セッションモード
  startTime: Timestamp;           // 開始時間
  endTime?: Timestamp;            // 終了時間
  tasks: SessionTask[];           // セッション内タスク
  productivity: ProductivityMetrics; // 生産性指標
  createdAt: Timestamp;           // 作成日時
}

enum SessionMode {
  ON = 'on',                     // 集中モード
  OFF = 'off'                    // 休憩モード
}

interface SessionTask {
  taskId: string;                 // タスクID
  startTime: Timestamp;           // 開始時間
  endTime?: Timestamp;            // 終了時間
  status: 'started' | 'completed' | 'abandoned';
  emotionBefore: EmotionMatrix;   // 開始前の感情
  emotionAfter?: EmotionMatrix;   // 終了後の感情
}

interface ProductivityMetrics {
  focusTime: number;              // 集中時間（分）
  breakTime: number;              // 休憩時間（分）
  taskCompletionRate: number;     // タスク完了率
  averageFocusDuration: number;   // 平均集中時間
  distractionCount: number;      // 気が散った回数
}
```

## 4. AI推論システム設計

### 4.1 AI推論フロー
```
ユーザー行動データ → 感情分析 → キャパシティ計算 → タスク提案 → スケジュール調整
```

### 4.2 AI推論ロジック

#### 4.2.1 キャパシティ計算
```typescript
interface CapacityCalculator {
  calculateCapacity(
    userBehavior: BehaviorPattern,
    currentTime: Date,
    recentSessions: Session[],
    currentEmotion: EmotionMatrix
  ): CapacityScore;
}

interface CapacityScore {
  physical: number;               // 身体的キャパシティ (0-100)
  mental: number;                 // 精神的キャパシティ (0-100)
  emotional: number;              // 感情的キャパシティ (0-100)
  overall: number;                // 総合キャパシティ (0-100)
  recommendedMode: SessionMode;   // 推奨モード
  estimatedDuration: number;      // 推奨継続時間（分）
}
```

#### 4.2.2 タスク提案アルゴリズム
```typescript
interface TaskProposer {
  proposeTask(
    availableTasks: Task[],
    userCapacity: CapacityScore,
    currentTime: Date,
    userPreferences: UserPreferences
  ): TaskProposal;
}

interface TaskProposal {
  task: Task;                     // 提案タスク
  confidence: number;             // 信頼度 (0-100)
  reasoning: string;              // 提案理由
  estimatedCompletionTime: number; // 推定完了時間（分）
  alternativeTasks: Task[];       // 代替タスク
}
```

#### 4.2.3 スケジュール調整アルゴリズム
```typescript
interface ScheduleOptimizer {
  optimizeSchedule(
    task: Task,
    userSchedule: Schedule[],
    userCapacity: CapacityScore,
    deadline: Date
  ): ScheduleAdjustment;
}

interface ScheduleAdjustment {
  suggestedTimeSlots: TimeSlot[]; // 推奨時間帯
  reasoning: string;              // 調整理由
  urgencyLevel: 'low' | 'medium' | 'high'; // 緊急度
  alternativeOptions: ScheduleOption[]; // 代替案
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  capacityMatch: number;          // キャパシティ適合度 (0-100)
  deadlinePressure: number;       // 締切プレッシャー (0-100)
  energyLevel: number;            // エネルギー水準 (0-100)
}
```

## 5. セキュリティ設計

### 5.1 認証・認可
- **Firebase Authentication**: メール/パスワード認証
- **Firestore Security Rules**: ユーザーデータのアクセス制御
- **JWT Token**: セッション管理

### 5.2 データ保護
- **暗号化**: 機密データの暗号化
- **バックアップ**: 定期的なデータバックアップ
- **プライバシー**: GDPR準拠のデータ処理

### 5.3 セキュリティルール例
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーデータのアクセス制御
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // タスクデータのアクセス制御
    match /tasks/{taskId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // スケジュールデータのアクセス制御
    match /schedules/{scheduleId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 6. パフォーマンス設計

### 6.1 フロントエンド最適化
- **コード分割**: ページ単位での遅延読み込み
- **キャッシュ**: ローカルストレージ活用
- **画像最適化**: WebP形式、遅延読み込み
- **バンドルサイズ**: Tree shaking、minification

### 6.2 バックエンド最適化
- **Firestore最適化**: インデックス設計、クエリ最適化
- **キャッシュ戦略**: CDN活用、データキャッシュ
- **リアルタイム更新**: 必要な部分のみ更新

### 6.3 パフォーマンス目標
- **初期読み込み**: < 2秒
- **ページ遷移**: < 1秒
- **API応答**: < 500ms
- **オフライン対応**: 基本機能のオフライン利用可能

## 7. エラーハンドリング設計

### 7.1 エラー分類
```typescript
enum ErrorType {
  NETWORK_ERROR = 'network_error',     // ネットワークエラー
  AUTH_ERROR = 'auth_error',           // 認証エラー
  VALIDATION_ERROR = 'validation_error', // バリデーションエラー
  AI_ERROR = 'ai_error',               // AI推論エラー
  STORAGE_ERROR = 'storage_error',     // ストレージエラー
  UNKNOWN_ERROR = 'unknown_error'       // 不明なエラー
}

interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: any;
  timestamp: Date;
  userId?: string;
}
```

### 7.2 エラー処理戦略
- **ユーザーフレンドリー**: 技術的詳細を隠した分かりやすいメッセージ
- **自動復旧**: 可能な限り自動でエラーを回復
- **ログ記録**: エラーの詳細をログに記録
- **フォールバック**: エラー時の代替機能提供

## 8. 監視・ログ設計

### 8.1 ログ設計
```typescript
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  metadata?: any;
}

// ログレベル別の用途
// DEBUG: 開発時の詳細情報
// INFO: 一般的な操作ログ
// WARN: 注意が必要な状況
// ERROR: エラー発生
```

### 8.2 監視指標
- **ユーザー行動**: ページビュー、セッション時間、機能利用率
- **パフォーマンス**: 応答時間、エラー率、可用性
- **ビジネス指標**: ユーザー登録数、継続利用率、タスク完了率

## 9. デプロイメント設計

### 9.1 環境構成
- **開発環境**: ローカル開発環境
- **ステージング環境**: テスト用環境
- **本番環境**: Firebase Hosting

### 9.2 CI/CD パイプライン
```yaml
# GitHub Actions例
name: Deploy to Firebase
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy to Firebase
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: visuy-cast
```

## 10. 参考資料・根拠

### 10.1 技術選定根拠
- **TypeScript**: 型安全性による開発効率と品質向上
- **Firebase**: スケーラブルなバックエンドサービス、認証・データベース・ホスティングの統合
- **PWA**: オフライン対応、ネイティブアプリライクな体験

### 10.2 設計原則
- **ユーザー中心設計**: ペルソナ「張杉 翔」くんの課題解決を最優先
- **シンプルさ**: 複雑さを排除し、直感的な操作を提供
- **スケーラビリティ**: 将来の機能拡張に対応できる柔軟な設計
- **パフォーマンス**: 高速レスポンスとスムーズな操作体験

---

**作成日**: 2024年12月  
**最終更新**: 2024年12月  
**バージョン**: 1.0
