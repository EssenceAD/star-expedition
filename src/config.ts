// 모든 숫자는 여기 한 곳 (ROADMAP §0 1단계 원칙) — 밸런스는 tests/balance.test.ts · tools/econ.mjs 로 확인
//  전투 공식은 「체크인」 전투(combat/field.ts · CONFIG.combat): 치명 15% ×2 · 받는 피해 × (1 − 방어/(방어+K)) 최대 40% · 히트스톱/넉백/흔들림
export const CONFIG = {
  /** 논리 화면: 높이 고정 · 너비는 창 비율에 맞춰 (화면 꽉 채우기) */
  view: { h: 390, wMin: 640, wMax: 960, wBase: 844, ground: 254 },
  combat: {
    /** 영웅 전투 도트 배율 (모든 영웅 같은 값 · 시트 머리 48px → 화면 26px · docs/SPRITES_1017.md) · 시트를 못 불렀을 때 키 · 걷기 들썩임(px) */
    pxScale: 26 / 72,
    pxFallbackH: 390,
    walkBob: 3,
    /** 움직임 (SPRITE_RES §D): 대기 숨쉬기 세로 배율 폭·주기(초) · 피격 번쩍 최대 밝기 더함·사라지는 속도(1/초 → 0.08초) · 내딛기 들어가는 몫(나머지는 돌아옴) */
    breathe: { amp: 0.012, sec: 1.6 },
    hitFlash: { max: 0.5, bright: 1.2, fade: 12.5 },
    lungeIn: 0.35,
    critChance: 0.15,
    critMult: 2,
    /** 받는 피해 감소 = 방어 / (방어 + defK × 때린 쪽 공격) — 숫자 크기가 자라도 같은 비율 */
    defK: 3,
    defMax: 0.4,
    /** 예전 평타 그림 길이(초) — 새 동작이 더 길어도 공격 간격은 이 기준 그대로 */
    attackBeat: 0.46,
    /** 히트스톱(초): hit 칸 60ms (ANIM_1017) · 치명타 · 처치 */
    hitstop: { hit: 0.06, crit: 0.07, kill: 0.09 },
    knock: { hit: 5, crit: 10, kill: 18 },
    /** 흔들림 px (초당 30씩 줄어듦 → 4px ≈ 120ms): 치명타·스킬3 = 4 (ANIM_1017) */
    shake: { crit: 4, ult: 4, boss: 7, smash: 9, meteor: 5, bossKill: 12 },
    /** 마나: 평타 맞힐 때 · 맞을 때 · 1초마다 · 시작 */
    mana: { hit: 10, skillHit: 2, hurt: 4, regen: 4, max: 100, start: 30 },
    cutInSlow: 0.15,
    cutInSec: 0.6,
    /** 제한 시간(초) · 별 3개 시간 */
    limit: 180,
    starTime: 120,
    /** 걷기(웨이브 사이) 초 · 배경 흐름 속도 */
    walkSec: 1.6,
    walkGap: 1.8,
    walkScroll: 130,
    /** 적이 걸어 들어오는 속도 · 들어오는 거리 */
    mobEnter: 320,
    mobEnterFrom: 380,
    /** 적 대상 고르기: 가장 앞 위치(전방 → 중앙 → 후방)에 있는 영웅을 노릴 확률 */
    mobFrontBias: 0.7,
    /** 보스는 넉백·기절을 이 비율만 */
    bossKnock: 0.15,
    bossStun: 0.4,
    /** 상태이상 */
    slowRate: 0.6,
    guardCut: 0.3,
    /** 사제 AUTO: 체력 이 비율 아래인 아군이 있으면 회복 */
    autoHealAt: 0.65,
    /** 위치 3구역 (킹스레이드 문법: 직업마다 고정) — 파티를 전방 → 중앙 → 후방 순으로 세워 이 4자리에 (화면 왼쪽 기준 x · 발 y) · 대각선으로 엇갈려 안 가림 */
    places: [[440, 272], [372, 226], [292, 272], [222, 226]] as [number, number][],
    /** 레이드 8인 자리 (내 4 + AI 4, 내 파티가 앞) */
    places8: [[480, 272], [440, 230], [395, 272], [355, 230], [295, 272], [255, 230], [210, 272], [170, 230]] as [number, number][],
    /** 같은 구역이 비면 생기는 틈 (구역이 바뀔 때마다 이만큼 더 뒤로) */
    zoneGap: 18,
    /** 적 자리 (화면 오른쪽 끝에서 뺀 x · 발 y) */
    mobSlots: [[292, 230], [238, 272], [184, 230], [130, 272]] as [number, number][],
    bossSlot: [180, 258] as [number, number],
    /** 피해 숫자: 대상 위 가로로 흩뿌리는 폭(±) · 줄 수 · 줄 높이 · 비켜 놓는 최대 거리 · 수명(초) · 올라가는 속도(px/초) · 이보다 위(보스 바)에는 안 놓음 */
    /** 피해 숫자 · 일반 크기 배율 · 외곽선 두께(일반·치명타 px) · 치명타 커졌다 작아지는 시간 · 폭발 그림 크기(글자 폭 배) (docs/BATTLE_HUD_1017.md §4) */
    /** 영웅 동작 칸 시간(초 · ANIM_1017): 숨쉬기 · 걷기 칸마다 · 평타 4칸 · 스킬 4칸 · 다단 히트 c1·c2 · 스킬1·3 속도 배수 (POLISH_1017 ②: 1 — 0.8·0.7배에 컷인 0.6초가 더해져 2초 넘게 멈춰 보이던 것) */
    anim: { idle: 0.17, walk: 0.11, attack: [0.2, 0.06, 0.16, 0.15] as number[], skill: [0.3, 0.12, 0.38, 0.3] as number[], multiHit: [0.07, 0.16] as number[], skill1Speed: 1, skill3Speed: 1 },
    /** 이펙트 그림 (ANIM_1017 ②): 칸 하나 초 · bolt 날아가는 초 · meteor 떨어지는 거리(px) · 크기 = 대상 키 × centerK/bottomK (최소 px) · 보호막 유지 1↔2 바뀌는 초 · 진하기 · 기절 별 크기 · 진하기 alpha 0.6 (회복·기둥·버프는 soft) · 높이 상한 = 화면 45%(maxH) · 대상 키 × maxOfH · 회복 기둥 폭 healW · 한 번에 그리는 그림 이펙트 maxOn (레이드 maxOnRaid) · 한 대상 위 perTarget개 (POLISH_1017 ①) */
    fxArt: { alpha: 0.6, soft: { heal: 0.45, pillar: 0.45, buff: 0.45 } as Record<string, number>, frameSec: 0.08, boltTravel: 0.16, meteorDrop: [90, -170] as number[], centerK: 1.15, bottomK: 1.3, minCenter: 60, minBottom: 80, maxH: 175, maxOfH: 1.3, healW: 0.55, maxOn: 6, maxOnRaid: 10, perTarget: 2, fadeFast: 0.08, shieldLoopSec: 0.6, shieldAlpha: 0.5, stunH: 34 },
    /** 몹 쓰러짐 (ANIM_1017 ③): 지역 몹 사라지는 초 · 장 보스 초 · 가라앉는 px · 흔들림 px (경고 중 떨림은 절반) · 맞은 칸을 보일 번쩍 세기 */
    mobDie: { sec: 0.4, bossSec: 1.0, sink: 18, shake: 3, hurtFlash: 0.3 },
    /** 컷인 스킬 이름: 오른쪽 여백(px) · 가장 넓은 폭(화면 비율) */
    cutText: { right: 40, maxW: 0.5 },
    /** 머리 위 작은 체력 바 (MOBILE_REF §3-A-1): 맞은 뒤 보이는 초 · 폭(키 대비) · 최소 폭 · 상태 아이콘 최대 개수 */
    headHp: { showSec: 2, wOfH: 0.42, minW: 28, icons: 4 },
    /** 궁극기 범위 돔: 보이는 초 · 적 무리 양끝에서 더 넓힐 px · 진하기 */
    ultDome: { sec: 0.6, pad: 70, alpha: 0.28 },
    /** 마지막 일격: 흰 번쩍(초) · 느리게(초) · 그동안 속도 배율 */
    lastHit: { flash: 0.15, slow: 0.4, rate: 0.3 },
    /** 피해 숫자: 치명타 = 일반 × critMul (주황) */
    nums: { critMul: 1.6, scatter: 34, rows: 6, rowH: 22, spread: 90, life: 1.15, rise: 30, minY: 70, normalScale: 0.85, stroke: 1.5, critStroke: 2, critPop: 0.35, burstW: 1.9 },
  },
  /** 영웅 성장 (1단계 A: 레벨만 · 각성·스킬 레벨·초월은 B) */
  hero: {
    /** 레벨 상한 (각성 단계별) · 초월 한 단계마다 +transLv → 초월 5까지 해야 만렙 (B 보강 §1: 레벨 상한 → 각성 → 초월 1~5) */
    levelCap: [30, 40, 50, 60, 70, 80],
    transLv: 4,
    /** 레벨 1 → n 능력치 배수 = grow^(n−1) — 적 강함(story.grow)을 추천 레벨로 따라가되 조금 모자라게 (나머지는 장비·각성이 B덩어리에서 채움) */
    grow: 1.108,
    /** 레벨업 경험치: round(base × lv^pow) */
    exp: { base: 90, pow: 1.55 },
  },
  /** 직업 기본 능력치 (레벨 1) */
  jobs: {
    knight: { hp: 18000, atk: 820, def: 1500, rate: 1.15, ranged: false },
    warrior: { hp: 15000, atk: 1050, def: 1100, rate: 1.0, ranged: false },
    fighter: { hp: 14000, atk: 1000, def: 1000, rate: 0.75, ranged: false },
    assassin: { hp: 10500, atk: 1150, def: 700, rate: 0.8, ranged: false },
    archer: { hp: 10000, atk: 1080, def: 650, rate: 1.15, ranged: true },
    engineer: { hp: 10750, atk: 1000, def: 750, rate: 1.25, ranged: true },
    mage: { hp: 9000, atk: 1200, def: 550, rate: 1.4, ranged: true },
    priest: { hp: 10000, atk: 760, def: 700, rate: 1.5, ranged: true },
    druid: { hp: 13000, atk: 900, def: 900, rate: 1.2, ranged: false },
  } as Record<string, { hp: number; atk: number; def: number; rate: number; ranged: boolean }>,
  /** 스토리 · 스테이지 (ROADMAP §3) */
  story: {
    chapters: 10,
    stages: 10,
    /** 1단계에서 대사·몬스터 조합이 실제로 있는 장 */
    realChapters: 3,
    /** 스테이지 강함 지수 p = (장−1)×10 + (스테이지−1) + 난이도 더하기 */
    diffAdd: [0, 25, 55],
    diffName: ['보통', '어려움', '지옥'],
    /** 어려움·지옥이 열리는 조건: 그 장 보통(·어려움) 10 스테이지 클리어 */
    /** 적 능력치 배수 = grow^p (레벨 1 영웅 기준 1장 1) */
    grow: 1.072,
    /** 적 기본 능력치 (p=0) — 몬스터 데이터의 hp/atk/def 배수에 곱한다 */
    mob: { hp: 7000, atk: 900, def: 300 },
    boss: { hp: 22, atk: 1.9, def: 1.6 },
    /** 추천 레벨 = 1 + p × recLv (전투력 표시용) */
    recLv: 0.62,
    /** 웨이브 수 (보스 스테이지는 마지막이 보스) */
    waves: 3,
    bossWaves: 2,
  },
  /** 보상 (스테이지 1판) */
  reward: {
    gold: { base: 300, grow: 1.06 },
    exp: { base: 40, grow: 1.065 },
    /** 첫 클리어 별가루 · 보스 스테이지 · 별 3개 처음 */
    firstDust: 20,
    firstDustBoss: 100,
    threeStarDust: 12,
    /** 판마다 별가루 (확률 · 개수 × (난이도+1)) — 경제 시뮬로 맞춤 (docs/ECONOMY.md) */
    dust: { chance: 0.08, n: 10 },
    /** 강화석 (판마다 · 확률) */
    enh: { n: 1, chance: 0.5 },
    /** 난이도 보상 배수 */
    diffMult: [1, 1.8, 3],
    /** 따뜻한밤(길잡이) 숨은 상자: 확률 · 금화 배수 */
    chest: { chance: 0.25, gold: 1.5 },
    /** 오늘 판 수 구간별 금화 비율 (「체크인」 goldsink.taper 방식 · 재료는 줄지 않음) */
    taper: [[120, 1], [300, 0.5], [Infinity, 0.25]] as [number, number][],
  },
  /** 행동력 (KR 문법): 최대 = base + perLv × (원정대 레벨 − 1) · regenSec초마다 1 · 원정대 레벨업 때 가득 · 최대를 넘겨 쌓일 수 있음(보상·구매) */
  stamina: { base: 60, perLv: 2, regenSec: 300, cost: [6, 8, 10] as number[], buyDust: 50, buyN: 60 },
  /** 원정대(계정) 레벨: 쓴 행동력 1 = 경험치 1 · 다음 레벨 = round(base × lv^pow) */
  account: { exp: { base: 30, pow: 1.35 }, max: 99 },
  /** 반복 전투: 별 3개 스테이지 · 즉시 끝남 · 행동력 n × 비용 */
  repeat: { choices: [1, 3, 5, 10, 20] as number[], minStars: 3 },
  /** 부스터: 전리품 2배 · 1시간 · 금화로 (게임 재화만) */
  booster: { mult: 2, sec: 3600, gold: 3000 },
  /** 방치 보상 (「체크인」 offline 방식): 최고 스테이지 1판 보상 × 시간당 판 수 · fullHours 뒤로는 tailRate · 최대 maxHours */
  offline: { runsPerHour: 20, rate: 0.25, fullHours: 3, tailRate: 0.15, maxHours: 8, minSeconds: 60 },
  /** 처음 시작: 다섯 별 전원 · 파티 4 (전방 → 후방 순서는 자동) */
  start: { gold: 5000, stardust: 100, heroes: ['woongs', 'gonu', 'ikamolly', 'walwal', 'warmnight'], party: ['woongs', 'gonu', 'ikamolly', 'walwal'], name: '원정대장' },
  /** 월드 채팅 한 줄 티커: 몇 초마다 한 줄 */
  chat: { everySec: [6, 14] as number[] },
  /**
   * 영웅 성장 (STAR_PLAN_v2 §2 · SPEC §10) — 각성(상한) · 별(1~5성) · 스킬 레벨 · 초월(단계마다 2택) · 경험치 물약
   */
  growth: {
    /** 각성: 레벨이 상한일 때 · 각성석 · 금화 (단계 1 → 5) */
    awaken: { stones: [5, 10, 20, 35, 60], gold: [100000, 400000, 1500000, 5000000, 15000000] },
    /** 별: 1성 시작 · 별마다 능력치 +starStat · 올리는 값 별가루·금화 (→2 … →5) */
    star: { stat: 0.12, dust: [100, 250, 600, 1200], gold: [10000, 40000, 120000, 300000] },
    /** 스킬 레벨 1~5: 피해·회복·보호막 배수 +perLv · 스킬북 · 금화 (→2 … →5) */
    skill: { max: 5, perLv: 0.1, books: [1, 2, 4, 8], gold: [5000, 15000, 40000, 100000] },
    /** 초월: 5성 + 각성 1 이상부터 · 초월석 · 금화 (단계 1~5) */
    transcend: { needStar: 5, needAwaken: 1, stones: [3, 6, 10, 15, 25], gold: [50000, 100000, 200000, 400000, 800000] },
    /** 경험치 물약 1개 = 영웅 경험치 */
    potionExp: 500,
  },
  /** 장비 (SPEC §10 · 「체크인」 강화 확률 그대로) */
  gear: {
    /** 등급 0~4 = 일반·고급·희귀·영웅·전설 · 기본 능력 배수 · 옵션 줄 수 · 룬 칸 */
    grades: [
      { name: '일반', key: 'common', mult: 1, opts: 3, runes: 0 },
      { name: '고급', key: 'uncommon', mult: 1.3, opts: 3, runes: 1 },
      { name: '희귀', key: 'rare', mult: 1.7, opts: 3, runes: 1 },
      { name: '영웅', key: 'epic', mult: 2.2, opts: 4, runes: 2 },
      { name: '전설', key: 'legend', mult: 3, opts: 4, runes: 3 },
    ],
    /** 기본 능력 (장비 레벨 0 · 1티어 · 1성 · +0) — 장비 레벨(드롭한 스테이지 강함 지수)마다 grow배 */
    base: { weapon: { atk: 120 }, armor: { hp: 1400, def: 160 }, acc: { hp: 500, atk: 50 } } as Record<string, Record<string, number>>,
    grow: 1.06,
    /** 별(1~5성)마다 기본 능력 + · 티어마다 + · 강화 1마다 + */
    starStat: 0.15,
    tierStat: 0.25,
    enhStat: 0.08,
    /** 긴 강화 사다리 (B 보강 §1 · 킹스레이드식): 최대 +max · band 단계마다 구간(외형·빛이 한 단계 화려해짐 · 구간 바닥 아래로는 안 떨어짐)
     *  성공률 = end + (start − end) × (1 − n/max)^curve · 실패마다 다음 확률 +pity · +dropFrom 부터 실패하면 dropChance로 −1 (파괴 없음)
     *  대성공(+2) great 확률 (구간 경계는 못 넘음) · 소프트캡: 구간마다 강화 효율 bandEff (위로 갈수록 덜 오름)
     *  비용: 강화석 = stones × (n+1) · 금화 = gold × (n+1)^goldPow × (등급+1) */
    enhance: { max: 50, band: 10, start: 1, end: 0.08, curve: 1.6, pity: 0.03, dropFrom: 15, dropChance: 0.3, great: 0.03, stones: 2, gold: 300, goldPow: 1.6, bandEff: [1, 0.8, 0.6, 0.45, 0.35] as number[] },
    /** 별 올리기: 같은 부위·같은 등급 장비를 먹임 · 성공률(→2 … →5) · 실패할 때마다 다음 확률 + (기본 확률 × pityMult, 상한 1) · 금화 */
    starUp: { rates: [1, 0.5, 0.16, 0.03], pityMult: 0.5, gold: [2000, 8000, 30000, 100000] },
    /** 티어: 5성 뒤 · 티어 재료(레이드) · 금화 · 최대 */
    tier: { max: 6, mats: [10, 20, 40, 80, 150], gold: [50000, 120000, 300000, 700000, 1500000] },
    /** 옵션 바꾸기: 한 줄 · 옵션 티켓 */
    reroll: { tickets: 1 },
    /** 부가 옵션 종류 · 값 범위(장비 레벨 0 · 등급 배수 곱함) — 퍼센트 옵션은 소수 */
    opts: {
      atkPct: { name: '공격력', min: 0.02, max: 0.06, pct: true },
      hpPct: { name: '체력', min: 0.03, max: 0.08, pct: true },
      defPct: { name: '방어력', min: 0.03, max: 0.08, pct: true },
      crit: { name: '치명타 확률', min: 0.01, max: 0.04, pct: true },
      critDmg: { name: '치명타 피해', min: 0.05, max: 0.15, pct: true },
      spd: { name: '공격 속도', min: 0.02, max: 0.05, pct: true },
      skillDmg: { name: '스킬 피해', min: 0.02, max: 0.06, pct: true },
      heal: { name: '회복량', min: 0.03, max: 0.08, pct: true },
      mana: { name: '마나 회복', min: 0.03, max: 0.08, pct: true },
      dmgCut: { name: '받는 피해 감소', min: 0.01, max: 0.03, pct: true },
    } as Record<string, { name: string; min: number; max: number; pct: boolean }>,
    /** 소프트캡 (SPEC §10: 상한 · 상세 화면에 「상한까지 n」) */
    cap: { crit: 0.6, spd: 0.5, dmgCut: 0.45, critDmg: 2.5 } as Record<string, number>,
    /** 전수 (「체크인」 웅스 건의 그대로): 같은 부위 · 주는 장비 +minEnh 이상 · 옮겨지는 단계 = 주는 단계 − gradeDrop[받는 등급이 낮은 만큼] · 결과 = max · 금화 = gold × 결과² */
    transfer: { minEnh: 3, gradeDrop: [0, 1, 2], gold: 3000 },
    /** 판매 금화 · 분해 강화석 (등급별) */
    sell: [200, 500, 1500, 5000, 15000],
    salvage: [1, 2, 5, 12, 30],
    /** 드롭: 스테이지 1판에 장비 나올 확률 · 보스 스테이지 룬 확률(탑이 생기기 전 임시 공급) · 등급 가중치(보통·어려움·지옥) */
    drop: { chance: 0.35, runeBoss: 0.25, weights: [[60, 28, 10, 2, 0], [30, 35, 25, 9, 1], [10, 25, 35, 24, 6]] as number[][] },
    /** 장비 소환 (게임 재화만): 1회 · 10+1회 별가루 · 하루 무료 1회 · 등급 가중치 */
    summon: { one: 150, ten: 1500, freePerDay: 1, weights: [0, 50, 35, 12, 3] as number[] },
    /** 제작: 부위 고르기 · 등급 확정(희귀) · 강화석 · 금화 */
    craft: { grade: 2, stones: 30, gold: 20000 },
    /** 장비 모양(종류) (docs/ART_DONE_1017_2.md §3 · 킹스레이드처럼 직업마다 무기 모양이 다름)
     *  무기 = 직업 전용(다른 직업은 못 낌) · 갑옷 = 계열이 맞으면 기본 능력 +armorMatch · 장신구 = 아무나
     *  드롭·소환·제작 때 partyBias 확률로 파티 영웅 직업에 맞춰 나옴 · 그림 = items/<art[type]>_<등급>.png */
    types: {
      weaponOf: { knight: 'sword', warrior: 'greatsword', fighter: 'gauntlet', assassin: 'dagger', archer: 'bow', engineer: 'gun', mage: 'staff', priest: 'scepter', druid: 'naturestaff' } as Record<string, string>,
      armorOf: { knight: 'plate', warrior: 'plate', fighter: 'plate', assassin: 'leather', archer: 'leather', engineer: 'leather', druid: 'leather', mage: 'robe', priest: 'robe' } as Record<string, string>,
      acc: ['ring', 'necklace', 'earring'] as string[],
      name: { sword: '한손검', greatsword: '대검', gauntlet: '건틀릿', dagger: '쌍단검', bow: '활', gun: '기계 총', staff: '마법 지팡이', scepter: '성구 홀', naturestaff: '자연 지팡이', plate: '판금 갑옷', leather: '가죽 갑옷', robe: '로브', ring: '반지', necklace: '목걸이', earring: '귀걸이' } as Record<string, string>,
      art: { sword: 'weapon', greatsword: 'w_greatsword', gauntlet: 'w_gauntlet', dagger: 'w_dagger', bow: 'w_bow', gun: 'w_gun', staff: 'w_staff', scepter: 'w_scepter', naturestaff: 'w_naturestaff', plate: 'armor', leather: 'a_leather', robe: 'a_robe', ring: 'acc', necklace: 'acc_necklace', earring: 'acc_earring' } as Record<string, string>,
      partyBias: 0.7,
      armorMatch: 0.1,
    },
    /** 아이템 그림 (B 보강 §2: 부위·등급별 · public/art/<dir>/<부위>_<등급>.png · ChatGPT로 뽑음) — have=false면 기호 */
    art: { have: true as boolean, dir: 'items' },
    /** 가방 칸 · 확장(별가루) */
    bag: { start: 54, max: 112, step: 10, dust: 100 },
  },
  /** 룬: 등급 0~5 (일반~고대) · 능력 · 합성 3개 → 다음 등급 · 금화 */
  rune: { kinds: ['atkPct', 'hpPct', 'crit', 'spd', 'skillDmg'] as string[], value: [0.01, 0.015, 0.022, 0.03, 0.04, 0.055] as number[], fuse: 3, fuseGold: [1000, 3000, 9000, 25000, 70000] as number[] },
  /** 전용 무기: 조각 30개 = 획득 · 공격 · 별 1~5 (조각) · 전용 보물: 외전(C덩어리)에서 해금 */
  exWeapon: { shards: 30, atkPct: 0.12, perStar: 0.06, starShards: [10, 20, 40, 80] },
  treasure: { slots: 1, atkPct: 0.08 },
  /** 코스튬 (docs/ART_DONE_1017_3.md §3): 묶음마다 그림 폴더 · 별가루 값 · 입을 수 있는 영웅 — 영웅 정보·영입·로딩의 전신 그림이 바뀜 (전투 도트는 그대로) */
  costume: {
    festival: { name: '별빛 축제', dir: 'costume_festival', dust: 1200, heroes: ['woongs', 'gonu', 'walwal', 'ikamolly', 'warmnight', 'hwang', 'kleine', 'sermi', 'jaehi', 'mochi', 'ichae', 'kkangto'] },
  } as Record<string, { name: string; dir: string; dust: number; heroes: string[] }>,
  /** 상점 (현금 결제 없음): 영웅 값(별가루) · 재화·소모품 금화 값 · 꾸러미 */
  shop: {
    /** 멤버 영웅(founder) 17명 같은 값 · 전설·스토리 오리지널 */
    hero: { founder: 3000, legend: 4000, new: 4000 },
    items: [
      { id: 'potion', name: '경험치 물약 ×5', give: { exp: 5 }, gold: 5000 },
      { id: 'enh', name: '강화석 ×20', give: { enh: 20 }, gold: 8000 },
      { id: 'book', name: '스킬북 ×1', give: { skillBook: 1 }, gold: 15000 },
      { id: 'ticket', name: '옵션 티켓 ×1', give: { optTicket: 1 }, gold: 20000 },
      { id: 'awaken', name: '각성석 ×5', give: { awakenStone: 5 }, gold: 250000 },
      { id: 'trans', name: '초월석 ×1', give: { transStone: 1 }, dust: 300 },
      { id: 'exShard', name: '전용 무기 조각 ×10 (고른 영웅)', give: { exShard: 10 }, dust: 400 },
    ] as { id: string; name: string; give: Record<string, number>; gold?: number; dust?: number }[],
    /** 특수 재화 상점 (결투장 코인 · 탑 코인 · 길드 코인은 D) */
    coins: [
      { id: 'ar_awaken', coin: 'arenaCoin', price: 100, name: '각성석 ×5', give: { awakenStone: 5 } },
      { id: 'ar_ticket', coin: 'arenaCoin', price: 60, name: '옵션 티켓 ×1', give: { optTicket: 1 } },
      { id: 'tw_trans', coin: 'towerCoin', price: 80, name: '초월석 ×1', give: { transStone: 1 } },
      { id: 'tw_shard', coin: 'towerCoin', price: 60, name: '전용 무기 조각 ×5', give: { exShard: 5 } },
      { id: 'tw_book', coin: 'towerCoin', price: 40, name: '스킬북 ×1', give: { skillBook: 1 } },
    ] as { id: string; coin: string; price: number; name: string; give: Record<string, number> }[],
    packs: [{ id: 'starter', name: '초보 원정대 꾸러미', give: { gold: 50000, enh: 50, exp: 20, skillBook: 3 }, dust: 500, once: true }] as { id: string; name: string; give: Record<string, number>; dust: number; once: boolean }[],
  },
  /**
   * C덩어리 콘텐츠 (STAR_PLAN_v2 §3) — 하루 도전 수 · 강함(스테이지 강함 지수 p에 더함) · 보상
   */
  content: {
    /** 토벌: 깬 장의 보스 재도전 · 하루 5 · 강함 = 그 장 x-10 + add · 보상: 강화석·장비(확률↑)·전용 무기 조각 */
    hunt: { tries: 5, add: 6, enh: 15, gearChance: 0.8, gearDiff: 1, shard: { chance: 0.3, n: 2 }, cost: 0 },
    /** 상급 던전: 장별 장비 던전 · 하루 5 · 정예 3웨이브 · 장비 확정(어려움 가중치) */
    dungeon: { tries: 5, add: 10, gear: 1, gearDiff: 2, waves: ['ggw', 'wgwg', 'wwww'] as string[] },
    /** 도전의 탑 (「체크인」 심연: 층마다 ×grow · bossEvery층 보스): 1층 = 강함 bossBase · 처음 깬 층 보상 · 주간 최고 층 */
    tower: { grow: 1.07, base: 4, bossEvery: 5, dust: [10, 2] as number[], runeEvery: 5, coin: 5, bossCoin: 20 },
    /** 요일 던전 (KST 요일 0=일): 보상 종류 · 하루 3 · 단계 1~5 (강함 = 단계 × step) */
    day: { tries: 3, levels: 5, step: 12, kinds: ['all', 'exp', 'gold', 'enh', 'exp', 'gold', 'enh'] as string[], exp: 6, gold: 20000, enh: 30 },
    /** 레이드(협동 8인 = 내 4 + AI 4): 하루 3 · 드래곤 강함 · 보상 티어 재료 · 장비(영웅 이상) */
    raid: { tries: 3, add: 12, hp: 320, atk: 2.4, tierMat: 6, gearGrade: 3, limit: 150 },
    /** 월드 보스 (공용 체력 · 1단계는 로컬 + AI 기여): 하루 3 · 한 판 60초 · 체력 = base × grow^주 · AI 기여(시간당) · 보상(내 피해 순위 칸) */
    world: { tries: 3, sec: 60, partBase: 6, hp: 5e8, grow: 1.6, aiPerHour: 0.004, add: 20, rewardDust: [200, 100, 50, 25] as number[], rankCut: [0.01, 0.1, 0.3, 1] as number[] },
    /** 결투장 3리그: 하루 5판 · 승점 · 리그 단계 · 영광의 리그 열리는 시간(KST) · 최후의 리그 해금 점수 · 리그 코인 */
    arena: { tries: 5, win: 25, lose: -12, start: 1000, tiers: [[0, '동'], [1100, '은'], [1250, '금'], [1450, '별빛'], [1700, '전설']] as [number, string][], gloryHours: [[12, 14], [19, 23]] as number[][], lastUnlock: 1250, coin: { win: 30, lose: 10 } },
    /** 영웅 외전: 영웅마다 3막 (마지막 = 보스) · 강함 = 영웅 레벨 기준 · 클리어 보상: 전용 보물 해금 · 그 영웅 전용 무기 조각 · 별가루 */
    side: { acts: 3, add: 0, shards: 10, dust: 100 },
    /** 이정표 보상 별가루 (단계마다) */
    milestoneDust: 60,
  },
  /**
   * D덩어리 소셜·운영 (STAR_PLAN_v2 §4)
   */
  social: {
    /** 출석: 7일 돌림 보상 (별가루·금화·행동력) · 이벤트 출석(오픈 기념): 기간 · 날마다 별가루 */
    attend: [{ gold: 10000 }, { stardust: 30 }, { exp: 5 }, { enh: 30 }, { stardust: 60 }, { optTicket: 1 }, { stardust: 150 }] as Record<string, number>[],
    event: { name: '오픈 기념 출석', start: '2026-10-17', days: 14, dust: 50 },
    /** 길드: 출석 코인 · 기여(금화 → 기여 점수·코인) · 길드 레이드(주간 · 하루 2 · 90초 · 준 피해 = 기여) */
    guild: { attendCoin: 20, donate: [[10000, 10, 10], [50000, 60, 50], [200000, 250, 200]] as number[][], raidTries: 2, raidSec: 90, raidHp: 2e9, raidAdd: 15, raidCoinPer: 2e6, members: 30 },
    /** 친구: 하루 선물 보내기·받기 (행동력) · 최대 친구 수 */
    friends: { gift: 5, giftsPerDay: 10, max: 30 },
    /** 랭커 칭호: 이 순위 안이면 칭호 */
    titleTop: 3,
    /** 클라우드 저장: 자동 올리기 간격(초) · 「체크인」 계정 이메일 꼴 */
    cloud: { pushSec: 60, emailDomain: 'players.legacy-of-adventure.app', guestPrefix: 'g_' },
    /** 월드 채팅: 보관 줄 수 · 내 글 길이 */
    chat: { keep: 60, max: 60 },
    /** 빠른 채팅 (MOBILE_REF §2 · 결투장 감정 표현 §3-B와 같은 묶음): 자주 쓰는 말 8 + 감정 4(아이콘 키) · 누르면 바로 보냄 */
    quick: {
      phrases: ['ㅎㅇ', 'ㄱㄱ', '고마워요!', '같이 레이드?', 'ㅋㅋㅋ', '수고했어요', '잘 부탁해요', '굿굿'],
      emotes: ['emo_smile', 'emo_wow', 'emo_angry', 'emo_heart'],
    },
  },
  /**
   * 보스 전장 (레이드 8인 · 월드 보스 · 길드 레이드 — 스토리와 다른 화면) · 형철 10/17 지시 ①~⑥
   *  보스는 오른쪽 절반을 채우는 거대 크기 · 부위 3개(체력 = 보스 최대 체력 × hp) · 바닥 위/아래 2줄 · 줄 단위 경고 → 탭 한 번으로 줄 바꿔 피하기
   *  그로기 게이지 → 다운 + 협공 컷인 · 체력 70%·30% 페이즈 전환 · 다층 배경 · 큰 공격 흔들림 · 필살기 줌인
   */
  raidArena: {
    /** 보스: 화면 키(논리 px) · 가운데 x (너비 비율) · 발 y */
    bossH: 335, bossX: 0.75, bossY: 342,
    /** 맞을 때 하얀 번쩍임: 이 값보다 클 때만 · 최대 진하기 */
    flashMin: 0.5,
    flashMax: 0.22,
    /** 두 줄 발 y · 파티 A(내 파티) x · 파티 B(AI·뒤쪽) x — 줄은 처음에 A 위 / B 아래 */
    lanes: [218, 280] as number[],
    aX: [372, 330, 288, 246] as number[],
    bX: [196, 154, 112, 70] as number[],
    /** 줄 바꿀 때 걸리는 시간(초) */
    laneMove: 0.25,
    /** 피해 순위에 보이는 수 (8명 다 보이면 아래 줄 영웅을 가림) */
    rankShow: 5,
    /** 부위: 이름 · 체력 비율 · 그림 안 자리(보스 그림 기준 비율: 가운데에서 x · 발에서 위로 y · 폭 · 높이) · 부수면 사라지는 패턴 */
    parts: [
      { key: 'arm', name: '팔', hp: 0.16, box: [-0.37, 0.99, 0.25, 0.47], pattern: 'laneSlam' },
      { key: 'head', name: '머리', hp: 0.12, box: [-0.09, 0.89, 0.18, 0.15], pattern: 'beam' },
      { key: 'core', name: '코어', hp: 0.2, box: [-0.01, 0.69, 0.17, 0.19], pattern: 'nova' },
    ] as { key: string; name: string; hp: number; box: number[]; pattern: string }[],
    /** 패턴: 몇 초마다 · 경고 시간 · 배수 · 줄('one' = 내 파티가 있는 줄 하나 · 'both' = 두 줄 차례로) · 문구 */
    patterns: {
      laneSlam: { every: 7, warn: 1.8, mult: 2.6, lanes: 'one', text: '팔을 높이 듭니다 — 줄 내려찍기' },
      beam: { every: 10, warn: 2.0, mult: 3.2, lanes: 'one', text: '머리에 빛이 모입니다 — 줄 광선' },
      nova: { every: 14, warn: 2.4, mult: 1.8, lanes: 'both', text: '코어가 맥동합니다 — 두 줄 차례로 폭발' },
      rage: { every: 8, warn: 1.5, mult: 3.0, lanes: 'one', text: '분노한 일격 — 피하세요!' },
    } as Record<string, { every: number; warn: number; mult: number; lanes: 'one' | 'both'; text: string }>,
    /** 페이즈: 체력 이 비율 아래로 → 다음 페이즈 (패턴 순서 · 빨라짐 배수) */
    phases: [0.7, 0.3] as number[],
    phasePatterns: [['laneSlam', 'beam'], ['laneSlam', 'nova', 'beam'], ['rage', 'nova', 'laneSlam', 'beam']] as string[][],
    phaseSpeed: [1, 1.2, 1.45] as number[],
    phaseSec: 1.8,
    /** 그로기: 최대 · 평타 한 번 · 스킬 한 번 · 기절 효과 · 직접 피하기 · 다운 시간 · 다운 중 받는 피해 배수 · 다운 뒤 최대 늘어남 */
    groggy: { max: 600, hit: 1, skill: 8, stun: 30, dodge: 50, dur: 6, dmgMult: 1.5, grow: 1.3 },
    /** 피하기: AUTO일 때 내 파티 자동 피하기 확률 · AI 파티 · 직접 피하면 공격력 보너스 */
    autoDodge: 0.7,
    aiDodge: 0.6,
    dodgeBonus: { atk: 0.2, dur: 5 },
    /** 카메라: 필살기 줌 · 페이즈 전환 클로즈업 */
    zoom: { ult: 1.15, ultSec: 0.55, phase: 1.4 },
    /** 다층 배경: 겹 수 · 겹마다 흐르는 속도 · 크기 */
    parallax: [[0.03, 1.25], [0.08, 1.1], [0.18, 1.0]] as number[][],
    /** 보스 그림 두 장 (부서지기 전·후) — 이제 메뉴 썸네일에만 씀 · 전투는 anim1·anim2 시트 (ANIM_1017 ④) */
    art: { have: true as boolean, intact: 'raidboss/intact.png', broken: 'raidboss/broken.png' },
    /** 레이드·월드 보스 동작 (ANIM_1017 ④): 대기 칸 바뀌는 빠르기 · 부위 파괴 움찔 초 · 쓰러짐→잔해 초 · 그 뒤 사라지는 초 */
    anim: { idleFps: 2.5, flinchSec: 0.2, dieSec: 1.2, fadeSec: 0.5 },
  },
  /** 경제 시뮬 (tests/economy.test.ts → docs/ECONOMY.md): 하루 플레이 행동력 비율 · 하루 별가루로 행동력 사기 횟수 · 하루 접속 수 */
  econ: {
    /** 주간 획득 상한 (B 보강 §4 · 독주 방지 · 월요일 0시 KST에 비움) — 넘친 만큼은 안 들어오고 사냥은 계속 (금화·경험치·장비) · 우편 보상은 상한 밖 */
    cap: { stardust: 3600, awakenStone: 20, transStone: 4 } as Record<string, number>,
    light: { staUse: 0.5, buys: 0, sessions: 2 },
    normal: { staUse: 1, buys: 0, sessions: 4 },
    heavy: { staUse: 1, buys: 3, sessions: 8 },
  } as unknown as Record<string, { staUse: number; buys: number; sessions: number }> & { cap: Record<string, number> },
  /** 전투력 = (공격 × atkW + 체력 × hpW + 방어 × defW) 합 */
  power: { atkW: 6, hpW: 0.5, defW: 1.5 },
  /** 채팅·기타 */
  ui: {
    /** 결투장 연출 (MOBILE_REF §3-B): VS 입장 초 · VS 박히는 때 · 카운트다운 숫자 · 숫자 하나 초 · 감정 표현 보이는 초 · 상대 AI 감정 간격(초)·확률 · 상대 승률 범위(%) · 상대 리그 순위 최대 */
    arenaShow: { vsSec: 1.5, vsHitSec: 0.45, count: 3, countSec: 0.7, emoteSec: 2, aiEvery: [6, 14] as number[], aiChance: 0.5, aiRate: [42, 76] as number[], aiRankMax: 300 },
    /** 전투 남은 시간이 이 초 이하면 빨갛게 (MOBILE_REF §3-A-3) */
    clockLowSec: 30,
    /** 승리 별 3개: 첫 별까지(초) · 별 사이(초) */
    winStars: { delay: 0.45, gap: 0.32 },
    /** 어두운 톤 예외 (스타일 D 규칙 · 형철 10/17): 이 콘텐츠 전투만 남색 팔레트 */
    darkModes: ['tower', 'raid', 'world', 'graid'] as string[],
    /** 콘텐츠 전투 배경 (전투 제목 앞부분 = 콘텐츠 이름 → public/art/bgs/<값>.jpg) · 스토리는 bg.jpg */
    battleBg: { '도전의 탑': 'tower', 레이드: 'raid', '월드 보스': 'raid', '길드 레이드': 'raid', 결투장: 'arena', '상급 던전': 'dungeon', '토벌 전투': 'dungeon', '요일 던전': 'daily' } as Record<string, string>,
    /** 화면 배경 그림 (public/art/screens/<값>.jpg · DENSITY: 단색 대신 그림 · 영웅·편성/상점/가방은 전용 그림(SCREENS_1017) · 나머지 메뉴 화면은 로비 마을을 흐리게) · 로비는 캔버스에 직접(걸어 다니는 영웅) */
    screenBg: { title: 'title', guild: 'guild', adventure: 'map', heroes: 'heroes', hero: 'heroes', prep: 'heroes', shop: 'shop', bag: 'bag', portal: 'lobby', mission: 'lobby', friends: 'lobby', ranking: 'lobby', mail: 'lobby', settings: 'lobby' } as Record<string, string>,
    /** 가방: 빈 칸을 이만큼까지 보여 줘 화면을 채움 (DENSITY §3) */
    bagShowMin: 27,
    /** 흐리게 까는 화면 (그림 위 반투명 막) */
    screenVeil: ['adventure', 'heroes', 'hero', 'prep', 'shop', 'bag', 'portal', 'mission', 'friends', 'ranking', 'mail', 'settings', 'guild'] as string[],
    /** 메인 모험 지도 (RECOVER_1018 S1 · 형철 10/18): 화면 덮는 크기의 몇 배 · 끌기 시작 거리(px) · 노드 메달 가운데가 올 safe 띠(위 HUD 밑 ~ 아래 메뉴 위 · px)
     *  노드 위 그림: 원정대장·보스 키(메달 32px의 2배 남짓) · 그림 캔버스 너비 · 머리 위 여백 · 발밑 그림자 높이 · 보스는 노드에서 오른쪽·뒤(위)로 비켜 섬(px · 1-9 원정대장과 안 겹치게) */
    mainMap: { zoom: 1, dragPx: 6, nodeTop: 118, nodeBottom: 264, leadH: 64, bossH: 72, figW: 110, figPad: 14, figFoot: 6, boss: [34, 14] as [number, number] }, speeds: [1, 1.5, 2], toastSec: 1.5,
    /** 전투 전 로딩 팁 화면 초 (누르면 넘김 · RECOVER_1018 S3) */
    loadTipSec: 1.6,
    /** 로비 뜬 뒤 나머지 영웅 시트를 동시에 몇 개씩 받을지 (SPRITE_RES §C) */
    preloadAtOnce: 3,
    /** 로딩 막대가 이 초 동안 안 움직이면 「다시 시도」 · 그림 하나가 이 초 넘게 안 오면 건너뜀 (PLAYTEST §1) */
    /** 장비 소환 연출 (PLAYTEST §11): 마법진·떨어짐·흔들림 1번·카드 펼침·한 장씩 간격·끝나고 기다림·전설 슬로우(초) · 최고 등급별 흔들림 횟수(일반~전설) */
    gacha: { circleSec: 0.8, dropSec: 0.5, shakeSec: 0.42, spreadSec: 0.6, flipGap: 0.28, endWait: 0.6, legendSlow: 0.5, shakes: [1, 1, 1, 2, 3] },
    loadStallSec: 5,
    loadItemSec: 12,
    /** 글씨 자동 축소 (FONT_FINAL2 §2): 넘치면 step px씩 줄여 이 최소 크기까지 → 그래도 넘치면 말줄임 */
    fit: { step: 0.5, name: 13, desc: 10 }, resultDelayWin: 1.6, resultDelayLose: 0.9 },
} as const;
export type Config = typeof CONFIG;
