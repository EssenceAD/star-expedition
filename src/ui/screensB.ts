// B덩어리 화면: 영웅 정보(왼쪽 영웅 목록 · 가운데 영웅·성장 · 오른쪽 장비 6칸) · 가방(탭 5 · 정렬·일괄·제작·확장) · 상점(왼쪽 세로 카테고리 · 영웅 상점 · 장비 소환)
//  STAR_PLAN_v2 §2 — 배치는 킹스레이드 구조, 꾸밈은 2단계(토큰만)
import { CONFIG } from '../config';
import { BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOB_IDS, JOBS, ZONE_NAME, ZONES, type Zone } from '../data/jobs';
import { descPassive, descSkill } from '../data/skills';
import { autoEquip, bagUsed, fitsHero, typeName, bulk, craft, equip, expandBag, freeSummonLeft, fuseRunes, gearOf, gearPower, PART_NAME, PARTS, RUNE_GRADE, SLOT_PART, sortedGear, summon, unequip, unequipAll, type Part, type SortKey } from '../game/gear';
import { assignShards, awaken, awakenCost, canTranscend, exAtk, exNeed, exShards, exUp, heroStarCost, heroStarUp, retrait, skillCost, skillUp, transcend, TRAITS, usePotion } from '../game/growth';
import { expNeed, fullStats, heroPower, levelCap, levelMax, owned } from '../game/heroes';
import { buyCoin, buyHero, buyItem, buyPack, heroPrice, heroStock } from '../game/shop';
import { bestCleared, powIdx } from '../game/stage';
import { capLeft, GEAR_SLOTS, partyIds, persist, rollTrack, S, type Gear, type GearSlot, type Rune } from '../game/state';
import { icon, iconText } from '../theme/tokens';
import { gachaShow } from './gacha';
import { $, $$, comingSoon, CUR_DESC, CUR_NAME, esc, fmt, fullbodyUrl, fxt, go, heroPortrait, modal, register, skillIconUrl, syncBar, tabLabel, toast } from './core';
import { buyCostume, costumeStock, hasCostume, setsOf, wearCostume } from '../game/costume';
import { gearCell, gearPanel, runeCell, runeText } from './gearui';

const GR = CONFIG.growth;
const SLOT_NAME: Record<GearSlot, string> = { weapon: '무기', armor: '갑옷', acc1: '장신구 1', acc2: '장신구 2' };
const pct = (v: number) => `${(v * 100).toFixed(1).replace(/\.0$/, '')}%`;
const cost = (parts: [string, number][]) => parts.filter(([, n]) => n).map(([k, n]) => `${icon(k)}${fmt(n)}`).join(' ');
/** 장비 레벨 기준 (소환·제작): 가장 높이 깬 스테이지 */
const ilvNow = () => {
  const b = bestCleared();
  return b ? powIdx(b) : 0;
};
const say = (r: string, m: Record<string, string>) => toast(m[r] ?? r);

