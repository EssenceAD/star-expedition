// 지도로 돌아오면 알림 카드가 차례로 (RECOVER_1018 S4 · 영상 sheet_05 v2_017~020): 위 가운데 · 하나씩 noticeSec초 · 누르면 넘김
//  전투 결과에서 쌓고(pushNotice) 메인 지도에 들어올 때 보여 줌(playNotices) · 장 개방은 큰 띠
import { CONFIG } from '../config';
import { icon } from '../theme/tokens';
import { $, esc } from './core';

export interface Notice {
  /** 위 작은 글 (예: 스토리 · 이정표 달성) */
  head: string;
  /** 큰 글 */
  text: string;
  kind?: 'card' | 'chapter';
  ic?: string;
}
const queue: Notice[] = [];
export const pushNotice = (n: Notice) => queue.push(n);
let playing = false;
export function playNotices() {
  if (playing || !queue.length) return;
  // 창(방치 보상·출석·이정표)이 떠 있으면 닫힌 뒤에
  if (document.querySelector('#stage > .modal')) return void setTimeout(playNotices, CONFIG.ui.noticeWaitMs);
  playing = true;
  const el = document.createElement('div');
  $('#stage').append(el);
  let t = 0;
  const next = () => {
    clearTimeout(t);
    const n = queue.shift();
    if (!n) {
      el.remove();
      playing = false;
      return;
    }
    el.className = `notice ${n.kind ?? 'card'}`;
    el.innerHTML = n.kind === 'chapter' ? `<b>${esc(n.text)}</b><span>${esc(n.head)}</span>` : `${icon(n.ic ?? 'star')}<div class="col"><span>${esc(n.head)}</span><b>${esc(n.text)}</b></div>`;
    t = window.setTimeout(next, CONFIG.ui.noticeSec * (n.kind === 'chapter' ? 1.6 : 1) * 1000);
  };
  el.onclick = next;
  next();
}
