let st=load(), stage,unit,quiz=[],qi=0,score=0,answered=false,replayMode=false,selectedLoginAvatar='fox',selectedAnswer=null,weaknessFilter='all',weaknessQuizNote=null,weaknessSelectedAnswer=null;
let baseWeatherTimer=null,baseWeatherIndex=Math.floor(Math.random()*4);
function defaultState(){return{loggedIn:false,name:'環保守護者',coins:0,last:'',streak:0,completed:{},lastScores:{},owned:[],basePlacements:[],habitatBases:{},basePaths:[],baseEditMode:false,basePathMode:false,flowerBundleV96Migrated:false,checkinHistory:{},monthlyGuardianRewards:{},savedAt:'',unitProgress:{},unitScores:{},avatar:'fox',frame:'none',exp:0,totalCorrect:0,totalAnswered:0,todayAnswered:0,todayAnsweredDate:'',playDays:0,lastPlayDate:'',soundEnabled:true,wrongNotes:{},coinAwarded:{},mainExpAwarded:{},weaknessExpAwarded:{},weaknessCoinAwarded:{},eventClaims:{},guardianEnergy:0,achievementClaims:{},bestWeeklyRank:null,specialTitle:''}}
function migrateFlowerBundlesV96(state){
  if(!state||state.flowerBundleV96Migrated)return state;
  const oldOwned=Array.isArray(state.owned)?state.owned:[];
  const oldPlacements=Array.isArray(state.basePlacements)?state.basePlacements:[];
  const placementByKey=new Map(oldPlacements.map(p=>[p.key,p]));
  const newOwned=[],newPlacements=[];
  oldOwned.forEach((itemId,oldIndex)=>{
    const oldKey=`base-${oldIndex}-${itemId}`;
    const old=placementByKey.get(oldKey)||oldPlacements.find(p=>p.itemId===itemId&&!p.__v96used);
    if(old)old.__v96used=true;
    if(itemId!=='flowers'){
      const newIndex=newOwned.length,key=`base-${newIndex}-${itemId}`;
      newOwned.push(itemId);
      if(old)newPlacements.push({...old,key,itemId});
      return;
    }
    const centerX=Number(old?.x)||50,centerY=Number(old?.y)||68;
    const offsets=[[-5,-4],[-2,-6],[2,-6],[5,-4],[-6,0],[-2,0],[2,0],[6,0],[-3,4],[3,4]];
    offsets.forEach(([dx,dy],flowerVariant)=>{
      const newIndex=newOwned.length,key=`base-${newIndex}-flowers`;
      newOwned.push('flowers');
      newPlacements.push({key,itemId:'flowers',x:Math.max(4,Math.min(96,centerX+dx)),y:Math.max(10,Math.min(93,centerY+dy)),scale:.72,mirrored:false,flowerVariant});
    });
  });
  oldPlacements.forEach(p=>{delete p.__v96used});
  state.owned=newOwned;
  state.basePlacements=newPlacements;
  state.flowerBundleV96Migrated=true;
  return state;
}
function load(){
  try{
    let raw=localStorage.getItem(KEY);
    if(!raw){
      for(const oldKey of LEGACY_KEYS){
        raw=localStorage.getItem(oldKey);
        if(raw)break;
      }
    }
    return migrateFlowerBundlesV96({...defaultState(),...JSON.parse(raw||'{}')});
  }catch{return defaultState()}
}
function refreshSharedPlayerPanels(){
  // 所有頁面共用同一組 DOM 與同一份 st，任何挑戰或登入資料變更後立即刷新。
  try{
    if(typeof header==='function'){
      ensureProfile();
      const lv=currentLevel(),av=avatarById(st.avatar),fr=frameById(st.frame);
      const set=(id,val)=>{const el=document.getElementById(id);if(el)el.textContent=val};
      set('coins',Math.max(0,Number(st.coins)||0));
      set('streak',Math.max(0,Number(st.streak)||0));
      set('badges',S.filter(isDone).length);
      set('expNow',expInLevel());set('expNext',100);
      set('playerName',st.name||'環保守護者');set('playerTitle',st.specialTitle||titleForLevel(lv));set('playerLevel',`Lv.${lv}`);
      const pa=document.getElementById('playerAvatar');if(pa){setAvatarElement(pa,av,st.name||'環保守護者');pa.className=`player-avatar frame-${fr.id}`;}
    }
    if(typeof updateBaseDashboard==='function')updateBaseDashboard();
    if(typeof updateHomeCheckinCard==='function')updateHomeCheckinCard();
    if(typeof updateWeaknessBadge==='function')updateWeaknessBadge();
  }catch(err){console.warn('更新共用玩家資料面板失敗',err)}
}
function save(){
  try{
    st.savedAt=new Date().toISOString();
    localStorage.setItem(KEY,JSON.stringify(st));
    updateSaveStatus('saved');
    refreshSharedPlayerPanels();
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
    version:'9.6.1',
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
      st=migrateFlowerBundlesV96({...defaultState(),...data,loggedIn:true});
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
  if(!st.habitatBases||typeof st.habitatBases!=='object')st.habitatBases={};
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
 const x=92-84*progress;
 const arc=Math.sin(Math.PI*progress);
 const y=62-50*arc;
 return{isDay,x,y};
}
function applyCelestialPosition(el,date=new Date()){
 if(!el)return;
 // V10.1.0：只有「我的基地」有日夜變化；首頁與所有功能頁固定明亮白天。
 el.style.setProperty('--celestial-x','54%');
 el.style.setProperty('--celestial-y','14%');
 el.classList.remove('header-night');
 el.classList.add('header-day');
 document.body.classList.remove('night-mode');
}
function renderHeaderNature(){
 const el=document.getElementById('mainHeader');if(!el)return;
 applyCelestialPosition(el,new Date());
 const sun=el.querySelector('.header-sun'),moon=el.querySelector('.header-moon');
 const stars=el.querySelector('.header-stars'),meteor=el.querySelector('.header-meteor');
 if(sun)sun.hidden=false;
 if(moon)moon.hidden=true;
 if(stars)stars.hidden=true;
 if(meteor)meteor.hidden=true;
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
let currentGamePage='mapPage',previousGamePage='mapPage';
function page(id){
 if(id!==currentGamePage){previousGamePage=currentGamePage;currentGamePage=id;}
 ['mapPage','stagePage','quizPage','resultPage','basePage','baseVillagePage','visitorBasePage','hallPage','leaderboardPage','profilePage','weaknessPage','checkinPage','achievementPage','adminPage']
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
function goGameBack(){
 if(activeHabitatBase){exitHabitatBase();return;}
 const target=previousGamePage&&document.getElementById(previousGamePage)?previousGamePage:'mapPage';
 const from=currentGamePage;
 page(target);
 previousGamePage=from;
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
  const url='https://api.open-meteo.com/v1/forecast?latitude=24.43&longitude=118.32&current=weather_code,is_day,wind_speed_10m&timezone=auto';
  const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error('weather '+response.status);
  const data=await response.json(),current=data.current||{};
  baseLiveWeather={weather:weatherFromCode(current.weather_code),mode:Number(current.is_day)===1?'day':'night',windSpeed:Math.max(0,Number(current.wind_speed_10m)||0)};baseWeatherFetchedAt=Date.now();renderBaseSky();
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
function realMoonPhase(date=new Date()){
  // 以已知新月 2000-01-06 18:14 UTC 為基準，平均朔望月 29.530588853 日。
  const synodic=29.530588853;
  const knownNewMoon=Date.UTC(2000,0,6,18,14,0);
  const age=((date.getTime()-knownNewMoon)/86400000%synodic+synodic)%synodic;
  const phases=['🌑','🌒','🌓','🌔','🌕','🌖','🌗','🌘'];
  const index=Math.floor((age+synodic/16)/(synodic/8))%8;
  return{emoji:phases[index],age,index,label:['新月','娥眉月','上弦月','盈凸月','滿月','虧凸月','下弦月','殘月'][index]};
}
function moonPhaseSvg(phase){
  const index=Number(phase?.index)||0;
  const label=phase?.label||'月相';
  if(index===0)return '<span class="moon-phase moon-new" role="img" aria-label="新月"></span>';
  const shapes={
    1:'<defs><mask id="moonMask"><circle cx="50" cy="50" r="45" fill="white"/><ellipse cx="34" cy="50" rx="42" ry="46" fill="black"/></mask></defs><circle cx="50" cy="50" r="45" mask="url(#moonMask)"/>',
    2:'<path d="M50 5A45 45 0 0 1 50 95Z"/>',
    3:'<defs><mask id="moonMask"><circle cx="50" cy="50" r="45" fill="white"/><ellipse cx="7" cy="50" rx="42" ry="46" fill="black"/></mask></defs><circle cx="50" cy="50" r="45" mask="url(#moonMask)"/>',
    4:'<circle cx="50" cy="50" r="45"/>',
    5:'<defs><mask id="moonMask"><circle cx="50" cy="50" r="45" fill="white"/><ellipse cx="93" cy="50" rx="42" ry="46" fill="black"/></mask></defs><circle cx="50" cy="50" r="45" mask="url(#moonMask)"/>',
    6:'<path d="M50 5A45 45 0 0 0 50 95Z"/>',
    7:'<defs><mask id="moonMask"><circle cx="50" cy="50" r="45" fill="white"/><ellipse cx="66" cy="50" rx="42" ry="46" fill="black"/></mask></defs><circle cx="50" cy="50" r="45" mask="url(#moonMask)"/>'
  };
  return `<span class="moon-phase" role="img" aria-label="${label}"><svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">${shapes[index]||shapes[4]}</svg></span>`;
}
function renderBaseSky(){
  const scene=document.getElementById('baseScene');
  if(!scene)return;
  const weather=baseLiveWeather?.weather||BASE_WEATHERS[baseWeatherIndex]||BASE_WEATHERS[0];
  const mode=baseLiveWeather?.mode||baseTimeMode();
  scene.className=`base-scene ${mode} weather-${weather.id}${st.baseEditMode?' is-editing':''}${activeHabitatBase?` habitat-build-scene habitat-theme-${activeHabitatBase}`:''}`;
  const windSpeed=Math.max(0,Number(baseLiveWeather?.windSpeed)||0);
  const windDuration=windSpeed<1?0:Math.max(1.8,Math.min(24,36/(windSpeed+0.8)));
  scene.style.setProperty('--wind-spin-duration',windDuration?`${windDuration.toFixed(2)}s`:'0s');
  scene.classList.toggle('wind-calm',windSpeed<1);
  const pos=celestialPosition(new Date());
  scene.style.setProperty('--celestial-x',`${pos.x.toFixed(2)}%`);
  scene.style.setProperty('--celestial-y',`${pos.y.toFixed(2)}%`);
  const sky=scene.querySelector('.base-sky');
  const badge=scene.querySelector('.base-weather-badge');
  if(sky){
    sky.innerHTML=`
      <span class="base-stars" aria-hidden="true"><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i><i>✧</i><i>✦</i><i>★</i></span>
      <span class="base-celestial" aria-hidden="true">${mode==='day'?'☀️':moonPhaseSvg(realMoonPhase(new Date()))}</span>
      <span class="base-cloud cloud-one" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-two" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-three" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-four" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-five" aria-hidden="true">☁️</span>
      <span class="base-cloud cloud-six" aria-hidden="true">☁️</span>
      <span class="base-rain" aria-hidden="true">${Array.from({length:22},(_,i)=>`<i style="--x:${4+(i*13)%92}%;--delay:${(i%11)*.8}s;--duration:${9+(i%5)*1.2}s"></i>`).join('')}</span>`;
  }
  if(badge){const moon=realMoonPhase(new Date());badge.textContent=mode==='day'?`白天・${weather.icon} ${weather.label}`:`夜晚・${moon.emoji} ${moon.label}・${weather.icon} ${weather.label}`;badge.title=mode==='day'?'基地依金門即時天氣顯示':`目前月相：${moon.label}（月齡約 ${moon.age.toFixed(1)} 天）`; }
  if(scene.querySelector('.base-residents'))renderBaseResidents();
}
let activeHabitatBase=null;
const HABITAT_BASE_META={
  forest:{icon:'🌳',name:'森林保育區',short:'森林',description:'山陵、森林、小溪與林間空地，適合建造鳥屋、昆蟲旅館及自然步道。',geography:'起伏山陵・闊葉森林・林間小溪',shop:'trees'},
  garden:{icon:'🌼',name:'授粉花園',short:'花園',description:'開闊花田、果樹緩坡與蜿蜒花徑，為蜜蜂和蝴蝶提供蜜源與休息空間。',geography:'花田草原・果樹緩坡・授粉花徑',shop:'flowers'},
  wetland:{icon:'💧',name:'濕地生態園',short:'濕地',description:'淺水池、泥灘、蘆葦帶與木棧道，營造水鳥、青蛙及歐亞水獺適合的環境。',geography:'淺水濕地・泥灘蘆葦・觀察水道',shop:'eco'},
  coast:{icon:'🌊',name:'潮間帶保護區',short:'潮間帶',description:'沙灘、礁岩、潮池與海岸平台，建立鱟、招潮蟹和彈塗魚的金門潮間帶基地。',geography:'海岸沙灘・礁岩潮池・潮汐水域',shop:'rest'},
  green:{icon:'☀️',name:'綠能科技園',short:'綠能',description:'向陽緩坡、開放廣場與低碳設施用地，適合配置風力、太陽能及雨水回收系統。',geography:'向陽草坡・永續廣場・綠能設施帶',shop:'eco'}
};
function habitatGeographyMarkup(id,meta){
  const common=`<div class="habitat-geography habitat-geography-${id}" aria-hidden="true"><div class="geo-back"></div><div class="geo-mid"></div><div class="geo-front"></div>`;
  const details={
    forest:'<div class="geo-creek"></div><div class="geo-tree-line"></div><div class="geo-forest-clearing"></div><div class="cozy-decor forest-decor"><i>🍄</i><i>🌿</i><i>🪨</i><i>🦋</i></div>',
    garden:'<div class="geo-flower-field field-a"></div><div class="geo-flower-field field-b"></div><div class="cozy-decor garden-decor"><i>🌷</i><i>🌼</i><i>🐝</i><i>🦋</i></div>',
    wetland:'<div class="geo-wetland-water"></div><div class="geo-mudflat"></div><div class="geo-reeds reeds-a"></div><div class="geo-reeds reeds-b"></div><div class="cozy-decor wetland-decor"><i>🪷</i><i>🦆</i><i>🐸</i><i>🪶</i></div>',
    coast:'<div class="geo-sea"></div><div class="geo-wave wave-a"></div><div class="geo-wave wave-b"></div><div class="geo-beach"></div><div class="geo-tidepool pool-a"></div><div class="geo-tidepool pool-b"></div><div class="geo-rocks"></div><div class="cozy-decor coast-decor"><i>🐚</i><i>🦀</i><i>🌿</i><i>🐟</i></div>',
    green:'<div class="geo-green-hills"></div><div class="geo-meadow-stream"></div><div class="cozy-decor green-decor"><i>🌱</i><i>🌼</i><i>☀️</i><i>🕊️</i></div>'
  };
  return common+(details[id]||'')+`<div class="geo-label"><b>${meta.geography||meta.short}</b><small>初始僅保留自然環境，所有設施由玩家自行建設</small></div></div>`;
}

function ensureHabitatBase(id){
  if(!st.habitatBases||typeof st.habitatBases!=='object')st.habitatBases={};
  if(!st.habitatBases[id]||typeof st.habitatBases[id]!=='object')st.habitatBases[id]={owned:[],placements:[]};
  const b=st.habitatBases[id];if(!Array.isArray(b.owned))b.owned=[];if(!Array.isArray(b.placements))b.placements=[];return b;
}
function currentBaseData(){return activeHabitatBase?ensureHabitatBase(activeHabitatBase):{owned:st.owned,placements:st.basePlacements};}
function currentBaseOwned(){return currentBaseData().owned;}
function currentBasePlacements(){return currentBaseData().placements;}
function enterHabitatBase(id){
  if(!HABITAT_BASE_META[id])return;activeHabitatBase=id;st.baseEditMode=false;ensureHabitatBase(id);closeExplorationHabitat();
  const meta=HABITAT_BASE_META[id];baseShopCategory=meta.shop||'all';renderBase();
  document.getElementById('baseScene')?.scrollIntoView({behavior:'smooth',block:'center'});toast(`已進入「${meta.name}」，可以開始專屬建設！`);
}
function enterActiveHabitatBase(){if(activeExplorationHabitat)enterHabitatBase(activeExplorationHabitat.id);}
function exitHabitatBase(){activeHabitatBase=null;st.baseEditMode=false;baseShopCategory='all';renderBase();toast('已回到上一頁：守護基地的自然探索路線');}
function ensureBaseLayout(){
  if(!Array.isArray(st.basePlacements))st.basePlacements=[];
  if(!Array.isArray(st.basePaths))st.basePaths=[];
  const valid=new Set();
  st.owned.forEach((itemId,index)=>{
    const key=`base-${index}-${itemId}`;valid.add(key);
    if(!st.basePlacements.some(p=>p.key===key)){
      const col=index%6,row=Math.floor(index/6)%4;
      st.basePlacements.push({key,itemId,x:12+col*15,y:73-row*15,flowerVariant:itemId==='flowers'?index%10:undefined,scale:itemId==='flowers'?.72:1});
    }
  });
  st.basePlacements=st.basePlacements.filter(p=>valid.has(p.key));
}
function basePointerPosition(event,scene){const r=scene.getBoundingClientRect();return{x:Math.max(4,Math.min(96,(event.clientX-r.left)/r.width*100)),y:Math.max(10,Math.min(93,(event.clientY-r.top)/r.height*100))}}
function toggleBaseEdit(){st.baseEditMode=!st.baseEditMode;st.basePathMode=false;save();renderBase();toast(st.baseEditMode?'🛠️ 編輯模式開啟：可拖曳、縮放、鏡像或刪除物件':'✅ 完成擺設，基地位置已保存')}
function toggleBasePath(){toast('此版本已移除鋪路功能');}
function clearBasePaths(){toast('此版本已移除清除路徑功能');}
function addBasePath(){/* V9.5 已移除鋪路功能 */}
function selectBaseBuilding(el){
  document.querySelectorAll('.base-building.selected').forEach(x=>x.classList.remove('selected'));
  if(el)el.classList.add('selected');
}
function bindBaseBuildingDrag(el,placement){
  el.addEventListener('pointerdown',event=>{
    if(!st.baseEditMode||st.basePathMode)return;
    selectBaseBuilding(el);
    if(event.target.closest('.base-building-delete,.base-building-mirror,.base-building-resize-handle'))return;
    event.preventDefault();el.setPointerCapture(event.pointerId);el.classList.add('dragging');
    const move=e=>{const pos=basePointerPosition(e,baseScene);placement.x=pos.x;placement.y=pos.y;el.style.left=pos.x+'%';el.style.top=pos.y+'%';};
    const up=()=>{el.classList.remove('dragging');el.removeEventListener('pointermove',move);save();};
    el.addEventListener('pointermove',move);el.addEventListener('pointerup',up,{once:true});el.addEventListener('pointercancel',up,{once:true});
  });
}
function bindBaseBuildingResize(handle,el,placement){
  handle.addEventListener('pointerdown',event=>{
    if(!st.baseEditMode)return;
    event.preventDefault();event.stopPropagation();selectBaseBuilding(el);
    handle.setPointerCapture(event.pointerId);el.classList.add('resizing');
    const startX=event.clientX,startY=event.clientY,startScale=Number(placement.scale)||1;
    const move=e=>{
      const dx=e.clientX-startX,dy=e.clientY-startY;
      const distance=(dx+dy)/150;
      const next=Math.max(.55,Math.min(1.8,Math.round((startScale+distance)*100)/100));
      placement.scale=next;el.style.setProperty('--building-scale',next);
    };
    const up=()=>{el.classList.remove('resizing');handle.removeEventListener('pointermove',move);save();};
    handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',up,{once:true});handle.addEventListener('pointercancel',up,{once:true});
  });
}

function baseBuildingArt(it,placement=null){
  const id=it.id;
  if(id==='flowers'){
    if(!placement)return `<span class="eco-asset asset-flower-bundle" aria-hidden="true">${Array.from({length:10},(_,i)=>`<i style="--i:${i}"></i>`).join('')}</span>`;
    const variant=Math.abs(Number(placement.flowerVariant)||0)%10;
    return `<span class="eco-asset asset-single-flower flower-variant-${variant}" aria-hidden="true"><i class="flower-head"></i><i class="flower-center"></i><i class="flower-stem"></i><i class="flower-leaf leaf-a"></i><i class="flower-leaf leaf-b"></i></span>`;
  }
  if(id==='solar')return `<span class="eco-asset asset-solar" aria-hidden="true"><svg viewBox="0 0 96 96" role="img"><path d="M34 66h28l7 10H27z" fill="#78958f"/><path d="M43 57h10v15H43z" fill="#c9d8d5" stroke="#78958f" stroke-width="3"/><path d="M13 22h70l-8 39H5z" fill="#173f69" stroke="#d7e9e8" stroke-width="5" stroke-linejoin="round"/><g stroke="#8ed3e4" stroke-width="2"><path d="M28 23l-6 37M49 23l-4 37M70 23l-2 37"/><path d="M9 41h70"/></g><path d="M16 27h18l-2 10H14zM38 27h18l-1 10H36zM60 27h18l-2 10H58z" fill="#55b6d0" opacity=".8"/></svg></span>`;
  if(id==='wind')return `<span class="eco-asset asset-wind" aria-hidden="true"><svg viewBox="0 0 96 96" role="img"><defs><linearGradient id="wt" x1="0" x2="1"><stop stop-color="#a9bfbc"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#8ca8a4"/></linearGradient></defs><path d="M43 35h10l7 51H36z" fill="url(#wt)" stroke="#6e918c" stroke-width="2"/><g class="wind-svg-rotor" transform-origin="48px 31px"><path d="M48 31C39 20 35 8 43 5c7 6 9 15 7 26z" fill="#eefafa" stroke="#759c96" stroke-width="2"/><path d="M48 31c14-2 26 1 25 10-8 5-18 2-25-7z" fill="#eefafa" stroke="#759c96" stroke-width="2"/><path d="M48 31c-5 13-14 22-21 17-1-9 6-17 18-20z" fill="#eefafa" stroke="#759c96" stroke-width="2"/><circle cx="48" cy="31" r="7" fill="#dcebe8" stroke="#668e87" stroke-width="3"/></g><ellipse cx="48" cy="86" rx="19" ry="4" fill="#315c4a" opacity=".25"/></svg></span>`;
  if(id==='ecoLamp')return `<span class="eco-asset asset-lamp" aria-hidden="true"><svg viewBox="0 0 96 96" role="img"><ellipse cx="45" cy="88" rx="20" ry="4" fill="#315c4a" opacity=".25"/><path d="M37 84h17M43 84V27" stroke="#55746c" stroke-width="7" stroke-linecap="round"/><path d="M43 28c0-12 7-17 20-17h11" fill="none" stroke="#6a8a82" stroke-width="7" stroke-linecap="round"/><path d="M64 8h22v13H61z" fill="#355d59" stroke="#9bb8ae" stroke-width="3" stroke-linejoin="round"/><path d="M66 21h17l-4 7H69z" fill="#fff39a"/><ellipse class="lamp-svg-glow" cx="74" cy="34" rx="24" ry="20" fill="#fff4a0" opacity=".25"/></svg></span>`;
  if(id==='recycle')return `<span class="eco-asset asset-recycle" aria-hidden="true"><i class="recycle-roof"></i><i class="bin bin-a">紙</i><i class="bin bin-b">塑</i><i class="bin bin-c">金</i></span>`;
  if(id==='rainBarrel'||id==='water')return `<span class="eco-asset asset-rain" aria-hidden="true"><i class="gutter"></i><i class="rain-tank"><b></b></i><i class="tap"></i></span>`;
  if(id==='battery')return `<span class="eco-asset asset-battery" aria-hidden="true"><i class="battery-cabinet"><b>⚡</b><em></em></i></span>`;
  if(['tree','pine','palm','cherry','shrub','flowers','grass'].includes(id))return `<span class="eco-asset asset-plant asset-${id}" aria-hidden="true"><i class="plant-crown"></i><i class="plant-trunk"></i><i class="plant-base"></i></span>`;
  if(id==='bike')return `<span class="eco-asset asset-bike" aria-hidden="true"><i class="bike-rack"></i><i class="bike-frame"></i><i class="wheel w1"></i><i class="wheel w2"></i></span>`;
  if(['bench','logRest','rockRest'].includes(id))return `<span class="eco-asset asset-rest asset-${id}" aria-hidden="true"><i class="rest-seat"></i><i class="rest-leg l1"></i><i class="rest-leg l2"></i></span>`;
  if(id==='ecoPond'||id==='streamRest')return `<span class="eco-asset asset-pond" aria-hidden="true"><i class="pond-water"></i><i class="pond-reed r1"></i><i class="pond-reed r2"></i><i class="pond-lily"></i></span>`;
  if(id==='birdhouse'||id==='birdDeck')return `<span class="eco-asset asset-bird" aria-hidden="true"><i class="bird-post"></i><i class="bird-house"><b></b></i></span>`;
  if(id==='compost')return `<span class="eco-asset asset-compost" aria-hidden="true"><i class="compost-box"><b>↻</b></i><i class="compost-leaf"></i></span>`;
  if(id==='sign')return `<span class="eco-asset asset-sign" aria-hidden="true"><i class="sign-board">ECO</i><i class="sign-post"></i></span>`;
  if(['library','ecoSchool','greenhouse'].includes(id))return `<span class="eco-asset asset-house asset-${id}" aria-hidden="true"><i class="house-roof"></i><i class="house-body"><b></b><em></em></i></span>`;
  if(id==='pavilion')return `<span class="eco-asset asset-pavilion" aria-hidden="true"><i class="pavilion-roof"></i><i class="pavilion-post p1"></i><i class="pavilion-post p2"></i><i class="pavilion-floor"></i></span>`;
  if(id==='boardwalk')return `<span class="eco-asset asset-boardwalk" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  if(['observation','observatory'].includes(id))return `<span class="eco-asset asset-observation" aria-hidden="true"><i class="scope"></i><i class="tripod"></i></span>`;
  if(id==='butterflyGarden')return `<span class="eco-asset asset-butterfly" aria-hidden="true"><i class="flower-bed"></i><i class="butterfly-shape"></i></span>`;
  return `<span class="eco-asset asset-generic" aria-hidden="true"><i>${it.icon}</i></span>`;
}
function rotateBaseBuilding(key){
  const p=currentBasePlacements().find(x=>x.key===key);if(!p)return;
  p.rotation=((Number(p.rotation)||0)+90)%360;save();renderBase();
}
function mirrorBaseBuilding(key){
  const p=currentBasePlacements().find(x=>x.key===key);if(!p)return;
  p.mirrored=!p.mirrored;save();renderBase();
}
function changeBaseBuildingSize(key,delta){
  const p=currentBasePlacements().find(x=>x.key===key);if(!p)return;
  p.scale=Math.max(.55,Math.min(1.8,Math.round(((Number(p.scale)||1)+delta)*10)/10));save();renderBase();
}
function removeBaseBuilding(key){
  const p=currentBasePlacements().find(x=>x.key===key);if(!p)return;
  const it=ITEMS.find(x=>x.id===p.itemId);
  if(!confirm(`確定要移除「${it?.name||'這項建設'}」嗎？移除後會退回建設清單。`))return;
  const placements=currentBasePlacements(),owned=currentBaseOwned();const idx=placements.findIndex(x=>x.key===key);if(idx>=0)placements.splice(idx,1);
  const ownedIdx=owned.indexOf(p.itemId);if(ownedIdx>=0)owned.splice(ownedIdx,1);
  save();renderBase();toast('已刪除建設');
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
function aqiMeta(aqi){
  if(aqi<=50)return{key:'green',label:'良好',advice:'空氣品質佳，適合戶外活動。'};
  if(aqi<=100)return{key:'yellow',label:'普通',advice:'一般族群可正常活動，敏感族群可留意身體狀況。'};
  if(aqi<=150)return{key:'orange',label:'對敏感族群不健康',advice:'敏感族群建議減少長時間或劇烈戶外活動。'};
  if(aqi<=200)return{key:'red',label:'對所有族群不健康',advice:'建議減少長時間戶外活動，敏感族群請做好防護。'};
  if(aqi<=300)return{key:'purple',label:'非常不健康',advice:'請減少戶外活動並留意健康狀況。'};
  return{key:'brown',label:'危害',advice:'建議留在室內並避免戶外活動。'};
}
function updateAqiDisplay(aq){
  const value=document.getElementById('natureAqi'), level=document.getElementById('natureAqiLevel');
  const flag=document.getElementById('natureAqiFlag'), metric=document.getElementById('homeAqiMetric');
  if(!Number.isFinite(aq)){
    if(value)value.textContent='--';if(level)level.textContent='暫無資料';
    if(flag)flag.dataset.level='unknown';
    if(metric){metric.dataset.tooltip='AQI 暫無資料';metric.setAttribute('aria-label','AQI 暫無資料');metric.title='AQI 暫無資料';}
    return;
  }
  const meta=aqiMeta(aq), tip=`AQI：${aq}（${meta.label}）｜${meta.advice}`;
  if(value)value.textContent=aq;if(level)level.textContent=meta.label;
  if(flag)flag.dataset.level=meta.key;
  if(metric){metric.dataset.tooltip=tip;metric.setAttribute('aria-label',tip);metric.title=tip;}
}
function setupAqiTouchTip(){
  const metric=document.getElementById('homeAqiMetric');if(!metric||metric.dataset.touchReady)return;
  metric.dataset.touchReady='1';let timer=0;
  const clear=()=>{if(timer){clearTimeout(timer);timer=0}metric.classList.remove('show-aqi-tip')};
  metric.addEventListener('touchstart',()=>{clearTimeout(timer);timer=setTimeout(()=>metric.classList.add('show-aqi-tip'),650)},{passive:true});
  metric.addEventListener('touchend',()=>setTimeout(clear,1800),{passive:true});
  metric.addEventListener('touchcancel',clear,{passive:true});
  document.addEventListener('touchstart',e=>{if(!metric.contains(e.target))clear()},{passive:true});
}
async function updateNatureDashboard(){
  const w=document.getElementById('natureWeather');if(!w)return;
  try{
    const [forecast,air]=await Promise.all([
      fetch('https://api.open-meteo.com/v1/forecast?latitude=24.43&longitude=118.32&current=temperature_2m,relative_humidity_2m,weather_code,is_day,wind_speed_10m&timezone=auto',{cache:'no-store'}).then(r=>r.json()),
      fetch('https://air-quality-api.open-meteo.com/v1/air-quality?latitude=24.43&longitude=118.32&current=us_aqi&timezone=auto',{cache:'no-store'}).then(r=>r.json())
    ]);
    const c=forecast.current||{}, aq=Math.round(Number(air.current?.us_aqi));
    const sharedWeather=weatherFromCode(c.weather_code);document.getElementById('natureWeather').textContent=sharedWeather.label;baseLiveWeather={weather:sharedWeather,mode:Number(c.is_day)===1?'day':baseTimeMode(),windSpeed:Math.max(0,Number(c.wind_speed_10m)||Number(baseLiveWeather?.windSpeed)||0)};baseWeatherFetchedAt=Date.now();renderBaseSky();
    document.getElementById('natureTemp').textContent=Number.isFinite(Number(c.temperature_2m))?`${Math.round(c.temperature_2m)}°C`:'--°C';
    document.getElementById('natureHumidity').textContent=Number.isFinite(Number(c.relative_humidity_2m))?`${Math.round(c.relative_humidity_2m)}%`:'--%';
    updateAqiDisplay(aq);setupAqiTouchTip();
  }catch(e){document.getElementById('natureLiveBadge').textContent='OFFLINE';document.getElementById('natureWeather').textContent='暫無資料';}
}
setInterval(updateBaseClock,60000);
setTimeout(updateNatureDashboard,800);
setTimeout(()=>{const btn=document.querySelector('#basePage .habitat-hint-button');if(btn&&!btn.dataset.clickReady){btn.dataset.clickReady='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openHabitatGuide();});}},0);


const BASE_FLOWER_IDS=new Set(['flowers','butterflyGarden']);
const BASE_GRASS_IDS=new Set(['grass','shrub']);
const BASE_TREE_IDS=new Set(['tree','pine','palm','cherry']);
const BASE_POND_IDS=new Set(['ecoPond','streamRest']);
function baseHabitatStats(){
  const owned=Array.isArray(st.owned)?st.owned:[];
  const rawFlowers=owned.reduce((n,id)=>n+(id==='flowers'?1:0),0);
  const flowerGardenCount=owned.reduce((n,id)=>n+(id==='butterflyGarden'?1:0),0);
  const flowerGroups=Math.floor(rawFlowers/10)+flowerGardenCount;
  const grass=owned.reduce((n,id)=>n+(BASE_GRASS_IDS.has(id)?1:0),0);
  const trees=owned.reduce((n,id)=>n+(BASE_TREE_IDS.has(id)?1:0),0);
  const ponds=owned.reduce((n,id)=>n+(BASE_POND_IDS.has(id)?1:0),0);
  const greenery=flowerGroups+grass+trees+ponds;
  return{rawFlowers,flowerGroups,grass,trees,ponds,greenery};
}
function baseGreeneryCount(){return baseHabitatStats().greenery}
function baseHabitatStatus(){
  const owned=Array.isArray(st?.owned)?st.owned:[];
  const flowerCount=owned.reduce((n,id)=>n+(id==='flowers'?1:0),0);
  const flowerGroups=Math.floor(flowerCount/10);
  const flowerGardenCount=owned.reduce((n,id)=>n+(id==='butterflyGarden'?1:0),0);
  const grass=owned.reduce((n,id)=>n+(id==='grass'?1:0),0);
  const trees=owned.reduce((n,id)=>n+(BASE_TREE_IDS.has(id)?1:0),0);
  const ponds=owned.reduce((n,id)=>n+(BASE_POND_IDS.has(id)?1:0),0);
  const effectiveFlowers=flowerGroups+flowerGardenCount;
  const greenery=effectiveFlowers+grass+trees+ponds;
  const butterflyReady=effectiveFlowers>=1||(effectiveFlowers+grass)>=2;
  const birdReady=trees>=2&&greenery>=3;
  const rabbitReady=grass>=3&&trees>=2&&greenery>=6;
  const otterReady=ponds>=1&&trees>=3&&grass>=3&&greenery>=8;
  const beeReady=effectiveFlowers>=1;
  const squirrelReady=trees>=3&&greenery>=5;
  return {
    flowerCount,flowerGroups,effectiveFlowers,grass,trees,ponds,greenery,
    butterfly:{ready:butterflyReady,count:butterflyReady?Math.min(6,Math.max(1,effectiveFlowers+Math.floor(grass/2))):0,needs:['至少 1 組花朵（10 朵）','或花朵組＋草地合計至少 2 組']},
    bee:{ready:beeReady,count:beeReady?Math.min(6,Math.max(1,effectiveFlowers*2)):0,needs:['至少 1 組花朵（10 朵）','花朵越多，入住蜜蜂越多']},
    bird:{ready:birdReady,count:birdReady?Math.min(4,Math.max(1,Math.floor(trees/2))):0,needs:['至少 2 棵樹木','綠意總值至少 3']},
    squirrel:{ready:squirrelReady,count:squirrelReady?Math.min(3,Math.max(1,Math.floor(trees/3))):0,needs:['至少 3 棵樹木','綠意總值至少 5']},
    rabbit:{ready:rabbitReady,count:rabbitReady?Math.min(3,Math.max(1,Math.floor(Math.min(grass/3,trees/2,greenery/6)))):0,needs:['至少 3 塊草地','至少 2 棵樹木','綠意總值至少 6']},
    otter:{ready:otterReady,count:otterReady?Math.min(2,Math.max(1,Math.floor(ponds))):0,needs:['至少 1 座生態池','至少 3 棵樹木','至少 3 塊草地','綠意總值至少 8']}
  };
}
function habitatMissing(kind,status=baseHabitatStatus()){
  const h=status,missing=[];
  if(kind==='butterfly'){
    if(!(h.flowerGroups>=1||(h.flowerGroups+h.grass)>=2))missing.push(`花朵還差 ${Math.max(0,1-h.flowerGroups)} 組，或增加花草組合`);
  }else if(kind==='bee'){
    if(h.effectiveFlowers<1)missing.push('花朵 10 朵（1 組）');
  }else if(kind==='bird'){
    if(h.trees<2)missing.push(`樹木還差 ${2-h.trees} 棵`);if(h.greenery<3)missing.push(`綠意還差 ${3-h.greenery}`);
  }else if(kind==='squirrel'){
    if(h.trees<3)missing.push(`樹木還差 ${3-h.trees} 棵`);if(h.greenery<5)missing.push(`綠意還差 ${5-h.greenery}`);
  }else if(kind==='rabbit'){
    if(h.grass<3)missing.push(`草地還差 ${3-h.grass} 塊`);if(h.trees<2)missing.push(`樹木還差 ${2-h.trees} 棵`);if(h.greenery<6)missing.push(`綠意還差 ${6-h.greenery}`);
  }else if(kind==='otter'){
    if(h.ponds<1)missing.push('還需要 1 座生態池');if(h.trees<3)missing.push(`樹木還差 ${3-h.trees} 棵`);if(h.grass<3)missing.push(`草地還差 ${3-h.grass} 塊`);if(h.greenery<8)missing.push(`綠意還差 ${8-h.greenery}`);
  }
  return missing;
}
function openHabitatGuide(){
  const modal=document.getElementById('habitatGuideModal');
  if(!modal){
    console.error('habitatGuideModal not found');
    if(typeof toast==='function')toast('棲地說明載入失敗，請重新整理頁面');
    return;
  }
  // 先顯示視窗，再更新內容；即使資料分析發生錯誤，玩家仍看得到說明頁。
  modal.classList.remove('hide');
  modal.setAttribute('aria-hidden','false');
  document.body.classList.add('modal-open');
  try{renderHabitatGuide();}
  catch(error){
    console.error('renderHabitatGuide failed',error);
    const box=document.getElementById('habitatRequirements');
    if(box)box.innerHTML='<article class="habitat-animal-card not-ready"><div class="habitat-animal-title"><span>💡</span><div><b>棲地提示</b><small>說明資料暫時無法分析</small></div></div><p>請重新整理頁面後再試一次。</p></article>';
  }
  const closeBtn=modal.querySelector('.modal-close');
  if(closeBtn)setTimeout(()=>closeBtn.focus(),0);
}
function closeHabitatGuide(event){
  if(event&&event.target!==event.currentTarget)return;
  const modal=document.getElementById('habitatGuideModal');
  if(modal){modal.classList.add('hide');modal.setAttribute('aria-hidden','true');}
  document.body.classList.remove('modal-open');
}
function renderHabitatGuide(){
  const status=baseHabitatStatus(),h=status;
  const summary=document.getElementById('habitatSummary');
  if(summary)summary.innerHTML=`<span>🌸 花朵組 <b>${h.flowerGroups}</b><small>${h.flowerCount} 朵，10 朵算 1 組</small></span><span>🌿 草地 <b>${h.grass}</b></span><span>🌳 樹木 <b>${h.trees}</b></span><span>💧 生態池 <b>${h.ponds}</b></span><span>🍃 綠意 <b>${h.greenery}</b></span>`;
  const defs=[
    ['butterfly','🦋','蝴蝶','在花叢間不規則飛行，停花採蜜，再飛往下一朵。'],
    ['bee','🐝','蜜蜂','在花朵間短距離飛行與採蜜，花越多數量越多。'],
    ['bird','🐦','小鳥','在天空滑翔，停在樹梢休息，再飛往另一棵樹。'],
    ['squirrel','🐿️','松鼠','沿樹木間跑跳、停下抱食物，再爬往另一棵樹。'],
    ['rabbit','🐇','野兔','只在草地跳躍與吃草，受驚時快速跳開。'],
    ['otter','🦦','歐亞水獺','沿生態池岸邊巡遊、下水游泳並上岸休息。']
  ];
  const box=document.getElementById('habitatRequirements');
  if(box)box.innerHTML=defs.map(([key,icon,name,behavior])=>{
    const r=status[key],miss=habitatMissing(key,status);
    return `<article class="habitat-animal-card ${r.ready?'ready':'not-ready'}"><div class="habitat-animal-title"><span>${icon}</span><div><b>${name}</b><small>${r.ready?'✅ 棲地符合，會入住':'尚未符合入住條件'}</small></div></div><ul>${r.needs.map(x=>`<li>${x}</li>`).join('')}</ul><p>${behavior}</p>${miss.length?`<div class="habitat-missing">${miss.map(x=>`<span>⚠️ ${x}</span>`).join('')}</div>`:''}</article>`;
  }).join('');
}
function baseResidentArt(kind){
  const arts={
    butterfly:`<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M31 24C22 7 6 8 8 24c2 12 16 11 23 2" fill="#ff90c2" stroke="#8f4168" stroke-width="2"/><path d="M33 24C42 7 58 8 56 24c-2 12-16 11-23 2" fill="#ffd45d" stroke="#8f6b23" stroke-width="2"/><path d="M29 23h6v17h-6z" rx="3" fill="#4c4b58"/><path d="M31 18c-4-6-8-7-11-7M33 18c4-6 8-7 11-7" fill="none" stroke="#4c4b58" stroke-width="2" stroke-linecap="round"/></svg>`,
    bird:`<svg viewBox="0 0 72 56" aria-hidden="true"><path d="M15 37c8-17 30-23 42-8-8 17-30 19-42 8z" fill="#4da8c7" stroke="#235c71" stroke-width="2"/><path d="M50 27l14 4-12 7" fill="#f2b84b" stroke="#8d6422" stroke-width="2"/><circle cx="49" cy="28" r="2.4" fill="#16292f"/><path d="M20 38L8 48l17-3" fill="#3b7f98"/><path d="M30 34c7-9 15-7 18 1-8 7-14 7-18-1z" fill="#8bd4df"/></svg>`,
    bee:`<svg viewBox="0 0 64 48" aria-hidden="true"><ellipse cx="32" cy="28" rx="16" ry="11" fill="#f4c430" stroke="#5b4a24" stroke-width="2"/><path d="M24 19v18M32 17v22M40 19v18" stroke="#5b4a24" stroke-width="4"/><ellipse cx="22" cy="15" rx="10" ry="7" fill="#d9f4ff" stroke="#79a8b8"/><ellipse cx="42" cy="15" rx="10" ry="7" fill="#d9f4ff" stroke="#79a8b8"/><circle cx="47" cy="26" r="3" fill="#222"/></svg>`,
    squirrel:`<svg viewBox="0 0 72 64" aria-hidden="true"><path d="M48 38c16-3 21-20 8-27-10-5-21 5-17 17 3 8 11 9 17 5" fill="#c87935" stroke="#744421" stroke-width="3"/><ellipse cx="31" cy="43" rx="19" ry="14" fill="#b86a2f" stroke="#744421" stroke-width="2"/><circle cx="20" cy="31" r="11" fill="#c87935" stroke="#744421" stroke-width="2"/><path d="M16 22l-2-10 8 8M26 22l5-9 1 12" fill="#c87935" stroke="#744421" stroke-width="2"/><circle cx="17" cy="30" r="2"/><path d="M23 38c4 5 8 5 12 1" fill="none" stroke="#f3d2ac" stroke-width="3"/></svg>`,
    rabbit:`<svg viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="35" cy="42" rx="20" ry="14" fill="#eee6d8" stroke="#8b8070" stroke-width="2"/><circle cx="23" cy="31" r="11" fill="#f5ede0" stroke="#8b8070" stroke-width="2"/><path d="M18 23C12 8 18 2 23 21M27 22c1-16 8-19 8 2" fill="#f5ede0" stroke="#8b8070" stroke-width="3" stroke-linecap="round"/><circle cx="20" cy="29" r="2" fill="#333"/><circle cx="54" cy="40" r="6" fill="#fff"/><path d="M24 37l-5 5M35 53l-3 7M45 52l4 7" stroke="#8b8070" stroke-width="3" stroke-linecap="round"/></svg>`,
    otter:`<svg viewBox="0 0 80 56" aria-hidden="true"><path d="M13 36c5-17 25-26 43-15 9 6 11 15 5 22-8 9-34 8-48-7z" fill="#8b6548" stroke="#523a2a" stroke-width="2"/><circle cx="54" cy="24" r="12" fill="#9c7556" stroke="#523a2a" stroke-width="2"/><circle cx="59" cy="22" r="2" fill="#1f1b18"/><path d="M65 27l10 2-9 5" fill="#69482f"/><path d="M15 37C5 38 2 47 10 50" fill="none" stroke="#523a2a" stroke-width="5" stroke-linecap="round"/><path d="M48 31c4 4 8 4 12 0" fill="none" stroke="#f0dcc8" stroke-width="2" stroke-linecap="round"/></svg>`
  };
  return arts[kind]||'';
}
function interactBaseResident(el){
  if(!el||el.classList.contains('interacting'))return;
  el.classList.add('interacting');
  const burst=document.createElement('span');burst.className='resident-sparkles';burst.setAttribute('aria-hidden','true');burst.innerHTML='<i>✨</i><i>💚</i><i>✨</i>';el.appendChild(burst);
  window.setTimeout(()=>{el.classList.remove('interacting');burst.remove()},1100);
}
function renderBaseResidents(){
  const layer=document.querySelector('#baseScene .base-residents');if(!layer)return;
  const status=baseHabitatStatus(),residents=[];
  const mode=baseLiveWeather?.mode||baseTimeMode();
  const weather=baseLiveWeather?.weather||BASE_WEATHERS[baseWeatherIndex]||BASE_WEATHERS[0];
  const rainy=weather.id==='rainy';
  const addMany=(kind,name,count,spots)=>{for(let i=0;i<count;i++){const p=spots[i%spots.length];residents.push({kind,name,x:p[0]+(i%2)*3,y:p[1]+(i%3)*2,delay:`-${i*1.7}s`})}};
  if(mode==='day'){
    // 日行性：蜜蜂、蝴蝶、多數小鳥與松鼠白天活動；雨天飛行昆蟲明顯減少。
    addMany('butterfly','蝴蝶',rainy?0:status.butterfly.count,[[15,42],[34,48],[58,38],[75,45],[46,55],[84,34]]);
    addMany('bee','蜜蜂',rainy?Math.min(1,status.bee.count):status.bee.count,[[22,51],[39,43],[64,49],[79,55],[50,37],[30,58]]);
    addMany('bird','小鳥',rainy?Math.ceil(status.bird.count/2):status.bird.count,[[66,27],[30,25],[82,20],[48,31]]);
    addMany('squirrel','松鼠',status.squirrel.count,[[27,66],[58,61],[76,68]]);
  }else{
    // 歐亞水獺與野兔多在黃昏、夜間及清晨較活躍；日行性動物夜晚回巢休息。
    addMany('rabbit','野兔',status.rabbit.count,[[18,72],[52,76],[78,72]]);
    addMany('otter','歐亞水獺',status.otter.count,[[38,79],[62,81]]);
  }
  layer.innerHTML=residents.map(r=>`<span class="base-resident resident-${r.kind}" role="button" tabindex="0" aria-label="和${r.name}互動" style="--resident-x:${r.x}%;--resident-y:${r.y}%;--resident-delay:${r.delay}" onclick="interactBaseResident(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();interactBaseResident(this)}">${baseResidentArt(r.kind)}</span>`).join('');
}




let baseShopCategory='all';
function baseItemCategory(id){
  if(['tree','pine','palm','cherry','shrub','birdhouse'].includes(id))return 'trees';
  if(['flowers','grass','butterflyGarden','ecoPond'].includes(id))return 'flowers';
  if(['solar','wind','recycle','rainBarrel','ecoLamp','battery','bike','compost'].includes(id))return 'eco';
  if(['logRest','rockRest','streamRest','bench','pavilion','boardwalk','birdDeck'].includes(id))return 'rest';
  return 'learn';
}
function baseBroadCategory(id){
  const category=baseItemCategory(id);
  return ['trees','flowers'].includes(category)?'nature':category;
}
function setBaseShopCategory(category,btn){
  baseShopCategory=category||'all';
  document.querySelectorAll('#baseShopFilters [data-base-category]').forEach(x=>x.classList.toggle('active',x===btn||x.dataset.baseCategory===baseShopCategory));
  renderBaseShop();
}
function baseQualityScores(){
  const ids=(st.owned||[]),uniqueIds=new Set(ids);
  const countBy=cat=>ids.reduce((n,id)=>n+(baseBroadCategory(id)===cat?1:0),0);
  const natureItems=countBy('nature'),ecoItems=countBy('eco'),restItems=countBy('rest'),learnItems=countBy('learn');
  const habitat=typeof baseHabitatStatus==='function'?baseHabitatStatus():{};
  const residentKinds=['butterfly','bee','bird','squirrel','rabbit','otter'].filter(k=>habitat[k]?.ready).length;
  const nature=Math.min(100,natureItems*8+Math.min(20,uniqueIds.size*2));
  const biodiversity=Math.min(100,residentKinds*14+Math.min(16,natureItems*2));
  const eco=Math.min(100,ecoItems*12+Math.min(16,learnItems*3));
  const happiness=Math.min(100,restItems*12+residentKinds*6+Math.min(20,uniqueIds.size));
  const guardian=Math.min(100,Math.round((nature+biodiversity+eco+happiness)/4));
  return {nature,biodiversity,eco,happiness,guardian,residentKinds};
}
function baseExplorationHabitats(){
  const zoneIds=id=>ensureHabitatBase(id).owned||[];
  const countAny=(id,list)=>zoneIds(id).filter(x=>list.includes(x)).length;
  const nature=countAny('forest',['tree','pine','palm','cherry','shrub','birdhouse']);
  const flowers=countAny('garden',['flowers','grass','butterflyGarden']);
  const wet=countAny('wetland',['ecoPond','rainBarrel','streamRest','boardwalk','birdDeck']);
  const coast=countAny('coast',['boardwalk','birdDeck','rockRest','streamRest','ecoPond','observation','observatory']);
  const green=countAny('green',['solar','wind','recycle','rainBarrel','ecoLamp','battery','bike','compost']);
  return [
    {id:'forest',icon:'🌳',name:'森林保育區',ready:nature>=4,progress:Math.min(100,Math.round(nature/4*100)),current:Math.min(nature,4),target:4,hint:`樹木與自然設施 ${Math.min(nature,4)}/4`,description:'種下不同樹木並加入鳥屋，為鳥類與小型動物建立安全的生活空間。',needs:['樹木、灌木或鳥屋共 4 項'],residents:['🐦 鳥類','🐿️ 松鼠'],shop:'trees'},
    {id:'garden',icon:'🦋',name:'授粉花園',ready:flowers>=3,progress:Math.min(100,Math.round(flowers/3*100)),current:Math.min(flowers,3),target:3,hint:`花草與授粉設施 ${Math.min(flowers,3)}/3`,description:'利用花朵、草地與蝴蝶花園，提供昆蟲食物與休息場所。',needs:['花朵、草地或蝴蝶花園共 3 項'],residents:['🦋 蝴蝶','🐝 蜜蜂'],shop:'flowers'},
    {id:'wetland',icon:'💧',name:'濕地生態園',ready:wet>=2,progress:Math.min(100,Math.round(wet/2*100)),current:Math.min(wet,2),target:2,hint:`水域與濕地設施 ${Math.min(wet,2)}/2`,description:'設置生態池、雨水桶或親水設施，讓基地保存水分並形成濕地環境。',needs:['水域或濕地設施共 2 項'],residents:['🦦 歐亞水獺','🐸 濕地生物'],shop:'eco'},
    {id:'coast',icon:'🌊',name:'潮間帶保護區',ready:coast>=3,progress:Math.min(100,Math.round(coast/3*100)),current:Math.min(coast,3),target:3,hint:`棧道與海岸設施 ${Math.min(coast,3)}/3`,description:'運用木棧道、岩石與水域設施，模擬金門潮間帶並學習輕踏觀察。',needs:['棧道、岩石或水域設施共 3 項'],residents:['🦀 鱟與潮間帶生物','🐦 水鳥'],shop:'rest'},
    {id:'green',icon:'♻️',name:'綠能科技園',ready:green>=3,progress:Math.min(100,Math.round(green/3*100)),current:Math.min(green,3),target:3,hint:`綠能與循環設施 ${Math.min(green,3)}/3`,description:'加入太陽能、風力、回收與節水設施，降低基地的資源消耗。',needs:['綠能或循環設施共 3 項'],residents:['🌱 低碳基地認證','✨ 夜間生態照明'],shop:'eco'}
  ];
}
function updateBaseExploration(){
  const habitats=baseExplorationHabitats(),ready=habitats.filter(x=>x.ready).length;
  const progress=document.getElementById('baseExplorationProgress');
  if(progress)progress.textContent=`${ready} / ${habitats.length}`;
  const stops=document.getElementById('baseExplorationStops');
  if(stops)stops.innerHTML=habitats.map(h=>`<button type="button" class="exploration-stop ${h.ready?'ready':'locked'}" data-habitat="${h.id}" onclick="openExplorationHabitat('${h.id}')" aria-label="進入${h.name}，目前進度${h.progress}%"><span>${h.ready?'✅':h.icon}</span><div><b>${h.name}</b><small>${h.description}</small><em>建設進度 ${h.progress}%　▶ 點選進入</em><i style="--progress:${h.progress}%"></i></div></button>`).join('');
  habitats.forEach(h=>{
    const node=baseScene?.querySelector(`.trail-node[data-habitat="${h.id}"]`);
    if(node){node.classList.toggle('ready',h.ready);node.classList.toggle('locked',!h.ready);node.setAttribute('role','button');node.setAttribute('tabindex','0');node.setAttribute('aria-label',`查看${h.name}，目前進度${h.progress}%`);}
  });
  bindExplorationHabitatNodes();
}
let activeExplorationHabitat=null;
function bindExplorationHabitatNodes(){
  baseScene?.querySelectorAll('.trail-node[data-habitat]').forEach(node=>{
    if(node.dataset.bound==='1')return;
    node.dataset.bound='1';
    const open=e=>{e.preventDefault();e.stopPropagation();openExplorationHabitat(node.dataset.habitat)};
    node.addEventListener('click',open);
    node.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' ')open(e)});
  });
}
function openExplorationHabitat(id){
  const habitat=baseExplorationHabitats().find(x=>x.id===id);if(!habitat)return;
  activeExplorationHabitat=habitat;
  const modal=document.getElementById('explorationHabitatModal');if(!modal)return;
  document.getElementById('explorationHabitatIcon').textContent=habitat.icon;
  document.getElementById('explorationHabitatTitle').textContent=habitat.name;
  document.getElementById('explorationHabitatDescription').textContent=habitat.description;
  document.getElementById('explorationHabitatPercent').textContent=`${habitat.progress}%`;
  document.getElementById('explorationHabitatBar').style.width=`${habitat.progress}%`;
  document.getElementById('explorationHabitatNeeds').innerHTML=habitat.needs.map(x=>`<div><span>${habitat.ready?'✅':'🧩'}</span><b>${x}</b><small>目前 ${habitat.current} / ${habitat.target}</small></div>`).join('');
  document.getElementById('explorationHabitatResidents').innerHTML=habitat.residents.map(x=>`<span>${x}</span>`).join('');
  const shop=document.getElementById('explorationHabitatShopButton');if(shop)shop.textContent=habitat.ready?'進入園區繼續建設':'進入園區開始建設';
  modal.classList.remove('hide');
  setTimeout(()=>modal.querySelector('.modal-close')?.focus(),0);
}
function closeExplorationHabitat(event){
  if(event&&event.target!==document.getElementById('explorationHabitatModal'))return;
  document.getElementById('explorationHabitatModal')?.classList.add('hide');
}
function goToHabitatShop(){
  const habitat=activeExplorationHabitat;
  closeExplorationHabitat();
  if(habitat){
    baseShopCategory=habitat.shop||'all';
    document.querySelectorAll('#baseShopFilters [data-base-category]').forEach(x=>x.classList.toggle('active',x.dataset.baseCategory===baseShopCategory));
    renderBaseShop();
  }
  const filters=document.getElementById('baseShopFilters');
  filters?.scrollIntoView({behavior:'smooth',block:'start'});
  setTimeout(()=>filters?.querySelector('.active')?.focus(),350);
  if(typeof toast==='function')toast(`已為你開啟「${habitat?.name||'棲地'}」適合的建設分類`);
}
function updateBaseQuality(){
  const q=baseQualityScores();
  [['baseNatureScore',q.nature],['baseBiodiversityScore',q.biodiversity],['baseEcoScore',q.eco],['baseHappinessScore',q.happiness],['baseGuardianScore',q.guardian]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=v;});
  const levels=[
    {min:0,name:'自然基地 Lv.1',hint:'增加樹木與花草，打造第一個生態角落。'},
    {min:25,name:'綠意基地 Lv.2',hint:'加入環保設施與休憩空間，讓基地更完整。'},
    {min:50,name:'生態基地 Lv.3',hint:'提高生態多樣性，吸引更多動物居民入住。'},
    {min:75,name:'守護樂園 Lv.4',hint:'四項指標接近滿分，即可成為模範自然基地。'},
    {min:90,name:'傳奇守護基地 Lv.5',hint:'基地已成為兼具生態、環保與幸福感的自然樂園！'}
  ];
  const level=[...levels].reverse().find(x=>q.guardian>=x.min)||levels[0];
  const levelEl=document.getElementById('baseGrowthLevel'),hintEl=document.getElementById('baseGrowthHint');
  if(levelEl)levelEl.textContent=level.name;if(hintEl)hintEl.textContent=level.hint;
  const hint=document.getElementById('baseEditHint');if(hint)hint.textContent=st.baseEditMode?'探索步道已顯示：沿著步道擺放物件，完成後點「完成擺設」':'點擊「編輯基地」即可移動物件';
}
function renderBaseShop(){
  const shopEl=document.getElementById('shop');if(!shopEl)return;
  shopEl.innerHTML='';
  [...ITEMS].filter(it=>!it.hidden).filter(it=>baseShopCategory==='all'||baseItemCategory(it.id)===baseShopCategory).sort((a,b)=>Number(a.cost)-Number(b.cost)||String(a.name).localeCompare(String(b.name),'zh-Hant')).forEach(it=>{
    const count=currentBaseOwned().reduce((n,id)=>n+(id===it.id?1:0),0),d=document.createElement('div');d.className='shop-item';
    d.dataset.category=baseItemCategory(it.id);
    d.innerHTML=`${it.isNew?'<span class="shop-new-badge">新</span>':''}<div class="shop-icon">${baseBuildingArt(it)}</div><div class="shop-item-copy"><h4>${it.name}</h4><p>${it.desc}</p></div><small class="owned-count">已擁有 ${count} ${it.id==='flowers'?'朵':'個'}</small><button class="shop-buy-btn" onclick="buyItem('${it.id}')" ${st.coins<it.cost?'data-insufficient="true"':''}><span class="shop-price">🪙 ${it.cost}</span><span class="shop-buy-label">${it.id==='flowers'?'購買 10 朵':'建設'}</span></button>`;shopEl.appendChild(d);
  });
  if(!shopEl.children.length)shopEl.innerHTML='<div class="base-shop-empty">這個分類目前沒有可購買的建設。</div>';
}
function renderBase(){
  ensureBaseLayout();if(activeHabitatBase)ensureHabitatBase(activeHabitatBase);st.basePaths=[];baseCoins.textContent=st.coins;
  const habitatMeta=activeHabitatBase?HABITAT_BASE_META[activeHabitatBase]:null;
  const nav=document.getElementById('habitatBaseNavigation');if(nav){nav.classList.toggle('hide',!habitatMeta);if(habitatMeta){document.getElementById('habitatBaseNavIcon').textContent=habitatMeta.icon;document.getElementById('habitatBaseNavTitle').textContent=habitatMeta.name;document.getElementById('habitatBaseNavDescription').textContent=habitatMeta.description;document.getElementById('habitatBaseBuildCount').textContent=`已建設 ${currentBaseOwned().length} 項`;}}
  document.querySelector('.base-exploration-card')?.classList.toggle('hide',!!habitatMeta);
  baseScene.innerHTML=habitatMeta
    ? `<div class="base-sky" aria-hidden="true"></div><div class="base-weather-badge"></div><div class="base-landscape-v104" aria-hidden="true"><div class="landscape-sun-glow"></div><div class="mountain-layer mountain-far"><i></i><i></i><i></i></div><div class="mountain-layer mountain-mid"><i></i><i></i><i></i><i></i></div><div class="mountain-layer mountain-near"><i></i><i></i><i></i><i></i><i></i></div><div class="forest-belt"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="landscape-mist mist-one"></div><div class="landscape-mist mist-two"></div></div><div class="base-grassland base-ground-v104" aria-hidden="true"><div class="ground-clearing"></div></div><div class="night-life" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><span class="shooting-star"></span></div><div class="base-path-layer"></div><div class="base-residents" aria-label="基地生態住民"></div><div class="base-buildings"></div>`
    : `<div class="storybook-village-scene" aria-label="自然繪本風守護基地村"><img src="base-village-storybook.png" alt="守護基地村自然繪本場景"/><div class="storybook-village-shade"></div><div class="storybook-build-zone"><b>自由建設草坪</b><small>點擊編輯基地後，可在這裡拖曳與擺放建設</small></div><button class="village-hotspot hotspot-shop" type="button" onclick="document.getElementById('baseShopFilters')?.scrollIntoView({behavior:'smooth',block:'start'})"><span>🛒</span><b>守護商店</b><small>選購基地建設</small></button><button class="village-hotspot hotspot-explore" type="button" onclick="document.querySelector('.base-exploration-card')?.scrollIntoView({behavior:'smooth',block:'center'})"><span>🗺️</span><b>自然探索</b><small>前往五大園區</small></button><button class="village-hotspot hotspot-achievement" type="button" onclick="showAchievements()"><span>🏆</span><b>成就館</b><small>查看守護成就</small></button><button class="village-hotspot hotspot-guide" type="button" onclick="openHabitatGuide()"><span>📖</span><b>生態圖鑑</b><small>查看棲地需求</small></button></div><div class="base-weather-badge"></div><div class="base-residents" aria-label="基地生態住民"></div><div class="base-buildings"></div>`;
  if(habitatMeta){baseScene.classList.add('habitat-build-scene',`habitat-theme-${activeHabitatBase}`);const trail=baseScene.querySelector('.eco-trail-map');if(trail)trail.remove();const ground=baseScene.querySelector('.base-grassland');if(ground)ground.insertAdjacentHTML('beforeend',`<div class="habitat-scene-title"><span>${habitatMeta.icon}</span><b>${habitatMeta.name}</b><small>${habitatMeta.description}</small><em>${habitatMeta.geography||''}</em></div>`);baseScene.insertAdjacentHTML('beforeend',habitatGeographyMarkup(activeHabitatBase,habitatMeta));}
  baseScene.onclick=null;
  const buildings=baseScene.querySelector('.base-buildings'),paths=baseScene.querySelector('.base-path-layer');
  const titleTools=document.getElementById('baseTitleTools');
  if(titleTools){const btns=titleTools.querySelectorAll('button');if(btns[0]){btns[0].classList.toggle('active',!!st.baseEditMode);btns[0].innerHTML=st.baseEditMode?'✅ <span>完成擺設</span>':'✋ <span>編輯基地</span>'}}
  const activeOwned=currentBaseOwned(),activePlacements=currentBasePlacements();
  if(!activeOwned.length){buildings.innerHTML=`<div class="base-empty">${habitatMeta?`${habitatMeta.icon} ${habitatMeta.name}目前只有原始自然環境，尚未放置任何建設。請由下方商店挑選設施，自由打造專屬園區！`:'基地目前還很空曠，完成單元賺取金幣，開始第一項建設吧！'}</div>`}
  else activePlacements.forEach(p=>{const it=ITEMS.find(x=>x.id===p.itemId);if(!it)return;if(!Number.isFinite(Number(p.scale)))p.scale=1;const el=document.createElement('div');el.className='base-building base-building-'+it.id+(st.baseEditMode?' editable':'');el.setAttribute('role','button');el.tabIndex=0;el.title=st.baseEditMode?`拖曳「${it.name}」調整位置；拖曳右下角控制點調整大小`:it.name;el.style.left=p.x+'%';el.style.top=p.y+'%';el.style.setProperty('--building-scale',p.scale);el.style.setProperty('--building-rotation',(Number(p.rotation)||0)+'deg');el.style.setProperty('--building-mirror',p.mirrored?-1:1);el.innerHTML=`${baseBuildingArt(it,p)}${st.baseEditMode?`<button type="button" class="base-building-delete" aria-label="刪除${it.name}" title="刪除物件" onclick="event.stopPropagation();removeBaseBuilding('${p.key}')">×</button><button type="button" class="base-building-mirror" aria-label="鏡像${it.name}" title="鏡像調整方向" onclick="event.stopPropagation();mirrorBaseBuilding('${p.key}')">↔</button><span class="base-building-resize-handle" role="button" aria-label="拖曳調整${it.name}大小" title="拖曳調整大小"></span>`:''}`;bindBaseBuildingDrag(el,p);const resizeHandle=el.querySelector('.base-building-resize-handle');if(resizeHandle)bindBaseBuildingResize(resizeHandle,el,p);buildings.appendChild(el)});
  renderBaseResidents();
  renderBaseSky();updateRealBaseWeather();
  if(baseWeatherTimer)clearInterval(baseWeatherTimer);baseWeatherTimer=setInterval(()=>{if(!document.getElementById('basePage').classList.contains('hide'))updateRealBaseWeather(true)},15*60*1000);
  renderBaseShop();
  updateBaseQuality();
  if(!activeHabitatBase)updateBaseExploration();
  updateBaseDashboard();
}
function buyItem(id){
  const it=ITEMS.find(x=>x.id===id);if(!it)return;if(st.coins<it.cost){toast('金幣不足，完成更多單元再回來建設吧！');return}
  st.coins-=it.cost;const data=currentBaseData(),owned=data.owned,placements=data.placements;
  if(id==='flowers'){
    const start=owned.length;
    for(let i=0;i<10;i++)owned.push(id);
    if(!activeHabitatBase)ensureBaseLayout();else for(let i=0;i<10;i++)placements.push({key:`habitat-${activeHabitatBase}-${Date.now()}-${i}-flowers`,itemId:'flowers',x:28+(i%5)*10,y:62+Math.floor(i/5)*10,flowerVariant:i,scale:.72});
    for(let i=0;i<10;i++){
      const p=activeHabitatBase?placements[placements.length-10+i]:st.basePlacements.find(x=>x.key===`base-${start+i}-flowers`);
      if(p){p.flowerVariant=i;p.scale=.72;p.x=28+(i%5)*10;p.y=62+Math.floor(i/5)*10;}
    }
    save();header();renderBase();toast('🌸 已獲得 10 朵花，每朵都可以獨立移動與調整！');return;
  }
  owned.push(id);if(!activeHabitatBase)ensureBaseLayout();else{const index=placements.length,col=index%6,row=Math.floor(index/6)%4;placements.push({key:`habitat-${activeHabitatBase}-${Date.now()}-${index}-${id}`,itemId:id,x:12+col*15,y:73-row*15,scale:1});}save();header();renderBase();toast(`✨ 已在${activeHabitatBase?HABITAT_BASE_META[activeHabitatBase].name:'基地'}新增「${it.name}」，可以進入編輯模式自由擺放！`)
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


// V9.4.1 Beta 5.1.25：首頁標題保持固定視覺尺寸，不再依捲動縮放或隱藏。
(function disableCompactHeader(){
  document.body.classList.remove('header-compact');
})();


/* ===== V9.4.1 Beta 5.1.24 守護基地村 ===== */
let baseVillageRows=[],baseVillageFilter='completion',currentVisitorBase=null,visitorZoom=1;
const BASE_VILLAGE_DEMOS=[
 {uid:'demo-otter',name:'水獺小隊長',avatar:'🦦',level:18,title:'河川守護者',intro:'保留乾淨水域，也替小動物留一個家。',likes:238,badges:8,updatedAtMs:Date.now()-3600000,placements:[['tree',18,70],['pine',32,58],['pond',51,70],['bench',68,68],['solar',80,52],['flower',41,77]]},
 {uid:'demo-crab',name:'鱟寶守護者',avatar:'🦀',level:24,title:'海岸守護者',intro:'一起保護潮間帶與古老的鱟！',likes:196,badges:10,updatedAtMs:Date.now()-7200000,placements:[['palm',20,67],['recycle',35,70],['bird',55,55],['wind',72,52],['flower',62,75],['tree',84,68]]},
 {uid:'demo-butterfly',name:'蝴蝶花園家',avatar:'🦋',level:15,title:'生態設計師',intro:'種下原生植物，等待蝴蝶來作客。',likes:154,badges:6,updatedAtMs:Date.now()-10800000,placements:[['flower',18,72],['flower',30,65],['tree',48,58],['bench',62,72],['flower',76,63],['pond',87,73]]}
];
function ensureVillageState(){
 if(!['public','private'].includes(st.baseVisibility))st.baseVisibility='public';
 if(typeof st.baseIntro!=='string')st.baseIntro='一起打造更美好的環保基地！';
 if(!Array.isArray(st.baseFavorites))st.baseFavorites=[];
 if(!st.baseLikesGiven||typeof st.baseLikesGiven!=='object')st.baseLikesGiven={};
 if(!st.baseVisitCounts||typeof st.baseVisitCounts!=='object')st.baseVisitCounts={};
}
function showBaseVillage(){ensureVillageState();page('baseVillagePage');const s=document.getElementById('baseVisibilitySelect'),i=document.getElementById('baseIntroInput');if(s)s.value=st.baseVisibility;if(i)i.value=st.baseIntro;refreshBaseVillage();}
function setVillageFilter(filter,btn){baseVillageFilter=filter;document.querySelectorAll('[data-village-filter]').forEach(x=>x.classList.toggle('active',x===btn));renderBaseVillage();}
function villageGreenRate(row){const p=row.placements||[];const greenIds=new Set(['tree','pine','palm','flower','pond','bird']);const n=p.filter(x=>greenIds.has(x.itemId)).length;return Math.min(100,Math.round(n/10*100));}
function villageCompletion(row){const p=row.placements||[];const countScore=Math.min(70,p.length/16*70);const kinds=new Set(p.map(x=>x.itemId)).size;const varietyScore=Math.min(20,kinds/8*20);const badgeScore=Math.min(10,(Number(row.badges)||0)/10*10);return Math.min(100,Math.round(countScore+varietyScore+badgeScore));}
function normalizedVillageRow(row){
 const placements=(row.placements||[]).map((x,i)=>Array.isArray(x)?{itemId:x[0],x:x[1],y:x[2],key:'v'+i}:x);
 return {...row,placements,likes:Number(row.likes)||0,badges:Number(row.badges)||0,level:Number(row.level)||1};
}
async function refreshBaseVillage(){
 const status=document.getElementById('villageStatus');if(status)status.textContent='正在同步並載入公開基地…';
 if(typeof syncPublicBaseNow==='function'&&cloudUser){try{await syncPublicBaseNow(false);}catch(_e){}}
 let rows=[];
 if(typeof loadPublicBases==='function'){try{rows=await loadPublicBases();}catch(e){console.warn(e)}}
 baseVillageRows=rows.map(normalizedVillageRow).filter(x=>(x.placements||[]).length>0).filter((x,i,a)=>a.findIndex(y=>y.uid===x.uid)===i);
 if(status)status.textContent=baseVillageRows.length?`已載入 ${baseVillageRows.length} 座已建設基地，依完成度排序`:'目前還沒有已公開且開始建設的玩家基地。';renderBaseVillage();
}
function renderBaseVillage(){
 ensureVillageState();const grid=document.getElementById('baseVillageGrid');if(!grid)return;const q=(document.getElementById('villageSearch')?.value||'').trim().toLowerCase();let rows=baseVillageRows.filter(x=>!q||String(x.name||'').toLowerCase().includes(q));
 if(baseVillageFilter==='popular')rows.sort((a,b)=>b.likes-a.likes||villageCompletion(b)-villageCompletion(a));else if(baseVillageFilter==='green')rows.sort((a,b)=>villageGreenRate(b)-villageGreenRate(a)||villageCompletion(b)-villageCompletion(a));else if(baseVillageFilter==='new')rows.sort((a,b)=>(b.updatedAtMs||0)-(a.updatedAtMs||0));else rows.sort((a,b)=>villageCompletion(b)-villageCompletion(a)||b.likes-a.likes);
 if(!rows.length){grid.innerHTML='<div class="village-empty">目前沒有已公開且開始建設的玩家基地。</div>';return;}
 grid.innerHTML=rows.map((r,i)=>{const completion=villageCompletion(r),fav=st.baseFavorites.includes(r.uid),today=Number(r.todayVisits||r.visitsToday||st.baseVisitCounts[r.uid]||0);return `<article class="base-preview-card"><div class="base-preview-rank">${i<3?['🥇','🥈','🥉'][i]:'#'+(i+1)}</div><div class="base-preview-scene" id="basePreview${i}"></div><div class="base-preview-owner"><span>${r.avatar||'🌱'}</span><div><b>${escapeHtml(r.name||'環保守護者')}</b><small>Lv.${r.level} · ${escapeHtml(r.title||'地球守護者')}</small></div></div><p>${escapeHtml(r.intro||'歡迎來參觀我的守護基地！')}</p><div class="completion-row"><b>完成度</b><strong>${completion}%</strong></div><div class="completion-bar"><i style="width:${completion}%"></i></div><div class="base-preview-meta village-card-stats"><span>❤️ ${r.likes}</span><span>🌳 ${villageGreenRate(r)}%</span><span>🏆 ${r.badges}</span><span>👀 今天 ${today}</span></div><div class="base-card-actions"><button class="primary" onclick="visitBaseByUid('${r.uid}')">參觀基地</button><button class="village-favorite-btn${fav?' active':''}" onclick="toggleVillageFavorite('${r.uid}',event)">${fav?'★ 已收藏':'☆ 收藏'}</button></div></article>`}).join('');
 rows.forEach((r,i)=>renderVillageMiniScene(document.getElementById('basePreview'+i),r));
}
function escapeHtml(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function villageItemIcon(id){const found=(typeof ITEMS!=='undefined'?ITEMS:[]).find(x=>x.id===id);if(found)return found.icon;return {tree:'🌳',pine:'🌲',palm:'🌴',flower:'🌼',pond:'💧',bench:'🪵',solar:'🔆',wind:'🌬️',recycle:'♻️',bird:'🐦'}[id]||'🌱';}

function toggleVillageFavorite(uid,event){
 if(event){event.preventDefault();event.stopPropagation();}
 ensureVillageState();
 const i=st.baseFavorites.indexOf(uid);
 if(i>=0)st.baseFavorites.splice(i,1);else st.baseFavorites.push(uid);
 save();renderBaseVillage();toast(i>=0?'已取消收藏':'⭐ 已收藏這座基地');
}

function renderVillageMiniScene(el,row){if(!el)return;el.innerHTML='<div class="village-sky">☀️　☁️</div><div class="village-ground"></div>'+(row.placements||[]).slice(0,14).map(p=>`<span style="left:${p.x}%;top:${p.y}%">${villageItemIcon(p.itemId)}</span>`).join('');}
function visitBaseByUid(uid){const row=baseVillageRows.find(x=>x.uid===uid);if(!row)return;ensureVillageState();st.baseVisitCounts[uid]=(Number(st.baseVisitCounts[uid])||0)+1;row.visitsToday=st.baseVisitCounts[uid];save();currentVisitorBase=row;visitorZoom=1;page('visitorBasePage');document.getElementById('visitorName').textContent=row.name+'的守護基地';document.getElementById('visitorIntro').textContent=row.intro||'';document.getElementById('visitorAvatar').textContent=row.avatar||'🌱';document.getElementById('visitorLikes').textContent=row.likes;document.getElementById('visitorGreen').textContent=villageGreenRate(row)+'%';document.getElementById('visitorBadges').textContent=row.badges;document.getElementById('visitorLevel').textContent=row.level;updateVisitorButtons();renderVisitorBase();}
function renderVisitorBase(){const el=document.getElementById('visitorBaseScene');if(!el||!currentVisitorBase)return;el.style.transform=`scale(${visitorZoom})`;const buildings=(currentVisitorBase.placements||[]).map(p=>{const it=(typeof ITEMS!=='undefined'?ITEMS:[]).find(x=>x.id===p.itemId);const art=it&&typeof baseBuildingArt==='function'?baseBuildingArt(it,p):villageItemIcon(p.itemId);const scale=Math.max(.55,Math.min(1.8,Number(p.scale)||1)),rotation=((Number(p.rotation)||0)%360+360)%360,mirror=p.mirrored?-1:1;return `<span class="base-building visitor-building base-building-${escapeHtml(p.itemId)}" style="left:${Number(p.x)||50}%;top:${Number(p.y)||60}%;--building-scale:${scale};--building-rotation:${rotation}deg;--building-mirror:${mirror}">${art}</span>`}).join('');el.innerHTML='<div class="base-sky" aria-hidden="true"></div><div class="base-landscape-v104" aria-hidden="true"><div class="mountain-layer mountain-far"><i></i><i></i><i></i></div><div class="mountain-layer mountain-mid"><i></i><i></i><i></i><i></i></div><div class="mountain-layer mountain-near"><i></i><i></i><i></i><i></i><i></i></div><div class="forest-belt"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div><div class="base-grassland base-ground-v104"><div class="ground-clearing"></div></div><div class="base-buildings">'+buildings+'</div>';}
function adjustVisitorZoom(d){visitorZoom=Math.max(.8,Math.min(1.3,Math.round((visitorZoom+d)*10)/10));renderVisitorBase();}
function updateVisitorButtons(){if(!currentVisitorBase)return;const fav=st.baseFavorites.includes(currentVisitorBase.uid);const likeKey=new Date().toISOString().slice(0,10)+'_'+currentVisitorBase.uid;const liked=!!st.baseLikesGiven[likeKey];const f=document.getElementById('visitorFavoriteBtn'),l=document.getElementById('visitorLikeBtn');if(f)f.textContent=fav?'★ 已收藏':'☆ 收藏';if(l){l.textContent=liked?'♥ 今天已送':'♡ 送愛心';l.disabled=liked;}}
async function likeCurrentVisitorBase(){if(!currentVisitorBase)return;ensureVillageState();const key=new Date().toISOString().slice(0,10)+'_'+currentVisitorBase.uid;if(st.baseLikesGiven[key])return;st.baseLikesGiven[key]=true;currentVisitorBase.likes++;save();document.getElementById('visitorLikes').textContent=currentVisitorBase.likes;updateVisitorButtons();if(typeof sendBaseLike==='function')sendBaseLike(currentVisitorBase.uid).catch(()=>{});toast('❤️ 已送出一顆生態愛心！');}
function toggleVisitorFavorite(){if(!currentVisitorBase)return;ensureVillageState();const i=st.baseFavorites.indexOf(currentVisitorBase.uid);if(i>=0)st.baseFavorites.splice(i,1);else st.baseFavorites.push(currentVisitorBase.uid);save();updateVisitorButtons();toast(i>=0?'已取消收藏':'⭐ 已收藏這座基地');}
function updateBaseVisibility(v){ensureVillageState();st.baseVisibility=v;save();if(typeof schedulePublicBaseSync==='function')schedulePublicBaseSync(true);}
function updateBaseIntro(v){ensureVillageState();st.baseIntro=String(v||'').trim().slice(0,40);save();if(typeof schedulePublicBaseSync==='function')schedulePublicBaseSync();}
async function publishMyBase(){ensureVillageState();updateBaseIntro(document.getElementById('baseIntroInput')?.value||st.baseIntro);updateBaseVisibility(document.getElementById('baseVisibilitySelect')?.value||st.baseVisibility);if(!cloudUser){toast('請先使用 Google 登入，才能同步基地村');return;}try{if(typeof syncPublicBaseNow==='function')await syncPublicBaseNow(true);toast(st.baseVisibility==='private'?'🔒 基地已設為不公開':'☁️ 基地村已同步最新擺設！');await refreshBaseVillage();}catch(e){console.error(e);toast('同步失敗，請檢查網路或 Firestore Rules');}}

/* ===== V9.8.2：棲地提示燈泡可靠點擊修正 ===== */
(function setupHabitatBulbV982(){
  function getBulb(){return document.querySelector('#basePage .habitat-hint-button')}
  function flashBulb(btn){
    if(!btn)return;
    btn.classList.add('is-tapped');
    setTimeout(()=>btn.classList.remove('is-tapped'),220);
  }
  function openFromBulb(event){
    const btn=event.target&&event.target.closest?event.target.closest('#basePage .habitat-hint-button'):null;
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    if(event.stopImmediatePropagation)event.stopImmediatePropagation();
    flashBulb(btn);
    try{localStorage.setItem('ecoHabitatBulbSeen','1')}catch(_e){}
    const coach=document.getElementById('habitatBulbCoach');if(coach)coach.remove();
    if(typeof openHabitatGuide==='function')openHabitatGuide();
  }
  // 捕捉階段委派，避免工具列覆蓋或舊事件阻擋 click。
  document.addEventListener('pointerup',openFromBulb,true);
  document.addEventListener('click',openFromBulb,true);
  document.addEventListener('keydown',event=>{
    if((event.key==='Enter'||event.key===' ')&&event.target&&event.target.matches('#basePage .habitat-hint-button'))openFromBulb(event);
  },true);
  function prepare(){
    const btn=getBulb();if(!btn)return;
    btn.removeAttribute('onclick');
    btn.setAttribute('type','button');
    btn.setAttribute('aria-haspopup','dialog');
    btn.setAttribute('aria-controls','habitatGuideModal');
    btn.innerHTML='';
    if(btn.dataset.v982Ready)return;
    btn.dataset.v982Ready='1';
    let seen='0';try{seen=localStorage.getItem('ecoHabitatBulbSeen')||'0'}catch(_e){}
    if(seen!=='1'&&!document.getElementById('habitatBulbCoach')){
      const coach=document.createElement('span');coach.id='habitatBulbCoach';coach.textContent='點我看看動物需要什麼棲地！';
      btn.parentElement&&btn.parentElement.appendChild(coach);
      setTimeout(()=>coach.remove(),7000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepare,{once:true});else prepare();
  const observer=new MutationObserver(prepare);observer.observe(document.documentElement,{childList:true,subtree:true});
  setTimeout(prepare,500);setTimeout(prepare,1500);
})();


/* ===== V10.0.2：棲地提示資料與可靠點擊修正 ===== */
(function bindHabitatGuideTrigger(){
  if(window.__habitatGuideTriggerBound)return;
  window.__habitatGuideTriggerBound=true;
  const activate=function(event){
    const btn=event.target&&event.target.closest?event.target.closest('.habitat-hint-button'):null;
    if(!btn)return;
    event.preventDefault();
    event.stopPropagation();
    if(event.type==='pointerup' && event.pointerType==='touch')btn.dataset.touchActivated=String(Date.now());
    if(event.type==='click' && Date.now()-Number(btn.dataset.touchActivated||0)<700)return;
    btn.classList.add('is-tapped');
    setTimeout(()=>btn.classList.remove('is-tapped'),220);
    openHabitatGuide();
  };
  document.addEventListener('pointerup',activate,true);
  document.addEventListener('click',activate,true);
  document.addEventListener('keydown',function(event){
    if((event.key==='Enter'||event.key===' ')&&document.activeElement?.classList.contains('habitat-hint-button'))activate(event);
    if(event.key==='Escape'&&!document.getElementById('habitatGuideModal')?.classList.contains('hide'))closeHabitatGuide();
  },true);
})();


/* ===== V10.2.1 小小環保訓練營－難度冒險地圖（匿名試玩） ===== */
const TRIAL_STORAGE_KEY='ecoAdventureTrialV102';
const TRIAL_QUESTIONS=[
['垃圾分類','🍌','香蕉皮吃完後，最適合放哪裡？',['廚餘','資源回收','水溝'],0,'香蕉皮是廚餘，可以妥善回收處理。'],
['垃圾分類','🧴','喝完的乾淨塑膠瓶應該怎麼做？',['丟在地上','簡單沖洗後回收','埋進土裡'],1,'乾淨塑膠瓶可以交給資源回收。'],
['垃圾分類','📄','乾淨的舊報紙可以放進哪一類？',['資源回收','廚餘','馬桶'],0,'乾淨紙類可以回收再利用。'],
['垃圾分類','🔋','用完的電池應該怎麼處理？',['交給回收點','丟進火裡','放進水池'],0,'廢電池要交給合適的回收點。'],
['垃圾分類','🥤','飲料喝完，杯子裡還有飲料時應先？',['倒乾淨再分類','直接亂丟','放在路邊'],0,'先倒乾淨，再依材質分類回收。'],
['垃圾分類','🍱','吃完便當後，正確做法是？',['剩菜和餐盒分開處理','全部丟進河裡','留在桌上'],0,'剩菜與餐盒分開處理，分類更正確。'],
['節約用水','🚰','刷牙時，水龍頭應該？',['一直開著','不用水時先關上','開到最大'],1,'不用水時關水，能省下很多乾淨水。'],
['節約用水','🧼','洗手抹肥皂時，可以先？',['關水龍頭','讓水一直流','離開不管'],0,'抹肥皂時先關水，是節水好習慣。'],
['節約用水','💧','看到水龍頭一直滴水，應該？',['告訴大人處理','假裝沒看到','把它弄得更大'],0,'及早告訴大人，可以避免浪費水。'],
['節約用水','🌱','澆花時，哪一種做法比較省水？',['適量澆在土壤上','一直沖葉子','開水後離開'],0,'把適量的水澆在土壤上，植物更容易吸收。'],
['節約用水','🪥','用杯子裝水刷牙的好處是？',['比較省水','讓地板變濕','讓水一直流'],0,'用杯子裝需要的水，能減少浪費。'],
['節約用電','💡','離開沒有人的房間時，要記得？',['關燈','多開幾盞燈','打開所有電器'],0,'隨手關燈可以節約用電。'],
['節約用電','☀️','白天光線很亮時，可以？',['利用自然光','把所有燈打開','拉上窗簾再開燈'],0,'白天善用自然光，舒適又省電。'],
['節約用電','📺','沒有人看電視時，應該？',['關掉電視','讓它一直播放','把聲音開最大'],0,'不用的電器要關掉，避免浪費電。'],
['節約用電','❄️','開冷氣時，哪個做法比較好？',['門窗關好','窗戶全部打開','穿外套又開很冷'],0,'門窗關好能減少冷氣流失。'],
['節約用電','🔌','電器不用很久時，可以請大人？',['關閉電源或拔除插頭','一直待機','再多接插座'],0,'長時間不用時關閉電源，能減少耗電。'],
['愛護植物','🌳','看到公園的小樹，應該？',['愛護它，不折樹枝','用力搖它','刻上名字'],0,'樹木是生物，需要大家一起愛護。'],
['愛護植物','🌼','花朵很漂亮，我們可以？',['用眼睛欣賞','全部摘走','踩在花圃裡'],0,'欣賞花朵但不隨意採摘，大家都能看見。'],
['愛護植物','🌱','小植物通常需要什麼？',['水和陽光','塑膠袋','垃圾'],0,'植物需要適量的水和陽光才能成長。'],
['愛護植物','🪴','幫植物澆水時，應該？',['依需要適量澆水','澆到整間都是水','完全不管'],0,'不同植物需要的水量不同，適量最好。'],
['愛護動物','🐦','看到受傷的小鳥，應該？',['找大人或專業人員幫忙','拿石頭丟牠','追著牠跑'],0,'不要隨意抓弄，請大人尋求正確協助。'],
['愛護動物','🐶','遇到不熟悉的狗，應該？',['保持距離並詢問主人','突然抱牠','拉牠尾巴'],0,'先保持距離，得到主人同意再接近。'],
['愛護動物','🦋','看到蝴蝶停在花上，可以？',['安靜觀察','抓住翅膀','大力拍打'],0,'安靜觀察，不傷害蝴蝶。'],
['愛護動物','🐝','蜜蜂正在花上採蜜時，我們應該？',['保持距離觀察','用手拍牠','破壞花朵'],0,'保持距離，讓蜜蜂安心採蜜。'],
['海洋保育','🐢','塑膠袋掉進海裡，海龜可能會？',['誤吃而生病','變得更健康','把它當玩具沒關係'],0,'海洋動物可能把塑膠誤認成食物。'],
['海洋保育','🏖️','離開海邊前，應該？',['帶走自己的垃圾','把垃圾埋在沙裡','把瓶子丟入海中'],0,'帶走垃圾，才能維持海岸乾淨。'],
['海洋保育','🐟','保護海洋生物，可以從什麼開始？',['減少一次性塑膠','把垃圾沖進水溝','隨便捕捉小魚'],0,'少用一次性塑膠能減少海洋垃圾。'],
['海洋保育','🥤','外出喝水時，哪個選擇較環保？',['自備水壺','每次都拿很多塑膠杯','喝完隨地丟'],0,'重複使用水壺能減少垃圾。'],
['生活環保','🛍️','和家人買東西時，可以自備？',['購物袋','很多塑膠袋','一次性餐具'],0,'自備購物袋能減少塑膠袋使用。'],
['生活環保','🍴','外出用餐時，可以帶？',['可重複使用的餐具','很多免洗筷','用完就丟的杯子'],0,'重複使用的餐具能減少一次性垃圾。'],
['生活環保','🚶','距離很近時，哪個方式較環保？',['走路','一定要坐車','請車子空轉等待'],0,'短距離走路能減少能源使用，也能活動身體。'],
['生活環保','🧸','玩具不玩了但還很完整，可以？',['整理後分享或捐贈','直接破壞','丟到路上'],0,'延長物品使用時間，也是一種環保。'],
['生活環保','✏️','鉛筆還沒用完時，應該？',['繼續使用','馬上丟掉','折斷它'],0,'把物品用完，可以減少浪費。'],
['生活環保','🍚','吃飯時，較好的做法是？',['吃多少盛多少','盛很多再倒掉','把飯丟地上'],0,'吃多少盛多少，能珍惜食物。'],
['金門自然','🦦','金門很有代表性的保育動物是？',['歐亞水獺','企鵝','北極熊'],0,'歐亞水獺是金門重要的保育動物。'],
['金門自然','🦀','鱟生活的海岸環境需要我們？',['好好保護','倒入垃圾','隨意破壞'],0,'保護潮間帶，能守護鱟與許多生物。'],
['金門自然','🐦','看到野生鳥類時，最好怎麼做？',['保持距離觀察','追趕牠們','破壞鳥巢'],0,'安靜並保持距離，不打擾野生鳥類。'],
['金門自然','🌊','到潮間帶觀察生物時，應該？',['輕輕觀察並恢復原狀','全部帶回家','翻動後不理'],0,'觀察後恢復原狀，減少對棲地的影響。'],
['空氣與交通','🚌','多人一起出門時，哪個方式較省能源？',['搭乘大眾運輸','每人開一台車','讓車一直空轉'],0,'大眾運輸可以減少每個人的能源使用。'],
['空氣與交通','🚲','適合且安全的短程移動，可以選擇？',['走路或騎腳踏車','一直坐著不動','請車子繞遠路'],0,'走路或騎車較節能，也要注意安全。'],
['校園環保','📚','課本還很完整時，可以？',['好好保存與使用','亂撕頁面','泡進水裡'],0,'愛惜書本能延長它的使用時間。'],
['校園環保','🗑️','在校園看到地上的垃圾，可以？',['安全時撿起並分類','踢到別處','假裝是別人的'],0,'在安全的情況下清理並分類，校園會更乾淨。']
];
const TRIAL_ADVANCED_QUESTIONS=[
['資源循環','♻️','回收前把容器簡單清洗，最主要的原因是？',['減少異味與污染其他回收物','讓容器變重','增加垃圾量'],0,'簡單清潔能提高回收品質，也避免污染其他材料。'],
['節約能源','🌡️','夏天使用冷氣時，哪個做法較節能？',['設定適當溫度並搭配電風扇','把溫度調到最低並開窗','離開房間仍持續開啟'],0,'適當溫度搭配風扇能提升舒適度，也減少耗電。'],
['氣候行動','🌍','大量燃燒煤、石油和天然氣，最可能增加哪一種氣體？',['二氧化碳','氧氣','氮氣'],0,'化石燃料燃燒會排放二氧化碳，增加溫室效應。'],
['生物多樣性','🦋','保留不同種類的原生植物，對生態最可能有什麼幫助？',['提供多種生物食物與棲地','讓所有昆蟲消失','只讓一種植物生長'],0,'多樣的原生植物能支持昆蟲、鳥類與其他生物。'],
['海洋保育','🪸','珊瑚白化常與哪一種環境變化有關？',['海水溫度異常升高','海水完全沒有鹽','月亮變亮'],0,'海水過熱會使珊瑚失去共生藻，出現白化。'],
['水資源','🏞️','河川上游的森林被大量砍除，可能造成什麼問題？',['水土流失增加','河水一定變甜','雨水完全消失'],0,'森林能固定土壤、涵養水源，砍伐會增加沖蝕。'],
['永續消費','👕','購買衣物時，哪一種做法較符合永續消費？',['選擇耐用、真正需要的衣物','看到便宜就大量購買','穿一次就丟掉'],0,'減少不必要購買並延長使用時間，可降低資源消耗。'],
['空氣品質','🏭','細懸浮微粒 PM2.5 對健康的影響，主要是因為？',['顆粒小，可能深入呼吸系統','顏色太鮮豔','只會附著在鞋底'],0,'PM2.5 粒徑很小，可能進入肺部並影響健康。'],
['棲地保育','🦦','保護歐亞水獺，除了不捕捉牠們，還需要重視什麼？',['維持乾淨且連續的水域棲地','把所有河岸鋪成水泥','增加水中垃圾'],0,'水獺需要乾淨水域、食物與安全的岸邊棲地。'],
['潮間帶','🦀','觀察鱟與潮間帶生物時，哪個做法最適合？',['沿既有路線輕踏並把翻動的石頭復原','大量挖掘帶走','在沙地駕車'],0,'減少踩踏並恢復原狀，可以降低對棲地的干擾。'],
['再生能源','☀️','太陽能發電的主要限制之一是？',['發電量會受到日照影響','一定會製造濃煙','只能在夜間使用'],0,'太陽能輸出會隨天候與日照時間變化。'],
['食物里程','🥬','選擇當季、在地食材，可能帶來什麼環境好處？',['減少長途運輸與冷藏需求','一定增加包裝','讓食物無法保存'],0,'在地當季食材通常能降低部分運輸與保存能源。'],
['碳足跡','🚌','同樣距離下，多人搭乘大眾運輸通常比每人各自開車更環保，主要因為？',['平均到每人的能源與排放較低','車子顏色比較綠','速度一定比較慢'],0,'共享運具可降低每位乘客平均分攤的能源消耗與排放。'],
['循環經濟','🔧','物品壞掉後先維修再使用，符合哪一種概念？',['延長產品生命週期','一次性消費','增加廢棄物'],0,'維修、重複使用能延長產品生命並減少資源浪費。'],
['能源效率','💡','LED 燈泡相較傳統白熾燈，通常有什麼優點？',['較省電且壽命較長','一定更熱','只能白天使用'],0,'LED 通常能用較少電力提供相近亮度。'],
['環境選擇','🥩','在營養均衡前提下，適度增加植物性餐點可能有什麼好處？',['降低部分飲食造成的環境負荷','一定浪費更多水','使垃圾無法分類'],0,'植物性飲食通常可降低部分土地、能源與排放負荷。']
];
const TRIAL_LEVELS=[
{key:'beginner',name:'入門',world:'🌱 青青草原',grade:'國小一～二年級',desc:'從生活環保常識開始。',stars:'★☆☆☆',speech:'每位守護者都是從第一步開始，我陪你一起學！',animal:'🦋',landmark:'🌱',className:'world-meadow'},
{key:'basic',name:'初級',world:'🌳 森林秘境',grade:'國小三～四年級',desc:'開始接受真正的環保任務。',stars:'★★☆☆',speech:'很好！森林裡有好多任務等著你！',animal:'🐿️',landmark:'🌳',className:'world-forest'},
{key:'advanced',name:'進階',world:'🌊 海洋王國',grade:'國小五～六年級',desc:'挑戰生態、能源與海洋保育。',stars:'★★★☆',speech:'海洋生物需要你的幫助，加油！',animal:'🐢',landmark:'🌊',className:'world-ocean'},
{key:'challenge',name:'挑戰',world:'🌍 守護者總部',grade:'國中以上／挑戰玩家',desc:'思考氣候、資源循環與永續行動。',stars:'★★★★',speech:'哇！你直接挑戰最高難度，真有勇氣！',animal:'🛰️',landmark:'🌍',className:'world-earth'}
];
let trialDifficulty=Number(localStorage.getItem('ecoTrialDifficulty')||0);
let trialQuestions=[],trialIndex=0,trialScore=0,trialAnswered=false,trialDaily=false;
function loadTrialStats(){try{return Object.assign({date:'',plays:0,bestByLevel:[0,0,0,0],streak:0,dailyDate:''},JSON.parse(localStorage.getItem(TRIAL_STORAGE_KEY)||'{}'))}catch{return{date:'',plays:0,bestByLevel:[0,0,0,0],streak:0,dailyDate:''}}}
function saveTrialStats(x){localStorage.setItem(TRIAL_STORAGE_KEY,JSON.stringify(x))}
function updateTrialStatsView(){const s=loadTrialStats(),today=dateStr();if(s.date!==today){s.date=today;s.plays=0;saveTrialStats(s)};s.bestByLevel=Array.isArray(s.bestByLevel)?s.bestByLevel:[s.best||0,0,0,0];const a=document.getElementById('trialPlayCount'),b=document.getElementById('trialBestScore');if(a)a.textContent=s.plays||0;if(b)b.textContent=`${s.bestByLevel[trialDifficulty]||0} / 5`}
function flattenOfficialQuestions(value){
  if(!Array.isArray(value))return [];
  return value.flat(Infinity).filter(q=>q&&typeof q==='object'&&!Array.isArray(q)&&Array.isArray(q.opts)&&typeof q.q==='string');
}
function officialQuestionToTrial(q){
  const topic=q.level||'環保知識';
  const icons={'初級':'🌱','中級':'🌿','中高級':'🌊','高級':'🌍'};
  return [topic,icons[q.level]||'🌏',q.q,[...q.opts],Number(q.ans),q.exp||'一起把這個環保知識記起來吧！',q.id];
}
function getOfficialTrialPool(levels=null){
  const bank=window.QUESTION_BANK||{};
  const selected=levels||Object.keys(bank);
  return selected.flatMap(level=>flattenOfficialQuestions(bank[level])).map(officialQuestionToTrial);
}
function getTrialPool(level=trialDifficulty){
  const easy=TRIAL_QUESTIONS.slice(0,24);
  const medium=TRIAL_QUESTIONS.slice(12);
  if(level===0)return easy;
  if(level===1)return medium;
  if(level===2)return getOfficialTrialPool(['初級','中級']);
  return getOfficialTrialPool();
}
function setTrialDifficulty(value,animate=false){const old=trialDifficulty;trialDifficulty=Math.max(0,Math.min(3,Number(value)||0));localStorage.setItem('ecoTrialDifficulty',String(trialDifficulty));const level=TRIAL_LEVELS[trialDifficulty],welcome=document.getElementById('trialWelcome');if(!welcome)return;welcome.classList.remove('world-meadow','world-forest','world-ocean','world-earth','swipe-left','swipe-right');welcome.classList.add(level.className);if(animate&&old!==trialDifficulty){welcome.classList.add(trialDifficulty>old?'swipe-left':'swipe-right');setTimeout(()=>welcome.classList.remove('swipe-left','swipe-right'),320)}trialDifficultySlider.value=trialDifficulty;trialWorldTitle.textContent=level.world;trialWorldDesc.textContent=`適合${level.grade}，${level.desc}`;trialDifficultyStars.textContent=level.stars;trialDifficultyStars.setAttribute('aria-label',`難度 ${trialDifficulty+1} 顆星`);trialTeacherSpeech.textContent=level.speech;trialWorldAnimal.textContent=level.animal;trialWorldLandmark.textContent=level.landmark;trialStartBtn.textContent=`🚀 開始${level.name}挑戰`;[...trialLevelDots.children].forEach((x,i)=>x.classList.toggle('active',i===trialDifficulty));const thumb=['#45a958','#d2a629','#e77b35','#6350a3'][trialDifficulty];trialDifficultySlider.style.setProperty('--thumb-color',thumb);trialWorldLandmark.classList.remove('trial-world-change');void trialWorldLandmark.offsetWidth;trialWorldLandmark.classList.add('trial-world-change');updateTrialStatsView()}
function openTrialMode(){loginPage.classList.add('hide');game.classList.add('hide');trialPage.classList.remove('hide');showTrialWelcome();setTrialDifficulty(trialDifficulty);window.scrollTo({top:0,behavior:'smooth'})}
function exitTrialMode(){trialPage.classList.add('hide');loginPage.classList.remove('hide');closeTrialHow();window.scrollTo({top:0,behavior:'smooth'})}
function showTrialWelcome(){trialWelcome.classList.remove('hide');trialQuiz.classList.add('hide');trialResult.classList.add('hide');setTrialDifficulty(trialDifficulty)}
function showTrialHow(){trialHowModal.classList.remove('hide')}
function closeTrialHow(){trialHowModal.classList.add('hide')}
function trialSample(arr,n,seed=null){const copy=[...arr];if(seed!==null){let x=seed;copy.sort(()=>{x=(x*9301+49297)%233280;return x/233280-.5})}else copy.sort(()=>Math.random()-.5);return copy.slice(0,n)}
function startTrialQuiz(count=5,questions=null){trialDaily=count===3;trialQuestions=questions||trialSample(getTrialPool(),count);trialIndex=0;trialScore=0;trialAnswered=false;trialWelcome.classList.add('hide');trialResult.classList.add('hide');trialQuiz.classList.remove('hide');renderTrialQuestion();window.scrollTo({top:0,behavior:'smooth'})}
function startDailyTrial(){const d=new Date(),seed=Number(`${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}${trialDifficulty}`);startTrialQuiz(3,trialSample(getTrialPool(),3,seed))}
function renderTrialQuestion(){const q=trialQuestions[trialIndex],total=trialQuestions.length;trialAnswered=false;trialProgressText.textContent=`第 ${trialIndex+1} 題 / ${total} 題`;trialTopic.textContent=`${TRIAL_LEVELS[trialDifficulty].name}｜${q[0]}`;trialProgressBar.style.width=`${trialIndex/total*100}%`;trialQuestionIcon.textContent=q[1];trialQuestionText.textContent=q[2];trialFeedback.className='trial-feedback hide';trialNextBtn.classList.add('hide');trialOptions.innerHTML='';q[3].forEach((text,i)=>{const btn=document.createElement('button');btn.type='button';btn.innerHTML=`<span>${String.fromCharCode(65+i)}</span><b>${text}</b>`;btn.onclick=()=>answerTrial(i,btn);trialOptions.appendChild(btn)})}
function answerTrial(choice,btn){if(trialAnswered)return;trialAnswered=true;const q=trialQuestions[trialIndex],ok=choice===q[4];if(ok)trialScore++;[...trialOptions.children].forEach((b,i)=>{b.disabled=true;if(i===q[4])b.classList.add('correct');else if(i===choice)b.classList.add('gentle-wrong')});trialFeedback.className=`trial-feedback ${ok?'good':'learn'}`;trialFeedback.innerHTML=ok?`<b>🎉 ${['太棒了！','做得真棒！','地球謝謝你！','又學會一個新知識！'][Math.floor(Math.random()*4)]}</b><p>${q[5]}</p>`:`<b>😊 沒關係，我們一起學會！</b><p>正確答案是「${q[3][q[4]]}」。${q[5]}</p>`;trialNextBtn.textContent=trialIndex===trialQuestions.length-1?'查看成績 →':'下一題 →';trialNextBtn.classList.remove('hide');trialProgressBar.style.width=`${(trialIndex+1)/trialQuestions.length*100}%`;if(ok&&typeof burst==='function')burst('⭐',8)}
function nextTrialQuestion(){if(!trialAnswered)return;if(++trialIndex<trialQuestions.length)renderTrialQuestion();else finishTrialQuiz()}
function finishTrialQuiz(){trialQuiz.classList.add('hide');trialResult.classList.remove('hide');const total=trialQuestions.length,stars=Math.round(trialScore/total*5),level=TRIAL_LEVELS[trialDifficulty];trialStars.textContent='★'.repeat(stars)+'☆'.repeat(5-stars);trialScoreText.textContent=`${trialScore} / ${total}`;trialResultMessage.textContent=(trialScore===total?`太棒了！你完成了${level.world}的滿分挑戰！`:trialScore>=Math.ceil(total*.6)?`做得很好！再挑戰一次${level.name}難度會更厲害！`:'每學會一題，都是守護地球的一步！');const promises=['💧 今天我要記得關水龍頭。','♻️ 今天我要做好垃圾分類。','🌳 今天我要愛護花草樹木。','🐢 今天我要一起保護海洋生物。','💡 今天離開房間要記得關燈。'];trialPromiseText.textContent=promises[Math.floor(Math.random()*promises.length)];trialPromiseBtn.textContent='我願意做到 ✓';trialPromiseBtn.classList.remove('accepted');const s=loadTrialStats(),today=dateStr();if(s.date!==today){s.date=today;s.plays=0}s.plays=(s.plays||0)+1;s.bestByLevel=Array.isArray(s.bestByLevel)?s.bestByLevel:[s.best||0,0,0,0];if(total===5)s.bestByLevel[trialDifficulty]=Math.max(s.bestByLevel[trialDifficulty]||0,trialScore);if(trialDaily)s.dailyDate=today;saveTrialStats(s);updateTrialStatsView();if(typeof burst==='function')burst('🎉',14)}
function acceptTrialPromise(){trialPromiseBtn.textContent='太棒了！一起做到 🌱';trialPromiseBtn.classList.add('accepted')}
function trialToGoogleLogin(){exitTrialMode();setTimeout(()=>{document.getElementById('googleLoginBtn')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('googleLoginBtn')?.focus()},100)}

/* ===== V10.6.1：基地棲地互動與文字清晰度 ===== */
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeExplorationHabitat();});
