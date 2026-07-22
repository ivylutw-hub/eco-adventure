
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
{id:'animal',icon:'🐢',name:'動物保護區',cost:15,desc:'讓受保護動物有安全棲地。'},
{id:'bench',icon:'🪑',name:'森林休憩椅',cost:4,desc:'提供守護者休息與觀察自然的角落。'},
{id:'birdhouse',icon:'🪺',name:'友善鳥巢站',cost:6,desc:'讓小鳥在基地安心築巢。'},
{id:'compost',icon:'🍂',name:'落葉堆肥區',cost:7,desc:'把落葉與廚餘轉化為植物養分。'},
{id:'wetland',icon:'🪷',name:'迷你生態濕地',cost:9,desc:'淨化水質並提供小生物棲息地。'},
{id:'library',icon:'📚',name:'環保知識屋',cost:11,desc:'收藏守護地球需要的知識與任務紀錄。'},
{id:'bike',icon:'🚲',name:'低碳單車站',cost:13,desc:'鼓勵以低碳交通探索基地。'},
{id:'greenhouse',icon:'🏡',name:'節能溫室',cost:16,desc:'用節能方式培育原生植物。'},
{id:'observatory',icon:'🔭',name:'星空觀測台',cost:18,desc:'夜晚觀察星空與自然環境變化。'},
{id:'ecoSchool',icon:'🏫',name:'永續學習中心',cost:20,desc:'分享環保知識，培養更多地球守護者。'}];

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
{id:'horseshoe',icon:'horseshoe-crab.svg',image:true,name:'金門鱟',level:50,kinmen:true}
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
const KEY='ecoAdventureV90';
const LEGACY_KEYS=['ecoAdventureV80','ecoAdventureV70','ecoAdventureV60','ecoAdventureV57'];
function unitCount(stageId){return (UNIT_SETS[stageId]||[]).length}
