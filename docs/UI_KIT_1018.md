# UI 키트 적용 · WIND 개편 (10/18 · v0.12.0)

기준 문서: `AUDIT_1018.md`(원인·방향), `ART_RULES_1018.md`(그림 규칙). 이 문서는 **구현 명세**다.
정답 화면: `docs/captures/target_1018/*.jpg` (1688×780 = 844×390 논리 px × 2). 합성 스크립트 `tools/target_screens.py`에 모든 좌표가 숫자로 들어 있다. **위치·크기는 눈대중으로 정하지 말고 이 스크립트와 아래 표에서 가져온다.**

---

## 0. 원칙 (어기면 실패)
1. **CSS로 장식을 그리지 않는다.** 새 코드에 `border`(0/none 제외), `border-radius`, `linear-gradient`/`radial-gradient`, `box-shadow`, `outline` 장식 금지. 틀·판·버튼·바는 전부 `public/art/ui/kit2/` 그림이다.
   - 9-slice는 CSS `border-image`(그림)로 그린다 → 허용.
   - 테스트 `tests/css_lint.test.ts`: `src/**/*.css`와 `.ts` 안 인라인 스타일에서 위 속성 개수를 세서 `tests/css_lint_baseline.json` 값보다 많으면 실패. 이번 작업으로 바꾼 화면에서는 지워서 기준값을 **내린다**(올리는 건 금지).
2. **글씨체 2종.** 정보 글씨 = `Gothic A1` 700/800, 화면 제목·리본 = `Hahmlet` 800. 피해 숫자만 전투 캔버스에서 기존 Luckiest Guy 유지. `Noto Serif KR`, `Cinzel` 제거. 글씨는 어두운 외곽선 1px(`-webkit-text-stroke` 대신 `paint-order: stroke` + `text-shadow` 1px 4방향 허용 — 이건 글씨 가독용이라 예외).
   - 꾸밈 글씨(BATTLE, VICTORY, LEVEL UP, DEFEAT, 로고)는 그림이다: `public/art/ui/title/`.
3. **안전 여백.** 모든 화면의 바깥 요소는 `max(16px, env(safe-area-inset-*))` 안쪽에 둔다(아이폰 노치·홈바, 아이패드). `<meta name=viewport content="..., viewport-fit=cover">` 확인. 아래 표의 `SAFE`가 이 값이다.
4. **반응형.** 기준은 844×390(가로 폰). 다른 크기는 기준 레이아웃을 `min(vw/844, vh/390)`로 균일 확대하고 남는 쪽은 배경만 늘린다(UI가 늘어나 찌그러지지 않게). 아이패드(1180×820 등 4:3에 가까움)는 위·아래 여백에 배경이 보이는 게 정상. 확인 해상도: 844×390, 932×430, 667×375, 1180×820, 1920×1040.
5. **잘린 그림 0장.** `python3 tools/art_audit.py`가 0이 아니면 배포하지 않는다(`scripts/deploy.mjs`에 넣는다).

---

## 1. 키트 불러오기 (`src/ui/kit.ts` 새로)
- `public/art/ui/kit2/_kit.json`: `{이름: {w, h, inset:[l,t,r,b], slice?:[s,s,s,s]}}` (원본 px).
  - `slice` 있는 부품 = 9-slice. `inset` = 안쪽 내용(글씨·아이콘·초상) 자리.
- 함수:
  - `kitFrame(el, name, {corner})`: `border-image: url(kit2/name.png) s fill / {corner}px / 0 stretch` + `border-style: solid; border-width: {corner}px`. 여기서 `border`는 그림을 위한 것이라 린트 예외(`border-image`와 같이 쓰인 경우만).
  - `kitPart(name, w, h)`: 고정 그림(`<img>` 또는 background). 안쪽 자리 `innerRect(name, w, h)` = inset × (w/원본w, h/원본h).
  - `kitSocket(iconUrl, size, rarity?)`: 아이콘을 innerRect에 꽉 채우고 받침 그림을 **위에** 겹친다(받침 가운데는 투명).
- 부품 목록과 용도:

