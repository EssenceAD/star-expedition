// 영웅 카드 한 줄 소개 (형철 10/17 · 카드 정보 띠용 · 15자 안팎) — 상점·영웅 목록·편성 카드의 설명 줄은 이걸 씀
// 긴 소개(concept)는 영웅 정보·영입 화면에서 그대로 사용
export const TAGLINE: Record<string, string> = {
  // 개척자
  woongs: '대검 하나로 앞장서는 막내',
  gonu: '노래하며 베는 무대의 주연',
  ikamolly: '바람개비를 든 첫 번째 바람',
  walwal: '밤길을 지키는 응급 사제',
  warmnight: '등불로 길을 여는 궁수',
  // 추가 멤버
  sermi: '모두가 묻는 별의 계산가',
  kleine: '길드를 이끄는 별의 마녀',
  panda: '술 한 병, 주먹 한 방',
  bube: '황금 갑주의 큰형님',
  haeung: '맨 앞에 서는 젊은 방패',
  ichae: '대신 맞아 주는 의리의 꽃',
  jaehi: '재희를 위해 싸우는 아빠',
  yuwol: '드론을 부리는 키다리',
  kkangto: '망치 지팡이의 폭발 토끼',
  mochi: '정령견 셋과 함께하는 주인',
  shinya: '말없이 꿰뚫는 저격수',
  // 나
  hwang: '짐승이 되는 여관 주인',
  // 오리지널
  elysia: '칭찬에 약한 은빛 기사',
  ceres: '수줍은 왕실 기사',
  leon: '황금 갈기의 사자왕',
  grom: '도끼 하나면 충분한 대전사',
  vael: '교단을 등진 어둠의 검사',
  ryuka: '작은 뿔의 용족 전사',
  jin: '바람 따라 떠도는 검객',
  nyx: '교단에서 온 그림자',
  luna: '장난꾸러기 은늑대',
  sylas: '숲을 지키는 엘프 사수',
  vivian: '대포를 사랑하는 선장',
  scarlet: '홍염을 다루는 마녀',
  momo2: '모자가 더 큰 꼬마 대마법사',
  aria: '꽃을 피우는 성녀',
  ayla: '류트로 치유하는 사제',
  veronica: '어둠으로 치유하는 수녀',
  moss: '황짐승의 스승, 숲의 할머니',
  yeonhwa: '팬더의 씩씩한 제자',
  noel: '꺼진 별의 마지막 왕녀',
};
export const taglineOf = (id: string, fallback = '') => TAGLINE[id] ?? fallback;
