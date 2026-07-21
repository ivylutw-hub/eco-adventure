(() => {
  "use strict";
  const Q = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  const $ = id => document.getElementById(id);
  const screens = ["loginScreen","profileScreen","homeScreen","quizScreen","resultScreen"];
  const AVATARS = ["🌱","🐢","🐼","🦊","🐬","🦉","🐝","🌻","🐧","🦁","🐸","🐨"];
  const TOPICS = [
    {id:"ocean",icon:"🌊",name:"水與海洋",desc:"水資源、河川、海洋與水污染",words:["水","海","河","湖","濕地","地下水","污水","廢水","飲用水","水質","水庫","漁","珊瑚","海岸","海洋"]},
    {id:"forest",icon:"🌳",name:"森林與生態",desc:"動植物、生物多樣性與自然保育",words:["森林","生態","動物","植物","鳥","魚","昆蟲","棲地","物種","保育","外來種","野生","樹","雨林","自然保護"]},
    {id:"recycle",icon:"♻️",name:"資源與回收",desc:"垃圾減量、資源回收與綠色消費",words:["垃圾","回收","廢棄物","塑膠","包裝","資源","再利用","分類","清潔隊","環保標章","綠色消費","一次性","廚餘"]},
    {id:"energy",icon:"⚡",name:"能源與氣候",desc:"節能、再生能源、暖化與氣候變遷",words:["能源","節能","電","發電","太陽能","風力","核能","石油","煤","溫室","暖化","氣候","碳","二氧化碳","京都","再生能源"]},
    {id:"pollution",icon:"🏙️",name:"污染與健康",desc:"空氣、噪音、毒物及生活環境",words:["空氣","污染","噪音","菸","毒","化學","農藥","懸浮微粒","廢氣","臭味","健康","病","細菌","環境荷爾蒙","酸雨"]},
    {id:"general",icon:"🌍",name:"綜合挑戰",desc:"全題庫混合抽題，模擬競賽",words:[]}
  ];
  let auth=null, db=null, uid=null, isGuest=false;
  let profile=null, selectedAvatar=AVATARS[0];
  let quiz={topic:"general",title:"綜合挑戰",questions:[],index:0,selected:null,submitted:false,correct:0,wrong:[],answers:[]};

  const defaultProfile = () => ({name:"地球守護者",avatar:"🌱",exp:0,totalAnswered:0,totalCorrect:0,seenIds:[],wrongIds:[],topicStats:{},draft:null,updatedAt:Date.now()});
  const show = id => screens.forEach(s => $(s).classList.toggle("hidden",s!==id));
  const shuffle = arr => { const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; };
  const questionText = q => `${q.question||""} ${(q.explanation||"")}`;
  function classify(q){
    const text=questionText(q);
    let best="pollution", score=0;
    TOPICS.slice(0,-1).forEach(t=>{const n=t.words.reduce((s,w)=>s+(text.includes(w)?1:0),0);if(n>score){score=n;best=t.id;}});
    return best;
  }
  const pools = {};
  function buildPools(){TOPICS.forEach(t=>pools[t.id]=[]);Q.forEach(q=>{q._topic=classify(q);pools[q._topic].push(q);pools.general.push(q);});}
  const topicById=id=>TOPICS.find(t=>t.id===id)||TOPICS[TOPICS.length-1];
  const statsFor=id=>(profile.topicStats[id]||{answered:0,correct:0,seenIds:[]});
  const unique = a => [...new Set(a)];

  function setCloud(text){$("cloudStatus").textContent=text;}
  function renderAvatars(containerId,current,onPick){const box=$(containerId);box.innerHTML="";AVATARS.forEach(a=>{const b=document.createElement("button");b.type="button";b.className="avatar-btn"+(a===current?" selected":"");b.textContent=a;b.onclick=()=>{onPick(a);renderAvatars(containerId,a,onPick);};box.appendChild(b);});}
  function level(){return Math.max(1,Math.floor((profile?.exp||0)/100)+1);}

  async function saveProfile(){
    if(!profile)return; profile.updatedAt=Date.now(); localStorage.setItem(`eco-v2-${uid||"guest"}`,JSON.stringify(profile));
    if(db&&uid&&!isGuest){try{await db.collection("users").doc(uid).set(profile,{merge:true});setCloud("☁️ 已同步");}catch(e){console.error(e);setCloud("⚠️ 僅本機儲存");}}
    else setCloud("💾 已儲存");
  }
  async function loadProfile(){
    let data=null;
    if(db&&uid&&!isGuest){try{const snap=await db.collection("users").doc(uid).get();if(snap.exists)data=snap.data();}catch(e){console.error(e);}}
    if(!data){try{data=JSON.parse(localStorage.getItem(`eco-v2-${uid||"guest"}`)||"null");}catch(e){}}
    profile=Object.assign(defaultProfile(),data||{});profile.topicStats=profile.topicStats||{};profile.seenIds=profile.seenIds||[];profile.wrongIds=profile.wrongIds||[];
    return !!data;
  }
  async function enterAfterAuth(){const exists=await loadProfile();if(!exists||!profile.name){show("profileScreen");renderAvatars("avatarChoices",selectedAvatar,a=>selectedAvatar=a);}else renderHome();}

  function renderHome(){
    show("homeScreen");$("profileBtn").classList.remove("hidden");$("logoutBtn").classList.remove("hidden");
    $("guardianName").textContent=profile.name;$("currentAvatar").textContent=profile.avatar;$("levelCount").textContent=level();
    $("totalAnswered").textContent=profile.totalAnswered||0;$("overallAccuracy").textContent=profile.totalAnswered?Math.round(profile.totalCorrect/profile.totalAnswered*100)+"%":"0%";
    $("wrongCount").textContent=(profile.wrongIds||[]).length;$("resumeBtn").classList.toggle("hidden",!profile.draft);
    const grid=$("topicGrid");grid.innerHTML="";
    TOPICS.forEach(t=>{const s=statsFor(t.id),pool=pools[t.id]||[],seen=(s.seenIds||[]).length,pct=pool.length?Math.min(100,Math.round(seen/pool.length*100)):0,acc=s.answered?Math.round(s.correct/s.answered*100):0;const b=document.createElement("button");b.className="topic-card";b.innerHTML=`<span class="topic-icon">${t.icon}</span><h3>${t.name}</h3><p>${t.desc}</p><div class="topic-progress"><span style="width:${pct}%"></span></div><div class="topic-meta"><span>接觸 ${pct}%</span><span>正確率 ${acc}%</span></div>`;b.onclick=()=>startChallenge(t.id);grid.appendChild(b);});
  }

  function selectQuestions(topic,count=10,onlyWrong=false){
    let pool=onlyWrong?Q.filter(q=>(profile.wrongIds||[]).includes(q.id)):[...(pools[topic]||Q)];
    if(!pool.length)return [];
    const stat=statsFor(topic),recent=new Set((stat.seenIds||[]).slice(-40)),wrong=new Set(profile.wrongIds||[]),globalSeen=new Set(profile.seenIds||[]);
    const priority=shuffle(pool.filter(q=>wrong.has(q.id)&&!recent.has(q.id)));
    const unseen=shuffle(pool.filter(q=>!globalSeen.has(q.id)&&!priority.includes(q)));
    const old=shuffle(pool.filter(q=>!recent.has(q.id)&&!priority.includes(q)&&!unseen.includes(q)));
    const recentPool=shuffle(pool.filter(q=>!priority.includes(q)&&!unseen.includes(q)&&!old.includes(q)));
    return [...priority,...unseen,...old,...recentPool].slice(0,Math.min(count,pool.length));
  }
  function startChallenge(topic="general",onlyWrong=false,questions=null){
    const t=topicById(topic),picked=questions||selectQuestions(topic,10,onlyWrong);
    if(!picked.length){alert("目前沒有可練習的題目。");return;}
    quiz={topic,title:onlyWrong?"錯題複習":t.name,questions:picked,index:0,selected:null,submitted:false,correct:0,wrong:[],answers:[]};
    profile.draft={topic,title:quiz.title,ids:picked.map(q=>q.id),index:0,correct:0,wrong:[],answers:[]};saveProfile();show("quizScreen");renderQuestion();
  }
  function resumeDraft(){const d=profile.draft;if(!d)return;const qs=(d.ids||[]).map(id=>Q.find(q=>q.id===id)).filter(Boolean);if(!qs.length){profile.draft=null;saveProfile();renderHome();return;}quiz={topic:d.topic||"general",title:d.title||topicById(d.topic).name,questions:qs,index:Math.min(d.index||0,qs.length-1),selected:null,submitted:false,correct:d.correct||0,wrong:d.wrong||[],answers:d.answers||[]};show("quizScreen");renderQuestion();}
  function renderQuestion(){
    const q=quiz.questions[quiz.index];quiz.selected=null;quiz.submitted=false;
    $("quizTopic").textContent=quiz.title;$("questionProgress").textContent=`第 ${quiz.index+1}／${quiz.questions.length} 題`;$("progressBar").style.width=`${quiz.index/quiz.questions.length*100}%`;$("questionLevel").textContent=q.level||"環保知識";$("questionText").textContent=q.question;$("submitAnswerBtn").disabled=true;$("submitAnswerBtn").classList.remove("hidden");$("nextQuestionBtn").classList.add("hidden");$("feedbackBox").className="feedback hidden";
    const list=$("optionList");list.innerHTML="";q.options.forEach((o,i)=>{const b=document.createElement("button");b.type="button";b.className="option";b.textContent=`${String.fromCharCode(65+i)}. ${o}`;b.onclick=()=>{if(quiz.submitted)return;quiz.selected=i;[...list.children].forEach((x,j)=>x.classList.toggle("selected",j===i));$("submitAnswerBtn").disabled=false;};list.appendChild(b);});
  }
  async function submitAnswer(){
    if(quiz.selected===null||quiz.submitted)return;quiz.submitted=true;const q=quiz.questions[quiz.index],ok=quiz.selected===q.answer,chosen=q.options[quiz.selected];
    if(ok)quiz.correct++;else quiz.wrong.push({id:q.id,question:q.question,chosen,explanation:q.explanation,topic:quiz.topic});quiz.answers.push({id:q.id,selected:quiz.selected,correct:ok});
    [...$("optionList").children].forEach(b=>b.disabled=true);$("submitAnswerBtn").classList.add("hidden");
    const fb=$("feedbackBox");fb.className=`feedback ${ok?"correct":"wrong"}`;fb.innerHTML=ok?`<strong>答對了！</strong><br>${escapeHtml(q.explanation||"做得很好，繼續保持！")}`:`<strong>再想一想，這題先記進錯題本。</strong><br>${escapeHtml(q.explanation||"請重新理解題目中的環保觀念。")}`;
    $("nextQuestionBtn").textContent=quiz.index===quiz.questions.length-1?"查看結果":"下一題";$("nextQuestionBtn").classList.remove("hidden");
    profile.draft={topic:quiz.topic,title:quiz.title,ids:quiz.questions.map(x=>x.id),index:quiz.index,correct:quiz.correct,wrong:quiz.wrong,answers:quiz.answers};await saveProfile();
  }
  function escapeHtml(s){const d=document.createElement("div");d.textContent=s;return d.innerHTML;}
  function nextQuestion(){if(quiz.index<quiz.questions.length-1){quiz.index++;profile.draft.index=quiz.index;saveProfile();renderQuestion();}else finishQuiz();}
  async function finishQuiz(){
    const topic=quiz.topic,stat=statsFor(topic);stat.answered=(stat.answered||0)+quiz.questions.length;stat.correct=(stat.correct||0)+quiz.correct;stat.seenIds=unique([...(stat.seenIds||[]),...quiz.questions.map(q=>q.id)]);profile.topicStats[topic]=stat;
    profile.totalAnswered=(profile.totalAnswered||0)+quiz.questions.length;profile.totalCorrect=(profile.totalCorrect||0)+quiz.correct;profile.exp=(profile.exp||0)+quiz.correct*10;profile.seenIds=unique([...(profile.seenIds||[]),...quiz.questions.map(q=>q.id)]);
    const wrongNow=new Set(quiz.wrong.map(w=>w.id));quiz.questions.forEach(q=>{if(wrongNow.has(q.id)){if(!profile.wrongIds.includes(q.id))profile.wrongIds.push(q.id);}else profile.wrongIds=profile.wrongIds.filter(id=>id!==q.id);});profile.draft=null;await saveProfile();
    show("resultScreen");const acc=Math.round(quiz.correct/quiz.questions.length*100);$("resultTitle").textContent=quiz.title;$("scoreText").textContent=`${quiz.correct}/${quiz.questions.length}`;$("accuracyText").textContent=`正確率 ${acc}%`;$("resultMessage").textContent=acc>=80?"太棒了！你的環保知識又更強了。":"這次的錯題已收進錯題本，理解後再挑戰一次。";$("wrongSummary").innerHTML=quiz.wrong.length?`<p>本次有 ${quiz.wrong.length} 題需要再複習。</p>`:"<p>本次全部答對！</p>";
  }

  function showWrong(){const box=$("wrongList"),items=(profile.wrongIds||[]).map(id=>Q.find(q=>q.id===id)).filter(Boolean);box.innerHTML=items.length?items.map(q=>`<div class="list-item"><strong>${escapeHtml(q.question)}</strong><p>${escapeHtml(q.explanation||"尚無解析")}</p></div>`).join(""):"<p class='muted'>目前沒有錯題。</p>";$("practiceWrongBtn").disabled=!items.length;$("wrongDialog").showModal();}
  function showRecords(){const box=$("recordsList");box.innerHTML=TOPICS.map(t=>{const s=statsFor(t.id),acc=s.answered?Math.round(s.correct/s.answered*100):0;return `<div class="list-item record-row"><div><strong>${t.icon} ${t.name}</strong><br><small>已答 ${s.answered||0} 題</small></div><b>${acc}%</b></div>`;}).join("");$("recordsDialog").showModal();}
  async function showLeaderboard(){const box=$("leaderboardList");box.innerHTML="<p>讀取中…</p>";$("leaderboardDialog").showModal();if(!db||isGuest){box.innerHTML=`<div class="list-item"><b>${profile.avatar} ${escapeHtml(profile.name)}</b><p>${profile.exp||0} EXP（訪客模式）</p></div>`;return;}try{const snap=await db.collection("users").orderBy("exp","desc").limit(20).get();let i=0;box.innerHTML=snap.docs.map(d=>{const p=d.data();i++;return `<div class="list-item"><b>${i}. ${p.avatar||"🌱"} ${escapeHtml(p.name||"守護者")}</b><p>${p.exp||0} EXP</p></div>`;}).join("")||"<p>尚無排行資料。</p>";}catch(e){box.innerHTML="<p>排行榜目前無法讀取，但不影響答題與儲存。</p>";}}

  function bind(){
    $("questionTotal").textContent=Q.length;$("brandBtn").onclick=()=>profile&&renderHome();
    $("guestBtn").onclick=async()=>{isGuest=true;uid="guest";await enterAfterAuth();};
    $("googleLoginBtn").onclick=async()=>{try{$("loginError").textContent="";const provider=new firebase.auth.GoogleAuthProvider();await auth.signInWithPopup(provider);}catch(e){$("loginError").textContent="登入失敗："+(e.message||e.code);}};
    $("createProfileBtn").onclick=async()=>{const name=$("playerName").value.trim();if(!name){$("profileError").textContent="請輸入守護者暱稱。";return;}profile=profile||defaultProfile();profile.name=name;profile.avatar=selectedAvatar;await saveProfile();renderHome();};
    $("dailyChallengeBtn").onclick=()=>startChallenge("general");$("resumeBtn").onclick=resumeDraft;$("quizHomeBtn").onclick=()=>{saveProfile();renderHome();};$("submitAnswerBtn").onclick=submitAnswer;$("nextQuestionBtn").onclick=nextQuestion;$("resultHomeBtn").onclick=renderHome;$("retryBtn").onclick=()=>startChallenge(quiz.topic,quiz.title==="錯題複習");
    $("wrongBookBtn").onclick=showWrong;$("recordsBtn").onclick=showRecords;$("leaderboardBtn").onclick=showLeaderboard;$("practiceWrongBtn").onclick=()=>{$("wrongDialog").close();startChallenge("general",true);};
    $("profileBtn").onclick=()=>{$("editName").value=profile.name;renderAvatars("editAvatarChoices",profile.avatar,a=>selectedAvatar=a);selectedAvatar=profile.avatar;$("profileDialog").showModal();};$("saveProfileBtn").onclick=async()=>{profile.name=$("editName").value.trim()||profile.name;profile.avatar=selectedAvatar;await saveProfile();$("profileDialog").close();renderHome();};
    $("logoutBtn").onclick=async()=>{if(auth&&!isGuest)await auth.signOut();isGuest=false;uid=null;profile=null;$("profileBtn").classList.add("hidden");$("logoutBtn").classList.add("hidden");show("loginScreen");};
    document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>$(b.dataset.close).close());
  }
  function init(){
    buildPools();bind();renderAvatars("avatarChoices",selectedAvatar,a=>selectedAvatar=a);
    if(!Q.length){$("loginError").textContent="題庫載入失敗，請確認 questions.js 與 index.html 位於同一資料夾。";setCloud("⚠️ 題庫錯誤");return;}
    try{if(window.firebase&&window.FIREBASE_CONFIG){if(!firebase.apps.length)firebase.initializeApp(window.FIREBASE_CONFIG);auth=firebase.auth();db=firebase.firestore();setCloud("☁️ 已連線");auth.onAuthStateChanged(async user=>{if(user){uid=user.uid;isGuest=false;await enterAfterAuth();}else if(!isGuest){show("loginScreen");}});}else{setCloud("💾 本機模式");show("loginScreen");}}catch(e){console.error(e);setCloud("💾 本機模式");show("loginScreen");}
  }
  document.addEventListener("DOMContentLoaded",init);
})();
