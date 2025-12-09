# Material Icons ダウンロードリスト

[Google Material Icons](https://fonts.google.com/icons)から以下のアイコンをダウンロードしてください。

## ダウンロード手順

1. https://fonts.google.com/icons にアクセス
2. 各アイコン名で検索
3. サイズと色を指定してダウンロード
4. `public/images/icons/` フォルダに保存

## 必要なアイコン一覧

### 1. ナビゲーションアイコン（フッター）

**順序**: スケジュール → メイン → ダッシュボード

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `calendar_today` | スケジュール画面 | 24px | #1f1f1f (黒) | `icon_schedule.svg` |
| `home` または `dashboard` | メイン画面 | 24px | #1f1f1f (黒) | `icon_main.svg` |
| `dashboard` または `analytics` | ダッシュボード画面 | 24px | #1f1f1f (黒) | `icon_dashboard.svg` |

**アクティブ状態用（オプション）:**
- 同じアイコンを #3498db (ブルー) でもダウンロード
- ファイル名: `icon_schedule_active.svg`, `icon_main_active.svg`, `icon_dashboard_active.svg`

---

### 2. アクションアイコン

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `add` | FABボタン（追加） | 24px | #ffffff (白) | `icon_add.svg` |
| `close` | モーダル閉じる | 24px | #1f1f1f (黒) | `icon_close.svg` |

---

### 3. モード切替アイコン

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `hotel` または `bedtime` | OFFモード（休憩） | 48px | #3498db (ブルー) | `icon_off_mode.svg` |
| `work` または `fitness_center` | ONモード（集中） | 48px | #f39c12 (オレンジ) | `icon_on_mode.svg` |
| `power_settings_new` | ON/OFFスイッチ | 24px | #3498db (ブルー) | `icon_switch.svg` |

---

### 4. ダッシュボードアイコン

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `check_circle` | 完了アイコン | 24px | #2ecc71 (緑) | `icon_check.svg` |
| `fitness_center` | 突破アイコン | 24px | #f39c12 (オレンジ) | `icon_breakthrough.svg` |
| `trending_up` | 成長アイコン | 24px | #f39c12 (オレンジ) | `icon_trending.svg` |

---

### 5. オンボーディングアイコン

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `star` | オンボーディング（ステップ1） | 48px | #f1c40f (黄色) | `icon_star.svg` |

---

### 6. その他のアイコン

| アイコン名 | 用途 | サイズ | 色 | ファイル名 |
|---------|------|--------|-----|-----------|
| `arrow_back` | 戻るボタン | 24px | #3498db (ブルー) | `icon_back.svg` |
| `arrow_forward` | 次へボタン | 24px | #3498db (ブルー) | `icon_forward.svg` |
| `schedule` | タイマー表示 | 24px | #1f1f1f (黒) | `icon_timer.svg` |

---

## 色の定義

| 色名 | カラーコード | 用途 |
|------|------------|------|
| 黒 | #1f1f1f または #333333 | 通常のテキスト・アイコン |
| 白 | #ffffff | 白背景上のアイコン |
| ブルー | #3498db | プライマリカラー、アクティブ状態 |
| 緑 | #2ecc71 | 成功・完了状態 |
| オレンジ | #f39c12 | 警告・強調・ONモード |
| 黄色 | #f1c40f | ハイライト・星 |

---

## ダウンロード時の注意事項

1. **形式**: SVG形式を推奨（拡大縮小しても画質が劣化しない）
2. **サイズ**: 24px または 48px（用途に応じて）
3. **色**: 上記のカラーコードで指定
4. **ファイル名**: 上記のファイル名に統一

---

## 代替アイコン候補

もし推奨アイコンが見つからない場合：

- `home` → `dashboard`, `space_dashboard`
- `calendar_today` → `event`, `date_range`
- `person` → `account_circle`, `people`
- `hotel` → `bedtime`, `sleep`, `night_shelter`
- `work` → `fitness_center`, `directions_run`
- `add` → `add_circle`, `add_circle_outline`

