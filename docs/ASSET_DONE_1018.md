# ASSET_SPEC_1018 반영 결과 (10/18 · Claude)

A·B는 끝났어요. 파일은 명세의 이름 그대로라 대부분 코드 수정 없이 바뀌어요. **좌표만 아래 표대로 고쳐 주세요.**

## A. 그림 (main에 올림)
| 항목 | 파일 | 비고 |
|---|---|---|
| A1 월드맵 | `public/art/screens/world.jpg` 1672×940 | 좌표 아래 표로 교체 |
| A2 수도 | `public/art/screens/capital.jpg` 1672×940 | 좌표 아래 표로 교체 (1688×780 아님) |
| A3 여관 내부 | `public/art/screens/inn.jpg` | 왼쪽 벽난로 · 오른쪽 카운터 · 가운데 비움 |
| A4 기억의 도서관 | `public/art/screens/library.jpg` | 가운데 비움 |
| A5 여관 주인 | `public/art/npc/innkeeper.png` 900×900 투명 | 쟁반+국자, 오른쪽을 봄 |
| A6 음식 5종 | `public/art/items/f_{stew,skewer,pie,tea,feast}.png` 256 투명 | |
| A7 우정 포인트 | `public/art/items/m_friendpt.png` 256 투명 | |
| (추가) 재화 4종 | `m_exshard` · `m_guildcoin` · `m_arenacoin` · `m_towercoin` | `ICON_IMG`에 넷 연결 필요 (`exShard: 'm_exshard'` …) |
| A8 전투 시작 띠 | 안 만듦 | 선택 항목 · 지금 코드 띠 유지 |
| A9 별 코스튬 | 안 만듦 | 형철 결정 대기 (시험 몇 명부터) |

### 월드맵 좌표 (x%, y%) — `screensE.ts register('world')`
| 장소 | 자리 |
|---|---|
| 수도 | 18, 76 |
| 세계수 | 22, 20 |
| 도전의 탑 | 69, 28 |
| 용의 둥지 | 56, 28 |
| 하늘 균열 | 88, 20 |
| 결투장 | 57, 72 |
| 토벌 숙영지 | 82, 76 |

| 장 | 자리 | 지역 |
|---|---|---|
| 1 | 39, 47 | 숲 동굴 (푸른 동굴 입구) |
| 2 | 40, 57 | 버섯 늪 |
| 3 | 51, 48 | 폐광 (돌 유적 입구) |
| 4 | 26, 60 | 얼음 협곡 |
| 5 | 64, 46 | 별의 심연 |
| 6 | 11, 66 | 가라앉은 등대 해안 |
| 7 | 85, 52 | 모래시계 유적 |
| 8 | 78, 55 | 잿불 화산 |
| 9 | 38, 30 | 구름 정원 (떠 있는 꽃섬) |
| 10 | 50, 8 | 심연의 바닥 (위쪽 검은 종유석) |

### 수도 좌표 (x%, y%)
| 건물 | 자리 |
|---|---|
| 왕성 | 52, 15 |
| 결투장 | 13, 35 |
| 여관 (별 간판) | 51, 47 |
| 상점 (천막) | 33, 62 |
| 대장간 | 84, 45 |
| 기억의 도서관 | 10, 74 |
| 길드 (깃발) | 68, 68 |
| 지하감옥 창고 (철문) | 93, 72 |
| 중심가 (분수) | 46, 88 |

## B. 글
- B1 영웅 서사 36명×9칸: `docs/SAGA_LINES_1018.md` → `src/data/saga.ts`에 그대로
- B2 여관 인연 36명×3구간×2줄 · B3 튜토리얼 문구 13개: `docs/INN_LINES_1018.md`
- 전부 표준말. 외전(side.ts)이 있는 영웅은 4명뿐이라 나머지 32명의 7칸(외전 완료)은 「자기 그림자와 마주한다」 공통 주제로 씀 — 외전이 생기면 그 줄만 바꾸면 됨.

## C. 서버 — 형철 결정 대기 (Supabase 테이블 배포 필요)

## 별빛 축제 코스튬 — 전투 도트·초상화까지 (10/18 형철 요청)
- 코스튬을 입으면 **전신·초상화·전투 도트가 전부** 축제 옷으로 바뀌어야 해요. 지금은 전신만 바뀜.
- 그림 위치 (12명: woongs gonu walwal ikamolly warmnight hwang kleine sermi jaehi mochi ichae kkangto):
  - 전신: `public/art/costume_festival/{id}.png` (기존 경로 · 광원 뺀 버전으로 교체)
  - 초상화: `public/art/costume_festival/portraits_hd/{id}.png` (512 투명 · `portraits_hd/{id}.png`와 같은 구도)
  - 전투 도트: `public/art/costume_festival/px2/{id}/` — `px2/{id}/`와 **파일 이름·`_parts.json` 형식이 똑같음** (r0c0… m2r1c3)
- 코드 할 일: 초상화·전투 도트 경로를 고르는 곳(`fullbodyPath`처럼)에서 `hs.costume`이 있으면 `CONFIG.costume[set].dir` 아래 경로를 먼저 쓰고, 파일이 없으면 기본으로. 전투·편성·카드·컷인 초상화 전부 같은 함수로.
