
const S=[
{id:'s1',name:'蒼翠萌芽境',icon:'🌱',code:'STAGE 01',desc:'從生活環保知識開始，喚醒沉睡的大地。',main:'初級',support:'中級',badge:'🌿',badgeName:'萌芽守護徽章',enemy:'🌀',enemyName:'浪費旋風'},
{id:'s2',name:'翡翠迷霧森',icon:'🌳',code:'STAGE 02',desc:'穿越迷霧森林，運用進階知識修復生態之心。',main:'中級',support:'中高級',badge:'🦉',badgeName:'森境智者徽章',enemy:'🌫️',enemyName:'污染迷霧'},
{id:'s3',name:'零碳星際城',icon:'⚡',code:'STAGE 03',desc:'破解能源、氣候與永續治理難題。',main:'中高級',support:'高級',badge:'💠',badgeName:'零碳先鋒徽章',enemy:'🤖',enemyName:'耗能機甲'},
{id:'s4',name:'地核終焉神殿',icon:'🌋',code:'STAGE 04',desc:'以最高級知識完成最後的守護試煉。',main:'高級',support:null,badge:'👑',badgeName:'地核榮耀徽章',enemy:'👾',enemyName:'終極污染魔王'}];
const ITEMS=[
{id:'tree',icon:'🌳',name:'守護樹',cost:3,desc:'讓基地長出第一棵守護樹。'},
{id:'flowers',icon:'🌼',name:'生態花園',cost:5,desc:'吸引蝴蝶與蜜蜂回到基地。'},
{id:'water',icon:'💧',name:'雨水回收池',cost:8,desc:'收集雨水，澆灌基地植物。'},
{id:'solar',icon:'☀️',name:'太陽能屋頂',cost:10,desc:'用乾淨能源供應守護基地。'},
{id:'wind',icon:'🌬️',name:'小型風力機',cost:12,desc:'利用風力產生綠色能源。'},
{id:'animal',icon:'🐢',name:'動物保護區',cost:15,desc:'讓受保護動物有安全棲地。'}];

