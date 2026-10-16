// 인연 조합 (STAR_EXPEDITION_SPEC §4) — 같은 파티에 need명 이상이면 효과 + 전투 시작 대사
//  신야군 「독자노선」은 패시브(solo) · 따뜻한밤 길잡이(숨은 상자)는 보상(CONFIG.reward.chest)
export interface BondDef {
  id: string;
  name: string;
  members: string[];
  /** 몇 명 이상 모이면 켜지나 */
  need: number;
  /** 파티 전체 효과 */
  eff: { s: 'spd' | 'dmgCut' | 'mana' | 'skillDmg' | 'atk' | 'heal' | 'crit'; v: number };
  /** 첫 웨이브 걷기 시간 줄이기 (오래된 지도: 이동속도↑) */
  walkCut?: number;
  /** 켜질 때 대사 [영웅 id, 말] (삼총사 사투리 대사는 오픈 뒤 본인들이 고친다) */
  lines: [string, string][];
}
export const BONDS: BondDef[] = [
  {
    id: 'port3', name: '남쪽 항구 삼총사', members: ['woongs', 'gonu', 'walwal'], need: 3, eff: { s: 'spd', v: 0.15 },
    lines: [['gonu', '야야, 막내야 앞에 서라이~'], ['woongs', '누나들 뒤에 딱 붙어 있으면 된다 아이가!'], ['walwal', '다치믄 내한테 바로 온나. 알았제?']],
  },
  { id: 'elders', name: '형님들의 술자리', members: ['bube', 'panda'], need: 2, eff: { s: 'dmgCut', v: 0.12 }, lines: [['bube', '끝나고 한잔 어때, 팬더.'], ['panda', '형님이 쏘시는 거죠? 허허.']] },
  { id: 'young', name: '젊은 피', members: ['haeung', 'yuwol'], need: 2, eff: { s: 'mana', v: 0.25 }, lines: [['haeung', '내가 앞을 막을게!'], ['yuwol', '오케이, 공략은 나한테 맡겨.']] },
  { id: 'school', name: '마법 학교 단짝', members: ['kkangto', 'ikamolly'], need: 2, eff: { s: 'skillDmg', v: 0.12 }, lines: [['kkangto', '몰리야, 번갈아 간다!'], ['ikamolly', '바람이 불 때 맞춰서 깡!']] },
  { id: 'oldmap', name: '오래된 지도', members: ['hwang', 'kleine'], need: 2, eff: { s: 'atk', v: 0.06 }, walkCut: 0.5, lines: [['kleine', '이 길… 예전에 같이 걸었던가요?'], ['hwang', '글쎄요, 사장님은 기억이 잘 안 나네.']] },
  { id: 'mentorH', name: '숲의 사제지간', members: ['hwang', 'moss'], need: 2, eff: { s: 'heal', v: 0.15 }, lines: [['moss', '짐승아, 또 서두르는구나.'], ['hwang', '스승님 앞에선 천천히 갈게요.']] },
  { id: 'mentorP', name: '대나무 숲 사제지간', members: ['panda', 'yeonhwa'], need: 2, eff: { s: 'crit', v: 0.08 }, lines: [['yeonhwa', '사부님, 오늘은 제가 먼저!'], ['panda', '허허, 호리병은 내가 들고 있으마.']] },
  { id: 'exCult', name: '교단을 떠난 셋', members: ['vael', 'nyx', 'veronica'], need: 2, eff: { s: 'atk', v: 0.1 }, lines: [['nyx', '옛 동료끼리 또 만나네.'], ['vael', '…이번엔 같은 편이다.'], ['veronica', '용서는 싸움이 끝난 뒤에.']] },
  { id: 'royal', name: '왕국 기사단', members: ['leon', 'ceres', 'elysia'], need: 2, eff: { s: 'dmgCut', v: 0.1 }, lines: [['leon', '기사단, 대열을 갖춰라!'], ['ceres', '네, 넷! 전하!'], ['elysia', '흥, 명령 안 하셔도 압니다.']] },
];
/** 파티(영웅 id 목록)에서 켜진 인연 */
export const activeBonds = (ids: string[]) => BONDS.filter((b) => b.members.filter((m) => ids.includes(m)).length >= b.need);
