// 選填：環境部環境資料開放平臺 API Key。
// 未填寫也可正常顯示 AQI；系統會自動使用免設定備援資料，並依環境部 AQI 分級呈現。
window.ECO_CONFIG = Object.assign({
  MOENV_API_KEY: ''
}, window.ECO_CONFIG || {});
