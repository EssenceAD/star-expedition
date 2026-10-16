// 테마 토큰 — 색·폰트·여백·테두리·그림자·아이콘의 유일한 출처 (ROADMAP §0 1단계 원칙)
//  · 화면(CSS)은 applyTheme()가 :root에 쓴 var(--…)만 쓴다
//  · 캔버스(전투)는 T.battle.* · T.font.* 를 읽는다
//  · 아이콘은 icon(키)로만 (지금은 글자/이모지 · 2단계에서 경로로 바꾸면 전 화면이 바뀜)
//  tests/theme.test.ts 가 이 파일 밖의 색 리터럴(#hex·rgb())·폰트 이름·아이콘 글자·CSS px 꾸밈 값을 막는다
export const T = {
  /** 2단계 스타일 D 「밝은 원정」 (형철 10/17 승인 · docs/style/board_D.png): 크림·아이보리 양피지 패널 + 금 테두리 · 하늘색 주 버튼 · 주황 특수 · 남색은 글자·얇은 테두리만 */
  color: {
    bg: '#f6eedb',
    bg2: '#fffaf0',
    panel: '#fbf3e0',
    panel2: '#fffaf0',
    panelHi: '#f3e3b8',
    panelDeep: '#efe2c0',
    chip: '#f1e2bd',
    line: '#c9a14a',
    lineHi: '#e8c56a',
    gold: '#c9a14a',
    gold2: '#a8822e',
    text: '#1d2a58',
    textDim: '#3b4672',
    textMute: '#6b7396',
    textSoft: '#2b3a6b',
    accent: '#2a7fd0',
    star: '#a8781e',
    starOn: '#ffb400',
    starOff: '#d8ccb0',
    good: '#2f9a4a',
    bad: '#d93a48',
    warn: '#e8414f',
    warnDeep: '#5a0010',
    info: '#2a7fd0',
    cool: '#2a7fd0',
    hp: '#4cc76a',
    hp2: '#2f9a4a',
    mp: '#4fb3ff',
    mp2: '#2a7fd0',
    exp: '#a87be8',
    bossHp0: '#e8414f',
    bossHp1: '#ff9a3c',
    bossHp2: '#ffd36b',
    bossHpBg: '#e9d4c0',
    bossBg: '#f3e3b8',
    ink: '#1d2a58',
    black: '#000000',
    shade: 'rgba(60,45,20,0.25)',
    veil: 'rgba(40,32,18,0.5)',
    veil2: 'rgba(255,250,240,0.96)',
    glass: 'rgba(255,250,240,0.9)',
    barFade: 'rgba(251,243,224,0.8)',
    titleGlow: 'rgba(255,240,200,0.4)',
    hiLine: 'rgba(255,255,255,0.7)',
    btn: '#fffaf0',
    btnHi: '#2a7fd0',
    btnHi2: '#4fb3ff',
    btnText: '#06203a',
    btnEdge: '#1d5fa8',
    special: '#ff9a3c',
    special2: '#e07a1c',
    logo0: '#fff6c8',
    logo1: '#ffb84a',
    logoEdge: '#6a3a10',
    logoShadow: '#2a1650',
    logoSub: '#ffe9a8',
    lose0: '#9aa3c4',
    lose1: '#5b6488',
    tagBg: 'rgba(255,250,240,0.9)',
  },
  /** 어두운 예외 (심연의 탑 · 레이드 · 월드 보스 · 길드 레이드 · 밤 이벤트) — 1단계 남색 팔레트 */
  colorDark: {
    bg: '#0b0918',
    bg2: '#151131',
    panel: '#1d1840',
    panel2: '#2a2358',
    panelHi: '#3a3170',
    panelDeep: '#120e28',
    chip: '#2f2766',
    line: '#4b3f8f',
    lineHi: '#6a5bc8',
    gold: '#f2c86a',
    gold2: '#b8862e',
    text: '#ffffff',
    textDim: '#c8bff0',
    textMute: '#8a80c0',
    textSoft: '#d8cfff',
    accent: '#b8a8ff',
    star: '#fff3c4',
    starOn: '#ffd23f',
    starOff: '#3a3460',
    good: '#5ee07a',
    bad: '#ff5e5e',
    warn: '#ff6a52',
    warnDeep: '#3a0000',
    info: '#58b8ff',
    cool: '#9fd8ff',
    hp: '#5ee07a',
    hp2: '#37b956',
    mp: '#58b8ff',
    mp2: '#2e7fe0',
    exp: '#c79bff',
    bossHp0: '#ff5e3a',
    bossHp1: '#ffb340',
    bossHp2: '#ffe27a',
    bossHpBg: '#3a0e1e',
    bossBg: '#2a1430',
    ink: '#0f0c22',
    black: '#000000',
    shade: 'rgba(8,6,20,0.62)',
    veil: 'rgba(10,8,24,0.78)',
    veil2: 'rgba(10,8,24,0.92)',
    glass: 'rgba(15,12,34,0.82)',
    barFade: 'rgba(11,9,24,0.85)',
    titleGlow: 'rgba(60,40,120,0.3)',
    hiLine: 'rgba(255,243,196,0.08)',
    btn: '#2b2152',
    btnHi: '#e0942c',
    btnHi2: '#ffe08a',
    btnText: '#2a1600',
    btnEdge: '#8a4a10',
    logo0: '#fff6c8',
    logo1: '#ffb84a',
    logoEdge: '#6a3a10',
    logoShadow: '#2a1650',
    logoSub: '#ffe9a8',
    lose0: '#d8d8ff',
    lose1: '#8a8ac8',
    tagBg: 'rgba(15,12,34,0.85)',
    special: '#ff9a3c',
    special2: '#e07a1c',
  },
  /** 등급 색 (장비·룬·영웅 희귀도) */
  grade: { common: '#c8c8d8', uncommon: '#7ee08a', rare: '#58b8ff', epic: '#c79bff', legend: '#ffb347', ancient: '#ff6a52' },
  /** 속성 색 (스킬 이펙트 · 영웅 상징색 · 데이터는 키로만 부른다) */
  elem: { fire: '#ff6b3d', ice: '#8fe3ff', holy: '#fff3a8', light: '#ffd36b', nature: '#9dffb0', wind: '#8fd0ff', shadow: '#c79bff', steel: '#ffffff', ember: '#ffa040', pink: '#ff8ac8', earth: '#ff7a3d', gold: '#ffe08a', wave: '#5fa8ff', blood: '#ff4a6a', beast: '#c8a060' },
  font: {
    /** 스타일 D 폰트 = 시안 C (형철 10/17): 본문 IBM Plex Sans KR · 제목 Black Han Sans · 숫자 Oxanium (모두 OFL · index.html에서 Google Fonts) */
    base: '"IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    title: '"Black Han Sans", "IBM Plex Sans KR", "Malgun Gothic", system-ui, sans-serif',
    num: '"Oxanium", "IBM Plex Sans KR", system-ui, sans-serif',
    size: { xxs: '8px', xs: '9px', sm: '10px', md: '11px', base: '12px', lg: '13px', xl: '15px', xxl: '18px', h2: '24px', h1: '40px', logo: '54px' },
    weight: { normal: '500', bold: '700', black: '700' },
    /** 캔버스 글자 크기 (px 숫자) */
    canvas: { num: 20, numBig: 26, numCrit: 34, critLabel: 13, cutName: 38, cutHero: 15, stun: 13, tag: 10 },
  },
  space: { xxs: '1px', xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '18px', xxl: '28px' },
  radius: { sm: '3px', md: '8px', lg: '12px', cut: '10px 3px 10px 3px', cutSm: '8px 2px 8px 2px', cutLg: '14px 4px 14px 4px', tabR: '0 8px 8px 0' },
  border: { thin: '1px', base: '2px', thick: '3px' },
  shadow: {
    glow: '0 0 10px rgba(242,200,106,0.55)',
    glowHi: '0 0 14px rgba(255,210,100,0.7)',
    drop: '0 2px 0 rgba(0,0,0,0.6)',
    btn: '0 4px 0 #8a4a10, 0 0 24px rgba(255,200,80,0.6)',
    text: '0 1px 2px #000000',
    textSm: '0 1px 1px #000000',
    warn: '0 0 6px #000000, 0 2px 0 #3a0000',
    logo: '0 3px 0 #2a1650, 0 0 24px rgba(255,210,110,0.5)',
    starOn: '0 0 18px #ffcf4a, 0 2px 0 #8a4a10',
    starOff: '0 2px 0 #000000',
    inset: 'inset 0 0 0 1px rgba(255,243,196,0.08)',
    /** 강화 구간 빛 (+10 · +20 · +30 · +40 · +50 — 한 단계씩 화려하게) */
    enh1: '0 0 6px rgba(120,200,255,0.55)',
    enh2: '0 0 10px rgba(120,220,255,0.8), inset 0 0 6px rgba(120,220,255,0.35)',
    enh3: '0 0 14px rgba(200,140,255,0.9), inset 0 0 8px rgba(200,140,255,0.45)',
    enh4: '0 0 18px rgba(255,190,80,0.95), inset 0 0 10px rgba(255,190,80,0.5)',
    enh5: '0 0 24px rgba(255,90,70,1), 0 0 8px rgba(255,230,140,0.9), inset 0 0 12px rgba(255,120,80,0.55)',
    enhNum: '0 0 3px #000000, 0 2px 0 #5a2a00',
    enhBurst: '0 0 30px rgba(255,210,100,0.95), 0 4px 0 #6a3a00',
  },
  /** 밝은 화면에서 바꾸는 그림자 (어두운 예외에서는 위 shadow 그대로) */
  shadowLight: {
    drop: '0 2px 0 rgba(60,45,20,0.25)',
    btn: '0 3px 0 #1d5fa8, 0 0 14px rgba(79,179,255,0.45)',
    text: '0 1px 0 rgba(255,255,255,0.85)',
    textSm: '0 1px 0 rgba(255,255,255,0.8)',
    warn: '0 0 4px #ffffff, 0 2px 0 rgba(90,0,16,0.35)',
    starOff: '0 1px 0 rgba(255,255,255,0.8)',
    inset: 'inset 0 0 0 1px rgba(255,255,255,0.7), 0 0 0 1px rgba(43,58,107,0.15)',
    glow: '0 0 10px rgba(201,161,74,0.6)',
    glowHi: '0 0 14px rgba(79,179,255,0.6)',
  } as Record<string, string>,
  /** 전투 캔버스 */
  battle: {
    shadow: 'rgba(25,30,20,0.3)',
    road0: 'rgba(190,156,100,0)',
    road1: 'rgba(200,164,108,0.12)',
    road2: 'rgba(120,90,60,0.35)',
    pebble: 'rgba(110,84,56,0.35)',
    grass: ['#4f9e3e', '#63b34c', '#ffd1e6'],
    hpMob: '#ff5a5a',
    hpBar: 'rgba(20,16,30,0.8)',
    slowBar: '#66c8ff',
    shield: 'rgba(170,225,255,0.7)',
    stun: '#ffe36b',
    silence: '#c79bff',
    burn: '#ff7a3d',
    warnFloor: 'rgba(255,50,30,',
    flash: 'rgba(255,250,230,',
    hitFlash: 'rgba(255,255,255,',
    cutVeil: 'rgba(8,8,24,0.42)',
    cutEdge: '#0d0a20',
    cutLine: 'rgba(255,255,255,0.35)',
    cutBar: 'rgba(255,255,255,0.9)',
    cutStroke: 'rgba(20,10,4,0.95)',
    cutName: '#ffe9a8',
    numStroke: '#22140c',
    numCritStroke: '#4a0e00',
    numHealStroke: '#0b3d18',
    numText: '#ffffff',
    numHeal: '#7dff9b',
    numMob: '#ffb0b0',
    numCrit: ['#fffbd0', '#ffcf3a', '#ff6a1a'],
    numCritLabel: '#ffe36b',
    white: '#ffffff',
    clear: 'rgba(0,0,0,0)',
    burstCrit: '#ffd36b',
    burstKill: '#fff6c8',
    bossSlam: '#ffb35c',
    bossBeam: '#ffb000',
    sky: ['#8fd0ff', '#d9f2ff'],
    placeholderTag: 'rgba(15,12,34,0.85)',
    /** 보스 전장: 줄 바닥 · 줄 경고(알파는 코드) · 부서진 자리 · 금 · 집중 부위 테두리 · 다운 · 페이즈마다 배경 색 */
    laneBand: 'rgba(255,255,255,0.12)',
    laneEdge: 'rgba(255,243,196,0.45)',
    laneWarn: 'rgba(255,40,30,',
    crack: '#1a0f08',
    crackGlow: '#ff9a3c',
    focusRing: '#ffe36b',
    downVeil: 'rgba(30,30,60,0.35)',
    noteBg: 'rgba(15,12,34,0.8)',
    phaseTint: ['none', 'saturate(1.3) hue-rotate(-20deg) brightness(0.85)', 'hue-rotate(-50deg) saturate(1.6) brightness(0.6)'],
    duoA: '#ffb347',
    duoB: '#58b8ff',
    tagText: '#fff3c4',
    /** 자리표시자 영웅 색 바꾸기 (canvas filter) */
    tint: ['hue-rotate(40deg)', 'hue-rotate(110deg)', 'hue-rotate(180deg)', 'hue-rotate(250deg)', 'hue-rotate(310deg)', 'saturate(0.4) brightness(1.15)'],
    /** 장(지역)마다 배경 색 바꾸기 — 그림 1장 돌려 쓰기 (ROADMAP 1단계: 새 그림 금지) */
    region: ['none', 'hue-rotate(70deg) saturate(0.8)', 'sepia(0.5) brightness(0.8)', 'hue-rotate(160deg) saturate(0.6) brightness(1.1)', 'hue-rotate(230deg) brightness(0.6)', 'hue-rotate(140deg)', 'sepia(0.8) saturate(1.4)', 'hue-rotate(-30deg) saturate(1.5) brightness(0.75)', 'saturate(0.5) brightness(1.25)', 'hue-rotate(250deg) brightness(0.45)'],
    /** 적 색 바꾸기 (장마다 같은 몬스터 그림을 다르게) */
    mobTint: ['none', 'hue-rotate(60deg)', 'hue-rotate(120deg)', 'hue-rotate(180deg)', 'hue-rotate(240deg)', 'hue-rotate(300deg)', 'saturate(0.3) brightness(0.8)', 'sepia(0.7)', 'invert(0.15) hue-rotate(200deg)', 'brightness(0.55) saturate(1.6)'],
  },
  /** 아이콘: 지금은 글자 · 2단계에서 그림 경로로 */
  icon: {
    gold: '🪙', stardust: '✦', token: '🎟', enh: '🔷', tierMat: '🐉', optTicket: '🎫', rune: '🔶', guildCoin: '🛡', arenaCoin: '⚔', towerCoin: '🗼', exp: '🧪', skillBook: '📘', transStone: '💠', exShard: '🗡', treasureShard: '🏺', awakenStone: '🌟', chest: '🎁', bossMat: '🟠', stamina: '⚡', booster: '🚀', badge: '●', achieve: '🎖', friend: '🤝', raid: '🐉', world: '🌋', zone_front: '🛡', zone_mid: '🗡', zone_back: '🏹', join: '🎉', repeat: '🔁', battle: '⚔', summon: '🎲', craft: '⚒',
    adventure: '🗺', content: '⚔', heroes: '👥', formation: '🧩', bag: '🎒', recruit: '🏠', shop: '🛒', guild: '🏰', ranking: '🏆', mail: '✉', mission: '📜', settings: '⚙', chat: '💬', back: '◀', close: '✕', lock: '🔒', star: '★', starOff: '☆', check: '✓', cross: '✗', auto: '⟳', sweep: '⏩', offline: '💤', warn: '⚠', next: '▶', open: '▸', fold: '◂', rotate: '📱↻', sparkle: '✦', story: '📖', skip: '⏭',
    tower: '🗼', day: '📅', coop: '🐉', guildRaid: '🛡', worldBoss: '🌋', arena: '🏟',
    weapon: '🗡', armor: '🛡', acc: '💍', shield: '🛡', guard: '✦', taunt: '📯', regen: '❀', stun: '💫', silence: '🤐', slow: '❄', burn: '🔥', atkUp: '⬆', atkDown: '⬇', spdUp: '⏫', fury: '🔥', critUp: '🎯',
    knight: '🛡', warrior: '⚔', fighter: '👊', assassin: '🗡', archer: '🏹', engineer: '🔧', mage: '🔮', priest: '✚', druid: '🌿',
    /** 스킬 아이콘 (스킬 데이터의 icon 키) */
    sk_slash: '🌀', sk_smash: '⛰', sk_pierce: '⚔', sk_fire: '🔥', sk_frost: '❄', sk_meteor: '☄', sk_heal: '✚', sk_sanct: '❀', sk_barrier: '✧', sk_taunt: '📯', sk_shield: '🛡', sk_arrow: '🏹', sk_rain: '☄', sk_lamp: '🏮', sk_fist: '👊', sk_dagger: '🗡', sk_song: '🎵', sk_dark: '🌑', sk_drone: '🛸', sk_trap: '🪤', sk_gear: '⚙', sk_claw: '🐾', sk_leaf: '🌿', sk_beast: '🐻', sk_star: '⭐', sk_crown: '👑', sk_eye: '👁', sk_gold: '🪙', sk_bottle: '🍶', sk_belly: '🫃', sk_note: '📓', sk_bolt: '⚡', sk_hammer: '🔨', sk_dog: '🐶', sk_paw: '🐾', sk_snack: '🍪', sk_rabbit: '🐰', sk_wind: '🌪', sk_water: '💧', sk_needle: '💉', sk_bed: '🛏', sk_lion: '🦁', sk_dragon: '🐉', sk_wolf: '🐺', sk_cannon: '💣', sk_flower: '🌸', sk_moon: '🌙', sk_book: '📖', sk_whisper: '💭', sk_contract: '📜', sk_gem: '💎', sk_lute: '🎸', sk_veil: '🕯',
  } as Record<string, string>,
} as const;

