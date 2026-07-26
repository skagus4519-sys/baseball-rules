/* ============================================================
   정적 페이지 빌드 스크립트   실행:  node build.js
   ------------------------------------------------------------
   rules-data.js 의 룰 146개로 개별 페이지를 만들어 검색에 노출시킵니다.
     r/<id>/index.html   룰 한 개짜리 페이지 (제목·설명·구조화 데이터 포함)
     r/index.html        룰 전체 목록(색인용 허브)
     sitemap.xml         검색엔진 제출용
     robots.txt
   ※ 앱(index.html)은 그대로 두고, 검색 유입용 페이지만 따로 생성합니다.
   ============================================================ */
const fs = require('fs');
const path = require('path');

global.window = {};
require('./rules-data.js');
const RULES = window.RULES, SIT_ICON = window.SIT_ICON;

/* 배포 주소 — 다른 도메인으로 옮기면 이 값만 바꾸면 됩니다 */
const SITE = 'https://skagus4519-sys.github.io/baseball-rules';
const OUT = __dirname;

const LV = {1:'입문자', 2:'집관러', 3:'직관러', 4:'야친자'};
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const strip = s => String(s).replace(/<[^>]+>/g,'');
/* 본문의 <a data-jump='id'>는 정적 페이지에선 실제 링크로 바꾼다 */
const linkify = s => String(s).replace(/<a data-jump=['"]([a-z0-9-]+)['"]>/g, (m,id)=>`<a href="../${id}/">`);

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Pretendard','Segoe UI','Malgun Gothic',sans-serif;background:#fbf4e6;color:#1b2a38;
  line-height:1.75;padding:0 16px 60px}
.wrap{max-width:760px;margin:0 auto}
header{padding:26px 0 8px;text-align:center}
header a.home{display:inline-block;font-size:14px;font-weight:800;color:#cf2b2b;text-decoration:none}
nav.crumb{font-size:12.5px;color:#5b6a78;padding:14px 2px 0}
nav.crumb a{color:#5b6a78}
article{background:#fff;border:3px solid #1b2a38;border-radius:6px;box-shadow:5px 5px 0 rgba(27,42,56,.85);
  padding:22px 20px;margin-top:12px}
h1{font-size:25px;font-weight:800;letter-spacing:-.5px;margin-bottom:8px}
.badge{display:inline-block;font-size:11.5px;font-weight:800;border:2px solid currentColor;border-radius:6px;
  padding:2px 8px;margin-right:6px}
.b1{color:#1f7a33}.b2{color:#1c72c4}.b3{color:#6d43c0}.b4{color:#d33a5c}
.cat{display:inline-block;font-size:11.5px;color:#5b6a78;border:2px solid #1b2a38;border-radius:5px;padding:1px 7px;margin-right:5px}
.summary{font-size:16px;font-weight:700;margin:12px 0 16px;padding:12px 14px;background:#fff6e6;
  border:2px solid #1b2a38;border-radius:8px}
article p{font-size:15px;margin-bottom:10px;color:#22313f}
article b{color:#c62f2f}
article a{color:#cf2b2b;text-underline-offset:2px}
.alias{font-size:12.5px;color:#5b6a78;margin-top:16px;padding-top:12px;border-top:2px solid #e6ded0}
.cta{display:block;text-align:center;margin-top:18px;padding:15px;background:#cf2b2b;color:#fff;
  font-size:15px;font-weight:800;text-decoration:none;border:3px solid #1b2a38;border-radius:10px;
  box-shadow:4px 4px 0 rgba(27,42,56,.8)}
.rel{margin-top:22px}
.rel h2{font-size:15px;font-weight:800;margin-bottom:9px}
.rel ul{list-style:none;display:flex;flex-wrap:wrap;gap:7px}
.rel a{display:inline-block;font-size:13px;font-weight:700;text-decoration:none;color:#1b2a38;background:#fff;
  border:2px solid #1b2a38;border-radius:999px;padding:6px 11px}
footer{text-align:center;color:#5b6a78;font-size:12px;padding:26px 0 0}
.idx{display:grid;gap:8px;margin-top:12px}
.idx section{background:#fff;border:3px solid #1b2a38;border-radius:6px;box-shadow:4px 4px 0 rgba(27,42,56,.8);padding:14px 15px}
.idx h2{font-size:16px;margin-bottom:9px}
.idx ul{list-style:none;display:flex;flex-wrap:wrap;gap:7px}
.idx a{display:inline-block;font-size:13px;font-weight:700;color:#1b2a38;text-decoration:none;
  border:2px solid #1b2a38;border-radius:999px;padding:5px 10px}
`;

function page({title, desc, canonical, body, jsonld}){
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(desc)}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:site_name" content="야구 룰 사전" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#dbe9f7" />
<link rel="icon" href="${SITE}/favicon-64.png" sizes="64x64" />
<style>${CSS}</style>
<script type="application/ld+json">${JSON.stringify(jsonld)}</script>
<script async src="https://www.googletagmanager.com/gtag/js?id=G-3PRP6G548J"></script>
<script>
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-3PRP6G548J');
</script>
</head>
<body>
<div class="wrap">
${body}
</div>
</body>
</html>
`;
}

/* ---------- 관련 룰 고르기: 같은 상황 태그 + 본문에서 링크한 룰 ---------- */
function related(rule){
  const linked = [];
  rule.body.forEach(p => { const m = p.match(/data-jump=['"]([a-z0-9-]+)['"]/g) || [];
    m.forEach(t => linked.push(t.replace(/.*['"]([a-z0-9-]+)['"].*/,'$1'))); });
  const sameSit = RULES.filter(r => r.id !== rule.id && (r.sit||[]).some(s => (rule.sit||[]).includes(s))
    && r.level === rule.level);
  const ids = [...new Set([...linked, ...sameSit.map(r=>r.id)])].filter(id => id !== rule.id);
  return ids.map(id => RULES.find(r=>r.id===id)).filter(Boolean).slice(0,8);
}

/* ---------- 룰 개별 페이지 ---------- */
let made = 0;
RULES.forEach(rule => {
  const dir = path.join(OUT, 'r', rule.id);
  fs.mkdirSync(dir, {recursive:true});
  const url = `${SITE}/r/${rule.id}/`;
  const desc = strip(rule.summary).slice(0,155);
  const bodyHtml = rule.body.map(p => `<p>${linkify(p)}</p>`).join('\n  ');
  const tags = (rule.sit||[]).map(s => `<span class="cat">${SIT_ICON[s]||''} ${s}</span>`).join('');
  const rel = related(rule);

  const body = `
<header><a class="home" href="${SITE}/">⚾ 야구 룰 사전</a></header>
<nav class="crumb"><a href="${SITE}/">홈</a> › <a href="${SITE}/r/">룰 사전</a> › ${esc(rule.title)}</nav>
<article>
  <div><span class="badge b${rule.level}">${LV[rule.level]}</span>${tags}</div>
  <h1>${esc(rule.title)}</h1>
  <p class="summary">${linkify(rule.summary)}</p>
  ${bodyHtml}
  <p class="alias">이렇게도 불러요 · ${rule.aliases.map(esc).join(' · ')}</p>
  <a class="cta" href="${SITE}/#rules">앱에서 룰 146개 전체 보기 · 퀴즈 풀기 →</a>
</article>
${rel.length ? `<div class="rel"><h2>함께 보면 좋은 룰</h2><ul>${
  rel.map(r=>`<li><a href="${SITE}/r/${r.id}/">${esc(r.title)}</a></li>`).join('')}</ul></div>` : ''}
<footer>비공식 팬 제작 · KBO 등 공식 기관과 무관하며 설명은 참고용입니다.<br>© 2026 야구 룰 사전</footer>`;

  const jsonld = {
    "@context":"https://schema.org",
    "@type":"DefinedTerm",
    "name": rule.title,
    "description": strip(rule.summary),
    "alternateName": rule.aliases,
    "url": url,
    "inDefinedTermSet": {"@type":"DefinedTermSet","name":"야구 룰 사전","url":`${SITE}/r/`}
  };

  fs.writeFileSync(path.join(dir,'index.html'),
    page({ title:`${rule.title} — 야구 룰 뜻과 설명 | 야구 룰 사전`, desc, canonical:url, body, jsonld }), 'utf8');
  made++;
});

/* ---------- 룰 목록 허브 ---------- */
const byLevel = [1,2,3,4].map(lv => ({
  lv, name: LV[lv], rules: RULES.filter(r=>r.level===lv)
}));
const idxBody = `
<header><a class="home" href="${SITE}/">⚾ 야구 룰 사전</a></header>
<nav class="crumb"><a href="${SITE}/">홈</a> › 룰 사전</nav>
<article>
  <h1>야구 룰 · 용어 ${RULES.length}개 모음</h1>
  <p class="summary">입문자부터 야친자까지 단계별로 정리한 야구 규칙·용어 사전입니다. 궁금한 용어를 눌러 뜻과 설명을 확인하세요.</p>
  <a class="cta" href="${SITE}/">검색·퀴즈·상황 판정은 앱에서 →</a>
</article>
<div class="idx">
${byLevel.map(g=>`<section><h2>${g.name} (${g.rules.length})</h2><ul>${
  g.rules.map(r=>`<li><a href="${SITE}/r/${r.id}/">${esc(r.title)}</a></li>`).join('')}</ul></section>`).join('\n')}
</div>
<footer>비공식 팬 제작 · KBO 등 공식 기관과 무관하며 설명은 참고용입니다.<br>© 2026 야구 룰 사전</footer>`;

fs.mkdirSync(path.join(OUT,'r'), {recursive:true});
fs.writeFileSync(path.join(OUT,'r','index.html'), page({
  title:`야구 룰·용어 ${RULES.length}개 총정리 | 야구 룰 사전`,
  desc:`인필드 플라이·낫아웃·보크·태그업 등 야구 규칙과 용어 ${RULES.length}개를 입문자부터 단계별로 쉽게 설명합니다.`,
  canonical:`${SITE}/r/`, body:idxBody,
  jsonld:{"@context":"https://schema.org","@type":"DefinedTermSet","name":"야구 룰 사전",
    "description":`야구 규칙·용어 ${RULES.length}개 사전`,"url":`${SITE}/r/`,
    "hasDefinedTerm":RULES.slice(0,50).map(r=>({"@type":"DefinedTerm","name":r.title,"url":`${SITE}/r/${r.id}/`}))}
}), 'utf8');

/* ---------- sitemap · robots ---------- */
const today = new Date().toISOString().slice(0,10);
const urls = [
  {loc:`${SITE}/`, pri:'1.0'},
  {loc:`${SITE}/r/`, pri:'0.9'},
  ...RULES.map(r=>({loc:`${SITE}/r/${r.id}/`, pri:'0.8'}))
];
fs.writeFileSync(path.join(OUT,'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u=>`  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.pri}</priority></url>`).join('\n')}
</urlset>
`, 'utf8');

fs.writeFileSync(path.join(OUT,'robots.txt'),
`User-agent: *
Allow: /

Sitemap: ${SITE}/sitemap.xml
`, 'utf8');

console.log(`룰 페이지 ${made}개 + 목록 1개 생성`);
console.log(`sitemap.xml : URL ${urls.length}개`);
console.log(`robots.txt  : 작성 완료`);
