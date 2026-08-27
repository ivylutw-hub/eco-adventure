
/* =========================================================
   毛孩守護者整合系統 V1
   - 共用環保冒險王守護金幣
   - 守護基地：毛孩之家養成
   - 我的資料：自訂圖片頭像（本機＋雲端 state）
   ========================================================= */
(function(){
  const PET_STATE_KEY='petGuardian';
  const PET_MAX=100;

  function clamp(n,min=0,max=PET_MAX){
    n=Number(n)||0; return Math.max(min,Math.min(max,n));
  }

  function ensurePetState(){
    if(typeof st==='undefined') return null;
    if(!st[PET_STATE_KEY] || typeof st[PET_STATE_KEY]!=='object'){
      st[PET_STATE_KEY]={
        adopted:false,
        petType:'',
        petName:'',
        hunger:80,
        clean:80,
        happy:70,
        trust:10,
        careHistory:{},
        lastCareDate:'',
        totalCare:0
      };
    }
    const p=st[PET_STATE_KEY];
    p.hunger=clamp(p.hunger,0,100);
    p.clean=clamp(p.clean,0,100);
    p.happy=clamp(p.happy,0,100);
    p.trust=clamp(p.trust,0,100);
    if(!p.careHistory||typeof p.careHistory!=='object')p.careHistory={};
    return p;
  }

  function todayKey(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function petEmoji(type){
    return ({dog:'🐶',cat:'🐱',rabbit:'🐰'})[type]||'🐾';
  }

  function petTypeName(type){
    return ({dog:'救援犬',cat:'救援貓',rabbit:'救援兔'})[type]||'毛孩';
  }

  function petToast(msg){
    if(typeof toast==='function')toast(msg);
    else alert(msg);
  }

  function savePetState(){
    if(typeof save==='function')save();
    if(typeof header==='function')header();
    renderPetHome();
    applyCustomAvatarEverywhere();
  }

  function petAverage(p){
    return Math.round((p.hunger+p.clean+p.happy+p.trust)/4);
  }

  function careStatus(v){
    if(v>=80)return '很好';
    if(v>=55)return '普通';
    if(v>=30)return '需要關心';
    return '需要立即照顧';
  }

  function petCareAction(action){
    const p=ensurePetState();
    if(!p||!p.adopted){petToast('請先認養一位毛孩夥伴');return;}

    const today=todayKey();
    const key=`${today}|${action}`;
    if(p.careHistory[key]){
      petToast('今天已完成這項照顧，毛孩需要規律而不是過度照顧。');
      return;
    }

    const rules={
      water:{label:'補充乾淨飲水',cost:0,hunger:8,clean:0,happy:2,trust:2},
      feed:{label:'準備合適餐食',cost:1,hunger:18,clean:-2,happy:3,trust:3},
      clean:{label:'整理生活環境',cost:0,hunger:0,clean:18,happy:4,trust:3},
      walk:{label:'散步與陪伴',cost:0,hunger:-5,clean:-3,happy:18,trust:6},
      health:{label:'健康照護基金',cost:2,hunger:2,clean:2,happy:5,trust:10}
    };
    const r=rules[action];
    if(!r)return;

    const coins=Number(st.coins)||0;
    if(coins<r.cost){
      petToast(`守護金幣不足，需要 ${r.cost} 枚。先去完成毛孩或環保任務吧！`);
      return;
    }

    st.coins=coins-r.cost;
    p.hunger=clamp(p.hunger+r.hunger);
    p.clean=clamp(p.clean+r.clean);
    p.happy=clamp(p.happy+r.happy);
    p.trust=clamp(p.trust+r.trust);
    p.careHistory[key]=true;
    p.lastCareDate=today;
    p.totalCare=(Number(p.totalCare)||0)+1;

    savePetState();
    petToast(`${petEmoji(p.petType)} 完成「${r.label}」${r.cost?`，使用 ${r.cost} 枚守護金幣`:''}！`);
  }

  function adoptPet(type){
    const p=ensurePetState();
    if(!p)return;
    if(p.adopted&&!confirm('目前已經有毛孩夥伴。確定要重新選擇認養夥伴嗎？原本的照顧數值會重設。'))return;

    const defaultNames={dog:'豆豆',cat:'米花',rabbit:'小芽'};
    const input=prompt(`幫${petTypeName(type)}取一個名字：`,defaultNames[type]||'毛孩');
    if(input===null)return;

    p.adopted=true;
    p.petType=type;
    p.petName=(input.trim()||defaultNames[type]||'毛孩').slice(0,10);
    p.hunger=80;p.clean=80;p.happy=75;p.trust=15;
    p.careHistory={};p.lastCareDate='';p.totalCare=0;

    savePetState();
    petToast(`🏠 歡迎 ${p.petName} 加入毛孩之家！認養代表一生的照顧責任。`);
  }

  function renamePet(){
    const p=ensurePetState();if(!p||!p.adopted)return;
    const input=prompt('新的名字：',p.petName||'毛孩');
    if(input===null)return;
    p.petName=(input.trim()||p.petName).slice(0,10);
    savePetState();
  }

  window.petCareAction=petCareAction;
  window.adoptPet=adoptPet;
  window.renamePet=renamePet;

  function renderBar(label,value,icon){
    return `<div class="pet-care-row">
      <div class="pet-care-label"><span>${icon} ${label}</span><b>${value}%・${careStatus(value)}</b></div>
      <div class="pet-care-track"><i style="width:${value}%"></i></div>
    </div>`;
  }

  function renderPetHome(){
    const host=document.getElementById('petHomePanel');
    if(!host || typeof st==='undefined')return;
    const p=ensurePetState();
    if(!p)return;

    if(!p.adopted){
      host.innerHTML=`
        <div class="pet-home-empty">
          <div class="pet-home-scene">🏡　🐾　🌳</div>
          <h3>建立你的「毛孩之家」</h3>
          <p>這裡不是寵物商店，而是練習「認養前評估、終身照護、尊重需求」的養成區。</p>
          <div class="pet-adopt-grid">
            <button onclick="adoptPet('dog')"><span>🐶</span><b>認養救援犬</b><small>需要散步、陪伴與規律照護</small></button>
            <button onclick="adoptPet('cat')"><span>🐱</span><b>認養救援貓</b><small>需要安全空間、清潔與尊重界線</small></button>
            <button onclick="adoptPet('rabbit')"><span>🐰</span><b>認養救援兔</b><small>需要正確飲食、環境與健康觀察</small></button>
          </div>
          <p class="pet-learning-note">💡 養成遊戲的重點不是「收集更多動物」，而是把一位毛孩照顧好。</p>
        </div>`;
      return;
    }

    const avg=petAverage(p);
    host.innerHTML=`
      <div class="pet-home-head">
        <div class="pet-avatar-big">${petEmoji(p.petType)}</div>
        <div><small>毛孩之家居民</small><h3>${escapePet(p.petName)}</h3>
        <p>${petTypeName(p.petType)}・照顧指數 <b>${avg}%</b></p></div>
        <button class="pet-small-btn" onclick="renamePet()">✏️ 改名</button>
      </div>
      <div class="pet-home-land">
        <div class="pet-home-house">🏡</div>
        <div class="pet-home-animal">${petEmoji(p.petType)}</div>
        <div class="pet-home-bowl">🥣</div>
        <div class="pet-home-tree">🌳</div>
        <div class="pet-home-toy">🧸</div>
      </div>
      <div class="pet-care-bars">
        ${renderBar('飲食與飲水',p.hunger,'🥣')}
        ${renderBar('環境清潔',p.clean,'🧹')}
        ${renderBar('心情與活動',p.happy,'💛')}
        ${renderBar('信任關係',p.trust,'🤝')}
      </div>
      <div class="pet-care-actions">
        <button onclick="petCareAction('water')">💧<b>補充飲水</b><small>免費・每天一次</small></button>
        <button onclick="petCareAction('feed')">🥗<b>合適餐食</b><small>🪙 1・每天一次</small></button>
        <button onclick="petCareAction('clean')">🧹<b>整理環境</b><small>免費・每天一次</small></button>
        <button onclick="petCareAction('walk')">🦮<b>散步陪伴</b><small>免費・每天一次</small></button>
        <button onclick="petCareAction('health')">🩺<b>健康照護</b><small>🪙 2・每天一次</small></button>
      </div>
      <div class="pet-learning-note">📘 今日照顧會留下紀錄。真正的負責任飼養是「每天持續」，不是一次把所有按鈕按滿。</div>`;
  }

  function escapePet(s){
    return String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function ensurePetHomeUi(){
    const base=document.getElementById('basePage');
    if(!base||document.getElementById('petHomeSection'))return;
    const section=document.createElement('section');
    section.id='petHomeSection';
    section.className='pet-home-section';
    section.innerHTML=`
      <div class="pet-home-title">
        <div><small>RESPONSIBLE PET CARE</small><h2>🐾 毛孩之家</h2>
        <p>把「毛孩守護者」學到的責任飼養觀念，實際用在每天的照顧任務。</p></div>
        <a href="#" onclick="showPetGuardian();return false;">📚 去毛孩守護者答題</a>
      </div>
      <div id="petHomePanel"></div>`;
    const savePanel=base.querySelector('.save-panel');
    if(savePanel)base.insertBefore(section,savePanel);
    else base.appendChild(section);
    renderPetHome();
  }

  /* ---------- 自訂頭像 ---------- */
  function resizeAvatar(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onerror=reject;
      reader.onload=()=>{
        const img=new Image();
        img.onerror=reject;
        img.onload=()=>{
          const size=256,canvas=document.createElement('canvas');
          canvas.width=size;canvas.height=size;
          const ctx=canvas.getContext('2d');
          const scale=Math.max(size/img.width,size/img.height);
          const w=img.width*scale,h=img.height*scale;
          ctx.drawImage(img,(size-w)/2,(size-h)/2,w,h);
          resolve(canvas.toDataURL('image/jpeg',.82));
        };
        img.src=reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadCustomAvatar(event){
    const file=event.target.files?.[0];
    if(!file)return;
    if(!file.type.startsWith('image/')){petToast('請選擇圖片檔');event.target.value='';return;}
    if(file.size>8*1024*1024){petToast('圖片請小於 8MB');event.target.value='';return;}
    try{
      const data=await resizeAvatar(file);
      st.customAvatarDataUrl=data;
      st.useCustomAvatar=true;
      if(typeof save==='function')save();
      applyCustomAvatarEverywhere();
      if(typeof renderProfile==='function')renderProfile();
      setTimeout(applyCustomAvatarEverywhere,0);
      petToast('✅ 自訂頭像已套用');
    }catch(e){
      console.error(e);petToast('圖片處理失敗，請換一張圖片');
    }finally{event.target.value='';}
  }

  function useBuiltInAvatar(){
    if(typeof st==='undefined')return;
    st.useCustomAvatar=false;
    if(typeof save==='function')save();
    if(typeof header==='function')header();
    if(typeof renderProfile==='function')renderProfile();
    setTimeout(applyCustomAvatarEverywhere,0);
    petToast('已切回內建守護者頭像');
  }

  function removeCustomAvatar(){
    if(typeof st==='undefined')return;
    st.customAvatarDataUrl='';
    st.useCustomAvatar=false;
    if(typeof save==='function')save();
    if(typeof header==='function')header();
    if(typeof renderProfile==='function')renderProfile();
    petToast('已移除自訂頭像');
  }

  window.uploadCustomAvatar=uploadCustomAvatar;
  window.useBuiltInAvatar=useBuiltInAvatar;
  window.removeCustomAvatar=removeCustomAvatar;

  function avatarImg(data,cls=''){
    return `<img class="custom-avatar-img ${cls}" src="${data}" alt="自訂守護者頭像">`;
  }

  function applyCustomAvatarEverywhere(){
    if(typeof st==='undefined' || !st.useCustomAvatar || !st.customAvatarDataUrl)return;
    const data=st.customAvatarDataUrl;
    ['playerAvatar','profileAvatarPreview','baseProfileAvatar'].forEach(id=>{
      const el=document.getElementById(id);
      if(el)el.innerHTML=avatarImg(data);
    });
  }

  function ensureAvatarUploadUi(){
    const page=document.getElementById('profilePage');
    if(!page||document.getElementById('customAvatarBox'))return;
    const heading=[...page.querySelectorAll('h3')].find(x=>x.textContent.includes('選擇守護者頭像'));
    if(!heading)return;

    const box=document.createElement('section');
    box.id='customAvatarBox';
    box.className='custom-avatar-box';
    box.innerHTML=`
      <div class="custom-avatar-preview" id="customAvatarPreview">📷</div>
      <div class="custom-avatar-copy">
        <small>MY PHOTO AVATAR</small>
        <h3>上傳自己的頭像圖片</h3>
        <p>支援 JPG、PNG、WEBP；圖片會自動裁切成正方形並縮小保存。</p>
        <div class="custom-avatar-actions">
          <label class="custom-avatar-upload">📁 選擇圖片
            <input type="file" accept="image/jpeg,image/png,image/webp" onchange="uploadCustomAvatar(event)">
          </label>
          <button type="button" onclick="useBuiltInAvatar()">🐾 使用內建頭像</button>
          <button type="button" class="danger-lite" onclick="removeCustomAvatar()">🗑️ 移除自訂圖片</button>
        </div>
        <small class="custom-avatar-privacy">🔒 自訂圖片只用於你的玩家顯示；排行榜仍使用原本的守護者圖示，避免把私人照片公開給其他玩家。</small>
      </div>`;
    heading.parentNode.insertBefore(box,heading);

    updateCustomAvatarBox();
  }

  function updateCustomAvatarBox(){
    if(typeof st==='undefined')return;
    const p=document.getElementById('customAvatarPreview');
    if(p)p.innerHTML=st.customAvatarDataUrl?avatarImg(st.customAvatarDataUrl,'preview'):'📷';
    applyCustomAvatarEverywhere();
  }

  /* ---------- 對原本畫面函式做安全包裝 ---------- */
  function patchFunction(name,after){
    const fn=window[name];
    if(typeof fn!=='function'||fn.__petPatched)return;
    const wrapped=function(){
      const result=fn.apply(this,arguments);
      try{after.apply(this,arguments)}catch(e){console.warn('pet addon',name,e)}
      return result;
    };
    wrapped.__petPatched=true;
    window[name]=wrapped;
  }

  function install(){
    if(typeof st==='undefined'){
      setTimeout(install,100);return;
    }
    ensurePetState();
    ensurePetHomeUi();
    ensureAvatarUploadUi();
    applyCustomAvatarEverywhere();

    patchFunction('showBase',()=>{ensurePetHomeUi();renderPetHome();setTimeout(applyCustomAvatarEverywhere,0)});
    patchFunction('renderBase',()=>{ensurePetHomeUi();renderPetHome();setTimeout(applyCustomAvatarEverywhere,0)});
    patchFunction('showProfile',()=>{ensureAvatarUploadUi();updateCustomAvatarBox();setTimeout(applyCustomAvatarEverywhere,0)});
    patchFunction('renderProfile',()=>{ensureAvatarUploadUi();updateCustomAvatarBox();setTimeout(applyCustomAvatarEverywhere,0)});
    patchFunction('header',()=>setTimeout(applyCustomAvatarEverywhere,0));

    /* 從毛孩頁直接跳毛孩之家 */
    let goPetBase=false;
    try{
      goPetBase=sessionStorage.getItem('ecoGoPetBase')==='1';
      if(goPetBase)sessionStorage.removeItem('ecoGoPetBase');
    }catch(e){}
    if(goPetBase){
      let n=0;
      const t=setInterval(()=>{
        n++;
        const game=document.getElementById('game');
        if(game&&!game.classList.contains('hide')&&typeof showBase==='function'){
          clearInterval(t);showBase();
          setTimeout(()=>document.getElementById('petHomeSection')?.scrollIntoView({behavior:'smooth',block:'start'}),250);
        }
        if(n>40)clearInterval(t);
      },200);
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();


/* =========================================================
   毛孩守護者 V3：直接嵌入主遊戲，同一份 st / save / wrongNotes
   ========================================================= */
(function installIntegratedPetGuardian(){
  const PET_STAGE={
    pet1:{name:'責任飼主基礎',full:'毛孩守護者・責任飼主基礎',icon:'🐕',reward:2,desc:['安全互動、晶片、醫療、飼養責任','日常照護、散步、飲水與健康觀察','肢體語言、外出安排與友善互動']},
    pet2:{name:'動物福利進階',full:'毛孩守護者・動物福利進階',icon:'🐾',reward:4,desc:['動物福利、外來種、救援與情境判斷','特殊寵物、野生動物、棄養與照護責任','通報、安全、野放風險與完整情境判斷']}
  };
  let ps='',pu=0,pquiz=[],pqi=0,pscore=0,panswered=false,pselected=null,preplay=false;

  function ready(){return typeof st!=='undefined'&&typeof save==='function'&&typeof window.customQuestionsForUnit==='function'}
  function petEnsure(){
    if(!st.completed||typeof st.completed!=='object')st.completed={};
    if(!st.unitProgress||typeof st.unitProgress!=='object')st.unitProgress={};
    if(!st.unitScores||typeof st.unitScores!=='object')st.unitScores={};
    if(!st.wrongNotes||typeof st.wrongNotes!=='object')st.wrongNotes={};
    if(!st.coinAwarded||typeof st.coinAwarded!=='object')st.coinAwarded={};
    if(!st.mainExpAwarded||typeof st.mainExpAwarded!=='object')st.mainExpAwarded={};
    ['pet1','pet2'].forEach(s=>{
      if(!Array.isArray(st.completed[s]))st.completed[s]=[];
      if(!st.unitProgress[s]||typeof st.unitProgress[s]!=='object')st.unitProgress[s]={};
      if(!st.unitScores[s]||typeof st.unitScores[s]!=='object')st.unitScores[s]={};
    });
  }
  function qs(s,u){return (window.customQuestionsForUnit(s,u)||[]).slice().sort((a,b)=>String(a.id).localeCompare(String(b.id))).slice(0,10)}
  function done(s,u){petEnsure();return st.completed[s].includes(u-1)}
  function answered(s,u){petEnsure();return Math.max(0,Math.min(10,Number(st.unitProgress[s][u-1]||0)))}
  function savedScore(s,u){petEnsure();return Math.max(0,Number(st.unitScores[s][u-1]||0))}

  function makePage(){
    if(document.getElementById('petGuardianPage'))return;
    const game=document.getElementById('game');if(!game)return;
    const main=document.createElement('main');main.id='petGuardianPage';main.className='hide pet-guardian-main';
    main.innerHTML=`
      <section id="petAdventureHome">
        <div class="title pet-adventure-title"><div><small>PET GUARDIAN KNOWLEDGE</small><h2>🐾 毛孩守護者</h2><p>和「環保知識」使用同一套答題、存檔、金幣、EXP 與怪獸弱點圖鑑機制。</p></div><div class="pet-main-summary"><b id="petMainCoins">🪙 0</b><span id="petMainDone">0 / 6 單元</span></div></div>
        <section class="pet-stage-block"><div class="pet-stage-heading"><h3>🐕 責任飼主基礎</h3><small>PET STAGE 01</small></div><div class="pet-map-units" id="petMainUnits1"></div></section>
        <section class="pet-stage-block"><div class="pet-stage-heading"><h3>🐾 動物福利進階</h3><small>PET STAGE 02</small></div><div class="pet-map-units" id="petMainUnits2"></div></section>
      </section>
      <section id="petAdventureQuiz" class="hide pet-adventure-quiz">
        <div class="quizTop"><button class="back" type="button" onclick="showPetGuardian()">← 暫停冒險</button><b id="petQuizCount"></b></div>
        <div class="bar"><i id="petQuizBar"></i></div>
        <div class="enemy"><span id="petEnemyIcon">🐾</span><div><small>毛孩守護任務</small><b id="petEnemyName">責任飼養迷霧</b></div></div>
        <span class="tag" id="petLevelTag"></span><h2 id="petQuestion"></h2><div class="options" id="petOptions"></div>
        <div class="answer-actions" id="petAnswerActions"><button class="primary" disabled id="petSubmitBtn" type="button">確定送出</button></div>
        <div class="feedback hide" id="petFeedback"></div><button class="primary hide" id="petNextBtn" type="button">下一題 →</button>
      </section>
      <section id="petAdventureResult" class="hide center pet-adventure-result"><div class="resultIcon">🐾</div><small>UNIT COMPLETE</small><h2 id="petResultTitle"></h2><div class="score"><b id="petResultScore">0</b><span>分</span></div><p id="petResultMsg"></p><div class="reward"><div>🪙<b id="petCoinReward">未獲得</b><small>滿分獎勵</small></div><div>✨<b id="petExpReward">0 EXP</b><small>守護經驗</small></div><div>⭐<b id="petStars">★</b><small>本次表現</small></div></div><button class="primary" type="button" onclick="showPetGuardian()">回毛孩守護者</button></section>`;
    const stats=game.querySelector('.stats.global-status-row');
    if(stats)game.insertBefore(main,stats);else game.appendChild(main);
    document.getElementById('petSubmitBtn').onclick=petSubmit;
    document.getElementById('petNextBtn').onclick=petNext;
  }
  function hideAllMain(){document.querySelectorAll('#game main[id]').forEach(x=>x.classList.add('hide'))}
  function showPart(id){['petAdventureHome','petAdventureQuiz','petAdventureResult'].forEach(x=>document.getElementById(x)?.classList.add('hide'));document.getElementById(id)?.classList.remove('hide');document.body.classList.toggle('quiz-mode',id==='petAdventureQuiz');requestAnimationFrame(()=>scrollTo({top:0,left:0,behavior:'auto'}))}

  function petUnitCard(s,u){
    const q=qs(s,u),n=q.length,a=answered(s,u),sc=savedScore(s,u),d=done(s,u),perfect=Boolean(st.coinAwarded[`${s}|${u-1}`]);
    const pct=n?Math.round(Math.min(a,n)/n*100):0;
    return `<button class="pet-map-unit ${d?'done':a?'partial':''}" onclick="startPetUnit('${s}',${u})"><div class="pet-unit-icon">${d?'✅':PET_STAGE[s].icon}</div><small>UNIT ${u}</small><h4>單元 ${u}</h4><p>${PET_STAGE[s].desc[u-1]}</p><div class="pet-unit-meta"><span>${n} 題</span><span>${d?(perfect?'滿分完成':'已完成'):a?`進行中：${a}/${n}`:'尚未開始'}</span></div><div class="pet-unit-progress"><i style="width:${pct}%"></i></div><div class="pet-unit-bottom"><span>目前 ${sc}/${n||10}</span><b>🪙 滿分 +${PET_STAGE[s].reward}</b></div></button>`;
  }
  function renderPetHome(){
    if(!ready())return;petEnsure();
    document.getElementById('petMainUnits1').innerHTML=[1,2,3].map(u=>petUnitCard('pet1',u)).join('');
    document.getElementById('petMainUnits2').innerHTML=[1,2,3].map(u=>petUnitCard('pet2',u)).join('');
    document.getElementById('petMainCoins').textContent=`🪙 ${Number(st.coins)||0}`;
    document.getElementById('petMainDone').textContent=`${st.completed.pet1.length+st.completed.pet2.length} / 6 單元`;
  }
  window.showPetGuardian=function(){if(!ready()){setTimeout(showPetGuardian,120);return}makePage();hideAllMain();document.getElementById('petGuardianPage').classList.remove('hide');showPart('petAdventureHome');renderPetHome();if(typeof header==='function')header()};

  window.startPetUnit=function(s,u){
    if(!ready())return;petEnsure();ps=s;pu=u;pquiz=qs(s,u);if(!pquiz.length){toast('這個毛孩單元目前沒有題目');return}
    preplay=done(s,u);pqi=preplay?0:Math.min(answered(s,u),pquiz.length-1);pscore=preplay?0:savedScore(s,u);showPart('petAdventureQuiz');petRenderQ();
  };
  function petMonster(q){const t=`${q.q||''} ${q.exp||''}`;if(/棄養|認養|飼主|責任/.test(t))return['🐕‍🦺','棄養迷霧獸','負責任飼養、認養前評估與終身照護'];if(/晶片|登記|走失/.test(t))return['🏷️','走失迷蹤怪','晶片、寵物登記與正確身分管理'];if(/醫療|獸醫|生病|健康|中暑/.test(t))return['🩺','疏忽病痛獸','觀察健康訊號並及時尋求獸醫協助'];if(/野放|外來種|生態|野生/.test(t))return['🌿','野放失衡怪','不任意野放，尊重原生生態與野生動物'];return['🐾','毛孩迷霧怪','理解動物需求、尊重生命並採取正確照護'];}
  function noteKey(q){return `${ps}|${q.id}`}
  function recordPetWrong(q){const k=noteKey(q),prev=st.wrongNotes[k]||{},m=petMonster(q);st.wrongNotes[k]={...prev,key:k,stageId:ps,stageName:PET_STAGE[ps].full,unit:pu,level:q.level||'毛孩守護',question:q.q,explanation:q.exp,options:q.opts,answer:q.ans,attempts:(prev.attempts||0)+1,firstWrongAt:prev.firstWrongAt||new Date().toISOString(),lastWrongAt:new Date().toISOString(),mastered:false,masteredAt:null,monsterEmoji:m[0],monsterName:m[1],monsterWeakness:m[2]}}
  function masterPetWrong(q){const k=noteKey(q);if(st.wrongNotes[k]&&!st.wrongNotes[k].mastered){st.wrongNotes[k].mastered=true;st.wrongNotes[k].masteredAt=new Date().toISOString()}}
  function petRenderQ(){panswered=false;pselected=null;const q=pquiz[pqi];document.getElementById('petQuizCount').textContent=`第 ${pqi+1} 題 / ${pquiz.length} 題`;document.getElementById('petQuizBar').style.width=`${pqi/pquiz.length*100}%`;document.getElementById('petEnemyIcon').textContent=PET_STAGE[ps].icon;document.getElementById('petEnemyName').textContent=PET_STAGE[ps].name;document.getElementById('petLevelTag').textContent=q.level||'毛孩守護';document.getElementById('petQuestion').textContent=q.q;const box=document.getElementById('petOptions');box.innerHTML='';q.opts.forEach((o,i)=>{const b=document.createElement('button');b.className='option';b.innerHTML=`<b>${String.fromCharCode(65+i)}.</b> ${o}`;b.onclick=()=>{if(panswered)return;pselected=i;[...box.children].forEach((x,j)=>x.classList.toggle('selected',j===i));document.getElementById('petSubmitBtn').disabled=false};box.appendChild(b)});document.getElementById('petFeedback').className='feedback hide';document.getElementById('petFeedback').innerHTML='';document.getElementById('petAnswerActions').classList.remove('hide');document.getElementById('petSubmitBtn').disabled=true;document.getElementById('petNextBtn').classList.add('hide')}
  function petSubmit(){
    if(panswered||pselected===null){toast('請先選擇一個答案');return}panswered=true;const q=pquiz[pqi],ok=pselected===q.ans;
    if(typeof recordAnswerActivity==='function')recordAnswerActivity();else st.totalAnswered=(Number(st.totalAnswered)||0)+1;
    let exp=0;if(ok){pscore++;st.totalCorrect=(Number(st.totalCorrect)||0)+1;masterPetWrong(q);const ek=`${ps}|${q.id}`;if(!st.mainExpAwarded[ek]){exp=10*(typeof activeExpMultiplier==='function'?activeExpMultiplier():1);if(typeof addExp==='function')addExp(exp);else st.exp=(Number(st.exp)||0)+exp;st.mainExpAwarded[ek]=true;if(typeof addWeeklyQuestionPoints==='function')addWeeklyQuestionPoints(exp)}}else recordPetWrong(q);
    const box=document.getElementById('petOptions');[...box.children].forEach((b,j)=>{b.disabled=true;b.classList.remove('selected');if(ok&&j===pselected)b.classList.add('good');if(!ok&&j===pselected)b.classList.add('bad')});
    const fb=document.getElementById('petFeedback');fb.className='feedback '+(ok?'good':'bad');fb.innerHTML=ok?`<b>✅ 答對了！</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="exp-gain">${exp?`✨ +${exp} EXP`:'本題經驗值已領取，不重複計分'}</div>`:`<b>🤔 這題已記進「怪獸弱點圖鑑」</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="feedback-note">不公布答案，也不立即重答；之後可到怪獸弱點圖鑑再次挑戰。</div><div class="exp-gain">本題不獲得經驗值</div>`;
    if(!preplay){st.unitProgress[ps][pu-1]=Math.min(pquiz.length,pqi+1);st.unitScores[ps][pu-1]=pscore}
    save();if(typeof header==='function')header();if(typeof updateWeaknessBadge==='function')updateWeaknessBadge();
    document.getElementById('petAnswerActions').classList.add('hide');document.getElementById('petNextBtn').classList.remove('hide');
  }
  function petNext(){if(!panswered)return;pqi++;if(pqi>=pquiz.length)petFinish();else petRenderQ()}
  function petFinish(){petEnsure();const idx=pu-1,d=st.completed[ps],first=!d.includes(idx),perfect=pscore===pquiz.length,ck=`${ps}|${idx}`,firstPerfect=perfect&&!st.coinAwarded[ck],reward=PET_STAGE[ps].reward;if(first)d.push(idx);if(firstPerfect){st.coins=(Number(st.coins)||0)+reward;st.coinAwarded[ck]=true}st.unitProgress[ps][idx]=10;st.unitScores[ps][idx]=pscore;const pct=Math.round(pscore/pquiz.length*100);save();if(typeof header==='function')header();document.getElementById('petResultTitle').textContent=`${PET_STAGE[ps].name}・單元 ${pu} 完成！`;document.getElementById('petResultScore').textContent=pct;document.getElementById('petResultMsg').textContent=perfect?(firstPerfect?`本次 10 題全部答對，獲得 ${reward} 枚守護金幣！`:'本單元滿分獎勵已領取，不重複獲得金幣。'):(first?'首次完成單元，但本次未全對，因此不獲得金幣。':'本次未全對，因此不獲得金幣。');document.getElementById('petCoinReward').textContent=firstPerfect?`+${reward}`:(perfect?'已領取':'未獲得');const earned=pquiz.filter(q=>st.mainExpAwarded[`${ps}|${q.id}`]).length*10;document.getElementById('petExpReward').textContent=`本單元累計 ${earned} EXP`;document.getElementById('petStars').textContent=pct===100?'★★★★★':pct>=90?'★★★★':pct>=80?'★★★':pct>=60?'★★':'★';preplay=false;showPart('petAdventureResult')}

  function patchNavigation(){
    const b=document.getElementById('petGuardianNavBtn');if(b){b.onclick=showPetGuardian;b.removeAttribute('data-href');}
    document.querySelectorAll('.tabs button').forEach(btn=>{if(btn.textContent.includes('冒險地圖'))btn.innerHTML=btn.innerHTML.replace('冒險地圖','環保知識')});
  }
  function patchPage(){if(typeof window.page!=='function'||window.page.__petPageAware)return;const old=window.page;const wrapped=function(id){document.getElementById('petGuardianPage')?.classList.add('hide');return old.apply(this,arguments)};wrapped.__petPageAware=true;window.page=wrapped}
  function patchWeaknessLabels(){if(typeof window.renderWeaknessBook!=='function'||window.renderWeaknessBook.__petV3)return;const old=window.renderWeaknessBook;const w=function(){const r=old.apply(this,arguments);setTimeout(()=>{const sel=document.getElementById('weaknessUnitSearch');if(sel)[...sel.options].forEach(o=>{if(o.value.startsWith('pet1|'))o.textContent=o.textContent.replace(/STAGE\s+\d+\｜pet1/i,'毛孩守護者｜責任飼主基礎');if(o.value.startsWith('pet2|'))o.textContent=o.textContent.replace(/STAGE\s+\d+\｜pet2/i,'毛孩守護者｜動物福利進階')})},0);return r};w.__petV3=true;window.renderWeaknessBook=w}
  function install(){if(!ready()){setTimeout(install,120);return}makePage();petEnsure();patchNavigation();patchPage();patchWeaknessLabels();const mo=new MutationObserver(()=>patchNavigation());const tabs=document.querySelector('.tabs');if(tabs)mo.observe(tabs,{childList:true,subtree:true});try{if(sessionStorage.getItem('openIntegratedPetGuardian')==='1'){sessionStorage.removeItem('openIntegratedPetGuardian');showPetGuardian()}}catch(e){}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
