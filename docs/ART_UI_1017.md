# UI 키트 · 스킬 아이콘 · 황짐승 수정 (10/17) — UI_POLISH_1017 5·6번 재료

## UI 키트 `public/art/ui/kit/` (투명 PNG, 원본 크기 · 그림 테두리 → CSS `border-image`)
| 파일 | 크기 | 쓰는 곳 | 9-slice (위 오른 아래 왼, px) |
|---|---|---|---|
| panel_parchment.png | 913×525 | 큰 양피지 패널(영웅 정보·상점 칸·팝업) | 70 70 70 70 |
| panel_navy.png | 461×229 | 남색 패널(전투 DPS판·툴팁·편성 파티칸) | 40 40 40 40 |
| btn_blue.png | 468×123 | 기본 버튼(전투 준비·확인) | 0 70 0 70 (가로만 늘림) |
| btn_gold.png | 467×126 | 강조 버튼(구매·영입·각성) | 0 70 0 70 |
| skill_ring.png | 212×209 | 전투 HUD 스킬 버튼 틀(아이콘 위에 덮기) | 통째 |
| slot_common/uncommon/rare/epic/legend.png | ~180² | 장비·아이템·보상 칸 틀(등급별) | 40 40 40 40 또는 통째 |
| tab.png / tab_on.png | 310×93 / 334×95 | 탭(기본/선택) | 0 50 0 50 |
| capsule.png | 517×79 | 상단 재화 바 | 0 50 0 50 |
| hud_card.png | 722×200 | 전투 아래 영웅 칸 판(왼쪽 네모=초상화 자리) | 통째 배경(contain) |
| bar_hp.png / bar_mp.png | 481×64 | HP·마나 바 틀(안쪽 채움은 CSS로 그대로) | 0 50 0 50 |
| btn_close.png / btn_back.png | 둥근 금 테 | 닫기·뒤로 | 통째 |

- 위 숫자는 그림을 보고 잡은 값(추정) → 화면에서 모서리 장식이 늘어나 보이면 조정.
- 테두리 그림이 들어가면 기존 1px 선·회색 테두리는 지움(UI_POLISH 2번).

## 스킬 아이콘 `public/art/skills/<영웅id>_<0|1|2>.png` — 108개, 128×128, 금 테두리 포함
- 0·1·2 = heroes.ts `skills` 배열 순서. 전투 HUD 스킬 버튼·영웅 정보 「스킬」 탭에 기호 아이콘 대신. 아이콘 위에 `skill_ring.png`를 덮어도 되고, 아이콘 자체에 금테가 있으니 둥근 버튼이면 원형으로 잘라 써도 됨.
- 원본 시트: art_raw/skills/

## 황짐승 (가슴 노출 줄임 · 다리 긴 8등신)
- `fullbody/hwang.png`, `portraits_hd/hwang.png`, `cutin/hwang.png` 교체 → 같은 파일 이름이라 코드 할 일 없음. 카드·초상화 캐시만 확인.
