(() => {
  "use strict";
  const Q = window.QUESTION_BANK || [];
  const UNIT_SIZE = 10;
  const UNITS = window.UNIT_PLAN || [];
  const TARGET = 80;
  const AVATARS = ["🌱","🐢","🐼","🦊","🐬","🦉","🐝","🌻","🐧","🦁","🐸","🐨"];
  const UNIT_COUNT = UNITS.length || Math.ceil(Q.length / UNIT_SIZE);
  const $ = (id) => document.getElementById(id);
  const screens = ["loginScreen","profileScreen","homeScreen","quizScreen","resultScreen"];
  const show = (id) => screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  const todayKey = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei"}).format(new Date());

  let auth, db, uid = null, selectedAvatar = AVATARS[0];
  let profile = null, currentUnit = 0, currentQuestions = [], qIndex = 0;
  let selectedAnswer = null, submitted = false, correctCount = 0, wrongAnswers = [];

  const googleProvider = new firebase.auth.GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });
  let loginInProgress = false;

  function authErrorText(err) {
    const code = err?.code || "";
    if (code.includes("popup-closed-by-user")) return "登入視窗已關閉，請再試一次。";
    if (code.includes("popup-blocked")) return "瀏覽器封鎖了登入視窗，請允許彈出式視窗後再試。";
    if (code.includes("unauthorized-domain")) return "目前網站網址尚未加入 Firebase 授權網域。";
    if (code.includes("operation-not-allowed")) return "Firebase 尚未啟用 Google 登入。";
    if (code.includes("network-request-failed")) return "網路連線異常，請稍後再試。";
    if (code.includes("cancelled-popup-request")) return "登入程序已重新啟動，請稍候再按一次。";
    return `Google 登入失敗（${code || "未知錯誤"}），請稍後再試。`;
  }

  async function signInWithGoogle() {
    if (loginInProgress) return;
    loginInProgress = true;
    const button = $("googleLoginBtn");
    $("loginError").textContent = "";
    button.disabled = true;
    button.textContent = "正在開啟 Google 登入…";

    try {
      await auth.signInWithPopup(googleProvider);
    } catch (err) {
      console.error("Google sign-in error:", err);
      $("loginError").textContent = authErrorText(err);
    } finally {
      loginInProgress = false;
      button.disabled = false;
      button.innerHTML = '<span class="google-mark">G</span> 使用 Google 帳號登入';
    }
  }

  $("questionTotal").textContent = Q.length.toLocaleString();
  $("avatarChoices").innerHTML = AVATARS.map((a,i)=>`<button type="button" class="avatar ${i===0?"selected":""}" data-avatar="${a}">${a}</button>`).join("");
  $("avatarChoices").addEventListener("click", e => {
    const b = e.target.closest("[data-avatar]"); if(!b) return;
    selectedAvatar=b.dataset.avatar;
    document.querySelectorAll(".avatar").forEach(x=>x.classList.toggle("selected",x===b));
  });

  function localKey(){ return uid ? `ecoPlayer:${uid}` : "ecoPlayer:local"; }
  function defaultProfile(name, avatar){
    return {name,avatar,coins:0,exp:0,completedUnits:0,bestAccuracy:0,lastLoginReward:"",unitBest:{},createdAt:Date.now(),updatedAt:Date.now()};
  }
  function loadLocal(){
    try { return JSON.parse(localStorage.getItem(localKey()) || "null"); } catch { return null; }
  }
  function saveLocal(){ if(profile) localStorage.setItem(localKey(),JSON.stringify(profile)); }

  async function saveCloud(){
    if(!db || !uid || !profile) return;
    profile.updatedAt=Date.now(); saveLocal();
    try {
      await db.collection("users").doc(uid).set(profile,{merge:true});
      $("cloudStatus").textContent="☁️ 已同步";
    } catch(err) {
      console.error(err); $("cloudStatus").textContent="⚠️ 離線保存";
    }
  }
  async function loadCloud(){
    const local=loadLocal();
    if(!db || !uid) return local;
    try {
      const snap=await db.collection("users").doc(uid).get();
      return snap.exists ? {...local,...snap.data()} : local;
    } catch(err){ console.error(err); return local; }
  }
  async function dailyLoginReward(){
    if(profile.lastLoginReward !== todayKey()){
      profile.lastLoginReward=todayKey(); profile.coins=(profile.coins||0)+1;
      await saveCloud();
      setTimeout(()=>alert("🎁 今日首次登入，獲得 1 枚金幣！"),150);
    }
  }
  function renderHeader(){
    $("coinCount").textContent=profile?.coins||0;
    $("expCount").textContent=profile?.exp||0;
    $("levelCount").textContent=Math.floor((profile?.exp||0)/500)+1;
  }
  function renderHome(){
    renderHeader();
    $("welcomeName").textContent=profile.name;
    $("currentAvatar").textContent=profile.avatar;
    $("completedUnits").textContent=profile.completedUnits||0;
    $("bestAccuracy").textContent=`${profile.bestAccuracy||0}%`;
    const grouped = {};
    UNITS.forEach((u, i) => {
      (grouped[u.world] ||= {name:u.worldName, items:[]}).items.push({u,i});
    });
    $("unitGrid").innerHTML = Object.values(grouped).map(group => `
      <section class="world-section">
        <div class="world-heading">
          <div><p class="eyebrow">循序漸進題庫</p><h3>${escapeHtml(group.name)}</h3></div>
          <span>${group.items.length} 個單元</span>
        </div>
        <div class="world-unit-grid">
          ${group.items.map(({u,i}) => {
            const best = Number(profile.unitBest?.[i] || 0);
            const stars = best === 100 ? "★★★" : best >= 90 ? "★★★" : best >= 80 ? "★★" : "☆";
            return `<button class="unit-card card" data-unit="${i}">
              <div class="unit-meta"><span>總單元 ${u.unit}</span><span class="stars">${stars}</span></div>
              <h3>${escapeHtml(u.title)}</h3>
              <div class="unit-meta"><span>${escapeHtml(u.mixLabel)}｜${u.count} 題</span><span>最佳 ${best}%</span></div>
            </button>`;
          }).join("")}
        </div>
      </section>`).join("");
    show("homeScreen");
  }
  $("unitGrid").addEventListener("click",e=>{
    const card=e.target.closest("[data-unit]"); if(card) startUnit(Number(card.dataset.unit));
  });

  function startUnit(i){
    currentUnit=i; const meta=UNITS[i]; currentQuestions=meta ? Q.slice(meta.start,meta.start+meta.count) : Q.slice(i*UNIT_SIZE,(i+1)*UNIT_SIZE);
    qIndex=0; correctCount=0; wrongAnswers=[]; selectedAnswer=null; submitted=false;
    show("quizScreen"); renderQuestion();
  }
  function renderQuestion(){
    const q=currentQuestions[qIndex]; selectedAnswer=null; submitted=false;
    $("unitTitle").textContent=UNITS[currentUnit] ? `${UNITS[currentUnit].worldName}｜總單元 ${UNITS[currentUnit].unit}｜${UNITS[currentUnit].mixLabel}` : `單元 ${currentUnit+1}`;
    $("questionProgress").textContent=`第 ${qIndex+1} 題／共 ${currentQuestions.length} 題`;
    $("progressBar").style.width=`${(qIndex/currentQuestions.length)*100}%`;
    $("questionLevel").textContent=q.level || "綜合";
    $("questionText").textContent=q.question;
    $("optionList").innerHTML=q.options.map((o,i)=>`<button class="option" data-option="${i}"><strong>${"ABCD"[i]}.</strong> ${escapeHtml(o)}</button>`).join("");
    $("submitAnswerBtn").disabled=true; $("submitAnswerBtn").classList.remove("hidden");
    $("feedbackBox").className="feedback hidden"; $("feedbackBox").innerHTML="";
    $("nextQuestionBtn").classList.add("hidden");
  }
  $("optionList").addEventListener("click",e=>{
    if(submitted) return; const b=e.target.closest("[data-option]"); if(!b) return;
    selectedAnswer=Number(b.dataset.option);
    document.querySelectorAll(".option").forEach(x=>x.classList.toggle("selected",x===b));
    $("submitAnswerBtn").disabled=false;
  });
  $("submitAnswerBtn").addEventListener("click",()=>{
    if(selectedAnswer===null||submitted) return;
    submitted=true; const q=currentQuestions[qIndex]; const ok=selectedAnswer===q.answer;
    if(ok) correctCount++; else wrongAnswers.push({q,selected:selectedAnswer});
    document.querySelectorAll(".option").forEach((b,i)=>{
      b.disabled=true; b.classList.remove("selected");
      if(i===q.answer)b.classList.add("correct");
      if(i===selectedAnswer&&!ok)b.classList.add("wrong");
    });
    $("feedbackBox").className=`feedback ${ok?"good":"bad"}`;
    $("feedbackBox").innerHTML=`<strong>${ok?"✅ 答對了！":"❌ 再想一想"}</strong><br>
      正確答案：${"ABCD"[q.answer]}. ${escapeHtml(q.options[q.answer])}<br><br>
      <strong>解析：</strong>${escapeHtml(q.explanation||"題庫未提供解析。")}`;
    $("submitAnswerBtn").classList.add("hidden"); $("nextQuestionBtn").classList.remove("hidden");
    $("nextQuestionBtn").textContent=qIndex===currentQuestions.length-1?"查看成績":"下一題";
  });
  $("nextQuestionBtn").addEventListener("click",()=>{
    if(qIndex<currentQuestions.length-1){qIndex++;renderQuestion();} else finishUnit();
  });

  async function finishUnit(){
    const accuracy=Math.round(correctCount/currentQuestions.length*100);
    const passed=accuracy>=TARGET;
    profile.exp=(profile.exp||0)+correctCount*10;
    profile.bestAccuracy=Math.max(profile.bestAccuracy||0,accuracy);
    profile.unitBest=profile.unitBest||{};
    const firstPass=Number(profile.unitBest[currentUnit]||0)<TARGET && passed;
    profile.unitBest[currentUnit]=Math.max(Number(profile.unitBest[currentUnit]||0),accuracy);
    if(firstPass) profile.completedUnits=(profile.completedUnits||0)+1;
    if(passed) profile.coins=(profile.coins||0)+1; // 每次達標都獎勵，無每日上限
    await saveCloud(); renderHeader();
    $("resultIcon").textContent=passed?"🎉":"📚";
    $("resultTitle").textContent=passed?"成功達標！":"再複習一下就能過關";
    $("scoreText").textContent=`${correctCount}/${currentQuestions.length}`;
    $("accuracyText").textContent=`正確率 ${accuracy}%`;
    $("rewardText").textContent=passed?"🪙 正確率達到 80%，獲得 1 枚金幣！":"正確率未達 80%，本次不發金幣；可重新挑戰。";
    $("wrongSummary").innerHTML=wrongAnswers.length?`<h3>錯題複習</h3>${wrongAnswers.map((w,i)=>`<div class="wrong-item"><strong>${i+1}. ${escapeHtml(w.q.question)}</strong><br><small>你的答案：${"ABCD"[w.selected]}　正確答案：${"ABCD"[w.q.answer]}</small></div>`).join("")}`:"<p>🌟 本單元全部答對！</p>";
    show("resultScreen");
  }

  $("retryBtn").addEventListener("click",()=>startUnit(currentUnit));
  $("resultHomeBtn").addEventListener("click",renderHome);
  $("backHomeBtn").addEventListener("click",()=>{ if(confirm("確定離開本次挑戰嗎？目前作答不會保存。")) renderHome(); });


  $("googleLoginBtn").addEventListener("click", signInWithGoogle);
  $("accountBtn").addEventListener("click", () => {
    const user = auth.currentUser;
    $("accountInfo").innerHTML = `
      <p>${user?.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="">` : "👤"}
      <strong>${escapeHtml(user?.displayName || profile?.name || "守護者")}</strong></p>
      <p>${escapeHtml(user?.email || "")}</p>`;
    $("accountDialog").showModal();
  });
  $("closeAccount").addEventListener("click", () => $("accountDialog").close());
  $("logoutBtn").addEventListener("click", async () => {
    $("accountDialog").close();
    await auth.signOut();
    profile = null; uid = null;
    $("accountBtn").classList.add("hidden");
    $("cloudStatus").textContent = "☁️ 尚未登入";
    show("loginScreen");
  });

  $("createProfileBtn").addEventListener("click",async()=>{
    const name=$("playerName").value.trim();
    if(!name){$("profileError").textContent="請輸入守護者暱稱。";return;}
    profile=defaultProfile(name,selectedAvatar); await dailyLoginReward(); await saveCloud(); renderHome();
  });

  $("leaderboardBtn").addEventListener("click",async()=>{
    const box=$("leaderboardList"); box.innerHTML="<p>讀取中…</p>"; $("leaderboardDialog").showModal();
    if(!db){box.innerHTML="<p>目前為離線模式，無法讀取雲端排行榜。</p>";return;}
    try{
      const snap=await db.collection("users").orderBy("exp","desc").limit(20).get();
      let rank=0; box.innerHTML=snap.empty?"<p>尚無排行榜資料。</p>":snap.docs.map(d=>{
        rank++; const p=d.data(); return `<div class="rank-row"><span>${rank<=3?["🥇","🥈","🥉"][rank-1]:rank}</span><span>${escapeHtml(p.avatar||"🌱")} ${escapeHtml(p.name||"守護者")}</span><strong>${Number(p.exp||0)} EXP</strong></div>`;
      }).join("");
    }catch(err){console.error(err);box.innerHTML="<p>排行榜暫時無法讀取，請確認 Firestore 規則已發布。</p>";}
  });
  $("closeLeaderboard").addEventListener("click",()=>$("leaderboardDialog").close());

  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

  async function init(){
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();

      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          uid = null;
          profile = null;
          $("cloudStatus").textContent = "☁️ 尚未登入";
          $("accountBtn").classList.add("hidden");
          show("loginScreen");
          return;
        }

        uid = user.uid;
        $("cloudStatus").textContent = "☁️ Google 已登入";
        $("accountBtn").classList.remove("hidden");
        profile = await loadCloud();

        if (profile) {
          await dailyLoginReward();
          renderHome();
        } else {
          $("playerName").value = user.displayName || "";
          show("profileScreen");
        }
      });
    } catch (err) {
      console.error("Firebase init error:", err);
      $("cloudStatus").textContent = "⚠️ Firebase 連線失敗";
      $("loginError").textContent = "目前無法連上登入服務，請重新整理頁面。";
      show("loginScreen");
    }
  }
  init();
})();
