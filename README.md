# ⚾ 야구 룰 사전

입문자 → 집관러 → 직관러 → 야친자 단계별 **야구 룰·용어 사전**과 **퀴즈**, **포지션 그림**, **중계·전광판 보는 법**을 담은 **비공식** 웹앱입니다. (설치·서버 불필요, 오프라인 지원 PWA)

- 룰·용어 **146개** (KBO 기준, 요약·재작성)
- 숙련도 + 상황(타격·주루·수비·투구·판정·기록·진행) 필터, 유사어 실시간 검색
- 퀴즈 44문항(레벨별 11개, 헷갈리는 오답)

---

## 1) 공개하기 — GitHub Pages (무료)

이 폴더는 이미 Git 초기화·커밋되어 있습니다. GitHub에 올리기만 하면 됩니다.

```bash
# 1. GitHub에 공개 저장소 만들고 푸시 (gh CLI 사용)
gh repo create baseball-rules --public --source . --remote origin --push

# 2. Pages 켜기: GitHub 저장소 → Settings → Pages
#    Source: "Deploy from a branch" / Branch: main / 폴더: / (root) → Save
```

몇 분 뒤 아래 주소로 공개됩니다:
```
https://<내-깃허브-아이디>.github.io/baseball-rules/
```

> 이후 룰을 수정하면: `git add -A && git commit -m "update" && git push` → 자동 반영.
> 룰을 크게 바꿨을 땐 `sw.js`의 `CACHE = 'baseball-rules-v1'`을 `v2`로 올려야 오프라인 캐시가 갱신됩니다.

### (선택) 커스텀 도메인
Netlify/Vercel/Cloudflare Pages에 이 폴더를 연결하거나, GitHub Pages의 Custom domain에 구매한 도메인(예: `baseballrule.kr`)을 연결하면 됩니다.

---

## 2) 앱스토어 출시 — 구글플레이(TWA)부터

가장 저렴·빠른 길은 **HTTPS로 공개된 이 PWA를 그대로 앱으로 포장**하는 것입니다. GitHub Pages가 HTTPS를 제공하므로 조건 충족.

### 구글플레이 (권장, 등록비 1회 $25)
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)으로 PWA를 안드로이드 앱(TWA)으로 감쌉니다.

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://<아이디>.github.io/baseball-rules/manifest.webmanifest
bubblewrap build      # app-release-bundle.aab 생성 → Play Console 업로드
```

- Play Console에서 앱 생성 → `.aab` 업로드 → 스토어 등록정보 작성 → 심사.
- 주소창 숨기기(전체화면)를 원하면 Bubblewrap이 만들어 준 `assetlinks.json`을
  `/.well-known/assetlinks.json` 경로(즉 이 저장소의 `.well-known/` 폴더)에 넣고 다시 배포하세요.

### 애플 앱스토어 (등록비 연 $99)
iOS는 TWA를 허용하지 않습니다. [Capacitor](https://capacitorjs.com/)로 감싸 Xcode(맥 필요)로 빌드·제출해야 합니다. 먼저 구글플레이로 시작하는 것을 권장합니다.

---

## 3) 수익화 메모

- **앱 내 광고 / 인앱결제**: 포장한 앱에 AdMob(광고)·인앱결제를 붙일 수 있습니다.
- **프리미엄**: 기본 무료 + 심화 룰/퀴즈팩/광고 제거 유료.
- 현실적으로 **설치·방문자 수가 커야** 수익이 의미 있어집니다. 스토어 설명·검색 노출이 관건.

## 4) 주의 (중요)

- 이 앱은 **비공식**입니다. **KBO 로고·명칭·상표를 쓰지 마세요.** 공식 제휴처럼 보이면 안 됩니다.
- 룰 내용은 공식 규정집을 **요약·재작성**한 것으로 참고용입니다(면책 문구 앱 하단에 표기됨).
- 광고를 붙이면 **개인정보처리방침** 페이지가 필요합니다(AdMob/AdSense 정책).

## 파일 구조
```
index.html              앱 본체 (UI·검색·퀴즈·SVG)
rules-data.js           룰 146개 + 포지션 + 퀴즈 44문항 데이터
manifest.webmanifest    PWA 설정
sw.js                   오프라인 서비스워커
icon-*.png              앱 아이콘
```
