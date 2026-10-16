# 별의 원정대 (가제) · 파일럿

「용사님, 체크인하실게요~」와 같은 세계의 외전 — 옆으로 진행하는 4인 파티 실시간 RPG 파일럿.

- 플레이: https://essencead.github.io/star-expedition/
- 그림 실험실: https://essencead.github.io/star-expedition/lab.html?hero=woongs (동작 버튼)

## 구성
- `src/battle/` 전투 (data · sim · render) — 웨이브 3 + 보스 · 스킬 3 (마나+쿨타임) · AUTO / 패널별 Auto · ×1/×1.5/×2 · DPS 미터 · 보스 패턴 예고 · 결과 별 3개
- `src/sprite/sheet.ts` HD 도트 프레임 시트 (줄 기준선 · 프레임끼리 맞춘 몸 기준 x)
- `src/core/` 「체크인」에서 복사: 오디오 엔진 · 전투 효과음 합성 · 플래그(flags.json 원격 끄기) · 저장(getPref) · Supabase 연결
- `tools/` 그림 파이프라인: `cut-cells.mjs`(GPT 시트 → 칸 프레임 · 마젠타 빼기 · 칸 넘는 이펙트 쪼개기 · 프레임 맞추기) · `key.mjs`(일러스트 배경 빼기) · `compare.mjs`(star_ 초상화와 비교) · `strip.mjs`(동작 띠) · `gif.mjs`(전투 GIF)
- `art_raw/` GPT 원본 시트 · `compare/` 「체크인」 초상화 대조

## 그림 원칙
개척자 5명은 「체크인」 `star_<id>.png`(신화) · `p_<id>.png`(평소) 초상화를 ChatGPT에 첨부해서 같은 대화 안에서 뽑는다 (글 설명만으로 뽑지 않음).
