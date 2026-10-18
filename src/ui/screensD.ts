// D덩어리 화면 (STAR_PLAN_v2 §4): 미션(일일·주간·이벤트·레이드·업적·출석 + 바로가기) · 길드 · 친구 · 랭킹 · 우편·공지 · 설정(계정·클라우드·소리·이름·칭호) · 채팅 창
import { CONFIG } from '../config';
import { prefs, savePrefs, applyPrefs } from '../core/audio/engine';
import { sfx } from '../core/audio/sfx';
import { setPref, getPref } from '../core/save';
import * as cloud from '../core/net/cloud';
import { lockOf, triesText } from '../game/content';
import { attend, attendToday, claim, claimAll, eventLeft, isClaimed, isDone, listOf, progress, readyOf, type Kind } from '../game/missions';
import {
  addFriend, board, BOARD_NAME, buyGuild, buyFriendPt, checkTitles, claimAllMail, createGuild, claimMail, donate, friendLv, friendSuggest, gift, GUILD_SHOP, guildAttend, guildBoard, guildBoss, guildOf, GUILDS, joinGuild, leaveGuild, myRank, removeFriend, sendChat, TITLE_OF, type Board,
} from '../game/social';
import { dayKey, migrate, newSave, persist, S, setSave, type ChatLine } from '../game/state';
import { HEROES } from '../data/heroes';
import { icon, iconText } from '../theme/tokens';
import { view } from './view';
import { goFullscreen } from './mobile';
import { $, $$, CUR_NAME, esc, fmt, go, heroPortrait, medal, modal, register, setChatOpener, syncBar, tabLabel, toast } from './core';

const SO = CONFIG.social;
const giveText = (g: Record<string, number>) => Object.entries(g).map(([k, v]) => `${icon(k)}${fmt(v)}`).join(' ');
const after = (draw: () => void, msg: string) => {
  persist();
  syncBar();
  if (msg) toast(msg);
  draw();
};

