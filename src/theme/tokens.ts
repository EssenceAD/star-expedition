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
    /** 화면 그림 위 막 · 가장자리 비네트 · 카드 아래 글씨 받침 (DENSITY) */
    scrVeil: 'rgba(255,248,232,0.5)',
    vignette: 'rgba(60,40,10,0.42)',
    cardShade: 'rgba(20,16,40,0.82)',
    panelGrain: 'rgba(140,100,40,0.05)',
    logo0: '#fff6c8',
    logo1: '#ffb84a',
    logoEdge: '#6a3a10',
    logoShadow: '#2a1650',
    logoSub: '#ffe9a8',
    white: '#ffffff',
    fxInk: '#3a2a14',
    gold0: '#fffbe6',
    gold1: '#ffe08a',
    gold3: '#e8a93a',
    gold4: '#b8741a',
    lose0: '#9aa3c4',
    lose1: '#5b6488',
    tagBg: 'rgba(255,250,240,0.9)',
  },
  /** 어두운 예외 (심연의 탑 · 레이드 · 월드 보스 · 길드 레이드 · 밤 이벤트) — 1단계 남색 팔레트 */
  /** 「남색 유리」 (docs/HARMONY_1017.md §0 · 메뉴·전투 기본) — 크림 판을 걷어내고 반투명 남색 판 + 뒤 그림이 비침 · 글씨 크림/흰 · 강조 금
   *  여기 없는 색은 밤 테마(colorDark) 값을 그대로 씀 */
  colorGlass: {
    panel: 'rgba(20,30,58,0.62)',
    panel2: 'rgba(28,40,74,0.66)',
    panelHi: 'rgba(40,56,98,0.72)',
    panelDeep: 'rgba(12,20,42,0.66)',
    chip: 'rgba(36,52,94,0.8)',
    line: '#c99a3b',
    lineHi: '#e8c46a',
    gold: '#e8c46a',
    gold2: '#c99a3b',
    text: '#f6ecd6',
    textDim: 'rgba(246,236,214,0.85)',
    textMute: 'rgba(246,236,214,0.7)',
    textSoft: '#f6ecd6',
    accent: '#e8c46a',
    btn: 'rgba(28,40,74,0.85)',
    glass: 'rgba(20,30,58,0.62)',
    veil2: 'rgba(16,24,48,0.94)',
    tagBg: 'rgba(16,24,48,0.85)',
    shade: 'rgba(10,16,34,0.6)',
    scrVeil: 'rgba(14,20,40,0.28)',
    cardShade: 'rgba(12,18,40,0.85)',
    hiLine: 'rgba(255,243,196,0.06)',
    panelGrain: 'rgba(255,255,255,0.02)',
    /** 크림은 작은 곳에만 (영웅 카드 이름 띠 · 확인 창) */
    /** 빈 보석 점 (각성·초월) */
    /** 각성·초월 보석 점 (FONT_FINAL2 §4): 찬 칸 금 보석 · 빈 칸 어두운 남색 */
    gemOn0: '#ffe9a6',
    gemOn1: '#c99a3b',
    gemOff: '#1d2a4c',
    gemFacet: '#3d5590',
    /** 탭 알약 (FONT_FINAL2 §3): 남색 반투명 · 선택 = 금 그라데이션 */
    pill: 'rgba(20,30,58,0.7)',
    pillOn0: '#f3d27a',
    pillOn1: '#b8862e',
    pillOnInk: '#2a1a08',
    /** 메뉴 화면 배경 위 남색 막 (PLAYTEST §0-3: 흐리게 + 남색 40%) */
    scrNavy: 'rgba(14,22,48,0.4)',
    weakRing: '#ff6a5a',
    /** 순위 메달 금·은·동 · 지도 노드 (지금 갈 곳 파랑) */
    rank1: '#f4c542',
    rank2: '#c9d2de',
    rank3: '#d08a4c',
    nodeNow: '#4fa8ff',
    cream: '#f6ecd6',
    creamInk: '#5b3a1e',
  } as Record<string, string>,
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
    white: '#ffffff',
    fxInk: '#3a2a14',
    gold0: '#fffbe6',
    gold1: '#ffe08a',
    gold3: '#e8a93a',
    gold4: '#b8741a',
    special: '#ff9a3c',
    special2: '#e07a1c',
    scrVeil: 'rgba(10,8,24,0.5)',
    vignette: 'rgba(0,0,0,0.5)',
    cardShade: 'rgba(10,8,24,0.85)',
    panelGrain: 'rgba(255,255,255,0.03)',
  },
  /** 등급 색 (장비·룬·영웅 희귀도) */
  grade: { common: '#c8c8d8', uncommon: '#7ee08a', rare: '#58b8ff', epic: '#c79bff', legend: '#ffb347', ancient: '#ff6a52' },
  /** 속성 색 (스킬 이펙트 · 영웅 상징색 · 데이터는 키로만 부른다) */
  elem: { fire: '#ff6b3d', ice: '#8fe3ff', holy: '#fff3a8', light: '#ffd36b', nature: '#9dffb0', wind: '#8fd0ff', shadow: '#c79bff', steel: '#ffffff', ember: '#ffa040', pink: '#ff8ac8', earth: '#ff7a3d', gold: '#ffe08a', wave: '#5fa8ff', blood: '#ff4a6a', beast: '#c8a060' },
  font: {
    /** 글씨 (모두 OFL · index.html에서 Google Fonts) — T7(10/17) 뒤 FONT_FINAL_1017로 바꿈 */
    /** 글씨 3종 (FONT_FINAL_1017 §1): 본문·버튼·탭 = Noto Serif KR 600 · 제목·이름 = Hahmlet · 숫자 = Cinzel (IBM Plex는 폴백만) */
    base: '"Noto Serif KR", "Hahmlet", "IBM Plex Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", serif',
    title: '"Hahmlet", "Nanum Myeongjo", "IBM Plex Sans KR", serif',
    menu: '"Noto Serif KR", "Hahmlet", "IBM Plex Sans KR", serif',
    hero: '"Hahmlet", "Nanum Myeongjo", "IBM Plex Sans KR", serif',
    /** 전투 피해 숫자 (캔버스 · 타격감) */
    num: '"Luckiest Guy", "Hahmlet", "IBM Plex Sans KR", system-ui, sans-serif',
    /** 메뉴·재화·능력치 숫자 (UI_POLISH §1 · HARMONY §0) — 한글은 Hahmlet */
    numUi: '"Cinzel", "Hahmlet", "IBM Plex Sans KR", system-ui, sans-serif',
    /** 꾸밈 글씨 굵기 */
    face: { title: '900', menu: '600', hero: '700', num: '600' },
    size: { xxs: '8px', xs: '9px', sm: '12px', md: '12px', base: '12px', lg: '14px', xl: '14px', xxl: '17px', h2: '20px', h1: '40px', logo: '54px' },
    weight: { normal: '600', bold: '700', black: '700' },
    /** 캔버스 글자 크기 (px 숫자) */
    canvas: { num: 20, numBig: 26, numCrit: 34, critLabel: 13, cutName: 38, cutHero: 15, stun: 13, tag: 10 },
  },
  space: { xxs: '1px', xs: '2px', sm: '4px', md: '8px', lg: '12px', xl: '18px', xxl: '28px' },
  radius: { sm: '3px', md: '8px', pill: '999px', lg: '12px', cut: '10px 3px 10px 3px', cutSm: '8px 2px 8px 2px', cutLg: '14px 4px 14px 4px', tabR: '0 8px 8px 0' },
  border: { thin: '1px', base: '2px', thick: '3px', stroke: '3px' },
  /** 유리 판 뒤 흐림 */
  fx: { glass: 'blur(6px)', scrBlur: 'blur(6px)' } as Record<string, string>,
  /** UI 키트 그림 테두리 (public/art/ui/kit · docs/ART_UI_1017.md) — [파일, 9-slice(위 오른 아래 왼 · 원본 px), 화면 테두리 두께]
   *  border-image로 그림 (테두리 두께는 그림 칸 안쪽으로 겹쳐 그려서 배치·여백은 그대로) · CSS에서 var(--kit-이름) */
  kit: {
    panel: ['panel_parchment', '70', '14px'],
    navy: ['panel_navy', '40', '14px'],
    /** 유리 판 금테 (가운데 비움 → 반투명 남색이 보임) */
    edge: ['panel_navy', '40', '12px', 'nofill'],
    btn: ['btn_blue', '0 70', '0 12px'],
    gold: ['btn_gold', '0 70', '0 12px'],
    tab: ['tab', '0 50', '0 14px'],
    tabOn: ['tab_on', '0 50', '0 9px'],
    capsule: ['capsule', '0 50', '0 16px'],
    hp: ['bar_hp', '0 50', '0 6px', 'nofill'],
    mp: ['bar_mp', '0 50', '0 6px', 'nofill'],
    'slot-common': ['slot_common', '40', '15px'],
    'slot-uncommon': ['slot_uncommon', '40', '15px'],
    'slot-rare': ['slot_rare', '40', '15px'],
    'slot-epic': ['slot_epic', '40', '15px'],
    'slot-legend': ['slot_legend', '40', '15px'],
  } as Record<string, [string, string, string, string?]>,
  /** UI 키트 통째 그림 (background-image · var(--kimg-이름)) */
  kitImg: { ring: 'skill_ring', hud: 'hud_card', back: 'btn_back', close: 'btn_close' } as Record<string, string>,
  /** 전투 HUD 그림 (public/art/ui/battle · docs/BATTLE_HUD_1017.md) → var(--hud-이름) */
  hudImg: ['auto_off', 'auto_on', 'speed_1', 'speed_2', 'giveup', 'pause', 'hero_auto_off', 'hero_auto_on', 'dps_panel', 'dps_tab', 'wave_banner', 'cd_overlay'],
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
    outline: '-2px -2px 0 #1d2a58, 2px -2px 0 #1d2a58, -2px 2px 0 #1d2a58, 2px 2px 0 #1d2a58, 0 -2px 0 #1d2a58, -2px 0 0 #1d2a58, 2px 0 0 #1d2a58, 0 4px 0 #1d2a58, 0 5px 6px rgba(20,15,0,0.35)',
    outlineSm: '-1px -1px 0 #1d2a58, 1px -1px 0 #1d2a58, -1px 1px 0 #1d2a58, 1px 1px 0 #1d2a58, 0 2px 0 #1d2a58',
    outlineIvory: '-1px -1px 0 #fffaf0, 1px -1px 0 #fffaf0, -1px 1px 0 #fffaf0, 1px 1px 0 #fffaf0, 0 2px 0 rgba(255,250,240,0.9)',
    ringGlow: '0 0 14px rgba(255,210,100,0.7), inset 0 0 40px rgba(255,224,138,0.8)',
    roundIn: '0 0 10px rgba(242,200,106,0.55), inset 0 0 0 40px rgba(20,16,40,0.55)',
    roundInMain: '0 3px 0 #1d5fa8, 0 0 14px rgba(79,179,255,0.45), inset 0 0 0 60px rgba(20,16,40,0.45)',
    fxDrop: '0 2px 0 #3a2a14, 0 0 14px rgba(255,200,90,0.55), 0 4px 8px rgba(30,20,0,0.3)',
    /** 바탕 그림 위 작은 글씨 받침 (어두운 화면) */
    textBack: '0 1px 1px #000000',
    /** 남색 판 위 글씨 그림자 · 제목(크림 + 진갈색 외곽선 + 아래 그림자) (FONT_FINAL §1) */
    navyText: '0 1px 2px rgba(10,16,32,0.8)',
    gemGlow: '0 0 5px rgba(255,214,120,0.85)',
    /** 「승리!」 진갈색 외곽선 2px (FONT_FINAL2 §5) */
    winText: '-2px -2px 0 #3a2410, 2px -2px 0 #3a2410, -2px 2px 0 #3a2410, 2px 2px 0 #3a2410, 0 -2px 0 #3a2410, 0 2px 0 #3a2410, -2px 0 0 #3a2410, 2px 0 0 #3a2410, 0 4px 4px rgba(0,0,0,0.5)',
    titleText: '-1px -1px 0 #3a2410, 1px -1px 0 #3a2410, -1px 1px 0 #3a2410, 1px 1px 0 #3a2410, 0 2px 3px rgba(10,16,32,0.8)',
    /** 흰 글씨 + 금 외곽선 (로비 메달 이름 · HARMONY §1) */
    outlineGold: '-1px -1px 0 #7a4f12, 1px -1px 0 #7a4f12, -1px 1px 0 #7a4f12, 1px 1px 0 #7a4f12, 0 2px 2px rgba(0,0,0,0.45)',
    enhBurst: '0 0 30px rgba(255,210,100,0.95), 0 4px 0 #6a3a00',
  },
  /** 글씨 외곽선 (T3 꾸밈: 굵은 남색 선 + 아래 그림자) — shadow 안에 넣어 두고 밝은/어두운 같이 씀 */
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
    textBack: '-1px -1px 0 #fffaf0, 1px -1px 0 #fffaf0, -1px 1px 0 #fffaf0, 1px 1px 0 #fffaf0, 0 0 4px #fffaf0',
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
    /** 로비 말풍선 */
    sayBg: 'rgba(255,250,240,0.92)',
    sayText: '#1d2a58',
    hitFlash: 'rgba(255,255,255,',
    cutVeil: 'rgba(8,8,24,0.42)',
    cutEdge: '#0d0a20',
    cutLine: 'rgba(255,255,255,0.35)',
    cutBar: 'rgba(255,255,255,0.9)',
    cutStroke: 'rgba(20,10,4,0.95)',
    cutName: '#ffe9a8',
    numStroke: '#4a2a14',
    numCritStroke: '#3a1c08',
    numHealStroke: '#0b3d18',
    numText: '#ffffff',
    numHeal: '#7dff9b',
    numMob: '#ffb0b0',
    /** 치명타 숫자: 흰색 → 금 (BATTLE_HUD §4) · 「치명타」 리본 */
    numCrit: ['#ffffff', '#ffe9a0', '#f4b632'],
    critRibbon: '#a82418',
    /** 레이드 약점 표적 링 · 이름표 글씨 테두리 */
    weakRing: '#ff5a4a',
    tagEdge: 'rgba(10,16,34,0.9)',
    /** DPS 목록 막대 = 직업색 (BATTLE_HUD §3) */
    jobColor: { knight: '#6fa8ff', warrior: '#ff7a4a', fighter: '#ffb03a', assassin: '#c77dff', archer: '#7ddc6a', engineer: '#4fd6c8', mage: '#5a8cff', priest: '#ffe27a', druid: '#9bd65a' } as Record<string, string>,
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
/** 벡터 아이콘 한 벌 (2단계 · 스타일 보드의 선 아이콘 · 글자색을 따라감) — 화면(HTML) 아이콘은 이걸로, 캔버스·title은 iconText(글자) 그대로
 *  [모양 path(24×24), 채움 여부] */
