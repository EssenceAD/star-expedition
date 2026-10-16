# 그림 주문서 (ChatGPT로 뽑을 목록 · 프롬프트) — 10/17 밤

> 이 클라우드 세션에는 Claude in Chrome(ChatGPT 연결)이 없어서 **아직 한 장도 안 뽑음**. 형철 PC 세션에서 이 순서대로 뽑으면 됨.
> 뽑는 방법·자르기 도구는 `docs/PROGRESS.md` §2 그대로 (같은 묶음은 같은 대화 · 마젠타 배경 · 칸 격자 · 다운로드 전 새로고침).
> **스타일 보드(A/B/C) 승인 뒤**에 뽑는 게 순서 — 테두리·배경색이 시안에 따라 달라짐. 아래 프롬프트의 `{STYLE}` 자리에 고른 시안 한 줄을 넣는다.
> - **D 밝은 원정 (기본)**: `bright daytime fantasy, cream and ivory parchment panels with gold trim, sky-blue and orange accents, navy only for thin outlines, constellation-line ornaments`
> - A 별빛 금박 (심연의 탑·레이드·밤 이벤트): `night-sky navy and starlight gold trim, parchment accents, constellation-line ornaments`
> - B 양피지 원정 지도: `warm aged parchment and sepia gold, compass-star and crescent ornaments, hand-drawn map feel`
> - C 심연 은하: `deep violet cosmos, silver-blue trim with small gold highlights, orbit-arc ornaments, glassy panels`

공통 꼬리말 (모든 시트 프롬프트 끝에 붙임):
`strict grid R rows x C columns, all cells the same size, each item fully inside its own cell, perfectly flat solid magenta background (#FF00FF), no text, no grid lines, no ground shadow`

## 1. 아이템 아이콘 (B 보강 §2 · 최우선) → `public/art/items/<부위>_<등급>.png` · `config.gear.art.have = true`
- 시트 1장 = 3줄(무기·갑옷·장신구) × 5칸(일반·고급·희귀·영웅·전설) · 칸 하나 = 아이콘 하나
- 프롬프트:
  `Game item icon sheet, 3 rows x 5 columns. Row 1: one-handed fantasy sword. Row 2: chest armor. Row 3: ring with gem. Columns go from common to legendary: column 1 plain iron and leather, column 2 polished steel with green trim, column 3 blue-enchanted silver, column 4 violet runic with glowing gems, column 5 golden legendary with star motifs and radiant aura. Same item silhouette family per row but clearly more ornate each column. Painterly anime game icon style, 3/4 view, centered, {STYLE}.` + 꼬리말(3x5)
- 자르기: `node tools/cut-cells.mjs art_raw/items.png public/art/items 5x3` → 파일 이름을 `weapon_common.png` … `acc_legend.png`로
- 나중에(선택): 같은 방식으로 룬 6등급 1줄

## 2. 레이드 보스 전·후 2장 → `public/art/raidboss/intact.png` · `broken.png` · `config.raidArena.art.have = true`
- 같은 대화에서 연속으로 (모양 유지). 보스 = 「심연 드래곤 잿날개」를 거대 골렘형 석상 용으로 (지금 시트가 골렘이라 부위 위치가 맞음)
- 1) `Giant boss illustration for a 2D side-scrolling RPG raid, facing LEFT, full body filling a tall frame: an ancient stone-and-ember dragon golem "Ashwing" with one huge raised ARM on the left side, a horned HEAD at the top, and a glowing CORE gem in the chest center. Clear separate shapes for arm, head and core. Dramatic rim light, painterly anime style, {STYLE}. Perfectly flat solid magenta background (#FF00FF), no text, no ground shadow.`
- 2) `Same boss, exact same pose, size and framing, but BROKEN: the arm is shattered and hanging, the head horns cracked off, the chest core cracked and dim with sparks. Keep everything else identical.` + 배경 문장
- 부위 상자(`config.raidArena.parts[].box`)는 그림을 보고 다시 맞출 것

## 3. 멤버 영웅 4명 (HEROES_ADD_4) → 초상화 `public/art/portraits/star_<id>.png` · 카드 · 표정 3종 · 도트
- 영웅별 새 대화. 기존 영웅과 **실루엣·머리색이 안 겹치게** (아래 「겹침 확인」), **등신은 기존 기준(2등신 금지)**
- 초상화(정사각 흉상) → 카드 일러스트(세로 전신) → 표정 3종(기본·웃음·진지, 1줄×3칸) → 횡스크롤 도트(대기 6 · 평타 6, 2줄×6칸, 오른쪽 보기)
| id | 이름 | 외형 (프롬프트 핵심 · MUST KEEP) | 겹침 확인 |
|---|---|---|---|
| sermi | 세르미뉴 | chic pretty boy mage, silver-grey bangs partly covering eyes, navy long coat with constellation-pattern lining, small floating celestial globe in hand, calm half-smile | 은회색 머리는 기존에 없음 · 롱코트 실루엣 (클레이네=드레스와 다름) |
| ichae | 이치애 | gentle elegant girl fighter, long black hair in a low single ponytail, white and pale-pink martial-arts gi with wide sleeves, bandaged fists, small flower on hair tie, soft eyes but firm stance | 흑발 긴 머리는 연화(분홍)·팬더와 다름 · 넓은 소매 무도복 |
| mochi | 딸기망고모찌 | cheerful young man druid, short brown hair, paw-print badge, green cape, big snack satchel; three spirit dogs: Strawberry = red toy poodle with pink ribbon, Mango = yellow Welsh corgi with short legs, Mochi = white fluffy bichon frise | 짧은 갈색 머리 + 큰 가방 · 개 셋으로 실루엣이 확실히 다름 |
| jaehi | 재희아빠 | round friendly dad warrior, messy hair, big chunky armor with a wobbly child-drawn star patch on the chest, small plush keychain at waist, big two-handed hammer | 둥근 체형 + 양손 망치 (그롬=근육 대머리, 웅스=대검과 다름) |
- 필살 컷인(가로): 세르미뉴 「별의 정답」 · 이치애 「만개」 · 딸기망고모찌 「다 같이 산책!」(개 셋 합체 돌진) · 재희아빠 「재희야 아빠 간다」(귀여움 → 진지한 얼굴 반전)

## 4. 협공 컷인 (조합별 · `data/combos.ts` art) — 가로 1장씩 · 두 영웅이 양쪽에서 맞붙는 구도
- 먼저 멤버 관계 3조: 재희아빠+따뜻한밤 「막역한 친구의 합」 · 딸기망고모찌+깡토끼 「멍멍 대폭발」 · 세르미뉴+신야군 「별의 궤적」
- 그다음 기존 11조 (남쪽 항구 합동 무대 등)

## 5. 2단계 화면 (스타일 보드 승인 뒤)
- 타이틀 키 아트: 창립 멤버 단체(가로 · 밤하늘 · 별) + 로고 자리 비움
- 로비: 여관 마을 전경(가로 · 건물 6곳이 로비 아이콘 자리와 맞게)
- 로딩: 영웅 전신 일러스트 (먼저 개척자 5명)
- 아이콘: 스타일 보드의 벡터 아이콘으로 충분하면 그림 안 뽑음 (형철 판단)
