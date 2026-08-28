
/* =========================================================
   毛孩之家 V6：溫馨木屋互動遊戲
   - 狗狗 / 貓咪 / 兔兔可切換
   - 餵食、玩耍、摸摸、清潔、睡覺、散步
   - 心情 / 飽足 / 清潔 / 活力 / 親密度
   - 每日任務與互動動畫
   - 共用主遊戲 st / save() / coins
   ========================================================= */
(function(){
  const KEY='petGuardian';
  const MAX=100;
  const PETS={
    dog:{name:'狗狗',defaultName:'旺旺',img:'pet-dog.png',sound:'汪！今天也一起玩吧！'},
    cat:{name:'貓咪',defaultName:'咪咪',img:'pet-cat.png',sound:'喵～陪我一下嘛！'},
    rabbit:{name:'兔兔',defaultName:'兔兔',img:'pet-rabbit.png',sound:'今天有胡蘿蔔嗎？'}
  };

  const clamp=(n,min=0,max=MAX)=>Math.max(min,Math.min(max,Number(n)||0));
  const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function today(){
    const d=new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function ensure(){
    if(typeof st==='undefined')return null;
    if(!st[KEY]||typeof st[KEY]!=='object'){
      st[KEY]={adopted:true,petType:'dog',petName:'旺旺',hunger:80,clean:82,happy:76,trust:25,energy:85,totalCare:0};
    }
    const p=st[KEY];
    if(!PETS[p.petType])p.petType='dog';
    if(!p.petName)p.petName=PETS[p.petType].defaultName;
    ['hunger','clean','happy','trust','energy'].forEach(k=>p[k]=clamp(p[k]??(k==='trust'?25:80)));
    if(!p.game||typeof p.game!=='object')p.game={};
    const g=p.game;
    if(g.date!==today()){
      g.date=today();
      g.interactions=0;
      g.feeds=0;
      g.quizDone=0;
      g.rewardClaimed=false;
    }
    g.interactions=Number(g.interactions)||0;
    g.feeds=Number(g.feeds)||0;
    g.quizDone=Number(g.quizDone)||0;
    return p;
  }

  function toastPet(msg){
    if(typeof toast==='function')toast(msg);
    else console.log(msg);
  }

  function level(p){
    return Math.max(1,Math.floor((Number(p.totalCare)||0)/8)+1);
  }

  function relationTotal(p){
    return clamp(Math.round((p.trust*0.6+p.happy*0.4)));
  }

  function missionState(p){
    const g=p.game;
    return {
      feed:g.feeds>=3,
      interact:g.interactions>=3,
      quiz:g.quizDone>=1
    };
  }

  function missionDoneCount(p){
    return Object.values(missionState(p)).filter(Boolean).length;
  }

  function maybeReward(p){
    const done=missionState(p);
    if(done.feed&&done.interact&&done.quiz&&!p.game.rewardClaimed){
      p.game.rewardClaimed=true;
      st.coins=(Number(st.coins)||0)+50;
      toastPet('🎁 每日任務完成！獲得 50 枚守護金幣');
    }
  }

  function saveAndRender(action,message){
    const p=ensure();
    maybeReward(p);
    if(typeof save==='function')save();
    if(typeof header==='function')header();
    renderPetHome();
    requestAnimationFrame(()=>{
      const pet=document.getElementById('petGameAnimal');
      if(pet){
        pet.classList.remove('pet-anim-pet','pet-anim-feed','pet-anim-play','pet-anim-clean','pet-anim-sleep','pet-anim-walk','pet-anim-click');
        void pet.offsetWidth;
        pet.classList.add('pet-anim-'+(action||'click'));
      }
      makeHearts(action);
    });
    if(message)toastPet(message);
  }

  function makeHearts(action){
    const stage=document.getElementById('petGameStage');
    if(!stage)return;
    const icons=action==='feed'?['🥕','✨','💛']:action==='clean'?['🫧','✨','🫧']:['💗','✨','💖'];
    for(let i=0;i<5;i++){
      const s=document.createElement('span');
      s.className='pet-float-heart';
      s.textContent=icons[i%icons.length];
      s.style.left=(48+Math.random()*16)+'%';
      s.style.top=(35+Math.random()*20)+'%';
      s.style.animationDelay=(i*.06)+'s';
      stage.appendChild(s);
      setTimeout(()=>s.remove(),1200);
    }
  }

  function reaction(text){
    const b=document.getElementById('petSpeech');
    if(!b)return;
    b.textContent=text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  function interact(action){
    const p=ensure(); if(!p)return;
    const meta=PETS[p.petType];
    const rules={
      pet:{happy:6,trust:5,energy:0,hunger:0,clean:0,text:'最喜歡你摸摸我了！ 💕'},
      feed:{happy:2,trust:2,energy:2,hunger:16,clean:-1,cost:1,text:'好好吃！謝謝你～ 🥣'},
      play:{happy:13,trust:4,energy:-7,hunger:-4,clean:-2,text:'再玩一次！我還想玩！ 🧸'},
      clean:{happy:1,trust:2,energy:-1,hunger:0,clean:18,text:'香香乾淨，舒服多了！ 🫧'},
      sleep:{happy:3,trust:1,energy:22,hunger:-3,clean:0,text:'呼嚕呼嚕……充滿精神了！ 🌙'},
      walk:{happy:10,trust:5,energy:-6,hunger:-5,clean:-3,text:p.petType==='dog'?'散步最開心了！ 🦮':'一起活動好開心！ 🌿'}
    };
    const r=rules[action]; if(!r)return;
    const coins=Number(st.coins)||0;
    if((r.cost||0)>coins){toastPet('守護金幣不足，先去答題賺金幣吧！');return;}

    st.coins=coins-(r.cost||0);
    p.happy=clamp(p.happy+r.happy);
    p.trust=clamp(p.trust+r.trust);
    p.energy=clamp(p.energy+r.energy);
    p.hunger=clamp(p.hunger+r.hunger);
    p.clean=clamp(p.clean+r.clean);
    p.totalCare=(Number(p.totalCare)||0)+1;

    if(action==='feed')p.game.feeds++;
    if(['pet','play','walk','clean'].includes(action))p.game.interactions++;

    saveAndRender(action,r.text);
    setTimeout(()=>reaction(r.text),80);
  }

  function petClicked(){
    const p=ensure(); if(!p)return;
    p.happy=clamp(p.happy+1);
    const lines=[
      PETS[p.petType].sound,
      '今天也要一起守護動物喔！',
      '你來了！我一直在等你～',
      '摸摸我，我會更開心！',
      '一起完成今天的任務吧！'
    ];
    if(typeof save==='function')save();
    reaction(lines[Math.floor(Math.random()*lines.length)]);
    const pet=document.getElementById('petGameAnimal');
    if(pet){pet.classList.remove('pet-anim-click');void pet.offsetWidth;pet.classList.add('pet-anim-click');}
    makeHearts('pet');
  }

  function switchPet(type){
    const p=ensure(); if(!p||!PETS[type])return;
    p.petType=type;
    if(!p.names||typeof p.names!=='object')p.names={};
    p.petName=p.names[type]||PETS[type].defaultName;
    if(typeof save==='function')save();
    renderPetHome();
    setTimeout(()=>reaction(`嗨！我是${p.petName}～`),100);
  }

  function renamePet(){
    const p=ensure();if(!p)return;
    const input=prompt('幫毛孩取名字：',p.petName);
    if(input===null)return;
    const name=(input.trim()||p.petName).slice(0,10);
    p.petName=name;
    if(!p.names||typeof p.names!=='object')p.names={};
    p.names[p.petType]=name;
    if(typeof save==='function')save();
    renderPetHome();
  }

  function registerQuizDone(){
    const p=ensure(); if(!p)return;
    p.game.quizDone=Math.max(1,p.game.quizDone);
    maybeReward(p);
    if(typeof save==='function')save();
    renderPetHome();
  }

  window.petGameInteract=interact;
  window.petGameClick=petClicked;
  window.petGameSwitch=switchPet;
  window.renamePet=renamePet;
  window.petGameRegisterQuizDone=registerQuizDone;

  function bar(icon,label,value,cls){
    return `<div class="pet-v6-stat"><span>${icon}</span><b>${label}</b><div class="pet-v6-track"><i class="${cls}" style="width:${value}%"></i></div><strong>${value}</strong></div>`;
  }

  function petCard(type,p){
    const m=PETS[type],active=p.petType===type;
    return `<button class="pet-v6-switch ${active?'active':''}" onclick="petGameSwitch('${type}')">
      <img src="${m.img}" alt="${m.name}">
      <span>${p.names?.[type]||m.defaultName}</span>
    </button>`;
  }

  function missionLine(done,label,count){
    return `<div class="pet-v6-mission-row ${done?'done':''}">
      <span class="box">${done?'✓':''}</span><b>${label}</b><em>${count}</em>
    </div>`;
  }

  function renderPetHome(){
    const host=document.getElementById('petHomePanel');
    if(!host)return;
    const p=ensure();if(!p)return;
    const meta=PETS[p.petType],ms=missionState(p),done=missionDoneCount(p);
    const lv=level(p),rel=relationTotal(p);
    const coins=Number(st.coins)||0;

    host.innerHTML=`
      <div class="pet-v6-shell">
        <div class="pet-v6-top">
          <div class="pet-v6-title"><span>🏠</span><b>毛孩之家</b></div>
          <div class="pet-v6-message">每天都來陪陪毛孩，牠們會給你小驚喜喔！ 💗</div>
          <div class="pet-v6-wallet">🐾 <b>${coins}</b></div>
          <div class="pet-v6-level">⭐ Lv.${lv}<div><i style="width:${Math.min(100,(p.totalCare%8)/8*100)}%"></i></div></div>
        </div>

        <div class="pet-v6-room">
          <aside class="pet-v6-left">
            <div class="pet-v6-love">
              <span>💗</span><small>親密度總和</small><strong>${rel}</strong>
            </div>
            <div class="pet-v6-missions">
              <h3>每日任務 <small>(${done}/3)</small></h3>
              ${missionLine(ms.feed,'餵食毛孩 3 次',`${Math.min(3,p.game.feeds)}/3`)}
              ${missionLine(ms.interact,'和毛孩互動 3 次',`${Math.min(3,p.game.interactions)}/3`)}
              ${missionLine(ms.quiz,'完成 1 次問答',`${Math.min(1,p.game.quizDone)}/1`)}
              <div class="pet-v6-reward">完成獎勵： 🐾 +50</div>
            </div>
            <div class="pet-v6-pets">
              ${petCard('dog',p)}
              ${petCard('cat',p)}
              ${petCard('rabbit',p)}
            </div>
          </aside>

          <main class="pet-v6-stage" id="petGameStage">
            <div class="pet-v6-window"><span>☁️</span><span>🌿</span></div>
            <div class="pet-v6-frames"><span>🐾</span><span>🌱</span><span>💛</span></div>
            <div class="pet-v6-cat-tree">🧶</div>
            <div class="pet-v6-bed"></div>
            <div class="pet-v6-house">🏠</div>
            <div class="pet-v6-bowl">🥣</div>
            <div class="pet-v6-water">💧</div>
            <div class="pet-v6-toys">⚽　🧸</div>

            <div class="pet-v6-speech" id="petSpeech">嗨！我是 ${esc(p.petName)}～</div>
            <button class="pet-v6-animal-wrap" onclick="petGameClick()" aria-label="點擊${meta.name}">
              <img id="petGameAnimal" class="pet-v6-animal" src="${meta.img}" alt="${meta.name}">
            </button>

            <div class="pet-v6-name-card">
              <b>${esc(p.petName)}</b><span>💗 ${p.trust}</span>
              <small>${meta.name}・點牠會有反應喔！</small>
              <button onclick="renamePet()">✏️ 改名</button>
            </div>

            <div class="pet-v6-stats">
              ${bar('💗','心情',p.happy,'pink')}
              ${bar('🥣','飽足',p.hunger,'orange')}
              ${bar('🫧','清潔',p.clean,'green')}
              ${bar('⚡','活力',p.energy,'blue')}
            </div>
          </main>

          <aside class="pet-v6-right">
            <div class="pet-v6-quick-title">快速互動</div>
            <button class="quick pink" onclick="petGameInteract('pet')">💗 <b>一鍵抱抱</b><small>增加親密度</small></button>
            <button class="quick blue" onclick="petGameInteract('feed')">🥣 <b>一鍵餵食</b><small>消耗 🐾 1</small></button>
            <div class="pet-v6-tip">💡 每天互動可以提升親密度，親密度越高，毛孩的反應越豐富！</div>
          </aside>
        </div>

        <div class="pet-v6-actions">
          <button onclick="petGameInteract('feed')"><span>🥣</span><b>餵食</b></button>
          <button onclick="petGameInteract('play')"><span>🎾</span><b>玩耍</b></button>
          <button onclick="petGameInteract('pet')"><span>🤲</span><b>摸摸</b></button>
          <button onclick="petGameInteract('clean')"><span>🫧</span><b>清潔</b></button>
          <button onclick="petGameInteract('sleep')"><span>🌙</span><b>睡覺</b></button>
          <button onclick="petGameInteract('walk')"><span>🦮</span><b>散步</b></button>
        </div>
      </div>`;
  }

  window.renderPetHome=renderPetHome;

  function ensureUi(){
    const base=document.getElementById('basePage');
    if(!base)return;
    let section=document.getElementById('petHomeSection');
    if(!section){
      section=document.createElement('section');
      section.id='petHomeSection';
      section.className='pet-home-section';
      section.innerHTML=`<div id="petHomePanel"></div>`;
      const savePanel=base.querySelector('.save-panel');
      if(savePanel)base.insertBefore(section,savePanel);
      else base.appendChild(section);
    }
    renderPetHome();
  }

  function patch(name,after){
    const old=window[name];
    if(typeof old!=='function'||old.__petV6)return;
    const wrapped=function(){const r=old.apply(this,arguments);setTimeout(after,0);return r};
    wrapped.__petV6=true;window[name]=wrapped;
  }

  function install(){
    ensureUi();
    patch('showBase',()=>{ensureUi();renderPetHome()});
    patch('renderBase',()=>{ensureUi();renderPetHome()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(install,250),{once:true});
  else setTimeout(install,250);
})();
