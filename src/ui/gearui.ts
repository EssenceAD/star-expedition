// 장비 칸(정사각 · 등급 테두리 · 왼쪽 위 티어 · 강화 수치 · 별) + 장비 상세 창(잠금·강화·별 올리기·티어·옵션 바꾸기·룬·전수·판매/분해)
import { CONFIG } from '../config';
import { heroOf } from '../data/heroes';
import {
  enhance, enhBand, enhCost, enhRate, feedable, gearBase, gearName, gearOf, gearPower, gradeName, optText, PART_NAME, removeItem, rerollKeep, rerollRoll, RUNE_GRADE, runeOf, runeValue, socket, starRate, starUp, tierCost, tierUp, transfer, transferPreview,
} from '../game/gear';
import { addCur, persist, S, type Gear, type Rune } from '../game/state';
import { icon, iconText } from '../theme/tokens';
import { $, $$, fmt, fxt, syncBar, toast } from './core';

const G = CONFIG.gear;
const PART_IC: Record<string, string> = { weapon: 'weapon', armor: 'armor', acc: 'acc' };
export const gradeKey = (g: number) => G.grades[g]?.key ?? 'common';
/** 아이템 그림 (부위·등급별 · config gear.art · have=false면 기호) */
const artOf = (g: Gear) => (G.art.have ? `<i class="art" style="background-image:url(${import.meta.env.BASE_URL}art/${G.art.dir}/${G.types.art[g.type ?? ''] ?? g.part}_${gradeKey(g.grade)}.png)"></i>` : `<i class="art">${icon(PART_IC[g.part])}</i>`);
/** 장비 칸: 등급 테두리 · 강화 구간 빛(eb1~5) · 모서리 큰 +N · 티어 · 별 */
export const gearCell = (g: Gear | null, attrs = '', label = '', pic = '') =>
  g
    ? `<button class="gi g-${gradeKey(g.grade)} eb${enhBand(g.enh)}${g.lock ? ' locked' : ''}" ${attrs} title="${gearName(g)} +${g.enh}"><span class="t">T${g.tier}</span>${artOf(g)}${g.enh ? `<span class="e">+${g.enh}</span>` : ''}<span class="st">${iconText('star').repeat(g.star)}</span>${g.by ? `<span class="by">${heroOf(g.by).name.slice(0, 2)}</span>` : ''}${g.lock ? `<span class="lk">${icon('lock')}</span>` : ''}</button>`
    : pic
      ? `<button class="gi empty pic" ${attrs} title="${label} · 비어 있음"><img class="slotpic" src="${import.meta.env.BASE_URL}art/ui/icons/${pic}.png" alt=""></button>`
      : `<button class="gi empty" ${attrs}><span class="xs good">장착 가능</span><span class="xs mute">${label}</span></button>`;
export const runeCell = (r: Rune | null, attrs = '') =>
  r ? `<button class="gi rune r${r.grade}" ${attrs} title="${RUNE_GRADE[r.grade]} 룬">${G.art.have ? `<i class="art" style="background-image:url(${import.meta.env.BASE_URL}art/${G.art.dir}/rune_${Math.min(4, r.grade)}.png)"></i>` : icon('rune')}<span class="st">${RUNE_GRADE[r.grade]}</span></button>` : `<button class="gi empty" ${attrs}><span class="xs mute">룬 칸</span></button>`;
const runeText = (r: Rune) => `${RUNE_GRADE[r.grade]} 룬 · ${G.opts[r.stat]?.name ?? r.stat} +${(runeValue(r) * 100).toFixed(1)}%`;

