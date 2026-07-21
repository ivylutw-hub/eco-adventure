
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
const KEY='ecoAdventureV81';
const LEGACY_KEYS=['ecoAdventureV80','ecoAdventureV70','ecoAdventureV60','ecoAdventureV57'];
function unitCount(stageId){return (UNIT_SETS[stageId]||[]).length}
let st=load(), stage,unit,quiz=[],qi=0,score=0,answered=false,replayMode=false,selectedLoginAvatar='fox',selectedAnswer=null,weaknessFilter='all',weaknessQuizNote=null,weaknessSelectedAnswer=null;
function defaultState(){return{loggedIn:false,name:'沄芯',coins:0,last:'',streak:0,completed:{},lastScores:{},owned:[],savedAt:'',unitProgress:{},unitScores:{},avatar:'fox',frame:'none',exp:0,totalCorrect:0,totalAnswered:0,playDays:0,lastPlayDate:'',soundEnabled:true,wrongNotes:{},coinAwarded:{},mainExpAwarded:{},weaknessExpAwarded:{},weaknessCoinAwarded:{}}}
function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){
      for(const oldKey of LEGACY_KEYS){
        raw=localStorage.getItem(oldKey);
        if(raw)break;
      }
    }
    return {...defaultState(),...JSON.parse(raw||'{}')};
  }catch{return defaultState()}
}
function save(){
  try{
    st.savedAt=new Date().toISOString();
    localStorage.setItem(KEY,JSON.stringify(st));
    updateSaveStatus('saved');
    if(typeof scheduleCloudSave==='function')scheduleCloudSave();
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
    version:'8.1',
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
  if(!st.wrongNotes||typeof st.wrongNotes!=='object')st.wrongNotes={};
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
function isDone(s){return doneSet(s.id).size>=unitCount(s.id)}
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
  for(let i=0;i<unitCount(stageId);i++) total+=getUnitAnswered(stageId,i);
  return total;
}
function stagePercent(stageId){
  const total=unitCount(stageId)*10;return total?Math.round(getStageQuestionProgress(stageId)/total*100):0;
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
 updateWeaknessBadge();
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
     <p>${s.support?s.main+' 8 題＋'+s.support+' 2 題／每單元':s.main+' 10 題／每單元'}・共 ${unitCount(s.id)} 單元</p>
     <div class="node-progress-box">
       <div class="node-progress-title">
         <span>關卡總進度</span>
         <strong>${percent}%</strong>
       </div>
       <div class="node-progress-bar">
         <span style="width:${percent}%"></span>
       </div>
       <div class="node-progress-detail">
         <div><small>已完成單元</small><b>${completedCount} / ${unitCount(s.id)}</b></div>
         <div><small>已完成題數</small><b>${answered} / ${unitCount(s.id)*10}</b></div>
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
function page(id){
 ['mapPage','stagePage','quizPage','resultPage','basePage','hallPage','leaderboardPage','profilePage','weaknessPage']
   .forEach(x=>document.getElementById(x).classList.add('hide'));
 document.getElementById(id).classList.remove('hide');
 document.body.classList.toggle('quiz-mode',id==='quizPage');
 document.body.classList.toggle('result-mode',id==='resultPage');
 requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'auto'}));
}
function showMap(){renderMap();header();page('mapPage')}
function openStage(s){
 if(!s||!s.id){s=S.find(x=>x.id===(st.lastStageId||"s1"))||S[0];}
 stage=s;
 st.lastStageId=s.id;
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
 stageProgress.textContent=`${answered}/${unitCount(s.id)*10} 題（${percent}%）｜完成 ${completedCount}/${unitCount(s.id)} 單元`;
 stageBar.style.width=percent+'%';
 units.innerHTML='';
 for(let i=0;i<unitCount(s.id);i++){
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
function fixedUnitQuestions(s,unitIndex){
  return (UNIT_SETS[s.id]&&UNIT_SETS[s.id][unitIndex])?UNIT_SETS[s.id][unitIndex].slice():[];
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
   if(qi>=quiz.length){qi=0;score=0}
 }
 enemyIcon.textContent=stage.enemy;
 enemyName.textContent=stage.enemyName;
 page('quizPage');
 renderQ();
}
function renderQ(){
 answered=false;
 selectedAnswer=null;
 const q=quiz[qi];
 quizCount.textContent=`${qi+1}/${quiz.length}`;
 quizBar.style.width=(qi/quiz.length*100)+'%';
 levelTag.textContent=q.level||stage.main;
 question.textContent=q.q;
 options.innerHTML='';
 q.opts.forEach((o,i)=>{
   const b=document.createElement('button');
   b.className='option';
   b.innerHTML=`<b>${String.fromCharCode(65+i)}.</b> ${o}`;
   b.onclick=()=>selectAnswer(i);
   options.appendChild(b);
 });
 feedback.className='feedback hide';
 feedback.innerHTML='';
 nextBtn.classList.add('hide');
 answerActions.classList.remove('hide');
 resetAnswerBtn.disabled=true;
 submitAnswerBtn.disabled=true;
}
function selectAnswer(i){
 if(answered)return;
 selectedAnswer=i;
 [...options.children].forEach((b,j)=>{
   b.classList.toggle('selected',j===i);
   b.setAttribute('aria-pressed',String(j===i));
 });
 resetAnswerBtn.disabled=false;
 submitAnswerBtn.disabled=false;
 playSound('click');
}
function resetSelectedAnswer(){
 if(answered)return;
 selectedAnswer=null;
 [...options.children].forEach(b=>{
   b.classList.remove('selected');
   b.setAttribute('aria-pressed','false');
 });
 resetAnswerBtn.disabled=true;
 submitAnswerBtn.disabled=true;
}
function questionNoteKey(q){return `${stage.id}|${q.id}`}
function recordWrongNote(q){
 const key=questionNoteKey(q),previous=st.wrongNotes[key]||{};
 st.wrongNotes[key]={
   key,stageId:stage.id,stageName:stage.name,unit:unit+1,level:levelTag.textContent,
   question:q.q,explanation:q.exp,options:q.opts,answer:q.ans,attempts:(previous.attempts||0)+1,
   firstWrongAt:previous.firstWrongAt||new Date().toISOString(),
   lastWrongAt:new Date().toISOString(),mastered:false,masteredAt:null
 };
}
function markWeaknessMastered(q){
 const key=questionNoteKey(q);
 if(st.wrongNotes[key]&&!st.wrongNotes[key].mastered){
   st.wrongNotes[key].mastered=true;
   st.wrongNotes[key].masteredAt=new Date().toISOString();
 }
}
function submitSelectedAnswer(){
 if(answered||selectedAnswer===null){toast('請先選擇一個答案');return}
 answered=true;
 const q=quiz[qi],i=selectedAnswer,ok=i===q.ans;
 st.totalAnswered=(st.totalAnswered||0)+1;
 let expGained=0;
 if(ok){
   score++;
   st.totalCorrect=(st.totalCorrect||0)+1;
   if(!st.mainExpAwarded||typeof st.mainExpAwarded!=='object')st.mainExpAwarded={};
   const expKey=`${stage.id}|${q.id}`;
   if(!st.mainExpAwarded[expKey]){
     addExp(10);
     st.mainExpAwarded[expKey]=true;
     expGained=10;
     addWeeklyQuestionPoints(10);
   }
   markWeaknessMastered(q);
 }else{
   recordWrongNote(q);
 }
 [...options.children].forEach((b,j)=>{
   b.disabled=true;
   b.classList.remove('selected');
   if(ok&&j===i)b.classList.add('good');
   if(!ok&&j===i)b.classList.add('bad');
 });
 feedback.className='feedback '+(ok?'good':'bad');
 feedback.innerHTML=ok
   ?`<b>✅ 答對了！</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="exp-gain">${expGained? '✨ +10 EXP':'本題經驗值已領取，不重複計分'}</div>`
   :`<b>🤔 這題已記進「怪獸弱點筆記」</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="feedback-note">不公布答案，也不立即重答；之後可回首頁筆記複習。</div><div class="exp-gain">本題不獲得經驗值</div>`;
 answerActions.classList.add('hide');
 nextBtn.classList.remove('hide');
 requestAnimationFrame(()=>{
   nextBtn.scrollIntoView({behavior:'smooth',block:'nearest'});
   nextBtn.focus({preventScroll:true});
 });
 ensureProgress();
 if(!replayMode){
   st.unitProgress[stage.id][unit]=Math.min(quiz.length,qi+1);
   st.unitScores[stage.id][unit]=score;
 }
 save();
 header();
 updateWeaknessBadge();
 playSound(ok?'correct':'wrong');
 animateFeedback(ok);
 updateSaveStatus('saved');
}
function nextQuestion(){qi++;if(qi>=quiz.length)finish();else renderQ()}
function finish(){
 ensureProgress();
 const d=doneSet(stage.id);
 const first=!d.has(unit);
 const perfect=score===quiz.length;
 if(!st.coinAwarded||typeof st.coinAwarded!=='object')st.coinAwarded={};
 const coinKey=`${stage.id}|${unit}`;
 const firstPerfect=perfect&&!st.coinAwarded[coinKey];
 if(first){
   d.add(unit);
   st.completed[stage.id]=[...d];
 }
 if(firstPerfect){st.coins=(st.coins||0)+2;st.coinAwarded[coinKey]=true;}
 st.unitProgress[stage.id][unit]=10;
 st.unitScores[stage.id][unit]=score;
 replayMode=false;
 const pct=Math.round(score/quiz.length*100);
 st.lastScores[stage.id]=pct;
 save();
 resultTitle.textContent=`${stage.name}・單元 ${unit+1} 完成！`;
 document.getElementById('score').textContent=pct;
 resultMsg.textContent=perfect
   ?(firstPerfect?'本次 10 題全部答對，獲得 2 枚金幣！':'本單元滿分獎勵已領取，不重複獲得金幣。')
   :(first?'首次完成單元，但本次未全對，因此不獲得金幣。':'本次未全對，因此不獲得金幣。');
 coinReward.textContent=firstPerfect?'+2':(perfect?'已領取':'未獲得');
 const unitQuestionIds=new Set(quiz.map(x=>`${stage.id}|${x.id}`));
 const earnedExp=[...unitQuestionIds].filter(k=>st.mainExpAwarded&&st.mainExpAwarded[k]).length*10;
 expReward.textContent=`本單元累計 ${earnedExp} EXP`;
 stars.textContent=pct===100?'★★★★★':pct>=90?'★★★★':pct>=80?'★★★':pct>=60?'★★':'★';
 header();
 page('resultPage');
 if(isDone(stage))setTimeout(()=>toast('🏅 恭喜獲得「'+stage.badgeName+'」！'),400);
}
function backToStage(event){
 if(event){event.preventDefault();event.stopPropagation();}
 const target=(stage&&stage.id)?stage:(S.find(x=>x.id===st.lastStageId)||S[0]);
 openStage(target);
 return false;
}
function quitQuiz(){backToStage()}
function showHall(){hall.innerHTML='';S.forEach(s=>{let e=isDone(s),d=document.createElement('div');d.className='badge'+(e?' earned':'');d.innerHTML=`<div class="medal">${s.badge}</div><h3>${s.badgeName}</h3><p>${e?'已獲得':'尚未獲得'}</p>`;hall.appendChild(d)});legend.classList.toggle('locked',!S.every(isDone));page('hallPage')}
function showBase(){renderBase();page('basePage')}
function renderBase(){
  baseCoins.textContent=st.coins;baseScene.innerHTML='';
  if(!st.owned.length){baseScene.innerHTML='<div class="base-empty">基地目前還很空曠，完成單元賺取金幣，開始第一項建設吧！</div>'}
  else st.owned.forEach(id=>{let it=ITEMS.find(x=>x.id===id),s=document.createElement('span');s.textContent=it.icon;s.title=it.name;baseScene.appendChild(s)});
  shop.innerHTML='';ITEMS.forEach(it=>{let owned=st.owned.includes(it.id),d=document.createElement('div');d.className='shop-item'+(owned?' owned':'');d.innerHTML=`<div class="shop-icon">${it.icon}</div><h4>${it.name}</h4><p>${it.desc}</p><button ${owned?'disabled':''} onclick="buyItem('${it.id}')">${owned?'已完成建設':'🪙 '+it.cost+' 建設'}</button>`;shop.appendChild(d)})
}
function buyItem(id){let it=ITEMS.find(x=>x.id===id);if(st.owned.includes(id))return;if(st.coins<it.cost){toast('金幣不足，完成更多單元再回來建設吧！');return}st.coins-=it.cost;st.owned.push(id);save();header();renderBase();toast('✨ 已完成「'+it.name+'」建設！')}



function monsterInfoFor(note){
  const text=`${note.question||''} ${note.explanation||''}`;
  const catalog=[
    {keys:['塑膠','一次性','塑膠袋','吸管'],emoji:'🛍️',name:'塑膠怪',weakness:'減少一次性塑膠用品'},
    {keys:['空氣','廢氣','汽車','排放','PM2.5'],emoji:'🚗',name:'廢氣龍',weakness:'低碳交通與減少排放'},
    {keys:['水資源','省水','節水','用水','雨水'],emoji:'💧',name:'水滴精',weakness:'珍惜並循環利用水資源'},
    {keys:['電力','能源','省電','耗電','待機'],emoji:'⚡',name:'浪費獸',weakness:'節約能源與提升效率'},
    {keys:['森林','樹木','砍伐','植樹'],emoji:'🌳',name:'砍伐魔',weakness:'保護森林與增加綠地'},
    {keys:['海洋','海龜','海灘','海廢'],emoji:'🐢',name:'海廢魔龜',weakness:'減少海洋垃圾與污染'},
    {keys:['生物多樣性','棲地','物種','野生動物'],emoji:'🦉',name:'生態魔',weakness:'保護棲地與生物多樣性'},
    {keys:['垃圾','回收','分類','廢棄物'],emoji:'♻️',name:'垃圾巨獸',weakness:'正確分類、減量與再利用'},
    {keys:['食物','剩食','餐食','廚餘'],emoji:'🍽️',name:'剩食怪',weakness:'珍惜食物並減少浪費'},
    {keys:['碳','氣候','溫室','暖化'],emoji:'🌍',name:'暖化魔王',weakness:'減碳生活與氣候行動'}
  ];
  return catalog.find(m=>m.keys.some(k=>text.includes(k)))||
    {emoji:'👾',name:'環境迷霧怪',weakness:'運用環保知識破解弱點'};
}
function ensureMonsterInfo(note){
  const info=monsterInfoFor(note);
  if(!note.monsterName)note.monsterName=info.name;
  if(!note.monsterEmoji)note.monsterEmoji=info.emoji;
  if(!note.monsterWeakness)note.monsterWeakness=info.weakness;
  return note;
}

function weaknessEntries(){
 return Object.values(st.wrongNotes||{}).map(ensureMonsterInfo).sort((a,b)=>{
   if(Boolean(a.mastered)!==Boolean(b.mastered))return a.mastered?1:-1;
   return new Date(b.lastWrongAt||b.firstWrongAt)-new Date(a.lastWrongAt||a.firstWrongAt);
 });
}
function updateWeaknessBadge(){
 const pending=weaknessEntries().filter(x=>!x.mastered).length;
 const el=document.getElementById('weaknessCount');
 if(el){el.textContent=pending;el.classList.toggle('zero',pending===0)}
}
function showWeaknessBook(){ensureProfile();renderWeaknessBook();page('weaknessPage')}
function setWeaknessFilter(filter){weaknessFilter=filter;renderWeaknessBook()}
function formatNoteDate(value){
 if(!value)return '—';
 return new Date(value).toLocaleDateString('zh-TW',{year:'numeric',month:'numeric',day:'numeric'});
}
function openWeaknessCategory(filter){
 weaknessFilter=filter;
 if(typeof showWeaknessBook==='function')showWeaknessBook();
 else{
   document.querySelectorAll('main').forEach(p=>p.classList.add('hide'));
   weaknessPage.classList.remove('hide');
 }
 renderWeaknessBook();
 const names={pending:'待破解怪獸',mastered:'已淨化怪獸',all:'全部圖鑑收錄'};
 toast(`已開啟：${names[filter]||'怪獸圖鑑'}`);
 setTimeout(()=>{
   const tools=document.querySelector('.weakness-tools');
   if(tools)tools.scrollIntoView({behavior:'smooth',block:'start'});
 },100);
}
function renderWeaknessBook(){
 const entries=weaknessEntries();
 const pendingCount=entries.filter(x=>!x.mastered).length;
 const masteredCount=entries.filter(x=>x.mastered).length;
 weaknessPending.textContent=pendingCount;
 weaknessMastered.textContent=masteredCount;
 weaknessTotal.textContent=entries.length;

 const percent=entries.length?Math.round(masteredCount/entries.length*100):0;
 const progressText=document.getElementById('weaknessProgressText');
 const progressBar=document.getElementById('weaknessProgressBar');
 if(progressText)progressText.textContent=`${masteredCount} / ${entries.length}（${percent}%）`;
 if(progressBar)progressBar.style.width=`${percent}%`;

 ['all','pending','mastered'].forEach(f=>{
   const id='weakFilter'+f.charAt(0).toUpperCase()+f.slice(1);
   const el=document.getElementById(id);
   if(el)el.classList.toggle('active',weaknessFilter===f);
 });

 const searchEl=document.getElementById('weaknessSearch');
 const keyword=(searchEl?.value||'').trim().toLowerCase();
 const filtered=entries.filter(note=>{
   const statusOK=weaknessFilter==='all'||(weaknessFilter==='mastered'?note.mastered:!note.mastered);
   if(!statusOK)return false;
   if(!keyword)return true;
   ensureMonsterInfo(note);
   const haystack=[note.monsterName,note.monsterWeakness,note.question,note.explanation,note.stageName,note.level]
     .filter(Boolean).join(' ').toLowerCase();
   return haystack.includes(keyword);
 });

 weaknessList.innerHTML='';
 weaknessList.classList.toggle('monster-gallery',weaknessFilter==='all');

 if(!filtered.length){
   weaknessList.innerHTML=`<div class="weakness-empty"><div>${entries.length?'🔍':'🎉'}</div><h3>${entries.length?'找不到符合條件的怪獸':'怪獸圖鑑目前是空的'}</h3><p>${entries.length?'請切換分類或清除搜尋文字。':'主線中答錯的題目，會化身成怪獸加入這裡。'}</p></div>`;
   return;
 }

 filtered.forEach(note=>{
   ensureMonsterInfo(note);

   // 「圖鑑收錄／全部」只顯示怪獸圖像、名稱與狀態，不顯示題目。
   if(weaknessFilter==='all'){
     const tile=document.createElement('button');
     tile.type='button';
     tile.className='monster-gallery-tile '+(note.mastered?'mastered':'pending');
     tile.setAttribute('aria-label',`${note.monsterName}，${note.mastered?'已淨化':'待破解'}`);
     tile.onclick=()=>openWeaknessCategory(note.mastered?'mastered':'pending');
     tile.innerHTML=`
       <div class="monster-gallery-image ${note.mastered?'purified':''}">${note.monsterEmoji}</div>
       <strong>${note.monsterName}</strong>
       <span>${note.mastered?'✅ 已淨化':'👾 待破解'}</span>`;
     weaknessList.appendChild(tile);
     return;
   }

   const card=document.createElement('article');
   card.className='weakness-card monster-card '+(note.mastered?'mastered':'pending');
   card.innerHTML=`
     <div class="monster-card-top">
       <div class="monster-avatar ${note.mastered?'purified':''}">${note.monsterEmoji}</div>
       <div class="monster-info">
         <div class="weakness-card-head">
           <span class="weakness-status">${note.mastered?'✅ 已淨化':'👾 待破解'}</span>
           <span>${note.stageName}・單元 ${note.unit}</span>
         </div>
         <h3>${note.monsterName}</h3>
         <p class="monster-weakness"><b>弱點線索：</b>${note.monsterWeakness}</p>
       </div>
     </div>
     <div class="weakness-meta">
       <span>${note.level||'環保挑戰'}</span>
       <span>挑戰失敗 ${note.attempts||1} 次</span>
       <span>${formatNoteDate(note.lastWrongAt)}</span>
     </div>
     <div class="monster-question-preview">
       <small>收錄題目</small>
       <p>${note.question}</p>
     </div>
     ${note.mastered
       ?'<p class="mastered-note">這隻怪獸已淨化，仍可再次練習。</p>'
       :'<p class="pending-note">先再次挑戰；只有答錯後才會顯示解析。</p>'}
     <button class="weakness-retry-btn" onclick="startWeaknessQuiz('${note.key.replace(/'/g,"\\\\'")}')">${note.mastered?'🔁 再練一次':'⚔️ 再次挑戰'}</button>`;
   weaknessList.appendChild(card);
 });
 save();
}
function findQuestionForNote(note){
  if(Array.isArray(note.options)&&Number.isInteger(note.answer)){
    return {q:note.question,opts:note.options,ans:note.answer,exp:note.explanation};
  }
  for(const level of Object.keys(QUESTION_BANK)){
    const found=QUESTION_BANK[level].find(q=>q.q===note.question);
    if(found)return found;
  }
  return null;
}
function startWeaknessQuiz(key){
  const note=st.wrongNotes[key];
  if(!note)return;
  const q=findQuestionForNote(note);
  if(!q){toast('找不到這題的題目資料');return}
  weaknessQuizNote={note,q,key};
  weaknessSelectedAnswer=null;
  ensureMonsterInfo(note);
  weaknessQuizMeta.textContent=`${note.monsterEmoji} ${note.monsterName}・${note.stageName}・單元 ${note.unit}`;
  weaknessQuizQuestion.textContent=q.q;
  weaknessQuizOptions.innerHTML='';
  q.opts.forEach((option,index)=>{
    const b=document.createElement('button');
    b.className='option';
    b.innerHTML=`<b>${String.fromCharCode(65+index)}.</b> ${option}`;
    b.onclick=()=>selectWeaknessAnswer(index);
    weaknessQuizOptions.appendChild(b);
  });
  weaknessQuizFeedback.className='feedback hide';
  weaknessQuizFeedback.innerHTML='';
  weaknessQuizActions.classList.remove('hide');
  weaknessDoneBtn.classList.add('hide');
  weaknessResetBtn.disabled=true;
  weaknessSubmitBtn.disabled=true;
  weaknessQuizModal.classList.remove('hide');
  playSound('click');
}
function selectWeaknessAnswer(index){
  if(!weaknessQuizNote)return;
  weaknessSelectedAnswer=index;
  [...weaknessQuizOptions.children].forEach((b,i)=>{
    b.classList.toggle('selected',i===index);
    b.setAttribute('aria-pressed',String(i===index));
  });
  weaknessResetBtn.disabled=false;
  weaknessSubmitBtn.disabled=false;
  playSound('click');
}
function resetWeaknessAnswer(){
  weaknessSelectedAnswer=null;
  [...weaknessQuizOptions.children].forEach(b=>{
    b.classList.remove('selected');
    b.setAttribute('aria-pressed','false');
  });
  weaknessResetBtn.disabled=true;
  weaknessSubmitBtn.disabled=true;
}
function weaknessUnitKey(note){return `${note.stageId}|${note.unit}`}
function weaknessNotesForUnit(note){
  return weaknessEntries().filter(x=>x.stageId===note.stageId&&Number(x.unit)===Number(note.unit));
}
function tryAwardWeaknessUnitCoin(note){
  if(!st.weaknessCoinAwarded||typeof st.weaknessCoinAwarded!=='object')st.weaknessCoinAwarded={};
  const key=weaknessUnitKey(note);
  const notes=weaknessNotesForUnit(note);
  if(notes.length&&notes.every(x=>x.mastered)&&!st.weaknessCoinAwarded[key]){
    st.weaknessCoinAwarded[key]=true;
    st.coins=(st.coins||0)+1;
    return 1;
  }
  return 0;
}
function submitWeaknessAnswer(){
  if(!weaknessQuizNote||weaknessSelectedAnswer===null){
    toast('請先選擇一個答案');
    return;
  }
  const {note,q,key}=weaknessQuizNote;
  const ok=weaknessSelectedAnswer===q.ans;
  st.totalAnswered=(st.totalAnswered||0)+1;
  [...weaknessQuizOptions.children].forEach((b,i)=>{
    b.disabled=true;
    b.classList.remove('selected');
    if(ok&&i===weaknessSelectedAnswer)b.classList.add('good');
    if(!ok&&i===weaknessSelectedAnswer)b.classList.add('bad');
  });
  if(ok){
    st.totalCorrect=(st.totalCorrect||0)+1;
    if(!st.weaknessExpAwarded||typeof st.weaknessExpAwarded!=='object')st.weaknessExpAwarded={};
    const wasMastered=Boolean(note.mastered);
    let weaknessExp=0;
    if(!st.weaknessExpAwarded[key]){
      addExp(5);
      st.weaknessExpAwarded[key]=true;
      weaknessExp=5;
      addWeeklyQuestionPoints(5);
    }
    note.mastered=true;
    note.masteredAt=note.masteredAt||new Date().toISOString();
    const weaknessCoin=tryAwardWeaknessUnitCoin(note);
    weaknessQuizFeedback.className='feedback good';
    weaknessQuizFeedback.innerHTML=`<b>✅ 成功淨化怪獸！</b><br><div class="monster-cleared">🌟 已掌握這個環保弱點</div><div class="exp-gain">${weaknessExp?'✨ +5 EXP':'本題經驗值已領取，不重複計分'}</div>${weaknessCoin?'<div class="coin-gain">🪙 本單元怪獸全部淨化，+1 枚金幣</div>':''}<div class="feedback-note">${wasMastered?'這隻怪獸先前已淨化，本次不重複計分。':'圖鑑狀態已更新為「已淨化」。'}</div>`;
  }else{
    note.attempts=(note.attempts||0)+1;
    note.lastWrongAt=new Date().toISOString();
    note.mastered=false;
    note.masteredAt=null;
    weaknessQuizFeedback.className='feedback bad';
    weaknessQuizFeedback.innerHTML=`<b>🤔 還沒有破解成功</b><br><span class="feedback-label">怪獸弱點解析</span><br>${q.exp}<div class="feedback-note">仍不公布正確答案。閱讀解析後，之後再回來挑戰。</div><div class="exp-gain">本次不獲得經驗值與金幣</div>`;
  }
  weaknessQuizActions.classList.add('hide');
  weaknessDoneBtn.classList.remove('hide');
  save();
  header();
  updateWeaknessBadge();
  playSound(ok?'correct':'wrong');
  animateFeedback(ok);
}
function closeWeaknessQuiz(){
  weaknessQuizModal.classList.add('hide');
  weaknessQuizNote=null;
  weaknessSelectedAnswer=null;
  if(!weaknessPage.classList.contains('hide'))renderWeaknessBook();
}

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
    <div><span>🧭</span><small>完成單元</small><b>${totalCompletedUnits()}/${S.reduce((n,x)=>n+unitCount(x.id),0)}</b></div>
    <div><span>📚</span><small>冒險進度</small><b>${totalProgressQuestions()}/${S.reduce((n,x)=>n+unitCount(x.id)*10,0)}</b></div>
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
ensureProgress();ensureProfile();if(typeof st.soundEnabled!=='boolean')st.soundEnabled=true;selectedLoginAvatar=st.avatar||'fox';renderLoginAvatars();updateWeaknessBadge();save();nameInput.value=st.name;if(st.loggedIn){dailyLogin();enterGame()}

/* ===== v8.2 Google 登入、雲端存檔與每週排行榜（題目積分版） ===== */
let cloudDb=null, cloudAuth=null, cloudUser=null, cloudReady=false, cloudSaveTimer=null, cloudLoading=false;
function currentWeekId(date=new Date()){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const day=d.getUTCDay()||7; d.setUTCDate(d.getUTCDate()+4-day);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  const week=Math.ceil((((d-yearStart)/86400000)+1)/7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2,'0')}`;
}
function weekDateRange(date=new Date()){
  const d=new Date(date),day=d.getDay()||7; d.setDate(d.getDate()-day+1);d.setHours(0,0,0,0);
  const end=new Date(d);end.setDate(end.getDate()+6);const f=x=>`${x.getMonth()+1}/${x.getDate()}`;return `${f(d)}－${f(end)}`;
}
function ensureWeeklyLocal(){
 const id=currentWeekId(),ruleVersion='v8.2-question-exp';
 if(!st.weekly||st.weekly.weekId!==id||st.weekly.ruleVersion!==ruleVersion){
   st.weekly={weekId:id,ruleVersion,points:0,completedKeys:[],perfectKeys:[]};
 }
 st.weekly.completedKeys=Array.isArray(st.weekly.completedKeys)?st.weekly.completedKeys:[];
 st.weekly.perfectKeys=Array.isArray(st.weekly.perfectKeys)?st.weekly.perfectKeys:[];
 return st.weekly;
}
function firebaseConfigured(){const c=window.ECO_FIREBASE_CONFIG||{};return Boolean(c.apiKey&&c.projectId&&c.appId)}
function loginMessage(text){const el=document.getElementById('loginCloudStatus');if(el)el.textContent=text}
function setGoogleButton(disabled,text){const b=document.getElementById('googleLoginBtn');if(b){b.disabled=disabled;if(text)b.textContent=text}}
async function initFirebase(){
 if(!firebaseConfigured()||typeof firebase==='undefined'){loginMessage('Firebase 尚未設定，無法使用 Google 登入。');return;}
 try{
  if(!firebase.apps.length)firebase.initializeApp(window.ECO_FIREBASE_CONFIG);
  cloudAuth=firebase.auth();cloudDb=firebase.firestore();
  await cloudAuth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
  await cloudAuth.getRedirectResult().catch(()=>null);
  cloudAuth.onAuthStateChanged(async user=>{
   cloudUser=user||null;cloudReady=Boolean(user);
   if(user){setGoogleButton(true,'☁️ 正在載入雲端進度…');await loadCloudPlayer();}
   else{setGoogleButton(false,'🟢 使用 Google 開始冒險');loginMessage('使用同一個 Google 帳號，可在不同設備接續進度。');}
  });
 }catch(err){console.error(err);loginMessage('Firebase 初始化失敗，請檢查設定。');setGoogleButton(false,'重新嘗試 Google 登入');}
}
async function googleLogin(){
 if(!cloudAuth){await initFirebase();if(!cloudAuth)return;}
 setGoogleButton(true,'正在開啟 Google 登入…');
 const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 try{await cloudAuth.signInWithPopup(provider)}catch(err){
  if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(err.code)){
   await cloudAuth.signInWithRedirect(provider);return;
  }
  console.error(err);loginMessage(err.code==='auth/unauthorized-domain'?'此 GitHub 網域尚未加入 Firebase 授權網域。':'Google 登入未完成，請再試一次。');setGoogleButton(false,'🟢 使用 Google 開始冒險');
 }
}
function playerDoc(){return cloudDb.collection('players').doc(cloudUser.uid)}
function weeklyDoc(){return cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').doc(cloudUser.uid)}
async function loadCloudPlayer(){
 if(!cloudReady||cloudLoading)return;cloudLoading=true;
 try{
  const snap=await playerDoc().get();
  if(snap.exists&&snap.data().state){
   const remote={...defaultState(),...snap.data().state};
   const localSameUser=st.cloudUid===cloudUser.uid;
   const localTime=Date.parse(st.savedAt||0)||0;
   const remoteTime=Date.parse(remote.savedAt||0)||0;
   // 同一帳號且本機紀錄較新時，保留本機；否則以雲端為準，避免不同帳號資料混在一起。
   st=(localSameUser&&localTime>remoteTime)?{...defaultState(),...st}:{...defaultState(),...remote};
   st.loggedIn=true;st.cloudUid=cloudUser.uid;
   if(localSameUser&&localTime>remoteTime)await saveCloudNow();
  }else{
   st.loggedIn=true;st.cloudUid=cloudUser.uid;
   if(!st.name||st.name==='沄芯')st.name=(cloudUser.displayName||'環保守護者').slice(0,12);
   await saveCloudNow();
  }
  ensureProgress();ensureProfile();ensureWeeklyLocal();selectedLoginAvatar=st.avatar||'fox';nameInput.value=st.name;
  dailyLogin();save();enterGame();await syncWeeklyProfile();
  loginMessage(`已登入：${cloudUser.displayName||'Google 使用者'}`);setGoogleButton(false,'✅ 已登入');
 }catch(err){console.error('載入雲端存檔失敗',err);loginMessage('雲端存檔載入失敗，請重新整理後再試。');setGoogleButton(false,'重新嘗試 Google 登入');}
 finally{cloudLoading=false}
}
function scheduleCloudSave(){
 if(!cloudReady||cloudLoading||!st.loggedIn)return;clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(saveCloudNow,700);
}
async function saveCloudNow(){
 if(!cloudReady||!cloudDb||!cloudUser||!st.loggedIn)return;
 try{await playerDoc().set({uid:cloudUser.uid,displayName:cloudUser.displayName||'',state:st,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
 catch(err){console.error('雲端存檔失敗',err);setCloudStatus('offline','⚠️ 雲端存檔失敗，資料仍保留在本機。')}
}
function setCloudStatus(mode,text){const el=document.getElementById('cloudStatus');if(el){el.className='cloud-status '+mode;el.textContent=text}}
async function syncWeeklyProfile(){
 if(!cloudReady||!st.loggedIn)return;const w=ensureWeeklyLocal(),av=avatarById(st.avatar);
 try{await weeklyDoc().set({uid:cloudUser.uid,name:(st.name||'環保守護者').slice(0,12),avatar:av.icon,level:currentLevel(),points:Number(w.points)||0,completedUnits:w.completedKeys.length,perfectUnits:w.perfectKeys.length,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});}
 catch(err){console.error('同步排行榜失敗',err)}
}
async function addWeeklyQuestionPoints(amount){
 const add=Number(amount)||0;if(add<=0)return;
 const w=ensureWeeklyLocal();w.points=(Number(w.points)||0)+add;save();
 await syncWeeklyProfile();
}
async function recordWeeklyUnitProgress(stageId,unitIndex,first,firstPerfect){
 const w=ensureWeeklyLocal(),key=`${stageId}|${unitIndex}`;let changed=false;
 if(first&&!w.completedKeys.includes(key)){w.completedKeys.push(key);changed=true;}
 if(firstPerfect&&!w.perfectKeys.includes(key)){w.perfectKeys.push(key);changed=true;}
 if(changed){save();await syncWeeklyProfile();}
}
async function refreshLeaderboard(){
 ensureWeeklyLocal();const label=document.getElementById('weekLabel'),pts=document.getElementById('myWeeklyPoints'),rank=document.getElementById('myWeeklyRank'),list=document.getElementById('leaderboardList');
 if(label)label.textContent=`${currentWeekId()}（${weekDateRange()}）`;if(pts)pts.textContent=st.weekly.points||0;if(!list)return;
 if(!cloudReady){if(rank)rank.textContent='—';list.innerHTML='<div class="empty-ranking">請先使用 Google 登入，才能查看共同排行榜。</div>';setCloudStatus('offline','☁️ 尚未登入 Google');return}
 try{
  await syncWeeklyProfile();const snap=await cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').orderBy('points','desc').limit(100).get();
  const rows=snap.docs.map(d=>d.data());if(!rows.length){list.innerHTML='<div class="empty-ranking">本週還沒有排名紀錄。</div>';return}
  const myIndex=rows.findIndex(x=>x.uid===cloudUser.uid);if(rank)rank.textContent=myIndex>=0?`第 ${myIndex+1} 名`:'100 名以外';list.innerHTML='';
  rows.forEach((x,i)=>{const row=document.createElement('div');row.className='rank-row'+(x.uid===cloudUser.uid?' me':'');const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);row.innerHTML=`<div class="rank-no">${medal}</div><div class="rank-player"><span class="rank-avatar">${x.avatar||'🌱'}</span><div><b>${escapeRankText(x.name||'環保守護者')}</b><small>Lv.${Number(x.level)||1}・完成 ${Number(x.completedUnits)||0} 單元</small></div></div><div class="rank-points"><b>${Number(x.points)||0}</b><small>本週積分</small></div>`;list.appendChild(row)});setCloudStatus('online','☁️ 排行榜已更新');
 }catch(err){console.error(err);list.innerHTML='<div class="empty-ranking">排行榜讀取失敗，請稍後再試。</div>';setCloudStatus('offline','⚠️ 排行榜讀取失敗')}
}
function escapeRankText(v){const d=document.createElement('div');d.textContent=String(v);return d.innerHTML}
function showLeaderboard(){page('leaderboardPage');refreshLeaderboard()}
const _v80finish=finish;finish=function(){ensureProgress();const wasFirst=!doneSet(stage.id).has(unit),wasFirstPerfect=score===quiz.length&&!((st.coinAwarded||{})[`${stage.id}|${unit}`]),sid=stage.id,ui=unit;_v80finish();recordWeeklyUnitProgress(sid,ui,wasFirst,wasFirstPerfect)};
const _v80profile=saveProfileName;saveProfileName=function(){_v80profile();syncWeeklyProfile();saveCloudNow()};
const _v80avatar=chooseAvatar;chooseAvatar=function(id){_v80avatar(id);syncWeeklyProfile();saveCloudNow()};
async function logout(){
 await saveCloudNow();st.loggedIn=false;save();logoutModal.classList.add('hide');game.classList.add('hide');loginPage.classList.remove('hide');
 if(cloudAuth)await cloudAuth.signOut();setGoogleButton(false,'🟢 使用 Google 開始冒險');
}
ensureWeeklyLocal();
// 雙重綁定，避免特定瀏覽器或快取造成「回到關卡」按鈕失效。
document.addEventListener('DOMContentLoaded',()=>{
  const backBtn=document.getElementById('backToStageBtn');
  if(backBtn)backBtn.addEventListener('click',backToStage);
});
window.addEventListener('online',()=>setCloudStatus('online','☁️ 網路已恢復，將自動同步。'));
window.addEventListener('offline',()=>setCloudStatus('offline','⚠️ 目前離線，進度會先保留在本機。'));
initFirebase();
