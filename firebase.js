/* ===== V9.1 Google 登入、雲端存檔與每週排行榜 ===== */
let cloudDb=null, cloudAuth=null, cloudUser=null, cloudReady=false, cloudSaveTimer=null, cloudLoading=false;
let cloudRetryTimer=null, cloudWriteInProgress=false, cloudWriteQueued=false, cloudIsAdmin=false;

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
  dailyLogin();save();enterGame();
  await syncAllCloudData(!snap.exists);
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
async function showAdminDashboard(){
 if(!cloudIsAdmin){toast('此帳號沒有管理者權限');return;}
 page('adminPage');await loadAdminDashboard();
}
async function loadAdminDashboard(){
 const summary=document.getElementById('adminSummary'),list=document.getElementById('adminPlayerList');
 if(!summary||!list||!cloudDb||!cloudIsAdmin)return;
 list.innerHTML='<div class="empty-ranking">正在讀取玩家資料…</div>';
 try{
  const snap=await cloudDb.collection('players').limit(300).get();
  const rows=snap.docs.map(doc=>({uid:doc.id,...doc.data()})).sort((a,b)=>(Number(b.guardianExp)||0)-(Number(a.guardianExp)||0)||timestampMillis(b.updatedAt)-timestampMillis(a.updatedAt));
  const totalExp=rows.reduce((n,x)=>n+(Number(x.guardianExp)||0),0);
  const totalCoins=rows.reduce((n,x)=>n+(Number(x.coins)||0),0);
  summary.innerHTML=`<div><small>玩家數量</small><b>${rows.length}</b></div><div><small>守護經驗總計</small><b>${totalExp}</b></div><div><small>玩家金幣總計</small><b>${totalCoins}</b></div>`;
  list.innerHTML='';
  if(!rows.length){list.innerHTML='<div class="empty-ranking">目前沒有玩家資料。</div>';return;}
  rows.forEach(x=>{
   const row=document.createElement('div');row.className='admin-player-row';
   row.innerHTML=`<div><strong>${escapeRankText(x.displayName||x.state?.name||'未命名玩家')}</strong><small>${escapeRankText(x.uid)}</small></div><div><small>守護經驗</small><b>${Number(x.guardianExp)||0}</b></div><div><small>金幣</small><b>${Number(x.coins)||0}</b></div><div><small>最後更新</small><b>${adminDate(x.updatedAt)}</b></div>`;
   list.appendChild(row);
  });
 }catch(err){console.error('管理後臺載入失敗',err);list.innerHTML='<div class="empty-ranking">無法讀取管理資料，請確認 Firestore Rules 已部署且此玩家 isAdmin 為 true。</div>';}
}

ensureWeeklyLocal();
document.addEventListener('DOMContentLoaded',()=>{
 const backBtn=document.getElementById('backToStageBtn');
 if(backBtn)backBtn.addEventListener('click',backToStage);
});
window.addEventListener('online',()=>{setCloudStatus('online','☁️ 網路已恢復，正在自動同步。');scheduleCloudSave();});
window.addEventListener('offline',()=>setCloudStatus('offline','⚠️ 目前離線，進度會先保留在本機。'));
initFirebase();
