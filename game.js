let st=load(), stage,unit,quiz=[],qi=0,score=0,answered=false,replayMode=false,selectedLoginAvatar='fox',selectedAnswer=null,weaknessFilter='all',weaknessQuizNote=null,weaknessSelectedAnswer=null;
let baseWeatherTimer=null,baseWeatherIndex=Math.floor(Math.random()*4);
function defaultState(){return{loggedIn:false,name:'環保守護者',coins:0,last:'',streak:0,completed:{},lastScores:{},owned:[],basePlacements:[],basePaths:[],baseEditMode:false,basePathMode:false,checkinHistory:{},monthlyGuardianRewards:{},savedAt:'',unitProgress:{},unitScores:{},avatar:'fox',frame:'none',exp:0,totalCorrect:0,totalAnswered:0,todayAnswered:0,todayAnsweredDate:'',playDays:0,lastPlayDate:'',soundEnabled:true,wrongNotes:{},coinAwarded:{},mainExpAwarded:{},weaknessExpAwarded:{},weaknessCoinAwarded:{},eventClaims:{},guardianEnergy:0,achievementClaims:{},bestWeeklyRank:null,specialTitle:''}}
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
      playerName.textContent=st.name||'環保守護者';
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
function avatarMarkup(a,alt='守護者'){return a&&a.image?`<img class="guardian-avatar-img" src="${a.icon}" alt="${alt}">`:(a?a.icon:'🌱')}
function setAvatarElement(el,a,alt='守護者'){if(!el)return;if(a&&a.image){el.innerHTML=avatarMarkup(a,alt)}else{el.textContent=a?a.icon:'🌱'}}
function frameById(id){return FRAMES.find(f=>f.id===id)||FRAMES[0]}
function isAvatarUnlocked(a){return a.special==='monthly'?Object.keys(st.monthlyGuardianRewards||{}).some(k=>st.monthlyGuardianRewards[k]===true):currentLevel()>=a.level}
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
  if(!st.checkinHistory||typeof st.checkinHistory!=='object')st.checkinHistory={};
  if(!st.monthlyGuardianRewards||typeof st.monthlyGuardianRewards!=='object')st.monthlyGuardianRewards={};
  if(!Array.isArray(st.basePlacements))st.basePlacements=[];
  if(!Array.isArray(st.basePaths))st.basePaths=[];
}
function localDateKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function recordAnswerActivity(){const today=localDateKey();if(st.todayAnsweredDate!==today){st.todayAnsweredDate=today;st.todayAnswered=0;}st.todayAnswered=(Number(st.todayAnswered)||0)+1;}
function activeExpMultiplier(){return typeof window.getActiveExpMultiplier==='function'?window.getActiveExpMultiplier():1;}
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
    b.innerHTML=`<span>${avatarMarkup(a,a.name)}</span><small>${a.name}</small>`;
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
  st.name=(nameInput.value||'環保守護者').trim();
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
  if(!st.checkinHistory||typeof st.checkinHistory!=='object')st.checkinHistory={};
  st.checkinHistory[t]=true;
  if(st.lastPlayDate!==t){st.playDays=(st.playDays||0)+1;st.lastPlayDate=t}
  if(st.last!==t){
    let y=new Date();y.setDate(y.getDate()-1);
    st.streak=st.last===dateStr(y)?st.streak+1:1;
    st.last=t;st.coins++;
    const reward=checkMonthlyGuardianReward(new Date());
    save();
    setTimeout(()=>toast(reward?'🎁 每日登入 +1 金幣，並獲得月底限定守護者！':'🎁 每日登入成功，獲得 1 枚金幣！'),300);
  }
}
function monthKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function monthDays(date=new Date()){return new Date(date.getFullYear(),date.getMonth()+1,0).getDate()}
function checkMonthlyGuardianReward(date=new Date()){
  const key=monthKey(date),days=monthDays(date);
  if(date.getDate()!==days||st.monthlyGuardianRewards?.[key])return false;
  for(let d=1;d<=days;d++)if(!st.checkinHistory[`${key}-${String(d).padStart(2,'0')}`])return false;
  st.monthlyGuardianRewards[key]=true;return true;
}
function showCheckinCalendar(){renderCheckinCalendar();page('checkinPage')}
function updateHomeCheckinCard(){
 const el=document.getElementById('homeCheckinState');if(!el)return;
 const now=new Date(),today=localDateKey(),key=monthKey(now),days=monthDays(now),first=new Date(now.getFullYear(),now.getMonth(),1).getDay();
 el.textContent=st.checkinHistory&&st.checkinHistory[today]?'今天已簽到':'今天尚未簽到';
 const month=document.getElementById('homeCheckinMonth'),grid=document.getElementById('homeCheckinGrid'),reward=document.getElementById('homeCheckinReward');
 const checked=Array.from({length:days},(_,i)=>!!st.checkinHistory[`${key}-${String(i+1).padStart(2,'0')}`]).filter(Boolean).length;
 if(month)month.textContent=`${now.getMonth()+1}月，已簽到${checked}/${days}天`;
 if(grid){
   grid.innerHTML='<i></i>'.repeat(first);
   for(let d=1;d<=days;d++){const dateKey=`${key}-${String(d).padStart(2,'0')}`,done=!!st.checkinHistory[dateKey],future=d>now.getDate();grid.insertAdjacentHTML('beforeend',`<i class="${done?'done':future?'future':'missed'}" title="${d}日">${done?'✓':d}</i>`);}
 }
 if(reward)reward.textContent=st.monthlyGuardianRewards[key]?'✅ 已獲得四季松鼠守護者':'🐿️ 月底全勤送限定守護者';
}
function celestialPosition(date=new Date()){
 const minutes=date.getHours()*60+date.getMinutes();
 const isDay=minutes>=360&&minutes<1080;
 const start=isDay?360:1080;
 const span=720;
 const adjusted=isDay?minutes:(minutes<360?minutes+1440:minutes);
 const progress=Math.max(0,Math.min(1,(adjusted-start)/span));
 const x=8+84*progress;
 const arc=Math.sin(Math.PI*progress);
 const y=62-50*arc;
 return{isDay,x,y};
}
function applyCelestialPosition(el,date=new Date()){
 if(!el)return;
 const pos=celestialPosition(date);
 el.style.setProperty('--celestial-x',`${pos.x.toFixed(2)}%`);
 el.style.setProperty('--celestial-y',`${pos.y.toFixed(2)}%`);
 el.classList.toggle('header-night',!pos.isDay);
 el.classList.toggle('header-day',pos.isDay);
 document.body.classList.toggle('night-mode',!pos.isDay);
}
function renderHeaderNature(){
 const el=document.getElementById('mainHeader');if(!el)return;
 const now=new Date(),pos=celestialPosition(now);
 applyCelestialPosition(el,now);
 const sun=el.querySelector('.header-sun'),moon=el.querySelector('.header-moon');
 const stars=el.querySelector('.header-stars'),meteor=el.querySelector('.header-meteor');
 // 日月採互斥顯示，避免舊樣式或轉場造成同時出現。
 if(sun)sun.hidden=!pos.isDay;
 if(moon)moon.hidden=pos.isDay;
 if(stars)stars.hidden=pos.isDay;
 if(meteor)meteor.hidden=pos.isDay;
}
function showAchievements(){renderAchievements();page('achievementPage')}
function questionBankTotal(){return Number(window.QUESTION_STATS&&window.QUESTION_STATS.totalUnique)||2844}
function completedUnitCount(){return S.reduce((n,x)=>n+doneSet(x.id).size,0)}
function totalUnitCount(){return S.reduce((n,x)=>n+unitCount(x.id),0)}
function perfectUnitCount(){
 let n=0;
 Object.values(st.unitScores||{}).forEach(stageScores=>Object.values(stageScores||{}).forEach(v=>{if(Number(v)>=10)n++}));
 return n;
}
function buildAchievementList(){
 const correct=Number(st.totalCorrect)||0;
 const units=completedUnitCount();
 const builds=Array.isArray(st.owned)?st.owned.length:0;
 const stageDone=S.map(isDone);
 const topTen=Number(st.bestWeeklyRank)>0&&Number(st.bestWeeklyRank)<=10;
 const firstNineDone=[units>=1,correct>=50,(st.streak||0)>=7,stageDone[0],builds>=10,correct>=200,perfectUnitCount()>=5,stageDone[2],topTen];
 const firstNineCount=firstNineDone.filter(Boolean).length;
 const total=questionBankTotal();
 return[
  {id:'first_unit',icon:'🌱',name:'初心守護者',desc:'完成第 1 個學習單元。',rarity:'普通',progress:Math.min(units,1),goal:1,reward:{exp:20}},
  {id:'correct_50',icon:'📚',name:'環保新星',desc:'累計答對 50 題。',rarity:'普通',progress:Math.min(correct,50),goal:50,reward:{exp:30}},
  {id:'streak_7',icon:'🔥',name:'學習不中斷',desc:'連續登入 7 天。',rarity:'稀有',progress:Math.min(st.streak||0,7),goal:7,reward:{coins:1}},
  {id:'stage_1',icon:'🦦',name:'金門生態守護員',desc:'完成第一座守護境域的全部單元。',rarity:'稀有',progress:doneSet('s1').size,goal:unitCount('s1'),reward:{exp:50}},
  {id:'build_10',icon:'🌳',name:'綠色建築師',desc:'守護基地累計建設 10 次。',rarity:'稀有',progress:Math.min(builds,10),goal:10,reward:{coins:2}},
  {id:'correct_200',icon:'🌎',name:'地球小英雄',desc:'累計答對 200 題。',rarity:'史詩',progress:Math.min(correct,200),goal:200,reward:{exp:100}},
  {id:'perfect_5',icon:'🐳',name:'海洋救援隊',desc:'累計取得 5 個單元滿分。',rarity:'史詩',progress:Math.min(perfectUnitCount(),5),goal:5,reward:{coins:2}},
  {id:'stage_3',icon:'⚡',name:'再生能源達人',desc:'完成「零碳星際城」全部單元。',rarity:'史詩',progress:doneSet('s3').size,goal:unitCount('s3'),reward:{exp:50}},
  {id:'weekly_top10',icon:'👑',name:'每週挑戰王',desc:'曾進入每週排行榜前 10 名。',rarity:'傳奇',progress:topTen?1:0,goal:1,reward:{title:'每週挑戰王'}},
  {id:'first_nine',icon:'🏆',name:'傳奇守護者',desc:'取得前 9 個核心成就。',rarity:'傳奇',progress:firstNineCount,goal:9,reward:{coins:5,exp:200}},
  {id:'correct_500',icon:'📘',name:'百科探索家',desc:'累計答對 500 題。',rarity:'普通',progress:Math.min(correct,500),goal:500,reward:{coins:2,exp:100}},
  {id:'correct_1000',icon:'📙',name:'環保知識大師',desc:'累計答對 1,000 題。',rarity:'稀有',progress:Math.min(correct,1000),goal:1000,reward:{coins:3,exp:200}},
  {id:'correct_1500',icon:'📗',name:'生態守護傳奇',desc:'累計答對 1,500 題。',rarity:'史詩',progress:Math.min(correct,1500),goal:1500,reward:{coins:4,exp:300}},
  {id:'correct_2000',icon:'📕',name:'永恆環保英雄',desc:'累計答對 2,000 題。',rarity:'傳奇',progress:Math.min(correct,2000),goal:2000,reward:{coins:5,exp:500,title:'永恆環保英雄'}},
  {id:'all_questions',icon:'👑',name:'環保冒險王',desc:`答對全部 ${total.toLocaleString('zh-TW')} 題正式題庫。`,rarity:'終極',progress:Math.min(correct,total),goal:total,reward:{coins:10,exp:1000,title:'環保冒險王'}}
 ];
}
function achievementRewardText(r={}){
 const parts=[];if(r.exp)parts.push(`${r.exp} EXP`);if(r.coins)parts.push(`${r.coins} 金幣`);if(r.title)parts.push(`稱號「${r.title}」`);return parts.join('＋')||'紀念徽章';
}
function claimNewAchievements(list){
 st.achievementClaims=st.achievementClaims||{};let changed=false;const names=[];
 list.forEach(a=>{if(a.progress>=a.goal&&!st.achievementClaims[a.id]){st.achievementClaims[a.id]=new Date().toISOString();st.exp=(Number(st.exp)||0)+(a.reward.exp||0);st.coins=(Number(st.coins)||0)+(a.reward.coins||0);if(a.reward.title)st.specialTitle=a.reward.title;changed=true;names.push(a.name)}});
 if(changed){save();header();setTimeout(()=>toast(`🎉 解鎖成就：${names.join('、')}`),250)}
}
function renderAchievements(){
 const grid=document.getElementById('achievementGrid');if(!grid)return;
 const achievements=buildAchievementList();claimNewAchievements(achievements);
 grid.innerHTML=achievements.map(a=>{const done=a.progress>=a.goal;const pct=Math.min(100,a.progress/a.goal*100);return `<article class="achievement-card rarity-${a.rarity} ${done?'earned':'locked'}"><div class="achievement-icon">${a.icon}</div><div class="achievement-info"><div class="achievement-head"><h3>${a.name}</h3><span>${a.rarity}</span></div><p>${a.desc}</p><div class="achievement-progress"><i style="width:${pct}%"></i></div><small>${done?'✅ 已達成':`${a.progress.toLocaleString('zh-TW')}／${a.goal.toLocaleString('zh-TW')}`} · 獎勵：${achievementRewardText(a.reward)}</small></div></article>`}).join('');
}