/** 아이콘 HTML (2단계: 경로면 <img>) */
export function icon(key: string, cls = 'ic'): string {
  const v = T.icon[key] ?? '·';
  return /\.(png|svg|webp)$/.test(v) ? `<img class="${cls}" src="${v}" alt="">` : `<span class="${cls}">${v}</span>`;
}
/** 아이콘 글자 (캔버스·title 속성용) */
export const iconText = (key: string) => T.icon[key] ?? '·';
export const gradeColor = (g: keyof typeof T.grade) => T.grade[g];
export const elemColor = (e: string) => (T.elem as Record<string, string>)[e] ?? T.color.text;
/** 캔버스 글꼴 문자열 */
export const canvasFont = (px: number, weight: keyof typeof T.font.weight = 'black', num = true) => `${T.font.weight[weight]} ${px}px ${num ? T.font.num : T.font.base}`;

/** :root 에 CSS 변수로 쓰기 — 화면의 모든 색·크기는 여기서 */
export type Mode = 'light' | 'dark';
let mode: Mode | null = null;
export function applyTheme(m: Mode = 'light', root: HTMLElement = document.documentElement) {
  if (m === mode && root === document.documentElement) return;
  mode = m;
  root.dataset.theme = m;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  for (const [k, v] of Object.entries(m === 'dark' ? T.colorDark : T.color)) set(`--c-${k}`, v);
  for (const [k, v] of Object.entries(T.grade)) set(`--g-${k}`, v);
  for (const [k, v] of Object.entries(T.elem)) set(`--e-${k}`, v);
  set('--f-base', T.font.base);
  set('--f-num', T.font.num);
  set('--f-title', T.font.title);
  for (const [k, v] of Object.entries(T.font.size)) set(`--fs-${k}`, v);
  for (const [k, v] of Object.entries(T.font.weight)) set(`--fw-${k}`, v);
  for (const [k, v] of Object.entries(T.space)) set(`--s-${k}`, v);
  for (const [k, v] of Object.entries(T.radius)) set(`--r-${k}`, v);
  for (const [k, v] of Object.entries(T.border)) set(`--b-${k}`, v);
  for (const [k, v] of Object.entries(T.shadow)) set(`--sh-${k}`, m === 'light' ? (T.shadowLight[k] ?? v) : v);
}