// ───────── 미션 · 업적 · 출석 ─────────
register('mission', {
  title: `${icon('mission')} 미션`,
  enter(root, p) {
    let tab = (p.tab as string) ?? 'd';
    const draw = () => {
      const tabs: [string, string, string][] = [['d', '일일', 'menu/dailymission'], ['w', '주간', 'menu/mission'], ['ev', '이벤트', 'icons/star'], ['r', '레이드', 'menu/raid'], ['ach', '업적', 'menu/trophy'], ['att', '출석', 'menu/achieve']];
      let body = '';
      if (tab === 'd' || tab === 'w' || tab === 'r' || tab === 'ach') {
        const k = tab as Kind;
        const list = listOf(k);
        body = `<div class="row"><span class="grow sm dim">${k === 'd' ? '매일 0시 초기화' : k === 'w' ? '매주 월요일에 새로' : k === 'r' ? '레이드·길드 레이드 (매일)' : '모두 세는 업적'}</span>${readyOf(k).length ? `<button class="btn hi" data-all>모두 받기 (${readyOf(k).length})</button>` : ''}</div>
          <div class="col">${list.map((m) => {
            const done = isDone(k, m);
            const got = isClaimed(k, m);
            return `<div class="panel row mrow"><div class="col grow"><b class="sm">${m.name}</b><div class="xbar"><i style="width:${(progress(k, m) / m.goal) * 100}%"></i></div><span class="xs dim">${fmt(progress(k, m))} / ${fmt(m.goal)} · ${giveText(m.give)}</span></div>
              ${got ? `<span class="chip">${icon('check')} 받음</span>` : done ? `<button class="btn mini hi" data-claim="${m.id}">받기</button>` : `<button class="btn mini" data-go='${JSON.stringify(m.go)}'>바로가기</button>`}</div>`;
          }).join('')}</div>`;
      } else if (tab === 'ev') {
        const left = eventLeft();
        body = `<div class="panel col"><b>${SO.event.name}</b><span class="sm dim">${left ? `남은 ${left}일` : '끝났어요'} · 출석할 때마다 별가루 ${SO.event.dust} · 지금까지 ${S.attend.ev}일</span>${left ? '' : '<span class="xs mute">다음 이벤트는 공지로 알려요</span>'}</div>`;
      } else {
        // 7일 판: 받은 날 ✓ · 오늘(받을 날) 빛 · 앞으로 받을 보상도 그림으로 미리 (형철 10/18)
        const got = S.attend.n % SO.attend.length;
        const today = attendToday() ? got : -1;
        const day = attendToday() ? got + 1 : ((S.attend.n - 1) % SO.attend.length) + 1;
        body = `<b class="atth">오늘은 ${day}일째 출석${attendToday() ? ' · 보상을 받을 수 있어요' : ' · 내일 또 만나요'}</b><div class="attg">${SO.attend.map((g, i) => `<div class="panel col shopc att${i < got || (!attendToday() && i === (S.attend.n - 1) % SO.attend.length) ? ' on' : ''}${i === today ? ' now' : ''}"><b>${i + 1}일째</b><div class="ag">${Object.entries(g).map(([k, v]) => `<span>${icon(k)}<b>${fmt(v)}</b></span>`).join('')}</div>${i < got ? `<em class="done">${icon('check')}</em>` : ''}</div>`).join('')}</div>
          <button class="btn hi" data-att ${attendToday() ? '' : 'disabled'}>${attendToday() ? '오늘 출석하기' : '오늘 출석 완료'}</button>`;
      }
      root.innerHTML = `<div class="body"><div class="col shopcats">${tabs.map(([k, n, pic]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${tabLabel(pic, n)}${(k === 'd' || k === 'w' || k === 'r' || k === 'ach') && readyOf(k as Kind).length ? ' <em class="badge">N</em>' : ''}</button>`).join('')}</div><div class="col grow scroll">${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      // 받기 → 보상 창 (아이콘·수량 크게 · FINAL §5)
      $$('[data-claim]', root).forEach((b) => (b.onclick = () => {
        const m = listOf(tab as Kind).find((x) => x.id === b.dataset.claim)!;
        claim(tab as Kind, m.id);
        sfx('mission');
        after(draw, '');
        giftWin('받았어요', m.give);
      }));
      $$('[data-go]', root).forEach((b) => (b.onclick = () => {
        const [to, prm] = JSON.parse(b.dataset.go!) as [string, Record<string, unknown>];
        go(to as never, prm);
      }));
      const all = root.querySelector<HTMLElement>('[data-all]');
      if (all) all.onclick = () => {
        const sum: Record<string, number> = {};
        for (const m of readyOf(tab as Kind)) for (const [c, v] of Object.entries(m.give)) sum[c] = (sum[c] ?? 0) + v;
        const n = claimAll(tab as Kind);
        after(draw, '');
        giftWin(`${n}개 받았어요`, sum);
      };
      const att = root.querySelector<HTMLElement>('[data-att]');
      if (att) att.onclick = () => {
        const r = attend();
        after(draw, r ? `${r.day}일째 출석! ${Object.entries(r.give).map(([k, v]) => `${CUR_NAME[k] ?? k} +${fmt(v)}`).join(' · ')}` : '');
      };
    };
    draw();
  },
});
/** 받은 보상 창: 칸 카드(아이콘 + 수량) 크게 */
function giftWin(title: string, give: Record<string, number>) {
  modal(title, `<div class="rw gifts big">${Object.entries(give).map(([k, v]) => `<div class="rwc ${k}"><span>${icon(k)}</span>${esc(CUR_NAME[k] ?? k)}<b>+${fmt(v)}</b></div>`).join('')}</div>`, [['확인', null, true]]);
}
/** 로비 첫 진입: 출석 창 (하루 한 번) */
export function attendPopup() {
  if (!attendToday()) return;
  const day = (S.attend.n % SO.attend.length) + 1;
  // 보상 = 칸 카드(아이콘 + 수량) 가로로 (PLAYTEST §10)
  const gifts: [string, number, string][] = Object.entries(SO.attend[day - 1]).map(([k, v]) => [k, v, CUR_NAME[k] ?? k]);
  if (eventLeft()) gifts.push(['stardust', SO.event.dust, SO.event.name]);
  modal(`${icon('mission')} 출석 ${day}일째`, `<div class="rw gifts">${gifts.map(([k, v, n]) => `<div class="rwc ${k}"><span>${icon(k)}</span>${esc(n)}<b>+${fmt(v)}</b></div>`).join('')}</div>`, [
    ['받기', () => {
      attend();
      persist();
      syncBar();
    }, true],
  ]);
}
export const missionBadge = () => (['d', 'w', 'r', 'ach'] as Kind[]).reduce((a, k) => a + readyOf(k).length, 0);