function renderCheckinCalendar(){
  ensureProfile();const now=new Date(),key=monthKey(now),days=monthDays(now),first=new Date(now.getFullYear(),now.getMonth(),1).getDay();
  const title=document.getElementById('checkinMonthTitle'),grid=document.getElementById('checkinCalendarGrid'),progress=document.getElementById('checkinProgress'),reward=document.getElementById('checkinRewardState');
  if(!grid)return;title.textContent=`${now.getMonth()+1}月每日簽到`;
  const checked=Array.from({length:days},(_,i)=>!!st.checkinHistory[`${key}-${String(i+1).padStart(2,'0')}`]).filter(Boolean).length;
  progress.textContent=`本月已簽到 ${checked}／${days} 天`;
  reward.textContent=st.monthlyGuardianRewards[key]?'✅ 已獲得限定「四季松鼠守護者」':`月底全勤可獲得限定「四季松鼠守護者」`;
  grid.innerHTML=['日','一','二','三','四','五','六'].map(x=>`<b class="checkin-weekday">${x}</b>`).join('')+'<span class="checkin-blank"></span>'.repeat(first);
  for(let d=1;d<=days;d++){
    const dateKey=`${key}-${String(d).padStart(2,'0')}`,done=!!st.checkinHistory[dateKey],future=d>now.getDate();
    grid.insertAdjacentHTML('beforeend',`<div class="checkin-day ${done?'checked':future?'future':'missed'}"><small>${d}</small><strong>${done?'✔':future?'○':'—'}</strong></div>`);
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
 streak.textContent=Math.max(0,Number(st.streak)||0);
 badges.textContent=S.filter(isDone).length;
 playerName.textContent=st.name||'環保守護者';
 playerTitle.textContent=st.specialTitle||titleForLevel(lv);
 playerLevel.textContent=`Lv.${lv}`;
 playerAvatar.textContent=av.icon;
 playerAvatar.className=`player-avatar frame-${fr.id}`;
 expNow.textContent=expInLevel();
 expNext.textContent=100;
 if(typeof updateBaseDashboard==='function')updateBaseDashboard();
 updateWeaknessBadge();
 if(typeof updateHomeAnnouncement==='function')updateHomeAnnouncement();
 updateHomeCheckinCard();
 renderHeaderNature();
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
function mountGlobalFooter(pageId){
 const activePage=document.getElementById(pageId);
 const status=document.querySelector('.global-status-row');
 const info=document.querySelector('.global-footer-info');
 if(!activePage||!status||!info)return;
 // 每個頁面的最底部固定依序顯示：四項守護狀態，再顯示每日簽到與玩家資訊卡。
 activePage.appendChild(status);
 activePage.appendChild(info);
}
function page(id){
 ['mapPage','stagePage','quizPage','resultPage','basePage','hallPage','leaderboardPage','profilePage','weaknessPage','checkinPage','achievementPage','adminPage']
   .forEach(x=>document.getElementById(x).classList.add('hide'));
 const target=document.getElementById(id);
 target.classList.remove('hide');
 document.body.classList.toggle('admin-mode',id==='adminPage');
 if(id!=='adminPage') mountGlobalFooter(id);
 if(typeof updateBaseDashboard==='function')updateBaseDashboard();
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
  const base=(UNIT_SETS[s.id]&&UNIT_SETS[s.id][unitIndex])?UNIT_SETS[s.id][unitIndex].slice():[];
  const custom=typeof window.customQuestionsForUnit==='function'?window.customQuestionsForUnit(s.id,unitIndex+1):[];
  if(!custom.length)return base;
  const keep=Math.max(0,10-custom.length);
  return base.slice(0,keep).concat(custom.slice(0,10));
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
 const nextButton=document.getElementById('nextBtn');
 nextButton.disabled=false;
 nextButton.classList.add('hide');
 answerActions.classList.remove('hide');
 submitAnswerBtn.disabled=true;
}
function selectAnswer(i){
 if(answered)return;
 selectedAnswer=i;
 [...options.children].forEach((b,j)=>{
   b.classList.toggle('selected',j===i);
   b.setAttribute('aria-pressed',String(j===i));
 });
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
 recordAnswerActivity();
 let expGained=0;
 if(ok){
   score++;
   st.guardianEnergy=Math.min(100,Math.max(0,Number(st.guardianEnergy)||0)+2);
   st.totalCorrect=(st.totalCorrect||0)+1;
   if(!st.mainExpAwarded||typeof st.mainExpAwarded!=='object')st.mainExpAwarded={};
   const expKey=`${stage.id}|${q.id}`;
   if(!st.mainExpAwarded[expKey]){
     const awardedExp=10*activeExpMultiplier();
     addExp(awardedExp);
     st.mainExpAwarded[expKey]=true;
     expGained=awardedExp;
     addWeeklyQuestionPoints(awardedExp);
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
   ?`<b>✅ 答對了！</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="exp-gain">${expGained? `✨ +${expGained} EXP`:'本題經驗值已領取，不重複計分'}</div>`
   :`<b>🤔 這題已記進「怪獸弱點筆記」</b><br><span class="feedback-label">解析</span><br>${q.exp}<div class="feedback-note">不公布答案，也不立即重答；之後可回首頁筆記複習。</div><div class="exp-gain">本題不獲得經驗值</div>`;
 answerActions.classList.add('hide');
 const nextButton=document.getElementById('nextBtn');
 nextButton.disabled=false;
 nextButton.classList.remove('hide');
 requestAnimationFrame(()=>{
   if(window.matchMedia('(min-width: 701px)').matches){
     nextButton.scrollIntoView({behavior:'smooth',block:'nearest'});
   }
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
let nextQuestionLocked=false;
function nextQuestion(){
 if(!answered||nextQuestionLocked)return;
 const nextButton=document.getElementById('nextBtn');
 nextQuestionLocked=true;
 if(nextButton)nextButton.disabled=true;
 qi++;
 if(qi>=quiz.length){
   finish();
 }else{
   renderQ();
 }
 window.setTimeout(()=>{
   nextQuestionLocked=false;
   const button=document.getElementById('nextBtn');
   if(button)button.disabled=false;
 },180);
}
function bindMobileSafeNextButton(){
 const button=document.getElementById('nextBtn');
 if(!button||button.dataset.bound==='true')return;
 button.dataset.bound='true';
 let pointerHandled=false;
 button.addEventListener('pointerup',event=>{
   if(event.pointerType==='touch'||event.pointerType==='pen'){
     event.preventDefault();
     pointerHandled=true;
     nextQuestion();
     window.setTimeout(()=>{pointerHandled=false},400);
   }
 },{passive:false});
 button.addEventListener('click',event=>{
   event.preventDefault();
   if(pointerHandled)return;
   nextQuestion();
 });
}
if(document.readyState==='loading'){
 document.addEventListener('DOMContentLoaded',bindMobileSafeNextButton,{once:true});
}else{
 bindMobileSafeNextButton();
}
const STAGE_REWARDS={s1:{main:2,weakness:1},s2:{main:4,weakness:2},s3:{main:6,weakness:3},s4:{main:8,weakness:4}};
function stageReward(stageId,type='main'){
 const reward=STAGE_REWARDS[stageId]||STAGE_REWARDS.s1;
 return Number(reward[type])||0;
}
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
 const mainCoinReward=stageReward(stage.id,'main');
 if(firstPerfect){st.coins=(st.coins||0)+mainCoinReward;st.coinAwarded[coinKey]=true;}
 st.unitProgress[stage.id][unit]=10;
 st.unitScores[stage.id][unit]=score;
 replayMode=false;
 const pct=Math.round(score/quiz.length*100);
 st.lastScores[stage.id]=pct;
 save();
 resultTitle.textContent=`${stage.name}・單元 ${unit+1} 完成！`;
 document.getElementById('score').textContent=pct;
 resultMsg.textContent=perfect
   ?(firstPerfect?`本次 10 題全部答對，獲得 ${mainCoinReward} 枚金幣！`:'本單元滿分獎勵已領取，不重複獲得金幣。')
   :(first?'首次完成單元，但本次未全對，因此不獲得金幣。':'本次未全對，因此不獲得金幣。');
 coinReward.textContent=firstPerfect?`+${mainCoinReward}`:(perfect?'已領取':'未獲得');
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
function showBase(){renderBase();updateBaseDashboard();page('basePage');setTimeout(updateBaseClock,0)}
const BASE_WEATHERS=[
  {id:'sunny',label:'晴天',icon:'☀️'},
  {id:'cloudy',label:'多雲',icon:'🌤️'},
  {id:'overcast',label:'陰天',icon:'☁️'},
  {id:'rainy',label:'雨天',icon:'🌧️'}
];
let baseLiveWeather=null,baseWeatherFetchedAt=0;
function weatherFromCode(code){
 code=Number(code);
 if(code===0)return BASE_WEATHERS[0];
 if([1,2].includes(code))return BASE_WEATHERS[1];
 if([3,45,48].includes(code))return BASE_WEATHERS[2];
 if([51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(code))return BASE_WEATHERS[3];
 return BASE_WEATHERS[1];
}
async function updateRealBaseWeather(force=false){
 if(!force&&Date.now()-baseWeatherFetchedAt<15*60*1000&&baseLiveWeather){renderBaseSky();return;}
 try{
  const url='https://api.open-meteo.com/v1/forecast?latitude=24.43&longitude=118.32&current=weather_code,is_day&timezone=auto';
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('weather '+response.status);
  const data=await response.json(),current=data.current||{};
  baseLiveWeather={weather:weatherFromCode(current.weather_code),mode:Number(current.is_day)===1?'day':'night'};baseWeatherFetchedAt=Date.now();renderBaseSky();
 }catch(err){console.warn('即時天氣載入失敗，使用本機時間與備援天氣。',err);baseLiveWeather=null;renderBaseSky();}
}
function baseTimeMode(){
  const hour=new Date().getHours();
  return hour>=6&&hour<18?'day':'night';
}
function advanceBaseWeather(){
  baseWeatherIndex=(baseWeatherIndex+1)%BASE_WEATHERS.length;
  renderBaseSky();
}
function renderBaseSky(){
  const scene=document.getElementById('baseScene');
  if(!scene)return;
  const weather=baseLiveWeather?.weather||BASE_WEATHERS[baseWeatherIndex]||BASE_WEATHERS[0];
  const mode=baseTimeMode();
  scene.className=`base-scene ${mode} weather-${weather.id}`;
  const pos=celestialPosition(new Date());
  scene.style.setProperty('--celestial-x',`${pos.x.toFixed(2)}%`);
  scene.style.setProperty('--celestial-y',`${pos.y.toFixed(2)}%`);
  const sky=scene.querySelector('.base-sky');
  const badge=scene.querySelector('.base-weather-badge');
  if(sky){
    sky.innerHTML=`
      <span class="base-stars" aria-hidden="true"><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i></span>
      <span class="base-celestial" aria-hidden="true">${mode==='day'?'☀️':'🌙'}</span>
      <span class="base-cloud cloud-one" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-two" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-three" aria-hidden="true">☁️</span>
      <span class="base-rain" aria-hidden="true">${Array.from({length:22},(_,i)=>`<i style="--x:${4+(i*13)%92}%;--delay:${(i%11)*.8}s;--duration:${9+(i%5)*1.2}s"></i>`).join('')}</span>`;
  }
  if(badge)badge.textContent=`${mode==='day'?'白天':'黑夜'}・${weather.icon} ${weather.label}`;
}
function ensureBaseLayout(){
  if(!Array.isArray(st.basePlacements))st.basePlacements=[];
  if(!Array.isArray(st.basePaths))st.basePaths=[];
  const valid=new Set();
  st.owned.forEach((itemId,index)=>{
    const key=`base-${index}-${itemId}`;valid.add(key);
    if(!st.basePlacements.some(p=>p.key===key)){
      const col=index%6,row=Math.floor(index/6)%4;
      st.basePlacements.push({key,itemId,x:12+col*15,y:73-row*15});
    }
  });
  st.basePlacements=st.basePlacements.filter(p=>valid.has(p.key));
}
function basePointerPosition(event,scene){const r=scene.getBoundingClientRect();return{x:Math.max(4,Math.min(96,(event.clientX-r.left)/r.width*100)),y:Math.max(10,Math.min(93,(event.clientY-r.top)/r.height*100))}}
function toggleBaseEdit(){st.baseEditMode=!st.baseEditMode;if(!st.baseEditMode)st.basePathMode=false;save();renderBase();toast(st.baseEditMode?'✋ 編輯模式開啟：拖曳建設到喜歡的位置':'✅ 基地位置已保存')}
function toggleBasePath(){st.baseEditMode=true;st.basePathMode=!st.basePathMode;save();renderBase();toast(st.basePathMode?'🟫 鋪路模式：點擊草地放置路徑':'✋ 已回到建設拖曳模式')}
function clearBasePaths(){if(!st.basePaths.length){toast('目前沒有可清除的路徑');return;}st.basePaths.pop();save();renderBase();toast('🧹 已清除一格路徑');}
function addBasePath(event){
  if(!st.baseEditMode||!st.basePathMode||event.target.closest('.base-building'))return;
  const pos=basePointerPosition(event,baseScene),snap=4;
  pos.x=Math.round(pos.x/snap)*snap;pos.y=Math.round(pos.y/snap)*snap;
  if(!st.basePaths.some(p=>Math.abs(p.x-pos.x)<2&&Math.abs(p.y-pos.y)<2)){st.basePaths.push(pos);save();renderBase();}
}
function bindBaseBuildingDrag(el,placement){
  el.addEventListener('pointerdown',event=>{
    if(!st.baseEditMode||st.basePathMode)return;event.preventDefault();el.setPointerCapture(event.pointerId);el.classList.add('dragging');
    const move=e=>{const pos=basePointerPosition(e,baseScene);placement.x=pos.x;placement.y=pos.y;el.style.left=pos.x+'%';el.style.top=pos.y+'%';};
    const up=()=>{el.classList.remove('dragging');el.removeEventListener('pointermove',move);save();};
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',up,{once:true});el.addEventListener('pointercancel',up,{once:true});
  });
}

let baseZoom=1;
function adjustBaseZoom(delta){
  baseZoom=Math.max(.8,Math.min(1.3,Math.round((baseZoom+delta)*10)/10));
  const frame=document.querySelector('.base-scene-frame');
  if(frame)frame.style.setProperty('--base-zoom',baseZoom);
  const label=document.getElementById('baseZoomLabel');if(label)label.textContent=Math.round(baseZoom*100)+'%';
}
function updateBaseClock(){
  const el=document.getElementById('baseLocalTime');if(!el)return;
  const now=new Date();el.textContent=now.toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit',hour12:false});
}
function showBaseInfo(){toast('📋 基地資訊：建設越完整，基地完成度越高！')}
function showGuardianAlbum(){showHall()}
function updateBaseDashboard(){
  if(!st)return;
  updateBaseClock();
  const lv=currentLevel(), av=avatarById(st.avatar), owned=(st.owned||[]).length;
  const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
  set('baseProfileName',st.name||'環保守護者');set('baseProfileLevel',`Lv.${lv}`);set('baseProfileTitle',st.specialTitle||titleForLevel(lv));
  const avatar=document.getElementById('baseProfileAvatar');if(avatar)setAvatarElement(avatar,av,st.name||'環保守護者');
  const ach=typeof getUnlockedAchievements==='function'?getUnlockedAchievements().length:(st.badges||0);
  const weeklyPoints=(st.weekly&&Number(st.weekly.points))||0;
  set('baseProfileAchievements',`${ach} / 15 個成就`);
  set('baseProfileStreak',`${Math.max(0,Number(st.streak)||0)} 天`);
  set('baseProfileWeekly',`${weeklyPoints.toLocaleString('zh-TW')} 分`);
  set('baseProfileCompletion',`${Math.min(100,Math.round(owned/12*100))}% 完成`);
  const sw=document.getElementById('baseEditSwitch');if(sw){sw.classList.toggle('on',!!st.baseEditMode);const em=sw.querySelector('em');if(em)em.textContent=st.baseEditMode?'開':'關'}
}
function aqiLevel(aqi){if(aqi<=50)return'良好';if(aqi<=100)return'普通';if(aqi<=150)return'對敏感族群不健康';if(aqi<=200)return'對所有族群不健康';if(aqi<=300)return'非常不健康';return'危害'}
async function updateNatureDashboard(){
  const w=document.getElementById('natureWeather');if(!w)return;
  try{
    const [forecast,air]=await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=24.43&longitude=118.32&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto',{cache:'no-store'}).then(r=>r.json()),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=24.43&longitude=118.32&current=us_aqi&timezone=auto',{cache:'no-store'}).then(r=>r.json())
    ]);
    const c=forecast.current||{}, aq=Math.round(Number(air.current?.us_aqi));
    document.getElementById('natureWeather').textContent=weatherFromCode(c.weather_code).label;
    document.getElementById('natureTemp').textContent=Number.isFinite(Number(c.temperature_2m))?`${Math.round(c.temperature_2m)}°C`:'--°C';
    document.getElementById('natureHumidity').textContent=Number.isFinite(Number(c.relative_humidity_2m))?`${Math.round(c.relative_humidity_2m)}%`:'--%';
    document.getElementById('natureAqi').textContent=Number.isFinite(aq)?aq:'--';document.getElementById('natureAqiLevel').textContent=Number.isFinite(aq)?aqiLevel(aq):'暫無資料';
  }catch(e){document.getElementById('natureLiveBadge').textContent='OFFLINE';document.getElementById('natureWeather').textContent='暫無資料';}
}
setInterval(updateBaseClock,60000);
setTimeout(updateNatureDashboard,800);

function renderBase(){
  ensureBaseLayout();baseCoins.textContent=st.coins;
  baseScene.innerHTML='<div class="base-sky" aria-hidden="true"></div><div class="base-weather-badge"></div><div class="base-grassland" aria-hidden="true"><span class="grass-tuft grass-a">🌱</span><span class="grass-tuft grass-b">🌿</span><span class="grass-tuft grass-c">🌱</span></div><div class="base-path-layer"></div><div class="base-buildings"></div>';
  baseScene.onclick=addBasePath;
  const buildings=baseScene.querySelector('.base-buildings'),paths=baseScene.querySelector('.base-path-layer');
  const titleTools=document.getElementById('baseTitleTools');
  if(titleTools){const btns=titleTools.querySelectorAll('button');if(btns[0]){btns[0].classList.toggle('active',!!st.baseEditMode);btns[0].textContent=st.baseEditMode?'✅ 完成擺設':'✋ 編輯基地'}if(btns[1]){btns[1].classList.toggle('active',!!st.basePathMode);btns[1].textContent=st.basePathMode?'🟫 停止鋪路':'🟫 自己鋪路'}}
  st.basePaths.forEach((p,i)=>{const tile=document.createElement('button');tile.className='base-path-tile';tile.style.left=p.x+'%';tile.style.top=p.y+'%';tile.title=st.baseEditMode?'點兩下移除路徑':'';tile.ondblclick=e=>{e.stopPropagation();if(st.baseEditMode){st.basePaths.splice(i,1);save();renderBase();}};paths.appendChild(tile)});
  if(!st.owned.length){buildings.innerHTML='<div class="base-empty">基地目前還很空曠，完成單元賺取金幣，開始第一項建設吧！</div>'}
  else st.basePlacements.forEach(p=>{const it=ITEMS.find(x=>x.id===p.itemId);if(!it)return;const el=document.createElement('button');el.type='button';el.className='base-building'+(st.baseEditMode?' editable':'');el.textContent=it.icon;el.title=st.baseEditMode?`拖曳「${it.name}」調整位置`:it.name;el.style.left=p.x+'%';el.style.top=p.y+'%';bindBaseBuildingDrag(el,p);buildings.appendChild(el)});
  renderBaseSky();updateRealBaseWeather();
  if(baseWeatherTimer)clearInterval(baseWeatherTimer);baseWeatherTimer=setInterval(()=>{if(!document.getElementById('basePage').classList.contains('hide'))updateRealBaseWeather(true)},15*60*1000);
  shop.innerHTML='';[...ITEMS].sort((a,b)=>a.cost-b.cost||a.name.localeCompare(b.name,'zh-Hant')).forEach(it=>{
    const count=st.owned.reduce((n,id)=>n+(id===it.id?1:0),0),d=document.createElement('div');d.className='shop-item';
    d.innerHTML=`<div class="shop-icon">${it.icon}</div><h4>${it.name}</h4><p>${it.desc}</p><small class="owned-count">目前擁有：${count} 個</small><button class="shop-buy-btn" onclick="buyItem('${it.id}')"><span class="shop-price">🪙 ${it.cost}</span><span class="shop-buy-label">再建設一次</span></button>`;shop.appendChild(d);
  });
  updateBaseDashboard();
}
function buyItem(id){
  const it=ITEMS.find(x=>x.id===id);if(!it)return;if(st.coins<it.cost){toast('金幣不足，完成更多單元再回來建設吧！');return}
  st.coins-=it.cost;st.owned.push(id);ensureBaseLayout();save();header();renderBase();toast('✨ 已新增一個「'+it.name+'」，可以進入編輯模式自由擺放！')
}


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

 const unitSelect=document.getElementById('weaknessUnitSearch');
 if(unitSelect){
   const current=unitSelect.value;
   const units=[...new Set(entries.map(x=>`${x.stageId}|${x.unit}`))].sort();
   unitSelect.innerHTML='<option value="">全部 Stage／單元</option>'+units.map(key=>{const [sid,u]=key.split('|');const s=S.find(x=>x.id===sid);const stageNo=Math.max(1,S.findIndex(x=>x.id===sid)+1);return `<option value="${key}">STAGE ${stageNo}｜${s?s.name:sid}・單元 ${u}</option>`}).join('');
   unitSelect.value=units.includes(current)?current:'';
 }
 const searchEl=document.getElementById('weaknessSearch');
 const keyword=(searchEl?.value||'').trim().toLowerCase();
 const unitKey=(unitSelect?.value||'');
 const filtered=entries.filter(note=>{
   const statusOK=weaknessFilter==='all'||(weaknessFilter==='mastered'?note.mastered:!note.mastered);
   if(!statusOK)return false;
   if(unitKey&&`${note.stageId}|${note.unit}`!==unitKey)return false;
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
    const amount=stageReward(note.stageId,'weakness');
    st.coins=(st.coins||0)+amount;
    return amount;
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
  recordAnswerActivity();
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
      const awardedExp=5*activeExpMultiplier();
      addExp(awardedExp);
      st.weaknessExpAwarded[key]=true;
      weaknessExp=awardedExp;
      addWeeklyQuestionPoints(awardedExp);
    }
    note.mastered=true;
    note.masteredAt=note.masteredAt||new Date().toISOString();
    const weaknessCoin=tryAwardWeaknessUnitCoin(note);
    weaknessQuizFeedback.className='feedback good';
    weaknessQuizFeedback.innerHTML=`<b>✅ 成功淨化怪獸！</b><br><div class="monster-cleared">🌟 已掌握這個環保弱點</div><div class="exp-gain">${weaknessExp?'✨ +5 EXP':'本題經驗值已領取，不重複計分'}</div>${weaknessCoin?`<div class="coin-gain">🪙 本單元怪獸全部淨化，+${weaknessCoin} 枚金幣</div>`:''}<div class="feedback-note">${wasMastered?'這隻怪獸先前已淨化，本次不重複計分。':'圖鑑狀態已更新為「已淨化」。'}</div>`;
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
  if(!isAvatarUnlocked(a)){toast(a.special==='monthly'?`🔒 月底簽到全勤才能解鎖「${a.name}」`:`🔒 Lv.${a.level} 才能解鎖「${a.name}」`);return}
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
  profileNameInput.value=st.name||'環保守護者';
  profileDisplayName.textContent=st.name||'環保守護者';
  profileTitleText.textContent=st.specialTitle||titleForLevel(lv);
  profileLevel.textContent=`Lv.${lv}`;
  profileExpText.textContent=lv>=MAX_LEVEL?'已達最高等級':`${expInLevel()} / 100 EXP`;
  profileExpBar.style.width=(lv>=MAX_LEVEL?100:expInLevel())+'%';
  setAvatarElement(profileAvatarPreview,av,av.name);
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
    b.innerHTML=`<span>${avatarMarkup(a,a.name)}</span><b>${a.name}</b><small>${unlocked?'已解鎖':a.special==='monthly'?'月底全勤解鎖':`Lv.${a.level} 解鎖`}</small>`;
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

// 每分鐘同步首頁與守護基地的日月位置及日夜狀態。
setInterval(()=>{
 renderHeaderNature();
 const basePage=document.getElementById('basePage');
 if(basePage&&!basePage.classList.contains('hide'))renderBaseSky();
},60*1000);


// V9.4.1 Beta 5.1：抬頭縮小只改變內部視覺，不改變版面高度，避免捲輪造成圖卡抖動。
(function initCompactHeader(){
  let ticking=false;
  const update=()=>{
    document.body.classList.toggle('header-compact',window.scrollY>120);
    ticking=false;
  };
  window.addEventListener('scroll',()=>{
    if(!ticking){requestAnimationFrame(update);ticking=true;}
  },{passive:true});
  update();
})();
