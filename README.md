# 環保冒險王 V9.1.2 Stable

本版本直接基於 V9.0.4 工作版修改，未重建專案、未更換框架，也未改動 Firebase Config、題庫、UI 風格或 GitHub Pages 架構。

## 本次重點

- 守護基地新增依時間變化的白天／黑夜，以及晴天、多雲、陰天、雨天動態天空。
- Google 登入後自動讀取玩家資料。
- 新玩家自動建立 `players/{uid}` 與完整雲端存檔。
- 舊玩家自動載入既有 `state`。
- 答題、經驗值、金幣及進度變更會透過既有 `save()` 自動同步 Firestore。
- 排行榜頁面只讀取，不再負責更新玩家資料。
- 排行榜依 `guardianExp` 由大到小排序；相同時以 `updatedAt` 最新優先。
- Firestore 寫入失敗不會中斷遊戲，會保留本機資料、自動重試並提示玩家。
- 保留 V9.0.3 手機版「下一題」按鈕修正。

## Firestore 資料結構

### 玩家資料

路徑：

```text
players/{uid}
```

主要欄位：

```text
uid
displayName
photoURL
guardianExp
coins
stageProgress
state
createdAt
updatedAt
```

### 每週排行榜

路徑：

```text
weeklyRankings/{weekId}/players/{uid}
```

保留既有 Collection 名稱與每週文件結構。排行榜顯示及排序使用 `guardianExp`。

## 部署方式

### GitHub Pages

1. 解壓縮本檔案。
2. 將資料夾內全部檔案上傳並覆蓋 GitHub 儲存庫根目錄。
3. 確認 `.nojekyll` 仍位於根目錄。
4. 等候 GitHub Pages 完成部署。
5. 在手機與電腦使用無痕模式測試，或清除舊版快取後重新開啟。

### Firebase

- 不需修改 `firebase-config.js`。
- Firebase Authentication 必須保持 Google 登入啟用。
- GitHub Pages 網域必須已加入 Firebase Authentication 的授權網域。
- 若有部署 `firestore.rules`，請使用專案內現有規則；本次未改變 Collection 名稱。

## 建議測試流程

1. 使用從未登入過的新 Google 帳號登入。
2. 確認 Firestore 自動建立 `players/{uid}`。
3. 確認文件含 `uid`、`displayName`、`photoURL`、`guardianExp`、`coins`、`stageProgress`、`createdAt`、`updatedAt` 與 `state`。
4. 答對一題後確認 `guardianExp` 與 `state.exp` 自動更新。
5. 完成滿分單元後確認 `coins` 自動更新。
6. 重新整理頁面，確認可自動載入雲端進度。
7. 使用舊玩家帳號登入，確認原有進度未遺失。
8. 開啟排行榜，確認畫面只讀取資料。
9. 建立 0 EXP 與 45 EXP 測試玩家，確認 45 EXP 排在 0 EXP 前面。
10. 相同 EXP 時，確認 `updatedAt` 較新者排名較前。

## 修改函式

主要修改集中在 `firebase.js`：

- `initFirebase()`
- `loadCloudPlayer()`
- `scheduleCloudSave()`
- `saveCloudNow()`
- `syncAllCloudData()`
- `syncWeeklyProfile()`
- `addWeeklyQuestionPoints()`
- `recordWeeklyUnitProgress()`
- `refreshLeaderboard()`

新增輔助函式：

- `playerFields()`
- `weeklyFields()`
- `writeWithRetry()`
- `timestampMillis()`
- `notifyCloudError()`

詳細內容請參閱 `CHANGELOG.md`。

## JavaScript 語法檢查

已執行：

```bash
node --check config.js
node --check firebase-config.js
node --check firebase.js
node --check game.js
node --check questions.js
```

檢查結果均通過。


## 同一裝置切換 Google 帳號

V9.1.1 起，本機玩家資料會以 Google UID 隔離。請先使用遊戲內「登出」，再按「使用 Google 開始冒險」並選擇另一個帳號。新帳號若尚無 Firestore 存檔，會建立全新的玩家資料，不會沿用上一個帳號的進度。
