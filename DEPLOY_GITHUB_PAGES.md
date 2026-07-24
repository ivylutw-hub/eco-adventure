# GitHub Pages 更新步驟

1. 將 ZIP 解壓縮。
2. 把解壓後的所有檔案直接覆蓋到 GitHub 儲存庫目前用於 Pages 的分支根目錄；不要把外層資料夾一起上傳。
3. 確認 `index.html` 位於儲存庫根目錄。
4. Commit 並 Push，等待 GitHub Actions／Pages 顯示部署成功。
5. 開啟網站後按 `Ctrl + F5`；iPad／手機可關閉分頁後重新開啟。
6. 頁首應顯示 `V9.4.1 Beta 5.1.26`。若仍是舊版，代表 Pages 指向的分支或資料夾不是本次覆蓋的位置。

GitHub Pages 設定需確認：
- Settings → Pages
- Build and deployment 的 Branch 應與你上傳檔案的分支一致
- Folder 通常為 `/ (root)`
