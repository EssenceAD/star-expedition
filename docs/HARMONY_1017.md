# 화면 조화 다듬기 (10/17 16:12 형철 피드백)

형철이 v0.9.4 캡처에 빨간 표시한 6장: `docs/captures/feedback_1612_1~6.png` (로비 · 영웅 정보 성장/스킬 · 상점 · 가방 · 승리)
공통 지적: **바탕과 조화가 안 됨 · 폰트와 배경이 따로 놂 · 싱크(정렬·크기)가 안 맞음 · 아이콘 없는 곳 · 서로 겹쳐 가림.**
형철 방향: **「크림색 바탕이 최대한 안 보여야 자연스러울 것」**

## 0. 원칙 — 크림 판 걷어내기
- 큰 크림(양피지) 판을 화면 기본 바탕으로 쓰지 않는다. 대신 **반투명 남색 유리 판**: `rgba(20,30,58,0.62)` + `backdrop-filter: blur(6px)` + UI 키트 금테(panel_navy의 테두리만 border-image) → 뒤 그림(마을·숙소·시장·다락)이 비쳐 보여 그림과 한 덩어리가 됨.
- 그 위 글씨: 흰색/크림 `#f6ecd6`, 강조는 금 `#e8c46a`, 숫자는 Cinzel(UI_POLISH 1). 회색·진한 검정 글씨 금지.
- 크림(양피지)은 **작은 곳에만**: 영웅 카드 이름 띠, 팝업 확인창 정도.
- 버튼은 파랑(btn_blue)·금(btn_gold) 그림 버튼만. 크림 네모 버튼 없애기.
- 모든 패널 모서리 반경·테두리 굵기·안쪽 여백을 한 값으로(정렬 「싱크」): 여백 10px, 칸 사이 8px, 글씨 기준선 맞추기.

## 1. 로비 (feedback_1612_1)
- 위 재화 바: 아이콘을 그림 아이콘(행동력 번개·금화·별가루, `ui/icons/`)으로, 숫자 Cinzel, 「+」는 그림 plus. 우편·채팅도 그림 메달(`menu/mail`,`menu/chat`).
- 채팅 한 줄: 남색 유리 띠로, 글씨 흰색.
- 왼쪽 원정대장 판: 이름이 테두리 장식과 겹침 → 이름·Lv 한 줄, 전투력은 왕관 아이콘 + 숫자. 남색 유리 판.
- 진행 중·이벤트 목록: 크림 칸 4개 → 남색 유리 판 안의 한 줄 목록(아이콘 + 흰 글씨), 줄 사이 얇은 금 선.
- 오른쪽 큰 버튼 3개(월드 보스·레이드·모험): 그림 메달(`menu/worldboss`,`raid`,`adventure`) 크기 통일(지금 모험만 큼 → 셋 다 같은 지름, 모험만 살짝 빛). 글씨는 메달 아래 금 리본 위.
- 아래 메뉴 11개: 크림 동그라미 + 선 아이콘 → 그림 메달 11종(`menu/*.png`) + 이름은 메달 아래 흰 글씨 금 외곽선. 메달 사이 간격 균일, 「FREE」 같은 배지는 메달 오른쪽 위.