| 부품 | 용도 |
|---|---|
| `popup` + `title_ribbon` | 모든 팝업(보상·미션·업적·우편·설정·가방·장비…) 1종. 리본에 Hahmlet 제목 |
| `panel_parch` / `dialog` | 팝업 안 양피지 칸, 대화창 |
| `row` | 목록 줄(미션·업적·랭킹·친구) |
| `plate` | 로비 왼쪽 위 플레이어 판 |
| `pill` | 작은 값 칸(재화, 자동, 배속) |
| `btn_gold` / `btn_navy` | 주 버튼 / 보조 버튼 |
| `medal` / `medal_big` | 원형 메뉴·결과 버튼(가운데 어두움 → 아이콘을 위에 얹음) |
| `tab_on` / `tab_off` | 탭 |
| `bar` / `bar_thick` | HP·MP 얇은 바 / 경험치·보스 HP 굵은 바(안쪽 채움만 코드가 단색 사각형으로 그림 — 이건 허용) |
| `socket` | 스킬 아이콘 받침 |
| `socket_common/rare/epic/legend` | 아이템 등급 받침 |
| `badge`, `check`, `lock`, `star`, `next`, `back` | 작은 표식 |
| `ribbon` | 장 제목·띠 |
| `nameplate` | 이름판(전투 아래 영웅 이름, 대화 이름) |
| `loot_band` | 결과 「전리품」 띠 |
| `sign` | 로비 건물 이름판 |
| `strip` | 전투 위 가운데 정보 띠, 결과 위 원정대 레벨 |
| `card_1..4` | 영웅 카드 틀(★1·2 → 1, ★3 → 2, ★4 → 3, ★5 → 4). 초상은 inset 창 안에 |
| `pause`, `handle` | 일시정지, DPS 접기 손잡이 |

---

## 2. 이름 바꾸기: W.I.N.D
- 게임 이름: **W.I.N.D** — *Wayfarers of the Infinite Night's Dawn* / 한글 부제 「바람의 원정대」.
- `index.html` `<title>`, manifest(`name`, `short_name: "WIND"`), 화면 안의 「별의 원정대」 글자 전부, 공유 문구. 저장 키·DB 이름은 바꾸지 않는다(기존 세이브 유지).
- 멤버 단톡방 이름은 「윈드」. 다섯 멤버를 따로 강조하지 않는다(모든 영웅 동등).
- 프롤로그 첫 줄: 「밤이 끝나지 않는 세계. 별바람을 따라 걷는 원정대가 있었다.」

## 3. 타이틀 화면 (`target_1018/title.jpg`)
- 배경 `ui/title/key_art.jpg` cover. 로고 `ui/title/logo.png` 가로 380px, 위 `SAFE+4`, 가운데. 그 아래 6px에 「바람의 원정대」 Hahmlet 19px.
- 「화면을 눌러 시작」 Gothic A1 15px, 아래에서 `SAFE+40` 중심, 1.6초 주기로 알파 0.5↔1.
- 오른쪽 아래 버전 7px.
- 별 반짝임: 키아트 위에 작은 점 12개 랜덤 깜빡(캔버스 또는 CSS opacity 애니메이션, 장식 그리기 아님).

## 4. 전투 (`battle.jpg`, `battle_start.jpg`, `victory.jpg`)
**위 HUD**
| 요소 | 부품 | x, y, w, h (논리 px) |
|---|---|---|
| 자동 | `pill` 9-slice corner 12 | SAFE, SAFE-4, 58, 24 · 글씨 「자동」 10px 금색 #ffd678 |
| 배속 | `pill` | SAFE+64, SAFE-4, 38, 24 · 「×1」「×2」 |
| 가운데 띠 | `strip` corner 15 | 가운데, SAFE-6, 260, 30 · 「숲 동굴 1-2 · WAVE 1/2 · 2:41」 9.5px |
| 일시정지 | `pause` | 오른쪽 SAFE, SAFE-4, 44, 25 |
| DPS 접힘 | `handle` | SAFE-6, 110, 26, 25 + 아래 「피해량」 7px. 누르면 미터 펼침(`panel_parch` 대신 `popup` 작은 판, 글씨 1종) |
- 시계 타원, WAVE 판, 포기 버튼(→ 일시정지 메뉴 안으로), 기존 접기 손잡이는 지운다.