// ───────── 영웅 정보 ─────────
/** 탭 4개 (FINAL_1018 §4): 일반 · 스킬 · 장비 · 성장 — 글씨만 · 탭마다 예전 칸 묶음 */
const HERO_TABS: [string, string, string[]][] = [['info', '일반', ['info', 'costume']], ['skill', '스킬', ['skill']], ['gear', '장비', ['ex']], ['grow', '성장', ['grow', 'trans']]];
register('hero', {
  title: (p) => `${icon('heroes')} 영웅 정보 · ${heroOf(p.id as string).name}`,
  back: (p) => (p.from ? go('prep', p.from as Record<string, unknown>, false) : p.shop ? go('shop', { cat: 'hero' }, false) : go('heroes', {}, false)),
  enter(root, p) {
    let id = p.id as string;
    let tab = HERO_TABS.some(([k]) => k === p.tab) ? (p.tab as string) : 'grow';
    const draw = () => {
      const h = heroOf(id);
      const own = owned(id);
      const hs = S.heroes[id];
      const { st, raw } = fullStats(id);
      const list = [...partyIds(), ...HEROES.map((x) => x.id).filter((x) => owned(x) && !partyIds().includes(x))];
      const cap = CONFIG.gear.cap;
      const capRow = (name: string, k: 'crit' | 'spd' | 'dmgCut' | 'critDmg', v: number) => `<div class="kv"><span>${name}</span><b>${k === 'critDmg' ? `×${v.toFixed(2)}` : pct(v)} <span class="cap xs ${raw[k] > cap[k] ? 'bad' : 'dim'}">${raw[k] > cap[k] ? `상한 넘침 ${k === 'critDmg' ? (raw[k] - cap[k]).toFixed(2) : pct(raw[k] - cap[k])}` : `상한까지 ${k === 'critDmg' ? (cap[k] - raw[k]).toFixed(2) : pct(cap[k] - raw[k])}`}</span></b></div>`;
      root.innerHTML = `<div class="body">
        <div class="col hlist scroll">${list.map((x) => `<button class="btn hrow${x === id ? ' on' : ''}" data-id="${x}" title="${heroOf(x).name} Lv.${S.heroes[x].lv}"><div class="pt s" style="background-image:url(${heroPortrait(x)})"></div><span class="xs">${heroOf(x).name}</span><span class="hst">${iconText('star').repeat(S.heroes[x].star ?? 1)}</span><b class="hlv">Lv.${S.heroes[x].lv}</b></button>`).join('')}</div>
        <div class="fbcol"><div class="fb" style="background-image:url(${fullbodyUrl(id)})"></div>${hs?.costume ? `<span class="chip xs">${esc(CONFIG.costume[hs.costume]?.name ?? '')}</span>` : ''}</div>
        <div class="col grow">
          <div class="row panel"><div class="pt l" style="background-image:url(${heroPortrait(id)})"></div>
            <div class="col grow"><b>${h.name} <span class="stars">${iconText('star').repeat(hs?.star ?? 1)}</span>${hs?.awaken ? ` <span class="chip">각성 ${hs.awaken}</span>` : ''}</b>
              <span class="xs dim">${h.title} · ${JOBS[h.job].name} · ${ZONE_NAME[JOBS[h.job].zone]}</span>
              <span class="xs dim">전투력 <b class="gold">${fmt(heroPower(id))}</b></span>
              <span class="xs mute fit2 fit" data-min="${CONFIG.ui.fit.desc}">${esc(h.concept)}</span></div></div>
          <div class="tabs htabs">${HERO_TABS.map(([k, n]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>
          <div class="panel col grow scroll">${!own ? previewHtml(id) : HERO_TABS.find(([k]) => k === tab)![2].map((t) => tabHtml(t, id)).join('<hr class="tsep">')}</div>
        </div>
        <div class="col eq">
          <div class="slots">${GEAR_SLOTS.map((k) => `<div class="col sl">${gearCell(gearOf(hs?.gear[k]), `data-slot="${k}"`, SLOT_NAME[k], k === 'weapon' ? 'slot_weapon' : k === 'armor' ? 'slot_armor' : 'slot_acc')}<span class="xs mute">${SLOT_NAME[k]}</span></div>`).join('')}
            <div class="col sl"><button class="gi ex${hs?.ex ? ' on' : ' empty pic'}" data-tab="gear" title="전용 무기">${hs?.ex ? icon('exShard') : icon('exShard', 'slotpic')}${hs?.ex ? `<span class="st">${iconText('star').repeat(hs.ex)}</span>` : ''}</button><span class="xs mute">전용 무기</span></div>
            <div class="col sl"><button class="gi empty pic" data-treasure title="전용 보물">${icon('lock', 'slotpic')}</button><span class="xs mute">전용 보물</span></div></div>
          <div class="row"><button class="btn mini grow" data-auto ${own ? '' : 'disabled'}>자동 장착</button><button class="btn mini grow" data-off ${own ? '' : 'disabled'}>모두 해제</button></div>
          <div class="panel col stats">
            <div class="kv"><span>${icon('hp')}체력</span><b>${fmt(st.hp)}</b></div><div class="kv"><span>${icon('atk')}공격력</span><b>${fmt(st.atk)}</b></div><div class="kv"><span>${icon('def')}방어력</span><b>${fmt(st.def)}</b></div>
            ${capRow(`${icon('crit')}치명타`, 'crit', st.crit)}${capRow(`${icon('critDmg')}치명 피해`, 'critDmg', st.critDmg)}${capRow(`${icon('spd')}공격 속도`, 'spd', st.spd)}${capRow(`${icon('def')}받는 피해 감소`, 'dmgCut', st.dmgCut)}
          </div>
        </div></div>`;
      $$('[data-id]', root).forEach((b) => (b.onclick = () => ((id = b.dataset.id!), draw())));
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $('[data-treasure]', root).onclick = () => comingSoon('전용 보물(영웅 외전에서 해금)', 'C');
      // 미리보기 영입 → 영입 무대 → 끝나면 이 화면 다시 (이제 가진 영웅)
      const rb = root.querySelector<HTMLElement>('.preview [data-hero]');
      if (rb) rb.onclick = () => recruitShow(id, () => (persist(), syncBar(), draw()));
      if (!own) return;
      $('[data-auto]', root).onclick = () => {
        const n = autoEquip(id);
        persist();
        toast(n ? `${n}칸 바꿨어요` : '더 좋은 장비가 없어요');
        draw();
      };
      $('[data-off]', root).onclick = () => {
        unequipAll(id);
        persist();
        draw();
      };
      $$('[data-slot]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const slot = b.dataset.slot as GearSlot;
            const cur = gearOf(S.heroes[id].gear[slot]);
            const cands = sortedGear('power').filter((g) => g.part === SLOT_PART[slot] && g.uid !== cur?.uid && fitsHero(g, id));
            const m = modal(`${SLOT_NAME[slot]} 고르기`, `${cur ? `<div class="row">${gearCell(cur, 'data-detail')}<span class="grow sm">지금: ${typeName(cur)} · 전투력 ${fmt(gearPower(cur))}</span><button class="btn mini" data-un>빼기</button></div>` : ''}<div class="pk">${cands.map((g) => gearCell(g, `data-g="${g.uid}"`)).join('') || `<span class="xs mute">맞는 장비가 없어요${slot === 'weapon' ? ` (${heroOf(id).name}은(는) ${CONFIG.gear.types.name[CONFIG.gear.types.weaponOf[heroOf(id).job]]}만)` : ''}</span>`}</div>`, [['닫기', null]]);
            const closeM = () => m.remove();
            $$('[data-g]', m).forEach(
              (x) =>
                (x.onclick = () => {
                  equip(id, slot, gearOf(+x.dataset.g!)!);
                  persist();
                  closeM();
                  draw();
                }),
            );
            const un = $('[data-un]', m);
            if (un)
              un.onclick = () => {
                unequip(id, slot);
                persist();
                closeM();
                draw();
              };
            const det = $('[data-detail]', m);
            if (det && cur) det.onclick = () => (closeM(), gearPanel(cur, draw));
          }),
      );
      wireTab(root, id, draw);
    };
    draw();
  },
});
/** 아직 없는 영웅 미리보기 (PLAYTEST §12): 스킬 3개 + 패시브 · 능력치는 오른쪽 판(1레벨 기준) · 영입 버튼 */
function previewHtml(id: string): string {
  const h = heroOf(id);
  return `<div class="row preview"><span class="grow sm">미보유 · Lv.1 기준</span><button class="btn hi" data-hero="${id}">${icon('stardust')}${fmt(heroPrice(id))} 영입</button></div>
    <div class="panel col"><b class="sm">패시브 · ${h.passive.name}</b><span class="xs dim">${descPassive(h.passive)}</span></div>
    ${h.skills.map((s, i) => `<div class="skl"><div class="si ski" style="background-image:url(${skillIconUrl(id, i)})"></div><div class="col grow"><b class="skn">${s.name}<span class="skm">마나 <i>${s.cost}</i> · <i>${s.cd}</i>초</span></b><span class="skd">${descSkill(s)}</span></div></div>`).join('')}`;
}
function tabHtml(tab: string, id: string): string {
  const hs = S.heroes[id];
  const h = heroOf(id);
  if (tab === 'grow') {
    const cap = levelCap(id);
    const ac = hs.awaken < GR.awaken.stones.length ? awakenCost(hs.awaken) : null;
    const sc = hs.star < 5 ? heroStarCost(hs.star) : null;
    // 성장 길 (B 보강 §1): 레벨 상한 → 각성 1~5 → 초월 1~5 → 만렙
    const HC = CONFIG.hero;
    const steps = [`Lv.${HC.levelCap[0]}`, ...HC.levelCap.slice(1).map((_, i) => `각성${i + 1}`), ...GR.transcend.stones.map((_, i) => `초월${i + 1}`)];
    // 칩 줄 대신: 별 5개 + 각성 점 5개 + 초월 (HARMONY §2)
    // ◇ 대신 지도 별 그림 (FINAL_1018 §4 · ui/map/star_on·star_off)
    const dots = (n: number, on: number) => Array.from({ length: n }, (_, i) => `<i class="stpic${i < on ? ' on' : ''}">${icon('star')}</i>`).join('');
    const road = `<div class="road2" title="${steps.join(` ${iconText('next')} `)}"><span class="stp">${dots(5, hs.star)}</span><span class="dots">각성 ${dots(5, hs.awaken)}</span><span class="dots">초월 ${dots(5, hs.trans.length)}</span><b>만렙 ${levelMax()}</b></div>`;
    return `${road}<div class="kv"><span>레벨</span><b>${hs.lv} / ${cap} <span class="xs dim">(${fmt(hs.exp)} / ${fmt(expNeed(hs.lv))})</span></b></div>
      <div class="xbar"><i style="width:${Math.min(100, (hs.exp / expNeed(hs.lv)) * 100)}%"></i></div>
      <div class="row"><span class="grow md">${icon('exp')} 경험치 물약 ${S.cur.exp ?? 0}개 <span class="xs dim">(1개 = ${fmt(GR.potionExp)})</span></span><button class="btn mini" data-pot="1">1개</button><button class="btn mini" data-pot="10">10개</button></div>
      <div class="row"><span class="grow md col">각성 ${hs.awaken}/5 <span class="xs dim">레벨 상한 ${cap}${ac ? ` ${iconText('next')} ${cap + CONFIG.hero.levelCap[hs.awaken + 1] - CONFIG.hero.levelCap[hs.awaken]} · 레벨 ${cap} 필요</span><span class="xs dim">${cost([['awakenStone', ac.stones], ['gold', ac.gold]])}` : ''}</span></span><button class="btn mini hi" data-g="awaken" ${ac ? '' : 'disabled'}>각성</button></div>
      <div class="row"><span class="grow md">별 ${hs.star}/5 <span class="xs dim">별마다 능력 +${pct(GR.star.stat)}${sc ? ` · ${cost([['stardust', sc.dust], ['gold', sc.gold]])}` : ''}</span></span><button class="btn mini" data-g="star" ${sc ? '' : 'disabled'}>별 올리기</button></div>`;
  }
  if (tab === 'skill')
    return `<div class="md skhead">${icon('skillBook')} 스킬북 ${S.cur.skillBook ?? 0}권 · 레벨마다 피해·회복·보호막 +${pct(GR.skill.perLv)}</div>
      <div class="panel col"><b class="sm">패시브 · ${h.passive.name}</b><span class="xs dim">${descPassive(h.passive)}</span></div>
      ${h.skills.map((s, i) => {
        const lv = hs.skill[i];
        const c = lv < GR.skill.max ? skillCost(lv) : null;
        return `<div class="skl"><div class="si ski" style="background-image:url(${skillIconUrl(id, i)})"></div><div class="col grow"><b class="skn fit" data-min="${CONFIG.ui.fit.desc}">${s.name} <span class="lvn">Lv.${lv}</span><span class="skm">마나 <i>${s.cost}</i> · <i>${s.cd}</i>초</span></b><span class="skd fit" data-min="${CONFIG.ui.fit.desc}">${descSkill(s, 1 + GR.skill.perLv * (lv - 1))}</span></div><button class="btn mini" data-sk="${i}" ${c ? '' : 'disabled'}>${c ? `올리기 ${cost([['skillBook', c.books], ['gold', c.gold]])}` : '최대'}</button></div>`;
      }).join('')}`;
  if (tab === 'trans') {
    const can = canTranscend(id);
    return `<div class="md">${icon('transStone')} 초월석 ${S.cur.transStone ?? 0} · 조건: ${GR.transcend.needStar}성 + 각성 ${GR.transcend.needAwaken} ${can ? `<b class="good">${iconText('check')}</b>` : `<b class="bad">${iconText('cross')}</b>`} · 단계마다 둘 중 하나 (고른 것은 무료로 다시 바꿀 수 있어요)</div>
      ${TRAITS.map((pair, i) => {
        const done = i < hs.trans.length;
        const next = i === hs.trans.length;
        return `<div class="row trow"><b class="sm">${i + 1}단계</b>${pair.map((t, j) => `<button class="btn mini grow${done && hs.trans[i] === j ? ' on' : ''}" ${done ? `data-re="${i}"` : next && can ? `data-tr="${j}"` : 'disabled'}>${t.name}</button>`).join('')}${next ? `<span class="xs dim">${cost([['transStone', GR.transcend.stones[i]], ['gold', GR.transcend.gold[i]]])}</span>` : ''}</div>`;
      }).join('')}`;
  }
  if (tab === 'ex')
    return `<div class="md">${icon('exShard')} 전용 무기 ${h.exWeapon ? `「${h.exWeapon}」` : `(${JOBS[h.job].weapon})`} · ${hs.ex ? `${hs.ex}성 · 공격력 +${pct(exAtk(hs.ex))}` : '아직 없음'}</div>
      <div class="kv"><span>이 영웅 조각</span><b>${exShards(id)} / ${hs.ex >= 5 ? '-' : exNeed(id)}</b></div>
      <div class="row"><span class="grow xs dim">공용 조각 ${S.cur.exShard ?? 0}개 (상점)을 이 영웅에게</span><button class="btn mini" data-sh="10" ${(S.cur.exShard ?? 0) >= 10 ? '' : 'disabled'}>10개 넣기</button></div>
      <button class="btn hi" data-exup ${hs.ex < 5 && exShards(id) >= exNeed(id) ? '' : 'disabled'}>${hs.ex ? '별 올리기' : '만들기'}</button>
      <span class="xs mute">장착하면 외형이 바뀌는 자리 (그림은 3단계) · 고유 옵션·룬은 B 다음 단계에서</span>`;
  if (tab === 'costume') {
    const sets = setsOf(id);
    return `<div class="cards costumes">${[null, ...sets].map((k) => {
      const on = (hs.costume ?? null) === k;
      const own = !k || hasCostume(k, id);
      return `<div class="panel col shopc costume${on ? ' on' : ''}"><div class="fbc" style="background-image:url(${fullbodyUrl(id, k)})"></div><b class="sm">${k ? esc(CONFIG.costume[k].name) : '기본'}</b>${on ? '<span class="xs good">입는 중</span>' : own ? `<button class="btn mini hi" data-wear="${k ?? ''}">입기</button>` : `<button class="btn mini" data-cbuy="${k}">${icon('stardust')}${fmt(CONFIG.costume[k!].dust)}</button>`}</div>`;
    }).join('')}</div>${sets.length ? '' : '<span class="xs mute">이 영웅 코스튬은 다음 묶음에서 나와요</span>'}`;
  }
  if (tab === 'costume_old')
    return `<div class="md">코스튬 칸 (STAR_PLAN_v2 §4 · 그림은 3단계)</div>
      <div class="cards">${[['기본', true], ['별 3 해금 코스튬', hs.star >= 3], ['별 5 해금 코스튬', hs.star >= 5], ['상점 코스튬', false]].map(([n, open]) => `<div class="panel col shopc"><b class="sm">${n}</b><span class="xs ${open ? 'good' : 'mute'}">${open ? (n === '기본' ? '입는 중' : '해금 · 그림 준비 중') : n === '상점 코스튬' ? '상점 「코스튬」 (준비 중)' : '잠김'}</span></div>`).join('')}</div>`;
  const bonds = BONDS.filter((x) => x.members.includes(id));
  return `<b class="sm">인연</b>${bonds.map((x) => `<div class="md"><b class="gold">${x.name}</b> <span class="dim">${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)</span></div>`).join('') || '<span class="xs mute">인연 조합 없음</span>'}`;
}
function wireTab(root: HTMLElement, id: string, draw: () => void) {
  const after = (r: string, m: Record<string, string>) => {
    persist();
    syncBar();
    say(r, m);
    draw();
  };
  // 코스튬: 입기 · (영웅 정보에서) 사기
  $$('[data-wear]', root).forEach((b) => (b.onclick = () => (wearCostume(id, b.dataset.wear || null), persist(), draw())));
  $$('[data-cbuy]', root).forEach((b) => (b.onclick = () => after(buyCostume(b.dataset.cbuy!, id), { ok: '코스튬을 샀어요', poor: '별가루가 모자라요', owned: '이미 있어요' })));
  $$('[data-pot]', root).forEach((b) => (b.onclick = () => after(String(usePotion(id, +b.dataset.pot!)), { '-1': '경험치 물약이 없어요 (상점)', '0': '경험치를 넣었어요' })));
  const aw = root.querySelector<HTMLElement>('[data-g="awaken"]');
  if (aw) aw.onclick = () => after(awaken(id), { ok: '각성! 레벨 상한이 올랐어요', need: '레벨이 상한이어야 해요', poor: '각성석이나 금화가 모자라요', max: '최대 각성' });
  const sb = root.querySelector<HTMLElement>('[data-g="star"]');
  if (sb) sb.onclick = () => after(heroStarUp(id), { ok: '별이 올랐어요!', poor: '별가루나 금화가 모자라요', max: '5성이에요' });
  $$('[data-sk]', root).forEach((b) => (b.onclick = () => after(skillUp(id, +b.dataset.sk! as 0 | 1 | 2), { ok: '스킬 레벨 업!', poor: '스킬북이나 금화가 모자라요', max: '최대 레벨' })));
  $$('[data-tr]', root).forEach((b) => (b.onclick = () => after(transcend(id, +b.dataset.tr! as 0 | 1), { ok: '초월!', poor: '초월석이나 금화가 모자라요', need: '조건이 모자라요', max: '최대 초월' })));
  $$('[data-re]', root).forEach((b) => (b.onclick = () => (retrait(id, +b.dataset.re!), after('ok', { ok: '특성을 바꿨어요' }))));
  const sh = root.querySelector<HTMLElement>('[data-sh]');
  if (sh) sh.onclick = () => after(assignShards(id, 10) ? 'ok' : 'poor', { ok: '조각을 넣었어요', poor: '조각이 모자라요' });
  const ex = root.querySelector<HTMLElement>('[data-exup]');
  if (ex) ex.onclick = () => after(exUp(id), { ok: '전용 무기가 빛나요!', poor: '조각이 모자라요', max: '5성이에요' });
}

