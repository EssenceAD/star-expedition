# 「별의 원정대」 사운드 계획 v0 (10/17)

방향: 「체크인」의 따뜻한 켈틱·어쿠스틱 곡은 **여관·일상·추억 장면**에 그대로 살리고,
킹스레이드식 **전투·레이드는 새로 웅장하게**(오케스트라 + 록/하이브리드) 뽑는다.
→ "같은 세계인데 이번엔 싸우러 나간다"는 느낌. 외전이니까 테마 멜로디는 「모험의 유산」을 이어 쓴다.

효과음은 지금 안 뽑는다(스킬·이펙트 타이밍이 정해진 뒤 코드 합성 + 필요한 것만 Suno 사운드).

## A. 「체크인」 곡 재활용 (21곡, 새로 안 뽑음)
| 장면 | 곡 |
|---|---|
| 여관(거점) 낮 | 03 여관의 오후 · 02 장작 패는 아침 · 26 비 오는 여관 창가 |
| 여관 밤·휴식 | 06 모닥불 곁에서 · 07 별빛 오르골 · 08 잠든 여관 · 27 등불 골목 |
| 상점·시장 | 04 장날 |
| 친구 원정대 방문 | 14 남의 집 마당 |
| 영웅 인연 대화 | 15 마주 앉은 밤 |
| 외전·회상 (예: 「칠 년 전 첫 원정」) | 16 다락의 낡은 지도 · 01 모험의 유산 |
| 다섯 별(개척자) 등장·합류 | 25 다섯 별의 원정대 |
| 스토리 1~2장 필드 (숲·늪, 가벼운 시작) | 09 숲길을 달려라 · 20 바람 부는 들판 |
| 해안 장 필드 | 21 소금과 모래 |
| 화산 장 필드 | 22 잿불과 구름 |
| 탑(심연) | 19 끝없는 심연 |
| 일반 보스 (초반 장) | 11 숲의 왕 · 23 거인의 발소리 |
| 보스 체력 30% 이하 | 12 마지막 일격 |
| 영입 이벤트·축제 | 13 깃털 모자 행진 |
| 장 클리어·엔딩 | 17 다시 길 위로 · 18 여기가 내 자리 |
| 길드 레이드 (임시, 새 곡 나오기 전) | 24 다 같이, 하나의 적 |
| 팡파르·효과 | J1~J8, amb_day/night 그대로 |

## B. 새로 뽑을 곡 (20곡 + 다시 뽑기 여유 10)
Suno 설정은 MUSIC_PLAN.md와 같게: 모델 v6 · Instrumental · 가사 칸에 구조 태그
`[Instrumental] [Intro] [Main Theme] [Variation] [Bridge] [Main Theme] [Outro]`
- 기이함: 전투 45%, 나머지 30% · 스타일 영향 70%
- 전투곡 제외 스타일: `vocals, singing, lyrics, rap, lo-fi, trap, dubstep` (**heavy metal·distortion은 제외 목록에서 뺌** — 이번엔 록 기타를 쓴다)
- 일상곡 제외 스타일: MUSIC_PLAN 공통 그대로
- 곡 제목에 번호: `S01 Star Expedition` 식

### ★ 먼저 할 것: 테마 이어받기 (Cover 기능)
S01은 새로 뽑지 말고 「체크인」 **01 모험의 유산**을 Suno에 올려 **Cover**로 만든다. 같은 멜로디가 웅장하게 바뀌어서 "외전" 느낌이 확 산다. (업로드·Cover가 지금 플랜에서 안 되면 S01도 그냥 새로 뽑기)

