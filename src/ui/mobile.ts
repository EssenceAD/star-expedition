// 모바일 (docs/MOBILE_REF_1017.md §1): 안드로이드 첫 터치에 전체 화면 + 가로 잠금 · 홈 화면에 추가 안내 띠(처음 한 번)
//  안 되는 기기(아이폰 등)는 조용히 넘어가고 fitView의 「돌려 그리기」 그대로
import { getPref, setPref } from '../core/save';
import { icon } from '../theme/tokens';

const touch = () => matchMedia('(pointer: coarse)').matches;
/** 홈 화면 아이콘으로 실행 중 (주소창 없음) */
export const standalone = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;

/** 터치 핸들러 안에서 바로 부를 것 (브라우저가 사용자 동작 안에서만 허락) · 설정 「전체 화면」이 꺼져 있으면 안 함 */
export function goFullscreen() {
  if (!touch() || !getPref('fullscreen', true) || document.fullscreenElement || standalone()) return;
  const el = document.documentElement;
  if (!el.requestFullscreen) return;
  el.requestFullscreen({ navigationUI: 'hide' })
    .then(() => (screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }).lock?.('landscape'))
    .catch(() => {});
}

/** 「홈 화면에 추가하면 전체 화면으로 즐길 수 있어요」 · 닫으면 다시 안 뜸 */
export function a2hsBanner(root: HTMLElement) {
  if (!touch() || standalone() || getPref('a2hsSeen', false)) return;
  const b = document.createElement('div');
  b.className = 'a2hs';
  b.innerHTML = `<span>홈 화면에 추가하면 전체 화면으로 즐길 수 있어요</span><button data-x title="닫기">${icon('close')}</button>`;
  b.querySelector<HTMLElement>('[data-x]')!.onclick = (e) => {
    e.stopPropagation();
    setPref('a2hsSeen', true);
    b.remove();
  };
  root.append(b);
}