// ───────── 가방 ─────────
register('bag', {
  title: () => `${icon('bag')} 가방 (${bagUsed()}/${S.bagSize})`,
  enter(root, p) {
    let tab = (p.tab as string) ?? 'gear';
    let sort: SortKey = 'grade';
    const draw = () => {
      const tabs = [['gear', '장비', 'bag_gear'], ['grow', '성장', 'bag_growth'], ['use', '소모품', 'bag_consume'], ['rune', '룬', 'bag_rune'], ['etc', '기타', 'bag_etc']];
      const curs: Record<string, string[]> = { grow: ['exp', 'skillBook', 'awakenStone', 'transStone', 'exShard'], use: ['enh', 'optTicket'], etc: ['tierMat', 'gold', 'stardust'] };
      let body = '';
      if (tab === 'gear') {
        body = `<div class="row">${(['grade', 'power', 'enh', 'part'] as SortKey[]).map((k) => `<button class="tab${sort === k ? ' on' : ''}" data-sort="${k}">${tabLabel(`icons/${{ grade: 'star', power: 'power', enh: 'levelup', part: 'slot_armor' }[k]}`, { grade: '등급', power: '전투력', enh: '강화', part: '부위' }[k])}</button>`).join('')}<span class="grow"></span>
          <select data-g class="tab">${CONFIG.gear.grades.map((g, i) => `<option value="${i}">${g.name} 이하</option>`).join('')}</select><button class="btn mini" data-bulk="sell">${tabLabel('tabs/sell', '일괄 판매')}</button><button class="btn mini" data-bulk="salvage">${tabLabel('tabs/dismantle', '일괄 분해')}</button><button class="btn mini" data-craft>${tabLabel('tabs/craft', '제작')}</button></div>
          <div class="pk grow scroll">${sortedGear(sort).map((g) => gearCell(g, `data-gear="${g.uid}"`)).join('') || '<span class="mute">장비가 없어요 · 스테이지·장비 소환·제작으로 얻어요</span>'}${'<i class="gi slot"></i>'.repeat(Math.max(0, CONFIG.ui.bagShowMin - sortedGear(sort).length))}</div>`;
      } else if (tab === 'rune') {
        const rs = Object.values(S.items).filter((x): x is Rune => x.kind === 'rune').sort((a, b) => b.grade - a.grade);
        body = `<div class="row">${RUNE_GRADE.slice(0, -1).map((n, i) => `<button class="btn mini" data-fuse="${i}">${n} ${CONFIG.rune.fuse}개 합성</button>`).join('')}</div>
          <div class="col grow scroll">${rs.map((r) => `<div class="row">${runeCell(r)}<span class="grow xs">${runeText(r)}${r.in != null ? ' · 장비에 꽂힘' : ''}</span></div>`).join('') || '<span class="mute">룬이 없어요 · 보스 스테이지에서 가끔 (탑은 C덩어리)</span>'}</div>`;
      } else body = `<div class="pk grow">${curs[tab].map((k) => `<div class="gi cur-cell">${icon(k)}<b class="xs">${fmt(S.cur[k] ?? 0)}</b><span class="xs mute">${CUR_NAME[k] ?? k}</span></div>`).join('')}</div>`;
      root.innerHTML = `<div class="body"><div class="col grow">
          <div class="row"><div class="tabs">${tabs.map(([k, n, pic]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${tabLabel(`tabs/${pic}`, n)}</button>`).join('')}</div><span class="grow"></span><span class="sm">칸 ${bagUsed()}/${S.bagSize}</span><button class="btn mini" data-expand ${S.bagSize >= CONFIG.gear.bag.max ? 'disabled' : ''}>칸 +${CONFIG.gear.bag.step} ${icon('stardust')}${CONFIG.gear.bag.dust}</button></div>
          ${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-sort]', root).forEach((b) => (b.onclick = () => ((sort = b.dataset.sort as SortKey), draw())));
      $$('[data-gear]', root).forEach((b) => (b.onclick = () => gearPanel(S.items[+b.dataset.gear!] as Gear, draw)));
      $('[data-expand]', root).onclick = () => {
        if (!expandBag()) return toast('별가루가 모자라요');
        persist();
        syncBar();
        draw();
      };
      $$('[data-bulk]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const mode = b.dataset.bulk as 'sell' | 'salvage';
            const g = +$<HTMLSelectElement>('[data-g]', root).value;
            modal(mode === 'sell' ? '일괄 판매' : '일괄 분해', `<p class="dim">${CONFIG.gear.grades[g].name} 이하 · 잠기지 않고 장착 안 한 장비를 모두 ${mode === 'sell' ? '팔아요(금화)' : '분해해요(강화석)'}.</p>`, [
              ['그만두기', null],
              ['확인', () => {
                const r = bulk(mode, g);
                persist();
                syncBar();
                toast(`${r.n}개 정리 · ${mode === 'sell' ? '금화' : '강화석'} +${fmt(r.got)}`);
                draw();
              }, true],
            ]);
          }),
      );
      $$('[data-fuse]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const r = fuseRunes(+b.dataset.fuse!);
            persist();
            syncBar();
            toast(r ? `${RUNE_GRADE[r.grade]} 룬이 나왔어요` : `같은 등급 룬 ${CONFIG.rune.fuse}개(안 꽂힌 것)나 금화가 모자라요`);
            draw();
          }),
      );
      const cr = root.querySelector<HTMLElement>('[data-craft]');
      if (cr)
        cr.onclick = () => {
          const m = modal('장비 제작', `<p class="dim">${CONFIG.gear.grades[CONFIG.gear.craft.grade].name} 등급 확정 · ${icon('enh')}${CONFIG.gear.craft.stones} ${icon('gold')}${fmt(CONFIG.gear.craft.gold)}</p><div class="row">${PARTS.map((pt) => `<button class="btn grow" data-part="${pt}">${PART_NAME[pt]}</button>`).join('')}</div>`, [['닫기', null]]);
          $$('[data-part]', m).forEach(
            (x) =>
              (x.onclick = () => {
                const r = craft(x.dataset.part as Part, ilvNow());
                m.remove();
                if (r === 'poor') return toast('강화석이나 금화가 모자라요');
                if (r === 'full') return toast('가방이 가득 찼어요');
                persist();
                syncBar();
                toast('제작 완료!');
                draw();
              }),
          );
        };
    };
    draw();
  },
});

