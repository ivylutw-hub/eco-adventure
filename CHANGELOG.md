# V9.1.2 — 基地動態天空

## 基地建設

- 在既有「守護基地」場景加入太陽、月亮與白雲。
- 依裝置本地時間自動切換白天（06:00–17:59）與黑夜（18:00–05:59）。
- 天氣會在晴天、多雲、陰天、雨天之間自動輪替。
- 雨天加入動態雨滴；陰天與雨天會同步調整天空、地面與雲層明暗。
- 保留既有 `ITEMS`、`st.owned`、購買流程、金幣與雲端存檔資料結構。
- 支援 `prefers-reduced-motion`，裝置若關閉動畫，天空仍可正常顯示。

## 修改檔案

- `game.js`：沿用 `renderBase()` 加入天空與天氣渲染。
- `style.css`：新增日夜、雲層、雨滴與基地建物圖層樣式。
- `index.html`：更新靜態檔案版本參數，避免 GitHub Pages/PWA 使用舊快取。

## 檢查

- 已使用 `node --check game.js`，未發現 JavaScript Syntax Error。

---

# V9.1.1 帳號切換修正

- 修正同一台裝置切換至全新 Google 帳號時，畫面仍沿用上一位玩家名稱、經驗、金幣與關卡進度的問題。
- 本機存檔只有在 `cloudUid` 與目前 Google UID 相同時才可參與雲端存檔時間比較。
- 新帳號沒有 Firestore 玩家文件時，會從 `defaultState()` 建立獨立玩家資料後再建立雲端存檔。
- 相容只有頂層欄位的舊玩家文件，同時避免跨帳號資料污染。

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

## V9.1.3

### 我的守護基地
- 白雲移動速度調整為更緩慢，三層雲分別以不同速度飄動。
- 雨天移除斜線雨幕，改為從天空緩慢垂直落下的小雨滴。
- 黑夜新增閃爍星星。
- 新增 9 項可用金幣購買的基地建設：森林休憩椅、友善鳥巢站、落葉堆肥區、迷你生態濕地、環保知識屋、低碳單車站、節能溫室、星空觀測台、永續學習中心。

### 頭像與答題
- 調整金門鱟圖片在頭像選擇區中的尺寸，使其與其他守護者頭像一致。
- 冒險地圖主線答題移除「重新選擇」，只保留「確定送出」。怪獸弱點挑戰維持原操作。

### 金幣獎勵
- Stage 1：主線單元首次全對 +2；該單元怪獸弱點全部淨化 +1。
- Stage 2：主線單元首次全對 +4；該單元怪獸弱點全部淨化 +2。
- Stage 3：主線單元首次全對 +6；該單元怪獸弱點全部淨化 +3。
- Stage 4：主線單元首次全對 +8；該單元怪獸弱點全部淨化 +4。
- 所有獎勵仍使用既有領取紀錄，避免重複領取。

### 管理後臺
- 沿用 Google Login 與 `players` Collection 新增管理者權限。
- 玩家文件 `isAdmin: true` 時顯示「管理後臺」。
- 管理後臺可查看玩家數、守護經驗總計、金幣總計與玩家資料列表。
- Firestore Rules 阻止普通玩家自行新增或修改 `isAdmin` 欄位。