// ───────── 길드 ─────────
/** 추천 길드: 실멤버 길드 + AI 길드 3개 (새로고침마다 다른 3개) */
let gSeed = 0;
const shownGuilds = () => {
  const ai = GUILDS.filter((x) => !x.real);
  const n = ai.length;
  return [...GUILDS.filter((x) => x.real), ...[0, 1, 2].map((i) => ai[(gSeed * 3 + i) % n])];
};
register('guild', {
  title: () => `${icon('guild')} 길드${guildOf() ? ` · ${guildOf()!.name}` : ''}`,
  enter(root, p) {
    let tab = (p.tab as string) ?? 'info';
    const draw = () => {
      const g = guildOf();
      let body = '';
      if (!g) {
        // 길드 카드: 문양 메달 · 대표 멤버 초상화 3 · 오늘 출석(AI 길드) — 빈 아래 절반 채우기 (MOBILE_REF §4)
        const face = (n: string) => heroPortrait(HEROES.find((h) => h.name === n)?.id ?? avatarOf(n));
        const came = (x: (typeof GUILDS)[number]) => 1 + ([...(dayKey() + x.id)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % x.members.length);
        body = `<p class="sm why band">길드에 들어가면 출석·기여·길드 상점·길드 채팅·길드 레이드가 열려요. 실멤버 길드는 단톡방 원정대, 나머지는 AI 길드예요.</p>
          <div class="row gtools"><button class="btn hi" data-gmake>${icon('guild')} 길드 만들기 (${icon('gold')}${fmt(SO.guild.createGold)})</button><span class="grow"></span><button class="btn" data-grefresh>${icon('repeat')} 새로고침</button></div>
          <div class="cards gcards">${shownGuilds().map((x) => `<div class="panel col shopc gcard"><div class="gem">${icon('guild', 'ic gemi')}</div><b>${x.name}${x.real ? ' <span class="chip on">실멤버</span>' : ''}</b><span class="xs dim">Lv.${x.lv} · ${x.members.length + 1}명</span><span class="xs mute">${esc(x.desc)}</span><div class="gface">${x.members.slice(0, 3).map((n) => `<i class="pt s" style="background-image:url(${face(n)})" title="${esc(n)}"></i>`).join('')}</div><span class="xs gold">${x.real ? `멤버 영웅 ${x.members.length}명` : `오늘 출석 ${came(x)}/${x.members.length + 1}`}</span><button class="btn hi" data-join="${x.id}">가입</button></div>`).join('')}</div>`;
      } else if (tab === 'info') {
        const bd = guildBoard();
        body = `<div class="panel col"><b>${g.name} · Lv.${g.lv}</b><span class="xs dim">${esc(g.desc)}</span>
            <div class="row gbtns"><button class="btn hi" data-att ${S.guild.attendDay === dayKey() ? 'disabled' : ''}>출석 (${icon('guildCoin')}${SO.guild.attendCoin})</button>${SO.guild.donate.map(([gold, pts, coin], i) => `<button class="btn" data-don="${i}">기여 ${icon('gold')}${fmt(gold)} = ${pts}점 · ${icon('guildCoin')}${coin}</button>`).join('')}</div>
            <span class="xs mute">기여는 하루 한 번 · 내 기여 이번 주 ${fmt(S.guild.weekContrib)} · 모두 ${fmt(S.guild.contrib)}</span></div>
          <div class="panel col"><b class="sm">이번 주 기여 순위</b>${bd.map((x, i) => `<div class="kv${x.me ? ' gold' : ''}"><span>${i + 1}. ${esc(x.name)}</span><b>${fmt(x.pts)}점 · 레이드 ${fmt(x.raid)}</b></div>`).join('')}${g.real ? '<span class="xs mute">실멤버 기록은 서버(클라우드)가 붙으면 보여요</span>' : ''}</div>
          <button class="btn mini" data-leave>길드 나가기</button>`;
      } else if (tab === 'shop') {
        body = `<div class="cards">${GUILD_SHOP.map((x) => `<div class="panel col shopc"><b class="sm">${x.name}</b><button class="btn" data-buy="${x.id}">${icon('guildCoin')}${x.price}</button></div>`).join('')}</div><span class="xs mute">보유 ${icon('guildCoin')}${S.cur.guildCoin ?? 0}</span>`;
      } else if (tab === 'chat') {
        body = chatHtml('guild');
      } else {
        const gb = guildBoss();
        const r = { mode: 'graid' as const, arg: 0 };
        body = `<p class="sm dim">주간 보스 · 길드원 누적 피해 · 하루 ${SO.guild.raidTries}번 (남은 ${triesText(r)}) · 한 판 ${SO.guild.raidSec}초 · 준 피해 = 길드 기여 · 길드 코인</p>
          <div class="panel col"><b>${esc(gb.name)}</b><div class="xbar big"><i style="width:${(gb.hp / gb.max) * 100}%"></i></div><span class="xs dim">남은 체력 ${fmt(gb.hp)} / ${fmt(gb.max)} · 내 이번 주 피해 ${fmt(S.guild.raid)}</span></div>
          <button class="btn hi big" data-graid ${lockOf(r) ? 'disabled' : ''}>길드 레이드 도전</button>`;
      }
      const tabs: [string, string, string][] = [['info', '정보·기여', 'menu/guildhall'], ['shop', '길드 상점', 'menu/shop'], ['chat', '길드 채팅', 'menu/chat'], ['raid', '길드 레이드', 'menu/raid']];
      root.innerHTML = `<div class="body">${g ? `<div class="col shopcats">${tabs.map(([k, n, pic]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${tabLabel(pic, n)}</button>`).join('')}</div>` : ''}<div class="col grow scroll">${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-join]', root).forEach((b) => (b.onclick = () => (joinGuild(b.dataset.join!), after(draw, '길드에 들어왔어요 (우편 확인)'))));
      // 추천 길드 새로고침 · 길드 만들기 (이름 2~8자 · 금화)
      root.querySelector<HTMLElement>('[data-grefresh]')?.addEventListener('click', () => (gSeed++, draw()));
      root.querySelector<HTMLElement>('[data-gmake]')?.addEventListener('click', () =>
        modal('길드 만들기', `<p class="sm dim">길드 이름 (2~8자) · ${icon('gold')}${fmt(SO.guild.createGold)}</p><input class="gname-in" maxlength="8" placeholder="예) 바람의 원정대">`, [
          ['그만두기', null],
          ['만들기', () => {
            const r = createGuild(document.querySelector<HTMLInputElement>('.gname-in')?.value ?? '');
            if (r === 'name') return (toast('이름은 2~8자로 지어 주세요'), false);
            if (r === 'poor') return (toast('금화가 모자라요'), false);
            after(draw, '길드를 만들었어요');
          }, true],
        ]),
      );
      const at = root.querySelector<HTMLElement>('[data-att]');
      if (at) at.onclick = () => after(draw, guildAttend() ? '길드 출석!' : '오늘은 이미 했어요');
      $$('[data-don]', root).forEach((b) => (b.onclick = () => after(draw, { ok: '기여했어요', poor: '금화가 모자라요', done: '기여는 하루 한 번', none: '' }[donate(+b.dataset.don!)])));
      const lv = root.querySelector<HTMLElement>('[data-leave]');
      if (lv) lv.onclick = () => modal('길드 나가기', '<p class="dim">기여 점수는 남아요.</p>', [['그만두기', null], ['나가기', () => (leaveGuild(), after(draw, '길드를 나왔어요')), true]]);
      $$('[data-buy]', root).forEach((b) => (b.onclick = () => after(draw, { ok: '샀어요', poor: '길드 코인이 모자라요', none: '', cap: '이번 주 획득 상한이에요 (월요일에 다시 차요)' }[buyGuild(b.dataset.buy!)])));
      const gr = root.querySelector<HTMLElement>('[data-graid]');
      if (gr) gr.onclick = () => go('prep', { run: { mode: 'graid', arg: 0 } });
      wireChat(root, 'guild', draw);
    };
    draw();
  },
});

// ───────── 친구 ─────────
/** 친구 얼굴: 이름으로 정해지는 영웅 초상화 (1단계 · 실유저 프로필은 서버 연결 뒤) */
const avatarOf = (name: string) => HEROES[[...name].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7) % HEROES.length].id;
register('friends', {
  title: `${icon('friend')} 친구`,
  enter(root) {
    const draw = () => {
      root.innerHTML = `<div class="body"><div class="col grow scroll">
          <div class="row"><b class="grow">친구 ${S.friends.list.length}/${SO.friends.max}</b><span class="xs dim">하루 한 번씩 선물(행동력 ${SO.friends.gift}) · 받기 하루 ${SO.friends.giftsPerDay}번</span></div>
          ${S.friends.list.map((n) => `<div class="panel row frow"><div class="pt s" style="background-image:url(${heroPortrait(avatarOf(n))})"></div><b class="hn grow">${esc(n)} <span class="chip">Lv.${friendLv(n)}</span></b><button class="btn mini" data-gift="${esc(n)}" ${S.friends.sent.includes(n) && S.friends.day === dayKey() ? 'disabled' : ''}>선물</button><button class="btn mini" data-del="${esc(n)}">삭제</button></div>`).join('') || '<span class="mute">아직 친구가 없어요</span>'}
        </div><div class="col side scroll"><b class="sm">추천 원정대</b>${friendSuggest().map((n) => `<div class="row"><span class="grow xs">${esc(n)} · Lv.${friendLv(n)}</span><button class="btn mini" data-add="${esc(n)}">추가</button></div>`).join('')}<b class="sm fpt">우정 포인트 상점 · 보유 ${icon('friend')}${fmt(S.cur.friendPt ?? 0)}</b><span class="xs dim">선물을 보낼 때마다 +${SO.friends.pt}</span>${SO.friends.ptShop.map((x) => `<div class="row"><span class="grow xs">${esc(x.name)}</span><button class="btn mini" data-fp="${x.id}">${icon('friend')}${x.pt}</button></div>`).join('')}</div></div>`;
      $$('[data-gift]', root).forEach((b) => (b.onclick = () => after(draw, { ok: '선물을 보냈어요 (답례 행동력)', done: '오늘은 이미 보냈어요', none: '' }[gift(b.dataset.gift!)])));
      $$('[data-fp]', root).forEach((b) => (b.onclick = () => (buyFriendPt(b.dataset.fp!) === 'ok' ? (sfx('coin'), after(draw, '바꿨어요')) : toast('우정 포인트가 모자라요'))));
      $$('[data-del]', root).forEach((b) => (b.onclick = () => (removeFriend(b.dataset.del!), after(draw, ''))));
      $$('[data-add]', root).forEach((b) => (b.onclick = () => after(draw, addFriend(b.dataset.add!) ? '친구가 됐어요' : '친구가 가득 찼어요')));
    };
    draw();
  },
});

// ───────── 랭킹 · 칭호 ─────────
/** 랭킹 왼쪽 메뉴 그림 (PLAYTEST §0-4) */
const BOARD_PIC: Record<Board, string> = { tower: 'menu/tower', world: 'menu/worldboss', arena: 'menu/arena', guild: 'menu/guildhall' };
register('ranking', {
  title: `${icon('ranking')} 랭킹`,
  enter(root, p) {
    let tab = ((p.tab as string) ?? 'tower') as Board;
    const draw = () => {
      const got = checkTitles();
      if (got.length) persist();
      const bd = board(tab).slice(0, 13);
      root.innerHTML = `<div class="body"><div class="col shopcats">${(Object.keys(BOARD_NAME) as Board[]).map((k) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${tabLabel(BOARD_PIC[k], BOARD_NAME[k])}</button>`).join('')}</div>
        <div class="col grow"><span class="xs dim">내 순위 ${myRank(tab) || '-'}위 · ${SO.titleTop}위 안이면 랭커 칭호 「${TITLE_OF[tab]}」 (채팅 이름 옆) · 칭호 달기는 설정</span>
          <div class="panel col grow scroll">${bd.map((x, i) => `<div class="kv rank${x.me ? ' gold' : ''}"><span>${medal(i)} <b class="hn">${esc(x.name)}</b>${i < SO.titleTop ? ` <span class="chip on">${TITLE_OF[tab]}</span>` : ''}</span><b>${fmt(x.v)}</b></div>`).join('')}</div></div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab as Board), draw())));
      if (got.length) toast(`랭커 칭호 「${got.join('」「')}」을 얻었어요!`);
    };
    draw();
  },
});