/** 영웅 카드 (상점 · 영웅 목록 「미보유」 같은 카드): 큰 그림 · 직업·위치 배지 · 한 줄 소개 · 가격 — 멤버·오리지널 구분 없음 */
export function heroShopCard(id: string) {
  const h = heroOf(id);
  const j = JOBS[h.job];
  // 오른쪽 위 직업 아이콘 원 (직업색 · MOBILE_REF §3-C)
  return `<div class="panel col shopc hero" data-h="${id}"><div class="pt card" style="background-image:url(${heroPortrait(id)})"></div><div class="band"><div class="row xs chips"><span class="chip">${icon(`zone_${j.zone}`)} ${ZONE_NAME[j.zone]}</span><span class="chip">${icon(h.job)} ${j.name}</span></div><b class="fit" data-min="${CONFIG.ui.fit.name}">${esc(h.name)}</b><button class="btn hi" data-hero="${id}">${icon('stardust')}${fmt(heroPrice(id))}</button></div></div>`;
}

/** 영웅 영입 무대 (docs/ART_DONE_1017_3.md §2): recruit.jpg 위 가운데 전신 · 이름·직업·소개·값 → 영입하면 별빛 마법진에서 솟아오르는 합류 연출 */
export function recruitShow(id: string, done: () => void) {
  const h = heroOf(id);
  const j = JOBS[h.job];
  const el = document.createElement('div');
  el.className = 'recruit';
  el.style.backgroundImage = `url(${BASE}art/screens/recruit.jpg)`;
  const stage = () => {
    el.innerHTML = `<div class="rc-fb" style="background-image:url(${fullbodyUrl(id, null)})"></div>
      <div class="rc-info panel col"><small class="dim">${esc(h.title)}</small><b class="rc-name">${fxt(h.name)}</b>
        <div class="row xs"><span class="chip">${icon(`zone_${j.zone}`)} ${ZONE_NAME[j.zone]}</span><span class="chip">${icon(h.job)} ${j.name}</span></div>
        <p class="sm">${esc(h.concept)}</p>
        <div class="row"><button class="btn" data-x>그만두기</button><button class="btn hi big" data-buy ${owned(id) ? 'disabled' : ''}>${owned(id) ? '이미 있어요' : `${icon('stardust')}${fmt(heroPrice(id))} 영입`}</button></div></div>`;
    $('[data-x]', el).onclick = () => el.remove();
    $('[data-buy]', el).onclick = (e) => {
      // 같은 클릭이 합류 연출(눌러서 닫기)까지 올라가 바로 닫히지 않게
      e.stopPropagation();
      const r = buyHero(id);
      if (r !== 'ok') return say(r, { poor: '별가루가 모자라요', owned: '이미 있어요' });
      done();
      joined();
    };
  };
  const joined = () => {
    el.classList.add('joined');
    el.innerHTML = `<div class="rc-circle"></div><div class="rc-frame"><div class="rc-face" style="background-image:url(${heroPortrait(id)})"></div></div><div class="rc-fb rise" style="background-image:url(${fullbodyUrl(id, null)})"></div><div class="rc-join">${fxt(`${h.name} 합류!`)}</div><span class="xs rc-tap">눌러서 계속</span>`;
    el.onclick = () => el.remove();
  };
  stage();
  $('#stage').append(el);
}
const BASE = import.meta.env.BASE_URL;

