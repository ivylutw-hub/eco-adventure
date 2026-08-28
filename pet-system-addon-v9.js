
/* =========================================================
   毛孩之家 V9：進階真互動版
   - 真正走到指定位置後再做動作
   - 餵食 / 玩耍 / 睡覺 / 清潔 / 摸摸 / 散步
   - 可愛簡單風格
   ========================================================= */
(function(){
  const STORE='petGuardianV9';
  const MAX=100;
  const clamp=(n,min=0,max=MAX)=>Math.max(min,Math.min(max,Number(n)||0));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);
  const wait=ms=>new Promise(r=>setTimeout(r,ms));

  const PETS={
    dog:{
      kind:'忠心夥伴', img:'pet-dog.png', defaultName:'旺旺',
      greet:['汪汪！我跑來找你了！','看到你我就好開心！','我最喜歡跟你在一起！'],
      lowHunger:['汪…我有點餓了。','可以吃飯飯了嗎？'],
      lowMood:['陪我玩一下嘛～','我想要你摸摸我。'],
      pet:['被摸摸真的好幸福！','我會一直陪著你！'],
      play:['追球最好玩了！','我要再跑一次！'],
      trait:'熱情活潑'
    },
    cat:{
      kind:'撒嬌夥伴', img:'pet-cat.png', defaultName:'咪咪',
      greet:['喵～你終於來了。','好吧，我其實有在等你。','你來了，我就勉強撒嬌一下。'],
      lowHunger:['喵，我的碗空了。','今天的飯飯呢？'],
      lowMood:['有點無聊，你要陪我嗎？','如果你摸摸我，我心情會變好。'],
      pet:['喵呼～這樣剛剛好。','這樣摸，我很喜歡。'],
      play:['我要追球了！','逗我玩也不錯。'],
      trait:'傲嬌可愛'
    },
    rabbit:{
      kind:'療癒夥伴', img:'pet-rabbit.png', defaultName:'小兔',
      greet:['啾啾～我跳過來找你！','今天也一起陪我玩吧！','看到你我就安心了。'],
      lowHunger:['我想吃胡蘿蔔了～','肚子有點餓耶。'],
      lowMood:['我有點害羞，也有點想你。','陪陪我，我會比較開心。'],
      pet:['輕輕摸摸我，我好開心。','你對我真溫柔！'],
      play:['蹦蹦跳跳最好玩！','我要衝去追玩具！'],
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

  // relative positions inside stage
  const TARGETS={
    center:{x:0,y:0},
    greet:{x:0,y:-8},
    bowl:{x:160,y:12},
    bed:{x:-145,y:22},
    toy:{x:-70,y:8},
    clean:{x:85,y:6},
    walk:{x:115,y:2},
    front:{x:0,y:-20}
  };

  let roamTimer=null, needTimer=null, currentMode='my';
  let busy=false;

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
      actionLayer:document.getElementById('petActionLayer'),
      toyBall:document.getElementById('petToyBall'),
      bowl:document.getElementById('petBowl'),
      bed:document.getElementById('petBed')
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
                 kind==='sleep' ? ['💤','🌙','✨','💤'] :
                 kind==='sad'   ? ['💭','🥺','💧','💭'] :
                                  ['💗','✨','💖','💞'];
    for(let i=0;i<6;i++){
      const el=document.createElement('span');
      el.className='pet-v9-float';
      el.textContent=pool[i%pool.length];
      el.style.left=(45+Math.random()*16)+'%';
      el.style.top=(38+Math.random()*18)+'%';
      el.style.animationDelay=(i*0.05)+'s';
      stage.appendChild(el);
      setTimeout(()=>el.remove(),1300);
    }
  }

  function animatePet(name){
    const {wrap}=dom(); if(!wrap) return;
    wrap.className='pet-v9-animal-wrap '+name;
  }

  function setBusy(v=true){
    busy=v;
    const panel=document.getElementById('petHomePanel');
    panel?.classList.toggle('is-busy', v);
  }

  function setPetPos(x=0,y=0,dur=650){
    const {wrap}=dom(); if(!wrap) return;
    wrap.style.setProperty('--pet-x', x+'px');
    wrap.style.setProperty('--pet-y', y+'px');
    wrap.style.setProperty('--pet-move-duration', dur+'ms');
  }

  async function moveTo(targetName, dur=700, walkClass='anim-walk'){
    const t=TARGETS[targetName] || TARGETS.center;
    animatePet(walkClass);
    setPetPos(t.x,t.y,dur);
    await wait(dur+40);
  }

  async function moveHome(dur=700){
    animatePet('anim-walk');
    setPetPos(0,0,dur);
    await wait(dur+40);
  }

  function bounceObj(id, cls='pulse'){
    const el=document.getElementById(id);
    if(!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  }

  function showActionEmoji(text, x='62%', y='48%'){
    const layer=document.getElementById('petActionLayer');
    if(!layer) return;
    const el=document.createElement('div');
    el.className='pet-v9-action-emoji';
    el.textContent=text;
    el.style.left=x;
    el.style.top=y;
    layer.appendChild(el);
    setTimeout(()=>el.remove(),1400);
  }

  async function doActionScene(action, message, emoji, effect){
    if(action==='feed'){
      await moveTo('bowl', 720, 'anim-walk');
      bounceObj('petBowl','pulse');
      animatePet('anim-eat');
      showActionEmoji('🥣','73%','70%');
      floatEffects(effect||'food');
      setSpeech(message, emoji||'🥣');
      await wait(1100);
      await moveHome(620);
      animatePet('anim-tail');
      return;
    }
    if(action==='sleep'){
      await moveTo('bed', 720, 'anim-walk');
      bounceObj('petBed','pulse');
      animatePet('anim-sleep');
      showActionEmoji('💤','23%','74%');
      floatEffects(effect||'sleep');
      setSpeech(message, emoji||'🌙');
      await wait(1400);
      await moveHome(700);
      animatePet('anim-bounce');
      return;
    }
    if(action==='play'){
      await moveTo('toy', 620, 'anim-walk');
      const ball=dom().toyBall;
      if(ball){
        ball.classList.remove('launch');
        void ball.offsetWidth;
        ball.classList.add('launch');
      }
      animatePet('anim-play');
      showActionEmoji('🎾','38%','72%');
      floatEffects(effect||'heart');
      setSpeech(message, emoji||'🎉');
      await wait(1250);
      await moveHome(650);
      animatePet('anim-happy');
      return;
    }
    if(action==='clean'){
      await moveTo('clean', 680, 'anim-walk');
      animatePet('anim-clean');
      showActionEmoji('🫧','66%','63%');
      floatEffects(effect||'clean');
      setSpeech(message, emoji||'🫧');
      await wait(1100);
      await moveHome(620);
      animatePet('anim-bounce');
      return;
    }
    if(action==='walk'){
      await moveTo('walk', 720, 'anim-walk');
      animatePet('anim-run');
      showActionEmoji('🐾','70%','64%');
      floatEffects(effect||'walk');
      setSpeech(message, emoji||'🐾');
      await wait(900);
      setPetPos(-40,0,820);
      await wait(840);
      await moveHome(620);
      animatePet('anim-happy');
      return;
    }
    if(action==='pet'){
      await moveTo('front', 420, 'anim-greet');
      animatePet('anim-tail');
      showActionEmoji('💗','58%','56%');
      floatEffects(effect||'heart');
      setSpeech(message, emoji||'😍');
      await wait(1000);
      await moveHome(540);
      animatePet('anim-bounce');
      return;
    }
    if(action==='click'){
      await moveTo('greet', 360, 'anim-greet');
      animatePet('anim-greet');
      floatEffects(effect||'heart');
      setSpeech(message, emoji||'😍');
      await wait(900);
      await moveHome(520);
      animatePet('anim-tail');
      return;
    }
  }

  function petNeedCheck(force=false){
    const p=state(); if(!p) return;
    const now=Date.now();
    if(!force && now - p.game.lastNeedAt < 12000) return;
    if(currentMode!=='pet' || busy) return;

    const meta=PETS[p.petType];
    if(p.hunger<=35){
      p.game.lastNeedAt=now;
      saveAll();
      animatePet('anim-sad');
      setSpeech(rand(meta.lowHunger), '🥺');
      floatEffects('sad');
    }else if(p.happy<=38){
      p.game.lastNeedAt=now;
      saveAll();
      animatePet('anim-sad');
      setSpeech(rand(meta.lowMood), '😿');
      floatEffects('sad');
    }else if(force){
      animatePet('anim-greet');
      setSpeech(rand(meta.greet), '💖');
      floatEffects('heart');
    }
  }

  function startRoam(){
    stopRoam();
    roamTimer=setInterval(async ()=>{
      if(currentMode!=='pet' || busy) return;
      const p=state(); if(!p) return;
      const mood = p.happy + p.energy + p.trust;
      const dir = Math.random()>0.5 ? 1 : -1;
      const distance = mood>220 ? 42 : mood>180 ? 28 : 18;
      setPetPos(dir*distance, 0, 850);
      animatePet('anim-walk');
      await wait(950);
      setPetPos(0,0,700);
      animatePet('anim-bounce');
    }, 5500);
  }
  function stopRoam(){ if(roamTimer){ clearInterval(roamTimer); roamTimer=null; } }

  function startNeedLoop(){
    stopNeedLoop();
    needTimer=setInterval(()=>petNeedCheck(false), 7000);
  }
  function stopNeedLoop(){ if(needTimer){ clearInterval(needTimer); needTimer=null; } }

  async function runInteraction(action, updates, scene){
    if(busy){ toastMsg('毛孩正在互動中，等一下再試試看喔！'); return; }
    const p=state(); if(!p) return;
    setBusy(true);
    maybeReward(p);
    saveAll();
    renderPetHome();

    try{
      await scene();
      p.happy = clamp(p.happy + (updates.happy||0));
      p.trust = clamp(p.trust + (updates.trust||0));
      p.energy= clamp(p.energy + (updates.energy||0));
      p.hunger= clamp(p.hunger + (updates.hunger||0));
      p.clean = clamp(p.clean + (updates.clean||0));
      p.totalCare += Number(updates.care||0);
      p.game.feeds += Number(updates.feeds||0);
      p.game.interactions += Number(updates.interact||0);
      maybeReward(p);
      saveAll();
      renderPetHome();
      animatePet(scene.finalAnim || 'anim-bounce');
    } finally {
      setBusy(false);
    }
  }

  function interact(action){
    const p=state(); if(!p) return;
    const meta=PETS[p.petType];
    const extraTrust = p.owned.ribbon ? 2 : 0;
    const extraPlay = p.owned.toy ? 5 : 0;
    const extraSleep = p.owned.bed ? 8 : 0;

    const map={
      pet:{
        updates:{happy:+6,trust:+5+extraTrust,energy:+1,hunger:0,clean:0,care:+1,interact:+1},
        scene:()=>doActionScene('pet', rand(meta.pet), '💗', 'heart')
      },
      feed:{
        cost:1,
        updates:{happy:+2,trust:+2+extraTrust,energy:+2,hunger:+16,clean:-1,care:+1,feeds:+1},
        scene:()=>doActionScene('feed', '吃飽飽了！我開心地吃光光！', '🥣', 'food')
      },
      play:{
        updates:{happy:+12+extraPlay,trust:+4+extraTrust,energy:-7,hunger:-4,clean:-2,care:+1,interact:+1},
        scene:()=>doActionScene('play', rand(meta.play), '🎉', 'heart')
      },
      clean:{
        updates:{happy:+2,trust:+3+extraTrust,energy:-1,hunger:0,clean:+18,care:+1,interact:+1},
        scene:()=>doActionScene('clean', '洗香香後舒服多了！', '🫧', 'clean')
      },
      sleep:{
        updates:{happy:+2,trust:+1,energy:+20+extraSleep,hunger:-3,clean:0,care:+1},
        scene:()=>doActionScene('sleep', '我睡了一下，精神變好了！', '🌙', 'sleep')
      },
      walk:{
        updates:{happy:+10,trust:+5+extraTrust,energy:-6,hunger:-5,clean:-3,care:+1,interact:+1},
        scene:()=>doActionScene('walk', '一起散步最開心了！', '🐾', 'walk')
      }
    };

    const r=map[action]; if(!r) return;
    if(r.cost && !useCoins(r.cost)){
      toastMsg('守護金幣不足，先去答題賺金幣吧！');
      return;
    }
    runInteraction(action, r.updates, r.scene);
  }

  function useInventory(type){
    const p=state(); if(!p) return;
    const n=Number(p.inventory[type]||0);
    if(n<=0){ toastMsg('這個物品目前沒有庫存喔！'); return; }
    p.inventory[type]=n-1;

    if(type==='food'){
      runInteraction('feed', {happy:+2,trust:+1,energy:+2,hunger:+18,clean:0,care:+1,feeds:+1}, ()=>doActionScene('feed','吃了背包裡的營養飼料！','🥣','food'));
    }else if(type==='carrot'){
      runInteraction('feed', {happy:+4,trust:+1,energy:+2,hunger:+10,clean:0,care:+1,feeds:+1}, ()=>doActionScene('feed','點心真好吃，我超喜歡！','🥕','food'));
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
        animatePet('anim-greet');
        setSpeech(`已購買「${item.label}」！毛孩看起來更喜歡這個家了。`, '✨');
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
    const p=state(); if(!p || busy) return;
    const meta=PETS[p.petType];
    p.happy=clamp(p.happy+2);
    p.trust=clamp(p.trust+1);
    p.game.interactions+=1;
    saveAll();
    doActionScene('click', rand(meta.greet), '😍', 'heart');
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
    const p=state(); if(!p||!PETS[type]||busy) return;
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
    return `<div class="pet-v9-stat"><span>${icon}</span><b>${label}</b><div class="pet-v9-track"><i class="${cls}" style="width:${val}%"></i></div><strong>${val}</strong></div>`;
  }
  function petChoice(type,p){
    const meta=PETS[type], active=p.petType===type;
    const nm=p.names?.[type] || meta.defaultName;
    return `<button class="pet-v9-switch ${active?'active':''}" type="button" onclick="petGameSwitch('${type}')">
      <img src="${meta.img}" alt="${meta.name}">
      <small>${meta.name}</small><b>${esc(nm)}</b><em>${meta.trait}</em>
    </button>`;
  }
  function missionRow(done,label,count){
    return `<div class="pet-v9-mission-row ${done?'done':''}"><span class="box">${done?'✓':''}</span><b>${label}</b><em>${count}</em></div>`;
  }
  function shopCard(key,p){
    const it=SHOP_ITEMS[key];
    const owned = it.type==='upgrade' && p.owned[key];
    const qty = it.type==='consumable' ? `現有 ${Number(p.inventory[key]||0)} 個` : (owned ? '已擁有' : `價格 ${it.price}`);
    return `<div class="pet-v9-shop-card ${owned?'owned':''}">
      <div class="icon">${it.icon}</div>
      <div class="info"><b>${it.label}</b><small>${it.desc}</small><em>${qty}</em></div>
      <button type="button" ${owned?'disabled':''} onclick="petGameBuy('${key}')">${owned?'已擁有':'購買'}</button>
    </div>`;
  }
  function invCard(key,p){
    const count=Number(p.inventory[key]||0);
    const it=SHOP_ITEMS[key];
    return `<div class="pet-v9-inv-card ${count<=0?'empty':''}">
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
      <div class="pet-v9-shell">
        <div class="pet-v9-top">
          <div class="pet-v9-title">🏠 毛孩之家</div>
          <div class="pet-v9-banner">真正走到指定位置再互動：吃、睡、玩、散步都更像小遊戲！</div>
          <div class="pet-v9-wallet">🐾 <b>${coins()}</b></div>
          <div class="pet-v9-level"><span>Lv.${level(p)}</span><div><i style="width:${xpPct(p)}%"></i></div></div>
        </div>

        <div class="pet-v9-room">
          <aside class="pet-v9-left">
            <div class="pet-v9-love"><span>💗</span><small>親密度</small><strong>${relation(p)}</strong></div>
            <div class="pet-v9-missions">
              <h3>每日任務 <small>${missionCount(p)}/3</small></h3>
              ${missionRow(ms.feed,'餵食毛孩 3 次',`${Math.min(3,p.game.feeds)}/3`)}
              ${missionRow(ms.interact,'和毛孩互動 3 次',`${Math.min(3,p.game.interactions)}/3`)}
              ${missionRow(ms.quiz,'完成 1 次毛孩問答',`${Math.min(1,p.game.quizDone)}/1`)}
              <div class="pet-v9-reward">完成獎勵：🐾 +50</div>
            </div>
            <div class="pet-v9-pet-list">
              ${petChoice('dog',p)}
              ${petChoice('cat',p)}
              ${petChoice('rabbit',p)}
            </div>
          </aside>

          <main class="pet-v9-stage" id="petGameStage">
            <div class="pet-v9-window"></div>
            <div class="pet-v9-wall-items"><span>🐾</span><span>🌱</span><span>💛</span></div>
            <div class="pet-v9-cat-tree"></div>
            <div class="pet-v9-bed ${p.owned.bed?'upgraded':''}" id="petBed"></div>
            <div class="pet-v9-bowl pulseable" id="petBowl">🥣</div>
            <div class="pet-v9-water">💧</div>
            <div class="pet-v9-toys">${p.owned.toy?'🧸　🎾　🪀':'🧸　⚽'}</div>
            <div class="pet-v9-house">${p.owned.ribbon?'🏠🎀':'🏠'}</div>
            <div class="pet-v9-toy-ball" id="petToyBall">🎾</div>
            <div class="pet-v9-action-layer" id="petActionLayer"></div>

            <div class="pet-v9-speech" id="petSpeech">我是 ${esc(p.petName)}，今天也很想跟你互動！</div>
            <div class="pet-v9-emotion" id="petEmotionBadge">💖</div>

            <button class="pet-v9-animal-wrap anim-bounce" id="petGameAnimalWrap" type="button" onclick="petGameClick()">
              <img class="pet-v9-animal" id="petGameAnimal" src="${meta.img}" alt="${meta.name}">
            </button>

            <div class="pet-v9-name-card">
              <div class="main"><b>${esc(p.petName)}</b><span>${meta.kind}・${meta.trait}</span></div>
              <small>牠會自己走到食盆、床鋪或玩具附近互動喔！</small>
              <button type="button" onclick="renamePet()">✏️ 改名</button>
            </div>

            <div class="pet-v9-stats">
              ${bar('💗','心情',p.happy,'pink')}
              ${bar('🥣','飽足',p.hunger,'orange')}
              ${bar('🫧','清潔',p.clean,'green')}
              ${bar('⚡','活力',p.energy,'blue')}
            </div>
          </main>

          <aside class="pet-v9-right">
            <div class="pet-v9-side-box">
              <b>快速互動</b>
              <button class="quick pink" type="button" onclick="petGameInteract('pet')">💗 一鍵抱抱</button>
              <button class="quick gold" type="button" onclick="petGameInteract('feed')">🥣 一鍵餵食</button>
              <button class="quick mint" type="button" onclick="petGameInteract('play')">🎾 一鍵玩耍</button>
            </div>

            <div class="pet-v9-inventory">
              <b>背包</b>
              <div id="petInventoryList">${invCard('food',p)}${invCard('carrot',p)}</div>
            </div>

            <div class="pet-v9-shop">
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

        <div class="pet-v9-actions">
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
      petSection.className='pet-home-section-v9';
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
      setTimeout(()=>petNeedCheck(true),100);
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
    if(typeof old!=='function' || old.__petV9Patched) return;
    const wrapped=function(){
      const r=old.apply(this, arguments);
      setTimeout(after, 0);
      return r;
    };
    wrapped.__petV9Patched=true;
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
