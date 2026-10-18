// 운영 기능 (「체크인」에서 안정화에 꼭 필요했던 것들을 가져옴 · 형철 10/18)
//  ① 제보·건의 편지 (bug_letters · 로그인이면 답장 → 우편함 「운영자의 답장」) ② 새 버전 알림 띠 → 눌러서 업데이트
//  ③ 업데이트 뒤 첫 화면 패치노트 카드 ④ 잡히지 않은 오류 서버 기록 ⑤ 하루 한 번 세이브 백업 3개 + 설정에서 되살리기
import { logEvents, markRepliesRead, myReplies, sendLetter, who, type ReplyRow } from '../core/net/cloud';
import { getPref, setPref } from '../core/save';
import { addMail } from '../game/social';
import { dayKey, migrate, persist, S, setSave } from '../game/state';
import { icon } from '../theme/tokens';
import { $, currentScreen, esc, go, modal, toast } from './core';

// ───────── ① 제보·건의 ─────────
const KINDS = ['버그 제보', '개선 건의', '칭찬'];
const GUEST_DAY_MAX = 3;
const guestSent = () => {
  const g = getPref<{ d: string; n: number }>('guestLetters', { d: '', n: 0 });
  return g.d === dayKey() ? g.n : 0;
};
export async function openReport() {
  const w = await who();
  const guest = !w || w.guest;
  const m = modal(
    `${icon('mail')} 제보·건의`,
    `<p class="sm dim">버그나 아쉬운 점, 이런 게 있으면 좋겠다 싶은 걸 남겨 주세요. 운영자가 직접 읽어요.</p>
    <div class="col rep"><label class="sm">종류 <select class="rk">${KINDS.map((k) => `<option>${k}</option>`).join('')}</select></label>
    <textarea class="rt" rows="4" maxlength="300" placeholder="예) 2-5에서 보스가 화면 밖으로 나가요"></textarea><small class="xs dim rn">0/300 · 지금 버전 v${__APP_VERSION__}과 화면 크기가 같이 가요</small></div>
    ${guest ? '<p class="xs mute">로그인하면 답장이 우편함으로 와요 (설정의 계정 칸) · 손님은 하루 3통까지</p>' : '<p class="xs mute">답장은 우편함 「운영자의 답장」으로 와요</p>'}
    ${myLetters().length ? `<b class="sm">보낸 편지</b>${myLetters().slice(0, 5).map((l) => `<div class="xs dim">· [${esc(l.kind)}] ${esc([...l.text].slice(0, 30).join(''))} <span class="mute">${new Date(l.at).toLocaleDateString('ko-KR')}</span></div>`).join('')}` : ''}`,
    [
      ['닫기', null],
      ['보내기', () => {
        const text = m.querySelector<HTMLTextAreaElement>('.rt')!.value.replace(/\s+/g, ' ').trim();
        const kind = m.querySelector<HTMLSelectElement>('.rk')!.value;
        if (!text) return (toast('내용을 적어 주세요'), false);
        if (guest && guestSent() >= GUEST_DAY_MAX) return (toast(`오늘은 편지를 ${GUEST_DAY_MAX}통 다 보냈어요 · 내일 또 써 주세요`), false);
        void sendLetter(kind, text, __APP_VERSION__).then((r) => {
          if (r === 'ok') {
            setPref('letters', [{ kind, text, at: Date.now() }, ...myLetters()].slice(0, 30));
            if (guest) setPref('guestLetters', { d: dayKey(), n: guestSent() + 1 });
            toast(guest ? '편지 잘 받았어요! 운영자가 꼭 읽어 볼게요' : '편지 잘 받았어요! 답장은 우편함으로 보내 드릴게요');
          } else if (r === 'limit') toast('오늘 손님 편지를 다 썼어요 · 로그인하면 더 보낼 수 있어요');
          else if (r === 'nosrv') toast('손님 편지는 아직 준비 중이에요 · 로그인 뒤 보내 주세요');
          else toast('배달에 실패했어요 · 잠시 뒤 다시 보내 주세요');
        });
      }, true],
    ],
  );
  const t = m.querySelector<HTMLTextAreaElement>('.rt')!;
  t.oninput = () => (m.querySelector('.rn')!.textContent = `${[...t.value].length}/300 · 지금 버전 v${__APP_VERSION__}과 화면 크기가 같이 가요`);
}
const myLetters = () => getPref<{ kind: string; text: string; at: number }[]>('letters', []);

/** 운영자 답장 → 우편함 (편지마다 한 번 · 저장한 뒤 서버에 읽음) */
const STATUS_LINE: Record<string, string> = { 반영: '말씀해 주신 건 게임에 반영했어요. 고마워요!', 보류: '지금은 보류해 두었어요. 더 생각해 볼게요.' };
function replyBody(r: ReplyRow) {
  const sent = r.body.replace(/^(\[[^\]]+\]\s*)+/, '').trim();
  const head = sent ? `「${[...sent].slice(0, 24).join('')}${[...sent].length > 24 ? '…' : ''}」 편지에 답장이 왔어요.` : '보내 주신 편지에 답장이 왔어요.';
  const st = r.status === '반영' && r.ver_fixed ? `v${r.ver_fixed.replace(/^(wind-)?v/i, '')}에 반영했어요. 고마워요!` : (STATUS_LINE[r.status] ?? '');
  return [head, r.reply.trim(), st].filter(Boolean).join(' · ');
}
export async function deliverReplies() {
  const rows = await myReplies();
  if (!rows.length) return;
  const got = getPref<string[]>('replied', []);
  let n = 0;
  for (const r of rows) {
    const key = `${r.id}@${r.replied_at ?? ''}`;
    if (got.includes(key)) continue;
    addMail(S, '운영자', '운영자의 답장', replyBody(r));
    got.push(key);
    n++;
  }
  if (!n) return;
  persist();
  setPref('replied', got.slice(-200));
  toast(`우편함에 운영자의 답장이 ${n}통 왔어요`);
  await markRepliesRead(rows.map((r) => r.id));
}

