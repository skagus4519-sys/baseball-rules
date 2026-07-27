/* ============================================================
   상황 판정 시뮬레이터 — 문제 생성 엔진
   ------------------------------------------------------------
   문항을 고정 목록으로 두면 금방 질리므로,
   ① 규칙 엔진(SIM_GEN) : 아웃카운트·주자·타구 종류를 조합해 매번 새 상황을 만들고
                          정답을 규칙으로 '계산'합니다. (수천 가지 조합)
   ② 특수 사례(SIM_CASES): 조합으로 만들 수 없는 희귀 상황은 손으로 작성.
   문제 객체 : {tag, outs, runners:{b1,b2,b3}, count, q, options[], correct, explain, rule}
   ============================================================ */
(function(){
"use strict";

/* ---------- 작은 도구들 ---------- */
const ri = (a,b)=> a + Math.floor(Math.random()*(b-a+1));      // a~b 정수
const one = arr => arr[Math.floor(Math.random()*arr.length)];
const R = (b1,b2,b3)=>({b1:!!b1,b2:!!b2,b3:!!b3});

const BASE_SETS = [
  {r:R(0,0,0), name:"주자 없음"},
  {r:R(1,0,0), name:"1루"},
  {r:R(0,1,0), name:"2루"},
  {r:R(0,0,1), name:"3루"},
  {r:R(1,1,0), name:"1·2루"},
  {r:R(1,0,1), name:"1·3루"},
  {r:R(0,1,1), name:"2·3루"},
  {r:R(1,1,1), name:"만루"}
];
const withRunner = ()=> one(BASE_SETS.filter(s=>s.r.b1||s.r.b2||s.r.b3));
const outsWord = o => o===0?"무사":o===1?"1사":"2사";
const setName = r => BASE_SETS.find(s=>s.r.b1===r.b1&&s.r.b2===r.b2&&s.r.b3===r.b3).name;
/* 포스 상태: 뒤쪽 베이스가 모두 차 있어야 강제 진루 의무가 생긴다 */
const isForced = (r,base)=> base===1 ? true : base===2 ? r.b1 : r.b1&&r.b2;

/* 보기 배열을 섞고 정답 위치를 따라간다 */
function shuffleOpts(opts, correctIdx){
  const idx = opts.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [idx[i],idx[j]]=[idx[j],idx[i]]; }
  return { options: idx.map(i=>opts[i]), correct: idx.indexOf(correctIdx) };
}
function make(o){
  const s = shuffleOpts(o.options, o.correct);
  return Object.assign({}, o, s);
}

/* ============================================================
   ① 규칙 엔진 — 상황을 조합해서 만들고 정답을 계산
   ============================================================ */

/* 1. 인필드 플라이 — 아웃카운트 3 × 주자 8 × 타구 4 = 96가지 */
function genInfieldFly(){
  const hits = [
    {t:"내야에 높이 뜬 평범한 뜬공", ok:true},
    {t:"내야수 앞으로 낮고 빠르게 날아간 라인드라이브", ok:false, why:"라인드라이브는 인필드 플라이에서 제외"},
    {t:"번트를 댄 것이 살짝 떠오른 타구", ok:false, why:"번트가 뜬 타구는 인필드 플라이에서 제외"},
    {t:"외야 깊숙이 날아간 뜬공", ok:false, why:"내야수가 평범하게 잡을 수 있는 타구가 아님"}
  ];
  const yes = BASE_SETS.filter(s=>s.r.b1&&s.r.b2), no = BASE_SETS.filter(s=>!(s.r.b1&&s.r.b2));
  /* 조건이 두 개 이상 동시에 어긋나면 정답이 여러 개가 되므로,
     '어긋나는 조건은 최대 하나'가 되도록 상황을 만든다 */
  const fail = one(["none","outs","bases","hit"]);
  const outs = fail==="outs" ? 2 : ri(0,1);
  const set  = fail==="bases" ? one(no) : one(yes);
  const h    = fail==="hit" ? one(hits.slice(1)) : hits[0];
  const baseOK = set.r.b1 && set.r.b2;
  const outsOK = outs < 2;
  const declared = baseOK && outsOK && h.ok;

  const opts = [
    "인필드 플라이 선언 — 타자는 잡히기 전에 이미 아웃",
    "선언 안 됨 — 2아웃이라 해당하지 않는다",
    "선언 안 됨 — 주자 조건(1·2루 또는 만루)을 채우지 못했다",
    "선언 안 됨 — 타구 종류가 해당하지 않는다"
  ];
  let c;
  if(declared) c=0; else if(!outsOK) c=1; else if(!baseOK) c=2; else c=3;

  let ex;
  if(declared) ex = `무사·1사 + 1·2루(또는 만루) + 내야 평범한 뜬공 — 세 조건을 모두 채웠으므로 타자는 자동 아웃입니다. 주자는 진루 의무가 없어요.`;
  else if(!outsOK) ex = `인필드 플라이는 <b>무사 또는 1사</b>에서만 선언됩니다. 2아웃에서는 잡히면 그냥 아웃이라 규칙이 필요 없어요.`;
  else if(!baseOK) ex = `주자 조건은 <b>1·2루 또는 만루</b>(=1루와 2루가 모두 차 있는 상태)입니다. 지금은 ${set.name}이라 해당하지 않아요.`;
  else ex = `${h.why}. 조건이 맞아도 타구 종류가 아니면 선언되지 않습니다.`;

  return make({ tag:"인필드 플라이", outs, runners:set.r, rule:"infield-fly",
    q:`${outsWord(outs)} ${set.name}. 타자가 <b>${h.t}</b>을 쳤다. 심판의 판정은?`,
    options:opts, correct:c, explain:ex });
}

/* 2. 낫아웃 성립 — 아웃카운트 3 × 1루 주자 유무 */
function genNotOut(){
  const outs = ri(0,2), set = one(BASE_SETS);
  const ok = !set.r.b1 || outs===2;            // 1루가 비었거나 2아웃
  const opts = [
    "타자는 주자가 되어 1루로 뛸 수 있다",
    "그냥 삼진 아웃 — 1루에 주자가 있고 2아웃도 아니다",
    "타자에게 자동으로 1루가 주어진다",
    "포수가 공을 주울 때까지 타자는 타석에서 기다린다"
  ];
  const ex = ok
    ? `낫아웃 성립 조건은 <b>1루가 비어 있거나, 2아웃</b>입니다. 지금은 ${outs===2?"2아웃이라":"1루가 비어 있어"} 성립 — 포수가 송구나 태그로 잡아야 아웃이 됩니다.`
    : `무사·1사에 1루에 주자가 있으면 낫아웃이 성립하지 않습니다. 타자가 1루로 뛰면 병살을 노린 고의 낙구가 가능해지기 때문이에요.`;
  return make({ tag:"낫아웃", outs, runners:set.r, count:[ri(0,3),2], rule:"notout",
    q:`${outsWord(outs)} ${set.name}, 2스트라이크. 3번째 스트라이크를 <b>포수가 뒤로 빠뜨렸다</b>. 어떻게 되나?`,
    options:opts, correct: ok?0:1, explain:ex });
}

/* 3. 포스아웃 vs 태그아웃 — 주자별 포스 상태 계산 */
function genForceTag(){
  const set = withRunner();
  const bases = [1,2,3].filter(b=> set.r["b"+b]);
  const target = one(bases);
  const outs = ri(0,1);
  const forced = isForced(set.r, target);
  const nextBase = target===3 ? "홈" : (target+1)+"루";
  const opts = [
    `${nextBase} 베이스를 밟기만 하면 아웃(포스아웃)`,
    `주자 몸에 태그를 해야 아웃`,
    `${target}루 베이스를 밟으면 아웃`,
    `주자가 지나간 뒤 어필해야 아웃`
  ];
  const ex = forced
    ? `${target}루 주자는 뒤쪽 베이스가 모두 차 있어 <b>진루 의무(포스)</b>가 있습니다. 갈 곳이 정해져 있으니 ${nextBase}를 밟기만 하면 아웃이에요.`
    : `${target}루 주자는 뒤쪽 베이스가 비어 있어 <b>포스가 아닙니다</b>. 굳이 갈 의무가 없으니 반드시 몸에 태그해야 아웃입니다.`;
  return make({ tag:"포스 / 태그", outs, runners:set.r, rule:"force-vs-tag",
    q:`${outsWord(outs)} ${set.name}. 타자가 내야 땅볼을 쳤고, 수비는 <b>${target}루 주자</b>를 잡으려 한다. 어떻게 해야 아웃인가?`,
    options:opts, correct: forced?0:1, explain:ex });
}

/* 4. 볼넷·사구 시 강제 진루 — 주자 8가지 */
function genPushAcross(){
  const set = withRunner();
  const bases = [1,2,3].filter(b=> set.r["b"+b]);
  const target = one(bases);
  const forced = isForced(set.r, target);
  const kind = one(["볼넷", "몸에 맞는 공", "타격 방해(포수 방해)"]);
  const nextBase = target===3 ? "홈(득점)" : (target+1)+"루";
  const opts = [
    `${nextBase}로 밀려 간다`,
    `${target}루에 그대로 머문다`,
    `심판이 상황을 보고 정한다`,
    `아웃될 위험을 감수하고 뛰어야 한다`
  ];
  const ex = forced
    ? `타자가 1루를 얻으면 뒤가 꽉 찬 주자들은 차례로 <b>떠밀려</b> 갑니다. ${target}루 주자는 뒤가 모두 차 있어 ${nextBase}로 진루${target===3?" — 이것이 밀어내기 득점입니다":""}.`
    : `${target}루 주자는 뒤쪽 베이스가 비어 있어 밀려날 이유가 없습니다. 타자만 1루로 가고 ${target}루 주자는 그대로 머물러요.`;
  return make({ tag:"밀어내기", outs:ri(0,2), runners:set.r, rule:"pushacross",
    q:`${set.name}에서 타자가 <b>${kind}</b>로 1루를 얻었다. <b>${target}루 주자</b>는?`,
    options:opts, correct: forced?0:1, explain:ex });
}

/* 5. 3아웃 타이밍과 득점 인정 */
function genThirdOut(){
  /* 3루 주자가 있어야 '홈을 밟았다'가 성립하고,
     아웃 방식에 따라 필요한 주자가 다르므로 상황을 맞춰서 만든다 */
  const kind = one([
    {t:"2루수가 공을 잡아 2루 베이스를 밟아 3아웃", force:true,  why:"포스아웃",
      sets:[BASE_SETS[5], BASE_SETS[7]]},                       // 1·3루 / 만루 (1루 주자 필요)
    {t:"1루수가 타자주자보다 먼저 1루를 밟아 3아웃", force:true, why:"타자주자가 1루에 닿기 전 아웃",
      sets:[BASE_SETS[3], BASE_SETS[5], BASE_SETS[6], BASE_SETS[7]]},
    {t:"3루로 뛰던 2루 주자를 야수가 태그해 3아웃", force:false, why:"태그아웃",
      sets:[BASE_SETS[6]]}   // 2·3루만 — 만루면 2루 주자도 포스 상태라 태그아웃이어도 포스아웃이 됨
  ]);
  const set = one(kind.sets);
  const scored = !kind.force;
  const opts = [
    "득점 인정 — 홈을 먼저 밟았으므로 1점",
    "득점 무효 — 3아웃의 종류 때문에 점수가 되지 않는다",
    "심판 재량으로 정한다",
    "다음 이닝으로 득점이 이월된다"
  ];
  const ex = scored
    ? `3번째 아웃이 <b>${kind.why}</b>이면, 그 전에 홈을 밟은 주자의 득점은 인정됩니다. 포스아웃·타자주자 1루 아웃만 득점이 취소돼요.`
    : `3번째 아웃이 <b>${kind.why}</b>이면 홈을 먼저 밟았어도 득점은 인정되지 않습니다. 타이밍 논쟁의 핵심 규칙이에요.`;
  return make({ tag:"3아웃과 득점", outs:2, runners:set.r, rule:"run-scoring-3out",
    q:`2사 ${set.name}. 타자가 친 뒤 <b>${kind.t}</b>이 됐다. 그 사이 3루 주자가 홈을 밟았다면?`,
    options:opts, correct: scored?0:1, explain:ex });
}

/* 6. 보크 판정 — 동작 8종 × 주자 유무 */
function genBalk(){
  const acts = [
    {t:"세트 포지션에서 완전히 멈추지 않고 그대로 투구", balk:true},
    {t:"투구 동작을 시작했다가 도중에 멈춤", balk:true},
    {t:"투수판을 밟은 채 1루로 던지는 시늉만 함", balk:true, need1:true},
    {t:"축발(중심발)을 투수판에서 앞으로 빼며 견제", balk:true, need1:true},
    {t:"타자가 타격 자세를 갖추기 전에 서둘러 투구", balk:"quick"},
    {t:"투수판에서 발을 뒤로 빼고 1루에 송구", balk:false, need1:true},
    {t:"로진백을 집어 손에 바름", balk:false},
    {t:"모자를 고쳐 쓰고 다시 세트에 들어감", balk:false}
  ];
  const a = one(acts);
  /* 견제 동작은 1루에 주자가 있어야 상황이 자연스럽다 */
  const set = a.need1 ? one(BASE_SETS.filter(s=>s.r.b1))
            : (Math.random()<0.7 ? withRunner() : BASE_SETS[0]);
  const hasRunner = set.r.b1||set.r.b2||set.r.b3;
  let c, ex;
  if(a.balk===true && hasRunner){ c=0; ex=`주자가 있을 때의 대표적인 보크 동작입니다. 벌칙으로 <b>모든 주자가 한 베이스씩</b> 진루해요.`; }
  else if(a.balk===true && !hasRunner){ c=1; ex=`같은 동작이라도 <b>보크는 주자가 있을 때만</b> 성립합니다. 주자가 없으면 속일 대상이 없기 때문이에요.`; }
  else if(a.balk==="quick"){ if(hasRunner){ c=0; ex=`퀵 피치(급속 투구)는 위험해서 금지 — <b>주자가 있으면 보크</b>입니다.`; } else { c=2; ex=`퀵 피치는 <b>주자가 없으면 볼</b>로 처리됩니다. 주자가 있으면 보크예요.`; } }
  else { c=1; ex=`정당한 동작입니다. 투수판에서 발을 뒤로 빼면 투수가 아닌 야수 취급이라 견제가 가능하고, 로진 사용도 허용돼요.`; }
  const opts = ["보크 — 모든 주자 한 베이스 진루", "반칙 아님 — 그대로 진행", "타자에게 볼 하나 추가", "투수 퇴장"];
  return make({ tag:"보크", outs:ri(0,2), runners:set.r, rule:"balk",
    q:`${setName(set.r)==="주자 없음"?"주자 없는 상황":setName(set.r)+" 상황"}. 투수가 <b>${a.t}</b>했다. 판정은?`,
    options:opts, correct:c, explain:ex });
}

/* 7. 태그업 타이밍 */
function genTagUp(){
  const set = one([BASE_SETS[3], BASE_SETS[2], BASE_SETS[6], BASE_SETS[7]]);
  const outs = ri(0,1);
  const sc = one([
    {t:"외야수가 뜬공을 깔끔하게 잡았다", key:"손을 댄 순간"},
    {t:"외야수가 공을 더듬다가 땅에 닿기 전에 다시 잡았다", key:"손을 댄 순간"},
    {t:"외야수가 잡자마자 송구하려다 공을 떨어뜨렸다", key:"낙구"}
  ]);
  const opts = [
    "야수가 공에 처음 손을 댄 순간부터 출발할 수 있다",
    "야수가 공을 완전히 잡은 뒤부터 출발할 수 있다",
    "공이 땅에 닿은 뒤부터 출발할 수 있다",
    "타자가 공을 친 순간부터 출발할 수 있다"
  ];
  const ex = sc.key==="낙구"
    ? `포구가 완성되지 않으면(잡자마자 흘리면) 낙구로 볼 수 있어 태그업 자체가 필요 없어집니다. 다만 <b>태그업 출발 기준</b>은 언제나 야수가 공에 <b>처음 손을 댄 순간</b>이에요.`
    : `태그업은 포구 완료가 아니라 <b>야수가 공에 처음 손을 댄 순간</b>부터 가능합니다. 그래서 더듬는 사이에 미리 출발할 수 있어요.`;
  return make({ tag:"태그업", outs, runners:set.r, rule:"tagup",
    q:`${outsWord(outs)} ${set.name}. ${sc.t}. 주자는 <b>언제부터</b> 태그업해 출발할 수 있나?`,
    options:opts, correct:0, explain:ex });
}

/* 8. 병살 성립 여부 */
function genDoublePlay(){
  const set = withRunner();
  const outs = ri(0,1);
  const forceAt2 = set.r.b1;                       // 1루 주자가 있어야 2루 포스
  const opts = [
    "2루를 밟고 1루로 던지면 두 명 모두 포스아웃",
    "앞 주자는 포스가 아니어서 베이스만 밟아서는 아웃이 안 된다",
    "타자주자는 아웃시킬 수 없다",
    "심판 어필이 있어야 병살이 인정된다"
  ];
  const ex = forceAt2
    ? `1루에 주자가 있으면 그 주자는 <b>2루로 갈 의무(포스)</b>가 있습니다. 2루 베이스를 밟고 1루로 이어 던지는 전형적인 병살이 성립해요.`
    : `1루가 비어 있으면 ${set.name}의 주자는 진루 의무가 없어 <b>포스가 아닙니다</b>. 베이스만 밟아서는 아웃이 안 되고 몸에 태그해야 해요(타자주자만 1루에서 포스아웃).`;
  return make({ tag:"병살", outs, runners:set.r, rule:"dp",
    q:`${outsWord(outs)} ${set.name}. 타자가 유격수 정면 땅볼을 쳤다. 병살(더블 플레이)을 노린다면?`,
    options:opts, correct: forceAt2?0:1, explain:ex });
}

/* 9. 주자가 타구에 맞았을 때 */
function genHitByBattedBall(){
  const set = withRunner();
  const passed = Math.random()<0.5;
  const opts = [
    "주자 아웃 — 타자에게는 1루가 주어진다",
    "아웃이 아니며 그대로 인플레이",
    "타자 아웃 — 주자는 원래 베이스로",
    "볼데드 후 타석을 다시 시작"
  ];
  const ex = passed
    ? `<b>내야수(투수 제외)를 이미 지난</b> 타구에 맞은 것은 수비 기회를 뺏은 것이 아니므로 아웃이 아니고 플레이가 계속됩니다.`
    : `내야수를 통과하기 <b>전</b>의 페어 타구에 주자가 맞으면 수비 기회를 방해한 것으로 보아 <b>주자가 아웃</b>, 타자에게는 1루가 주어집니다.`;
  return make({ tag:"타구에 맞은 주자", outs:ri(0,2), runners:set.r, rule:"interference",
    q:`${set.name}. 타자가 친 페어 타구가 <b>내야수를 ${passed?"지나간 뒤":"지나가기 전에"}</b> 주자 몸에 맞았다. 판정은?`,
    options:opts, correct: passed?1:0, explain:ex });
}

/* 10. 오버런 / 베이스 되돌아오기 */
function genOverrun(){
  const base = one([1,2,3]);
  const detail = base===1
    ? one([{t:"곧바로 1루로 돌아왔다", safe:true},{t:"2루로 갈 듯 몸을 틀며 방향을 잡았다", safe:false}])
    : {t:"슬라이딩 여세로 베이스에서 미끄러져 나갔다", safe:false};
  const opts = [
    "태그당해도 세이프",
    "태그당하면 아웃",
    "심판이 타임을 걸어 베이스로 돌려보낸다",
    "한 베이스 더 진루할 수 있다"
  ];
  const ex = detail.safe
    ? `<b>1루에 한해</b> 전력질주로 지나쳐도 곧바로 돌아오면 태그당하지 않습니다.`
    : (base===1
      ? `1루를 지나쳐도 <b>2루로 갈 의사</b>를 보이면 태그 대상이 됩니다.`
      : `오버런이 허용되는 곳은 <b>1루뿐</b>입니다. 2·3루에서 미끄러져 나가면 태그당해 아웃이에요.`);
  return make({ tag:"오버런", outs:ri(0,2), runners:base===1?R(1,0,0):(base===2?R(0,1,0):R(0,0,1)), rule:"overrun",
    q:`주자가 ${base}루에 도달한 뒤 <b>${detail.t}</b>. 수비가 곧바로 태그했다면?`,
    options:opts, correct: detail.safe?0:1, explain:ex });
}

/* 11. 페어 / 파울 판정 */
function genFairFoul(){
  const c = one([
    {t:"내야 땅볼이 <b>3루 베이스를 맞고</b> 파울 지역으로 튀어 나갔다", a:0, why:"베이스 자체가 페어 지역이므로 베이스를 맞은 타구는 <b>페어</b>입니다."},
    {t:"내야 땅볼이 <b>1루 베이스를 지난 뒤</b> 파울 지역으로 굴러 나갔다", a:0, why:"1·3루 베이스를 <b>지난 뒤</b>라면 파울 지역으로 나가도 페어입니다."},
    {t:"내야 땅볼이 <b>1루 베이스에 닿기 전에</b> 파울 지역으로 나가 멈췄다", a:1, why:"베이스를 통과하기 <b>전</b>에 파울 지역으로 나가 멈추면 파울입니다."},
    {t:"홈과 3루 사이 페어 지역에 떨어진 타구가 <b>3루 베이스 앞에서</b> 파울 지역으로 굴러 나갔다", a:1, why:"내야에서는 처음 떨어진 곳이 아니라 <b>베이스 통과 전 어디서 나갔는지</b>로 판단합니다."},
    {t:"외야로 날아간 뜬공이 <b>파울선 바깥</b> 잔디에 떨어졌다", a:1, why:"1·3루 베이스 너머에서는 <b>처음 떨어진 지점</b>이 기준입니다."},
    {t:"야수가 <b>파울 지역에서</b> 뜬공을 잡았다", a:2, why:"파울 지역이라도 뜬공을 잡으면 <b>타자는 아웃</b>(파울 플라이 아웃)입니다."}
  ]);
  return make({ tag:"페어 / 파울", outs:ri(0,2), runners:one(BASE_SETS).r, rule:"foul-fair",
    q:`${c.t}. 판정은?`,
    options:["페어 — 인플레이","파울","파울이지만 타자는 아웃","심판 재량으로 정한다"],
    correct:c.a, explain:c.why });
}

/* 12. 볼카운트 진행 */
function genCount(){
  const b = ri(0,3), s = ri(0,2);
  const ev = one([
    {t:"볼", kind:"b"}, {t:"헛스윙", kind:"s"}, {t:"루킹 스트라이크", kind:"s"},
    {t:"파울", kind:"f"}, {t:"번트를 댄 것이 파울", kind:"bf"}
  ]);
  let c, ex;
  if(ev.kind==="b"){ if(b===3){ c=0; ex="볼 4개가 되어 볼넷 — 타자는 1루로 걸어 나갑니다."; } else { c=2; ex=`볼카운트가 ${b+1}볼 ${s}스트라이크가 됩니다.`; } }
  else if(ev.kind==="s"){ if(s===2){ c=1; ex="스트라이크 3개로 삼진 아웃입니다."; } else { c=2; ex=`카운트가 ${b}볼 ${s+1}스트라이크가 됩니다.`; } }
  else if(ev.kind==="f"){ if(s===2){ c=3; ex="2스트라이크 이후의 <b>일반 파울</b>은 카운트가 늘지 않아 계속 칠 수 있습니다."; } else { c=2; ex=`파울도 2스트라이크가 되기 전까지는 스트라이크로 세어 ${b}볼 ${s+1}스트라이크가 됩니다.`; } }
  else { if(s===2){ c=1; ex="2스트라이크에서의 <b>번트 파울은 삼진</b>입니다. 일반 파울과 다른 예외예요."; } else { c=2; ex=`번트 파울도 2스트라이크 전까지는 스트라이크로 세어 ${b}볼 ${s+1}스트라이크가 됩니다.`; } }
  return make({ tag:"볼카운트", outs:ri(0,2), runners:one(BASE_SETS).r, count:[b,s], rule:"count",
    q:`<b>${b}볼 ${s}스트라이크</b>에서 <b>${ev.t}</b>. 어떻게 되나?`,
    options:["볼넷으로 타자가 1루","삼진 아웃","카운트가 하나 올라간다","카운트는 그대로 유지된다"],
    correct:c, explain:ex });
}

/* 13. 도루인가 무관심 진루인가 */
function genSteal(){
  const blowout = Math.random()<0.5;
  const gap = blowout ? ri(8,13) : ri(1,3);
  const react = one([
    {t:"포수가 2루로 송구했지만 늦었다", care:true},
    {t:"수비가 견제도 송구도 하지 않고 그대로 두었다", care:false}
  ]);
  const indiff = blowout && !react.care;
  return make({ tag:"도루 기록", outs:ri(0,2), runners:R(1,0,0), rule:"defensive-indifference",
    q:`<b>${gap}점 차</b>로 앞선 경기. 1루 주자가 2루로 갔고, ${react.t}. 기록은?`,
    options:["도루로 기록","무관심 진루 — 도루가 아니다","야수선택으로 기록","기록하지 않는다"],
    correct: indiff?1:0,
    explain: indiff
      ? `점수 차가 크고 수비가 막을 의사가 없었다면 <b>무관심 진루</b>로 도루를 주지 않습니다.`
      : (react.care ? `수비가 <b>막으려 시도했다면</b> 무관심이 아니라 정상적인 도루로 기록합니다.`
                    : `<b>3점 차 이내의 접전</b>은 수비가 놔뒀더라도 무관심으로 보지 않고 도루로 기록합니다.`) });
}

/* 14. 희생플라이 기록 */
function genSacFly(){
  const outs = ri(0,2);
  const ok = outs < 2;
  const set = one([BASE_SETS[3],BASE_SETS[5],BASE_SETS[6],BASE_SETS[7]]);   // 3루 주자가 있는 상황만
  return make({ tag:"희생플라이", outs, runners:set.r, rule:"sac",
    q:`${outsWord(outs)} ${set.name}. 타자가 <b>외야 깊은 뜬공</b>을 쳤고 외야수가 잡았다. 3루 주자는 태그업해 홈으로 들어왔다면?`,
    options:["희생플라이 — 타수에서 빠지고 타점이 기록된다","3아웃으로 이닝이 끝나 득점이 없다","안타로 기록된다","희생번트로 기록된다"],
    correct: ok?0:1,
    explain: ok
      ? `무사·1사에서 뜬공으로 주자를 불러들이면 <b>희생플라이</b>. 타수에서 빠져 타율이 떨어지지 않고 타점은 인정됩니다.`
      : `2아웃에서는 뜬공이 잡히는 순간 <b>3아웃으로 이닝이 끝나</b> 주자가 홈을 밟아도 득점이 되지 않습니다.` });
}

/* 15. 수비 방해인가 주루 방해인가 */
function genInterferenceType(){
  const c = one([
    {t:"타자주자가 러닝 레인을 벗어나 달리다 1루 송구를 맞혔다", off:true, r:R(0,0,0)},
    {t:"주자가 병살을 막으려 베이스가 아닌 야수를 향해 파고들었다", off:true, need1:true},
    {t:"타구를 처리하려는 야수의 진로를 주자가 가로막았다", off:true},
    {t:"공을 갖고 있지 않은 유격수가 2루로 가는 주자의 진로를 막았다", off:false, need1:true},
    {t:"공을 기다리던 1루수가 베이스를 완전히 막고 서서 타자주자가 밟지 못했다", off:false, r:R(0,0,0)}
  ]);
  /* 케이스가 요구하는 주자 배치를 그대로 그림에 반영한다 */
  const runners = c.r ? c.r : (c.need1 ? one(BASE_SETS.filter(s=>s.r.b1)).r : withRunner().r);
  return make({ tag:"방해 판정", outs:ri(0,2), runners, rule: c.off?"interference":"obstruction",
    q:`${c.t}. 판정은?`,
    options:["수비 방해 — 방해한 공격 측 선수가 아웃","주루 방해 — 주자에게 베이스를 준다","방해가 아니다 — 그대로 진행","양 팀 모두에게 경고"],
    correct: c.off?0:1,
    explain: c.off
      ? `방해한 쪽이 <b>공격</b>이면 수비 방해입니다. 해당 선수가 아웃되고 다른 주자는 원위치해요.`
      : `공을 갖지 않은 <b>수비</b>가 길을 막으면 주루 방해입니다. 주자에게 베이스를 줍니다.` });
}

/* 16. 안전진루권 몇 베이스? */
function genBaseAward(){
  const c = one([
    {t:"주자가 있을 때 투수가 보크를 했다", n:0, why:"보크는 모든 주자에게 <b>한 베이스</b>씩."},
    {t:"1루 견제 악송구가 관중석으로 들어갔다", n:1, need1:true, why:"볼데드 지역으로 들어간 송구는 보통 <b>2베이스</b>."},
    {t:"야수가 글러브를 던져 페어 타구를 맞혔다", n:2, why:"던진 장비가 <b>타구</b>에 맞으면 <b>3베이스</b>."},
    {t:"야수가 모자를 던져 송구를 맞혔다", n:1, why:"던진 장비가 <b>송구</b>에 맞으면 <b>2베이스</b>."},
    {t:"타구가 한 번 튄 뒤 담장을 넘어갔다", n:1, why:"인정 2루타 — <b>2베이스</b>."},
    {t:"타구가 뜬 채로 담장을 넘어갔다", n:3, why:"홈런이므로 <b>홈까지</b> 4베이스."}
  ]);
  /* 상황에 맞는 주자 배치 — 1루 견제는 1루 주자가 반드시 필요 */
  const set = c.need1 ? one(BASE_SETS.filter(s=>s.r.b1)) : withRunner();
  return make({ tag:"안전진루권", outs:ri(0,2), runners:set.r, rule:"base-award",
    q:`${c.t}. 주어지는 진루는?`,
    options:["1베이스","2베이스","3베이스","홈까지(4베이스)"],
    correct:c.n, explain:c.why });
}

/* 17. 몸에 맞는 공 성립 여부 */
function genHBP(){
  const c = one([
    {t:"피하려 했지만 투구가 팔에 맞았다", a:0, why:"정상적인 <b>몸에 맞는 공</b>입니다. 볼데드가 되고 타자는 1루로 갑니다."},
    {t:"원바운드된 투구가 다리에 맞았다", a:0, why:"땅에 <b>바운드된 공이라도</b> 몸에 맞으면 똑같이 몸에 맞는 공 — 1루로 갑니다."},
    {t:"스트라이크 존 안으로 온 투구가 몸에 맞았다", a:1, why:"<b>존 안에서 맞으면</b> 사구가 아니라 <b>스트라이크</b>입니다. 볼데드라 주자도 못 뜁니다."},
    {t:"스윙을 하다가 투구가 몸에 맞았다", a:1, why:"<b>스윙을 했다면</b> 몸에 맞아도 스트라이크입니다. 1루에 갈 수 없어요."},
    {t:"피할 수 있었는데 피하려는 동작 없이 그대로 맞았다", a:2, why:"피하려는 노력이 없으면 1루를 주지 않습니다. 존 밖 투구였다면 <b>볼</b>만 추가돼요."}
  ]);
  return make({ tag:"몸에 맞는 공", outs:ri(0,2), runners:one(BASE_SETS).r, rule:"hbp",
    q:`타석에서 <b>${c.t}</b>. 판정은?`,
    options:["몸에 맞는 공 — 타자 1루","스트라이크 — 카운트만 올라간다","볼 — 카운트만 올라간다","파울"],
    correct:c.a, explain:c.why });
}

/* 18. 볼데드인가 인플레이인가 */
function genDeadBall(){
  const c = one([
    {t:"페어 타구가 <b>내야수를 지나기 전에 심판 몸에</b> 맞았다", a:0,
      why:"내야수를 지나기 전에 심판에게 맞으면 <b>볼데드</b> — 타자에게 1루가 주어지고(안타 기록) 주자는 밀릴 때만 진루합니다."},
    {t:"타자가 친 공이 <b>타석 안에서 자기 다리에</b> 맞았다", a:0,
      why:"타석 안에서 자기 타구에 맞으면 <b>파울(볼데드)</b>입니다. 타석을 벗어난 뒤 페어 지역에서 맞으면 아웃이 될 수 있어요."},
    {t:"몸에 맞는 공이 나왔다", a:0,
      why:"몸에 맞는 공은 <b>볼데드</b>입니다. 타자는 1루, 다른 주자는 밀릴 때만 진루 — 그 사이 더 뛸 수는 없습니다."},
    {t:"포수가 3구째가 아닌 투구를 <b>뒤로 빠뜨렸다</b>", a:1,
      why:"폭투·포일은 <b>인플레이</b>입니다. 주자는 위험을 감수하고 다음 베이스를 노릴 수 있어요."},
    {t:"2스트라이크에서 배트를 스친 공이 <b>포수 미트에 그대로 잡혔다</b>", a:1,
      why:"파울 팁은 <b>인플레이 상태의 스트라이크</b>입니다. 삼진이 되고, 뛰던 주자는 그대로 플레이가 이어져요."},
    {t:"볼넷이 되는 4구째가 <b>폭투로 백네트까지 굴러갔다</b>", a:1,
      why:"볼넷도 <b>인플레이</b>입니다. 타자는 1루가 보장되지만, 공이 구르는 사이 위험을 감수하고 2루까지 노릴 수도 있어요."}
  ]);
  return make({ tag:"볼데드 / 인플레이", outs:ri(0,2), runners:one(BASE_SETS).r, rule:"time-deadball",
    q:`${c.t}. 공은 어떻게 되나?`,
    options:["볼데드 — 플레이가 멈춘다","인플레이 — 경기는 계속된다","타자 아웃","주자 전원 원위치"],
    correct:c.a, explain:c.why });
}

/* 19. 홈런인가 아닌가 */
function genHomerun(){
  const c = one([
    {t:"큰 타구가 <b>파울 폴을 직접 맞고</b> 그라운드로 떨어졌다", a:0,
      why:"이름과 달리 파울 폴은 <b>페어 지역</b>입니다. 폴에 맞으면 <b>홈런</b> — 가장 많이 헷갈리는 규칙이에요."},
    {t:"타구가 <b>담장 상단을 맞고 그라운드 안으로</b> 튀어 들어왔다", a:2,
      why:"담장을 <b>넘지 않았으므로</b> 홈런이 아니라 인플레이입니다. 타자와 주자는 계속 달려야 해요."},
    {t:"타구가 <b>담장 상단을 맞고 밖으로</b> 넘어갔다", a:0,
      why:"담장에 맞았어도 땅에 닿지 않고 최종적으로 <b>밖으로 넘어가면 홈런</b>입니다."},
    {t:"외야수가 점프했지만 <b>글러브를 맞고 공이 담장 밖으로</b> 넘어갔다", a:0,
      why:"야수 몸이나 글러브에 맞았어도 <b>땅에 닿지 않은 채</b> 담장을 넘으면 홈런입니다."},
    {t:"타구가 <b>외야 땅에 한 번 튄 뒤</b> 담장을 넘어갔다", a:1,
      why:"원바운드로 넘어가면 <b>인정 2루타</b> — 타자는 2루까지, 주자도 보통 2베이스씩 진루합니다."}
  ]);
  return make({ tag:"홈런 판정", outs:ri(0,2), runners:one(BASE_SETS).r, rule:"ground-rule-double",
    q:`${c.t}. 판정은?`,
    options:["홈런 — 타자와 모든 주자 득점","인정 2루타 — 2베이스","인플레이 — 경기 계속","파울"],
    correct:c.a, explain:c.why });
}

/* ============================================================
   ② 특수 사례 — 조합으로 만들기 어려운 희귀 상황
   ============================================================ */
const CASES = [
  { tag:"던진 글러브", outs:1, runners:R(0,0,0), rule:"thrown-glove",
    q:"외야로 빠질 것 같은 페어 타구를 향해 야수가 <b>글러브를 벗어 던져</b> 맞혔다. 판정은?",
    options:["타자주자에게 3베이스 안전진루권","2베이스 안전진루권","1베이스","벌칙 없이 인플레이"], correct:0,
    explain:"고의로 던진 장비가 <b>페어 타구</b>에 맞으면 3베이스, <b>송구</b>에 맞으면 2베이스가 주어집니다. 그래도 볼 인 플레이는 계속돼요." },
  { tag:"관중 방해", outs:0, runners:R(0,0,0), rule:"interference",
    q:"외야 담장 앞에서 야수가 잡으려는 순간, <b>관중이 그라운드 쪽으로 손을 뻗어</b> 공을 건드렸다. 판정은?",
    options:["관중 방해 — 심판이 타자 아웃을 선언할 수 있다","홈런으로 인정","그대로 인플레이","타자에게 2루타 부여"], correct:0,
    explain:"관중이 그라운드 안으로 넘어와 방해하면 심판이 <b>방해가 없었다면 어떻게 됐을지</b>를 판단해 아웃이나 진루를 정합니다." },
  { tag:"주자 추월", outs:0, runners:R(1,0,0), rule:"passing-runner",
    q:"홈런을 친 타자가 기뻐하며 뛰다가 <b>앞서 가던 1루 주자를 지나쳤다</b>. 판정은?",
    options:["추월한 타자주자가 아웃","앞 주자가 아웃","둘 다 아웃","경고만 주고 홈런 인정"], correct:0,
    explain:"뒤 주자가 앞 주자를 추월하면 <b>추월한 쪽</b>이 아웃. 홈런이 단타로 줄어드는 사고가 실제로 나옵니다." },
  { tag:"한 베이스 두 주자", outs:1, runners:R(1,1,0), rule:"two-runners",
    q:"1·2루에서 플레이가 꼬여 <b>주자 둘이 2루에 함께</b> 서 있고 수비가 둘 다 태그했다. 원칙적으로 아웃은?",
    options:["나중에 온 뒤 주자","먼저 온 앞 주자","둘 다 아웃","둘 다 세이프"], correct:0,
    explain:"베이스 권리는 <b>앞 주자</b>에게 있습니다. 따라서 권리가 없는 뒤 주자가 아웃(포스 상황에선 반대일 수 있음)." },
  { tag:"주루 포기", outs:1, runners:R(1,0,0), rule:"abandonment",
    q:"주자가 플레이가 끝난 줄 알고 <b>베이스라인을 벗어나 더그아웃 쪽으로</b> 걸어갔다. 판정은?",
    options:["태그 없이 아웃을 선언할 수 있다","돌아오면 세이프","반드시 태그해야 아웃","타임 후 원위치"], correct:0,
    explain:"주루 의사를 포기한 것(어밴던)으로 보아 태그 없이 아웃 선언이 가능합니다. 1루 오버런과는 다릅니다." },
  { tag:"파울 팁", outs:0, runners:R(1,0,0), count:[1,2], rule:"foul-fair",
    q:"2스트라이크에서 배트를 스친 공이 <b>포수 미트에 그대로 잡혔다</b>. 판정은?",
    options:["파울 팁 — 삼진이며 인플레이 상태","파울 — 카운트 유지","볼데드 후 타격 계속","포수 방해"], correct:0,
    explain:"파울 팁은 볼데드가 아니라 <b>인플레이 상태의 스트라이크</b>. 2스트라이크였으니 삼진이고, 주자는 그대로 뛸 수 있습니다." },
  { tag:"고의 낙구", outs:1, runners:R(1,1,0), rule:"infield-fly",
    q:"1사 1·2루, 내야수가 <b>뜬공을 일부러 떨어뜨려</b> 병살을 노렸다(인필드 플라이 미선언 상황). 판정은?",
    options:["볼데드 — 타자 아웃, 주자는 원래 베이스","그대로 인플레이","주자 모두 아웃","타자에게 1루 부여"], correct:0,
    explain:"고의 낙구는 병살을 노린 반칙으로, 타자를 아웃 처리하고 주자를 원위치시켜 이득을 막습니다." },
  { tag:"타격 방해", outs:0, runners:R(0,0,0), rule:"catcher-interference",
    q:"타자가 스윙할 때 <b>포수 미트가 방망이에 닿았고</b>, 그 타구가 2루타가 됐다. 공격 측의 선택은?",
    options:["2루타 결과를 택할 수 있다","무조건 타자 1루","무조건 2루타","타석을 다시 시작"], correct:0,
    explain:"원칙은 타자에게 1루지만, 실제 결과가 더 유리하면 <b>플레이 종료 직후</b> 감독이 그 결과를 택할 수 있습니다(선택권)." },
  { tag:"누의 공과", outs:1, runners:R(0,1,0), rule:"appeal",
    q:"안타 때 2루 주자가 <b>3루를 밟지 않고</b> 홈에 들어와 득점했다. 수비가 아웃으로 만들려면?",
    options:["공을 갖고 3루에 어필해야 한다","심판이 자동으로 아웃 선언한다","감독이 항의하면 된다","비디오 판독을 신청한다"], correct:0,
    explain:"누의 공과·태그업 위반은 심판이 스스로 잡지 않습니다. 수비가 다음 투구 전에 <b>어필</b>해야 아웃이 됩니다." },
  { tag:"제4아웃", outs:2, runners:R(0,1,1), rule:"fourth-out",
    q:"3아웃이 성립했지만 그 전에 3루 주자가 홈을 밟아 득점했다. 수비가 <b>태그업 위반을 어필</b>하면?",
    options:["제4아웃으로 교체되어 득점이 취소된다","이미 3아웃이라 어필할 수 없다","다음 이닝에 반영된다","득점은 그대로 인정된다"], correct:0,
    explain:"3아웃 뒤라도 더 유리한 어필 아웃이 있으면 그것으로 바꿀 수 있습니다(제4아웃). 심판의 인정이 필요해요." },
  { tag:"쓰리피트", outs:0, runners:R(0,0,0), rule:"three-foot",
    q:"타자주자가 1루로 뛰며 <b>러닝 레인을 벗어나</b> 달리다 1루 송구를 방해했다. 판정은?",
    options:["쓰리피트 위반으로 타자주자 아웃","세이프 — 수비 잘못","볼데드 후 재개","경고만 주고 진행"], correct:0,
    explain:"홈~1루 사이에는 파울선 바깥으로 러닝 레인이 있습니다. 벗어나 송구·포구를 방해하면 아웃될 수 있어요." },
  { tag:"부정 타순", outs:1, runners:R(0,0,0), rule:"batting-out-of-order",
    q:"타순을 어긴 타자가 안타를 쳤고, 수비가 <b>다음 투구 전에 어필</b>했다. 처리는?",
    options:["원래 나왔어야 할 타자가 아웃, 안타는 취소","실제로 친 타자가 아웃","안타를 그대로 인정","이닝 종료"], correct:0,
    explain:"정당한 타자가 아웃 처리되고 타격 결과는 무효가 됩니다. 반대로 어필 없이 다음 투구가 이뤄지면 결과가 확정돼요." },
  { tag:"주루 방해", outs:1, runners:R(0,1,0), rule:"obstruction",
    q:"공을 갖고 있지 않은 <b>유격수가 2루 주자의 진로를 막았다</b>. 판정은?",
    options:["주루 방해 — 주자에게 베이스를 준다","정당한 수비","주자 아웃","타임 후 원위치"], correct:0,
    explain:"공 없는 수비수는 주자의 길을 막을 수 없습니다. 반대로 공격 측이 수비를 방해하면 수비 방해로 해당자가 아웃." },
  { tag:"저글", outs:1, runners:R(0,0,1), rule:"juggle",
    q:"외야수가 뜬공을 <b>더듬다가 땅에 닿기 전에 다시 잡았다</b>. 판정은?",
    options:["정규 포구 — 타자 아웃","낙구 — 인플레이","심판 재량","주자만 태그업 불가"], correct:0,
    explain:"땅에 닿기 전 확실히 잡으면 포구 인정입니다. 주자는 야수가 <b>처음 손을 댄 순간</b>부터 태그업할 수 있어요." },
  { tag:"악송구", outs:0, runners:R(1,0,0), rule:"wild-throw",
    q:"1루 견제 송구가 빗나가 <b>관중석으로 들어갔다</b>. 주자는?",
    options:["2베이스 진루권","1베이스 진루권","3베이스 진루권","그 자리에 멈춘다"], correct:0,
    explain:"볼데드 지역으로 송구가 들어가면 보통 2베이스가 주어집니다. 다만 각 베이스에 발을 반드시 닿아야 해요." },
  { tag:"슬라이딩 규정", outs:0, runners:R(1,0,0), rule:"slide-rule",
    q:"병살을 막으려고 주자가 베이스가 아닌 <b>야수를 향해 옆으로 파고들었다</b>. 판정은?",
    options:["병살 방해 — 주자와 타자주자 모두 아웃","정당한 슬라이딩","주자만 아웃","경고 후 진행"], correct:0,
    explain:"베이스에 닿을 수 있게 정당하게 슬라이딩해야 합니다. 야수를 겨냥하면 둘 다 아웃될 수 있어요." },
  { tag:"콜리전 룰", outs:1, runners:R(0,0,1), rule:"collision",
    q:"포수가 <b>아직 공을 잡지 않았는데</b> 홈플레이트를 완전히 막고 서 있었다. 판정은?",
    options:["주자 세이프 — 포수의 홈 봉쇄 위반","주자 아웃","경고 후 재개","주자 퇴장"], correct:0,
    explain:"포수는 공을 갖기 전 주자의 길을 완전히 막을 수 없습니다. 반대로 주자도 일부러 충돌하면 아웃될 수 있어요." },
  { tag:"역주 금지", outs:1, runners:R(1,0,0), rule:"backward-run",
    q:"주자가 수비를 혼란시키려고 <b>정규로 밟은 베이스에서 거꾸로 달렸다</b>. 판정은?",
    options:["즉시 타임 후 아웃","허용된다","경고만 준다","해당 베이스로 되돌린다"], correct:0,
    explain:"경기를 희롱할 목적의 역주는 금지되어 아웃입니다. 태그를 피해 잠깐 물러서는 정도는 허용돼요." },
  { tag:"리버스 포스 병살", outs:1, runners:R(1,0,0), rule:"reverse-force-dp",
    q:"1사 1루, 1루수가 <b>먼저 1루를 밟아 타자를 아웃</b>시킨 뒤 2루로 던졌다. 1루 주자를 잡으려면?",
    options:["몸에 태그해야 한다 — 포스가 풀렸다","2루를 밟기만 하면 된다","이미 아웃이라 필요 없다","어필해야 한다"], correct:0,
    explain:"타자가 먼저 아웃되면 1루 주자의 진루 의무가 사라집니다. 순서가 반대라 <b>리버스 포스 더블 플레이</b>라고 불러요." },
  { tag:"인정 2루타", outs:0, runners:R(0,0,1), rule:"ground-rule-double",
    q:"타구가 <b>한 번 튄 뒤 담장을 넘어갔다</b>. 3루 주자와 타자는?",
    options:["2베이스씩 진루 — 3루 주자 득점, 타자는 2루","홈런으로 전원 득점","파울로 무효","타자만 1루"], correct:0,
    explain:"원바운드로 넘어가면 홈런이 아닌 인정 2루타. 주자도 보통 2베이스씩 진루합니다." },
  { tag:"2스트라이크 번트", outs:0, runners:R(0,1,0), count:[0,2], rule:"bunt",
    q:"2스트라이크에서 댄 <b>번트가 파울</b>이 됐다. 판정은?",
    options:["삼진 아웃","카운트 유지","볼 하나 추가","타자 선택"], correct:0,
    explain:"일반 파울은 카운트가 늘지 않지만, <b>2스트라이크 이후의 번트 파울은 삼진</b>입니다." },
  { tag:"포구의 완성", outs:1, runners:R(0,0,0), rule:"catch-transfer",
    q:"야수가 뜬공을 <b>잡자마자 송구하려다 공을 떨어뜨렸다</b>. 포구 인정 기준은?",
    options:["확실히 쥐고 꺼내는 동작까지 마쳐야 포구","글러브에 닿기만 하면 포구","떨어뜨리면 무조건 낙구","주심 재량으로 매번 다르다"], correct:0,
    explain:"포구의 완성(트랜스퍼)까지 가야 아웃입니다. 세이프와 아웃을 가르는 미묘한 판정 포인트예요." },
  { tag:"빈 글러브 태그", outs:1, runners:R(0,1,0), rule:"force-vs-tag",
    q:"야수가 공을 <b>맨손에 쥔 채</b>, 공이 들어 있지 않은 <b>빈 글러브로</b> 주자를 태그했다. 판정은?",
    options:["세이프 — 정당한 태그가 아니다","아웃 — 태그는 태그다","심판 재량","주자 원위치 후 재개"], correct:0,
    explain:"태그는 <b>공을 쥔 손</b> 또는 <b>공이 든 글러브</b>로 해야 인정됩니다. 빈 글러브 태그는 세이프 — 리플레이 판독에서 자주 뒤집히는 장면이에요." },
  { tag:"마스크에 낀 공", outs:0, runners:R(0,0,1), rule:"wp-pb",
    q:"투구가 <b>포수 마스크에 끼어</b> 빠지지 않는다. 판정은?",
    options:["볼데드 — 모든 주자 1베이스 진루","인플레이 — 계속 진행","다시 던진다(노 피치)","주자 그대로"], correct:0,
    explain:"공이 포수나 심판의 마스크·장비에 끼면 <b>볼데드</b>가 되고 주자에게 <b>1베이스</b>씩 주어집니다." },
  { tag:"포구 후 덕아웃 낙상", outs:1, runners:R(0,1,0), rule:"time-deadball",
    q:"야수가 파울 뜬공을 잡은 직후 <b>발을 헛디뎌 더그아웃 안으로 넘어졌다</b>. 판정은?",
    options:["포구 인정(타자 아웃) — 볼데드가 되고 주자는 1베이스 진루","낙구 — 파울로 처리","포구 무효 — 타석 계속","주자 아웃"], correct:0,
    explain:"공을 확실히 쥔 채 볼데드 지역으로 <b>넘어지면</b> 포구는 인정되지만 볼데드가 되어 주자에게 1베이스가 주어집니다. 서서 버티면 인플레이예요." },
  { tag:"자동 고의4구", outs:1, runners:R(0,1,0), rule:"ibb",
    q:"수비팀 감독이 심판에게 <b>고의4구 의사를 표시</b>했다. 투수는 공을 던져야 하나?",
    options:["던지지 않아도 타자는 바로 1루","4개를 모두 던져야 한다","1개는 던져야 한다","타자가 거부할 수 있다"], correct:0,
    explain:"현행 규정에서는 감독의 <b>의사 표시만으로</b> 자동 고의4구가 성립합니다. 공을 던질 필요가 없어요." },
  { tag:"헛스윙 사구?", outs:0, runners:R(1,0,0), count:[1,1], rule:"hbp",
    q:"타자가 <b>헛스윙을 했는데 그 공이 몸에 맞았다</b>. 판정은?",
    options:["스트라이크 — 볼데드","몸에 맞는 공 — 1루","볼","파울"], correct:0,
    explain:"스윙을 했으면 몸에 맞아도 <b>스트라이크</b>입니다. 볼데드라 주자도 진루할 수 없어요. 2스트라이크였다면 삼진!" },
  { tag:"배트에 두 번", outs:0, runners:R(0,0,0), rule:"foul-fair",
    q:"타자가 친 공이 페어 지역에서 <b>타자가 들고 있던 배트에 다시</b> 맞았다. 판정은?",
    options:["타자 아웃 — 볼데드","파울","인플레이","다시 친다"], correct:0,
    explain:"페어 지역에서 배트가 타구에 <b>다시</b> 닿으면 타자 아웃, 볼데드입니다. 단, 타석 안에서 맞으면 그냥 파울이에요." },
  { tag:"낫아웃 포기", outs:1, runners:R(0,1,0), count:[1,2], rule:"notout",
    q:"낫아웃 상황인데 타자가 삼진인 줄 알고 <b>더그아웃 쪽으로 걸어갔다</b>. 판정은?",
    options:["1루 도달 의사를 포기한 것으로 아웃","다시 뛰면 세이프 가능","자동으로 1루 부여","타석 재개"], correct:0,
    explain:"낫아웃에서 타자가 홈플레이트 주변 흙 원을 벗어나 더그아웃으로 향하면 <b>주루 포기로 아웃</b> 처리됩니다. 헷갈리면 일단 1루로 뛰세요!" },
  { tag:"인필드 플라이 낙구", outs:1, runners:R(1,1,0), rule:"infield-fly",
    q:"인필드 플라이가 선언된 뜬공을 내야수가 <b>실수로 떨어뜨렸다</b>. 타자는?",
    options:["그래도 타자는 아웃 — 주자는 위험 부담 안고 진루 가능","낙구라 타자 세이프","자동으로 병살","볼데드 후 재개"], correct:0,
    explain:"인필드 플라이는 <b>선언 순간 타자 아웃</b>이 확정됩니다. 떨어뜨려도 아웃은 그대로이고, 공은 인플레이라 주자는 스스로 판단해 뛸 수 있어요." },
  { tag:"인필드 플라이 파울", outs:0, runners:R(1,1,0), rule:"infield-fly",
    q:"심판이 인필드 플라이를 선언했는데 공이 <b>파울 지역에 떨어져 파울</b>이 됐다. 판정은?",
    options:["선언 무효 — 그냥 파울로 처리","선언대로 타자 아웃","주자만 진루","심판 합의 판정"], correct:0,
    explain:"그래서 심판은 \"인필드 플라이 <b>이프 페어</b>(페어일 경우)\"라고 선언합니다. 파울이 되면 선언은 없던 일이 돼요." },
  { tag:"체크스윙 어필", outs:0, runners:R(0,0,0), count:[2,1], rule:"checkswing",
    q:"타자가 배트를 내밀다 멈췄고 구심은 <b>볼</b>을 선언했다. 포수가 할 수 있는 것은?",
    options:["누심에게 스윙 여부 판정을 요청할 수 있다","비디오 판독을 신청한다","아무것도 할 수 없다","투수가 어필해야 한다"], correct:0,
    explain:"체크스윙은 포수(또는 감독)의 요청으로 <b>1루심·3루심에게</b> 물어볼 수 있습니다. 누심이 스윙이라 하면 스트라이크로 바뀌어요." },
  { tag:"홈스틸", outs:1, runners:R(0,0,1), count:[0,2], rule:"homesteal",
    q:"3루 주자가 <b>홈스틸</b>을 시도했고, 그 투구가 스트라이크 존에 들어왔는데 타자는 치지 않았다. 2스트라이크였다면?",
    options:["타자는 삼진 — 주자는 홈 터치 전에 태그돼야 아웃","주자 자동 아웃","투구 무효","타자 볼 판정"], correct:0,
    explain:"투구 판정과 주루는 별개입니다. 타자는 삼진 아웃, 3루 주자는 포수가 홈 터치 전에 <b>태그해야</b> 아웃이에요(2아웃 삼진이면 이닝 종료)." },
  { tag:"어필 시기", outs:1, runners:R(0,1,0), rule:"appeal",
    q:"수비가 누의 공과를 어필하려 했지만 <b>그 전에 투수가 다음 타자에게 투구</b>했다. 판정은?",
    options:["어필권 소멸 — 득점·진루가 그대로 확정","여전히 어필할 수 있다","이닝 끝까지 가능","경기 끝까지 가능"], correct:0,
    explain:"어필은 <b>다음 투구(또는 플레이) 전</b>에만 가능합니다. 투구가 이뤄지는 순간 앞 플레이는 확정돼요." }
];

/* ============================================================
   문제 뽑기 — 엔진 70% · 특수 사례 30%, 최근 문제는 피함
   ============================================================ */
const GEN = [genInfieldFly, genNotOut, genForceTag, genPushAcross, genThirdOut,
             genBalk, genTagUp, genDoublePlay, genHitByBattedBall, genOverrun,
             genFairFoul, genCount, genSteal, genSacFly, genInterferenceType, genBaseAward,
             genHBP, genDeadBall, genHomerun];

window.SIM = {
  cases: CASES,
  gens: GEN,
  /* recent: 최근에 나온 문제 키 배열(문자열) — 같은 문제 반복을 피한다 */
  next(recent){
    recent = recent || [];
    for(let tryN=0; tryN<12; tryN++){
      const q = Math.random() < 0.7
        ? one(GEN)()
        : make(Object.assign({}, one(CASES)));
      const key = q.tag + "|" + q.q;
      if(!recent.includes(key)) { q.key = key; return q; }
    }
    const q = one(GEN)(); q.key = q.tag+"|"+q.q; return q;
  }
};
})();
