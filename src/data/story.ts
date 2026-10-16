// 스토리 10장 (ROADMAP §3 · SPEC §1) — 1~3장은 실제 대사·웨이브, 4~10장은 몬스터 수치만 있는 자리표시자
//  대사: [말하는 사람, 글] · 말하는 사람 = 영웅 id 또는 'narr'(해설) · 'cult'(교단원) · 'boss'(그 장 보스)
export type Line = [string, string];
export interface ChapterDef {
  n: number;
  /** 「체크인」 사냥 지역 */
  region: string;
  name: string;
  /** 1~10 스테이지 웨이브 (s 슬라임 · g 고블린 · w 늑대 · B 보스 · | 웨이브 구분) — 없으면 자동 */
  waves?: string[];
  /** 대사: 장 시작(1-1 전) · 보스 전(x-10 전) · 장 클리어 */
  intro?: Line[];
  preBoss?: Line[];
  clear?: Line[];
  /** 장 클리어로 되찾는 별 이름 */
  star: string;
}

/** 첫 진입 프롤로그 (STAR_PLAN_v2 §1-1: 5장 이내 · 1-1 필드에 파티가 선 채로 · 끝나면 바로 1-1 전투) */
export const PROLOGUE: Line[] = [
  ['narr', '밤하늘의 별이 하나씩 꺼지고 있다. 옛날 「다섯 별」이 봉인한 「별을 삼킨 것」이 깨어나려 한다.'],
  ['woongs', '별이 또 하나 꺼졌다꼬? …가만히 있을 수는 없제.'],
  ['ikamolly', '숲 동굴 쪽에서 별 냄새가 나요. 균열이 열렸어요!'],
  ['gonu', '그럼 무대로 가 볼까? 막내야, 앞에 서라이~'],
  ['walwal', '다치믄 내한테 바로 온나. 원정대, 출발!'],
];

export const CHAPTERS: ChapterDef[] = [
  {
    n: 1, region: 'forest', name: '숲 동굴', star: '첫째 별 「이끼등」',
    waves: ['ss|sss', 'sss|gs', 'gs|sgs', 'ssg|gg', 'gsg|sgs|gg', 'ww|gs', 'wsg|gw', 'gwg|wsw', 'wgw|gwg|ww', 'gsg|B'],
    intro: [
      ['warmnight', '숲 동굴 입구야. 균열 빛이 여기까지 새어 나와.'],
      ['woongs', '슬라임들이 왜 이렇게 성이 났노?'],
      ['ikamolly', '균열 기운에 취한 것 같아요. 조심해요!'],
    ],
    preBoss: [
      ['boss', '……쿠웅.'],
      ['warmnight', '저 골렘, 눈이 호박색으로 빛나. 별빛을 삼킨 거야.'],
      ['walwal', '내려찍기 예고가 보이믄 버텨라. 내가 바로 치료한다.'],
    ],
    clear: [
      ['narr', '골렘의 호박눈이 깨지며 작은 별빛이 하늘로 올라갔다. 첫째 별이 다시 켜졌다.'],
      ['luna', '킁킁… 여기서 별 냄새가 제일 많이 나! 나도 같이 갈래!'],
      ['narr', '은늑대 루나가 원정대에 합류했다!'],
    ],
  },
  {
    n: 2, region: 'swamp', name: '버섯 늪', star: '둘째 별 「포자등」',
    waves: ['ss|gs', 'sgs|gg', 'gg|sgs', 'ww|sgs', 'gwg|ss|gg', 'wsw|gg', 'gwg|wgw', 'wgw|gsg|ww', 'gwgw|wgw', 'wgw|B'],
    intro: [
      ['ikamolly', '늪 안개에 포자가 섞여 있어요. 숨 조심!'],
      ['cult', '……별은 꺼져야 한다. 원정대 따위가 막을 수 없어.'],
      ['woongs', '교단 놈들이 여기까지 와 있었나!'],
    ],
    preBoss: [
      ['cult', '곰팡이왕이시여, 저 별빛 도둑들을 삼키소서!'],
      ['walwal', '포효 들리믄 스킬이 잠깐 막힌다. 그 전에 써라!'],
    ],
    clear: [
      ['narr', '늪 위로 둘째 별이 떠올랐다. 안개가 걷히고 개구리 울음이 돌아왔다.'],
      ['aria', '…따뜻한 빛이네요. 다친 분들이 많아요. 언젠가 여관에서 다시 만나요.'],
      ['narr', '성녀 아리아를 만났다. (영웅 상점에서 맞이할 수 있어요)'],
    ],
  },
  {
    n: 3, region: 'mine', name: '폐광', star: '셋째 별 「광부등」',
    waves: ['gg|wg', 'gwg|gg', 'wgw|ww', 'gggg|wgw', 'wgw|gwg|ww', 'wwg|gww', 'gwgw|wgwg', 'wgwg|gwgw|ww', 'wwww|gwgw|wgw', 'wgwg|B'],
    intro: [
      ['warmnight', '폐광은 길이 갈라져. 지도 끝까지 가 본 사람은 없대.'],
      ['woongs', '광석이 녹슬어서 붉게 빛나네. 강화 재료로 딱인데!'],
      ['ikamolly', '웅스, 지금은 별이 먼저예요!'],
    ],
    preBoss: [
      ['boss', '…녹…슨…심장…'],
      ['walwal', '지진 오면 앞줄이 묶인다. 앞줄은 체력 잘 챙기라.'],
    ],
    clear: [
      ['narr', '녹슨 심장이 멈추자 갱도 천장 틈으로 셋째 별이 보였다.'],
      ['grom', '하하! 이 골렘을 쓰러뜨린 게 너희냐! 술 한 잔 사면 다음엔 도와주지!'],
      ['narr', '대전사 그롬을 만났다. (영웅 상점에서 맞이할 수 있어요)'],
      ['narr', '— 1단계 스토리는 여기까지. 4장부터는 몬스터만 있는 자리표시자예요.'],
    ],
  },
  { n: 4, region: 'ice', name: '얼음 협곡', star: '넷째 별' },
  { n: 5, region: 'abyss', name: '별의 심연', star: '다섯째 별' },
  { n: 6, region: 'coast', name: '가라앉은 등대 해안', star: '여섯째 별' },
  { n: 7, region: 'dune', name: '모래시계 유적', star: '일곱째 별' },
  { n: 8, region: 'ember', name: '잿불 화산', star: '여덟째 별' },
  { n: 9, region: 'sky', name: '구름 정원', star: '아홉째 별' },
  { n: 10, region: 'deep', name: '심연의 바닥', star: '마지막 별' },
];
/** 대사의 말하는 사람 이름 (영웅이 아닌 경우) */
/** 영웅이 아닌 말하는 사람 (외전: 재희 · 정령견 셋) */
export const SPEAKER: Record<string, string> = { narr: '', cult: '교단원', boss: '', kid: '재희', dogs: '딸기·망고·모찌' };