const STAT_NAME: Record<string, string> = { atk: '공격력', hp: '체력', def: '방어력' };
/** 강화 연출 (B 보강 §2): 아이템을 가운데 크게 → 망치·빛 → 성공이면 큰 금색 「+N」 + 능력 전→후 · 구간 돌파(+10·+20…)는 더 크게 */
function enhShow(host: HTMLElement, g: Gear, r: string, before: { enh: number; base: Record<string, number>; band: number }) {
  const up = r === 'ok' || r === 'great';
  const brk = up && enhBand(g.enh) > before.band;
  const after = gearBase(g);
  const el = document.createElement('div');
  el.className = `enhfx${up ? ' up' : ' no'}${brk ? ' brk' : ''}`;
  el.innerHTML = `<div class="stagec">${gearCell(g, 'data-big')}<span class="ham">${icon('sk_hammer')}</span><span class="ray"></span></div>
    <div class="res">${up ? `<b class="num">${fxt(`+${g.enh}`)}</b><span class="lab">${brk ? `구간 돌파! 강화 구간 ${enhBand(g.enh)}` : r === 'great' ? '대성공!' : '강화 성공!'}</span>` : `<b class="numf">${r === 'drop' ? `+${g.enh}` : '실패'}</b><span class="lab">${r === 'drop' ? '한 단계 내려갔어요' : '다음 확률이 올라요'}</span>`}
    ${up ? `<div class="cmp">${Object.keys(after).map((k) => `<span>${STAT_NAME[k]} ${fmt(before.base[k])} ${iconText('next')} <b>${fmt(after[k])}</b></span>`).join('')}</div>` : ''}<span class="xs mute">눌러서 닫기</span></div>`;
  host.append(el);
  el.onclick = () => el.remove();
}
/** 장비 상세 창 — 바뀌면 onChange (부른 화면 새로 그리기) */
export function gearPanel(g: Gear, onChange: () => void) {
  const m = document.createElement('div');
  m.className = 'modal';
  $('#stage').append(m);
  const close = () => {
    m.remove();
    onChange();
  };
  const done = (msg: string) => {
    persist();
    syncBar();
    toast(msg);
    draw();
  };
  const draw = () => {
    if (!S.items[g.uid]) return close();
    const base = gearBase(g);
    const ec = enhCost(g);
    const tc = g.tier < G.tier.max ? tierCost(g) : null;
    m.innerHTML = `<div class="panel gp">
      <div class="row gphead">${gearCell(g, 'data-big')}<div class="col grow"><b class="gname g-${gradeKey(g.grade)}">${gearName(g)} <span class="enhbig">+${g.enh}</span></b>
        <span class="xs dim">${gradeName(g.grade)} · T${g.tier} · ${iconText('star').repeat(g.star)} · 강화 구간 ${enhBand(g.enh)}/${G.enhance.bandEff.length}</span>
        <span class="md">${Object.entries(base).map(([k, v]) => `${STAT_NAME[k]} <b>${fmt(v)}</b>`).join(' · ')} <span class="xs dim">· 장비 전투력 ${fmt(gearPower(g))}${g.by ? ` · ${heroOf(g.by).name} 장착 중` : ''}</span></span></div>
        <button class="btn mini" data-a="lock">${icon('lock')} ${g.lock ? '잠금 풀기' : '잠금'}</button><button class="btn mini" data-a="close">${icon('close')}</button></div>
      <div class="grid2">
        <div class="col">
          <b class="sm">부가 옵션 (한 줄씩 바꾸기: ${icon('optTicket')} ${S.cur.optTicket ?? 0})</b>
          ${g.opts.map((o, i) => `<div class="row"><span class="grow md">${optText(o)}</span><button class="btn mini" data-reroll="${i}">바꾸기</button></div>`).join('')}
          <b class="sm">룬 칸 ${g.runes.length ? '' : '(일반 등급은 없음)'}</b>
          <div class="row">${g.runes.map((u, i) => runeCell(runeOf(u), `data-rs="${i}"`)).join('')}</div>
        </div>
        <div class="col">
          <div class="row"><span class="grow md">강화 +${g.enh}/${G.enhance.max} ${g.enh < G.enhance.max ? `<span class="xs dim">성공 ${Math.round(enhRate(g) * 100)}% · ${icon('enh')}${ec.stones} ${icon('gold')}${fmt(ec.gold)}</span>` : ''}</span><button class="btn hi" data-a="enh" ${g.enh >= G.enhance.max ? 'disabled' : ''}>${icon('sk_hammer')} 강화</button></div>
          <div class="row"><span class="grow md">별 ${g.star}/5 ${g.star < 5 ? `<span class="xs dim">성공 ${(starRate(g) * 100).toFixed(1)}% · 같은 ${gradeName(g.grade)} ${PART_NAME[g.part]} 먹이기 ${icon('gold')}${fmt(G.starUp.gold[g.star - 1])}</span>` : ''}</span><button class="btn mini" data-a="star" ${g.star >= 5 ? 'disabled' : ''}>별 올리기</button></div>
          <div class="row"><span class="grow md">티어 T${g.tier} ${tc ? `<span class="xs dim">5성 뒤 · ${icon('tierMat')}${tc.mats} ${icon('gold')}${fmt(tc.gold)}</span>` : ''}</span><button class="btn mini" data-a="tier" ${tc ? '' : 'disabled'}>티어 올리기</button></div>
          <div class="row"><span class="grow md">전수 <span class="xs dim">이 장비 강화를 같은 부위로 옮기기 (+${G.transfer.minEnh} 이상)</span></span><button class="btn mini" data-a="transfer" ${g.enh >= G.transfer.minEnh ? '' : 'disabled'}>전수</button></div>
          <div class="row"><button class="btn mini grow" data-a="sell" ${g.lock || g.by ? 'disabled' : ''}>판매 ${icon('gold')}${fmt(G.sell[g.grade])}</button><button class="btn mini grow" data-a="salvage" ${g.lock || g.by ? 'disabled' : ''}>분해 ${icon('enh')}${G.salvage[g.grade]}</button></div>
        </div>
      </div>
      <div class="pick" hidden></div>
    </div>`;
    const pick = $('.pick', m);
    const choose = (title: string, html: string, wire: () => void) => {
      pick.hidden = false;
      pick.innerHTML = `<div class="row"><b class="grow sm">${title}</b><button class="btn mini" data-x>${icon('close')}</button></div><div class="pk scroll">${html}</div>`;
      $('[data-x]', pick).onclick = () => (pick.hidden = true);
      wire();
    };
    $$('[data-a]', m).forEach(
      (b) =>
        (b.onclick = () => {
          const a = b.dataset.a;
          if (a === 'close') return close();
          if (a === 'lock') return ((g.lock = !g.lock), done(g.lock ? '잠갔어요' : '잠금을 풀었어요'));
          if (a === 'enh') {
            const before = { enh: g.enh, base: gearBase(g), band: enhBand(g.enh) };
            const r = enhance(g);
            if (r === 'poor' || r === 'max') return done(r === 'poor' ? '강화석이나 금화가 모자라요' : '최대 강화예요');
            persist();
            syncBar();
            draw();
            return enhShow(m, g, r, before);
          }
          if (a === 'tier') {
            const r = tierUp(g);
            return done({ ok: `티어 T${g.tier}!`, star: '5성이 되어야 티어를 올릴 수 있어요', poor: '티어 재료(레이드)나 금화가 모자라요', max: '최대 티어예요' }[r]);
          }
          if (a === 'sell' || a === 'salvage') {
            const v = a === 'sell' ? G.sell[g.grade] : G.salvage[g.grade];
            removeItem(g.uid);
            addCur(a === 'sell' ? 'gold' : 'enh', v);
            persist();
            syncBar();
            toast(a === 'sell' ? `금화 +${fmt(v)}` : `강화석 +${v}`);
            return close();
          }
          if (a === 'star') {
            const foods = feedable(g);
            return choose(`먹일 장비 (같은 ${gradeName(g.grade)} ${PART_NAME[g.part]} · 잠금·장착 제외)`, foods.map((f) => gearCell(f, `data-food="${f.uid}"`)).join('') || '<span class="xs mute">먹일 장비가 없어요</span>', () =>
              $$('[data-food]', pick).forEach(
                (x) =>
                  (x.onclick = () => {
                    const r = starUp(g, gearOf(+x.dataset.food!)!);
                    done({ ok: `별 올리기 성공! ${g.star}성`, fail: '실패… 다음 확률이 올라요', poor: '금화가 모자라요', bad: '먹일 수 없는 장비예요', max: '5성이에요' }[r]);
                  }),
              ),
            );
          }
          if (a === 'transfer') {
            const tos = Object.values(S.items).filter((x): x is Gear => x.kind === 'gear' && x.uid !== g.uid && x.part === g.part && !!transferPreview(g, x) && transferPreview(g, x)!.lv > x.enh);
            return choose('강화를 받을 장비 (이 장비는 사라져요)', tos.map((t) => `<div class="row">${gearCell(t)}<span class="grow xs">+${t.enh} ${iconText('next')} +${transferPreview(g, t)!.lv} · ${icon('gold')}${fmt(transferPreview(g, t)!.gold)}</span><button class="btn mini" data-to="${t.uid}">옮기기</button></div>`).join('') || '<span class="xs mute">받을 장비가 없어요</span>', () =>
              $$('[data-to]', pick).forEach(
                (x) =>
                  (x.onclick = () => {
                    const to = gearOf(+x.dataset.to!)!;
                    if (!transfer(g, to)) return toast('금화가 모자라거나 잠긴 장비예요');
                    persist();
                    syncBar();
                    toast(`전수 완료 · +${to.enh}`);
                    close();
                  }),
              ),
            );
          }
        }),
    );
    $$('[data-reroll]', m).forEach(
      (b) =>
        (b.onclick = () => {
          const line = +b.dataset.reroll!;
          const nu = rerollRoll(g, line);
          if (!nu) return toast('옵션 티켓이 모자라요 (상점)');
          persist();
          choose('옵션 바꾸기: 하나 고르세요', `<div class="row"><button class="btn grow" data-keep="old">기존: ${optText(g.opts[line])}</button><button class="btn hi grow" data-keep="new">새 옵션: ${optText(nu)}</button></div>`, () =>
            $$('[data-keep]', pick).forEach(
              (x) =>
                (x.onclick = () => {
                  if (x.dataset.keep === 'new') rerollKeep(g, line, nu);
                  done(x.dataset.keep === 'new' ? '새 옵션으로 바꿨어요' : '기존 옵션을 지켰어요');
                }),
            ),
          );
        }),
    );
    $$('[data-rs]', m).forEach(
      (b) =>
        (b.onclick = () => {
          const idx = +b.dataset.rs!;
          const rs = Object.values(S.items).filter((x): x is Rune => x.kind === 'rune').sort((a, c) => c.grade - a.grade);
          choose('꽂을 룬 (다른 장비에 꽂힌 것은 옮겨 와요)', `${g.runes[idx] != null ? '<button class="btn mini" data-ru="-1">빼기</button>' : ''}${rs.map((r) => `<div class="row">${runeCell(r)}<span class="grow xs">${runeText(r)}${r.in != null ? ' · 장착 중' : ''}</span><button class="btn mini" data-ru="${r.uid}">꽂기</button></div>`).join('') || '<span class="xs mute">룬이 없어요 (보스 스테이지 · 탑)</span>'}`, () =>
            $$('[data-ru]', pick).forEach(
              (x) =>
                (x.onclick = () => {
                  const u = +x.dataset.ru!;
                  socket(g, idx, u < 0 ? null : runeOf(u));
                  done(u < 0 ? '룬을 뺐어요' : '룬을 꽂았어요');
                }),
            ),
          );
        }),
    );
  };
  draw();
}
export { runeText };
