
/* =========================================================
   毛孩之家 V7：互動式情緒反應 + 守護基地快速切換
   - 寵物看到主人會往前迎接
   - 開心會轉圈圈 / 搖尾巴 / 跳跳
   - 守護基地上方快速切換：我的基地 / 毛孩之家
   ========================================================= */
(function(){
  const STORE_KEY='petGuardian';
  const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,Number(n)||0));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const today=()=>new Date().toISOString().slice(0,10);

  const PETS={
    dog:{name:'狗狗',defaultName:'旺旺',img:'pet-dog.png',greet:'汪汪！看到你我超開心！',owner:'看到主人就搖尾巴衝過來！',kind:'忠心夥伴'},
    cat:{name:'貓咪',defaultName:'咪咪',img:'pet-cat.png',greet:'喵～你終於來陪我了！',owner:'看到主人時偷偷開心靠近你。',kind:'撒嬌小夥伴'},
    rabbit:{name:'兔兔',defaultName:'小兔',img:'pet-rabbit.png',greet:'啾啾～今天也一起玩吧！',owner:'兔兔蹦蹦跳跳地迎接你！',kind:'療癒小可愛'}
  };

  function ensureState(){
    if(typeof st==='undefined') return null;

    if(!st[STORE_KEY] || typeof st[STORE_KEY] !== 'object'){
      st[STORE_KEY]={
        petType:'dog',
        petName:'旺旺',
        hunger:82,
        clean:84,
        happy:82,
        energy:88,
        trust:32,
        totalCare:0,
        names:{dog:'旺旺',cat:'咪咪',rabbit:'小兔'},
        game:{date:today(),interactions:0,feeds:0,quizDone:0,rewardClaimed:false}
      };
    }

    const p=st[STORE_KEY];
    if(!PETS[p.petType]) p.petType='dog';
    if(!p.names || typeof p.names!=='object'){
      p.names={dog:'旺旺',cat:'咪咪',rabbit:'小兔'};
    }
    if(!p.petName) p.petName=p.names[p.petType] || PETS[p.petType].defaultName;

    ['hunger','clean','happy','energy','trust'].forEach(k=>{
      p[k]=clamp(p[k] ?? (k==='trust'?32:82));
    });

    p.totalCare=Number(p.totalCare)||0;
    if(!p.game || typeof p.game!=='object') p.game={};
    if(p.game.date!==today()){
      p.game={date:today(),interactions:0,feeds:0,quizDone:0,rewardClaimed:false};
    }
    p.game.interactions=Number(p.game.interactions)||0;
    p.game.feeds=Number(p.game.feeds)||0;
    p.game.quizDone=Number(p.game.quizDone)||0;
    p.game.rewardClaimed=Boolean(p.game.rewardClaimed);
    return p;
  }

  function saveAll(){
    if(typeof save==='function') save();
    if(typeof header==='function') header();
  }

  function petLevel(p){
    return Math.max(1,Math.floor((p.totalCare||0)/8)+1);
  }

  function xpPercent(p){
    return Math.min(100, Math.round(((p.totalCare||0)%8)/8*100));
  }

  function missionState(p){
    return {
      feed: p.game.feeds>=3,
      interact: p.game.interactions>=3,
      quiz: p.game.quizDone>=1
    };
  }

  function missionCount(p){
    return Object.values(missionState(p)).filter(Boolean).length;
  }

  function maybeDailyReward(p){
    const ms=missionState(p);
    if(ms.feed && ms.interact && ms.quiz && !p.game.rewardClaimed){
      p.game.rewardClaimed=true;
      st.coins=(Number(st.coins)||0)+50;
      showToast('🎁 每日任務完成！獲得 50 枚守護金幣');
    }
  }

  function showToast(msg){
    if(typeof toast==='function') toast(msg);
    else console.log(msg);
  }

  function petDom(){
    return {
      panel: document.getElementById('petHomePanel'),
      stage: document.getElementById('petGameStage'),
      wrap: document.getElementById('petGameAnimalWrap'),
      animal: document.getElementById('petGameAnimal'),
      speech: document.getElementById('petSpeech'),
      emotion: document.getElementById('petEmotionBadge')
    };
  }

  function setSpeech(text, emoji='💬'){
    const {speech,emotion}=petDom();
    if(speech){
      speech.textContent=text;
      speech.classList.remove('show');
      void speech.offsetWidth;
      speech.classList.add('show');
    }
    if(emotion){
      emotion.textContent=emoji;
      emotion.classList.remove('show');
      void emotion.offsetWidth;
      emotion.classList.add('show');
    }
  }

  function animatePet(name){
    const {wrap}=petDom();
    if(!wrap) return;
    wrap.classList.remove('anim-greet','anim-happy','anim-tail','anim-play','anim-feed','anim-clean','anim-sleep','anim-walk','anim-bounce');
    void wrap.offsetWidth;
    wrap.classList.add(name);
  }

  function floatEffects(kind='heart'){
    const {stage}=petDom();
    if(!stage) return;
    const pool = kind==='clean' ? ['🫧','✨','🫧','✨'] :
                 kind==='food'  ? ['🥕','🥣','✨','💛'] :
                 kind==='walk'  ? ['🍃','🐾','💚','✨'] :
                 ['💗','✨','💖','💞'];
    for(let i=0;i<6;i++){
      const el=document.createElement('span');
      el.className='pet-v7-float';
      el.textContent=pool[i%pool.length];
      el.style.left=(44+Math.random()*18)+'%';
      el.style.top=(40+Math.random()*18)+'%';
      el.style.animationDelay=(i*0.05)+'s';
      stage.appendChild(el);
      setTimeout(()=>el.remove(),1300);
    }
  }

  function updateAndRender(message, animation, effect='heart', emoji='💗'){
    const p=ensureState(); if(!p) return;
    maybeDailyReward(p);
    saveAll();
    renderPetHome();
    requestAnimationFrame(()=>{
      animatePet(animation || 'anim-bounce');
      floatEffects(effect);
      setSpeech(message, emoji);
    });
  }

  function interact(action){
    const p=ensureState(); if(!p) return;
    const costMap={feed:1};
    const rules={
      pet:   {happy:+6,trust:+5,energy:+1,hunger:0, clean:0,  care:+1, interact:+1, animation:'anim-tail',  effect:'heart', emoji:'💗', text:'被摸摸超開心，我想一直陪著你！'},
      feed:  {happy:+3,trust:+2,energy:+3,hunger:+16,clean:-1,care:+1, feeds:+1,    animation:'anim-feed',  effect:'food',  emoji:'🥣', text:'吃飽飽了！我要搖尾巴給你看！'},
      play:  {happy:+14,trust:+4,energy:-7,hunger:-4,clean:-2,care:+1, interact:+1, animation:'anim-happy', effect:'heart', emoji:'🎉', text:'好好玩！我開心到轉圈圈了！'},
      clean: {happy:+2,trust:+3,energy:-1,hunger:0, clean:+18,care:+1, interact:+1, animation:'anim-clean', effect:'clean', emoji:'🫧', text:'洗香香後，我整個心情都變好了！'},
      sleep: {happy:+2,trust:+1,energy:+22,hunger:-3,clean:0, care:+1,              animation:'anim-sleep', effect:'heart', emoji:'🌙', text:'呼嚕呼嚕……我補充好精神了！'},
      walk:  {happy:+11,trust:+5,energy:-6,hunger:-5,clean:-3,care:+1, interact:+1, animation:'anim-walk',  effect:'walk',  emoji:'🐾', text:'一起散步最棒了！我忍不住開心往前跑！'}
    };

    const r=rules[action];
    if(!r) return;

    const cost=costMap[action]||0;
    const coins=Number(st.coins)||0;
    if(cost>coins){
      showToast('守護金幣不足，先去答題賺金幣吧！');
      return;
    }

    st.coins=coins-cost;
    p.happy =clamp(p.happy +(r.happy||0));
    p.trust =clamp(p.trust +(r.trust||0));
    p.energy=clamp(p.energy+(r.energy||0));
    p.hunger=clamp(p.hunger+(r.hunger||0));
    p.clean =clamp(p.clean +(r.clean||0));
    p.totalCare += Number(r.care||0);

    p.game.feeds += Number(r.feeds||0);
    p.game.interactions += Number(r.interact||0);

    updateAndRender(r.text, r.animation, r.effect, r.emoji);
  }

  function onPetClick(){
    const p=ensureState(); if(!p) return;
    p.happy=clamp(p.happy+2);
    p.trust=clamp(p.trust+1);
    p.game.interactions += 1;
    const lines=[
      PETS[p.petType].greet,
      PETS[p.petType].owner,
      '我一看到你就想靠近你！',
      '今天也陪我一下下好嗎？',
      '你來了，我真的好開心！'
    ];
    updateAndRender(lines[Math.floor(Math.random()*lines.length)], 'anim-greet', 'heart', '😍');
  }

  function renamePet(){
    const p=ensureState(); if(!p) return;
    const name=prompt('幫毛孩取名字：', p.petName);
    if(name===null) return;
    const finalName=(name.trim() || p.petName).slice(0,10);
    p.petName=finalName;
    p.names[p.petType]=finalName;
    saveAll();
    renderPetHome();
    setTimeout(()=>setSpeech(`你好呀！我是 ${finalName} ～`, '✨'), 100);
  }

  function switchPet(type){
    const p=ensureState(); if(!p || !PETS[type]) return;
    p.petType=type;
    p.petName=p.names[type] || PETS[type].defaultName;
    saveAll();
    renderPetHome();
    setTimeout(()=>{
      animatePet('anim-greet');
      setSpeech(`嗨！我是 ${p.petName}，今天也想和你互動！`, '💖');
    },50);
  }

  function registerQuizDone(){
    const p=ensureState(); if(!p) return;
    p.game.quizDone=Math.max(1,p.game.quizDone);
    maybeDailyReward(p);
    saveAll();
    renderPetHome();
  }

  function bar(icon,label,val,cls){
    return `<div class="pet-v7-stat">
      <span>${icon}</span>
      <b>${label}</b>
      <div class="pet-v7-track"><i class="${cls}" style="width:${val}%"></i></div>
      <strong>${val}</strong>
    </div>`;
  }

  function petChoice(type,p){
    const meta=PETS[type];
    const active=p.petType===type;
    const nm=p.names?.[type] || meta.defaultName;
    return `<button class="pet-v7-switch ${active?'active':''}" onclick="petGameSwitch('${type}')">
      <img src="${meta.img}" alt="${meta.name}">
      <small>${meta.name}</small>
      <b>${esc(nm)}</b>
    </button>`;
  }

  function missionRow(done,label,count){
    return `<div class="pet-v7-mission-row ${done?'done':''}">
      <span class="box">${done?'✓':''}</span>
      <b>${label}</b>
      <em>${count}</em>
    </div>`;
  }

  function renderPetHome(){
    const host=document.getElementById('petHomePanel');
    if(!host) return;
    const p=ensureState(); if(!p) return;
    const meta=PETS[p.petType];
    const lv=petLevel(p);
    const ms=missionState(p);
    const done=missionCount(p);
    const coins=Number(st.coins)||0;
    const relation=clamp(Math.round(p.trust*0.6 + p.happy*0.4));

    host.innerHTML=`
      <div class="pet-v7-shell">
        <div class="pet-v7-top">
          <div class="pet-v7-title">🏠 毛孩之家</div>
          <div class="pet-v7-banner">溫馨陪伴、照顧與互動，每天都讓毛孩更愛你！</div>
          <div class="pet-v7-wallet">🐾 <b>${coins}</b></div>
          <div class="pet-v7-level">
            <span>Lv.${lv}</span>
            <div><i style="width:${xpPercent(p)}%"></i></div>
          </div>
        </div>

        <div class="pet-v7-room">
          <aside class="pet-v7-left">
            <div class="pet-v7-love">
              <span>💗</span>
              <small>親密度</small>
              <strong>${relation}</strong>
            </div>

            <div class="pet-v7-missions">
              <h3>每日任務 <small>${done}/3</small></h3>
              ${missionRow(ms.feed,'餵食毛孩 3 次',`${Math.min(3,p.game.feeds)}/3`)}
              ${missionRow(ms.interact,'和毛孩互動 3 次',`${Math.min(3,p.game.interactions)}/3`)}
              ${missionRow(ms.quiz,'完成 1 次毛孩問答',`${Math.min(1,p.game.quizDone)}/1`)}
              <div class="pet-v7-reward">完成獎勵： 🐾 +50</div>
            </div>

            <div class="pet-v7-pet-list">
              ${petChoice('dog',p)}
              ${petChoice('cat',p)}
              ${petChoice('rabbit',p)}
            </div>
          </aside>

          <main class="pet-v7-stage" id="petGameStage">
            <div class="pet-v7-window"></div>
            <div class="pet-v7-wall-items"><span>🐾</span><span>🌱</span><span>💛</span></div>
            <div class="pet-v7-cat-tree"></div>
            <div class="pet-v7-bed"></div>
            <div class="pet-v7-bowl">🥣</div>
            <div class="pet-v7-water">💧</div>
            <div class="pet-v7-toys">🧸　⚽</div>
            <div class="pet-v7-house">🏠</div>

            <div class="pet-v7-speech" id="petSpeech">我是 ${esc(p.petName)}，看到你真的好開心！</div>
            <div class="pet-v7-emotion" id="petEmotionBadge">💖</div>

            <button class="pet-v7-animal-wrap" id="petGameAnimalWrap" type="button" onclick="petGameClick()">
              <img class="pet-v7-animal" id="petGameAnimal" src="${meta.img}" alt="${meta.name}">
            </button>

            <div class="pet-v7-name-card">
              <div class="main">
                <b>${esc(p.petName)}</b>
                <span>${meta.kind}</span>
              </div>
              <small>看到主人會開心往前，點牠也會有情緒反應喔！</small>
              <button type="button" onclick="renamePet()">✏️ 改名</button>
            </div>

            <div class="pet-v7-stats">
              ${bar('💗','心情',p.happy,'pink')}
              ${bar('🥣','飽足',p.hunger,'orange')}
              ${bar('🫧','清潔',p.clean,'green')}
              ${bar('⚡','活力',p.energy,'blue')}
            </div>
          </main>

          <aside class="pet-v7-right">
            <div class="pet-v7-side-box">
              <b>快速互動</b>
              <button class="quick pink" onclick="petGameInteract('pet')">💗 一鍵抱抱</button>
              <button class="quick gold" onclick="petGameInteract('feed')">🥣 一鍵餵食</button>
              <button class="quick mint" onclick="petGameInteract('play')">🎾 一鍵玩耍</button>
            </div>
            <div class="pet-v7-tip">
              💡 毛孩心情高時，會更容易出現開心反應，例如轉圈圈、搖尾巴、往前迎接你。
            </div>
          </aside>
        </div>

        <div class="pet-v7-actions">
          <button type="button" onclick="petGameInteract('feed')"><span>🥣</span><b>餵食</b></button>
          <button type="button" onclick="petGameInteract('play')"><span>🎾</span><b>玩耍</b></button>
          <button type="button" onclick="petGameInteract('pet')"><span>🤲</span><b>摸摸</b></button>
          <button type="button" onclick="petGameInteract('clean')"><span>🫧</span><b>清潔</b></button>
          <button type="button" onclick="petGameInteract('sleep')"><span>🌙</span><b>睡覺</b></button>
          <button type="button" onclick="petGameInteract('walk')"><span>🐾</span><b>散步</b></button>
        </div>
      </div>`;
  }

  function ensurePetSection(){
    const base=document.getElementById('basePage');
    if(!base) return null;

    let section=document.getElementById('petHomeSection');
    if(!section){
      section=document.createElement('section');
      section.id='petHomeSection';
      section.className='pet-home-section-v7';
      section.innerHTML='<div id="petHomePanel"></div>';
      base.appendChild(section);
    }else if(!section.querySelector('#petHomePanel')){
      section.innerHTML='<div id="petHomePanel"></div>';
    }

    renderPetHome();
    return section;
  }

  function ensureBaseTabs(){
    const base=document.getElementById('basePage');
    const pet=ensurePetSection();
    if(!base || !pet) return;

    let tabs=document.getElementById('baseQuickTabs');
    if(!tabs){
      tabs=document.createElement('div');
      tabs.id='baseQuickTabs';
      tabs.className='base-quick-tabs';
      tabs.innerHTML='' +
        '<button type="button" data-mode="my" class="active">🌍 我的基地</button>' +
        '<button type="button" data-mode="pet">🐾 毛孩之家</button>';
      base.insertBefore(tabs, base.firstChild);
      tabs.querySelector('[data-mode="my"]').onclick=()=>switchBaseMode('my');
      tabs.querySelector('[data-mode="pet"]').onclick=()=>switchBaseMode('pet');
    }

    let my=document.getElementById('myBaseView');
    if(!my){
      my=document.createElement('section');
      my.id='myBaseView';
      my.className='base-mode-view';
      base.insertBefore(my, pet);

      const toMove=[...base.children].filter(el =>
        el!==tabs && el!==my && el!==pet
      );
      toMove.forEach(el=>my.appendChild(el));
    }

    return {tabs,my,pet};
  }

  function switchBaseMode(mode='my'){
    const refs=ensureBaseTabs();
    if(!refs) return;
    const {tabs,my,pet}=refs;
    const isPet=mode==='pet';

    my.classList.toggle('is-hidden', isPet);
    pet.classList.toggle('is-hidden', !isPet);
    tabs.querySelectorAll('button').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.mode===mode);
    });

    try{ sessionStorage.setItem('baseMode', mode); }catch(e){}
    if(isPet){
      renderPetHome();
      setTimeout(()=>{
        animatePet('anim-greet');
        const p=ensureState();
        if(p) setSpeech(PETS[p.petType].owner, '😍');
      },80);
    }
    window.scrollTo({top:0,left:0,behavior:'auto'});
  }

  function restoreBaseMode(){
    let mode='my';
    try{
      const m=sessionStorage.getItem('baseMode');
      if(m==='pet') mode='pet';
    }catch(e){}
    switchBaseMode(mode);
  }

  function patchShowBase(){
    const old=window.showBase;
    if(typeof old!=='function' || old.__petV7Patched) return;
    const wrapped=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        ensureBaseTabs();
        restoreBaseMode();
      },0);
      return r;
    };
    wrapped.__petV7Patched=true;
    window.showBase=wrapped;
  }

  function patchRenderBase(){
    const old=window.renderBase;
    if(typeof old!=='function' || old.__petV7Patched) return;
    const wrapped=function(){
      const r=old.apply(this,arguments);
      setTimeout(()=>{
        ensureBaseTabs();
        renderPetHome();
      },0);
      return r;
    };
    wrapped.__petV7Patched=true;
    window.renderBase=wrapped;
  }

  function install(){
    ensureBaseTabs();
    patchShowBase();
    patchRenderBase();
  }

  window.renderPetHome=renderPetHome;
  window.petGameInteract=interact;
  window.petGameClick=onPetClick;
  window.petGameSwitch=switchPet;
  window.renamePet=renamePet;
  window.petGameRegisterQuizDone=registerQuizDone;
  window.switchBaseMode=switchBaseMode;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', ()=>setTimeout(install, 250), {once:true});
  }else{
    setTimeout(install, 250);
  }
})();