// ───────── 우편 · 공지 ─────────
register('mail', {
  title: `${icon('mail')} 우편`,
  enter(root) {
    const draw = () => {
      root.innerHTML = `<div class="body"><div class="col grow scroll">
        <div class="row"><b class="grow">우편 ${S.mail.list.length}</b><button class="btn mini" data-notice>${icon('story')} 공지·패치노트</button><button class="btn hi" data-all ${S.mail.list.some((m) => !m.got) ? '' : 'disabled'}>모두 받기</button></div>
        ${S.mail.list.map((m) => `<div class="panel row"><div class="col grow"><b class="sm">${esc(m.title)} <span class="xs dim">${esc(m.from)} · ${new Date(m.at).toLocaleDateString('ko-KR')}</span></b><span class="xs dim">${esc(m.body)}</span>${Object.keys(m.give).length ? `<span class="xs">${giveText(m.give)}</span>` : ''}</div>${!m.got ? `<button class="btn mini hi" data-get="${m.id}">받기</button>` : '<span class="xs mute">읽음</span>'}</div>`).join('') || '<span class="mute">우편이 없어요</span>'}
      </div></div>`;
      $$('[data-get]', root).forEach((b) => (b.onclick = () => (claimMail(+b.dataset.get!), after(draw, '받았어요'))));
      const all = root.querySelector<HTMLElement>('[data-all]');
      if (all) all.onclick = () => after(draw, `${claimAllMail()}통 받았어요`);
      $('[data-notice]', root).onclick = () => notice();
    };
    draw();
  },
});
async function notice() {
  const r = await fetch(`${import.meta.env.BASE_URL}patchnotes.json`).catch(() => null);
  const notes = r?.ok ? ((await r.json()) as { version: string; title: string; items: string[]; fixes?: string[] }[]) : [];
  modal(`${icon('story')} 공지`, notes.slice(0, 5).map((n) => `<b class="sm">v${n.version} ${esc(n.title)}</b><ul class="xs dim">${n.items.map((i) => `<li>${esc(i)}</li>`).join('')}${(n.fixes ?? []).map((i) => `<li>고침: ${esc(i)}</li>`).join('')}</ul>`).join('') || '<span class="mute">공지를 못 불러왔어요</span>', [['닫기', null, true]]);
}

