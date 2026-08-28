
/* =========================================================
   毛孩之家 V8：情緒互動、主動走動、個性反應、商店升級
   ========================================================= */
(function(){
  const STORE='petGuardianV8';
  const MAX=100;
  const clamp=(n,min=0,max=MAX)=>Math.max(min,Math.min(max,Number(n)||0));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const PETS={
    dog:{
      kind:'忠心夥伴', img:'pet-dog.png', defaultName:'旺旺',
      greet:['汪汪！我一看到你就想跑過來！','今天一起玩吧，我超期待！','你回來了！我好開心！'],
      lowHunger:['汪…我有點餓了，可以吃點東西嗎？','我想吃飯飯了！'],
      lowMood:['我想跟你玩一下…','陪我一下，我會更開心喔！'],
      pet:['被摸摸最幸福了！','我會一直陪著你！'],
      play:['好好玩！我要轉圈圈！','再玩一次嘛！'],
      trait:'熱情活潑'
    },
    cat:{
      kind:'撒嬌夥伴', img:'pet-cat.png', defaultName:'咪咪',
      greet:['喵～你終於來了。','哼，其實我有在等你。','你來陪我，我就勉強靠近你。'],
      lowHunger:['喵，我的碗怎麼空了？','今天的飯飯呢？'],
      lowMood:['有點無聊，你要不要陪我玩？','如果你摸摸我，我心情可能會比較好。'],
      pet:['喵呼～這樣摸剛剛好。','好吧，我承認我喜歡。'],
      play:['逗貓棒再來一次！','今天就陪你玩一下下。'],
      trait:'傲嬌可愛'
    },
    rabbit:{
      kind:'療癒夥伴', img:'pet-rabbit.png', defaultName:'小兔',
      greet:['啾啾～我蹦蹦跳跳來找你！','你來了，我好安心！','今天也一起陪我玩吧！'],
      lowHunger:['我想吃胡蘿蔔了～','肚子有點餓，可以吃點東西嗎？'],
      lowMood:['我有點害羞，也有點想你。','陪陪我，我會比較安心。'],
      pet:['輕輕摸我，我會很開心。','你對我真溫柔！'],
      play:['蹦蹦跳跳最好玩了！','我今天特別開心！'],
      trait:'害羞療癒'
    }
  };
  const SHOP_ITEMS={
    food:{label:'營養飼料', icon:'🥣', price:18, desc:'飽足 +18 / 心情 +2', type:'consumable'},
    carrot:{label:'點心零食', icon:'🥕', price:12, desc:'飽足 +10 / 心情 +4', type:'consumable'},
    toy:{label:'玩具球', icon:'🎾', price:120, desc:'玩耍效果提升', type:'upgrade'},
    bed:{label:'柔軟小床', icon:'🛏️', price:180, desc:'睡覺恢復提升', type:'upgrade'},
    ribbon:{label:'可愛配件', icon:'🎀', price:90, desc:'親密度成長提升', type:'upgrade'}
  };

  let roamTimer=null, needTimer=null, currentMode='my';

  function state(){
    if(typeof st==='undefined') return null;
    if(!st[STORE] || typeof st[STORE]!=='object'){
      st[STORE]={
        petType:'dog',
        petName:'旺旺',
        names:{dog:'旺旺',cat:'咪咪',rabbit:'小兔'},
        hunger:84, clean:85, happy:82, energy:88, trust:34,
        totalCare:0,
        owned:{toy:false,bed:false,ribbon:false},
        inventory:{food:3,carrot:2},
        game:{date:today(),feeds:0,interactions:0,quizDone:0,rewardClaimed:false,lastNeedAt:0},
      };
    }
    const p=st[STORE];
    if(!PETS[p.petType]) p.petType='dog';
    if(!p.names || typeof p.names!=='object') p.names={dog:'旺旺',cat:'咪咪',rabbit:'小兔'};
    if(!p.owned || typeof p.owned!=='object') p.owned={toy:false,bed:false,ribbon:false};
    if(!p.inventory || typeof p.inventory!=='object') p.inventory={food:3,carrot:2};
    ['hunger','clean','happy','energy','trust'].forEach(k=>p[k]=clamp(p[k]??80));
    p.totalCare=Number(p.totalCare)||0;
    p.petName=p.names[p.petType] || PETS[p.petType].defaultName;
    if(!p.game || p.game.date!==today()){
      p.game={date:today(),feeds:0,interactions:0,quizDone:0,rewardClaimed:false,lastNeedAt:0};
    }
    ['feeds','interactions','quizDone','lastNeedAt'].forEach(k=>p.game[k]=Number(p.game[k])||0);
    p.game.rewardClaimed=Boolean(p.game.rewardClaimed);
    return p;
  }

  function saveAll(){ if(typeof save==='function') save(); if(typeof header==='function') header(); }
  function coins(){ return Number(st.coins)||0; }
  function addCoins(n){ st.coins=(Number(st.coins)||0)+n; }
  function useCoins(n){ if(coins()<n) return false; st.coins=coins()-n; return true; }
  function toastMsg(msg){ if(typeof toast==='function') toast(msg); else console.log(msg); }
  const rand = arr => arr[Math.floor(Math.random()*arr.length)];

  function level(p){ return Math.max(1,Math.floor((p.totalCare||0)/8)+1); }
  function xpPct(p){ return Math.min(100,Math.round(((p.totalCare||0)%8)/8*100)); }
  function relation(p){ return clamp(Math.round(p.trust*0.6 + p.happy*0.4)); }
  function missionState(p){ return {feed:p.game.feeds>=3, interact:p.game.interactions>=3, quiz:p.game.quizDone>=1}; }
  function missionCount(p){ return Object.values(missionState(p)).filter(Boolean).length; }

  function maybeReward(p){
    const m=missionState(p);
    if(m.feed&&m.interact&&m.quiz&&!p.game.rewardClaimed){
      p.game.rewardClaimed=true;
      addCoins(50);
      toastMsg('🎁 每日任務完成！獲得 50 枚守護金幣');
    }
  }

  function dom(){
    return {
      panel:document.getElementById('petHomePanel'),
      stage:document.getElementById('petGameStage'),
      wrap:document.getElementById('petGameAnimalWrap'),
      animal:document.getElementById('petGameAnimal'),
      speech:document.getElementById('petSpeech'),
      emotion:document.getElementById('petEmotionBadge'),
      shop:document.getElementById('petShopList'),
      inv:document.getElementById('petInventoryList')
    };
  }

  function setSpeech(text, emoji='💬'){
    const d=dom();
    if(d.speech){
      d.speech.textContent=text;
      d.speech.classList.remove('show');
      void d.speech.offsetWidth;
      d.speech.classList.add('show');
    }
    if(d.emotion){
      d.emotion.textContent=emoji;
      d.emotion.classList.remove('show');
      void d.emotion.offsetWidth;
      d.emotion.classList.add('show');
    }
  }

  function floatEffects(kind='heart'){
    const {stage}=dom(); if(!stage) return;
    const pool = kind==='clean' ? ['🫧','✨','🫧','✨'] :
                 kind==='food'  ? ['🥕','🥣','💛','✨'] :
                 kind==='walk'  ? ['🐾','🍃','💚','✨'] :
                 kind==='sad'   ? ['💭','🥺','💧','💭'] :
                                  ['💗','✨','💖','💞'];
    for(let i=0;i<6;i++){
      const el=document.createElement('span');
      el.className='pet-v8-float';
      el.textContent=pool[i%pool.length];
      el.style.left=(44+Math.random()*18)+'%';
      el.style.top=(40+Math.random()*18)+'%';
      el.style.animationDelay=(i*0.05)+'s';
      stage.appendChild(el);
      setTimeout(()=>el.remove(),1300);
    }
  }

  function animatePet(name){
    const {wrap}=dom(); if(!wrap) return;
    wrap.classList.remove('anim-greet','anim-happy','anim-tail','anim-play','anim-feed','anim-clean','anim-sleep','anim-walk','anim-bounce','anim-sad','anim-roam-left','anim-roam-right');
    void wrap.offsetWidth;
    wrap.classList.add(name);
  }

  function applyPetPosition(pos=0){
    const {wrap}=dom();
    if(!wrap) return;
    wrap.style.setProperty('--pet-x', pos+'px');
  }

  function petNeedCheck(force=false){
    const p=state(); if(!p) return;
    const now=Date.now();
    if(!force && now - p.game.lastNeedAt < 12000) return;
    if(currentMode!=='pet') return;

    const meta=PETS[p.petType];
    if(p.hunger<=35){
      p.game.lastNeedAt=now;
      setSpeech(rand(meta.lowHunger), '🥺');
      animatePet('anim-sad');
      floatEffects('sad');
    }else if(p.happy<=38){
      p.game.lastNeedAt=now;
      setSpeech(rand(meta.lowMood), '😿');
      animatePet('anim-sad');
      floatEffects('sad');
    }else if(force){
      setSpeech(rand(meta.greet), '💖');
      animatePet('anim-greet');
      floatEffects('heart');
    }
    saveAll();
  }

  function startRoam(){
    stopRoam();
    roamTimer=setInterval(()=>{
      if(currentMode!=='pet') return;
      const p=state(); if(!p) return;
      const {wrap}=dom(); if(!wrap) return;

      const mood = p.happy + p.energy + p.trust;
      let dir = Math.random()>0.5 ? 1 : -1;
      let distance = mood>220 ? 56 : mood>180 ? 40 : 24;
      const target = dir*distance;
      applyPetPosition(target);
      animatePet(dir>0 ? 'anim-roam-right' : 'anim-roam-left');

      setTimeout(()=>{
        applyPetPosition(0);
        animatePet('anim-bounce');
      }, 1800);
    }, 5000);
  }
  function stopRoam(){ if(roamTimer){ clearInterval(roamTimer); roamTimer=null; } }

  function startNeedLoop(){
    stopNeedLoop();
    needTimer=setInterval(()=>petNeedCheck(false), 7000);
  }
  function stopNeedLoop(){ if(needTimer){ clearInterval(needTimer); needTimer=null; } }

  function refreshUI(message, animation='anim-bounce', effect='heart', emoji='💗'){
    const p=state(); if(!p) return;
    maybeReward(p);
    saveAll();
    renderPetHome();
    requestAnimationFrame(()=>{
      animatePet(animation);
      floatEffects(effect);
      setSpeech(message, emoji);
    });
  }

  function interact(action){
    const p=state(); if(!p) return;
    const meta=PETS[p.petType];
    const extraTrust = p.owned.ribbon ? 2 : 0;
    const extraPlay = p.owned.toy ? 5 : 0;
    const extraSleep = p.owned.bed ? 8 : 0;

    const rules={
      pet:{happy:+6,trust:+5+extraTrust,energy:+1,hunger:0,clean:0,care:+1,interact:+1,anim:'anim-tail',effect:'heart',emoji:'💗',text:rand(meta.pet)},
      feed:{happy:+2,trust:+2+extraTrust,energy:+2,hunger:+16,clean:-1,care:+1,feeds:+1,anim:'anim-feed',effect:'food',emoji:'🥣',text:'吃飽飽了！我現在心情很好！',cost:1},
      play:{happy:+12+extraPlay,trust:+4+extraTrust,energy:-7,hunger:-4,clean:-2,care:+1,interact:+1,anim:'anim-happy',effect:'heart',emoji:'🎉',text:rand(meta.play)},
      clean:{happy:+2,trust:+3+extraTrust,energy:-1,hunger:0,clean:+18,care:+1,interact:+1,anim:'anim-clean',effect:'clean',emoji:'🫧',text:'洗香香之後整個舒服多了！'},
      sleep:{happy:+2,trust:+1,energy:+20+extraSleep,hunger:-3,clean:0,care:+1,anim:'anim-sleep',effect:'heart',emoji:'🌙',text:'我睡了一覺，精神飽滿！'},
      walk:{happy:+10,trust:+5+extraTrust,energy:-6,hunger:-5,clean:-3,care:+1,interact:+1,anim:'anim-walk',effect:'walk',emoji:'🐾',text:'看到主人就忍不住往前跑了！'}
    };
    const r=rules[action]; if(!r) return;

    if(r.cost && !useCoins(r.cost)){
      toastMsg('守護金幣不足，先去答題賺金幣吧！');
      return;
    }
    p.happy = clamp(p.happy + (r.happy||0));
    p.trust = clamp(p.trust + (r.trust||0));
    p.energy= clamp(p.energy + (r.energy||0));
    p.hunger= clamp(p.hunger + (r.hunger||0));
    p.clean = clamp(p.clean + (r.clean||0));
    p.totalCare += Number(r.care||0);
    p.game.feeds += Number(r.feeds||0);
    p.game.interactions += Number(r.interact||0);

    refreshUI(r.text, r.anim, r.effect, r.emoji);
  }

  function useInventory(type){
    const p=state(); if(!p) return;
    const n=Number(p.inventory[type]||0);
    if(n<=0){ toastMsg('這個物品目前沒有庫存喔！'); return; }
    p.inventory[type]=n-1;

    if(type==='food'){
      p.hunger=clamp(p.hunger+18); p.happy=clamp(p.happy+2); p.game.feeds+=1;
      refreshUI('吃了營養飼料，肚子暖暖的！', 'anim-feed', 'food', '🥣');
    }else if(type==='carrot'){
      p.hunger=clamp(p.hunger+10); p.happy=clamp(p.happy+4); p.game.feeds+=1;
      refreshUI('點心真好吃，我超喜歡！', 'anim-feed', 'food', '🥕');
    }
  }

  function buyItem(key){
    const p=state(); if(!p) return;
    const item=SHOP_ITEMS[key]; if(!item) return;

    if(item.type==='upgrade'){
      if(p.owned[key]){ toastMsg('這個升級已經擁有了！'); return; }
      if(!useCoins(item.price)){ toastMsg('守護金幣不足喔！'); return; }
      p.owned[key]=true;
      saveAll(); renderPetHome();
      setTimeout(()=>{
        setSpeech(`已購買「${item.label}」！毛孩好像更喜歡這個家了。`, '✨');
        animatePet('anim-greet');
        floatEffects('heart');
      },60);
      return;
    }

    if(!useCoins(item.price)){ toastMsg('守護金幣不足喔！'); return; }
    p.inventory[key]=Number(p.inventory[key]||0)+1;
    saveAll(); renderPetHome();
    setTimeout(()=>{
      setSpeech(`已購買 ${item.label}，可以到背包使用！`, item.icon);
      floatEffects('heart');
    },60);
  }

  function onPetClick(){
    const p=state(); if(!p) return;
    const meta=PETS[p.petType];
    p.happy=clamp(p.happy+2);
    p.trust=clamp(p.trust+1);
    p.game.interactions+=1;
    refreshUI(rand(meta.greet), 'anim-greet', 'heart', '😍');
  }

  function renamePet(){
    const p=state(); if(!p) return;
    const name=prompt('幫毛孩取名字：', p.petName);
    if(name===null) return;
    const finalName=(name.trim() || p.petName).slice(0,10);
    p.petName=finalName;
    p.names[p.petType]=finalName;
    saveAll(); renderPetHome();
    setTimeout(()=>setSpeech(`你好呀！我是 ${finalName} ～`, '✨'), 100);
  }

  function switchPet(type){
    const p=state(); if(!p||!PETS[type]) return;
    p.petType=type;
    p.petName=p.names[type] || PETS[type].defaultName;
    saveAll(); renderPetHome();
    setTimeout(()=>{
      animatePet('anim-greet');
      setSpeech(`嗨！我是 ${p.petName}，個性是「${PETS[type].trait}」喔！`, '💖');
    },60);
  }

  function registerQuizDone(){
    const p=state(); if(!p) return;
    p.game.quizDone=Math.max(1,p.game.quizDone);
    maybeReward(p);
    saveAll(); renderPetHome();
  }

  function bar(icon,label,val,cls){
    return `<div class="pet-v8-stat"><span>${icon}</span><b>${label}</b><div class="pet-v8-track"><i class="${cls}" style="width:${val}%"></i></div><strong>${val}</strong></div>`;
  }
  function petChoice(type,p){
    const meta=PETS[type], active=p.petType===type;
    const nm=p.names?.[type] || meta.defaultName;
    return `<button class="pet-v8-switch ${active?'active':''}" type="button" onclick="petGameSwitch('${type}')">
      <img src="${meta.img}" alt="${meta.name}">
      <small>${meta.name}</small><b>${esc(nm)}</b><em>${meta.trait}</em>
    </button>`;
  }
  function missionRow(done,label,count){
    return `<div class="pet-v8-mission-row ${done?'done':''}"><span class="box">${done?'✓':''}</span><b>${label}</b><em>${count}</em></div>`;
  }
  function shopCard(key,p){
    const it=SHOP_ITEMS[key];
    const owned = it.type==='upgrade' && p.owned[key];
    const qty = it.type==='consumable' ? `現有 ${Number(p.inventory[key]||0)} 個` : (owned ? '已擁有' : `價格 ${it.price}`);
    return `<div class="pet-v8-shop-card ${owned?'owned':''}">
      <div class="icon">${it.icon}</div>
      <div class="info"><b>${it.label}</b><small>${it.desc}</small><em>${qty}</em></div>
      <button type="button" ${owned?'disabled':''} onclick="petGameBuy('${key}')">${owned?'已擁有':'購買'}</button>
    </div>`;
  }
  function invCard(key,p){
    const count=Number(p.inventory[key]||0);
    const it=SHOP_ITEMS[key];
    return `<div class="pet-v8-inv-card ${count<=0?'empty':''}">
      <span>${it.icon}</span><b>${it.label}</b><em>x ${count}</em>
      <button type="button" ${count<=0?'disabled':''} onclick="petGameUseItem('${key}')">使用</button>
    </div>`;
  }

  function renderPetHome(){
    const host=document.getElementById('petHomePanel');
    if(!host) return;
    const p=state(); if(!p) return;
    const meta=PETS[p.petType];
    const ms=missionState(p);

    host.innerHTML=`
      <div class="pet-v8-shell">
        <div class="pet-v8-top">
          <div class="pet-v8-title">🏠 毛孩之家</div>
          <div class="pet-v8-banner">會迎接你、會撒嬌、會提醒需求的可愛互動毛孩！</div>
          <div class="pet-v8-wallet">🐾 <b>${coins()}</b></div>
          <div class="pet-v8-level"><span>Lv.${level(p)}</span><div><i style="width:${xpPct(p)}%"></i></div></div>
        </div>

        <div class="pet-v8-room">
          <aside class="pet-v8-left">
            <div class="pet-v8-love"><span>💗</span><small>親密度</small><strong>${relation(p)}</strong></div>
            <div class="pet-v8-missions">
              <h3>每日任務 <small>${missionCount(p)}/3</small></h3>
              ${missionRow(ms.feed,'餵食毛孩 3 次',`${Math.min(3,p.game.feeds)}/3`)}
              ${missionRow(ms.interact,'和毛孩互動 3 次',`${Math.min(3,p.game.interactions)}/3`)}
              ${missionRow(ms.quiz,'完成 1 次毛孩問答',`${Math.min(1,p.game.quizDone)}/1`)}
              <div class="pet-v8-reward">完成獎勵：🐾 +50</div>
            </div>
            <div class="pet-v8-pet-list">
              ${petChoice('dog',p)}
              ${petChoice('cat',p)}
              ${petChoice('rabbit',p)}
            </div>
          </aside>

          <main class="pet-v8-stage" id="petGameStage">
            <div class="pet-v8-window"></div>
            <div class="pet-v8-wall-items"><span>🐾</span><span>🌱</span><span>💛</span></div>
            <div class="pet-v8-cat-tree"></div>
            <div class="pet-v8-bed ${p.owned.bed?'upgraded':''}"></div>
            <div class="pet-v8-bowl">🥣</div>
            <div class="pet-v8-water">💧</div>
            <div class="pet-v8-toys">${p.owned.toy?'🧸　🎾　🪀':'🧸　⚽'}</div>
            <div class="pet-v8-house">${p.owned.ribbon?'🏠🎀':'🏠'}</div>

            <div class="pet-v8-speech" id="petSpeech">我是 ${esc(p.petName)}，今天也很想跟你互動！</div>
            <div class="pet-v8-emotion" id="petEmotionBadge">💖</div>

            <button class="pet-v8-animal-wrap" id="petGameAnimalWrap" type="button" onclick="petGameClick()">
              <img class="pet-v8-animal" id="petGameAnimal" src="${meta.img}" alt="${meta.name}">
            </button>

            <div class="pet-v8-name-card">
              <div class="main"><b>${esc(p.petName)}</b><span>${meta.kind}・${meta.trait}</span></div>
              <small>牠會主動走動、迎接你，也會用情緒提醒需求喔！</small>
              <button type="button" onclick="renamePet()">✏️ 改名</button>
            </div>

            <div class="pet-v8-stats">
              ${bar('💗','心情',p.happy,'pink')}
              ${bar('🥣','飽足',p.hunger,'orange')}
              ${bar('🫧','清潔',p.clean,'green')}
              ${bar('⚡','活力',p.energy,'blue')}
            </div>
          </main>

          <aside class="pet-v8-right">
            <div class="pet-v8-side-box">
              <b>快速互動</b>
              <button class="quick pink" type="button" onclick="petGameInteract('pet')">💗 一鍵抱抱</button>
              <button class="quick gold" type="button" onclick="petGameInteract('feed')">🥣 一鍵餵食</button>
              <button class="quick mint" type="button" onclick="petGameInteract('play')">🎾 一鍵玩耍</button>
            </div>

            <div class="pet-v8-inventory">
              <b>背包</b>
              <div id="petInventoryList">${invCard('food',p)}${invCard('carrot',p)}</div>
            </div>

            <div class="pet-v8-shop">
              <b>毛孩小商店</b>
              <div id="petShopList">
                ${shopCard('food',p)}
                ${shopCard('carrot',p)}
                ${shopCard('toy',p)}
                ${shopCard('bed',p)}
                ${shopCard('ribbon',p)}
              </div>
            </div>
          </aside>
        </div>

        <div class="pet-v8-actions">
          <button type="button" onclick="petGameInteract('feed')"><span>🥣</span><b>餵食</b></button>
          <button type="button" onclick="petGameInteract('play')"><span>🎾</span><b>玩耍</b></button>
          <button type="button" onclick="petGameInteract('pet')"><span>🤲</span><b>摸摸</b></button>
          <button type="button" onclick="petGameInteract('clean')"><span>🫧</span><b>清潔</b></button>
          <button type="button" onclick="petGameInteract('sleep')"><span>🌙</span><b>睡覺</b></button>
          <button type="button" onclick="petGameInteract('walk')"><span>🐾</span><b>散步</b></button>
        </div>
      </div>
    `;
    if(currentMode==='pet'){
      setTimeout(()=>{ startRoam(); startNeedLoop(); },50);
    }
  }

  function ensureBaseTabs(){
    const base=document.getElementById('basePage');
    if(!base) return null;

    let petSection=document.getElementById('petHomeSection');
    if(!petSection){
      petSection=document.createElement('section');
      petSection.id='petHomeSection';
      petSection.className='pet-home-section-v8';
      petSection.innerHTML='<div id="petHomePanel"></div>';
      base.appendChild(petSection);
    }else if(!petSection.querySelector('#petHomePanel')){
      petSection.innerHTML='<div id="petHomePanel"></div>';
    }

    let tabs=document.getElementById('baseQuickTabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.id='baseQuickTabs';
      tabs.className='base-quick-tabs';
      tabs.innerHTML='<button type="button" data-mode="my" class="active">🌍 我的基地</button><button type="button" data-mode="pet">🐾 毛孩之家</button>';
      base.insertBefore(tabs, base.firstChild);
      tabs.querySelector('[data-mode="my"]').onclick=()=>switchBaseMode('my');
      tabs.querySelector('[data-mode="pet"]').onclick=()=>switchBaseMode('pet');
    }

    let my=document.getElementById('myBaseView');
    if(!my){
      my=document.createElement('section');
      my.id='myBaseView';
      my.className='base-mode-view';
      base.insertBefore(my, petSection);
      const movable=[...base.children].filter(el=>el!==tabs && el!==my && el!==petSection);
      movable.forEach(el=>my.appendChild(el));
    }

    renderPetHome();
    return {base,tabs,my,petSection};
  }

  function switchBaseMode(mode='my'){
    const refs=ensureBaseTabs(); if(!refs) return;
    currentMode=mode;
    const {tabs,my,petSection}=refs;
    const isPet=mode==='pet';
    my.classList.toggle('is-hidden', isPet);
    petSection.classList.toggle('is-hidden', !isPet);
    tabs.querySelectorAll('button').forEach(btn=>btn.classList.toggle('active', btn.dataset.mode===mode));
    try{ sessionStorage.setItem('baseMode', mode); }catch(e){}
    if(isPet){
      renderPetHome();
      setTimeout(()=>{
        petNeedCheck(true);
      },100);
    }else{
      stopRoam(); stopNeedLoop();
    }
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }

  function restoreMode(){
    let mode='my';
    try{
      const m=sessionStorage.getItem('baseMode');
      if(m==='pet') mode='pet';
    }catch(e){}
    switchBaseMode(mode);
  }

  function patchFn(name, after){
    const old=window[name];
    if(typeof old!=='function' || old.__petV8Patched) return;
    const wrapped=function(){
      const r=old.apply(this, arguments);
      setTimeout(after, 0);
      return r;
    };
    wrapped.__petV8Patched=true;
    window[name]=wrapped;
  }

  function install(){
    ensureBaseTabs();
    patchFn('showBase', ()=>{ ensureBaseTabs(); restoreMode(); });
    patchFn('renderBase', ()=>{ ensureBaseTabs(); if(currentMode==='pet') renderPetHome(); });
    restoreMode();
  }

  window.renderPetHome=renderPetHome;
  window.petGameInteract=interact;
  window.petGameClick=onPetClick;
  window.petGameSwitch=switchPet;
  window.petGameRegisterQuizDone=registerQuizDone;
  window.petGameBuy=buyItem;
  window.petGameUseItem=useInventory;
  window.renamePet=renamePet;
  window.switchBaseMode=switchBaseMode;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(install, 250), {once:true});
  }else{
    setTimeout(install, 250);
  }
})();
