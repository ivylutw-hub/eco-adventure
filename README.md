# 環保冒險王 V9.2

本版本直接由 V9.1.4 升級，保留 Google Login、Firestore、PWA、2,844 題題庫、關卡、怪獸弱點、基地與排行榜。

## 部署
1. 將本資料夾全部檔案上傳至原 GitHub Pages 專案。
2. 到 Firebase Console → Firestore Database → Rules，貼上 `firestore.rules` 全部內容並按「發布」。
3. 使用已設為 `players/{uid}.isAdmin = true` 的 Google 帳號登出再登入。
4. 看到「🛠️ 管理後臺」後，即可使用儀表板、玩家、題庫、活動及排行榜管理。

## 後臺題目
後臺題目存於 `customQuestions` collection。啟用題目會在玩家 Google 登入時載入，依 Stage 與單元加入固定 10 題挑戰；若該單元有後臺題目，會保留題數為 10 題並以後臺題目替換單元末端題目。原 `questions.js` 不會被改寫。

## 活動
- `doubleExp`：數值建議設為 2，套用於主線 +10 EXP 與弱點 +5 EXP 的首次獎勵。
- `loginCoins`：每位玩家每天每個活動只領取一次。
- `notice`：目前作為後臺活動紀錄，不改變分數。

## 統計說明
- 今日登入：V9.2 部署後，玩家當天成功 Google 登入的人數。
- 活躍玩家：最近 7 天有同步玩家資料的人數。
- 今日答題：V9.2 部署後開始記錄。

## 注意
管理功能必須搭配本版本 `firestore.rules`。只更新網站檔案、未發布 Rules，管理頁會顯示無法讀取或寫入。
