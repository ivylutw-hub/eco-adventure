
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
        <a href="pet-guardian.html">📚 去毛孩守護者答題</a>
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
   守護基地 V4.1：我的基地 / 毛孩之家 雙頁籤
   ========================================================= */
(function installBasePetTabs(){
  function findBase(){
    return document.getElementById('basePage');
  }

  function ensureTabs(){
    const base=findBase();
    if(!base || document.getElementById('baseModeTabs')) return;

    const petSection=document.getElementById('petHomeSection');
    if(!petSection) return;

    // 將原本基地內容包進「我的基地」容器。
    const myBase=document.createElement('div');
    myBase.id='myBaseContent';
    myBase.className='base-mode-content';

    const tabs=document.createElement('div');
    tabs.id='baseModeTabs';
    tabs.className='base-mode-tabs';
    tabs.innerHTML=`
      <button type="button" class="active" data-mode="my" onclick="switchBaseMode('my')">🌍 我的基地</button>
      <button type="button" data-mode="pet" onclick="switchBaseMode('pet')">🐾 毛孩之家</button>`;

    // 只搬移 petHomeSection 之前的基地內容，頁面導覽列本身不動。
    const children=[...base.children];
    const petIndex=children.indexOf(petSection);
    const toMove=children.slice(0,petIndex).filter(el=>el.id!=='baseModeTabs');

    base.insertBefore(tabs, base.firstChild);
    base.insertBefore(myBase, petSection);
    toMove.forEach(el=>{
      if(el!==tabs && el!==myBase) myBase.appendChild(el);
    });

    petSection.classList.add('base-mode-content','hide');
    petSection.dataset.baseMode='pet';
    myBase.dataset.baseMode='my';

    switchBaseMode('my');
  }

  window.switchBaseMode=function(mode){
    const my=document.getElementById('myBaseContent');
    const pet=document.getElementById('petHomeSection');
    const tabs=document.getElementById('baseModeTabs');
    if(!my || !pet || !tabs) return;

    const showPet=mode==='pet';
    my.classList.toggle('hide',showPet);
    pet.classList.toggle('hide',!showPet);

    tabs.querySelectorAll('button').forEach(btn=>{
      btn.classList.toggle('active',btn.dataset.mode===mode);
      btn.setAttribute('aria-pressed',String(btn.dataset.mode===mode));
    });

    try{ sessionStorage.setItem('baseMode',mode); }catch(e){}

    if(showPet && typeof renderPetHome==='function'){
      renderPetHome();
    }
    window.scrollTo({top:0,left:0,behavior:'auto'});
  };

  function restoreMode(){
    let mode='my';
    try{
      const saved=sessionStorage.getItem('baseMode');
      if(saved==='pet') mode='pet';
    }catch(e){}
    switchBaseMode(mode);
  }

  function patchShowBase(){
    if(typeof window.showBase!=='function'){
      setTimeout(patchShowBase,100);
      return;
    }
    if(window.showBase.__baseTabsPatched) return;
    const old=window.showBase;
    const wrapped=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        ensureTabs();
        restoreMode();
      },0);
      return r;
    };
    wrapped.__baseTabsPatched=true;
    window.showBase=wrapped;
  }

  function install(){
    ensureTabs();
    patchShowBase();

    // 從其他地方直接前往毛孩之家時，自動切換頁籤。
    const oldGo=window.goPetBase;
    window.goPetBase=function(){
      if(document.getElementById('basePage') && typeof window.showBase==='function'){
        window.showBase();
        setTimeout(()=>{
          ensureTabs();
          switchBaseMode('pet');
        },60);
        return;
      }
      if(typeof oldGo==='function') return oldGo.apply(this,arguments);
    };
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250),{once:true});
  }else{
    setTimeout(install,250);
  }
})();
