
const S=[
{id:'s1',name:'蒼翠萌芽境',icon:'🌱',code:'STAGE 01',desc:'從生活環保知識開始，喚醒沉睡的大地。',main:'初級',support:'中級',badge:'🌿',badgeName:'萌芽守護徽章',enemy:'🌀',enemyName:'浪費旋風'},
{id:'s2',name:'翡翠迷霧森',icon:'🌳',code:'STAGE 02',desc:'穿越迷霧森林，運用進階知識修復生態之心。',main:'中級',support:'中高級',badge:'🦉',badgeName:'森境智者徽章',enemy:'🌫️',enemyName:'污染迷霧'},
{id:'s3',name:'零碳星際城',icon:'⚡',code:'STAGE 03',desc:'破解能源、氣候與永續治理難題。',main:'中高級',support:'高級',badge:'💠',badgeName:'零碳先鋒徽章',enemy:'🤖',enemyName:'耗能機甲'},
{id:'s4',name:'地核終焉神殿',icon:'🌋',code:'STAGE 04',desc:'以最高級知識完成最後的守護試煉。',main:'高級',support:null,badge:'👑',badgeName:'地核榮耀徽章',enemy:'👾',enemyName:'終極污染魔王'}];
const ITEMS=[
// 建設工具列：依 V9.4.1 Beta 5.1.16 指定項目顯示。
{id:'tree',icon:'🌳',name:'樹木',cost:3,desc:'增加基地綠意並提供生物棲地。'},
{id:'shrub',icon:'🌿',name:'灌木',cost:4,desc:'營造低矮、多層次的自然植栽。'},
{id:'solar',icon:'🔷',name:'太陽能板',cost:10,desc:'利用陽光供應守護基地乾淨能源。'},
{id:'wind',icon:'🌬️',name:'風力發電機',cost:12,desc:'運用風力產生綠色電力。'},
{id:'recycle',icon:'♻️',name:'回收站',cost:8,desc:'進行資源分類與循環再利用。'},
{id:'flowers',icon:'🌼',name:'花圃',cost:5,desc:'吸引蝴蝶與蜜蜂回到基地。'},
{id:'logRest',icon:'🪵',name:'原木休憩區',cost:7,desc:'利用自然原木打造友善休憩空間。'},
{id:'rockRest',icon:'🪨',name:'大石休憩區',cost:9,desc:'以自然石景打造安靜的休息角落。',isNew:true},
{id:'streamRest',icon:'🏞️',name:'溪邊休憩區',cost:14,desc:'在溪流景觀旁設置親近自然的休憩空間。',isNew:true},
// 舊版建築保留供已放置基地正常顯示，但不再出現在建設工具列。
{id:'water',icon:'💧',name:'雨水回收池',cost:8,desc:'收集雨水，澆灌基地植物。',hidden:true},
{id:'animal',icon:'🐢',name:'動物保護區',cost:15,desc:'讓受保護動物有安全棲地。',hidden:true},
{id:'bench',icon:'🪑',name:'森林休憩椅',cost:4,desc:'舊版休憩設施。',hidden:true},
{id:'birdhouse',icon:'🪺',name:'友善鳥巢站',cost:6,desc:'讓小鳥在基地安心築巢。',hidden:true},
{id:'compost',icon:'🍂',name:'落葉堆肥區',cost:7,desc:'把落葉與廚餘轉化為植物養分。',hidden:true},
{id:'wetland',icon:'🪷',name:'迷你生態濕地',cost:9,desc:'淨化水質並提供小生物棲息地。',hidden:true},
{id:'library',icon:'📚',name:'環保知識屋',cost:11,desc:'收藏守護地球需要的知識與任務紀錄。',hidden:true},
{id:'bike',icon:'🚲',name:'低碳單車站',cost:13,desc:'鼓勵以低碳交通探索基地。',hidden:true},
{id:'greenhouse',icon:'🏡',name:'節能溫室',cost:16,desc:'用節能方式培育原生植物。',hidden:true},
{id:'observatory',icon:'🔭',name:'星空觀測台',cost:18,desc:'夜晚觀察星空與自然環境變化。',hidden:true},
{id:'ecoSchool',icon:'🏫',name:'永續學習中心',cost:20,desc:'分享環保知識，培養更多地球守護者。',hidden:true}
];

const AVATARS=[
{id:'fox',icon:'🦊',name:'森林狐狸',level:1},
{id:'monthlySquirrel',icon:'🐿️',name:'四季松鼠守護者',level:1,special:'monthly'},
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