export const ICON_SVG: Record<string, [string, boolean?]> = {
  adventure: ['M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14'],
  content: ['M4 20 16 8l1-4 4-1-1 4-4 1L4 20zM20 20 8 8 7 4 3 3l1 4 4 1 12 12'],
  heroes: ['M9 4a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM2 20c0-3.5 3-6 7-6s7 2.5 7 6M16 4.5a3 3 0 0 1 0 6M18 14c2.5.6 4 2.8 4 5.5'],
  formation: ['M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z'],
  bag: ['M6 8h12l1 13H5zM9 8V6a3 3 0 0 1 6 0v2'],
  recruit: ['M3 11 12 4l9 7v9H3zM9 20v-5h6v5'],
  shop: ['M4 9h16l-1-5H5zM5 9v11h14V9M10 20v-6h4v6'],
  guild: ['M5 3h14v10l-7 8-7-8zM12 7l1.5 3 3 .5-2.2 2 .6 3L12 14l-2.9 1.5.6-3-2.2-2 3-.5z'],
  ranking: ['M8 4h8v5a4 4 0 0 1-8 0zM8 6H4c0 3 2 4 4 4M16 6h4c0 3-2 4-4 4M12 13v4M8 21h8l-1-4H9z'],
  mail: ['M3 6h18v12H3zM3 6l9 7 9-7'],
  mission: ['M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6zM6 3a2 2 0 0 0-2 2v2h2M9 8h7M9 12h7M9 16h4'],
  settings: ['M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1'],
  chat: ['M4 5h16v11H9l-5 4z'],
  back: ['M15 5l-7 7 7 7'],
  next: ['M9 5l7 7-7 7'],
  close: ['M6 6l12 12M18 6 6 18'],
  lock: ['M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3'],
  check: ['M5 12l5 5 9-10'],
  target: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 1v4M12 19v4M1 12h4M19 12h4'],
  cross: ['M6 6l12 12M18 6 6 18'],
  auto: ['M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5'],
  repeat: ['M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5M20 12a8 8 0 0 1-13.7 5.6L4 15M4 20v-5h5'],
  open: ['M6 9l6 6 6-6'],
  fold: ['M6 15l6-6 6 6'],
  skip: ['M5 5l8 7-8 7zM14 5l6 7-6 7'],
  story: ['M4 5c3-1 6-1 8 1 2-2 5-2 8-1v14c-3-1-6-1-8 1-2-2-5-2-8-1zM12 6v14'],
  battle: ['M4 20 16 8l1-4 4-1-1 4-4 1L4 20zM20 20 8 8 7 4 3 3l1 4 4 1 12 12'],
  summon: ['M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5z'],
  craft: ['M14 4l6 6-3 3-6-6zM11 7 3 15l3 3 8-8M3 21h7'],
  booster: ['M12 2c4 3 5 8 3 13H9C7 10 8 5 12 2zM9 15l-3 4h4M15 15l3 4h-4M12 8a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z'],
  offline: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 3'],
  join: ['M12 3l2.5 5.5L20 9l-4 4 1 6-5-3-5 3 1-6-4-4 5.5-.5z'],
  friend: ['M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM16 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM2 20c0-3 2.5-5.5 6-5.5 1.6 0 3 .5 4 1.4 1-.9 2.4-1.4 4-1.4 3.5 0 6 2.5 6 5.5'],
  achieve: ['M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM8.5 14 7 21l5-3 5 3-1.5-7M12 6l1 2.2 2.3.3-1.7 1.6.4 2.3L12 11.3l-2 1.1.4-2.3-1.7-1.6 2.3-.3z'],
  raid: ['M12 3c3 2 6 2 8 1-1 6-3 11-8 16C7 15 5 10 4 4c2 1 5 1 8-1zM9 10l3 3 3-3'],
  coop: ['M12 3c3 2 6 2 8 1-1 6-3 11-8 16C7 15 5 10 4 4c2 1 5 1 8-1zM9 10l3 3 3-3'],
  world: ['M3 20l6-10 3 4 3-6 6 12zM12 4l1 2M16 3l-1 2M8 3l1 2'],
  worldBoss: ['M3 20l6-10 3 4 3-6 6 12zM12 4l1 2M16 3l-1 2M8 3l1 2'],
  tower: ['M8 21V8l4-5 4 5v13zM6 21h12M11 12h2M11 16h2'],
  day: ['M4 6h16v14H4zM4 10h16M8 3v5M16 3v5'],
  arena: ['M3 9h18M5 9v10M19 9v10M9 9v10M15 9v10M3 19h18M4 9l8-5 8 5'],
  guildRaid: ['M5 3h14v10l-7 8-7-8zM9 9l3 3 3-3'],
  weapon: ['M4 20 16 8l1-4 4-1-1 4-4 1L4 20zm0-4 4 4'],
  armor: ['M12 2 20 5v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z'],
  acc: ['M12 8a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM9 3h6l-3 5z'],
  zone_front: ['M12 2 20 5v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z', true],
  zone_mid: ['M12 2l3 10-3 10-3-10z', true],
  zone_back: ['M5 3c8 3 8 15 0 18M5 3v18M3 12h16l-3-3m3 3-3 3'],
  knight: ['M12 2 20 5v7c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V5z', true],
  warrior: ['M4 20 16 8l1-4 4-1-1 4-4 1L4 20zm0-4 4 4'],
  fighter: ['M6 10V6a2 2 0 0 1 4 0v3-4a2 2 0 0 1 4 0v4-3a2 2 0 0 1 4 0v8c0 4-3 7-7 7s-7-3-7-7v-3a2 2 0 0 1 2-1z'],
  assassin: ['M12 2l3 10-3 10-3-10zM7 12h10'],
  archer: ['M5 3c8 3 8 15 0 18M5 3v18M3 12h16l-3-3m3 3-3 3'],
  engineer: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-1-6h2l1 3 3-1 1 2-2 2 1 3h-2l-1 3h-2l-1-3H7l1-3-2-2 1-2 3 1z'],
  mage: ['M12 2l2 5 5 .5-4 3.5 1.5 5L12 13l-4.5 3 1.5-5-4-3.5L10 7zM12 13v9'],
  priest: ['M10 2h4v6h6v4h-6v10h-4V12H4V8h6z', true],
  druid: ['M12 22V10m0 0C7 10 4 7 4 2c5 0 8 3 8 8zm0 4c5 0 8-3 8-8-5 0-8 3-8 8z'],
  chest: ['M3 9h18v11H3zM3 9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4M11 12h2v3h-2z'],
  warn: ['M12 3 22 20H2zM12 9v5M12 17v.5'],
  sparkle: ['M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z', true],
  guildCoin: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 8h8v4l-4 4-4-4z'],
  arenaCoin: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8 16l8-8M8 8l8 8'],
  towerCoin: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM10 17V9l2-3 2 3v8'],
  tierMat: ['M12 2 20 8 12 22 4 8zM4 8h16M12 2v20'],
  exShard: ['M4 20 16 8l1-4 4-1-1 4-4 1L4 20zM14 4l2 2'],
  treasureShard: ['M7 4h10l-2 5 3 11H6l3-11z'],
  token: ['M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4z'],
  bossMat: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9 10h.5M14.5 10h.5M9 15c2 1 4 1 6 0'],
  rotate: ['M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5'],
  sweep: ['M4 12a8 8 0 0 1 13.7-5.6L20 9M20 4v5h-5'],
};
/** 그림 아이콘 (재화·재료 · public/art/items/<이름>.png · docs/ART_DONE_1017_2.md) — 있으면 글자 아이콘 대신 */
/** 그림 아이콘 (public/art/ui/… · HARMONY §1) — 있으면 이것 먼저 */
export const ICON_UI: Record<string, string> = {
  stamina: 'icons/stamina', gold: 'icons/gold', stardust: 'icons/stardust', lock: 'icons/lock', power: 'icons/power', plusArt: 'icons/plus',
  hp: 'icons/hp', atk: 'icons/atk', def: 'icons/def', crit: 'icons/crit', critDmg: 'icons/critdmg', spd: 'icons/speed', mana: 'icons/mana', levelup: 'icons/levelup',
  arenaCoin: 'menu/arena', towerCoin: 'menu/tower',
  mail: 'menu/mail', chat: 'menu/chat', heroes: 'menu/heroes', formation: 'menu/formation', content: 'menu/content', bag: 'menu/bag', mission: 'menu/mission', achieve: 'menu/achieve',
  friend: 'menu/friend', shop: 'menu/shop', guild: 'menu/guild', ranking: 'menu/ranking', settings: 'menu/settings', world: 'menu/worldboss', raid: 'menu/raid', adventure: 'menu/adventure',
};
export const ICON_IMG: Record<string, string> = { gold: 'm_gold', stardust: 'm_stardust', enh: 'm_enh', awakenStone: 'm_awaken', transStone: 'm_trans', exp: 'm_exp', skillBook: 'm_skillbook', optTicket: 'm_reroll', stamina: 'm_stamina', summon: 'm_summon' };
export function icon(key: string, cls = 'ic'): string {
  if (ICON_UI[key]) return `<img class="${cls} img ui" src="${import.meta.env.BASE_URL}art/ui/${ICON_UI[key]}.png" alt="">`;
  if (ICON_IMG[key]) return `<img class="${cls} img" src="${import.meta.env.BASE_URL}art/items/${ICON_IMG[key]}.png" alt="">`;
  const sv = ICON_SVG[key];
  if (sv) return `<svg class="${cls} svg" viewBox="0 0 24 24" aria-hidden="true"><path d="${sv[0]}" fill="${sv[1] ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  const v = T.icon[key] ?? '·';
  return /\.(png|svg|webp)$/.test(v) ? `<img class="${cls}" src="${v}" alt="">` : `<span class="${cls}">${v}</span>`;
}
/** 아이콘 글자 (캔버스·title 속성용) */
export const iconText = (key: string) => T.icon[key] ?? '·';
export const gradeColor = (g: keyof typeof T.grade) => T.grade[g];
export const elemColor = (e: string) => (T.elem as Record<string, string>)[e] ?? T.color.text;
/** 캔버스 글꼴 문자열 */
export const canvasFont = (px: number, weight: keyof typeof T.font.weight = 'black', num = true) => (num ? canvasFace(px, 'num') : `${T.font.weight[weight]} ${px}px ${T.font.base}`);
/** 캔버스 꾸밈 글씨 (제목·메뉴·영웅 이름·숫자 — 굵기 하나짜리 글씨라 굵기 안 줌) */
export const canvasFace = (px: number, face: 'title' | 'menu' | 'hero' | 'num') => `${T.font.face[face]} ${px}px ${T.font[face]}`;

/** :root 에 CSS 변수로 쓰기 — 화면의 모든 색·크기는 여기서 */
export type Mode = 'light' | 'dark' | 'glass';
let mode: Mode | null = null;
export function applyTheme(m: Mode = 'glass', root: HTMLElement = document.documentElement) {
  if (m === mode && root === document.documentElement) return;
  mode = m;
  root.dataset.theme = m;
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  for (const [k, v] of Object.entries(m === 'light' ? T.color : m === 'dark' ? T.colorDark : { ...T.colorDark, ...T.colorGlass })) set(`--c-${k}`, v);
  for (const [k, v] of Object.entries(T.grade)) set(`--g-${k}`, v);
  for (const [k, v] of Object.entries(T.elem)) set(`--e-${k}`, v);
  set('--f-base', T.font.base);
  set('--f-num', T.font.numUi);
  set('--f-title', T.font.title);
  set('--f-menu', T.font.menu);
  set('--f-hero', T.font.hero);
  for (const [k, v] of Object.entries(T.font.face)) set(`--fw-${k}`, v);
  for (const [k, v] of Object.entries(T.font.size)) set(`--fs-${k}`, v);
  for (const [k, v] of Object.entries(T.font.weight)) set(`--fw-${k}`, v);
  for (const [k, v] of Object.entries(T.space)) set(`--s-${k}`, v);
  for (const [k, v] of Object.entries(T.radius)) set(`--r-${k}`, v);
  for (const [k, v] of Object.entries(T.border)) set(`--b-${k}`, v);
  for (const [k, v] of Object.entries(T.fx)) set(`--fx-${k}`, v);
  const kit = (f: string) => `url("${new URL(`${import.meta.env.BASE_URL}art/ui/kit/${f}.png`, location.href).href}")`;
  for (const [k, [f, slice, w, nofill]] of Object.entries(T.kit)) set(`--kit-${k}`, `${kit(f)} ${slice}${nofill ? '' : ' fill'} / ${w} / 0 stretch`);
  for (const [k, f] of Object.entries(T.kitImg)) set(`--kimg-${k}`, kit(f));
  for (const f of T.hudImg) set(`--hud-${f.replace(/_/g, '-')}`, `url("${new URL(`${import.meta.env.BASE_URL}art/ui/battle/${f}.png`, location.href).href}")`);
  for (const [k, v] of Object.entries(T.shadow)) set(`--sh-${k}`, m === 'light' ? (T.shadowLight[k] ?? v) : v);
}