// ───────── ② 새 버전 알림 · ③ 패치노트 카드 ─────────
let newVer = '';
async function checkUpdate() {
  try {
    const r = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return;
    const v = (await r.json()) as { version: string; build: string; title?: string };
    if (!v.build || v.build === __BUILD__) return;
    newVer = v.version;
    showBand(v.title ?? '');
  } catch {
    /* 오프라인 등 */
  }
}
function showBand(title: string) {
  // 전투 중이면 끝난 뒤에
  if (currentScreen()?.canvas) return void setTimeout(() => showBand(title), 15000);
  if (document.querySelector('.updband')) return;
  const b = document.createElement('button');
  b.className = 'updband';
  b.innerHTML = `${icon('sparkle')} 새 버전 v${esc(newVer)}${title ? ` · ${esc(title)}` : ''} · 눌러서 업데이트`;
  b.onclick = () => {
    persist();
    location.reload();
  };
  $('#stage').append(b);
}
async function patchCard() {
  const seen = getPref<string>('lastVersion', '');
  setPref('lastVersion', __APP_VERSION__);
  if (!seen || seen === __APP_VERSION__ || !S.prologue) return;
  const r = await fetch(`${import.meta.env.BASE_URL}patchnotes.json`, { cache: 'no-cache' }).catch(() => null);
  const n = r?.ok ? ((await r.json()) as { version: string; title: string; items: string[] }[])[0] : null;
  if (!n || n.version !== __APP_VERSION__) return;
  modal(`${icon('sparkle')} v${esc(n.version)} 업데이트 · ${esc(n.title)}`, `<ul class="sm">${n.items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`, [['좋아요', null, true]]);
}

// ───────── ⑤ 세이브 백업 ─────────
interface Bak { at: number; day: string; data: unknown }
export const backups = () => getPref<Bak[]>('backups', []);
/** 하루 한 번 지금 세이브를 백업 (최근 3개) */
function dailyBackup() {
  const list = backups();
  if (list[0]?.day === dayKey() || !S.prologue) return;
  setPref('backups', [{ at: Date.now(), day: dayKey(), data: JSON.parse(JSON.stringify(S)) }, ...list].slice(0, 3));
}
export function restoreBackup(i: number) {
  const b = backups()[i];
  if (!b) return false;
  setSave(migrate(b.data, Date.now()));
  persist();
  return true;
}
export function openBackups() {
  const list = backups();
  modal(
    `${icon('repeat')} 세이브 백업`,
    list.length ? `<p class="sm dim">하루 한 번 자동으로 남겨요 (최근 3개) · 되살리면 지금 진행은 그 날로 돌아가요</p>${list.map((b, i) => `<div class="row"><span class="grow sm">${new Date(b.at).toLocaleString('ko-KR')}</span><button class="btn mini" data-bak="${i}">되살리기</button></div>`).join('')}` : '<p class="sm dim">아직 백업이 없어요 · 내일부터 하루 한 번 남겨요</p>',
    [['닫기', null]],
  );
  document.querySelectorAll<HTMLElement>('[data-bak]').forEach((b) => (b.onclick = () => {
    if (!confirm('이 백업으로 되돌릴까요? 지금 진행은 사라져요')) return;
    if (restoreBackup(+b.dataset.bak!)) (toast('백업으로 되살렸어요'), document.querySelectorAll('.modal').forEach((x) => x.remove()), go('lobby'));
  }));
}

// ───────── 시작 ─────────
export function initOps() {
  // ④ 잡히지 않은 오류 (앞 120자만)
  const err = (msg: string) => logEvents([{ name: 'error', props: { msg: msg.slice(0, 120), scr: document.querySelector<HTMLElement>('#ui > .scr')?.dataset.screen ?? '' } }], __APP_VERSION__);
  addEventListener('error', (e) => err(String(e.message ?? e.error ?? '')));
  addEventListener('unhandledrejection', (e) => err(String((e as PromiseRejectionEvent).reason ?? '')));
  logEvents([{ name: 'session_start', props: { w: innerWidth, h: innerHeight } }], __APP_VERSION__);
  // ② 10분마다 + 앱으로 돌아올 때
  setInterval(() => void checkUpdate(), 10 * 60000);
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void checkUpdate());
  void checkUpdate();
  dailyBackup();
}
/** 운영 선물 (한 사람 한 번 · id로 구분): 오류 보상 등 */
const GIFTS = [
  { id: 'v1.0.11-sta', title: '반복 전투 행동력 보상', body: '반복 전투를 누를 때 행동력이 모자라면 아무 말 없이 되는 만큼만 돌아서, 행동력이 사라진 것처럼 보였어요. 이제는 몇 판까지 되는지 먼저 물어봐요. 불편을 드려 미안해요!', give: { stamina: 60, stardust: 100 } },
];
function deliverGifts() {
  let n = 0;
  for (const g of GIFTS) {
    if (S.seen[`gift:${g.id}`]) continue;
    S.seen[`gift:${g.id}`] = true;
    addMail(S, '운영자', g.title, g.body, g.give);
    n++;
  }
  if (!n) return;
  persist();
  toast('우편함에 운영자 선물이 왔어요');
}
/** 로비에 들어올 때: 운영 선물 · 패치노트 카드 · 답장 배달 · 백업 */
export function opsOnLobby() {
  deliverGifts();
  void patchCard();
  void deliverReplies();
  dailyBackup();
}