// ───────── 채팅 창 ─────────
// 😊 빠른 채팅 (MOBILE_REF §2): 자주 쓰는 말 8 + 감정 4 · 누르면 바로 보냄 · 키보드 없이
const QUICK = SO.quick;
export const quickHtml = () => `<div class="qpop" hidden>${QUICK.phrases.map((t) => `<button class="tab" data-q="${esc(t)}">${esc(t)}</button>`).join('')}${QUICK.emotes.map((k) => `<button class="tab emo" data-qe="${k}">${icon(k)}</button>`).join('')}</div>`;
export function chatHtml(ch: ChatLine['ch']) {
  const lines = S.chat.filter((l) => l.ch === ch).slice(-30);
  return `<div class="chatbox"><div class="chatlog scroll" data-log>${lines.map((l) => `<div class="cl${l.me ? ' me' : ''}"><b>${l.title ? `<span class="chip on">${esc(l.title)}</span> ` : ''}${esc(l.name)}</b> ${esc(l.text)}</div>`).join('') || '<span class="mute xs">아직 조용해요</span>'}</div>
    ${quickHtml()}<div class="row chatrow"><button class="btn mini qbtn" data-quick title="빠른 채팅">${icon('emote')}</button><input class="tab grow chatin" data-in maxlength="${SO.chat.max}" enterkeyhint="send" placeholder="${ch === 'world' ? '월드 채팅' : '길드 채팅'} (로그인하면 다른 사람에게도)"><button class="btn mini hi" data-send>보내기</button></div></div>`;
}
/** 키보드가 가린 만큼 (게임 좌표 px) → 채팅 판을 남은 자리에 꽉 차게 (돌린 화면이면 게임 오른쪽·왼쪽이 화면 아래·위) */
function kbFit() {
  const st = $('#stage');
  const vv = visualViewport;
  if (!vv) return;
  const r = st.getBoundingClientRect();
  const k = view.scale;
  const top = Math.max(0, vv.offsetTop - r.top) / k;
  const bot = Math.max(0, r.bottom - (vv.offsetTop + vv.height)) / k;
  const [a, b] = view.rotated ? (['--kbL', '--kbR'] as const) : (['--kbT', '--kbB'] as const);
  for (const v of ['--kbT', '--kbB', '--kbL', '--kbR']) st.style.setProperty(v, '0px');
  st.style.setProperty(a, `${Math.round(top)}px`);
  st.style.setProperty(b, `${Math.round(bot)}px`);
}
function wireChat(root: HTMLElement, ch: ChatLine['ch'], draw: () => void) {
  const send = root.querySelector<HTMLElement>('[data-send]');
  const inp = root.querySelector<HTMLInputElement>('[data-in]');
  if (!send || !inp) return;
  const say = (text: string) => {
    const line = sendChat(text, ch);
    if (!line) return;
    persist();
    void cloud.postChat({ ch, guild: S.guild.id, name: line.name, title: line.title, text: line.text });
    draw();
  };
  send.onclick = () => say(inp.value);
  inp.onkeydown = (e) => e.key === 'Enter' && say(inp.value);
  // 입력 중 전용 배치: 최근 몇 줄 + 입력줄만 키보드 바로 위에 (보내거나 키보드 닫으면 원래대로)
  const box = (root.querySelector<HTMLElement>('.chatp') ?? root.querySelector<HTMLElement>('.chatbox'))!;
  const st = $('#stage');
  inp.onfocus = () => {
    kbFit();
    box.classList.add('kb');
    st.classList.add('typing');
    visualViewport?.addEventListener('resize', kbFit);
    const log = box.querySelector<HTMLElement>('[data-log]');
    if (log) log.scrollTop = log.scrollHeight;
  };
  inp.onblur = () => {
    box.classList.remove('kb');
    st.classList.remove('typing');
    visualViewport?.removeEventListener('resize', kbFit);
  };
  // 입력 중에 누르는 버튼(😊 · 빠른 말 · 보내기)은 입력칸 포커스를 뺏지 않게 → 키보드가 닫혔다 열리며 자리가 튀지 않음
  $$('[data-quick], [data-q], [data-qe], [data-send]', root).forEach((b) => (b.onpointerdown = (e) => e.preventDefault()));
  const pop = root.querySelector<HTMLElement>('.qpop');
  const qb = root.querySelector<HTMLElement>('[data-quick]');
  if (pop && qb) qb.onclick = () => (pop.hidden = !pop.hidden);
  $$('[data-q]', root).forEach((b) => (b.onclick = () => say(b.dataset.q!)));
  $$('[data-qe]', root).forEach((b) => (b.onclick = () => say(iconText(b.dataset.qe!))));
  const log = root.querySelector<HTMLElement>('[data-log]');
  if (log) log.scrollTop = log.scrollHeight;
}
/** 채팅 창 (상단 바 · 한 줄 티커에서) */
export function openChat() {
  const m = document.createElement('div');
  m.className = 'modal';
  $('#stage').append(m);
  let ch: ChatLine['ch'] = 'world';
  const draw = () => {
    m.innerHTML = `<div class="panel chatp"><div class="row"><div class="tabs grow"><button class="tab${ch === 'world' ? ' on' : ''}" data-ch="world">월드</button><button class="tab${ch === 'guild' ? ' on' : ''}" data-ch="guild" ${S.guild.id ? '' : 'disabled'}>길드</button></div><button class="btn mini" data-x>${icon('close')}</button></div>${chatHtml(ch)}</div>`;
    $$('[data-ch]', m).forEach((b) => (b.onclick = () => ((ch = b.dataset.ch as ChatLine['ch']), draw())));
    $('[data-x]', m).onclick = () => m.remove();
    wireChat(m, ch, draw);
  };
  draw();
}

