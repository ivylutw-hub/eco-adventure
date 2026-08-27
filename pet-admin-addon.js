/* 毛孩守護者模組：放在 firebase.js 之後載入 */
(function(){
  const PET_STAGE_IDS=['pet1','pet2'];
  const PET_QUESTIONS=["小明在路邊看到一隻看起來受傷的流浪狗，最適合怎麼做？", "飼養寵物前，最重要的是先考慮什麼？", "幫犬貓植入晶片，主要作用是什麼？", "家裡的狗一直吠叫，最好的處理方式是？", "發現有人長期把狗綁在烈日下，又沒有水喝，應該怎麼做？", "養寵物後，下面哪一項是飼主應盡的責任？", "狗狗看到陌生人時一直低吼，這可能代表什麼？", "遇到陌生的狗時，哪個做法比較安全？", "如果寵物生病了，最適合怎麼做？", "飼主不想再養寵物時，最不適當的做法是？", "下列哪一種行為比較符合動物福利？", "小華想養兔子，他最應該先做什麼？", "為什麼不能隨意放生外來種寵物？", "發現路邊有幼貓，第一件事應該怎麼做？", "狗狗一直追自己的尾巴，主人應該怎麼做？", "下列哪種食物通常不適合隨意餵狗？", "想摸陌生人的狗之前，最適合怎麼做？", "寵物走失時，晶片及寵物登記有什麼幫助？", "看到有人故意傷害動物，最適合怎麼辦？", "下列哪一個人最像「負責任的飼主」？"];
  const oldUnitCount=window.unitCount;
  if(typeof oldUnitCount==='function'){
    window.unitCount=function(id){
      if(id==='pet1'||id==='pet2') return 1;
      return oldUnitCount(id);
    };
  }

  function addPetUi(){
    const tabs=document.querySelector('.tabs');
    if(tabs && !document.getElementById('petGuardianNavBtn')){
      const b=document.createElement('button');
      b.id='petGuardianNavBtn';
      b.innerHTML='🐾 毛孩守護者';
      b.onclick=()=>location.href='pet-guardian.html';
      tabs.insertBefore(b, tabs.firstChild);
    }
    const stageSel=document.getElementById('adminQuestionStage');
    if(stageSel && !stageSel.querySelector('option[value="pet1"]')){
      stageSel.insertAdjacentHTML('beforeend',
        '<option value="pet1">毛孩守護者｜基礎</option><option value="pet2">毛孩守護者｜進階</option>');
    }
    const card=document.querySelector('.admin-import-card');
    if(card && !document.getElementById('petMigrateBtn')){
      const b=document.createElement('button');
      b.id='petMigrateBtn'; b.type='button'; b.className='secondary';
      b.textContent='🐾 搬移已匯入的毛孩 20 題';
      b.onclick=migrateExistingPetQuestions;
      card.appendChild(b);
    }
  }

  // 允許既有批次匯入接受 pet1 / pet2。
  window.normalizeImportedQuestion=function(r){
    const opts=r.opts||[r.A,r.B,r.C,r.D];
    let ans=r.ans??r.answer??0;
    if(typeof ans==='string'&&/^[ABCD]$/i.test(ans)) ans='ABCD'.indexOf(ans.toUpperCase());
    let stageId=String(r.stageId||r.stage||'s1').toLowerCase();
    if(/^stage[1-4]$/.test(stageId)) stageId=stageId.replace('stage','s');
    return {
      stageId, unit:Number(r.unit)||1, level:r.level||'初級',
      q:r.q||r.question||'', opts:Array.isArray(opts)?opts.slice(0,4):[],
      ans:Number(ans)||0, exp:r.exp||r.explanation||'', active:true
    };
  };

  window.adminImportQuestions=async function(event){
    const file=event.target.files?.[0]; if(!file)return;
    try{
      const text=await file.text(); let rows;
      if(file.name.toLowerCase().endsWith('.json')){
        const parsed=JSON.parse(text); rows=Array.isArray(parsed)?parsed:parsed.questions;
      }else{
        const lines=text.replace(/^\ufeff/,'').split(/\r?\n/).filter(Boolean);
        const heads=parseCsvLine(lines.shift()).map(x=>x.trim());
        rows=lines.map(line=>Object.fromEntries(parseCsvLine(line).map((v,i)=>[heads[i],v])));
      }
      const valid=['s1','s2','s3','s4','pet1','pet2'];
      rows=(rows||[]).map(normalizeImportedQuestion)
        .filter(q=>q.q&&q.opts.length===4&&valid.includes(q.stageId));
      if(!rows.length)throw new Error('沒有可匯入題目');
      if(!confirm(`確認匯入 ${rows.length} 題？`))return;
      for(let i=0;i<rows.length;i+=400){
        const batch=cloudDb.batch();
        rows.slice(i,i+400).forEach(q=>{
          const ref=cloudDb.collection('customQuestions').doc();
          batch.set(ref,{...q,
            createdAt:firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt:firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        await batch.commit();
      }
      toast(`已匯入 ${rows.length} 題`);
      await loadAdminQuestions(); await loadCustomQuestions();
    }catch(err){
      console.error(err); toast('匯入失敗：請檢查檔案格式');
    }finally{ event.target.value=''; }
  };

  window.migrateExistingPetQuestions=async function(){
    if(!cloudDb||!cloudIsAdmin){toast('請先使用管理員帳號');return;}
    if(!confirm('將先前誤匯入 s1 的毛孩 20 題搬到獨立 pet1 / pet2 題庫？'))return;
    try{
      const snap=await cloudDb.collection('customQuestions').limit(500).get();
      const matches=snap.docs.filter(d=>PET_QUESTIONS.includes((d.data()||{}).q));
      if(!matches.length){toast('找不到先前匯入的毛孩題目');return;}
      const batch=cloudDb.batch();
      matches.forEach(d=>{
        const q=(d.data()||{}).q;
        const idx=PET_QUESTIONS.indexOf(q);
        batch.update(d.ref,{
          stageId:idx<10?'pet1':'pet2',
          unit:1,
          level:idx<10?'初級':'進階',
          updatedAt:firebase.firestore.FieldValue.serverTimestamp()
        });
      });
      await batch.commit();
      await loadAdminQuestions(); await loadCustomQuestions();
      toast(`✅ 已搬移 ${matches.length} 題到毛孩守護者`);
    }catch(err){console.error(err);toast('搬移失敗，請檢查管理員權限');}
  };

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addPetUi);
  else addPetUi();
  setTimeout(addPetUi,1200);
})();