| # | 장면 | Style |
|---|---|---|
| S01 | 타이틀 (01 Cover) | `epic orchestral fantasy main theme, heroic brass, soaring strings, taiko drums, choir pads, celtic flute melody, adventure anthem, mobile RPG title screen, instrumental` |
| S02 | 원정대 로비 (출발 전 편성 화면) | `upbeat fantasy guild hall theme, acoustic guitar and strings, light drums, hopeful brass, warm and lively, mobile RPG lobby, loopable, instrumental` |
| S03 | 스토리 전투 — 폐광·얼음 | `driving orchestral battle music, staccato strings, snare drums, cold bells, determined, side-scrolling RPG stage, loopable, instrumental` |
| S04 | 스토리 전투 — 별의 심연 | `mysterious dark fantasy battle, choir pads, pulsing strings, celesta, cosmic tension, RPG dungeon stage, loopable, instrumental` |
| S05 | 스토리 전투 — 모래시계 유적·구름 정원 | `exotic adventure battle music, oud and strings, hand percussion, heroic brass hits, desert ruins and sky, RPG stage, loopable, instrumental` |
| S06 | 스토리 전투 — 심연의 바닥 (최종장) | `epic dark orchestral battle, massive choir, low brass, fast strings, rock drums, final chapter, desperate and heroic, instrumental` |
| S07 | 보스전 A (중반) | `intense boss battle, symphonic rock, electric guitar riffs, orchestra, double bass drums, heroic and aggressive, anime RPG boss theme, instrumental` |
| S08 | 보스전 B (교단 간부) | `villain boss battle, dark choir, pipe organ, symphonic metal guitars, menacing, anime RPG, instrumental` |
| S09 | 드래곤·협동 레이드 | `epic raid battle music, huge orchestra and choir, electric guitar, fast tempo, dragon fight, 8-player co-op raid, adrenaline, instrumental` |
| S10 | 길드 레이드 | `heroic guild raid theme, symphonic rock, rallying brass, choir shouts without words, teamwork, energetic, instrumental` |
| S11 | 월드 보스 | `colossal world boss theme, apocalyptic orchestra, war drums, choir, slow heavy build then fast climax, instrumental` |
| S12 | 아레나 (PvP) | `competitive arena battle, rock band with orchestra, fast tempo, punchy drums, confident and flashy, PvP, instrumental` |
| S13 | 탑 오르기 (상층) | `climbing tower theme, ascending strings, steady drums, tension rising, mysterious synth pads, endless challenge, loopable, instrumental` |
| S14 | 최종 보스 「별을 삼킨 것」 | `final boss theme, cosmic horror orchestra, massive choir, organ, epic guitar solo moments, tragic and grand, instrumental` |
| S15 | 영웅 영입 컷신 (짧게) | `heroic character reveal sting, brass fanfare, cymbal swell, sparkling harp, 20 seconds, anime RPG new hero, instrumental` |
| S16 | 장비 뽑기 / 별 올리기 성공 | `exciting gacha reveal jingle, rising tension then bright triumphant burst, bells and brass, 15 seconds, instrumental` |
| S17 | 별 올리기 실패 (웃기게) | `comedic fail jingle, tuba and pizzicato, playful sad trombone, short, instrumental` |
| S18 | 긴장 컷신 (교단·배신) | `tense cinematic underscore, low strings, ticking percussion, dark piano, suspense, RPG cutscene, instrumental` |
| S19 | 슬픈 컷신 (이별·희생) | `emotional sad piano and strings, slow, heartfelt, RPG tragic scene, instrumental` |
| S20 | 원정대 일상 개그 (멤버 티키타카) | `playful comedic fantasy theme, pizzicato strings, bassoon, light percussion, cheerful banter, slice of life RPG, instrumental` |

### 덤 (여유 다운로드 남으면)
- S21 남쪽 항구 삼총사 테마: `cheerful seaside port theme, accordion and acoustic guitar, upbeat, friendly, instrumental`
- S22 클레이네 테마: `elegant mysterious waltz, harp and violin, graceful leader, instrumental`
- S23 황짐승 변신 테마: `wild tribal drums, primal horns, forest druid transformation, energetic, instrumental`

## C. 고르는 기준 (MUSIC_PLAN에 추가)
- 전투곡: 첫 5초 안에 박자가 들어오는가, 1분 안에 루프 지점이 있는가
- 보스·레이드: 기타가 너무 메탈로 가서 판타지 느낌을 덮지 않는가
- 기존 곡 옆에 틀었을 때 같은 세계로 들리는가(악기 결이 너무 전자음이면 탈락)
- 사람 목소리(가사)가 들어가면 탈락. 가사 없는 합창 "아~"는 OK
