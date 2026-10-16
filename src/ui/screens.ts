// 타이틀 · 로비(여관) · 모험 · 전투 준비(편성) · 영웅 목록/정보 (STAR_PLAN_v2 §0-2·0-4·§1)
//  배치는 킹스레이드 문법(구조·밀도만), 꾸밈은 2단계 — 색·폰트·여백·테두리·아이콘은 전부 토큰(var / icon())
import { CONFIG } from '../config';
import { activeBonds, BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS, ZONE_NAME, ZONES, type Zone } from '../data/jobs';
import { CHAPTER_MOBS } from '../data/mobs';
import { descPassive, descSkill } from '../data/skills';
import { CHAPTERS } from '../data/story';
import { accNeed, boostLeft, buyBooster, stageCost, stamina } from '../game/account';
import { claimOffline, computeOffline } from '../game/idle';
import { expNeed, heroPower, levelCap, owned, statsOf } from '../game/heroes';
import { buildMobs, byZone, canRepeat, diffOpen, isBoss, nextStage, recLevel, repeatBattle, stageName, starsAt, unlocked, type StageId } from '../game/stage';
import { newSave, PARTY_MAX, partyIds, persist, S, setSave } from '../game/state';
import { icon } from '../theme/tokens';
import { repeatText } from './battle';
import { $, $$, comingSoon, CUR_NAME, esc, fmt, go, heroPortrait, modal, refresh, register, starsHtml, syncBar, toast } from './core';

