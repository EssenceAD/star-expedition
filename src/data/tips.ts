// 전투 전 로딩 화면 한 줄 팁 (RECOVER_1018 S3 · 킹스레이드 영상 sheet_00 v1_013) — 게임에 실제로 있는 규칙만 (숫자는 CONFIG에서)
import { CONFIG } from '../config';

export const TIPS: string[] = [
  `별 ${CONFIG.repeat.minStars}개로 깬 스테이지는 소탕으로 바로 끝낼 수 있어요.`,
  `부스터를 켜면 ${Math.round(CONFIG.booster.sec / 60)}분 동안 전리품이 ${CONFIG.booster.mult}배예요.`,
  `게임을 꺼 두어도 원정대는 사냥해요. 방치 보상은 최대 ${CONFIG.offline.maxHours}시간까지 쌓여요.`,
  `행동력은 ${Math.round(CONFIG.stamina.regenSec / 60)}분마다 1씩 차요. 원정대 레벨이 오르면 가득 차요.`,
  '편성에서 전방·중앙·후방 탭으로 자리별 영웅을 골라 볼 수 있어요.',
  '함께 편성하면 힘이 세지는 인연이 있어요. 켜진 인연은 팀 레벨 띠 아래에 보여요.',
  '보스가 내려찍기를 예고하면 잠깐 버티세요. 치유 영웅이 있으면 든든해요.',
  '보스가 포효하면 스킬이 잠깐 막혀요. 포효 전에 스킬을 써 두세요.',
  '장을 깨면 그 지역 전설 영웅이 원정대에 합류해요.',
];
