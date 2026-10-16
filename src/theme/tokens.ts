// 테마 토큰 — 색·폰트·여백·테두리·그림자·아이콘의 유일한 출처 (ROADMAP §0 1단계 원칙)
//  · 화면(CSS)은 applyTheme()가 :root에 쓴 var(--…)만 쓴다
//  · 캔버스(전투)는 T.battle.* 를 읽는다
//  · 아이콘은 icon(키)로만 (지금은 글자/이모지 · 2단계에서 경로로 바꾸면 전 화면이 바뀜)
//  tests/theme.test.ts 가 이 파일 밖의 색 리터럴(#hex·rgb())을 막는다
export const T = {
  color: {
    bg: '#0b0918',
    bg2: '#151131',
    panel: '#1d1840',
    panel2: '#2a2358',
    panelHi: '#3a3170',
    line: '#4b3f8f',
    lineHi: '#6a5bc8',
    gold: '#f2c86a',
    gold2: '#b8862e',
    text: '#ffffff',
    textDim: '#c8bff0',
    textMute: '#8a80c0',
    star: '#fff3c4',
    good: '#5ee07a',
    bad: '#ff5e5e',
    warn: '#ff6a52',
    info: '#58b8ff',
    hp: '#5ee07a',
    hp2: '#37b956',
    mp: '#58b8ff',
    mp2: '#2e7fe0',
    exp: '#c79bff',
    ink: '#0f0c22',
    shade: 'rgba(8,6,20,0.62)',
    veil: 'rgba(10,8,24,0.78)',
    btn: '#2b2152',
    btnHi: '#e0942c',
    btnHi2: '#ffe08a',
    btnText: '#2a1600',
  },
  /** 등급 색 (장비·룬·영웅 희귀도) */
  grade: { common: '#c8c8d8', uncommon: '#7ee08a', rare: '#58b8ff', epic: '#c79bff', legend: '#ffb347', ancient: '#ff6a52' },
  /** 속성 색 (스킬 이펙트 · 데이터는 키로만 부른다) */
  elem: { fire: '#ff6b3d', ice: '#8fe3ff', holy: '#fff3a8', light: '#ffd36b', nature: '#9dffb0', wind: '#8fd0ff', shadow: '#c79bff', steel: '#ffffff', ember: '#ffa040', pink: '#ff8ac8', earth: '#ff7a3d', gold: '#ffe08a', wave: '#5fa8ff' },
  font: {
    base: '"Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif',
    num: '"Segoe UI", system-ui, sans-serif',
    size: { xs: '9px', sm: '11px', md: '13px', lg: '16px', xl: '22px', xxl: '40px' },
    weight: { normal: '600', bold: '800', black: '900' },
  },
  space: { xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '18px' },
  radius: { sm: '3px', md: '8px', lg: '12px', cut: '10px 3px 10px 3px' },
  border: { thin: '1px', base: '2px', thick: '3px' },
  shadow: { glow: '0 0 10px rgba(242,200,106,0.55)', drop: '0 2px 0 rgba(0,0,0,0.6)' },
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
    warnFloor: 'rgba(255,50,30,',
    flash: 'rgba(255,250,230,',
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
    numCrit: ['#fffbd0', '#ffcf3a', '#ff6a1a'],
    numCritLabel: '#ffe36b',
    white: '#ffffff',
    sky: ['#8fd0ff', '#d9f2ff'],
    placeholderTag: 'rgba(15,12,34,0.85)',
    /** 자리표시자 영웅 색 바꾸기 (canvas filter) */
    tint: ['hue-rotate(40deg)', 'hue-rotate(110deg)', 'hue-rotate(180deg)', 'hue-rotate(250deg)', 'hue-rotate(310deg)', 'saturate(0.4) brightness(1.15)'],
  },
  /** 아이콘: 지금은 글자 · 2단계에서 그림 경로로 */
  icon: {
    gold: '🪙', stardust: '✦', token: '🎟', enh: '🔷', tierMat: '🐉', optTicket: '🎫', rune: '🔶', guildCoin: '🛡', arenaCoin: '⚔', towerCoin: '🗼', exp: '🧪', skillBook: '📘', transStone: '💠', exShard: '🗡', treasureShard: '🏺', awakenStone: '🌟',
    adventure: '🗺', content: '⚔', heroes: '👥', formation: '🧩', bag: '🎒', recruit: '🏠', shop: '🛒', guild: '🏰', ranking: '🏆', mail: '✉', mission: '📜', settings: '⚙', chat: '💬', back: '◀', close: '✕', lock: '🔒', star: '★', starOff: '☆', check: '✓', auto: '⟳', sweep: '⏩', offline: '💤',
    tower: '🗼', day: '📅', coop: '🐉', guildRaid: '🛡', worldBoss: '🌋', arena: '🏟',
    weapon: '🗡', armor: '🛡', acc: '💍', shield: '🛡', guard: '✦', taunt: '📯', regen: '❀', stun: '💫', silence: '🤐', slow: '❄', burn: '🔥', atkUp: '⬆', atkDown: '⬇', spdUp: '⏫', fury: '🔥',
    knight: '🛡', warrior: '⚔', fighter: '👊', assassin: '🗡', archer: '🏹', engineer: '🔧', mage: '🔮', priest: '✚', druid: '🌿',
  } as Record<string, string>,
} as const;

/** 아이콘 HTML (2단계: 경로면 <img>) */
export function icon(key: string, cls = 'ic'): string {
  const v = T.icon[key] ?? '·';
  return /\.(png|svg|webp)$/.test(v) ? `<img class="${cls}" src="${v}" alt="">` : `<span class="${cls}">${v}</span>`;
}
export const gradeColor = (g: keyof typeof T.grade) => T.grade[g];
export const elemColor = (e: string) => (T.elem as Record<string, string>)[e] ?? T.color.text;

/** :root 에 CSS 변수로 쓰기 — 화면의 모든 색·크기는 여기서 */
export function applyTheme(root: HTMLElement = document.documentElement) {
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  for (const [k, v] of Object.entries(T.color)) set(`--c-${k}`, v);
  for (const [k, v] of Object.entries(T.grade)) set(`--g-${k}`, v);
  for (const [k, v] of Object.entries(T.elem)) set(`--e-${k}`, v);
  set('--f-base', T.font.base);
  set('--f-num', T.font.num);
  for (const [k, v] of Object.entries(T.font.size)) set(`--fs-${k}`, v);
  for (const [k, v] of Object.entries(T.font.weight)) set(`--fw-${k}`, v);
  for (const [k, v] of Object.entries(T.space)) set(`--s-${k}`, v);
  for (const [k, v] of Object.entries(T.radius)) set(`--r-${k}`, v);
  for (const [k, v] of Object.entries(T.border)) set(`--b-${k}`, v);
  for (const [k, v] of Object.entries(T.shadow)) set(`--sh-${k}`, v);
}