const AVATARS=[
{id:'fox',icon:'🦊',name:'森林狐狸',level:1},
{id:'panda',icon:'🐼',name:'竹林熊貓',level:1},
{id:'turtle',icon:'🐢',name:'海洋綠蠵龜',level:1},
{id:'owl',icon:'🦉',name:'森林貓頭鷹',level:1},
{id:'dolphin',icon:'🐬',name:'守護海豚',level:5},
{id:'bee',icon:'🐝',name:'授粉小蜜蜂',level:8},
{id:'penguin',icon:'🐧',name:'極地企鵝',level:12},
{id:'deer',icon:'🦌',name:'梅花鹿',level:16},
{id:'butterfly',icon:'🦋',name:'生態蝴蝶',level:20},
{id:'leopardcat',icon:'🐆',name:'臺灣石虎',level:25},
{id:'kite',icon:'🦅',name:'守護黑鳶',level:30},
{id:'seal',icon:'🦭',name:'海洋海豹',level:35},
{id:'otter',icon:'🦦',name:'金門歐亞水獺',level:45,kinmen:true},
{id:'horseshoe',icon:'鱟',name:'金門鱟',level:50,kinmen:true}
];
const FRAMES=[
{id:'none',name:'自然圓框',icon:'○',level:1},
{id:'bronze',name:'青銅守護框',icon:'🥉',level:10},
{id:'silver',name:'白銀守護框',icon:'🥈',level:20},
{id:'gold',name:'黃金守護框',icon:'🥇',level:30},
{id:'rainbow',name:'彩虹生態框',icon:'🌈',level:40},
{id:'kinmen',name:'金門傳奇框',icon:'🏝️',level:50}
];
const MAX_LEVEL=50;
const UNITS=5, KEY='ecoAdventureV32';
let st=load(), stage,unit,quiz=[],qi=0,score=0,answered=false,replayMode=false,selectedLoginAvatar='fox';
function defaultState(){return{loggedIn:false,name:'沄芯',coins:0,last:'',streak:0,completed:{},lastScores:{},owned:[],savedAt:'',unitProgress:{},unitScores:{},avatar:'fox',frame:'none',exp:0,totalCorrect:0,totalAnswered:0,playDays:0,lastPlayDate:'',soundEnabled:true}}
function load(){try{return {...defaultState(),...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return defaultState()}}
function save(){
  try{
    st.savedAt=new Date().toISOString();
    localStorage.setItem(KEY,JSON.stringify(st));
    updateSaveStatus('saved');
    return true;
  }catch(err){
    console.error('儲存失敗',err);
    updateSaveStatus('error');
    return false;
  }
}
function updateSaveStatus(mode='saved'){
  const status=document.getElementById('saveStatus');
  const time=document.getElementById('saveTime');
  const dot=document.getElementById('saveDot');
  if(!status||!time||!dot)return;
  dot.classList.remove('saving');
  if(mode==='saving'){
    status.textContent='正在存檔…';
    dot.classList.add('saving');
  }else if(mode==='error'){
    status.textContent='存檔失敗';
    time.textContent='請使用「匯出存檔」備份';
  }else{
    status.textContent='已自動存檔';
    if(st.savedAt){
      const d=new Date(st.savedAt);
      time.textContent='最後存檔：'+d.toLocaleString('zh-TW');
    }else{
      time.textContent='尚未建立存檔';
    }
  }
}
function manualSave(){
  updateSaveStatus('saving');
  setTimeout(()=>{
    if(save())toast('💾 進度已存檔！');
  },150);
}
function exportSave(){
  manualSave();
  const payload={
    app:'環保冒險王',
    version:'5.0',
    exportedAt:new Date().toISOString(),
    data:st
  };
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  const safeName=(st.name||'玩家').replace(/[\\/:*?"<>|]/g,'_');
  a.href=url;
  a.download=`環保冒險王_${safeName}_存檔.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  toast('⬇️ 存檔檔案已匯出');
}
function importSave(event){
  const file=event.target.files&&event.target.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      const data=parsed.data||parsed;
      if(!data||typeof data!=='object')throw new Error('格式不正確');
      st={...defaultState(),...data,loggedIn:true};
      save();
      ensureProfile();
      selectedLoginAvatar=st.avatar||'fox';
      playerName.textContent=st.name||'沄芯';
      header();
      renderMap();
      page('mapPage');
      toast('⬆️ 存檔已成功匯入');
    }catch(err){
      alert('無法匯入這個存檔，請確認是本遊戲匯出的 JSON 檔案。');
    }finally{
      event.target.value='';
    }
  };
  reader.readAsText(file,'utf-8');
}

function levelFromExp(exp){
  return Math.min(MAX_LEVEL,Math.floor(Math.max(0,Number(exp)||0)/100)+1);
}
function currentLevel(){return levelFromExp(st.exp)}
function expInLevel(){return currentLevel()>=MAX_LEVEL?100:(st.exp%100)}
function titleForLevel(level=currentLevel()){
  if(level>=50)return '金門生態傳奇';
  if(level>=45)return '金門水域守護者';
  if(level>=40)return '彩虹地球英雄';
  if(level>=30)return '永續守護大師';
  if(level>=20)return '菁英生態守護者';
  if(level>=10)return '森林巡守員';
  return '見習地球守護者';
}
function avatarById(id){return AVATARS.find(a=>a.id===id)||AVATARS[0]}
function frameById(id){return FRAMES.find(f=>f.id===id)||FRAMES[0]}
function isAvatarUnlocked(a){return currentLevel()>=a.level}
function isFrameUnlocked(f){return currentLevel()>=f.level}
function ensureProfile(){
  if(!AVATARS.some(a=>a.id===st.avatar))st.avatar='fox';
  if(!FRAMES.some(f=>f.id===st.frame))st.frame='none';
  if(!isAvatarUnlocked(avatarById(st.avatar)))st.avatar='fox';
  if(!isFrameUnlocked(frameById(st.frame)))st.frame='none';
  st.exp=Math.max(0,Number(st.exp)||0);
  st.totalCorrect=Math.max(0,Number(st.totalCorrect)||0);
  st.totalAnswered=Math.max(0,Number(st.totalAnswered)||0);
}
function addExp(amount){
  ensureProfile();
  const before=currentLevel();
  st.exp=Math.max(0,st.exp+amount);
  const after=currentLevel();
  if(after>before){
    setTimeout(()=>showLevelUp(after),500);
  }
}
function selectLoginAvatar(id){
  selectedLoginAvatar=id;
  renderLoginAvatars();
}
function renderLoginAvatars(){
  const el=document.getElementById('loginAvatars');
  if(!el)return;
  const basics=AVATARS.filter(a=>a.level===1);
  el.innerHTML='';
  basics.forEach(a=>{
    const b=document.createElement('button');
    b.type='button';
    b.className='avatar-choice'+(selectedLoginAvatar===a.id?' selected':'');
    b.innerHTML=`<span>${a.icon}</span><small>${a.name}</small>`;
    b.onclick=()=>selectLoginAvatar(a.id);
    el.appendChild(b);
  });
}


let audioCtx=null;
function ensureAudio(){
  if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();
  if(audioCtx.state==='suspended')audioCtx.resume();
  return audioCtx;
}
function tone(freq=440,duration=.12,type='sine',volume=.04,delay=0){
  if(!st.soundEnabled)return;
  try{
    const ctx=ensureAudio(),osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type=type;osc.frequency.value=freq;
    gain.gain.setValueAtTime(0,ctx.currentTime+delay);
    gain.gain.linearRampToValueAtTime(volume,ctx.currentTime+delay+.015);
    gain.gain.exponentialRampToValueAtTime(.0001,ctx.currentTime+delay+duration);
    osc.connect(gain);gain.connect(ctx.destination);
    osc.start(ctx.currentTime+delay);osc.stop(ctx.currentTime+delay+duration+.03);
  }catch(e){}
}
function playSound(kind){
  if(kind==='correct'){tone(523,.12,'sine',.045);tone(659,.16,'sine',.04,.08);tone(784,.22,'sine',.035,.16)}
  else if(kind==='wrong'){tone(220,.18,'triangle',.035);tone(165,.24,'triangle',.03,.12)}
  else if(kind==='click'){tone(420,.07,'sine',.018)}
  else if(kind==='level'){tone(523,.14,'sine',.04);tone(659,.14,'sine',.04,.12);tone(784,.14,'sine',.04,.24);tone(1046,.35,'sine',.04,.36)}
  else if(kind==='complete'){tone(392,.12,'sine',.035);tone(523,.14,'sine',.04,.1);tone(659,.18,'sine',.04,.22);tone(784,.3,'sine',.04,.36)}
}
function toggleSound(){
  st.soundEnabled=!st.soundEnabled;
  save();updateSoundButton();
  if(st.soundEnabled)playSound('correct');
  toast(st.soundEnabled?'🔊 音效已開啟':'🔇 音效已關閉');
}
function updateSoundButton(){
  const b=document.getElementById('soundToggle');
  if(b){b.textContent=st.soundEnabled?'🔊':'🔇';b.setAttribute('aria-pressed',String(st.soundEnabled))}
}
function burst(symbol='✨',count=14){
  const layer=document.getElementById('effectLayer');
  if(!layer)return;
  for(let i=0;i<count;i++){
    const e=document.createElement('span');
    e.textContent=symbol;
    e.style.setProperty('--x',`${(Math.random()-.5)*70}vw`);
    e.style.setProperty('--y',`${-25-Math.random()*55}vh`);
    e.style.setProperty('--r',`${(Math.random()-.5)*520}deg`);
    e.style.left=`${42+Math.random()*16}%`;
    e.style.top=`${42+Math.random()*12}%`;
    e.style.animationDelay=`${Math.random()*.18}s`;
    layer.appendChild(e);
    setTimeout(()=>e.remove(),1300);
  }
}
function showLevelUp(level){
  const unlocks=[
    ...AVATARS.filter(a=>a.level===level).map(a=>a.icon+' '+a.name),
    ...FRAMES.filter(f=>f.level===level).map(f=>f.icon+' '+f.name)
  ];
  levelUnlockIcon.textContent=level>=50?'🏝️':level>=45?'🦦':'✨';
  levelUnlockTitle.textContent=`升到 Lv.${level}！`;
  levelUnlockText.textContent=`新稱號：${titleForLevel(level)}${unlocks.length?'｜解鎖：'+unlocks.join('、'):''}`;
  levelModal.classList.remove('hide');
  playSound('level');burst(level>=45?'🌊':'✨',20);
}
function closeLevelModal(){levelModal.classList.add('hide')}
function animateFeedback(ok){
  const card=document.getElementById('quizPage');
  card.classList.remove('answer-correct','answer-wrong');
  void card.offsetWidth;
  card.classList.add(ok?'answer-correct':'answer-wrong');
  if(ok)burst('✨',10);
}

function dateStr(d=new Date()){return d.toLocaleDateString('en-CA')}
function login(){
  st.name=(nameInput.value||'沄芯').trim();
  st.avatar=selectedLoginAvatar||st.avatar||'fox';
  st.loggedIn=true;
  dailyLogin();
  save();
  enterGame();
}
function enterGame(){
  ensureProfile();
  loginPage.classList.add('hide');
  game.classList.remove('hide');
  playerName.textContent=st.name;
  header();
  renderMap();
  updateSaveStatus('saved');
  updateSoundButton();
  page('mapPage');
}
function dailyLogin(){
  const t=dateStr();
  if(st.lastPlayDate!==t){st.playDays=(st.playDays||0)+1;st.lastPlayDate=t}
  if(st.last!==t){
    let y=new Date();y.setDate(y.getDate()-1);
    st.streak=st.last===dateStr(y)?st.streak+1:1;
    st.last=t;st.coins++;save();
    setTimeout(()=>toast('🎁 每日登入成功，獲得 1 枚金幣！'),300);
  }
}
function confirmLogout(){logoutModal.classList.remove('hide')}
function closeLogout(){logoutModal.classList.add('hide')}
function logout(){manualSave();st.loggedIn=false;save();logoutModal.classList.add('hide');game.classList.add('hide');loginPage.classList.remove('hide');nameInput.value=st.name;selectedLoginAvatar=st.avatar||'fox';renderLoginAvatars()}
function doneSet(id){return new Set(st.completed[id]||[])}
function isDone(s){return doneSet(s.id).size>=UNITS}
function ensureProgress(){
  if(!st.unitProgress)st.unitProgress={};
  if(!st.unitScores)st.unitScores={};
  S.forEach(s=>{
    if(!st.unitProgress[s.id])st.unitProgress[s.id]={};
    if(!st.unitScores[s.id])st.unitScores[s.id]={};
    (st.completed[s.id]||[]).forEach(u=>st.unitProgress[s.id][u]=10);
  });
}
function getUnitAnswered(stageId,unitIndex){
  ensureProgress();
  return Math.max(0,Math.min(10,Number(st.unitProgress[stageId][unitIndex]||0)));
}
function getStageQuestionProgress(stageId){
  let total=0;
  for(let i=0;i<UNITS;i++) total+=getUnitAnswered(stageId,i);
  return total;
}
function stagePercent(stageId){
  return Math.round(getStageQuestionProgress(stageId)/(UNITS*10)*100);
}
function header(){
 ensureProfile();
 const lv=currentLevel();
 const av=avatarById(st.avatar);
 const fr=frameById(st.frame);
 coins.textContent=st.coins;
 streak.textContent=st.streak||1;
 badges.textContent=S.filter(isDone).length;
 playerName.textContent=st.name||'沄芯';
 playerTitle.textContent=titleForLevel(lv);
 playerLevel.textContent=`Lv.${lv}`;
 playerAvatar.textContent=av.icon;
 playerAvatar.className=`player-avatar frame-${fr.id}`;
 expNow.textContent=expInLevel();
 expNext.textContent=100;
}
function renderMap(){
 const mapEl=document.getElementById('map');
 ensureProgress();
 mapEl.innerHTML='';
 S.forEach(s=>{
   const completedCount=doneSet(s.id).size;
   const answered=getStageQuestionProgress(s.id);
   const percent=stagePercent(s.id);
   const last=st.lastScores[s.id];
   const button=document.createElement('button');
   button.className='node'+(isDone(s)?' done':'');
   button.innerHTML=`
     <div class="icon">${s.icon}</div>
     <small>${s.code}</small>
     <h3>${s.name}</h3>
     <p>${s.support?s.main+' 8 題＋'+s.support+' 2 題／每單元':s.main+' 10 題／每單元'}</p>
     <div class="node-progress-box">
       <div class="node-progress-title">
         <span>關卡總進度</span>
         <strong>${percent}%</strong>
       </div>
       <div class="node-progress-bar">
         <span style="width:${percent}%"></span>
       </div>
       <div class="node-progress-detail">
         <div><small>已完成單元</small><b>${completedCount} / ${UNITS}</b></div>
         <div><small>已完成題數</small><b>${answered} / ${UNITS*10}</b></div>
       </div>
     </div>
     <div class="node-status">
       <span>⭐ 最近成績：${last===undefined?'尚未挑戰':last+' 分'}</span>
       <span class="badge-state">${isDone(s)?s.badge+' 已獲徽章':'🏅 徽章未取得'}</span>
     </div>`;
   button.onclick=()=>openStage(s);
   mapEl.appendChild(button);
 });
}
function page(id){['mapPage','stagePage','quizPage','resultPage','basePage','hallPage','profilePage'].forEach(x=>document.getElementById(x).classList.add('hide'));document.getElementById(id).classList.remove('hide');scrollTo(0,0)}
function showMap(){renderMap();header();page('mapPage')}
function openStage(s){
 stage=s;
 ensureProgress();
 stageIcon.textContent=s.icon;
 stageCode.textContent=s.code;
 stageName.textContent=s.name;
 stageDesc.textContent=s.desc;
 mix.innerHTML=s.support
   ?`<span>主要：${s.main} × 8</span><span>輔助：${s.support} × 2</span><span>每單元 10 題</span>`
   :`<span>${s.main} × 10</span><span>每單元 10 題</span>`;
 const completedCount=doneSet(s.id).size;
 const answered=getStageQuestionProgress(s.id);
 const percent=stagePercent(s.id);
 stageProgress.textContent=`${answered}/${UNITS*10} 題（${percent}%）｜完成 ${completedCount}/${UNITS} 單元`;
 stageBar.style.width=percent+'%';
 units.innerHTML='';
 for(let i=0;i<UNITS;i++){
   const b=document.createElement('button');
   const ok=doneSet(s.id).has(i);
   const unitAnswered=getUnitAnswered(s.id,i);
   b.className='unit'+(ok?' done':unitAnswered>0?' partial':'');
   b.innerHTML=`
     <span class="unit-icon">${ok?'✅':unitAnswered>0?'⏳':'🧭'}</span>
     <b class="unit-title">單元 ${i+1}</b>
     <span class="unit-level"><strong>挑戰級數</strong>${unitLevelText(s)}</span>
     <span class="unit-progress">${ok?'已完成':unitAnswered>0?`進行中：${unitAnswered}/10 題`:'尚未開始'}</span>`;
   b.onclick=()=>start(i);
   units.appendChild(b);
 }
 page('stagePage');
}
function shuffle(a){return [...a].sort(()=>Math.random()-.5)}
function rotateTake(arr,start,count){
  const out=[];
  for(let i=0;i<count;i++)out.push(arr[(start+i)%arr.length]);
  return out;
}
function fixedUnitQuestions(s,unitIndex){
  const mainBank=QUESTION_BANK[s.main];
  if(!s.support){
    return rotateTake(mainBank,unitIndex,10);
  }
  const supportBank=QUESTION_BANK[s.support];
  const main=rotateTake(mainBank,unitIndex*2,8);
  const support=rotateTake(supportBank,unitIndex*2,2);
  return main.concat(support);
}
function unitLevelText(s){
  return s.support?`${s.main} 8 題<br>${s.support} 2 題`:`${s.main} 10 題`;
}
function start(i){
 unit=i;
 ensureProgress();
 quiz=fixedUnitQuestions(stage,unit);
 const completed=doneSet(stage.id).has(unit);
 replayMode=completed;
 if(completed){
   qi=0;
   score=0;
 }else{
   qi=getUnitAnswered(stage.id,unit);
   score=Number(st.unitScores[stage.id][unit]||0);
   if(qi>=10){qi=0;score=0}
 }
 enemyIcon.textContent=stage.enemy;
 enemyName.textContent=stage.enemyName;
 page('quizPage');
 renderQ();
}
function renderQ(){answered=false;let q=quiz[qi];quizCount.textContent=`${qi+1}/10`;quizBar.style.width=qi*10+'%';levelTag.textContent=QUESTION_BANK[stage.main].includes(q)?stage.main:stage.support;question.textContent=q.q;options.innerHTML='';q.opts.forEach((o,i)=>{let b=document.createElement('button');b.className='option';b.innerHTML=`<b>${String.fromCharCode(65+i)}.</b> ${o}`;b.onclick=()=>answer(i);options.appendChild(b)});feedback.className='feedback hide';nextBtn.classList.add('hide')}
function answer(i){
 if(answered)return;
 answered=true;
 const q=quiz[qi];
 const ok=i===q.ans;
 const gainedExp=ok?10:2;
 st.totalAnswered=(st.totalAnswered||0)+1;
 if(ok){
   score++;
   st.totalCorrect=(st.totalCorrect||0)+1;
   addExp(10);
 }else{
   addExp(2);
 }
 [...options.children].forEach((b,j)=>{
   b.disabled=true;
   if(j===q.ans)b.classList.add('good');
   if(j===i&&!ok)b.classList.add('bad');
 });
 feedback.className='feedback '+(ok?'good':'bad');
 feedback.innerHTML=`<b>${ok?'✅ 答對了！':'❌ 再記一次'}</b><br>${q.exp}`;
 nextBtn.classList.remove('hide');
 ensureProgress();
 if(!replayMode){
   st.unitProgress[stage.id][unit]=qi+1;
   st.unitScores[stage.id][unit]=score;
 }
 save();
 header();
 playSound(ok?'correct':'wrong');
 animateFeedback(ok);
 updateSaveStatus('saved');
}
function nextQuestion(){qi++;if(qi>=10)finish();else renderQ()}
function finish(){
 ensureProgress();
 const d=doneSet(stage.id);
 const first=!d.has(unit);
 if(first){
   d.add(unit);
   st.completed[stage.id]=[...d];
   st.coins++;
   addExp(30);
 }
 st.unitProgress[stage.id][unit]=10;
 st.unitScores[stage.id][unit]=score;
 replayMode=false;
 const pct=score*10;
 st.lastScores[stage.id]=pct;
 save();
 resultTitle.textContent=`${stage.name}・單元 ${unit+1} 完成！`;
 document.getElementById('score').textContent=pct;
 resultMsg.textContent=first?'完成新單元，獲得 1 枚金幣！':'本單元已領過金幣，本次為複習挑戰。';
 coinReward.textContent=first?'+1':'已領取';
 expReward.textContent=`+${score*10+(10-score)*2+(first?30:0)} EXP`;
 stars.textContent=pct===100?'★★★★★':pct>=90?'★★★★':pct>=80?'★★★':pct>=60?'★★':'★';
 header();
 page('resultPage');
 if(isDone(stage))setTimeout(()=>toast('🏅 恭喜獲得「'+stage.badgeName+'」！'),400);
}
function backToStage(){openStage(stage)}
function quitQuiz(){openStage(stage)}
function showHall(){hall.innerHTML='';S.forEach(s=>{let e=isDone(s),d=document.createElement('div');d.className='badge'+(e?' earned':'');d.innerHTML=`<div class="medal">${s.badge}</div><h3>${s.badgeName}</h3><p>${e?'已獲得':'尚未獲得'}</p>`;hall.appendChild(d)});legend.classList.toggle('locked',!S.every(isDone));page('hallPage')}
function showBase(){renderBase();page('basePage')}
function renderBase(){
  baseCoins.textContent=st.coins;baseScene.innerHTML='';
  if(!st.owned.length){baseScene.innerHTML='<div class="base-empty">基地目前還很空曠，完成單元賺取金幣，開始第一項建設吧！</div>'}
  else st.owned.forEach(id=>{let it=ITEMS.find(x=>x.id===id),s=document.createElement('span');s.textContent=it.icon;s.title=it.name;baseScene.appendChild(s)});
  shop.innerHTML='';ITEMS.forEach(it=>{let owned=st.owned.includes(it.id),d=document.createElement('div');d.className='shop-item'+(owned?' owned':'');d.innerHTML=`<div class="shop-icon">${it.icon}</div><h4>${it.name}</h4><p>${it.desc}</p><button ${owned?'disabled':''} onclick="buyItem('${it.id}')">${owned?'已完成建設':'🪙 '+it.cost+' 建設'}</button>`;shop.appendChild(d)})
}
function buyItem(id){let it=ITEMS.find(x=>x.id===id);if(st.owned.includes(id))return;if(st.coins<it.cost){toast('金幣不足，完成更多單元再回來建設吧！');return}st.coins-=it.cost;st.owned.push(id);save();header();renderBase();toast('✨ 已完成「'+it.name+'」建設！')}

function showProfile(){
  ensureProfile();
  renderProfile();
  page('profilePage');
}
function saveProfileName(){
  const value=(profileNameInput.value||'').trim();
  if(!value){toast('請輸入玩家名稱');return}
  st.name=value.slice(0,12);
  save();
  header();
  renderProfile();
  toast('✅ 玩家名稱已更新');
}
function chooseAvatar(id){
  const a=avatarById(id);
  if(!isAvatarUnlocked(a)){toast(`🔒 Lv.${a.level} 才能解鎖「${a.name}」`);return}
  st.avatar=id;
  save();
  header();
  renderProfile();
  toast(`已換成「${a.name}」`);
}
function chooseFrame(id){
  const f=frameById(id);
  if(!isFrameUnlocked(f)){toast(`🔒 Lv.${f.level} 才能解鎖「${f.name}」`);return}
  st.frame=id;
  save();
  header();
  renderProfile();
  toast(`已套用「${f.name}」`);
}
function totalCompletedUnits(){
  return S.reduce((n,s)=>n+doneSet(s.id).size,0);
}
function totalProgressQuestions(){
  return S.reduce((n,s)=>n+getStageQuestionProgress(s.id),0);
}
function renderProfile(){
  ensureProfile();
  const lv=currentLevel();
  const av=avatarById(st.avatar);
  const fr=frameById(st.frame);
  profileNameInput.value=st.name||'沄芯';
  profileDisplayName.textContent=st.name||'沄芯';
  profileTitleText.textContent=titleForLevel(lv);
  profileLevel.textContent=`Lv.${lv}`;
  profileExpText.textContent=lv>=MAX_LEVEL?'已達最高等級':`${expInLevel()} / 100 EXP`;
  profileExpBar.style.width=(lv>=MAX_LEVEL?100:expInLevel())+'%';
  profileAvatarPreview.textContent=av.icon;
  profileAvatarPreview.className=`profile-avatar frame-${fr.id}`;
  const accuracy=st.totalAnswered?Math.round(st.totalCorrect/st.totalAnswered*100):0;
  profileSummary.innerHTML=`
    <div><span>⭐</span><small>目前等級</small><b>Lv.${lv}</b></div>
    <div><span>🧠</span><small>累積答對</small><b>${st.totalCorrect||0} 題</b></div>
    <div><span>🎯</span><small>答題正確率</small><b>${accuracy}%</b></div>
    <div><span>🧭</span><small>完成單元</small><b>${totalCompletedUnits()}/20</b></div>
    <div><span>📚</span><small>冒險進度</small><b>${totalProgressQuestions()}/200</b></div>
    <div><span>📅</span><small>遊戲天數</small><b>${st.playDays||0} 天</b></div>`;
  profileAvatars.innerHTML='';
  AVATARS.forEach(a=>{
    const unlocked=isAvatarUnlocked(a);
    const b=document.createElement('button');
    b.type='button';
    b.className='avatar-choice'+(st.avatar===a.id?' selected':'')+(unlocked?'':' locked')+(a.kinmen?' kinmen-avatar':'');
    b.innerHTML=`<span>${a.icon}</span><b>${a.name}</b><small>${unlocked?'已解鎖':`Lv.${a.level} 解鎖`}</small>`;
    b.onclick=()=>chooseAvatar(a.id);
    profileAvatars.appendChild(b);
  });
  frameChoices.innerHTML='';
  FRAMES.forEach(f=>{
    const unlocked=isFrameUnlocked(f);
    const b=document.createElement('button');
    b.type='button';
    b.className='frame-choice'+(st.frame===f.id?' selected':'')+(unlocked?'':' locked');
    b.innerHTML=`<span class="frame-demo frame-${f.id}">${av.icon}</span><b>${f.name}</b><small>${unlocked?'已解鎖':`Lv.${f.level} 解鎖`}</small>`;
    b.onclick=()=>chooseFrame(f.id);
    frameChoices.appendChild(b);
  });
}

function toast(m){let t=document.getElementById('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
ensureProgress();ensureProfile();if(typeof st.soundEnabled!=='boolean')st.soundEnabled=true;selectedLoginAvatar=st.avatar||'fox';renderLoginAvatars();save();nameInput.value=st.name;if(st.loggedIn){dailyLogin();enterGame()}
