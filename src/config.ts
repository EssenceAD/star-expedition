// 모든 숫자는 여기 한 곳 (ROADMAP §0 1단계 원칙) — 밸런스는 tests/balance.test.ts · tools/econ.mjs 로 확인
//  전투 공식은 「체크인」 전투(combat/field.ts · CONFIG.combat): 치명 15% ×2 · 받는 피해 × (1 − 방어/(방어+K)) 최대 40% · 히트스톱/넉백/흔들림
export const CONFIG = {
  /** 논리 화면: 높이 고정 · 너비는 창 비율에 맞춰 (화면 꽉 채우기) */
  view: { h: 390, wMin: 640, wMax: 960, wBase: 844, ground: 254 },
  combat: {
    critChance: 0.15,
    critMult: 2,
    /** 받는 피해 감소 = 방어 / (방어 + defK × 때린 쪽 공격) — 숫자 크기가 자라도 같은 비율 */
    defK: 3,
    defMax: 0.4,
    hitstop: { hit: 0.035, crit: 0.07, kill: 0.09 },
    knock: { hit: 5, crit: 10, kill: 18 },
    shake: { crit: 3, boss: 7, smash: 9, meteor: 5, bossKill: 12 },
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
    places: [[430, 282], [380, 238], [300, 282], [250, 238]] as [number, number][],
    /** 같은 구역이 비면 생기는 틈 (구역이 바뀔 때마다 이만큼 더 뒤로) */
    zoneGap: 18,
    /** 적 자리 (화면 오른쪽 끝에서 뺀 x · 발 y) */
    mobSlots: [[292, 238], [238, 282], [184, 238], [130, 282]] as [number, number][],
    bossSlot: [180, 266] as [number, number],
    /** 피해 숫자: 대상 위 가로로 흩뿌리는 폭(±) · 줄 수 · 줄 높이 · 비켜 놓는 최대 거리 · 수명(초) · 올라가는 속도(px/초) · 이보다 위(보스 바)에는 안 놓음 */
    nums: { scatter: 34, rows: 6, rowH: 22, spread: 90, life: 1.15, rise: 30, minY: 70 },
  },
  /** 영웅 성장 (1단계 A: 레벨만 · 각성·스킬 레벨·초월은 B) */
  hero: {
    /** 레벨 상한 (각성 단계별) */
    levelCap: [30, 40, 50, 60, 70, 80],
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
    firstDust: 10,
    firstDustBoss: 40,
    threeStarDust: 5,
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
  /** 전투력 = (공격 × atkW + 체력 × hpW + 방어 × defW) 합 */
  power: { atkW: 6, hpW: 0.5, defW: 1.5 },
  /** 채팅·기타 */
  ui: { speeds: [1, 1.5, 2], resultDelayWin: 1.6, resultDelayLose: 0.9 },
} as const;
export type Config = typeof CONFIG;