// ───────── 상점 (왼쪽 세로 카테고리) ─────────
register('shop', {
  title: `${icon('shop')} 상점`,
  enter(root, p) {
    let cat = (p.cat as string) ?? 'special';
    let zone = 'all';
    let job = 'all';
    const draw = () => {
      const cats = [['special', '스페셜', 'shop_special'], ['goods', '재화·소모품', 'shop_material'], ['hero', '영웅', 'shop_hero'], ['costume', '코스튬', 'shop_costume'], ['summon', '장비 소환', 'shop_summon'], ['coin', '특수 재화', 'shop_exchange']];
      let body = '';
      if (cat === 'special')
        body = `<div class="cards">${CONFIG.shop.packs.map((pk) => `<div class="panel col shopc"><b>${pk.name}</b><span class="xs dim">${Object.entries(pk.give).map(([k, v]) => `${icon(k)}${fmt(v)}`).join(' ')}</span>${pk.once ? '<span class="xs mute">한 번만</span>' : ''}<button class="btn hi" data-pack="${pk.id}" ${S.shop.packs.includes(pk.id) ? 'disabled' : ''}>${S.shop.packs.includes(pk.id) ? '샀어요' : `${icon('stardust')}${fmt(pk.dust)}`}</button></div>`).join('')}
          <div class="panel col shopc"><b>오늘의 추천</b><span class="xs dim">${icon('summon')} 장비 무료 소환 ${freeSummonLeft()}회</span><button class="btn" data-cat="summon">가 보기</button></div></div>`;
      else if (cat === 'goods')
        body = `<div class="cards goods">${CONFIG.shop.items.map((it) => `<div class="panel col shopc"><span class="gpic">${icon(Object.keys(it.give)[0])}</span><b class="sm">${it.name}</b><span class="xs dim use">${CUR_DESC[Object.keys(it.give)[0]] ?? ''}</span><button class="btn" data-item="${it.id}">${it.gold ? `${icon('gold')}${fmt(it.gold)}` : `${icon('stardust')}${fmt(it.dust ?? 0)}`}</button></div>`).join('')}</div>`;
      else if (cat === 'hero') {
        const stock = heroStock(S, zone === 'all' ? undefined : (zone as Zone)).filter((h) => job === 'all' || heroOf(h.id).job === job);
        rollTrack(S);
        body = `<div class="xs dim capline">이번 주 별가루 획득 ${fmt(CONFIG.econ.cap.stardust - capLeft('stardust'))} / ${fmt(CONFIG.econ.cap.stardust)} <span class="mute">(상한을 채워도 사냥은 계속 · 금화·경험치·장비는 그대로)</span></div><div class="row jobbar"><div class="tabs grow jobs">${[['all', '전체'], ...JOB_IDS.map((k) => [k, JOBS[k].name])].map(([k, n]) => `<button class="tab${job === k ? ' on' : ''}" data-job="${k}">${n}</button>`).join('')}</div><select class="tab" data-zsel>${[['all', '전체 보기'], ...ZONES.map((z) => [z, `${ZONE_NAME[z]}만`])].map(([k, n]) => `<option value="${k}" ${zone === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div class="cards hcards">${stock.map((h) => heroShopCard(h.id)).join('') || '<span class="mute">모든 영웅을 모았어요!</span>'}</div>`;
      } else if (cat === 'summon') {
        const sm = CONFIG.gear.summon;
        body = `<div class="cards"><div class="panel col shopc"><b>장비 소환 1회</b><span class="xs dim">등급: ${CONFIG.gear.grades.map((g, i) => (sm.weights[i] ? `${g.name} ${sm.weights[i]}%` : '')).filter(Boolean).join(' · ')}</span><button class="btn hi" data-sum="1">${freeSummonLeft() ? '오늘 무료!' : `${icon('stardust')}${sm.one}`}</button></div>
          <div class="panel col shopc"><b>장비 소환 10+1회</b><span class="xs dim">11개 · 같은 확률</span><button class="btn hi" data-sum="11">${icon('stardust')}${fmt(sm.ten)}</button></div></div>
          <span class="xs mute">뽑기는 장비·코스튬만, 게임 재화로만 (영웅 뽑기 없음) · 전용 무기 조각은 재화·소모품</span><div class="pk" data-out></div>`;
      } else if (cat === 'costume')
        body = `<div class="capline xs">${Object.values(CONFIG.costume).map((c) => `「${esc(c.name)}」 ${c.heroes.length}벌`).join(' · ')} — 산 코스튬은 영웅 정보 「코스튬」에서 입어요 (전신 그림이 바뀌어요)</div><div class="cards costumes">${costumeStock().map(({ set, id }) => {
          const own = hasCostume(set, id);
          return `<div class="panel col shopc costume"><div class="fbc" style="background-image:url(${fullbodyUrl(id, set)})"></div><b class="sm">${esc(heroOf(id).name)}</b><span class="xs dim">${esc(CONFIG.costume[set].name)}</span>${own ? '<span class="xs good">가짐</span>' : `<button class="btn mini hi" data-cbuy="${set}" data-cid="${id}">${icon('stardust')}${fmt(CONFIG.costume[set].dust)}</button>`}</div>`;
        }).join('')}</div>`;
      else
        body = `<div class="cards">${CONFIG.shop.coins.map((c) => `<div class="panel col shopc"><b class="sm">${c.name}</b><span class="xs dim use">${CUR_DESC[Object.keys(c.give)[0]] ?? ''}</span><span class="xs mute">${c.coin === 'arenaCoin' ? '결투장' : '탑'} 코인 상점</span><button class="btn" data-coin="${c.id}">${icon(c.coin)}${c.price}</button></div>`).join('')}</div><span class="xs mute">보유: ${icon('arenaCoin')}${S.cur.arenaCoin ?? 0} · ${icon('towerCoin')}${S.cur.towerCoin ?? 0} · 길드 코인은 길드 상점에서 써요</span>`;
      root.innerHTML = `<div class="body"><div class="col shopcats">${cats.map(([k, n, pic]) => `<button class="tab${cat === k ? ' on' : ''}" data-cat="${k}">${tabLabel(`tabs/${pic}`, n)}</button>`).join('')}</div><div class="col grow scroll">${body}</div></div>`;
      $$('[data-cat]', root).forEach((b) => (b.onclick = () => ((cat = b.dataset.cat!), draw())));
      $$('[data-job]', root).forEach((b) => (b.onclick = () => ((job = b.dataset.job!), draw())));
      const zs = root.querySelector<HTMLSelectElement>('[data-zsel]');
      if (zs) zs.onchange = () => ((zone = zs.value), draw());
      const after = (r: string, m: Record<string, string>) => {
        persist();
        syncBar();
        say(r, m);
        draw();
      };
      $$('[data-pack]', root).forEach((b) => (b.onclick = () => after(buyPack(b.dataset.pack!), { ok: '꾸러미를 받았어요', poor: '별가루가 모자라요', done: '이미 샀어요' })));
      $$('[data-item]', root).forEach((b) => (b.onclick = () => after(buyItem(b.dataset.item!), { ok: '샀어요', poor: '재화가 모자라요', cap: '이번 주 획득 상한이에요 (월요일에 다시 차요)' })));
      $$('[data-coin]', root).forEach((b) => (b.onclick = () => after(buyCoin(b.dataset.coin!), { ok: '샀어요', poor: '코인이 모자라요', cap: '이번 주 획득 상한이에요 (월요일에 다시 차요)' })));
      // 영웅 카드를 누르면 영웅 정보(미보유 미리보기) — 가격 버튼은 바로 영입 (PLAYTEST §12)
      $$('.shopc.hero[data-h]', root).forEach((c) => (c.onclick = () => go('hero', { id: c.dataset.h, shop: true })));
      $$('[data-hero]', root).forEach(
        (b) =>
          (b.onclick = (e) => {
            e.stopPropagation();
            recruitShow(b.dataset.hero!, () => {
              persist();
              syncBar();
              draw();
            });
          }),
      );
      $$('[data-cbuy]', root).forEach((b) => (b.onclick = () => after(buyCostume(b.dataset.cbuy!, b.dataset.cid!), { ok: '코스튬을 샀어요 · 영웅 정보에서 입어 봐요', poor: '별가루가 모자라요', owned: '이미 있어요' })));
      $$('[data-sum]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const n = +b.dataset.sum! as 1 | 11;
            // 소환 → 전용 연출 화면 (PLAYTEST §11) · 「다시 소환」은 같은 횟수로
            const pull = () => {
              const r = summon(n, ilvNow());
              if (r === 'poor') return toast('별가루가 모자라요');
              if (r === 'full') return toast('가방 칸이 모자라요');
              persist();
              syncBar();
              draw();
              gachaShow(r, pull, () => {});
            };
            pull();
          }),
      );
    };
    draw();
  },
});
