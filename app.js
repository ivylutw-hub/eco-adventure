(() => {
  "use strict";
  const Q = window.QUESTION_BANK || [];
  const UNIT_SIZE = 10;
  const UNITS = window.UNIT_PLAN || [];
  const TARGET = 80;
  const AVATARS = ["🌱","🐢","🐼","🦊","🐬","🦉","🐝","🌻","🐧","🦁","🐸","🐨"];
  const UNIT_COUNT = UNITS.length || Math.ceil(Q.length / UNIT_SIZE);
  const $ = (id) => document.getElementById(id);
  const screens = ["loginScreen","profileScreen","homeScreen","worldScreen","quizScreen","resultScreen"];
  const show = (id) => screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  const todayKey = () => new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Taipei"}).format(new Date());

  let auth, db, uid = null, selectedAvatar = AVATARS[0];
  let profile = null, currentUnit = 0, currentQuestions = [], qIndex = 0;
  let selectedAnswer = null, submitted = false, correctCount = 0, wrongAnswers = [];
  let editSelectedAvatar = AVATARS[0];
  let selectedWorld = 1, unitPage = 1;
  const UNITS_PER_PAGE = 12;

  let googleProvider = null;
  let loginInProgress = false;

  function authErrorText(err) {
    const code = err?.code || "";
    if (code.includes("popup-closed-by-user")) return "Google 登入視窗已關閉，請再試一次。";
    if (code.includes("popup-blocked")) return "瀏覽器封鎖了 Google 登入視窗，請允許此網站開啟彈出式視窗。";
    if (code.includes("cancelled-popup-request")) return "登入要求被重複啟動，請稍候再按一次。";
    if (code.includes("unauthorized-domain")) return "目前網站網址尚未加入 Firebase 授權網域。";
    if (code.includes("operation-not-allowed")) return "Firebase 尚未啟用 Google 登入。";
    if (code.includes("network-request-failed")) return "網路連線異常，請稍後再試。";
    if (code.includes("web-storage-unsupported")) return "瀏覽器封鎖了登入所需的網站儲存空間，請允許 Cookie。";
    if (code.includes("user-disabled")) return "這個 Google 帳號目前已停用。";
    return `Google 登入失敗（${code || err?.message || "未知錯誤"}），請重新整理後再試。`;
  }

  function resetGoogleLoginButton(){
    loginInProgress = false;
    const button = $("googleLoginBtn");
    if(button){
      button.disabled = false;
      button.innerHTML = '<span class="google-mark">G</span> 使用 Google 帳號登入';
    }
  }

  async function signInWithGoogle() {
    if (loginInProgress || auth?.currentUser) return;
    if (!auth || !googleProvider) {
      $("loginError").textContent = "登入服務仍在初始化，請稍候 1 秒再試。";
      return;
    }

    loginInProgress = true;
    const button = $("googleLoginBtn");
    $("loginError").textContent = "";
    if (button) {
      button.disabled = true;
      button.textContent = "正在開啟 Google 登入…";
    }

    try {
      await auth.signInWithPopup(googleProvider);
    } catch (err) {
      console.error("Google popup sign-in error:", err);
      $("loginError").textContent = authErrorText(err);
    } finally {
      resetGoogleLoginButton();
    }
  }

  $("questionTotal").textContent = Q.length.toLocaleString();
  $("avatarChoices").innerHTML = AVATARS.map((a,i)=>`<button type="button" class="avatar ${i===0?"selected":""}" data-avatar="${a}">${a}</button>`).join("");
  function renderEditAvatarChoices(){
    if(!$("editAvatarChoices")) return;
    editSelectedAvatar = profile?.avatar || AVATARS[0];
    $("editAvatarChoices").innerHTML = AVATARS.map(a =>
      `<button type="button" class="avatar ${a===editSelectedAvatar?"selected":""}" data-edit-avatar="${a}">${a}</button>`
    ).join("");
  }

  $("avatarChoices").addEventListener("click", e => {
    const b = e.target.closest("[data-avatar]"); if(!b) return;
    selectedAvatar=b.dataset.avatar;
    document.querySelectorAll(".avatar").forEach(x=>x.classList.toggle("selected",x===b));
  });

  $("editAvatarChoices")?.addEventListener("click", e => {
    const b = e.target.closest("[data-edit-avatar]");
    if(!b) return;
    editSelectedAvatar = b.dataset.editAvatar;
    document.querySelectorAll("[data-edit-avatar]").forEach(x =>
      x.classList.toggle("selected", x===b)
    );
  });

  function localKey(){ return uid ? `ecoPlayer:${uid}` : "ecoPlayer:local"; }
  function defaultProfile(name, avatar){
    return {name,avatar,coins:0,exp:0,completedUnits:0,bestAccuracy:0,lastLoginReward:"",unitBest:{},weaknessNotes:[],quizDraft:null,dailyAnswered:{date:"",count:0},createdAt:Date.now(),updatedAt:Date.now()};
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
    if($("coinCount")) $("coinCount").textContent=profile?.coins||0;
    if($("expCount")) $("expCount").textContent=profile?.exp||0;
    if($("levelCount")) $("levelCount").textContent=Math.floor((profile?.exp||0)/500)+1;
  }
  function ensureLearningData(){
    profile.weaknessNotes = Array.isArray(profile.weaknessNotes) ? profile.weaknessNotes : [];
    profile.quizDraft = profile.quizDraft || null;
    profile.dailyAnswered = profile.dailyAnswered || {date:"",count:0};
    if(profile.dailyAnswered.date !== todayKey()){
      profile.dailyAnswered = {date:todayKey(),count:0};
    }
  }

  function unlockedBadges(){
    ensureLearningData();
    return [
      {icon:"🌱",name:"綠芽新手",desc:"完成第一個達標單元",earned:(profile.completedUnits||0)>=1},
      {icon:"💧",name:"節水守護者",desc:"累積 300 EXP",earned:(profile.exp||0)>=300},
      {icon:"♻️",name:"回收小隊長",desc:"完成 5 個達標單元",earned:(profile.completedUnits||0)>=5},
      {icon:"🌳",name:"森林之友",desc:"最佳正確率達 90%",earned:(profile.bestAccuracy||0)>=90},
      {icon:"🌍",name:"地球英雄",desc:"完成 20 個達標單元",earned:(profile.completedUnits||0)>=20}
    ];
  }

  function renderHome(){
    ensureLearningData();
    renderHeader();
    $("guardianNameCard").textContent=profile.name;
    $("currentAvatar").textContent=profile.avatar;
    $("coinCard").textContent=profile.coins||0;
    $("completedUnits").textContent=profile.completedUnits||0;
    $("bestAccuracy").textContent=`${profile.bestAccuracy||0}%`;

    const level=Math.floor((profile.exp||0)/500)+1;
    const withinLevel=(profile.exp||0)%500;
    $("homeLevel").textContent=level;
    $("homeExp").textContent=profile.exp||0;
    $("levelMeterFill").style.width=`${Math.min(100,withinLevel/500*100)}%`;

    const dailyCount=Math.min(10,profile.dailyAnswered.count||0);
    $("dailyAnswered").textContent=dailyCount;
    $("dailyProgressFill").style.width=`${dailyCount*10}%`;

    $("weaknessCount").textContent=profile.weaknessNotes.length;
    $("resumeDraftBtn").classList.toggle("hidden",!profile.quizDraft);

    const badges=unlockedBadges();
    const earnedCount=badges.filter(b=>b.earned).length;
    $("badgeCount").textContent=`${earnedCount}／${badges.length}`;
    $("guardianBadges").innerHTML=badges.map(b=>`
      <div class="guardian-badge ${b.earned?"earned":"locked"}" title="${escapeHtml(b.desc)}">
        <span>${b.earned?b.icon:"🔒"}</span>
        <small>${escapeHtml(b.name)}</small>
      </div>`).join("");

    $("homeNavBtn").classList.remove("hidden");
    $("leaderboardTopBtn").classList.remove("hidden");
    $("profileTopBtn").classList.remove("hidden");
    $("logoutTopBtn").classList.remove("hidden");

    const tips=[
      ["隨手關燈，節省能源","離開房間時記得關燈，讓環保不只存在題目裡。"],
      ["自備水壺，減少一次性塑膠","今天出門帶上自己的水壺，少用一個塑膠杯。"],
      ["分類回收，讓資源再生","丟垃圾前多看一眼，確認紙類、塑膠與一般垃圾是否分對。"],
      ["珍惜食物，減少廚餘","吃多少拿多少，剩食減量也能降低環境負擔。"],
      ["步行短程，減少碳排","短距離移動試著用步行代替搭車，也能順便活動身體。"]
    ];
    const tip=tips[new Date().getDate()%tips.length];
    $("greenTipTitle").textContent=tip[0];
    $("greenTipText").textContent=tip[1];

    const grouped = {};
    UNITS.forEach((u,i)=>(grouped[u.world] ||= {name:u.worldName,items:[]}).items.push({u,i}));
    const icons={1:"🌱",2:"🌳",3:"🐢",4:"🏆"};
    const monster={1:"黏黏塑膠怪",2:"煙霧耗能獸",3:"棲地破壞王",4:"終極污染魔王"};
    const descriptions={
      1:"建立環保基礎觀念",
      2:"練習判斷與應用",
      3:"挑戰中高級競賽題",
      4:"迎戰高級環保魔王"
    };
    let totalCompleted=0;
    $("worldCards").innerHTML=Object.entries(grouped).map(([world,group],idx)=>{
      const completed=group.items.filter(({i})=>Number(profile.unitBest?.[i]||0)>=TARGET).length;
      totalCompleted+=completed;
      const unlocked = idx===0 || totalCompleted>0 || (profile.completedUnits||0)>=idx*3;
      return `<button class="adventure-stage w${world} ${unlocked?"":"locked"}" data-world="${world}" ${unlocked?"":"disabled"}>
        <div class="stage-path-dot">${unlocked?icons[world]:"🔒"}</div>
        <div class="stage-copy">
          <small>第 ${world} 關</small>
          <h3>${escapeHtml(monster[world])}</h3>
          <p>${escapeHtml(descriptions[world])}</p>
          <span>${completed}／${group.items.length} 單元達標</span>
        </div>
        <strong>›</strong>
      </button>`;
    }).join("");
    $("adventureProgress").textContent=`${profile.completedUnits||0}／${UNITS.length} 關`;
    show("homeScreen");
  }

  function renderWorld(){
    const items=UNITS.map((u,i)=>({u,i})).filter(x=>x.u.world===selectedWorld);
    const totalPages=Math.max(1,Math.ceil(items.length/UNITS_PER_PAGE));
    unitPage=Math.min(Math.max(1,unitPage),totalPages);
    const start=(unitPage-1)*UNITS_PER_PAGE;
    const pageItems=items.slice(start,start+UNITS_PER_PAGE);
    const info={
      1:["🌱 綠芽初級區","先建立基礎，再慢慢接觸中級題。"],
      2:["🌳 森林中級區","中級題為主，逐步加入中高級挑戰。"],
      3:["🐢 守護者菁英區","中高級題為主，開始適應高級競賽題。"],
      4:["🏆 環保競賽區","高級題集中挑戰，完成最後的環保守護任務。"]
    }[selectedWorld];
    $("worldEyebrow").textContent=`WORLD ${selectedWorld}`;
    $("worldPageTitle").textContent=info[0];
    $("worldPageDescription").textContent=info[1];
    $("worldUnitCount").textContent=`共 ${items.length} 個單元`;
    $("unitPageLabel").textContent=`第 ${unitPage}／${totalPages} 頁`;
    $("prevUnitPage").disabled=unitPage===1;
    $("nextUnitPage").disabled=unitPage===totalPages;
    $("unitGrid").innerHTML=pageItems.map(({u,i})=>{
      const best=Number(profile.unitBest?.[i]||0);
      const stars=best===100?"★★★":best>=90?"★★★":best>=80?"★★":"☆";
      return `<button class="unit-card card" data-unit="${i}">
        <div class="unit-meta"><span>總單元 ${u.unit}</span><span class="stars">${stars}</span></div>
        <h3>${escapeHtml(u.title)}</h3>
        <div class="unit-meta"><span>${escapeHtml(u.mixLabel)}｜${u.count} 題</span><span>最佳 ${best}%</span></div>
      </button>`;
    }).join("");
    show("worldScreen");
  }

  $("worldCards")?.addEventListener("click",e=>{
    const card=e.target.closest("[data-world]"); if(!card) return;
    selectedWorld=Number(card.dataset.world); unitPage=1; renderWorld();
  });
  $("backDashboardBtn")?.addEventListener("click",renderHome);
  $("prevUnitPage")?.addEventListener("click",()=>{unitPage--;renderWorld();});
  $("nextUnitPage")?.addEventListener("click",()=>{unitPage++;renderWorld();});
  $("continueBtn")?.addEventListener("click",()=>{
    const firstIncomplete=UNITS.findIndex((u,i)=>Number(profile.unitBest?.[i]||0)<TARGET);
    if(firstIncomplete<0){selectedWorld=4;unitPage=1;renderWorld();return;}
    selectedWorld=UNITS[firstIncomplete].world;
    const worldIndex=UNITS.filter(u=>u.world===selectedWorld).findIndex(u=>u.unit===UNITS[firstIncomplete].unit);
    unitPage=Math.floor(worldIndex/UNITS_PER_PAGE)+1;
    renderWorld();
  });
  $("profileShortcutBtn")?.addEventListener("click",openGuardianProfile);
  $("profileHomeBtn")?.addEventListener("click",openGuardianProfile);
  $("leaderboardHomeBtn")?.addEventListener("click",openLeaderboard);
  $("resumeDraftBtn")?.addEventListener("click",()=>{
    if(profile?.quizDraft) startUnit(Number(profile.quizDraft.unit),profile.quizDraft);
  });

  function renderWeaknessNotes(){
    ensureLearningData();
    const notes=profile.weaknessNotes;
    $("weaknessList").innerHTML=notes.length?notes.map((n,i)=>`
      <article class="weakness-note">
        <div class="weakness-note-head">
          <span>👾 弱點 ${i+1}</span>
          <small>${escapeHtml(n.level||"綜合")}</small>
        </div>
        <h3>${escapeHtml(n.question)}</h3>
        <p class="my-wrong-answer">你當時選擇：${escapeHtml(n.selectedLabel)}</p>
        <div class="weakness-explanation"><strong>📖 解析</strong><p>${escapeHtml(n.explanation)}</p></div>
      </article>`).join("")
      : `<div class="empty-notes">✨ 還沒有怪獸弱點筆記，繼續保持！</div>`;
  }
  $("weaknessNotesBtn")?.addEventListener("click",()=>{
    renderWeaknessNotes();
    $("weaknessDialog").showModal();
  });
  $("closeWeakness")?.addEventListener("click",()=>$("weaknessDialog").close());
  $("clearWeaknessBtn")?.addEventListener("click",async()=>{
    if(!confirm("確定清除全部怪獸弱點筆記嗎？")) return;
    profile.weaknessNotes=[];
    await saveCloud();
    renderWeaknessNotes();
    renderHome();
  });

  $("rulesBtn")?.addEventListener("click",()=>$("rulesDialog").showModal());
  $("closeRules")?.addEventListener("click",()=>$("rulesDialog").close());
  $("homeNavBtn")?.addEventListener("click",renderHome);

  $("unitGrid")?.addEventListener("click",e=>{
    const card=e.target.closest("[data-unit]"); if(card) startUnit(Number(card.dataset.unit));
  });

  function startUnit(i, resumeDraft=null){
    currentUnit=i;
    const meta=UNITS[i];
    currentQuestions=meta ? Q.slice(meta.start,meta.start+meta.count) : Q.slice(i*UNIT_SIZE,(i+1)*UNIT_SIZE);
    qIndex=resumeDraft?.qIndex||0;
    correctCount=resumeDraft?.correctCount||0;
    wrongAnswers=resumeDraft?.wrongAnswers||[];
    selectedAnswer=resumeDraft?.selectedAnswer ?? null;
    submitted=false;
    show("quizScreen");
    renderQuestion(resumeDraft);
  }
  function renderQuestion(resumeDraft=null){
    const q=currentQuestions[qIndex];
    selectedAnswer=resumeDraft?.selectedAnswer ?? null;
    submitted=false;
    answerSaved=Boolean(resumeDraft?.answerSaved);

    $("unitTitle").textContent=UNITS[currentUnit] ? `${UNITS[currentUnit].worldName}｜總單元 ${UNITS[currentUnit].unit}｜${UNITS[currentUnit].mixLabel}` : `單元 ${currentUnit+1}`;
    $("questionProgress").textContent=`第 ${qIndex+1} 題／共 ${currentQuestions.length} 題`;
    $("progressBar").style.width=`${(qIndex/currentQuestions.length)*100}%`;
    $("questionLevel").textContent=q.level || "綜合";
    $("questionText").textContent=q.question;
    $("optionList").innerHTML=q.options.map((o,i)=>`<button class="option ${selectedAnswer===i?"selected":""}" data-option="${i}"><strong>${"ABCD"[i]}.</strong> ${escapeHtml(o)}</button>`).join("");

    $("submitAnswerBtn").disabled=selectedAnswer===null;
    $("saveUnitProgressBtn").classList.remove("hidden");
    $("submitAnswerBtn").classList.remove("hidden");
    $("unitSaveStatus").textContent=resumeDraft
      ? "✅ 已載入上次儲存的單元進度，可以接續作答。"
      : "單元尚未做完時，可先儲存，之後從首頁接續作答。";
    $("feedbackBox").className="feedback hidden";
    $("feedbackBox").innerHTML="";
    $("nextQuestionBtn").classList.add("hidden");
  }
  $("optionList")?.addEventListener("click",e=>{
    if(submitted) return; const b=e.target.closest("[data-option]"); if(!b) return;
    selectedAnswer=Number(b.dataset.option);
    document.querySelectorAll(".option").forEach(x=>x.classList.toggle("selected",x===b));
    $("submitAnswerBtn").disabled=false;
    $("unitSaveStatus").textContent="已選擇答案；可直接送出，或先儲存整個單元進度。";
  });
  $("saveUnitProgressBtn")?.addEventListener("click",async()=>{
    if(submitted) return;
    ensureLearningData();
    profile.quizDraft={
      unit:currentUnit,
      qIndex,
      selectedAnswer,
      correctCount,
      wrongAnswers,
      savedAt:Date.now()
    };
    await saveCloud();
    $("unitSaveStatus").textContent=`✅ 已儲存：第 ${qIndex+1} 題／共 ${currentQuestions.length} 題。之後可從首頁繼續。`;
  });

  $("submitAnswerBtn")?.addEventListener("click",()=>{
    if(selectedAnswer===null||submitted) return;
    submitted=true;
    const q=currentQuestions[qIndex];
    const ok=selectedAnswer===q.answer;

    if(ok) correctCount++;
    else {
      wrongAnswers.push({q,selected:selectedAnswer});
      ensureLearningData();
      const note={
        id:`${currentUnit}-${qIndex}-${Date.now()}`,
        question:q.question,
        selectedLabel:`${"ABCD"[selectedAnswer]}. ${q.options[selectedAnswer]}`,
        explanation:q.explanation||"題庫未提供解析。",
        level:q.level||"綜合",
        createdAt:Date.now()
      };
      profile.weaknessNotes.unshift(note);
      profile.weaknessNotes=profile.weaknessNotes.slice(0,100);
    }
    profile.quizDraft={
      unit:currentUnit,
      qIndex,
      selectedAnswer:null,
      correctCount,
      wrongAnswers,
      savedAt:Date.now()
    };
    saveCloud();

    document.querySelectorAll(".option").forEach((b,i)=>{
      b.disabled=true;
      b.classList.remove("selected","correct","wrong");

      // 答對時才標示正確選項；答錯時只標示玩家選錯的選項，
      // 不以顏色或文字洩漏正確答案。
      if(ok && i===q.answer) b.classList.add("correct");
      if(!ok && i===selectedAnswer) b.classList.add("wrong");
    });

    $("feedbackBox").className=`feedback ${ok?"good":"bad"}`;

    if(ok){
      $("feedbackBox").innerHTML=`
        <strong>✅ 答對了！</strong>
        <div class="explanation-panel">
          <strong>📖 題目解析</strong>
          <p>${escapeHtml(q.explanation||"題庫未提供解析。")}</p>
        </div>`;
    }else{
      $("feedbackBox").innerHTML=`
        <strong>❌ 再想一想</strong>
        <div class="explanation-panel">
          <strong>📖 題目解析</strong>
          <p>${escapeHtml(q.explanation||"題庫未提供解析。")}</p>
        </div>
        <div class="thinking-hint">
          🌱 請根據解析重新想想四個選項，正確答案暫時不公布。
        </div>`;
    }

    $("saveUnitProgressBtn").classList.add("hidden");
    $("submitAnswerBtn").classList.add("hidden");
    $("nextQuestionBtn").classList.remove("hidden");
    $("nextQuestionBtn").textContent=qIndex===currentQuestions.length-1?"查看成績":"我了解了，下一題";
  });
  $("nextQuestionBtn")?.addEventListener("click",async()=>{
    ensureLearningData();
    profile.dailyAnswered.count=Math.min(10,(profile.dailyAnswered.count||0)+1);
    if(qIndex<currentQuestions.length-1){
      qIndex++;
      selectedAnswer=null;
      profile.quizDraft={
        unit:currentUnit,
        qIndex,
        selectedAnswer:null,
        correctCount,
        wrongAnswers,
        savedAt:Date.now()
      };
      await saveCloud();
      renderQuestion();
    }else{
      profile.quizDraft=null;
      await saveCloud();
      finishUnit();
    }
  });

  async function finishUnit(){
    const accuracy=Math.round(correctCount/currentQuestions.length*100);
    const passed=accuracy>=TARGET;
    profile.quizDraft=null;
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
    $("wrongSummary").innerHTML=wrongAnswers.length
      ? `<h3>📚 錯題複習</h3>
         <p class="muted">系統不直接公布正確答案，請先回想剛才看到的解析，再重新挑戰。</p>
         ${wrongAnswers.map((w,i)=>`
           <div class="wrong-item">
             <strong>${i+1}. ${escapeHtml(w.q.question)}</strong><br>
             <small>你選的是：${"ABCD"[w.selected]}. ${escapeHtml(w.q.options[w.selected])}</small>
           </div>`).join("")}`
      : "<p>🌟 本單元全部答對！</p>";
    show("resultScreen");
  }

  $("retryBtn")?.addEventListener("click",()=>startUnit(currentUnit));
  $("resultHomeBtn")?.addEventListener("click",renderHome);
  $("backHomeBtn")?.addEventListener("click",async()=>{
    if(confirm("要先儲存目前答題進度再離開嗎？")){
      ensureLearningData();
      profile.quizDraft={
        unit:currentUnit,qIndex,selectedAnswer,
        correctCount,wrongAnswers,savedAt:Date.now()
      };
      await saveCloud();
      renderHome();
    }else if(confirm("確定不儲存並離開嗎？")){
      profile.quizDraft=null;
      await saveCloud();
      renderHome();
    }
  });


  $("googleLoginBtn")?.addEventListener("click", signInWithGoogle);
  function openGuardianProfile(){
    const user = auth.currentUser;
    $("accountInfo").innerHTML = `
      <p>${user?.photoURL ? `<img src="${escapeHtml(user.photoURL)}" alt="Google 帳號照片">` : "👤"}
      <strong>${escapeHtml(user?.displayName || "Google 使用者")}</strong></p>
      <p>${escapeHtml(user?.email || "")}</p>`;
    $("editPlayerName").value = profile?.name || "";
    $("editProfileMessage").textContent = "";
    renderEditAvatarChoices();
    $("accountDialog").showModal();
  }

  $("accountBtn")?.addEventListener("click", openGuardianProfile);
  $("profileTopBtn")?.addEventListener("click", openGuardianProfile);

  $("closeAccount")?.addEventListener("click", () => $("accountDialog")?.close());
  $("saveProfileBtn")?.addEventListener("click", async () => {
    const newName = $("editPlayerName").value.trim();
    if(!newName){
      $("editProfileMessage").textContent = "請輸入守護者暱稱。";
      return;
    }
    profile.name = newName;
    profile.avatar = editSelectedAvatar;
    await saveCloud();
    $("editProfileMessage").textContent = "✅ 角色設定已儲存。";
    renderHome();
    setTimeout(() => {
      if($("accountDialog").open) $("accountDialog").close();
    }, 450);
  });

  async function logoutCurrentUser(){
    try{
      if ($("accountDialog")?.open) $("accountDialog").close();
      resetGoogleLoginButton();
      await auth.signOut();

      // 登出後完整重新載入，清除舊的登入與畫面狀態。
      const cleanUrl = window.location.origin + window.location.pathname;
      window.location.replace(cleanUrl);
    }catch(err){
      console.error("Logout error:", err);
      alert("登出失敗，請重新整理頁面後再試。");
    }
  }
  $("logoutBtn")?.addEventListener("click", logoutCurrentUser);
  $("logoutTopBtn")?.addEventListener("click", logoutCurrentUser);

  $("createProfileBtn")?.addEventListener("click",async()=>{
    const name=$("playerName").value.trim();
    if(!name){$("profileError").textContent="請輸入守護者暱稱。";return;}
    profile=defaultProfile(name,selectedAvatar); await dailyLoginReward(); await saveCloud(); renderHome();
  });

  async function openLeaderboard(){
    const box=$("leaderboardList");
    if(!box || !$("leaderboardDialog")) return;
    box.innerHTML="<p>讀取中…</p>";
    $("leaderboardDialog").showModal();
    if(!db){box.innerHTML="<p>目前為離線模式，無法讀取雲端排行榜。</p>";return;}
    try{
      const snap=await db.collection("users").orderBy("exp","desc").limit(20).get();
      let rank=0;
      box.innerHTML=snap.empty?"<p>尚無排行榜資料。</p>":snap.docs.map(d=>{
        rank++;
        const p=d.data();
        return `<div class="rank-row"><span>${rank<=3?["🥇","🥈","🥉"][rank-1]:rank}</span><span>${escapeHtml(p.avatar||"🌱")} ${escapeHtml(p.name||"守護者")}</span><strong>${Number(p.exp||0)} EXP</strong></div>`;
      }).join("");
    }catch(err){
      console.error(err);
      box.innerHTML="<p>排行榜暫時無法讀取，請稍後再試。</p>";
    }
  }
  $("leaderboardBtn")?.addEventListener("click",openLeaderboard);
  $("leaderboardTopBtn")?.addEventListener("click",openLeaderboard);
  $("closeLeaderboard")?.addEventListener("click",()=>$("leaderboardDialog")?.close());

  function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));}

  async function init(){
    try {
      firebase.initializeApp(window.FIREBASE_CONFIG);
      auth = firebase.auth();
      db = firebase.firestore();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      googleProvider = new firebase.auth.GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: "select_account" });

      auth.onAuthStateChanged(async (user) => {
        if (!user) {
          uid = null;
          profile = null;
          resetGoogleLoginButton();
          if ($("loginError")) $("loginError").textContent = "";
          $("cloudStatus").textContent = "☁️ 尚未登入";
          $("accountBtn")?.classList.add("hidden");
          $("homeNavBtn")?.classList.add("hidden");
          $("leaderboardTopBtn")?.classList.add("hidden");
          $("profileTopBtn")?.classList.add("hidden");
          $("logoutTopBtn")?.classList.add("hidden");
          show("loginScreen");
          return;
        }

        uid = user.uid;
        $("cloudStatus").textContent = "☁️ Google 已登入";
        $("accountBtn")?.classList.remove("hidden");
        $("homeNavBtn")?.classList.remove("hidden");
        $("leaderboardTopBtn")?.classList.remove("hidden");
        $("profileTopBtn")?.classList.remove("hidden");
        $("logoutTopBtn")?.classList.remove("hidden");

        profile = await loadCloud();
        if (profile) {
          await dailyLoginReward();
          try{
            renderHome();
          }catch(homeErr){
            console.error("Homepage render error:",homeErr);
            $("cloudStatus").textContent="⚠️ 首頁載入異常";
            if($("loginError")) $("loginError").textContent="首頁載入發生錯誤，請重新上傳最新版檔案後再整理頁面。";
            show("loginScreen");
          }
        } else {
          $("playerName").value = user.displayName || "";
          show("profileScreen");
        }
      });
    } catch (err) {
      console.error("Firebase init error:", err);
      $("cloudStatus").textContent = "⚠️ Firebase 連線失敗";
      if ($("loginError")) $("loginError").textContent = authErrorText(err);
      show("loginScreen");
    }
  }
  init();
})();