// ───────── 설정 (계정 · 클라우드 · 소리 · 이름 · 칭호 · 처음부터) ─────────
register('settings', {
  title: `${icon('settings')} 설정`,
  enter(root) {
    const draw = async () => {
      const w = await cloud.who();
      root.innerHTML = `<div class="body"><div class="col grow scroll">
          <div class="panel col"><b>계정 (「체크인」과 같은 계정)</b>
            ${w ? `<span class="sm">${w.guest ? '게스트' : `아이디 ${esc(w.login ?? '')}`} 로그인 중</span><div class="row"><button class="btn" data-push>${icon('next')} 클라우드에 올리기</button><button class="btn" data-pull>클라우드에서 받기</button><button class="btn mini" data-out>로그아웃</button></div>`
              : `<span class="xs dim">「체크인」 아이디·비밀번호로 로그인하면 클라우드 저장·실유저 채팅이 켜져요</span><div class="row"><input class="tab" data-id placeholder="아이디"><input class="tab" data-pw type="password" placeholder="비밀번호"><button class="btn hi" data-login>로그인</button><button class="btn" data-guest>게스트로</button></div>`}</div>
          <div class="panel col"><b>원정대</b><div class="row"><input class="tab grow" data-name maxlength="10" value="${esc(S.acc.name)}"><button class="btn mini" data-rename>이름 바꾸기</button></div>
            <div class="row"><span class="sm">칭호</span><select class="tab" data-title><option value="">없음</option>${S.titles.own.map((t) => `<option ${S.titles.on === t ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><span class="xs mute">랭킹 ${SO.titleTop}위 안이면 얻어요</span></div></div>
          <div class="panel col"><b>소리 · 화면</b>
            <div class="row"><label class="sm grow"><input type="checkbox" data-bgm ${prefs.bgmOn ? 'checked' : ''}> 배경음악</label><label class="sm grow"><input type="checkbox" data-sfx ${prefs.sfxOn ? 'checked' : ''}> 효과음</label><label class="sm grow"><input type="checkbox" data-cut ${getPref('cutOff', false) ? '' : 'checked'}> 스킬 컷인</label><label class="sm grow"><input type="checkbox" data-hpall ${getPref('hpAlways', false) ? 'checked' : ''}> 머리 위 체력 바 늘 보기</label><label class="sm grow"><input type="checkbox" data-full ${getPref('fullscreen', true) ? 'checked' : ''}> 전체 화면 (안드로이드)</label></div></div>
          <div class="row"><button class="btn" data-title-screen>타이틀로</button><button class="btn mini" data-reset>처음부터</button></div>
        </div></div>`;
      const q = <E extends HTMLElement = HTMLElement>(s: string) => root.querySelector<E>(s);
      const msg = (e: string | null, ok: string) => toast(e ?? ok);
      q('[data-login]')?.addEventListener('click', async () => {
        msg(await cloud.login(q<HTMLInputElement>('[data-id]')!.value, q<HTMLInputElement>('[data-pw]')!.value), '로그인했어요');
        const u = await cloud.who();
        if (u && S.acc.name === CONFIG.start.name) {
          const nick = await cloud.nickname(u.uid);
          if (nick) ((S.acc.name = nick.slice(0, 10)), persist());
        }
        void draw();
      });
      q('[data-guest]')?.addEventListener('click', async () => (msg(await cloud.guest(), '게스트로 들어왔어요'), void draw()));
      q('[data-out]')?.addEventListener('click', async () => (await cloud.logout(), toast('로그아웃했어요'), void draw()));
      q('[data-push]')?.addEventListener('click', async () => {
        persist();
        const e = await cloud.push(S);
        if (!e) ((S.cloud.pushedAt = Date.now()), persist());
        msg(e, '클라우드에 올렸어요');
      });
      q('[data-pull]')?.addEventListener('click', async () => {
        const r = await cloud.pull();
        if (typeof r === 'string') return toast(r);
        if (!r) return toast('클라우드에 저장이 없어요');
        modal('클라우드에서 받기', `<p class="dim">클라우드 저장(${new Date(r.at).toLocaleString('ko-KR')})으로 이 기기 저장(${new Date(S.savedAt).toLocaleString('ko-KR')})을 바꿀까요?</p>`, [
          ['그만두기', null],
          ['바꾸기', () => {
            setSave(migrate(r.data));
            persist();
            toast('받았어요');
            go('lobby', {}, false);
          }, true],
        ]);
      });
      q('[data-rename]')?.addEventListener('click', () => {
        const n = q<HTMLInputElement>('[data-name]')!.value.trim().slice(0, 10);
        if (!n) return;
        S.acc.name = n;
        after(() => void draw(), '이름을 바꿨어요');
      });
      q<HTMLSelectElement>('[data-title]')?.addEventListener('change', (e) => {
        S.titles.on = (e.target as HTMLSelectElement).value || null;
        persist();
      });
      q<HTMLInputElement>('[data-bgm]')?.addEventListener('change', (e) => ((prefs.bgmOn = (e.target as HTMLInputElement).checked), savePrefs(), applyPrefs()));
      q<HTMLInputElement>('[data-sfx]')?.addEventListener('change', (e) => ((prefs.sfxOn = (e.target as HTMLInputElement).checked), savePrefs(), applyPrefs()));
      q<HTMLInputElement>('[data-cut]')?.addEventListener('change', (e) => setPref('cutOff', !(e.target as HTMLInputElement).checked));
      q<HTMLInputElement>('[data-hpall]')?.addEventListener('change', (e) => setPref('hpAlways', (e.target as HTMLInputElement).checked));
      q<HTMLInputElement>('[data-full]')?.addEventListener('change', (e) => {
        const on = (e.target as HTMLInputElement).checked;
        setPref('fullscreen', on);
        if (on) goFullscreen();
        else if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      });
      q('[data-title-screen]')?.addEventListener('click', () => go('title'));
      q('[data-reset]')?.addEventListener('click', () =>
        modal('처음부터 할까요?', '<p class="dim">이 기기에 저장된 원정대 기록이 모두 지워져요. (클라우드는 그대로)</p>', [
          ['그만두기', null],
          ['처음부터', () => {
            setSave(newSave());
            persist();
            go('title', {}, false);
          }, true],
        ]),
      );
    };
    void draw();
  },
});
setChatOpener(openChat);
