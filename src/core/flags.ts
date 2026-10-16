// 「용사님, 체크인하실게요~」 src/world/flags.ts 에서 복사해 온 모듈 (별의 원정대용으로 import만 고침)
// FASTSHIP: 원격 끄기 스위치 — public/flags.json을 부팅 때 한 번 읽는다 (실패하면 기본값 = 켬).
//  새 기능마다 플래그 하나. 문제가 생기면 json 한 줄 바꿔 배포(T0)로 끈다.
export const FLAG_DEFAULTS = {
  /** 스킬 컷인 (3번 스킬·손으로 누른 스킬 · 일러스트/초상화가 0.6초 가로지름) */
  cutIn: true,
};
export type FlagKey = keyof typeof FLAG_DEFAULTS;
const flags: Record<string, boolean> = { ...FLAG_DEFAULTS };
export const flag = (k: FlagKey): boolean => flags[k] !== false;
/**
 * HARVEST §1-1: 서버 시각 — flags.json 응답의 Date 머리(서비스워커를 거치지 않는 요청)로 기기 시계와의 차이를 잰다.
 *  2분 넘게 다를 때만 쓴다 (Date는 초 단위 · 오프라인이면 0 = 기기 시계)
 */
export let serverSkew = 0;
/**
 * RAIDWEAPON §6 버닝: 서버 시각 기준점 — Date 머리를 받은 순간의 { 서버 시각 · performance.now() · 기기 시계 }.
 *  performance.now()는 기기 시계를 바꿔도 안 움직이므로 「기준점 + 지난 시간」은 시계 조작에 안 흔들린다.
 *  (잠자기 동안 performance.now()가 멈추는 브라우저도 있어서 world/burn.ts는 기기 시계 쪽 추정과 둘 다 기간 안일 때만 켠다)
 */
export interface ServerAnchor {
  server: number;
  perf: number;
  wall: number;
}
let anchor: ServerAnchor | null = null;
export const serverAnchor = (): ServerAnchor | null => anchor;
/** 시험용: 서버 기준점을 직접 (null = 못 받음) */
export const setServerAnchor = (a: ServerAnchor | null) => (anchor = a);
const perfNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
export function noteServerDate(h: string | null | undefined, now = Date.now(), perf = perfNow()) {
  const t = h ? Date.parse(h) : NaN;
  if (!Number.isFinite(t)) return;
  const d = t - now;
  serverSkew = Math.abs(d) > 120000 ? d : 0;
  anchor = { server: t, perf, wall: now };
}
/** 부팅 때 한 번 (2초 안에 못 받으면 기본값) */
export async function loadFlags(base = import.meta.env.BASE_URL): Promise<void> {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2000);
    const r = await fetch(`${base}flags.json?t=${Date.now()}`, { cache: 'no-store', signal: ctl.signal });
    clearTimeout(t);
    noteServerDate(r.headers.get('date'));
    if (!r.ok) return;
    const j = (await r.json()) as Record<string, unknown>;
    for (const [k, v] of Object.entries(j)) if (typeof v === 'boolean') flags[k] = v;
  } catch {
    /* 기본값 */
  }
}
/** 시험용 */
export const setFlag = (k: FlagKey, v: boolean) => (flags[k] = v);
