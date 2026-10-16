// 협공 컷인 (보스 전장 그로기 → 다운): 가장 많이 때린 두 영웅 조합별 전용 컷인 자리
//  art = public/art/combo/<그림>.png (아직 없음 → 두 영웅 초상화를 양쪽에서 맞붙임) · 대사는 자리표시자 (멤버 대사는 받아서 바꾸기)
export interface Combo {
  /** 두 영웅 id (순서 상관없음) */
  pair: [string, string];
  name: string;
  line: string;
  art?: string;
}
export const COMBOS: Combo[] = [
  { pair: ['woongs', 'gonu'], name: '남쪽 항구 합동 무대', line: '막내야, 지금이다이!' },
  { pair: ['woongs', 'walwal'], name: '응급 돌격', line: '다치믄 바로 고쳐 줄게, 가라!' },
  { pair: ['ikamolly', 'kkangto'], name: '마법 학교 합동 마법', line: '바람에 맞춰서, 깡!' },
  { pair: ['hwang', 'kleine'], name: '오래된 지도의 약속', line: '이 길, 같이 끝내죠.' },
  { pair: ['bube', 'panda'], name: '형님들의 일격', line: '끝나고 한잔은 내가 쏘지.' },
  { pair: ['haeung', 'yuwol'], name: '젊은 피 연계', line: '막을게! 공략 부탁해!' },
  { pair: ['panda', 'yeonhwa'], name: '사제 합격', line: '사부님, 같이 가요!' },
  { pair: ['hwang', 'moss'], name: '숲의 분노', line: '천천히, 그러나 단단히.' },
  { pair: ['leon', 'ceres'], name: '왕국 기사단 돌격', line: '기사단, 앞으로!' },
  { pair: ['vael', 'nyx'], name: '그림자 이중주', line: '…이번엔 같은 편이다.' },
  { pair: ['warmnight', 'ikamolly'], name: '등불과 바람', line: '길을 밝힐게, 바람을 실어 줘.' },
  // 멤버 영웅 관계 (HEROES_ADD_4)
  { pair: ['jaehi', 'warmnight'], name: '막역한 친구의 합', line: '밤아, 지금이다아~! …진짜로!' },
  { pair: ['mochi', 'kkangto'], name: '멍멍 대폭발', line: '딸기·망고·모찌, 깡토끼 누나랑 간다!' },
  { pair: ['sermi', 'shinya'], name: '사제 합동기 「별의 궤적」', line: '지금. 네 화살이 정답이야.' },
];
export const comboOf = (a: string, b: string): Combo => COMBOS.find((c) => c.pair.includes(a) && c.pair.includes(b) && a !== b) ?? { pair: [a, b], name: '협공', line: '지금이야, 같이!' };
