/* 環保冒險王｜講義延伸特訓 100 題｜V10.2.9
 * 只從 Firestore customQuestions 中挑出本套 100 題，不影響四大 Stage。
 */
(function(){
  const TARGET_QUESTIONS = ["「可回收、低污染、省資源」最符合哪一種環保標章的核心概念？","AQI為0～50時，空氣品質屬於哪一級？","AQI為101～150時，主要代表哪種情況？","下列哪一天是世界環境日？","世界地球日是每年的哪一天？","下列哪一個塑膠編號是PET，常見於寶特瓶？","下列哪一個塑膠編號代表HDPE？","哪一種塑膠編號含氯，燃燒時可能產生有害物質，因此不宜任意燃燒？","下列哪一個塑膠編號是LDPE，常見用途包含塑膠袋？","哪一個塑膠編號通常耐熱性較高，適合微波加熱？","保麗龍常見的塑膠編號是？","塑膠分類中的7號Other主要代表什麼？","下列哪一項屬於「藍色水足跡」？","下列哪一項最符合「綠色水足跡」？","灰色水足跡主要表示什麼？","斯德哥爾摩公約主要管制哪一類物質？","DDT最重要的環境特性之一是什麼？","「生物放大」是指污染物在食物鏈中通常出現什麼情形？","蒙特婁議定書主要是為了保護什麼？","巴塞爾公約主要處理哪一項跨國環境問題？","拉姆薩公約主要關注哪一類環境？","CITES（華盛頓公約）主要規範什麼？","生物多樣性公約的核心內容不包含下列何者？","BOD主要代表什麼？","一般而言，水溫升高時，水中的飽和溶氧量會如何變化？","COD主要用來表示什麼？","卡爾森指數CTSI主要用來評估什麼？","CTSI計算常參考透明度、葉綠素a及哪一項水質參數？","酸雨主要與哪兩類污染物有關？","都市熱島效應是指什麼？","《京都議定書》主要針對哪一類環境問題？","依講義，京都議定書列出的主要溫室氣體共有幾類？","在講義列出的全球暖化潛勢數值中，哪一種氣體最高？","「減量」與「調適」的差別何者正確？","CCUS是指哪一項技術？","下列何者屬於「藍碳」？","下列何者屬於「綠碳」？","「公正轉型」最重要的精神是什麼？","12項淨零關鍵戰略中，下列何者屬於生活與生態轉型？","2040年的運具目標依講義為何？","「持久性有機污染物」英文縮寫為何？","POPs容易造成環境問題的原因不包括哪一項？","水足跡由哪三類組成？","下列何者最符合灰色水足跡的概念？","火災分類中，電氣設備引起的火災屬於哪一類？","活性金屬或可燃性金屬引起的火災屬於哪一類？","痛痛病主要與哪種重金屬污染有關？","水俁病主要與哪種污染物有關？","烏腳病主要與哪種物質有關？","小花蔓澤蘭為何被稱為「植物殺手」？","下列哪一項最符合「綠色消費」的做法？","購買飲料時，自備可重複使用的水壺，最直接符合哪一項環保概念？","若一項產品標示「使用再生材料製造」，最主要代表它具有哪一項環境效益？","下列哪一項最可能造成都市空氣污染？","在室內有人抽菸，未抽菸的人吸入的煙霧屬於哪一種污染？","若學校整理操場前先灑水，主要可以減少哪一種污染？","下列哪一項最能降低家庭用水量？","一般而言，水中溶氧量下降，最可能對魚類造成什麼影響？","下列哪一項最可能使湖泊發生優養化？","某河川附近工廠排放未經妥善處理的有機廢水，最可能造成哪一項變化？","若一條河川的水溫由20°C升至30°C，其他條件相同，飽和溶氧量通常會如何？","若城市大量使用深色柏油路面與混凝土，且綠地很少，最可能加劇哪種現象？","下列哪一項做法最符合「源頭減量」？","將紙箱壓扁後再回收，主要有什麼好處？","若山坡地大量砍伐森林，豪雨來臨時最可能增加哪一項風險？","為避免山坡地水土流失，下列哪一項最適當？","若地下儲油槽破損而長期漏油，最需要注意哪一項環境風險？","下列哪一項最可能造成土壤污染？","若食物鏈中某種污染物不易分解，且會在生物體內累積，最需要注意哪種現象？","DDT之所以容易造成長期環境問題，與下列哪項特性較有關？","下列哪一種疾病與鎘污染最具有代表性？","下列哪一種疾病與砷污染最具有代表性？","水俁病主要與哪一種污染物有關？","若產品的碳標籤標示較高的碳足跡數值，通常代表什麼？","「節能標章」最主要是讓消費者辨識哪一類產品？","綠色水足跡主要與哪一種用水來源有關？","藍色水足跡主要涉及哪一類水資源？","某工廠排放污染物，為使受納水體仍能符合水質標準，需要多少水量來稀釋污染物？這個概念與哪種水足跡有關？","下列哪一組氣體全部屬於京都議定書主要管制的溫室氣體？","若一種溫室氣體的GWP越高，在相同質量下代表什麼？","下列哪一項屬於「調適」氣候變遷，而不是直接減少溫室氣體排放？","沿海城市因海平面上升而提高防洪堤，這項措施主要屬於哪一類？","若政府鼓勵大眾運輸、步行與自行車，最直接可同時達成哪兩項環境效益？","下列哪一項最符合「公正轉型」精神？","若燃煤電廠逐步退場，政府同時提供受影響勞工職能訓練，最符合哪一項理念？","CCUS的主要目的為何？","下列哪一項最可能屬於自然碳匯？","若沿海紅樹林、海草床與鹽沼能吸收並儲存大量碳，這類碳通常稱為什麼？","若企業以循環經濟方式讓產品零件維修後再次使用，最主要是在實踐哪種理念？","下列哪一項最符合「能源轉型」方向？","太陽光電與離岸風電都屬於哪一類能源？","依講義所列目標，2040年新售的機車與汽車主要朝哪個方向？","若一個城市同時增加綠地、透水鋪面與遮蔭樹木，最可能帶來哪一項綜合效益？","斯德哥爾摩公約的核心精神主要是管理哪一類物質？","POPs能在遠距離傳輸，因此即使污染源不在某地，仍可能造成污染。這說明POPs具有哪項特性？","若國家希望在危險化學品進出口前取得進口國同意與資訊，最相關的是哪項國際制度？","卡達赫納生物安全議定書主要與哪一項議題相關？","若一國限制某些危險廢棄物跨境運送，最直接涉及哪項公約？","若要防止瀕危野生動植物因國際貿易而遭過度捕捉，最相關的國際公約是？","某國家為保護重要水鳥棲息的天然濕地，最適合參考哪項國際公約？"];
  const TARGET_SET = new Set(TARGET_QUESTIONS);
  const KEY = 'ecoLecture100Progress';
  let state = {answered:0, correct:0, wrong:[], best:0};
  try{ state={...state,...JSON.parse(localStorage.getItem(KEY)||'{}')}; }catch(e){}
  let all=[]; let idx=0; let selected=null; let correctCount=0; let wrong=[];

  const css = document.createElement('style');
  css.textContent = `
  #lecture100Page{position:fixed;inset:0;z-index:9990;background:linear-gradient(180deg,#f5fbf7,#edf7f1);overflow:auto;padding:22px 16px 40px;}
  .lecture100-wrap{max-width:920px;margin:0 auto;}
  .lecture100-head{background:#fff;border-radius:24px;padding:20px;box-shadow:0 10px 30px rgba(0,0,0,.08);margin-bottom:16px;}
  .lecture100-head h2{margin:4px 0 8px;font-size:28px;color:#176b50;}
  .lecture100-head p{margin:0;color:#557066;}
  .lecture100-top{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px;}
  .lecture100-close,.lecture100-start,.lecture100-next{border:0;border-radius:14px;padding:11px 16px;font-weight:800;cursor:pointer;}
  .lecture100-close{background:#edf3ef;color:#315248;}
  .lecture100-start,.lecture100-next{background:#176b50;color:#fff;}
  .lecture100-progress{height:10px;background:#dcebe3;border-radius:99px;overflow:hidden;}
  .lecture100-progress i{display:block;height:100%;width:0;background:#43a66f;border-radius:99px;transition:width .25s;}
  .lecture100-card{background:#fff;border-radius:24px;padding:24px;box-shadow:0 10px 30px rgba(0,0,0,.07);}
  .lecture100-meta{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;}
  .lecture100-tag{background:#eef7f1;border-radius:999px;padding:6px 10px;font-size:13px;font-weight:700;color:#24634f;}
  .lecture100-q{font-size:21px;line-height:1.55;margin:12px 0 20px;}
  .lecture100-opt{width:100%;text-align:left;border:2px solid #e2ebe6;background:#fff;border-radius:15px;padding:14px 16px;margin:7px 0;font-size:16px;cursor:pointer;}
  .lecture100-opt.selected{border-color:#328d69;background:#eff9f3;}
  .lecture100-opt.correct{border-color:#39a86f;background:#edf9f2;}
  .lecture100-opt.wrong{border-color:#d86a5d;background:#fff1ef;}
  .lecture100-feedback{margin-top:16px;padding:14px;border-radius:15px;background:#f4f7f5;line-height:1.6;}
  .lecture100-actions{display:flex;justify-content:flex-end;margin-top:18px;}
  .lecture100-result{text-align:center;}
  .lecture100-score{font-size:52px;font-weight:900;color:#176b50;margin:8px 0;}
  .lecture100-wrong-list{text-align:left;margin-top:20px;}
  .lecture100-wrong-list li{margin:8px 0;line-height:1.5;}
  @media(max-width:600px){#lecture100Page{padding:12px 10px 28px}.lecture100-head h2{font-size:23px}.lecture100-card{padding:17px}.lecture100-q{font-size:18px}}
  `; document.head.appendChild(css);

  function ensurePage(){
    let page=document.getElementById('lecture100Page'); if(page)return page;
    page=document.createElement('div'); page.id='lecture100Page'; page.className='hide';
    page.innerHTML=`<div class="lecture100-wrap">
      <div class="lecture100-head">
        <div class="lecture100-top"><div><small>LECTURE EXTENSION TRAINING</small><h2>🌱 講義延伸特訓｜100 題</h2><p>這 100 題全部是依講義重點設計的延伸題，不會混入原本 2,844 題。</p></div><button class="lecture100-close" type="button">← 回冒險地圖</button></div>
        <div class="lecture100-progress"><i id="lecture100Bar"></i></div>
        <div id="lecture100Status" style="margin-top:8px;font-weight:700;color:#4e6c60">準備中…</div>
      </div>
      <div id="lecture100Body" class="lecture100-card"></div>
    </div>`;
    document.body.appendChild(page);
    page.querySelector('.lecture100-close').onclick=close;
    return page;
  }
  function hideMains(){ document.querySelectorAll('main').forEach(x=>x.classList.add('hide')); }
  function open(){ ensurePage(); hideMains(); document.getElementById('lecture100Page').classList.remove('hide'); loadQuestions(); }
  function close(){ const p=document.getElementById('lecture100Page'); if(p)p.classList.add('hide'); if(typeof showMap==='function')showMap(); }
  async function loadQuestions(){
    const body=document.getElementById('lecture100Body');
    body.innerHTML='<div style="text-align:center;padding:30px">⏳ 正在從題庫載入 100 題…</div>';
    try{
      if(!window.firebase || !firebase.firestore) throw new Error('Firebase尚未載入');
      const snap=await firebase.firestore().collection('customQuestions').get();
      const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
      all=docs.filter(x=>TARGET_SET.has(String(x.q||x.question||'')));
      // 匯入後若因字串格式造成少題，仍按題目文字比對，不補入其他題。
      all.sort((a,b)=>TARGET_QUESTIONS.indexOf(String(a.q||a.question||''))-TARGET_QUESTIONS.indexOf(String(b.q||b.question||'')));
      renderStart();
    }catch(err){
      body.innerHTML='<div style="text-align:center;padding:30px"><h3>⚠️ 題庫載入失敗</h3><p>'+escapeHtml(err.message)+'</p><p>請確認已先匯入「講義延伸特訓｜100 題」CSV，並重新整理網頁。</p></div>';
    }
  }
  function renderStart(){
    const body=document.getElementById('lecture100Body');
    const missing=100-all.length;
    document.getElementById('lecture100Status').textContent=`已找到 ${all.length}／100 題`;
    document.getElementById('lecture100Bar').style.width='0%';
    body.innerHTML=`<div style="text-align:center;padding:20px 8px">
      <div style="font-size:58px">📚</div><h3>講義重點 × 延伸挑戰</h3>
      <p>本專區獨立計算，不會改變四大 Stage 的單元進度。</p>
      ${missing?`<p style="color:#b65a42;font-weight:700">目前只找到 ${all.length} 題，還缺 ${missing} 題。請先匯入完整 100 題 CSV。</p>`:''}
      <button class="lecture100-start" type="button" ${missing?'disabled':''}>🚀 開始 100 題特訓</button>
    </div>`;
    body.querySelector('button').onclick=()=>{idx=0;correctCount=0;wrong=[];renderQ();};
  }
  function normalize(q){
    const opts=Array.isArray(q.opts)?q.opts:[q.A,q.B,q.C,q.D].filter(x=>x!==undefined);
    let ans=Number(q.ans);
    if(Number.isNaN(ans)){const s=String(q.ans||'').toUpperCase();ans='ABCD'.indexOf(s);}
    return {q:String(q.q||q.question||''),opts,ans,exp:String(q.exp||q.explanation||''),level:String(q.level||'講義延伸')};
  }
  function renderQ(){
    const q=normalize(all[idx]); selected=null;
    const bar=document.getElementById('lecture100Bar'); bar.style.width=((idx)/all.length*100)+'%';
    document.getElementById('lecture100Status').textContent=`第 ${idx+1}／${all.length} 題　｜　目前答對 ${correctCount} 題`;
    const body=document.getElementById('lecture100Body');
    body.innerHTML=`<div class="lecture100-meta"><span class="lecture100-tag">${escapeHtml(q.level)}</span><span class="lecture100-tag">第 ${idx+1} 題／${all.length}</span></div><div class="lecture100-q">${escapeHtml(q.q)}</div><div id="lecture100Options"></div><div id="lecture100Feedback" class="lecture100-feedback hide"></div><div class="lecture100-actions"><button id="lecture100Next" class="lecture100-next" disabled>下一題 →</button></div>`;
    const opts=document.getElementById('lecture100Options');
    q.opts.forEach((o,i)=>{const b=document.createElement('button');b.className='lecture100-opt';b.innerHTML=`<b>${'ABCD'[i]}.</b> ${escapeHtml(String(o))}`;b.onclick=()=>choose(i,b,q);opts.appendChild(b);});
    document.getElementById('lecture100Next').onclick=()=>{if(idx<all.length-1){idx++;renderQ()}else renderResult()};
  }
  function choose(i,button,q){
    if(selected!==null)return; selected=i; const ok=i===q.ans; if(ok)correctCount++;else wrong.push({n:idx+1,q:q.q,correct:q.opts[q.ans],your:q.opts[i]});
    document.querySelectorAll('.lecture100-opt').forEach((b,j)=>{b.disabled=true;if(j===q.ans)b.classList.add('correct');if(j===i&&!ok)b.classList.add('wrong');});
    const fb=document.getElementById('lecture100Feedback'); fb.classList.remove('hide'); fb.innerHTML=ok?`<b>✅ 答對了！</b><br>${escapeHtml(q.exp)}`:`<b>❌ 再想一下</b><br>正確答案：${'ABCD'[q.ans]}. ${escapeHtml(String(q.opts[q.ans]))}<br>${escapeHtml(q.exp)}`;
    document.getElementById('lecture100Next').disabled=false;
  }
  function renderResult(){
    const pct=Math.round(correctCount/all.length*100); state.best=Math.max(Number(state.best)||0,pct); state.answered=all.length;state.correct=correctCount;state.wrong=wrong;try{localStorage.setItem(KEY,JSON.stringify(state))}catch(e){}
    document.getElementById('lecture100Bar').style.width='100%'; document.getElementById('lecture100Status').textContent='🎉 100 題完成';
    document.getElementById('lecture100Body').innerHTML=`<div class="lecture100-result"><div style="font-size:58px">🏆</div><h3>講義延伸特訓完成！</h3><div class="lecture100-score">${correctCount}／${all.length}</div><p>正確率 <b>${pct}%</b>　｜　歷史最佳 <b>${state.best}%</b></p><button class="lecture100-start" id="lecture100Again">🔁 再挑戰一次</button> <button class="lecture100-close" id="lecture100Back">← 回地圖</button>${wrong.length?`<div class="lecture100-wrong-list"><h3>📖 本次錯題 ${wrong.length} 題</h3><ol>${wrong.map(x=>`<li><b>第${x.n}題</b> ${escapeHtml(x.q)}<br>你的答案：${escapeHtml(String(x.your))}<br>正確答案：${escapeHtml(String(x.correct))}</li>`).join('')}</ol></div>`:'<p style="margin-top:20px">🌟 全部答對！講義重點掌握得很棒！</p>'}</div>`;
    document.getElementById('lecture100Again').onclick=()=>{idx=0;correctCount=0;wrong=[];renderQ()}; document.getElementById('lecture100Back').onclick=close;
  }
  function escapeHtml(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));}

  function addNav(){
    if(document.getElementById('lecture100NavBtn'))return;
    const nav=document.querySelector('.tabs'); if(!nav)return;
    const b=document.createElement('button'); b.id='lecture100NavBtn';b.type='button';b.textContent='🌱 講義延伸 100 題';b.onclick=open;nav.appendChild(b);
    const map=document.getElementById('map'); if(map&&!document.getElementById('lecture100Card')){
      const card=document.createElement('button');card.id='lecture100Card';card.type='button';card.className='lecture100-map-card';card.onclick=open;card.style.cssText='margin:16px 0;padding:18px;border:0;border-radius:20px;width:100%;text-align:left;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.08);cursor:pointer';card.innerHTML='<div style="font-size:28px">🌱</div><b style="font-size:20px;color:#176b50">講義延伸特訓｜100 題</b><div style="margin-top:6px;color:#5c756b">依講義重點設計的獨立特訓，不混入主線題庫。</div><div style="margin-top:10px;font-weight:800;color:#328d69">點擊開始 →</div>';map.parentNode.insertBefore(card,map.nextSibling);
    }
  }
  function boot(){addNav(); setTimeout(addNav,1200); setTimeout(addNav,3000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
  window.openLecture100=open;
})();
