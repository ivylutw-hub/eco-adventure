/* ===== V9.1 Google 登入、雲端存檔與每週排行榜 ===== */
let cloudDb=null, cloudAuth=null, cloudUser=null, cloudReady=false, cloudSaveTimer=null, cloudLoading=false;
let cloudRetryTimer=null, cloudWriteInProgress=false, cloudWriteQueued=false, cloudIsAdmin=false;
let adminPlayersCache=[],adminQuestionsCache=[],adminEventsCache=[],adminRankingCache=[];
window.ECO_ACTIVE_EVENTS=[];window.ECO_CUSTOM_QUESTIONS=[];

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
 const id=currentWeekId(),ruleVersion='v9.0-question-exp';
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
function setCloudStatus(mode,text){const el=document.getElementById('cloudStatus');if(el){el.className='cloud-status '+mode;el.textContent=text}}
function notifyCloudError(message){
 setCloudStatus('offline',message);
 if(typeof toast==='function')toast(message);
}

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
   else{cloudIsAdmin=false;updateAdminAccess();setGoogleButton(false,'🟢 使用 Google 開始冒險');loginMessage('使用同一個 Google 帳號，可在不同設備接續進度。');}
  });
 }catch(err){console.error('Firebase 初始化失敗',err);loginMessage('Firebase 初始化失敗，請檢查設定。');setGoogleButton(false,'重新嘗試 Google 登入');}
}
async function googleLogin(){
 if(!cloudAuth){await initFirebase();if(!cloudAuth)return;}
 setGoogleButton(true,'正在開啟 Google 登入…');
 const provider=new firebase.auth.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 try{await cloudAuth.signInWithPopup(provider)}catch(err){
  if(['auth/popup-blocked','auth/cancelled-popup-request','auth/operation-not-supported-in-this-environment'].includes(err.code)){
   await cloudAuth.signInWithRedirect(provider);return;
  }
  console.error('Google 登入失敗',err);loginMessage(err.code==='auth/unauthorized-domain'?'此 GitHub 網域尚未加入 Firebase 授權網域。':'Google 登入未完成，請再試一次。');setGoogleButton(false,'🟢 使用 Google 開始冒險');
 }
}
function playerDoc(){return cloudDb.collection('players').doc(cloudUser.uid)}
function weeklyDoc(){return cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').doc(cloudUser.uid)}
function playerFields(includeCreatedAt=false){
 const data={
  uid:cloudUser.uid,
  displayName:cloudUser.displayName||st.name||'',
  photoURL:cloudUser.photoURL||'',
  guardianExp:Number(st.exp)||0,
  coins:Number(st.coins)||0,
  stageProgress:st.unitProgress||st.completed||{},
  totalAnswered:Number(st.totalAnswered)||0,
  todayAnswered:Number(st.todayAnswered)||0,
  todayAnsweredDate:st.todayAnsweredDate||'',
  lastActiveAt:firebase.firestore.FieldValue.serverTimestamp(),
  state:st,
  updatedAt:firebase.firestore.FieldValue.serverTimestamp()
 };
 if(includeCreatedAt)data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
 return data;
}
function weeklyFields(){
 const w=ensureWeeklyLocal(),av=avatarById(st.avatar);
 return {
  uid:cloudUser.uid,
  name:(st.name||cloudUser.displayName||'環保守護者').slice(0,12),
  avatar:av.icon,
  level:currentLevel(),
  guardianExp:Number(st.exp)||0,
  coins:Number(st.coins)||0,
  points:Number(w.points)||0,
  completedUnits:w.completedKeys.length,
  perfectUnits:w.perfectKeys.length,
  updatedAt:firebase.firestore.FieldValue.serverTimestamp()
 };
}
async function writeWithRetry(label,writeFn,maxAttempts=3){
 let lastError;
 for(let attempt=1;attempt<=maxAttempts;attempt++){
  try{return await writeFn();}
  catch(err){
   lastError=err;console.error(`${label}失敗（第 ${attempt} 次）`,err);
   if(attempt<maxAttempts)await new Promise(resolve=>setTimeout(resolve,500*attempt));
  }
 }
 throw lastError;
}

function activeEventValid(event){
 if(!event||event.active!==true)return false;
 const end=timestampMillis(event.endAt)||Date.parse(event.endDate||'')||0;
 return !end||end>=Date.now();
}
async function loadActiveActivities(){
 if(!cloudDb)return;
 try{
  const snap=await cloudDb.collection('activities').where('active','==',true).get();
  window.ECO_ACTIVE_EVENTS=snap.docs.map(d=>({id:d.id,...d.data()})).filter(activeEventValid);
 }catch(err){console.error('載入活動失敗',err);window.ECO_ACTIVE_EVENTS=[];}
}
async function loadCustomQuestions(){
 if(!cloudDb)return;
 try{
  const snap=await cloudDb.collection('customQuestions').where('active','==',true).limit(300).get();
  window.ECO_CUSTOM_QUESTIONS=snap.docs.map(d=>({docId:d.id,...d.data()}));
 }catch(err){console.error('載入後臺題目失敗',err);window.ECO_CUSTOM_QUESTIONS=[];}
}
window.customQuestionsForUnit=function(stageId,unitNumber){
 return (window.ECO_CUSTOM_QUESTIONS||[]).filter(q=>q.stageId===stageId&&Number(q.unit)===Number(unitNumber)).map(q=>({
   id:`custom_${q.docId}`,level:q.level||'',q:q.q||'',opts:Array.isArray(q.opts)?q.opts.slice(0,4):[],ans:Number(q.ans)||0,exp:q.exp||''
 })).filter(q=>q.q&&q.opts.length===4);
};
window.getActiveExpMultiplier=function(){
 return (window.ECO_ACTIVE_EVENTS||[]).filter(e=>e.type==='doubleExp'&&activeEventValid(e)).reduce((m,e)=>Math.max(m,Number(e.value)||2),1);
};
function applyLoginActivityRewards(){
 if(!st.eventClaims||typeof st.eventClaims!=='object')st.eventClaims={};
 const today=typeof localDateKey==='function'?localDateKey():new Date().toISOString().slice(0,10);
 let gained=0;
 (window.ECO_ACTIVE_EVENTS||[]).filter(e=>e.type==='loginCoins'&&activeEventValid(e)).forEach(e=>{
   const key=`${e.id}|${today}`;
   if(!st.eventClaims[key]){const amount=Math.max(0,Number(e.value)||0);st.coins+=amount;gained+=amount;st.eventClaims[key]=true;}
 });
 if(gained&&typeof toast==='function')setTimeout(()=>toast(`🎁 活動每日登入獎勵：+${gained} 金幣`),700);
}

async function loadCloudPlayer(){
 if(!cloudReady||cloudLoading)return;cloudLoading=true;
 try{
  const snap=await playerDoc().get();
  const data=snap.exists?snap.data():null;
  cloudIsAdmin=Boolean(data&&data.isAdmin===true);
  updateAdminAccess();
  const localSameUser=st.cloudUid===cloudUser.uid;
  if(data&&data.state){
   const remote={...defaultState(),...data.state};
   const localTime=localSameUser?(Date.parse(st.savedAt||0)||0):0;
   const remoteTime=Date.parse(remote.savedAt||0)||0;
   // 只有同一個 Google UID 才能比較並沿用本機進度，避免不同帳號互相污染。
   st=(localSameUser&&localTime>remoteTime)?{...defaultState(),...st}:remote;
  }else if(data){
   // 相容早期只有頂層欄位、尚未包含完整 state 的玩家文件。
   // 若目前本機資料屬於另一個 UID，先從乾淨狀態建立，不能沿用舊玩家資料。
   const base=localSameUser?{...defaultState(),...st}:defaultState();
   st={...base,exp:Number(data.guardianExp)||0,coins:Number(data.coins)||0,unitProgress:data.stageProgress||base.unitProgress||{}};
  }else{
   // 新 Google 帳號沒有雲端文件時，必須建立獨立的新玩家狀態。
   // 同一台裝置切換帳號時，絕不可把上一個帳號的名稱、進度、金幣與經驗帶過來。
   st=localSameUser?{...defaultState(),...st}:defaultState();
   st.name=(cloudUser.displayName||'環保守護者').slice(0,12);
  }
  st.loggedIn=true;st.cloudUid=cloudUser.uid;
  ensureProgress();ensureProfile();ensureWeeklyLocal();selectedLoginAvatar=st.avatar||'fox';nameInput.value=st.name;
  await Promise.all([loadActiveActivities(),loadCustomQuestions()]);
  dailyLogin();applyLoginActivityRewards();save();enterGame();
  await syncAllCloudData(!snap.exists);
  await playerDoc().set({lastLoginAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true}).catch(err=>console.error('更新登入時間失敗',err));
  loginMessage(`已登入：${cloudUser.displayName||'Google 使用者'}`);setGoogleButton(false,'✅ 已登入');setCloudStatus('online','☁️ 雲端進度已同步');
 }catch(err){
  console.error('載入雲端存檔失敗',err);loginMessage('雲端存檔載入失敗，已保留本機資料，可稍後重試。');setGoogleButton(false,'重新嘗試 Google 登入');notifyCloudError('⚠️ 雲端載入失敗，遊戲仍可繼續');
 }finally{cloudLoading=false}
}
function scheduleCloudSave(){
 if(!cloudReady||cloudLoading||!st.loggedIn)return;
 clearTimeout(cloudSaveTimer);cloudSaveTimer=setTimeout(()=>syncAllCloudData(false),350);
}
async function syncAllCloudData(isNewPlayer=false){
 if(!cloudReady||!cloudDb||!cloudUser||!st.loggedIn)return;
 if(cloudWriteInProgress){cloudWriteQueued=true;return;}
 cloudWriteInProgress=true;clearTimeout(cloudRetryTimer);
 try{
  await writeWithRetry('玩家雲端存檔',()=>playerDoc().set(playerFields(isNewPlayer),{merge:true}));
  await writeWithRetry('排行榜資料同步',()=>weeklyDoc().set(weeklyFields(),{merge:true}));
  setCloudStatus('online','☁️ 雲端進度已同步');
 }catch(err){
  console.error('Firestore 同步最終失敗',err);notifyCloudError('⚠️ 雲端同步失敗，資料已保留在本機');
  cloudRetryTimer=setTimeout(()=>syncAllCloudData(false),5000);
 }finally{
  cloudWriteInProgress=false;
  if(cloudWriteQueued){cloudWriteQueued=false;scheduleCloudSave();}
 }
}
async function saveCloudNow(){return syncAllCloudData(false)}
async function syncWeeklyProfile(){return syncAllCloudData(false)}
async function addWeeklyQuestionPoints(amount){
 const add=Number(amount)||0;if(add<=0)return;
 const w=ensureWeeklyLocal();w.points=(Number(w.points)||0)+add;save();
}
async function recordWeeklyUnitProgress(stageId,unitIndex,first,firstPerfect){
 const w=ensureWeeklyLocal(),key=`${stageId}|${unitIndex}`;let changed=false;
 if(first&&!w.completedKeys.includes(key)){w.completedKeys.push(key);changed=true;}
 if(firstPerfect&&!w.perfectKeys.includes(key)){w.perfectKeys.push(key);changed=true;}
 if(changed)save();
}
function timestampMillis(value){
 if(!value)return 0;
 if(typeof value.toMillis==='function')return value.toMillis();
 if(value.seconds)return Number(value.seconds)*1000;
 return Date.parse(value)||0;
}
async function refreshLeaderboard(){
 ensureWeeklyLocal();const label=document.getElementById('weekLabel'),pts=document.getElementById('myWeeklyPoints'),rank=document.getElementById('myWeeklyRank'),list=document.getElementById('leaderboardList');
 if(label)label.textContent=`${currentWeekId()}（${weekDateRange()}）`;if(pts)pts.textContent=Number(st.exp)||0;if(!list)return;
 if(!cloudReady){if(rank)rank.textContent='—';list.innerHTML='<div class="empty-ranking">請先使用 Google 登入，才能查看共同排行榜。</div>';setCloudStatus('offline','☁️ 尚未登入 Google');return;}
 try{
  // 排行榜頁面只讀取；玩家資料已在登入、答題及存檔流程同步。
  const snap=await cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').limit(500).get();
  const rows=snap.docs.map(d=>d.data()).sort((a,b)=>{
   const expDiff=(Number(b.guardianExp)||0)-(Number(a.guardianExp)||0);
   return expDiff||timestampMillis(b.updatedAt)-timestampMillis(a.updatedAt);
  });
  if(!rows.length){list.innerHTML='<div class="empty-ranking">本週還沒有排名紀錄。</div>';if(rank)rank.textContent='—';return;}
  const myIndex=rows.findIndex(x=>x.uid===cloudUser.uid);if(rank)rank.textContent=myIndex>=0?`第 ${myIndex+1} 名`:'500 名以外';list.innerHTML='';
  rows.forEach((x,i)=>{const row=document.createElement('div');row.className='rank-row'+(x.uid===cloudUser.uid?' me':'');const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);row.innerHTML=`<div class="rank-no">${medal}</div><div class="rank-player"><span class="rank-avatar">${String(x.avatar||'🌱').includes('/')?`<img class="guardian-avatar-img" src="${x.avatar}" alt="守護者">`:(x.avatar||'🌱')}</span><div><b>${escapeRankText(x.name||'環保守護者')}</b><small>Lv.${Number(x.level)||1}・完成 ${Number(x.completedUnits)||0} 單元</small></div></div><div class="rank-points"><b>${Number(x.guardianExp)||0}</b><small>守護經驗</small></div>`;list.appendChild(row);});setCloudStatus('online','☁️ 排行榜已更新');
 }catch(err){console.error('讀取排行榜失敗',err);list.innerHTML='<div class="empty-ranking">目前無法讀取雲端排行，遊戲進度不受影響。</div>';setCloudStatus('offline','☁️ 排行榜暫時離線，遊戲進度不受影響');}
}
function escapeRankText(v){const d=document.createElement('div');d.textContent=String(v);return d.innerHTML}
function showLeaderboard(){page('leaderboardPage');refreshLeaderboard()}
const _v80finish=finish;finish=function(){ensureProgress();const wasFirst=!doneSet(stage.id).has(unit),wasFirstPerfect=score===quiz.length&&!((st.coinAwarded||{})[`${stage.id}|${unit}`]),sid=stage.id,ui=unit;_v80finish();recordWeeklyUnitProgress(sid,ui,wasFirst,wasFirstPerfect)};
const _v80profile=saveProfileName;saveProfileName=function(){_v80profile();saveCloudNow()};
const _v80avatar=chooseAvatar;chooseAvatar=function(id){_v80avatar(id);saveCloudNow()};
async function logout(){
 await saveCloudNow();st.loggedIn=false;save();logoutModal.classList.add('hide');game.classList.add('hide');loginPage.classList.remove('hide');
 cloudIsAdmin=false;updateAdminAccess();if(cloudAuth)await cloudAuth.signOut();setGoogleButton(false,'🟢 使用 Google 開始冒險');
}
function updateAdminAccess(){
 const btn=document.getElementById('adminNavBtn');
 if(btn)btn.classList.toggle('hide',!cloudIsAdmin);
 if(!cloudIsAdmin&&!document.getElementById('adminPage')?.classList.contains('hide'))showMap();
}
function adminDate(value){
 const ms=timestampMillis(value);return ms?new Date(ms).toLocaleString('zh-TW'):'—';
}
function todayStart(){const d=new Date();d.setHours(0,0,0,0);return d.getTime()}
function switchAdminTab(name,button){
 document.querySelectorAll('.admin-panel').forEach(x=>x.classList.add('hide'));
 const panel=document.getElementById('adminTab'+name.charAt(0).toUpperCase()+name.slice(1));if(panel)panel.classList.remove('hide');
 document.querySelectorAll('.admin-tabs button').forEach(x=>x.classList.remove('active'));if(button)button.classList.add('active');
 if(name==='players')loadAdminPlayers();if(name==='questions')loadAdminQuestions();if(name==='events')loadAdminEvents();if(name==='ranking')loadAdminRanking();
}
async function showAdminDashboard(){
 if(!cloudIsAdmin){toast('此帳號沒有管理者權限');return;}
 page('adminPage');await loadAdminDashboard();
}
async function loadAdminDashboard(){
 if(!cloudDb||!cloudIsAdmin)return;
 try{
  await loadAdminPlayers(false);
  const rows=adminPlayersCache,now=Date.now(),today=todayStart(),weekAgo=now-7*86400000;
  const totalExp=rows.reduce((n,x)=>n+(Number(x.guardianExp)||0),0);
  const totalCoins=rows.reduce((n,x)=>n+(Number(x.coins)||0),0);
  const totalAnswered=rows.reduce((n,x)=>n+(Number(x.totalAnswered??x.state?.totalAnswered)||0),0);
  const todayAnswered=rows.reduce((n,x)=>n+((x.todayAnsweredDate===new Date().toISOString().slice(0,10))?(Number(x.todayAnswered)||0):0),0);
  const todayLogins=rows.filter(x=>timestampMillis(x.lastLoginAt)>=today).length;
  const active=rows.filter(x=>timestampMillis(x.lastActiveAt||x.updatedAt)>=weekAgo).length;
  const summary=document.getElementById('adminSummary');
  summary.innerHTML=[
   ['玩家總數',rows.length],['今日登入',todayLogins],['活躍玩家（7天）',active],
   ['全站經驗值',totalExp],['全站金幣',totalCoins],['題目作答數',totalAnswered],['今日答題數',todayAnswered]
  ].map(x=>`<div><small>${x[0]}</small><b>${x[1]}</b></div>`).join('');
  await Promise.all([loadAdminQuestions(false),loadAdminEvents(false),loadAdminRanking(false)]);
 }catch(err){console.error('管理後臺載入失敗',err);document.getElementById('adminSummary').innerHTML='<div class="empty-ranking">無法讀取管理資料，請先部署 V9.2 firestore.rules。</div>';}
}
async function loadAdminPlayers(render=true){
 if(!cloudDb||!cloudIsAdmin)return;
 const snap=await cloudDb.collection('players').limit(500).get();
 adminPlayersCache=snap.docs.map(d=>({uid:d.id,...d.data()})).sort((a,b)=>(Number(b.guardianExp)||0)-(Number(a.guardianExp)||0));
 if(render)renderAdminPlayers();
}
function renderAdminPlayers(){
 const list=document.getElementById('adminPlayerList');if(!list)return;
 const key=(document.getElementById('adminPlayerSearch')?.value||'').trim().toLowerCase();
 const rows=adminPlayersCache.filter(x=>`${x.displayName||x.state?.name||''} ${x.uid}`.toLowerCase().includes(key));
 list.innerHTML=rows.length?'':'<div class="empty-ranking">找不到符合的玩家。</div>';
 rows.forEach(x=>{
  const row=document.createElement('div');row.className='admin-player-editor';
  row.innerHTML=`<div class="admin-player-name"><strong>${escapeRankText(x.displayName||x.state?.name||'未命名玩家')}</strong><small>${escapeRankText(x.uid)}</small></div>
   <label>金幣<input type="number" min="0" data-field="coins" value="${Number(x.coins)||0}"></label>
   <label>經驗值<input type="number" min="0" data-field="guardianExp" value="${Number(x.guardianExp)||0}"></label>
   <label>關卡進度<select data-field="stage"><option value="">保持目前</option><option value="s1">完成 Stage 1</option><option value="s2">完成至 Stage 2</option><option value="s3">完成至 Stage 3</option><option value="s4">完成全部 Stage</option><option value="reset">重設關卡進度</option></select></label>
   <label class="admin-check"><input type="checkbox" data-field="isAdmin" ${x.isAdmin===true?'checked':''}> 管理員</label>
   <button class="primary" onclick="adminSavePlayer('${x.uid}',this)">儲存</button>`;
  list.appendChild(row);
 });
}
function completedStateThrough(stageId,state){
 const next={...state,completed:{...(state.completed||{})},unitProgress:{...(state.unitProgress||{})},unitScores:{...(state.unitScores||{})}};
 if(stageId==='reset'){next.completed={};next.unitProgress={};next.unitScores={};return next;}
 const max=S.findIndex(s=>s.id===stageId);
 S.forEach((s,i)=>{if(i<=max){const count=unitCount(s.id);next.completed[s.id]=Array.from({length:count},(_,n)=>n);next.unitProgress[s.id]=Array(count).fill(10);next.unitScores[s.id]=Array(count).fill(10);}});
 return next;
}
async function adminSavePlayer(uid,button){
 const row=button.closest('.admin-player-editor'),coins=Math.max(0,Number(row.querySelector('[data-field="coins"]').value)||0),exp=Math.max(0,Number(row.querySelector('[data-field="guardianExp"]').value)||0);
 const stageValue=row.querySelector('[data-field="stage"]').value,isAdminValue=row.querySelector('[data-field="isAdmin"]').checked;
 const original=adminPlayersCache.find(x=>x.uid===uid)||{},state={...(original.state||{})};
 state.coins=coins;state.exp=exp;if(stageValue)Object.assign(state,completedStateThrough(stageValue,state));
 button.disabled=true;
 try{await cloudDb.collection('players').doc(uid).set({coins,guardianExp:exp,stageProgress:state.unitProgress||{},state,isAdmin:isAdminValue,updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});toast('玩家資料已更新');await loadAdminPlayers();}
 catch(err){console.error('更新玩家失敗',err);toast('更新失敗，請檢查 Firestore Rules');}
 finally{button.disabled=false;}
}
async function saveAdminQuestion(event){
 event.preventDefault();
 const stageId=adminQuestionStage.value,unit=Number(adminQuestionUnit.value),max=unitCount(stageId);
 if(unit<1||unit>max){toast(`此 Stage 的單元範圍是 1～${max}`);return;}
 const data={stageId,unit,level:adminQuestionLevel.value,q:adminQuestionText.value.trim(),opts:[adminOption0.value.trim(),adminOption1.value.trim(),adminOption2.value.trim(),adminOption3.value.trim()],ans:Number(adminQuestionAnswer.value),exp:adminQuestionExplanation.value.trim(),active:true,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
 try{await cloudDb.collection('customQuestions').add(data);event.target.reset();adminQuestionUnit.value=1;toast('題目已新增');await loadAdminQuestions();await loadCustomQuestions();}
 catch(err){console.error('新增題目失敗',err);toast('新增題目失敗');}
}
async function loadAdminQuestions(render=true){
 if(!cloudDb||!cloudIsAdmin)return;
 const snap=await cloudDb.collection('customQuestions').limit(300).get();adminQuestionsCache=snap.docs.map(d=>({id:d.id,...d.data()}));
 if(render)renderAdminQuestions();
}
function renderAdminQuestions(){
 const list=document.getElementById('adminQuestionList');if(!list)return;
 list.innerHTML=adminQuestionsCache.length?'':'<div class="empty-ranking">尚未新增後臺題目。</div>';
 adminQuestionsCache.forEach(q=>{const d=document.createElement('div');d.className='admin-data-card';d.innerHTML=`<div><b>${escapeRankText(q.q)}</b><small>${q.stageId.toUpperCase()}・單元 ${q.unit}・${q.level||''}</small></div><label class="admin-check"><input type="checkbox" ${q.active!==false?'checked':''} onchange="adminToggleDoc('customQuestions','${q.id}',this.checked)"> 啟用</label><button class="danger small" onclick="adminDeleteDoc('customQuestions','${q.id}','題目')">刪除</button>`;list.appendChild(d);});
}
async function saveAdminEvent(event){
 event.preventDefault();const end=adminEventEnd.value?new Date(adminEventEnd.value+'T23:59:59'):null;
 const data={name:adminEventName.value.trim(),type:adminEventType.value,value:Number(adminEventValue.value)||0,description:adminEventDescription.value.trim(),active:true,endAt:end?firebase.firestore.Timestamp.fromDate(end):null,createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
 try{await cloudDb.collection('activities').add(data);event.target.reset();adminEventValue.value=2;toast('活動已建立');await loadAdminEvents();await loadActiveActivities();}
 catch(err){console.error('建立活動失敗',err);toast('建立活動失敗');}
}
async function loadAdminEvents(render=true){
 if(!cloudDb||!cloudIsAdmin)return;const snap=await cloudDb.collection('activities').limit(100).get();adminEventsCache=snap.docs.map(d=>({id:d.id,...d.data()}));if(render)renderAdminEvents();
}
function renderAdminEvents(){
 const list=document.getElementById('adminEventList');if(!list)return;list.innerHTML=adminEventsCache.length?'':'<div class="empty-ranking">目前沒有活動。</div>';
 adminEventsCache.forEach(e=>{const d=document.createElement('div');d.className='admin-data-card';d.innerHTML=`<div><b>${escapeRankText(e.name||'未命名活動')}</b><small>${escapeRankText(e.type)}・數值 ${Number(e.value)||0}・結束 ${adminDate(e.endAt)}</small><p>${escapeRankText(e.description||'')}</p></div><label class="admin-check"><input type="checkbox" ${e.active===true?'checked':''} onchange="adminToggleDoc('activities','${e.id}',this.checked)"> 啟用</label><button class="danger small" onclick="adminDeleteDoc('activities','${e.id}','活動')">刪除</button>`;list.appendChild(d);});
}
async function adminToggleDoc(collection,id,active){try{await cloudDb.collection(collection).doc(id).update({active,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});toast(active?'已啟用':'已停用');if(collection==='activities')await loadActiveActivities();else await loadCustomQuestions();}catch(err){console.error(err);toast('更新失敗');}}
async function adminDeleteDoc(collection,id,label){if(!confirm(`確定刪除這個${label}？`))return;try{await cloudDb.collection(collection).doc(id).delete();toast(`${label}已刪除`);collection==='activities'?await loadAdminEvents():await loadAdminQuestions();}catch(err){console.error(err);toast('刪除失敗');}}
async function loadAdminRanking(render=true){
 if(!cloudDb||!cloudIsAdmin)return;const snap=await cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').limit(500).get();adminRankingCache=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(Number(b.guardianExp)||0)-(Number(a.guardianExp)||0));if(render)renderAdminRanking();
}
function renderAdminRanking(){const list=document.getElementById('adminRankingList');if(!list)return;list.innerHTML=adminRankingCache.length?'':'<div class="empty-ranking">本週沒有排行榜資料。</div>';adminRankingCache.forEach((x,i)=>{const d=document.createElement('div');d.className='admin-data-card';d.innerHTML=`<div><b>${i+1}. ${escapeRankText(x.name||'玩家')}</b><small>EXP ${Number(x.guardianExp)||0}・金幣 ${Number(x.coins)||0}</small></div>`;list.appendChild(d);});}
async function adminClearRanking(){if(!confirm('確定清空本週排行榜？此操作無法復原。'))return;await loadAdminRanking(false);const batch=cloudDb.batch();adminRankingCache.forEach(x=>batch.delete(cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').doc(x.id)));await batch.commit();toast('本週排行榜已清空');await loadAdminRanking();}
async function adminRebuildRanking(){await loadAdminPlayers(false);let done=0;for(let i=0;i<adminPlayersCache.length;i+=400){const batch=cloudDb.batch();adminPlayersCache.slice(i,i+400).forEach(x=>{const state=x.state||{},av=avatarById(state.avatar);batch.set(cloudDb.collection('weeklyRankings').doc(currentWeekId()).collection('players').doc(x.uid),{uid:x.uid,name:(state.name||x.displayName||'環保守護者').slice(0,12),avatar:av.icon,level:levelFromExp(x.guardianExp),guardianExp:Number(x.guardianExp)||0,coins:Number(x.coins)||0,points:Number(x.guardianExp)||0,completedUnits:Object.values(state.completed||{}).reduce((n,a)=>n+(Array.isArray(a)?a.length:0),0),updatedAt:firebase.firestore.FieldValue.serverTimestamp()},{merge:true});done++;});await batch.commit();}toast(`已重算 ${done} 位玩家`);await loadAdminRanking();}
async function adminExportRanking(){await loadAdminRanking(false);const rows=[['名次','玩家','UID','守護經驗','金幣'],...adminRankingCache.map((x,i)=>[i+1,x.name||'',x.uid||x.id,Number(x.guardianExp)||0,Number(x.coins)||0])];const csv='\ufeff'+rows.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download=`環保冒險王_${currentWeekId()}_排行榜.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}

ensureWeeklyLocal();
document.addEventListener('DOMContentLoaded',()=>{
 const backBtn=document.getElementById('backToStageBtn');
 if(backBtn)backBtn.addEventListener('click',backToStage);
});
window.addEventListener('online',()=>{setCloudStatus('online','☁️ 網路已恢復，正在自動同步。');scheduleCloudSave();});
window.addEventListener('offline',()=>setCloudStatus('offline','⚠️ 目前離線，進度會先保留在本機。'));
initFirebase();