const C = CONFIG.story;
const partyPower = () => partyIds().reduce((a, id) => a + heroPower(id), 0);
const zoneOf = (id: string): Zone => JOBS[heroOf(id).job].zone;
const fmtTime = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초` : `${Math.ceil(sec)}초`);
/** 영웅 카드 (세로 · 왼쪽 위 위치 문장 · 오른쪽 위 레벨 · 이름 띠) */
const card = (id: string, extra = '', cls = '') => {
  const h = heroOf(id);
  const own = owned(id);
  return `<button class="btn hcard${own ? '' : ' lock'} ${cls}" data-h="${id}"><span class="zn">${icon(`zone_${zoneOf(id)}`)}</span>${own ? `<span class="lv">Lv.${S.heroes[id].lv}</span>` : ''}<div class="pt" style="background-image:url(${heroPortrait(id)})"></div><span class="nm">${h.name}</span><span class="xs dim">${JOBS[h.job].name}</span>${extra}</button>`;
};
const zoneTabs = (on: string, withUnowned = false) =>
  `<div class="tabs">${[['all', '전체'], ...ZONES.map((z) => [z, ZONE_NAME[z]]), ...(withUnowned ? [['none', '미보유']] : [])].map(([k, n]) => `<button class="tab${on === k ? ' on' : ''}" data-tab="${k}">${n}</button>`).join('')}</div>`;

// ───────── 타이틀 ─────────
register('title', {
  enter(root) {
    root.id = 'title';
    root.innerHTML = `<div class="logo"><small>용사님 체크인 외전</small><b>별의 원정대</b><i>(가제) · 1단계 시스템 시험판</i></div>
      <button class="btn hi big" data-go>원정 출발</button>
      <p class="tip">${S.prologue ? '이어서 하기 · 자동 저장' : '처음이면 프롤로그 다음 바로 첫 전투'}</p>
      <div class="row"><button class="btn mini" data-reset>처음부터</button></div>
      <div class="ver">v${__APP_VERSION__}</div>`;
    $('[data-go]', root).onclick = async () => {
      const { initAudioEngine } = await import('../core/audio/engine');
      initAudioEngine();
      // 첫 진입: 프롤로그(1-1 필드에서) → 1-1 전투 → 승리 → 로비 (STAR_PLAN_v2 §1-1)
      if (!S.prologue) go('battle', { stage: { c: 1, s: 1, d: 0 }, first: true });
      else go('lobby');
    };
    $('[data-reset]', root).onclick = () =>
      modal('처음부터 할까요?', '<p class="dim">이 기기에 저장된 원정대 기록이 모두 지워져요.</p>', [
        ['그만두기', null],
        ['처음부터', () => {
          setSave(newSave());
          persist();
          refresh();
          toast('새 원정대를 꾸렸어요');
        }, true],
      ]);
  },
});

// ───────── 로비 (원정대 거점 = 여관 · 킹스레이드 0-2 배치) ─────────
register('lobby', {
  title: '원정대 여관',
  enter(root) {
    root.classList.add('lobby');
    const ns = nextStage();
    const lead = partyIds()[0] ?? 'woongs';
    const bl = boostLeft();
    root.innerHTML = `
      <div class="me panel"><div class="pt" style="background-image:url(${heroPortrait(lead)})"></div><div class="col grow"><b>${esc(S.acc.name)} <span class="gold">Lv.${S.acc.lv}</span></b>
        <div class="xbar"><i style="width:${Math.min(100, (S.acc.exp / accNeed(S.acc.lv)) * 100)}%"></i></div>
        <span class="xs dim">${bl ? `${icon('booster')} 부스터 ${fmtTime(bl)}` : `파티 전투력 ${fmt(partyPower())}`}</span></div></div>
      <div class="quest panel col">
        <b class="sm">${icon('mission')} 진행 중</b>
        <button class="btn qrow" data-next>${icon('adventure')} 다음: ${stageName(ns)} ${CHAPTERS[ns.c - 1].name}</button>
        <button class="btn qrow" data-soon="일일 임무|D">${icon('mission')} 일일 임무 0/5</button>
        <span class="sm b">${icon('star')} 이벤트</span>
        <button class="btn qrow" data-soon="이벤트|D">오픈 기념 (준비 중)</button>
        <div class="bondl">${activeBonds(partyIds()).map((x) => `<span class="chip on">${x.name}</span>`).join('')}</div>
      </div>
      <div class="bigs">
        <button class="round" data-soon="월드 보스|C">${icon('world')}<span>월드 보스</span></button>
        <button class="round" data-soon="레이드|C">${icon('raid')}<span>레이드</span></button>
        <button class="round main" data-go="adventure">${icon('adventure')}<span>모험</span></button>
      </div>
      <div class="dock">
        ${[['heroes', '영웅', 'heroes'], ['prep', '편성', 'formation'], ['soon:가방|B', '가방', 'bag'], ['soon:미션|D', '미션', 'mission'], ['soon:업적|D', '업적', 'achieve'], ['soon:친구|D', '친구', 'friend'], ['soon:상점|B', '상점', 'shop'], ['soon:길드|D', '길드', 'guild'], ['soon:랭킹|D', '랭킹', 'ranking'], ['title', '설정', 'settings']]
          .map(([to, n, ic]) => `<button class="dk" ${to.startsWith('soon:') ? `data-soon="${to.slice(5)}"` : `data-go="${to}"`}>${icon(ic)}<span>${n}</span>${to === 'soon:상점|B' ? '<em class="badge">FREE</em>' : ''}</button>`)
          .join('')}
      </div>`;
    $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go as never)));
    $('[data-next]', root).onclick = () => go('prep', { stage: ns });
    $$('[data-soon]', root).forEach((b) => (b.onclick = () => comingSoon(...(b.dataset.soon!.split('|') as [string, string]))));
    offlinePopup();
  },
});
let offlineChecked = false;
/** 로비에 처음 들어올 때 한 번: 방치 보상 */
function offlinePopup() {
  if (offlineChecked) return;
  offlineChecked = true;
  const o = computeOffline();
  if (!o) return;
  const r = o.reward;
  modal(`${icon('offline')} 그동안 원정대는…`, `<p class="dim">${fmtTime(o.away)} 동안 ${stageName(o.stage)}에서 사냥했어요${o.away > o.seconds ? ` (최대 ${CONFIG.offline.maxHours}시간까지)` : ''}.</p>
    <div class="rw row">${[['gold', r.gold], ['exp', r.exp], ['enh', r.enh]].filter(([, v]) => v).map(([k, v]) => `<div class="panel col">${icon(k as string)}<span class="xs">${CUR_NAME[k as string]}</span><b class="gold">+${fmt(v as number)}</b></div>`).join('')}</div>`, [
    ['모두 받기', () => {
      const ups = claimOffline(o);
      persist();
      syncBar();
      if (ups.length) toast(`레벨 업! ${ups.map((id) => heroOf(id).name).join(' · ')}`);
    }, true],
  ]);
}

// ───────── 모험 (C덩어리에서 지도 노드로) ─────────
register('adventure', {
  title: `${icon('adventure')} 모험`,
  back: () => go('lobby', {}, false),
  enter(root, p) {
    const ns = nextStage();
    let c = (p.c as number) ?? ns.c;
    let d = (p.d as number) ?? 0;
    let sel: StageId = { c, s: (p.s as number) ?? (c === ns.c ? ns.s : 1), d };
    const draw = () => {
      sel = { ...sel, c, d };
      if (!unlocked(sel)) sel.s = 1;
      const ch = CHAPTERS[c - 1];
      const chOpen = unlocked({ c, s: 1, d });
      const rec = S.stages[`${sel.c}-${sel.s}-${sel.d}`];
      const mobs = buildMobs(sel);
      const names = [...new Set(mobs.flat().map((m) => m.name))];
      const rl = recLevel(sel);
      const myLv = Math.round(partyIds().reduce((a, id) => a + S.heroes[id].lv, 0) / Math.max(1, partyIds().length));
      root.innerHTML = `<div class="body">
          <div class="col grow">
            <div class="tabs">${CHAPTERS.map((x) => `<button class="tab${x.n === c ? ' on' : ''}" data-c="${x.n}" ${unlocked({ c: x.n, s: 1, d: 0 }) ? '' : 'disabled'}>${x.n}장</button>`).join('')}</div>
            <div class="row"><b class="grow">${c}장 · ${ch.name}${ch.waves ? '' : ' <span class="xs mute">(자리표시자)</span>'}</b>
              <div class="tabs">${C.diffName.map((n, i) => `<button class="tab${i === d ? ' on' : ''}" data-d="${i}" ${diffOpen(c, i) ? '' : 'disabled'}>${diffOpen(c, i) ? '' : icon('lock')}${n}</button>`).join('')}</div></div>
            ${chOpen ? `<div class="stagemap">${Array.from({ length: C.stages }, (_, i) => {
              const id = { c, s: i + 1, d };
              const open = unlocked(id);
              return `<button class="btn stg${isBoss(id) ? ' boss' : ''}${sel.s === i + 1 ? ' sel' : ''}" data-s="${i + 1}" ${open ? '' : 'disabled'}><b>${open ? '' : icon('lock')}${c}-${i + 1}${isBoss(id) ? ' 보스' : ''}</b>${starsHtml(starsAt(id))}</button>`;
            }).join('')}</div>` : `<div class="panel mute">이전 장을 깨면 열려요</div>`}
            <div class="xs mute">${ch.star} · 장을 깨면 별이 하나 다시 켜지고 지역 전설 영웅이 합류해요</div>
          </div>
          <div class="panel col side">
            <b class="b">${stageName(sel)}${isBoss(sel) ? ` · ${CHAPTER_MOBS[c - 1].boss}` : ''}</b>
            <div class="kv"><span>추천 레벨</span><b class="${myLv >= rl ? 'good' : 'bad'}">${rl} (내 평균 ${myLv})</b></div>
            <div class="kv"><span>행동력</span><b>${icon('stamina')} ${stageCost(d)}</b></div>
            <div class="kv"><span>웨이브</span><b>${mobs.length}</b></div>
            <div class="mobs">${names.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}</div>
            <div class="kv"><span>별</span>${starsHtml(rec?.stars ?? 0)}</div>
            ${rec ? `<div class="kv"><span>최고 기록</span><b>${rec.bestTime}초 · 초당 ${fmt(rec.bestDps)}</b></div><div class="kv"><span>그때 MVP</span><b>${rec.mvp ? heroOf(rec.mvp).name : '-'}</b></div>` : ''}
            <div class="grow"></div>
            <button class="btn hi big" data-prep ${unlocked(sel) ? '' : 'disabled'}>전투 준비</button>
          </div>
        </div>`;
      $$('[data-c]', root).forEach((b) => (b.onclick = () => ((c = +b.dataset.c!), (sel.s = 1), draw())));
      $$('[data-d]', root).forEach((b) => (b.onclick = () => ((d = +b.dataset.d!), draw())));
      $$('[data-s]', root).forEach((b) => (b.onclick = () => ((sel.s = +b.dataset.s!), draw())));
      $('[data-prep]', root).onclick = () => go('prep', { stage: { ...sel } });
    };
    draw();
  },
});

// ───────── 전투 준비 = 편성 (킹스레이드 0-4: 왼쪽 카드 격자 + 위치 탭 · 오른쪽 파티 4 + 부스터 + 행동력 + [반복 전투][전투 시작]) ─────────
register('prep', {
  title: (p) => (p.stage ? `${icon('battle')} 전투 준비 · ${stageName(p.stage as StageId)}` : `${icon('formation')} 편성`),
  back: (p) => (p.stage ? go('adventure', { ...(p.stage as StageId) }, false) : go('lobby', {}, false)),
  enter(root, p) {
    const st = p.stage as StageId | undefined;
    let tab = 'all';
    let rep = 10;
    const draw = () => {
      const ids = partyIds();
      const bonds = activeBonds(ids);
      const mine = HEROES.filter((h) => owned(h.id) && (tab === 'all' || zoneOf(h.id) === tab));
      const bl = boostLeft();
      const cost = st ? stageCost(st.d) : 0;
      root.innerHTML = `<div class="body">
          <div class="col grow">
            ${zoneTabs(tab)}
            <div class="roster grow scroll">${mine.map((h) => card(h.id, `<span class="xs gold">${fmt(heroPower(h.id))}</span>`, ids.includes(h.id) ? 'in' : '')).join('')}</div>
            <span class="xs mute">카드를 눌러 넣고 빼요 (최대 ${PARTY_MAX}명) · 위치(전방·중앙·후방)는 직업으로 정해지고 전투에서 그 순서로 서요 · 길게 누르면 영웅 정보</span>
          </div>
          <div class="col side">
            <div class="panel col">
              <div class="party">${[0, 1, 2, 3].map((i) => {
                const id = byZone(ids)[i];
                return id ? `<div class="pcard" data-out="${id}"><div class="pt" style="background-image:url(${heroPortrait(id)})"></div><span class="xs">${ZONE_NAME[zoneOf(id)]}</span><b class="xs">${heroOf(id).name}</b></div>` : '<div class="pcard empty"><span class="xs mute">비어 있음</span></div>';
              }).join('')}</div>
              <div class="kv"><span>파티 전투력</span><b>${fmt(partyPower())}</b></div>
              <div class="bondl">${BONDS.filter((x) => x.members.some((m) => ids.includes(m))).map((x) => `<span class="chip${bonds.includes(x) ? ' on' : ''}" title="${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)">${x.name}</span>`).join('') || '<span class="xs mute">인연 없음</span>'}</div>
            </div>
            ${st ? `<div class="panel col">
              <div class="row"><span class="grow sm">${icon('booster')} 부스터 (전리품 ${CONFIG.booster.mult}배 1시간)</span><button class="btn mini${bl ? ' on' : ''}" data-boost>${bl ? fmtTime(bl) : `${icon('gold')}${fmt(CONFIG.booster.gold)}`}</button></div>
              <div class="kv"><span>행동력</span><b>${icon('stamina')} ${cost} / 보유 ${stamina()}</b></div>
              <div class="row"><select data-n class="tab">${CONFIG.repeat.choices.map((n) => `<option value="${n}" ${n === rep ? 'selected' : ''}>${n}회</option>`).join('')}</select>
                <button class="btn grow" data-repeat ${canRepeat(st) ? '' : 'disabled'} title="${canRepeat(st) ? '바로 끝나요' : '별 3개면 열려요'}">${icon('repeat')} 반복 전투</button>
                <button class="btn hi grow" data-start ${ids.length ? '' : 'disabled'}>전투 시작</button></div>
              <span class="xs mute">${canRepeat(st) ? `반복 전투 = 행동력 ${cost} × 횟수 · 바로 끝나요` : '반복 전투는 별 3개 스테이지만'}</span>
            </div>` : ''}
          </div>
        </div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-h]', root).forEach((b) => {
        const id = b.dataset.h!;
        let held = 0;
        b.onpointerdown = () => (held = window.setTimeout(() => ((held = -1), go('hero', { id, from: p })), 550));
        b.onpointerup = b.onpointerleave = () => held > 0 && clearTimeout(held);
        b.onclick = () => {
          if (held === -1) return;
          const at = S.party.indexOf(id);
          if (at >= 0) {
            if (S.party.length <= 1) return toast('한 명은 있어야 해요');
            S.party.splice(at, 1);
          } else {
            if (S.party.length >= PARTY_MAX) return toast(`파티는 ${PARTY_MAX}명까지 — 오른쪽에서 빼고 넣어 주세요`);
            S.party.push(id);
          }
          persist();
          draw();
        };
      });
      $$('[data-out]', root).forEach(
        (b) =>
          (b.onclick = () => {
            if (S.party.length <= 1) return toast('한 명은 있어야 해요');
            S.party = S.party.filter((x) => x !== b.dataset.out);
            persist();
            draw();
          }),
      );
      if (!st) return;
      $<HTMLSelectElement>('[data-n]', root).onchange = (e) => (rep = +(e.target as HTMLSelectElement).value);
      $('[data-boost]', root).onclick = () => {
        if (!buyBooster()) return toast('금화가 모자라요');
        persist();
        syncBar();
        toast(`부스터 켬 · 전리품 ${CONFIG.booster.mult}배`);
        draw();
      };
      $('[data-start]', root).onclick = () => go('battle', { stage: { ...st } });
      $('[data-repeat]', root).onclick = () => {
        const h = repeatBattle(st, rep);
        if (!h) return toast('행동력이 모자라요');
        persist();
        syncBar();
        toast(repeatText(h));
        draw();
      };
    };
    draw();
  },
});

