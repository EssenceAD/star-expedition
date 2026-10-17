# 그림 3차 (10/17 오전 · 기획 쪽 Claude가 ChatGPT로 뽑음) — Code가 연결할 것

> `git pull origin main` 후 연결. 원본 시트는 `art_raw/`. 모든 캐릭터 그림은 투명 배경.

## 1. 필살기 컷인 36명 — `public/art/cutin/<id>.png` (900×450)
- 36명 전원. `data/heroes.ts`의 `CUTIN_ART`에 전원 등록함 → 필살기 컷인이 바로 일러스트로 나옴(지금은 웅스·재희아빠만 쓰던 경로).
- 협공 컷인은 두 영웅 컷인을 좌우/상하로 겹쳐 연출해도 됨(전용 그림은 나중).

## 2. 전신 일러스트 36명 — `public/art/fullbody/<id>.png` (600×900, 2:3, 발이 아래에 닿게 정렬)
- 형철 요청: **영웅 영입/상세를 눌렀을 때 나오는 전신컷**.
  - 영웅 상점에서 영웅 카드 탭 → 영입 확인 창: `screens/recruit.jpg` 배경 + 가운데 전신 + 이름·직업·소개·가격.
  - 영입 성공 연출: 별빛 마법진에서 전신이 솟아오름 + `ui/hero_frame.png`.
  - 영웅 정보 화면 가운데 큰 그림도 전신으로.
  - 로딩 화면: 전신 하나 + 영웅 한 줄 소개(랜덤).

## 3. 코스튬 「별빛 축제」 12벌 — `public/art/costume_festival/<id>.png` (600×900)
- 대상: woongs, gonu, walwal, ikamolly, warmnight, hwang, kleine, sermi, jaehi, mochi, ichae, kkangto
- 상점 「코스튬」 탭에 진열(전신 그림 + 가격), 영웅 정보 「코스튬」 탭에서 착용 → 영웅 정보·영입·로딩의 전신을 코스튬 그림으로 교체(전투 도트는 그대로, 나중에 색 변경 정도).
- 가격은 별가루(config). 출시 이벤트 「별빛 축제」로 묶어도 좋음.

## 4. 화면 배경 — `public/art/screens/`
| 파일 | 쓰는 곳 |
|---|---|
| `title.jpg` | 타이틀 키 아트(창립 13인). 위 가운데 하늘이 비어 있어 로고 자리 |
| `lobby.jpg` | 로비 마을(원정대 여관 · 시장 · 대장간 · 성). 왼쪽·아래는 UI 자리 |
| `map.jpg` | 모험 지도(길 위에 스테이지 노드, 오른쪽 위 폐성 = 보스) |
| `guild.jpg` | 길드 화면 |
| `recruit.jpg` | 영웅 영입/공개 무대(가운데 비어 있음) |

## 5. 전투 배경 — `public/art/bgs/` (2048×768, 기존 bg.jpg와 같은 규격·같은 바닥 높이)
- `tower.jpg` 도전의 탑 · `raid.jpg` 레이드/월드보스(용암) · `arena.jpg` 결투장 · `dungeon.jpg` 상급 던전(수정 동굴) · `daily.jpg` 요일 던전(보물 정원). 스토리는 기존 bg.jpg.
- 콘텐츠별 배경 고르기 + 패럴랙스 그대로.

## 6. UI 엠블럼 — `public/art/ui/`
- `victory.png` 승리 · `defeat.png` 패배 · `levelup.png` 레벨업 · `hero_frame.png` 새 영웅 합류 원형 틀. 리본은 비어 있음 → 글자는 폰트로 얹기(이미지에 글자 넣지 않음).

## 7. 이전 문서도 그대로
- ART_DONE_1017.md · ART_DONE_1017_2.md (고화질 초상화 · 직업별 무기 · 재료 아이콘 · 레이드 보스 바램 문제)
