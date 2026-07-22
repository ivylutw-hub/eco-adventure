# CHANGELOG

## V9.1 Stable

### 修改檔案

- `firebase.js`
- `index.html`
- `README.md`
- 新增 `CHANGELOG.md`

### Firebase 登入與玩家初始化

- 沿用既有 Firebase Authentication、Firestore 與 Google Login 架構。
- Google 登入後先讀取 `players/{uid}`。
- 新玩家不存在時，自動建立玩家文件與完整雲端存檔。
- 玩家文件會維持並同步下列頂層欄位：
  - `uid`
  - `displayName`
  - `photoURL`
  - `guardianExp`
  - `coins`
  - `stageProgress`
  - `createdAt`
  - `updatedAt`
  - `state`（保留原有完整遊戲存檔資料結構）
- 舊玩家仍優先讀取原有 `state`，並相容只有頂層欄位的早期玩家文件。
- 不變更 Firebase Config、Project ID 或 Collection 名稱。

### 自動雲端同步

- 沿用 `game.js` 既有 `save()` 作為統一存檔入口。
- 答題、經驗值、金幣、關卡進度、玩家名稱與頭像變更後，會自動同步：
  - `players/{uid}`
  - `weeklyRankings/{weekId}/players/{uid}`
- 同步延遲由既有排程方式調整為短時間 debounce，避免短時間內重複寫入。
- 登入完成後自動載入並同步，不需玩家手動更新。
- 網路恢復時會自動再次同步。

### Firestore 錯誤處理

- 寫入失敗會使用 `console.error()` 記錄。
- 單次同步最多自動重試 3 次。
- 最終失敗時會保留本機存檔並顯示提示，不中斷遊戲。
- 5 秒後會安排下一次自動同步。

### 排行榜

- `refreshLeaderboard()` 已移除所有寫入行為，現在只負責讀取及顯示。
- 排序統一使用數值型 `guardianExp`：
  1. `guardianExp` 由大到小。
  2. 相同時以 `updatedAt` 最新優先。
- 排序在前端完成，避免因 Firestore 複合索引尚未建立而無法顯示。
- 保留既有每週排行榜 Collection 路徑。
- 排行榜畫面文字改為顯示「守護經驗」。

### 保留內容

以下內容未修改或移除：

- 題庫與 2,844 題資料
- UI 風格與 CSS
- 怪獸、關卡、徽章、基地及弱點圖鑑
- V9.0.3 手機版「下一題」修正
- GitHub Pages 設定與 `.nojekyll`
- Firebase Config
- Firestore Collection 名稱

### 檢查

已使用 Node.js `node --check` 檢查：

- `config.js`
- `firebase-config.js`
- `firebase.js`
- `game.js`
- `questions.js`

以上檔案均未發現 JavaScript Syntax Error。