**아래 영웅 4칸** — 칸 너비 203, 첫 칸 x = SAFE+4
| 요소 | 내용 |
|---|---|
| 상반신 | 전신 그림 trim 후 위 42%를 잘라 높이 84, 최대 너비 66, 칸 x+33 중심, 화면 아래에 붙임. 아래 25% 알파 페이드. **틀 없음.** |
| 이름판 | `nameplate` corner 9, x+68, y 302, 126×18 · 이름 8px 왼쪽 / 「Lv.5」 7px 오른쪽(#f3dca0) |
| HP | `bar` x+68, y 321, 126×9, 채움 #6ed25a |
| MP | `bar` x+68, y 330, 126×7, 채움 #5096ff |
| 스킬 3개 | `socket` 40×40, x+68+j·43, y 339. 아이콘은 inset 창에. 쿨다운 = 창 위 알파 0.55 검정 + 남은 초 12px 흰색 |
- 「전사 Lv.1」 직업 글씨, 아이콘 위 작은 숫자는 지운다.
- 상반신 확인 시트: 36명 칸을 한 장으로 찍어(`docs/captures/impl_1018/busts.jpg`) 얼굴이 잘리지 않는지 직접 본다. 잘리면 `src/data/heroes.ts`에 영웅별 `bust:{dx,dy,scale}` 보정값.

**필드**
- 영웅·몹 발밑 그림자(타원, 캔버스 그리기 — 허용). 발이 그림자 가운데 닿게(지금 공중에 뜸). 영웅 발 y 272~294, 몹 274~296(대각선 3줄 배치: 앞·가운데·뒤 줄).
- 걷기 위아래 튐 제거: 걸을 때 y 흔들림 0(또는 1px 이하). 도트 프레임만 넘긴다.
- 머리 위 HP바: `bar` 44×7(영웅), 40×7(몹).

**연출 순서**
1. 시작: 화면 0.35 어둡게 + 빛살 + `word_battle.png` 가로 360, (422,170) 중심. 0.15초 커짐 → 0.6초 유지 → 0.15초 사라짐.
2. 보스 웨이브 전: 검은 화면 0.6 + 보스 전신(오른쪽) + `ribbon`에 「BOSS」 + 보스 이름 Hahmlet. 1.5초, 탭하면 넘김.
3. 궁극기: 컷인(지금 대각선 띠 유지) 동안 위·아래 HUD 알파 0.3 → 컷인 끝 0.2초 히트스톱(게임 시간 정지) → 발동.
4. 일반 스킬: 컷인 없이 시전자 발밑 빛 0.3초 → 발동.
5. 끝: `word_victory.png` 가로 470 (422,170) 중심 + 빛살 1.2초 → 결과 화면. 패배는 `word_defeat.png`.

## 5. 결과 화면 (`result.jpg`) — 지금 깨진 화면(가로 스크롤·거대 글씨)을 이걸로 교체, 스토리·콘텐츠·레이드가 같은 화면을 쓴다
| 요소 | 값 |
|---|---|
| 배경 | 전투 배경 흐림 6px + 어둡게 0.68 |
| 위 | `strip` 262, SAFE-6, 320×30 · 「원정대 레벨 4」 + `bar_thick` 380, SAFE+2, 180×14 |
| 영웅 4명 | 전신 높이 190, 발 y 256, 중심 x = 257 + i·110 |
| LEVEL UP | 레벨 오른 영웅만 `word_levelup.png` 가로 84, (x, 52) 중심, 0.3초 튀어나옴 |
| 영웅 아래 | 「Lv.5」 8.5px 왼쪽, 「EXP +122」 7.5px 오른쪽(#96e678), `bar_thick` x-48, 284, 96×12 + 가운데 % |
| 전리품 | `loot_band` 122, 306, 600×62 · 가운데 「전리품」 9px · 아이템 `socket_<등급>` 42×42, x = 322 + j·50, y 318. 0.15초 간격으로 하나씩 반짝 |
| 버튼 | 오른쪽 `medal` 56×56 3개(다음 전투·다시하기·나가기), 중심 y 82/166/250, 글씨 8px 아래. 왼쪽 아래 `medal` 48 「통계」(시간·총 피해·MVP는 이 안) |

## 6. 로비 마을 (`lobby.jpg`)
- 배경 `ui/bg/lobby_town.jpg`(쿼터뷰 마을). 화면보다 넓으면 좌우 드래그 스크롤.
- 건물 이름판 `sign` 84×30, Hahmlet 10px 연금색. 위치(배경 그림 기준 비율, 844×390 cover일 때 논리 좌표): 길드(430,92) · 출격(300,150) · 영웅(170,210) · 상점(560,190) · 대장간(660,120). 누르면 해당 화면. 결투장·레이드·도서관(스토리 다시보기)은 그림 위 빈 건물에 같은 방식으로 추가(좌표는 화면 보면서 건물 지붕 위).
- 마을 안 영웅 2~3명이 길 위를 천천히 걷는다(전신 아니라 전투 도트 걷기, 높이 64). 6~10초마다 한 명이 말풍선(`dialog` 104×30, 9px 갈색 글씨) 2.5초. 대사는 `src/data/lobbyLines.ts`(영웅당 5줄, 단톡 말투).
- 왼쪽 위 `plate` 170×34 「이름 Lv」, 오른쪽 위 재화 `pill` 112×24 2개.
- 아래 메뉴 `medal` 50 4개(영웅·가방·임무·도감) + 오른쪽 아래 `btn_gold` 150×46 「출격」 Hahmlet 15px. 나머지 메뉴(길드·친구·랭킹·우편·설정…)는 건물이나 오른쪽 위 ≡ 안으로. 한 화면 버튼 7개 이하.
- 왼쪽 큰 판은 지우고 진행 중 미션 2줄만(`row` 작게).

## 7. 영웅 목록·카드 (`heroes.jpg`)
- 카드 규격 1종: 92×190(목록), 같은 비율로 편성·상점·결투장 상대·업적에 재사용. 틀 = `card_N`(별에 따라), 전신을 inset 창 높이 ×1.05로 아래 맞춤, 가운데. 이름 8.5px 아래, `star` 10px × 별 수.
- 위: `back` 30, `title_ribbon` 160×34 「영웅」, 탭 `tab_on/off` 68×26 × 5(전체·전사·궁수·마법사·사제).
- 영웅 정보: 탭 4개(일반·스킬·장비·성장)로 줄이고 한 탭에 한 덩어리.

## 8. 팝업 (`popup.jpg`)
- 모든 팝업 = `popup` 9-slice(corner 40) + 위 가운데 `title_ribbon` 200×34(위로 12px 걸침) + 안쪽 `panel_parch` + 아래 `btn_navy`(취소/닫기) · `btn_gold`(확인/받기) 120×38.
- 남색 판 + 금선 CSS, 양피지 CSS 그라데이션 전부 제거.

## 9. 스킬 아이콘
- `public/art/skills/<hero>_<0-2>.png` 108장을 새 그림(192×192, 정사각 꽉 참)으로 바꿨다. 원형 마스크·원형 받침 쓰던 코드는 정사각 `socket`으로.

## 10. 확인·보고 (숫자로)
- e2e로 같은 장면을 844×390@2로 찍어 `docs/captures/impl_1018/<화면>.jpg`에 저장하고, `target_1018`과 나란히 붙인 `<화면>_cmp.jpg`를 만든다(위 = 정답, 아래 = 구현).
- 각 화면에서 직접 확대해 확인: 글씨가 틀·막대와 겹치지 않음, 초상·아이콘이 창 밖으로 안 나감, 안전 여백 안쪽.
- `npm test`, `npx tsc --noEmit`, e2e 통과. `css_lint` 기준값이 이전보다 내려감.
- 버전 0.12.0, 패치노트 맨 위에 「W.I.N.D로 이름이 바뀌었어요」 + 바뀐 화면 요약.
