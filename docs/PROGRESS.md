# 「별의 원정대」 진행 기록 (10/17 새벽 기준)

다음 대화는 이 파일 + ROADMAP_AND_PHASE1.md 부터 읽고 시작.

- 저장소: `C:\projects\star-expedition` (GitHub `EssenceAD/star-expedition`, Pages https://essencead.github.io/star-expedition/)
- 기획 문서: `docs/ROADMAP_AND_PHASE1.md`(개발 순서 + 1단계 명세) · `docs/STAR_EXPEDITION_SPEC.md`(세계관·영웅 32명·인연·성장) · `docs/SOUND_PLAN.md`(사운드)
- 「체크인」 레포(`C:\projects\legacy-of-adventure`)는 **읽기만**, 수정 금지

## 1. 끝난 것 — 파일럿 v0.1.0 (배포됨)
- Vite + TS + Canvas2D. 가로 844×390 논리 화면(창에 맞춰 확대)
- 전투 한 판: 웨이브 3 + 보스(이끼 골렘 「호박눈」), 실시간, 4인 파티
  - 영웅마다 패시브 1 + 액티브 3, 마나 + 쿨타임, 하단 패널(초상화·체력·마나·버프 아이콘·스킬 3 + 쿨타임 숫자·패널별 Auto)
  - 좌상단 AUTO, ×1/×1.5/×2 · 왼쪽 접히는 DPS 미터 · 상단 보스 초상화+체력+누적 피해+남은 시간(3분)
  - 보스 패턴 예고 한 줄(빨간 글) → 내려찍기/광선
  - 피해 숫자 만·억 단위, 치명타 금색+큼, 같은 대상 숫자는 위로 쌓기(아직 겹침 남음)
  - 스킬 컷인 0.6초(일러스트가 띠와 함께 가로지름 · 일러스트 없으면 초상화 확대)
  - 코드 이펙트: 빛줄기·빛기둥·파티클·흔들림·번쩍임·잔상
  - 결과: 별 3개(클리어 / 아무도 안 쓰러짐 / 120초 안), 보상, MVP
  - AUTO 클리어 105~111초 (tests/sim.test.ts)
- 「체크인」에서 복사한 모듈: `src/core/` 오디오 엔진·전투 효과음 합성·플래그(flags.json)·저장(getPref)·Supabase 연결, `scripts/deploy.mjs`·`check-flags.mjs`, 패치노트, 데미지 공식(치명 15%×2, 방어 감쇠, 히트스톱)
- 파일 구조: `src/battle/`(data·sim·render) · `src/sprite/sheet.ts`(도트 시트 재생) · `src/main.ts`(HUD) · `src/lab.ts`(그림 실험실 `lab.html?hero=woongs`) · `tests/sim.test.ts`
- 배포: `npm run deploy` (테스트 → 빌드 → gh-pages 강제 푸시). 패치노트 맨 위 버전 = package.json 버전이어야 함

### 그림 (HD 도트 + 일러스트, ChatGPT)
| 대상 | 있는 것 | 폴더 |
|---|---|---|
| 웅스 | 시트1(대기·걷기·평타·피격+쓰러짐) + 시트2(스킬 3·승리), 6프레임씩 · 컷인 일러스트 | `public/art/w1`, `w2`, `cutin/woongs.png` |
| 이카몰리·왈왈콩선생·따뜻한밤·고느끼 | 대기·평타 6프레임씩 | `public/art/<id>` |
| 적 | 슬라임·고블린·늑대 (대기 2 + 공격 2) | `public/art/mobs_px` |
| 보스 | 이끼 골렘 (대기 4 + 내려찍기 4) · 초상화(얼굴 잘라냄) | `public/art/boss`, `portraits/boss_golem.png` |
| 배경 | 들판 길 일러스트 1장 | `public/art/bg.jpg` |
| 초상화 | 「체크인」 star_ 5명 복사 | `public/art/portraits/star_*.png` |
- GPT 원본은 `art_raw/`, 「체크인」 초상화 대조는 `compare/` (`_all_vs_star.png` = 5명 모음 → 같은 사람으로 보임 확인)
- 결과물(저장소 밖으로 안 올림, `out/`): 전투 GIF 2개(시작·보스), 컷인 순간 사진

### 그림 작업 시간 (보고한 값)
- 웅스 전 동작 + 컷인: 약 18분(생성 대기 3분×3장 + 받기·자르기·확인) · 대기·평타만인 영웅 1명: 약 4분
- 처음 한 번 도구 만들기: 약 40분 · 30명 확장 예상: 1명 20~25분(4장) → 다시 뽑기 30% 포함 12~15시간

## 2. ChatGPT 그림 뽑는 방법 (반드시 이대로)
1. **Claude in Chrome**으로 형철 브라우저의 chatgpt.com 사용. 모드는 Chat. 한 영웅 묶음은 **같은 대화 안에서** 이어 뽑기(일관성). 새 묶음이면 새 대화(이전 디자인 섞임 방지)
2. **개척자 5명(woongs·gonu·ikamolly·walwal·warmnight)은 반드시 「체크인」 초상화 첨부**: `star_<id>.png`(신화) + `p_<id>.png`(평소). 글 설명만으로 뽑지 말 것
   - 첨부 방법: chatgpt.com 페이지 안에서 JS로 GitHub Pages 그림을 `<img crossOrigin='anonymous'>`로 읽음(→ fetch는 CSP로 막힘) → 캔버스에 최근접 8배 확대 → `File` → `DataTransfer` → 입력창(`#prompt-textarea`)에 `ClipboardEvent('paste')` 발송
   - 주소: `https://essencead.github.io/legacy-of-adventure/assets/portraits/<이름>.png`
   - 프롬프트에 「MUST KEEP」 특징 4~6개를 영어로 (예: 웅스 = 짧게 깎은 검은 머리·구릿빛 피부·이 보이게 웃음·다부진 체격·목에 흰 수건·금갈색 어깨 갑옷·큰 양손 대검)
3. 시트 규칙(프롬프트에 꼭): 「strict grid R rows x C columns, all cells the same size, character ~100 game-pixels tall, feet on the same baseline within a row, each frame fully inside its own cell, perfectly flat solid magenta background (#FF00FF), no text, no grid lines, no ground shadow」, 방향(영웅 RIGHT / 적 LEFT)
4. **다운로드**: 생성된 이미지는 `main img[alt*="생성된"]`의 blob → JS로 `<a download="se_이름.png">` 클릭. **Chrome은 한 페이지에서 두 번째 다운로드부터 막는다 → 받을 때마다 대화 주소로 새로고침(navigate) 후 받기.** 파일은 `C:\Users\choly\Downloads\se_이름.png` (가끔 `.tmp`로 먼저 생김 — 크기 같으면 그대로 써도 됨)
   - 긴 대화는 이미지가 늦게 로드됨 → 스크롤을 맨 아래로 내린 뒤 찾기. 이미지 보기 창(편집 대화상자)이 열리면 새로고침
5. 자르기 (`tools/`):
   - `node tools/cut-cells.mjs art_raw/<시트>.png public/art/<폴더> <열>x<줄>` — 동작 시트 → 칸별 프레임 + `_parts.json`. 마젠타 빼기(분홍 머리 보존하게 엄격히), 칸 넘는 덩어리는 칸 경계에서 쪼갬(작은 삐져나온 조각 버림), 줄 기준선, **프레임끼리 알파 겹침으로 몸 위치 맞추기(ax)** — GPT가 칸 안에서 그림을 제멋대로 옮겨 그려서 필수
   - `node tools/key.mjs <일러스트.png> <out.png> [가로]` — 일러스트 배경 빼기 + 줄이기(컷인)
   - `node tools/compare.mjs <id> <폴더> <시트> <out.png>` — star_ 초상화와 나란히 (같은 사람인지 확인용 · 뽑을 때마다 만들어 보고)
   - `node tools/refsheet.mjs` — 「체크인」 초상화 확대 모음(`art_raw/ref/`)
   - `node tools/strip.mjs <out> hero=<id> acts=...` — 동작 띠 확인 · `node tools/gif.mjs <out.gif> 초 fps 건너뛸초` — 전투 GIF(`?rec=1` 고정 걸음) · `tools/tojpg.mjs` — 배경 JPEG
   - `tools/cut-sheet.mjs` — 덩어리 단위 자르기(예전 방식, 한 줄 시트는 `--byx`)
6. 데이터 연결: `src/battle/data.ts`의 `anims`에 `"<폴더>:r<줄>c<칸>"` 프레임 이름

## 3. 막혔던 점과 해결
| 문제 | 해결 |
|---|---|
| 이 PC의 python은 Windows 스토어 가짜 → 「체크인」 파이썬 도구 못 씀 | Node(pngjs)로 다시 작성 |
| 두 번째 다운로드부터 Chrome이 막음 | 받기 전마다 페이지 새로고침 |
| chatgpt.com CSP가 fetch 막음 | `<img crossOrigin>` + 캔버스로 첨부 |
| GPT가 칸 안 위치를 프레임마다 바꿈(30px 떨림) | 알파 겹침 정렬(ax) |
| 이펙트가 옆 프레임·아래 줄과 붙어 한 덩어리 | 칸(행·열) 경계에서 쪼개기, 30% 미만 조각 버림 (일부 궤적 끝이 직선으로 잘림 — 코드 이펙트로 덮음) |
| 분홍 머리가 마젠타로 지워짐 | 마젠타 판정 엄격히 (min(r,b)−g > 110) |
| 글 설명만으로 뽑은 웅스가 「체크인」과 딴사람 | 초상화 첨부 원칙 |
| GPT 도트는 엄밀한 격자 아님 | 전투 크기에선 티 거의 없음 (3단계에서 판단) |
| vite 빌드 top-level await | build.target es2022 |
| CSS `display:flex`가 `hidden`을 덮음 | `[hidden]{display:none!important}` |

## 4. 형철이 내린 결정
- 그림 방식: **2D 부품 인형 폐기 → HD 도트 전투 캐릭터 + 애니풍 고퀄 일러스트(초상화·컷인·카드)**. 3D 아님
- 개척자 5명은 「체크인」 신화 초상화 기준, 첨부해서 뽑기. 얼굴·체형·대표 소품 유지
- 킹스레이드는 장르 문법만. 이름·캐릭터·그림·UI 배치·스토리 금지. HUD 디자인은 우리 것
- 개발 순서: **1단계 시스템 → 2단계 비주얼 정체성(스타일 보드 → 형철 승인) → 3단계 그림** (ROADMAP §0)
- 1단계: 새 그림 금지(있는 시트·몬스터 돌려 쓰기, 없는 영웅은 색 바꾼 자리표시자 + 이름표), 색·폰트·여백·테두리·아이콘은 테마 토큰 파일 하나에서만
- 전투 화면 구조(진형 앞 2/뒤 2, 피해 숫자 겹침, 화면 꽉 채우기)는 1단계에서 고침. 그림·폰트·아이콘 꾸미기는 2단계
- 큰 덩어리마다 중간 보고 + 배포, 경제 시뮬 표 + 화면 흐름도 같이
- 파일럿 파티 4번째 자리: 황짐승은 초상화가 없어 **따뜻한밤(궁수)으로 임시 대체 — 형철 결정 대기** (황짐승 기준 그림 or 고느끼)
- 같은 Supabase·같은 계정(게스트 포함), 저장은 별도 테이블

## 5. 지금 하던 것 (1단계 시작 직후 멈춤)
- `src/theme/tokens.ts` 작성함 (색·등급·속성·폰트·여백·반경·테두리·그림자·전투 캔버스 색·아이콘 + `applyTheme()`/`icon()`). **아직 어디에도 연결 안 됨** — style.css·render.ts가 아직 리터럴 색을 씀
- 그 외 1단계 코드는 시작 전

## 6. 다음 할 것 — 1단계 (ROADMAP §1~§10 전부, 4덩어리로 나눠 덩어리마다 보고+배포)
- **A. 토대**: 테마 토큰 연결(+ 토큰 밖 색 리터럴 막는 테스트), `config.ts`(모든 숫자), 데이터(직업 9·영웅 32·인연·몬스터·스토리 1~3장 대사/4~10장 자리), 저장(버전·이전), 화면 라우터, 타이틀 → 프롤로그 → 로비, 모험(장/스테이지/난이도) → 편성(앞 2/뒤 2) → 전투(화면 꽉 채우기·숫자 겹침 해결·상태이상 기절/침묵/둔화/화상/보호막) → 결과(MVP·DPS 기록), 소탕, 방치 보상
  - 그림 없는 영웅 자리표시자: 직업별로 있는 시트(전사·기사·격투가→웅스, 마법사→이카몰리, 사제·드루이드→왈왈콩, 궁수·기계공학자→따뜻한밤, 암살자→고느끼)에 `T.battle.tint` 색 바꾸기 + 이름표. 초상화는 「체크인」 `legend_<key>.png`(전설 13명) · `mc_<직업>_<m|f>.png`(그 외) 복사해서 사용 가능
- **B. 성장·장비**: 레벨·각성·스킬 레벨·초월(2택)·전용 무기·전용 보물(수치만)·인연 효과, 영입소(확정 영입), 장비(등급·성·티어·강화+10·옵션 3~4줄·별 올리기 확률+실패 보정·옵션 바꾸기·룬+합성·소프트캡 표시·전수·일괄 판매/분해·정렬/잠금·장비 뽑기) + **경제 시뮬 표**(라이트/보통/헤비 × 1·7·30일)
- **C. 콘텐츠**: 탑, 요일 던전, 협동 레이드(8인 = 내 4 + AI 4), 길드 레이드(주간), 월드 보스(공용 체력 · 1단계는 로컬+AI 기여), 아레나(비동기 AI 덱·리그), 일일/주간 임무·출석, 상점 4종, 우편
- **D. 소셜**: 길드(실제 멤버 길드 1 + AI 길드 여러 개 · 출석·기여·상점·채팅), AI 플레이어(「체크인」 `src/data/chat_pool.json` 말투 참고), 월드 채팅, 랭킹(탑·월드 보스·아레나·길드 기여)+랭커 칭호, 계정·클라우드 저장(같은 Supabase · 새 테이블 SQL은 형철이 적용), **화면 흐름도**, 전 화면 클릭 e2e
- 2단계용 메모(지금 하지 말 것): ROADMAP §11 · 3단계: §12

## 7. 참고
- 미리보기 서버: `.claude/launch.json`의 `star-dev` (포트 5190, 쓰이면 5191)
- 테스트: `npx vitest run` · 자동 플레이: `node tools/play.mjs <폴더> <초>`
- `.env.production` = 「체크인」과 같은 Supabase 공개 키
