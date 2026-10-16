# 별의 원정대 (가제) · 1단계 시스템

「용사님, 체크인하실게요~」와 같은 세계의 외전 — 옆으로 진행하는 4인 파티 실시간 RPG. 진행 기록은 `docs/PROGRESS.md` · 최신 기준 계획은 `docs/STAR_PLAN_v2.md` · 화면 흐름도 `docs/FLOW.md` · 경제 시뮬 표 `docs/ECONOMY.md`.

- 플레이: https://essencead.github.io/star-expedition/
- 그림 실험실: https://essencead.github.io/star-expedition/lab.html?hero=woongs (동작 버튼)

## 구성
- `src/theme/tokens.ts` **색·폰트·여백·테두리·그림자·아이콘의 유일한 출처** (`tests/theme.test.ts`가 다른 파일의 리터럴을 막음)
- `src/config.ts` 모든 숫자 (전투·성장·스테이지·보상·행동력·반복 전투·부스터·방치)
- `src/data/` 직업 9 · 영웅 32 · 스킬 효과 · 인연 · 몬스터·보스 패턴 · 스토리 10장
- `src/game/` 저장(v1→v4 이전) · 장비·룬(`gear.ts`) · 영웅 성장(`growth.ts`) · 상점(`shop.ts`) · 콘텐츠(`content.ts`: 토벌·던전·탑·요일·레이드·월드 보스·결투장·외전·이정표) · 미션·출석(`missions.ts`) · 길드·친구·랭킹·우편·채팅(`social.ts`) · 원정대 레벨·행동력·부스터(`account.ts`) · 영웅 레벨·전투력 · 스테이지(열림·보상·기록·반복 전투) · 방치
- `src/battle/` 전투 (setup · sim · render) — 위치 3구역(전방·중앙·후방) · 상태이상 · 피해 숫자 겹침 없음 · 화면 비율 맞춤
- `src/ui/` 화면 라우터·공통 상단 바·채팅 한 줄(`core.ts`의 FLOW) · 타이틀/로비/모험/전투 준비/영웅 목록(`screens.ts`) · 영웅 정보/가방/상점(`screensB.ts`) · 장비 칸·상세(`gearui.ts`) · 콘텐츠(`screensC.ts`) · 미션·길드·친구·랭킹·우편·설정·채팅(`screensD.ts`) · 전투 HUD·결과(`battle.ts`)
- `src/sprite/sheet.ts` HD 도트 프레임 시트 (줄 기준선 · 프레임끼리 맞춘 몸 기준 x)
- `src/core/net/cloud.ts` 「체크인」 계정 로그인·클라우드 저장·채팅 서버 (SQL: `supabase/star_expedition.sql`)
- `src/core/` 「체크인」에서 복사: 오디오 엔진 · 전투 효과음 합성 · 플래그(flags.json 원격 끄기) · 저장(getPref) · Supabase 연결
- `tools/` 그림 파이프라인(`cut-cells` · `key` · `compare` · `strip` · `gif`) · `e2e.mjs`(화면 클릭 시험) · `shot-battle.mjs`(전투 장면)
- `art_raw/` GPT 원본 시트 · `compare/` 「체크인」 초상화 대조

## 명령
- `npx vitest run` 자동 테스트 · `npm run build` 뒤 `node tools/e2e.mjs out/e2e` 클릭 시험 · `npm run deploy` 배포

## 그림 원칙
개척자 5명은 「체크인」 `star_<id>.png`(신화) · `p_<id>.png`(평소) 초상화를 ChatGPT에 첨부해서 같은 대화 안에서 뽑는다 (글 설명만으로 뽑지 않음).
