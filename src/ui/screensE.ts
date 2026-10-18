// 월드맵 · 수도 · 여관 · 기억의 도서관 (형철 10/18 · 킹스레이드 「포탈 → 전체 지도」 · 「수도」 건물들)
//  그림은 지금 있는 것으로 자리만(월드맵 = screens/map · 수도 = screens/capital) — 새 그림은 docs/ASSET_SPEC_1018.md
import { CONFIG } from '../config';
import { HEROES, heroOf } from '../data/heroes';
import { CHAPTERS } from '../data/story';
import { affLv, affOf, eat, foodNow, innGift, innTalk, talkedToday } from '../game/inn';
import { SAGA, sagaGot, sagaReady } from '../game/saga';
import { cleared, unlocked } from '../game/stage';
import { persist, S } from '../game/state';
import { icon } from '../theme/tokens';
import { jingle, sfx } from '../core/audio/sfx';
import { $$, esc, fmt, go, heroPortrait, playTalk, register, syncBar, toast } from './core';
import { coach } from './coach';

const I = CONFIG.inn;
/** 지도 위 자리 [x%, y%] · 이름 · 아이콘 · 열림 조건 · 갈 곳 */
interface Spot { k: string; x: number; y: number; name: string; ic: string; open: () => boolean; go: () => void; big?: boolean }
const lockText = (c: number) => `${c}장을 깨면 열려요`;
const chOpen = (c: number) => cleared({ c, s: 10, d: 0 });

// ───────── 월드맵 (포탈 → 전체 지도: 수도 · 도전의 탑 · 세계수 · 지역 10곳 · 레이드 · 균열 · 결투장) ─────────
register('world', {
  title: `${icon('adventure')} 월드맵`,
  enter(root) {
    const W: Spot[] = [
      { k: 'capital', x: 20, y: 70, name: '수도', ic: 'guild', open: () => true, go: () => go('capital'), big: true },
      { k: 'tree', x: 19, y: 15, name: '세계수', ic: 'event', open: () => chOpen(1), go: () => go('portal', { tab: 'day' }) },
      { k: 'tower', x: 86, y: 14, name: '도전의 탑', ic: 'tower', open: () => chOpen(2), go: () => go('portal', { tab: 'tower' }) },
      { k: 'raid', x: 58, y: 20, name: '용의 둥지 (레이드)', ic: 'raid', open: () => chOpen(3), go: () => go('portal', { tab: 'raid' }) },
      { k: 'rift', x: 92, y: 46, name: '하늘 균열 (월드 보스)', ic: 'world', open: () => chOpen(4), go: () => go('portal', { tab: 'world' }) },
      { k: 'arena', x: 38, y: 50, name: '결투장', ic: 'arena', open: () => chOpen(2), go: () => go('portal', { tab: 'arena' }) },
      { k: 'hunt', x: 70, y: 66, name: '토벌·상급 던전', ic: 'battle', open: () => chOpen(1), go: () => go('portal', { tab: 'hunt' }) },
      ...CHAPTERS.map((c, i): Spot => {
        const p: [number, number][] = [[30, 82], [44, 74], [52, 58], [64, 48], [74, 36], [80, 58], [62, 82], [46, 36], [32, 30], [70, 12]];
        return { k: `ch${c.n}`, x: p[i][0], y: p[i][1], name: `${c.n}장 ${c.name}`, ic: 'adventure', open: () => unlocked({ c: c.n, s: 1, d: 0 }), go: () => go('adventure', { c: c.n }) };
      }),
    ];
    root.innerHTML = `<div class="wmap">${W.map((s) => `<button class="wspot${s.big ? ' big' : ''}${s.open() ? '' : ' off'}${s.k.startsWith('ch') ? ' ch' : ''}" style="left:${s.x}%;top:${s.y}%" data-w="${s.k}">${icon(s.ic)}<span>${esc(s.name)}</span></button>`).join('')}</div>
      <p class="wtip xs">지역을 누르면 그 장의 모험 지도로 · 수도에서 상점·여관·대장간…</p>`;
    $$('[data-w]', root).forEach((b) => {
      const s = W.find((x) => x.k === b.dataset.w)!;
      b.onclick = () => (s.open() ? s.go() : toast(s.k.startsWith('ch') ? '앞 장을 먼저 깨요' : lockText(s.k === 'tree' || s.k === 'hunt' ? 1 : s.k === 'tower' || s.k === 'arena' ? 2 : s.k === 'raid' ? 3 : 4)));
    });
    coach('world', [
      { sel: '[data-w="capital"]', text: '수도에는 상점·여관·대장간·길드가 모여 있어요' },
      { sel: '[data-w="tree"]', text: '세계수·도전의 탑·레이드는 장을 깨면 하나씩 열려요' },
    ]);
  },
});

