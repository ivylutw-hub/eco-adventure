# 環保冒險王 V9.3.6

## 部署

1. 將所有網站檔案上傳至原 GitHub Pages 專案。
2. 將 `firestore.rules` 完整貼到 Firebase Console → Firestore Database → Rules，按「發布」。
3. 強制重新整理網站或清除 PWA 快取。

## 玩家管理

- **重設遊戲紀錄**：保留登入身分與管理員欄位，清除金幣、經驗、關卡、基地和怪獸圖鑑。
- **停用帳號**：可輸入天數、留白表示不限期；輸入 0 可解除停用。
- **永久刪除帳號**：輸入 `DELETE` 後，刪除 Firestore 玩家存檔與本週排行，並寫入 `blockedUsers` 阻止再次進入。

> GitHub Pages 前端無法安全刪除 Firebase Authentication 使用者本身。V9.3 的「永久刪除」是永久刪除遊戲帳號及主要紀錄並封鎖登入；若也要移除 Authentication 使用者，仍需在 Firebase Console → Authentication → Users 刪除，或另建 Cloud Functions/Admin SDK 後端。

## 題庫匯入

支援 CSV 或 JSON。CSV 欄位：`stageId,unit,level,q,A,B,C,D,ans,exp`。答案可填 A/B/C/D 或 0/1/2/3。後臺提供範本下載。

## 活動公告

活動可修改、暫停、恢復，並可選擇是否顯示在首頁「活動公告」欄。


## V9.3.4 新功能

- 每日簽到月曆與月底全勤限定守護者。
- 守護基地可切換編輯模式，拖曳建設並自行鋪設路徑。
- 基地配置儲存在玩家既有 state，不需新增 Firestore Collection。


## V9.3.4 修正

- 若 `blockedUsers` 的新版 Firestore Rules 尚未發布，登入時不再因此中斷原有 `players` 雲端存檔載入。
- 為完整啟用停用／永久刪除功能，仍應部署專案內最新版 `firestore.rules`。
- 基地框恢復 V9.1 尺寸，三個編輯工具固定在右上角。


## V9.3.5 版面調整

- 守護基地桌機版高度增加至約 600px，平板與手機依畫面寬度自動縮放。
- 首頁前四張摘要卡縮窄，活動公告與每日簽到卡加寬，避免文字與月曆擁擠。
- 桌機主內容最大寬度調整為 1240px，維持手機與平板響應式排列。


## V9.3.6 版面與動畫調整

- 首頁改為前四張 2×2、活動公告置中、每日簽到置右的桌機儀表板。
- 守護基地桌機高度約 800px，平板約 620px，手機約 480px。
- 小鳥、小雞、蝴蝶與蜻蜓改為自然慢速移動，並取消旋轉動畫。