## 2. 영웅 정보 (feedback_1612_2·3)
- 왼쪽 영웅 목록: 크림 칸 → 초상화 네모 + 이름 한 줄(남색 유리). 전신 그림이 목록 뒤에 깔려 가려짐 → **목록 폭을 줄이고(초상화만 + 이름 아래) 전신은 목록 오른쪽에서 시작**.
- 위 이름 판: 크림 → 남색 유리, 설명 2줄 넘치면 말줄임.
- 탭 6개(성장·스킬·초월·전용 무기·코스튬·능력/인연): 글씨만 → 아이콘(`ui/tabs/`) + 글씨, 선택 탭 tab_on.
- 성장 칸: 「LV.30 각성1…초월5」 칩이 빽빽 → 칩 대신 별 5개 + 각성 단계 점 5개 한 줄. 「1개·10개·각성·별 올리기」 버튼은 btn_blue/btn_gold로, 크기 통일.
- 스킬 탭: 크림 줄 → 남색 유리 줄, 스킬 아이콘 40px(이미 연결된 것), 「올리기」 버튼 금, 「3칸 바뀌었어요」 같은 토스트가 목록을 가림 → 토스트는 화면 위쪽 가운데로.
- 장비 칸: 빈 칸 「장착 가능 무기」 글씨 → 빈 칸 그림(`icons/slot_weapon/armor/acc/exclusive`) 흐리게, 잠금은 `icons/lock`. 칸 크기 6개 모두 같게(지금 무기 칸만 다름). 칸 이름 글씨가 아래 칸과 겹침 → 이름 숨기고 눌렀을 때만.
- 자동 장착·모두 해제: btn_blue 작은 버튼.
- 능력치 표: 크림 → 남색 유리, 각 줄 앞에 능력치 아이콘(`icons/hp,atk,def,crit,critdmg`), 숫자 오른쪽 정렬 Cinzel, 「상한까지 ○○」는 작은 회색-금 글씨로 숫자 아래로. 지금 표 아래가 잘림 → 판 높이를 내용에 맞추거나 스크롤.

## 3. 상점 (feedback_1612_4)
- 위 재화 바: 로비와 같게.
- 왼쪽 메뉴 6개: 크림 버튼 → 아이콘(`ui/tabs/shop_*`) + 글씨, 남색 유리 세로 탭, 선택은 금빛.
- 가격 버튼 4,000: 별가루 아이콘이 두 번 겹쳐 보임/어색 → 아이콘 1개 + 숫자, btn_gold.
- 「꾸러미를 받았어요」 토스트가 카드 가격 위를 가림 → 화면 위 가운데.

## 4. 가방 (feedback_1612_5)
- 제목 앞 아이콘 비어 있음 → 가방 아이콘.
- 탭(장비·성장·소모품·룬·기타)·정렬(등급·전투력·강화·부위): 아이콘 + 글씨, 남색 유리, tab_on.
- 오른쪽 버튼(일반 이하·일괄 판매·일괄 분해·제작): 아이콘(`tabs/sell,dismantle,craft`) + btn_blue, 크기 통일. 「칸 +10」도 같은 버튼.
- 빈 칸: 점선 크림 → 반투명 남색 칸 + 얇은 금 테두리.

## 5. 승리 화면 (feedback_1612_6)
- **승리 엠블럼: 지금보다 아래로(화면 위에서 18% 지점이 엠블럼 위끝) + 더 크게(화면 높이 50%)**. WAVE 글씨·DPS·AUTO와 겹치지 않게 결과 화면에서는 AUTO·×1·DPS·포기·WAVE를 숨김.
- 결과 글씨 두 줄(클리어 조건·시간·MVP): 배경 없이 떠서 안 읽힘 → 남색 유리 띠 안에, 체크는 금색 아이콘.
- 보상 카드: 크림 → 등급 칸 틀(slot_*) + 아이콘, 아래 수량.
- 「원정대 여관으로」 버튼이 아래 영웅 HUD와 겹침 → 결과 화면에서는 아래 영웅 HUD를 내리고(숨김) 그 자리에 버튼.
- 전투 HUD는 BATTLE_HUD_1017대로.

## 그림 목록
- `public/art/ui/menu/` — 로비 메달 16: heroes, formation, content, bag, mission, achieve, friend, shop, guild, ranking, settings, mail, chat, worldboss, raid, adventure
- `public/art/ui/icons/` — hp, atk, def, crit, critdmg, speed, mana, power, stamina, gold, stardust, plus, slot_weapon, slot_armor, slot_acc, slot_exclusive, lock, star, levelup, exp
- `public/art/ui/tabs/` — hero_growth, hero_skill, hero_trans, hero_exclusive, hero_costume, hero_bond, shop_special, shop_material, shop_hero, shop_costume, shop_summon, shop_exchange, bag_gear, bag_growth, bag_consume, bag_rune, bag_etc, sell, dismantle, craft

## 보고
844×390 전·후: 로비, 영웅 정보(성장·스킬), 상점, 가방, 승리. 형철 빨간 표시 자리마다 바뀌었는지 확인.