// ───────── 수도 (상점 · 여관 · 지하감옥 창고 · 결투장 · 왕성 · 대장간 · 기억의 도서관 · 길드 · 중심가) ─────────
register('capital', {
  title: `${icon('guild')} 수도`,
  back: () => go('world', {}, false),
  enter(root) {
    const B: Spot[] = [
      { k: 'castle', x: 56, y: 14, name: '왕성 (랭킹·칭호)', ic: 'trophy', open: () => true, go: () => go('ranking') },
      { k: 'arena', x: 12, y: 22, name: '결투장', ic: 'arena', open: () => chOpen(2), go: () => go('portal', { tab: 'arena' }) },
      { k: 'inn', x: 50, y: 42, name: '여관', ic: 'heart', open: () => true, go: () => go('inn'), big: true },
      { k: 'shop', x: 30, y: 46, name: '상점', ic: 'shop', open: () => true, go: () => go('shop') },
      { k: 'smith', x: 78, y: 34, name: '대장간 (장비 소환·제작)', ic: 'sk_hammer', open: () => true, go: () => go('shop', { cat: 'summon' }) },
      { k: 'library', x: 22, y: 74, name: '기억의 도서관', ic: 'story', open: () => true, go: () => go('library') },
      { k: 'guild', x: 70, y: 70, name: '길드', ic: 'guild', open: () => true, go: () => go('guild') },
      { k: 'vault', x: 88, y: 60, name: '지하감옥 창고 (가방)', ic: 'bag', open: () => true, go: () => go('bag') },
      { k: 'plaza', x: 48, y: 82, name: '중심가 (친구·광장)', ic: 'friend', open: () => true, go: () => go('friends') },
    ];
    root.innerHTML = `<div class="wmap town">${B.map((s) => `<button class="wspot bld${s.big ? ' big' : ''}${s.open() ? '' : ' off'}" style="left:${s.x}%;top:${s.y}%" data-b="${s.k}">${icon(s.ic)}<span>${esc(s.name)}</span></button>`).join('')}</div>`;
    $$('[data-b]', root).forEach((b) => {
      const s = B.find((x) => x.k === b.dataset.b)!;
      b.onclick = () => (s.open() ? s.go() : toast(lockText(2)));
    });
    coach('capital', [{ sel: '[data-b="inn"]', text: '여관에서는 영웅과 인연을 맺고\n버프 음식을 먹을 수 있어요' }]);
  },
});