// ───────── 영웅 목록 · 정보 ─────────
register('heroes', {
  title: () => `${icon('heroes')} 영웅 (${HEROES.filter((h) => owned(h.id)).length} / ${HEROES.length})`,
  enter(root) {
    let tab = 'all';
    const draw = () => {
      const list = HEROES.filter((h) => (tab === 'none' ? !owned(h.id) : (tab === 'all' || zoneOf(h.id) === tab) && owned(h.id)));
      root.innerHTML = `<div class="body"><div class="col grow">${zoneTabs(tab, true)}<div class="roster grow scroll">${list
        .map((h) => card(h.id, owned(h.id) ? `<span class="xs gold">${fmt(heroPower(h.id))}</span>` : `<span class="xs mute">${h.joinChapter ? `${h.joinChapter}장 클리어` : '영웅 상점 (B)'}</span>`))
        .join('') || '<span class="mute">없어요</span>'}</div></div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-h]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.h })));
    };
    draw();
  },
});
register('hero', {
  title: (p) => `${heroOf(p.id as string).name} · ${heroOf(p.id as string).title}`,
  back: (p) => (p.from ? go('prep', p.from as Record<string, unknown>, false) : go('heroes', {}, false)),
  enter(root, p) {
    const h = heroOf(p.id as string);
    const own = owned(h.id);
    const lv = S.heroes[h.id]?.lv ?? 1;
    const st = statsOf(h.id);
    const bonds = BONDS.filter((x) => x.members.includes(h.id));
    root.innerHTML = `<div class="body">
        <div class="panel col side">
          <div class="row"><div class="pt l" style="background-image:url(${heroPortrait(h.id)})"></div><div class="col"><b>${h.name}</b><span class="xs dim">${JOBS[h.job].name} · ${ZONE_NAME[zoneOf(h.id)]} · ${h.gender === 'm' ? '남' : '여'} · ${{ founder: '창립 멤버', legend: '「체크인」 전설', new: '새 영웅' }[h.origin]}</span><span class="xs mute">${esc(h.concept)}</span></div></div>
          <div class="kv"><span>레벨</span><b>${lv} / ${levelCap(h.id)}${own ? ` <span class="xs dim">(${fmt(S.heroes[h.id].exp)} / ${fmt(expNeed(lv))})</span>` : ''}</b></div>
          <div class="kv"><span>전투력</span><b>${fmt(heroPower(h.id))}</b></div>
          <div class="kv"><span>체력</span><b>${fmt(st.hp)}</b></div><div class="kv"><span>공격력</span><b>${fmt(st.atk)}</b></div><div class="kv"><span>방어력</span><b>${fmt(st.def)}</b></div>
          <div class="kv"><span>치명타</span><b>${Math.round(st.crit * 100)}% · ×${st.critDmg}</b></div>
          <div class="kv"><span>무기</span><b>${JOBS[h.job].weapon}${h.exWeapon ? ` · 전용 「${h.exWeapon}」` : ''}</b></div>
          <span class="xs mute">장비 6칸·각성·스킬 레벨·초월은 B덩어리</span>
        </div>
        <div class="col grow scroll">
          <div class="panel col"><b>패시브 · ${h.passive.name}</b><span class="md dim">${descPassive(h.passive)}</span></div>
          ${h.skills.map((s, i) => `<div class="panel skl"><div class="si">${icon(s.icon)}</div><div class="col grow"><b>${i + 1}. ${s.name} <span class="xs mute">마나 ${s.cost} · ${s.cd}초</span></b><span class="dim">${descSkill(s)}</span></div></div>`).join('')}
          <div class="panel col"><b>인연</b>${bonds.map((x) => `<div class="md"><b class="gold">${x.name}</b> <span class="dim">${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)</span></div>`).join('') || '<span class="xs mute">인연 조합 없음</span>'}</div>
        </div>
      </div>`;
  },
});
