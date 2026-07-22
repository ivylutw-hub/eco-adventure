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
  rows.forEach((x,i)=>{const row=document.createElement('div');row.className='rank-row'+(x.uid===cloudUser.uid?' me':'');const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);row.innerHTML=`<div class="rank-no">${medal}</div><div class="rank-player"><span class="rank-avatar">${String(x.avatar||'🌱').includes('/')?`<img class="guardian-avatar-img" src="${x.avatar}" alt="守護者">`:(x.avatar||'🌱')}</span><div><b>${escapeRankText(x.name||'環保守護者')}</b><small>Lv.${Number(x.level)||1}・完成 ${Number(x.completedUnits)||0} 單元</small></div></div><div class="rank-points"><b>${Number(x.points)||0}</b><small>本週積分</small></div>`;list.appendChild(row)});setCloudStatus('online','☁️ 排行榜已更新');
 }catch(err){console.error(err);list.innerHTML='<div class="empty-ranking">目前無法更新雲端排行，已保留你的本週積分；網路恢復後可按「更新排行」。</div>';setCloudStatus('offline','☁️ 排行榜暫時離線，遊戲進度不受影響')}
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