// ───────── 여관 (인연 맺기 · 버프 음식) ─────────
register('inn', {
  title: `${icon('heart')} 여관`,
  back: () => go('capital', {}, false),
  enter(root, p) {
    let tab = (p.tab as string) ?? 'bond';
    const draw = () => {
      const f = foodNow();
      const own = HEROES.filter((h) => S.heroes[h.id]);
      const body =
        tab === 'bond'
          ? `<p class="sm dim">하루 한 번 대화 +${I.talk} · 선물 ${icon('gold')}${fmt(I.giftGold)} +${I.gift} · ${I.perLv}마다 인연 한 단계 (최대 ${I.maxLv}) · 단계마다 공격력·체력 +${(I.lvStat * 100).toFixed(1)}% · 별가루 ${I.lvDust}</p>
            <div class="cards innc">${own.map((h) => {
              const lv = affLv(h.id);
              const pt = affOf(h.id) % I.perLv;
              return `<div class="panel col shopc innh"><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><b class="sm">${esc(h.name)}</b>
                <span class="hearts">${Array.from({ length: I.maxLv }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span>
                <div class="xbar"><i style="width:${lv >= I.maxLv ? 100 : pt}%"></i></div>
                <div class="row"><button class="btn mini${talkedToday(h.id) ? '' : ' hi'}" data-talk="${h.id}" ${talkedToday(h.id) ? 'disabled' : ''}>${talkedToday(h.id) ? '오늘 대화함' : '대화'}</button><button class="btn mini" data-gift="${h.id}" ${lv >= I.maxLv ? 'disabled' : ''}>${icon('gold')} 선물</button></div></div>`;
            }).join('')}</div>`
          : `<p class="sm dim">음식은 하나만 · 먹으면 정해진 시간 동안 효과 ${f ? `· 지금 <b class="gold">${esc(f.name)}</b> (${Math.ceil(((S.inn?.food?.until ?? 0) - Date.now()) / 60000)}분 남음)` : ''}</p>
            <div class="cards foods">${I.food.map((x) => `<div class="panel col shopc food${f?.id === x.id ? ' on' : ''}"><b class="sm">${esc(x.name)}</b><span class="xs gold">${esc(x.desc)}</span><span class="xs dim">${x.min}분</span><button class="btn hi" data-eat="${x.id}">${icon('gold')}${fmt(x.gold)}</button></div>`).join('')}</div>`;
      root.innerHTML = `<div class="body"><div class="col shopcats"><button class="tab${tab === 'bond' ? ' on' : ''}" data-tab="bond">${icon('heart')} 인연 맺기</button><button class="tab${tab === 'food' ? ' on' : ''}" data-tab="food">${icon('booster')} 식당 (버프 음식)</button></div><div class="col grow scroll">${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-talk]', root).forEach((b) => (b.onclick = () => {
        const id = b.dataset.talk!;
        const up = innTalk(id);
        persist();
        const h = heroOf(id);
        playTalk([[id, h.voice?.[Math.floor(Math.random() * h.voice.length)] ?? h.concept]], () => {
          if (up > 0) (jingle('up'), toast(`${h.name}와(과) 인연이 깊어졌어요! 인연 ${affLv(id)}단계`));
          syncBar();
          draw();
        });
      }));
      $$('[data-gift]', root).forEach((b) => (b.onclick = () => {
        const up = innGift(b.dataset.gift!);
        if (up < 0) return (sfx('place_bad'), toast('금화가 모자라요'));
        persist();
        syncBar();
        sfx('heart');
        toast(up > 0 ? `인연 ${affLv(b.dataset.gift!)}단계!` : '선물을 건넸어요');
        draw();
      }));
      $$('[data-eat]', root).forEach((b) => (b.onclick = () => {
        if (eat(b.dataset.eat!) !== 'ok') return (sfx('place_bad'), toast('금화가 모자라요'));
        persist();
        syncBar();
        sfx('item');
        toast('든든하게 먹었어요! 효과가 시작돼요');
        draw();
      }));
    };
    draw();
  },
});

// ───────── 기억의 도서관 (지난 이야기 다시 보기 · 영웅 서사 · 도감) ─────────
register('library', {
  title: `${icon('story')} 기억의 도서관`,
  back: () => go('capital', {}, false),
  enter(root, p) {
    let tab = (p.tab as string) ?? 'story';
    const draw = () => {
      let body = '';
      if (tab === 'story') {
        body = `<p class="sm dim">본 장의 이야기를 다시 볼 수 있어요</p><div class="cards">${CHAPTERS.filter((c) => S.seen[`${c.n}:intro`]).map((c) => `<div class="panel col shopc"><b class="sm">${c.n}장 ${esc(c.name)}</b><span class="xs dim">${esc(c.star)}</span><div class="row">${(['intro', 'mid3', 'mid6', 'preBoss', 'clear'] as const).filter((k) => c[k]?.length && (k === 'clear' ? chOpen(c.n) : S.seen[`${c.n}:${k}`])).map((k) => `<button class="btn mini" data-rd="${c.n}:${k}">${{ intro: '시작', mid3: '3', mid6: '6', preBoss: '보스 전', clear: '끝' }[k]}</button>`).join('')}</div></div>`).join('')}</div>`;
      } else if (tab === 'saga') {
        body = `<p class="sm dim">영웅을 키우면 열리는 이야기 · 받을 보상이 있으면 붉게</p><div class="cards">${HEROES.filter((h) => S.heroes[h.id]).map((h) => `<button class="btn panel col shopc${sagaReady(h.id).length ? ' ready' : ''}" data-sg="${h.id}"><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><b class="sm">${esc(h.name)}</b><span class="xs dim">서사 ${sagaGot(h.id).length}/${SAGA.length}${sagaReady(h.id).length ? ` · <b class="gold">받기 ${sagaReady(h.id).length}</b>` : ''}</span></button>`).join('')}</div>`;
      } else {
        const own = HEROES.filter((h) => S.heroes[h.id]).length;
        body = `<p class="sm dim">도감 · 만난 영웅 ${own}/${HEROES.length}</p><div class="cards dex">${HEROES.map((h) => `<div class="panel col shopc${S.heroes[h.id] ? '' : ' lock'}"><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><b class="xs">${S.heroes[h.id] ? esc(h.name) : '???'}</b></div>`).join('')}</div>`;
      }
      root.innerHTML = `<div class="body"><div class="col shopcats">${[['story', '지난 이야기', 'story'], ['saga', '영웅 서사', 'heroes'], ['dex', '도감', 'mission']].map(([k, n, ic]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${icon(ic)} ${n}</button>`).join('')}</div><div class="col grow scroll">${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-rd]', root).forEach((b) => (b.onclick = () => {
        const [c, k] = b.dataset.rd!.split(':');
        playTalk(CHAPTERS[+c - 1][k as 'intro'] ?? [], () => {});
      }));
      $$('[data-sg]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.sg, tab: 'saga' })));
    };
    draw();
  },
});
