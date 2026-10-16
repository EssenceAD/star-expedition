// 타이틀 · 프롤로그 · 로비 · 모험(장/스테이지/난이도) · 편성(앞 2/뒤 2) · 영웅 목록/상세 (ROADMAP §1·§3·§4)
//  1단계: 못생겨도 됨 — 색·폰트·여백·테두리·아이콘은 전부 토큰(var / icon())
import { CONFIG } from '../config';
import { activeBonds, BONDS } from '../data/bonds';
import { HEROES, heroOf } from '../data/heroes';
import { JOBS } from '../data/jobs';
import { CHAPTER_MOBS } from '../data/mobs';
import { descPassive, descSkill } from '../data/skills';
import { CHAPTERS, PROLOGUE } from '../data/story';
import { claimOffline, collectSweep, computeOffline, startSweep, stopSweep, sweepDone, sweepLeftSec, canSweep } from '../game/idle';
import { expNeed, heroPower, levelCap, owned, statsOf } from '../game/heroes';
import { buildMobs, diffOpen, isBoss, nextStage, recLevel, stageKey, stageName, starsAt, unlocked, type StageId } from '../game/stage';
import { newSave, partyIds, persist, S, setSave, SLOTS, type Slot } from '../game/state';
import { icon } from '../theme/tokens';
import { $, $$, comingSoon, esc, fmt, go, heroPortrait, modal, playTalk, refresh, register, starsHtml, syncCur, toast, topBar, wireTop, CUR_NAME } from './core';

const C = CONFIG.story;
const SLOT_NAME: Record<Slot, string> = { f0: '앞줄 1', f1: '앞줄 2', b0: '뒷줄 1', b1: '뒷줄 2' };
const partyPower = () => partyIds().reduce((a, id) => a + heroPower(id), 0);
const fmtTime = (sec: number) => (sec >= 3600 ? `${Math.floor(sec / 3600)}시간 ${Math.floor((sec % 3600) / 60)}분` : sec >= 60 ? `${Math.floor(sec / 60)}분 ${Math.floor(sec % 60)}초` : `${Math.ceil(sec)}초`);

// ───────── 타이틀 ─────────
register('title', {
  enter(root) {
    root.id = 'title';
    root.innerHTML = `<div class="logo"><small>용사님 체크인 외전</small><b>별의 원정대</b><i>(가제) · 1단계 시스템 시험판</i></div>
      <button class="btn hi big" data-go>원정 출발</button>
      <p class="tip">가로 화면 · 이어서 하기는 자동 저장</p>
      <div class="row"><button class="btn mini" data-reset>처음부터</button></div>
      <div class="ver">v${__APP_VERSION__}</div>`;
    $('[data-go]', root).onclick = async () => {
      const { initAudioEngine } = await import('../core/audio/engine');
      initAudioEngine();
      go(S.prologue ? 'lobby' : 'prologue');
    };
    $('[data-reset]', root).onclick = () =>
      modal('처음부터 할까요?', '<p class="dim">이 기기에 저장된 원정대 기록이 모두 지워져요.</p>', [
        ['그만두기', null],
        ['처음부터', () => {
          setSave(newSave());
          persist();
          toast('새 원정대를 꾸렸어요');
        }, true],
      ]);
  },
});

// ───────── 프롤로그 ─────────
register('prologue', {
  enter() {
    playTalk(PROLOGUE, () => {
      S.prologue = true;
      persist();
      go('lobby', {}, false);
    });
  },
});

// ───────── 로비 (원정대 거점 = 여관) ─────────
register('lobby', {
  enter(root) {
    root.classList.add('lobby', 'veil');
    const ns = nextStage();
    const sw = S.sweep;
    root.innerHTML = `${topBar('원정대 여관', null)}
      <div class="body">
        <div class="col grow">
          <div class="menu">
            <button class="btn main" data-go="adventure">${icon('adventure')}<span>모험 · 다음 ${stageName(ns)}</span></button>
            <button class="btn" data-soon="콘텐츠(탑·레이드·아레나·요일 던전)|C">${icon('content')}<span>콘텐츠</span></button>
            <button class="btn" data-go="heroes">${icon('heroes')}<span>영웅</span></button>
            <button class="btn" data-go="formation">${icon('formation')}<span>편성</span></button>
            <button class="btn" data-soon="장비·가방|B">${icon('bag')}<span>장비/가방</span></button>
            <button class="btn" data-soon="영입소|B">${icon('recruit')}<span>영입소</span></button>
            <button class="btn" data-soon="상점|C">${icon('shop')}<span>상점</span></button>
            <button class="btn" data-soon="길드|D">${icon('guild')}<span>길드</span></button>
            <button class="btn" data-soon="랭킹|D">${icon('ranking')}<span>랭킹</span></button>
            <button class="btn" data-soon="우편|C">${icon('mail')}<span>우편</span></button>
            <button class="btn" data-soon="임무·출석|C">${icon('mission')}<span>임무</span></button>
            <button class="btn" data-go="title">${icon('settings')}<span>타이틀</span></button>
          </div>
        </div>
        <div class="col" style="width:250px">
          <div class="panel col">
            <div class="kv"><span>파티 전투력</span><b>${fmt(partyPower())}</b></div>
            <div class="row">${SLOTS.map((k) => (S.party[k] ? `<div class="pt s" title="${heroOf(S.party[k]!).name}" style="background-image:url(${heroPortrait(S.party[k]!)})"></div>` : `<div class="pt s"></div>`)).join('')}</div>
            <div class="bondl">${activeBonds(partyIds()).map((x) => `<span class="chip">${x.name}</span>`).join('') || '<span class="mute xs">켜진 인연 없음</span>'}</div>
          </div>
          <div class="panel col">
            <div class="row"><b class="grow">${icon('sweep')} 소탕</b>${sw ? `<span class="xs dim">${stageName(parseStage(sw.stage))}</span>` : ''}</div>
            ${sw ? `<div class="kv"><span>끝난 판</span><b data-sw>${sweepDone()} / ${sw.runs}</b></div><div class="kv"><span>남은 시간</span><b data-swl>${fmtTime(sweepLeftSec())}</b></div><div class="row"><button class="btn mini hi" data-sweep="get">받기</button><button class="btn mini" data-sweep="stop">그만두기</button></div>` : '<span class="xs mute">별 3개 스테이지를 맡겨 두면 시간이 지나며 1판씩 끝나요</span>'}
          </div>
          <div class="panel col">
            <b>${icon('offline')} 방치 보상</b>
            <span class="xs mute">꺼져 있던 동안 가장 높이 깬 스테이지 기준으로 쌓여요 (최대 ${CONFIG.offline.maxHours}시간)</span>
          </div>
        </div>
      </div>
      <div class="chat">${icon('chat')}<span class="grow">[월드] 채팅은 D덩어리에서 열려요</span></div>`;
    $$('[data-go]', root).forEach((b) => (b.onclick = () => go(b.dataset.go as never)));
    $$('[data-soon]', root).forEach((b) => (b.onclick = () => comingSoon(...(b.dataset.soon!.split('|') as [string, string]))));
    $$('[data-sweep]', root).forEach(
      (b) =>
        (b.onclick = () => {
          const h = b.dataset.sweep === 'stop' ? stopSweep() : collectSweep();
          persist();
          toast(h.runs ? `소탕 ${h.runs}판: 금화 +${fmt(h.gold)} · 경험치 +${fmt(h.exp)}${h.enh ? ` · 강화석 +${h.enh}` : ''}${h.ups.length ? ' · 레벨 업!' : ''}` : '아직 끝난 판이 없어요');
          refresh();
        }),
    );
    offlinePopup();
  },
  tick() {
    const e = document.querySelector<HTMLElement>('[data-sw]');
    if (e && S.sweep) {
      e.textContent = `${sweepDone()} / ${S.sweep.runs}`;
      const l = document.querySelector<HTMLElement>('[data-swl]');
      if (l) l.textContent = fmtTime(sweepLeftSec());
    }
  },
});
const parseStage = (k: string): StageId => {
  const [c, s, d] = k.split('-').map(Number);
  return { c, s, d };
};
let offlineChecked = false;
/** 로비에 처음 들어올 때 한 번: 방치 보상 */
function offlinePopup() {
  if (offlineChecked) return;
  offlineChecked = true;
  const o = computeOffline();
  if (!o) return;
  const r = o.reward;
  modal(`${icon('offline')} 그동안 원정대는…`, `<p class="dim">${fmtTime(o.away)} 동안 ${stageName(o.stage)}에서 사냥했어요${o.away > o.seconds ? ` (최대 ${CONFIG.offline.maxHours}시간까지)` : ''}.</p>
    <div class="rw row">${[['gold', r.gold], ['exp', r.exp], ['enh', r.enh]].filter(([, v]) => v).map(([k, v]) => `<div class="panel col" style="align-items:center">${icon(k as string)}<span class="xs">${CUR_NAME[k as string] ?? '영웅 경험치'}</span><b class="gold">+${fmt(v as number)}</b></div>`).join('')}</div>`, [
    ['모두 받기', () => {
      const ups = claimOffline(o);
      persist();
      syncCur();
      if (ups.length) toast(`레벨 업! ${ups.map((id) => heroOf(id).name).join(' · ')}`);
    }, true],
  ]);
}

// ───────── 모험 ─────────
register('adventure', {
  enter(root, p) {
    root.classList.add('solid');
    const ns = nextStage();
    let c = (p.c as number) ?? ns.c;
    let d = (p.d as number) ?? 0;
    let sel: StageId = { c, s: (p.s as number) ?? (c === ns.c ? ns.s : 1), d };
    const draw = () => {
      sel = { ...sel, c, d };
      if (!unlocked(sel)) sel.s = 1;
      const ch = CHAPTERS[c - 1];
      const chOpen = unlocked({ c, s: 1, d });
      const key = stageKey(sel);
      const rec = S.stages[key];
      const mobs = buildMobs(sel);
      const names = [...new Set(mobs.flat().map((m) => m.name))];
      const rl = recLevel(sel);
      const myLv = Math.round(partyIds().reduce((a, id) => a + S.heroes[id].lv, 0) / Math.max(1, partyIds().length));
      root.innerHTML = `${topBar(`${icon('adventure')} 모험`, () => go('lobby', {}, false))}
        <div class="body">
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
          <div class="panel col" style="width:270px">
            <b class="b">${stageName(sel)}${isBoss(sel) ? ` · ${CHAPTER_MOBS[c - 1].boss}` : ''}</b>
            <div class="kv"><span>추천 레벨</span><b class="${myLv >= rl ? 'good' : 'bad'}">${rl} (내 평균 ${myLv})</b></div>
            <div class="kv"><span>내 파티 전투력</span><b>${fmt(partyPower())}</b></div>
            <div class="kv"><span>웨이브</span><b>${mobs.length}</b></div>
            <div class="mobs">${names.map((n) => `<span class="chip">${esc(n)}</span>`).join('')}</div>
            <div class="kv"><span>별</span>${starsHtml(rec?.stars ?? 0)}</div>
            ${rec ? `<div class="kv"><span>최고 기록</span><b>${rec.bestTime}초 · 초당 ${fmt(rec.bestDps)}</b></div><div class="kv"><span>그때 MVP</span><b>${rec.mvp ? heroOf(rec.mvp).name : '-'}</b></div>` : ''}
            <div class="grow"></div>
            <div class="row"><button class="btn" data-form>${icon('formation')} 편성</button><button class="btn hi grow" data-start ${unlocked(sel) ? '' : 'disabled'}>출발</button></div>
            <div class="row"><select data-n class="tab">${CONFIG.sweep.choices.map((n) => `<option value="${n}">${n}판</option>`).join('')}</select><button class="btn grow" data-sweep ${canSweep(sel) ? '' : 'disabled'}>${icon('sweep')} 소탕 맡기기</button></div>
            <span class="xs mute">${canSweep(sel) ? `1판 ${CONFIG.sweep.secPerRun}초 · 로비에서 받기` : '별 3개면 소탕할 수 있어요'}</span>
          </div>
        </div>`;
      wireTop(root, () => go('lobby', {}, false));
      $$('[data-c]', root).forEach((b) => (b.onclick = () => ((c = +b.dataset.c!), (sel.s = 1), draw())));
      $$('[data-d]', root).forEach((b) => (b.onclick = () => ((d = +b.dataset.d!), draw())));
      $$('[data-s]', root).forEach((b) => (b.onclick = () => ((sel.s = +b.dataset.s!), draw())));
      $('[data-form]', root).onclick = () => go('formation', { stage: sel });
      $('[data-start]', root).onclick = () => {
        if (!partyIds().length) return toast('편성에 영웅을 한 명 이상 넣어 주세요');
        go('battle', { stage: { ...sel } });
      };
      $('[data-sweep]', root).onclick = () => {
        const n = +$<HTMLSelectElement>('[data-n]', root).value;
        if (startSweep(sel, n)) {
          persist();
          toast(`소탕 ${n}판을 맡겼어요 · ${fmtTime(n * CONFIG.sweep.secPerRun)} 뒤 다 끝나요`);
        } else toast(S.sweep ? '이미 소탕 중이에요 (로비에서 받거나 그만두기)' : '별 3개 스테이지만 소탕할 수 있어요');
      };
    };
    draw();
  },
});

// ───────── 편성 (앞 2 / 뒤 2) ─────────
register('formation', {
  enter(root, p) {
    root.classList.add('solid');
    let pick: Slot | null = null;
    const draw = () => {
      const ids = partyIds();
      const bonds = activeBonds(ids);
      const mine = HEROES.filter((h) => owned(h.id));
      root.innerHTML = `${topBar(`${icon('formation')} 편성`, () => go(p.stage ? 'adventure' : 'lobby', p.stage ? { ...(p.stage as StageId) } : {}, false))}
        <div class="body">
          <div class="col" style="width:300px">
            <div class="form panel">
              <div class="lbl"><span>${icon('back')} 뒷줄 (덜 맞음)</span><span>앞줄 (적이 더 자주 노림) ${icon('next')}</span></div>
              ${(['b0', 'f0', 'b1', 'f1'] as Slot[]).map((k) => {
                const id = S.party[k];
                return `<button class="btn fslot${pick === k ? ' sel' : ''}" data-slot="${k}">${id ? `<div class="pt s" style="background-image:url(${heroPortrait(id)})"></div><div><div class="nm">${heroOf(id).name}</div><div class="xs dim">${SLOT_NAME[k]} · Lv.${S.heroes[id].lv}</div></div>` : `<span class="mute">${SLOT_NAME[k]} · 비어 있음</span>`}</button>`;
              }).join('')}
            </div>
            <div class="panel col">
              <div class="kv"><span>파티 전투력</span><b>${fmt(partyPower())}</b></div>
              <div class="bondl">${BONDS.filter((x) => x.members.some((m) => ids.includes(m))).map((x) => `<span class="chip${bonds.includes(x) ? ' on' : ''}" title="${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)">${x.name}</span>`).join('') || '<span class="xs mute">인연 없음</span>'}</div>
              <span class="xs mute">${pick ? `${SLOT_NAME[pick]}에 넣을 영웅을 고르세요 (자리를 다시 누르면 비움)` : '자리를 누르고, 영웅을 고르세요'}</span>
            </div>
            ${p.stage ? `<button class="btn hi" data-go>출발 ${stageName(p.stage as StageId)}</button>` : ''}
          </div>
          <div class="roster grow scroll">${mine.map((h) => {
            const slot = SLOTS.find((k) => S.party[k] === h.id);
            return `<button class="btn hcard${slot ? ' in' : ''}" data-h="${h.id}">${slot ? `<span class="chip sl">${SLOT_NAME[slot]}</span>` : ''}<div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><span class="nm">${h.name}</span><span class="xs dim">${JOBS[h.job].name} · Lv.${S.heroes[h.id].lv}</span><span class="xs gold">${fmt(heroPower(h.id))}</span></button>`;
          }).join('')}</div>
        </div>`;
      wireTop(root, () => go(p.stage ? 'adventure' : 'lobby', p.stage ? { ...(p.stage as StageId) } : {}, false));
      $$('[data-slot]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const k = b.dataset.slot as Slot;
            if (pick === k) {
              if (S.party[k] && partyIds().length > 1) S.party[k] = null;
              pick = null;
            } else pick = k;
            persist();
            draw();
          }),
      );
      $$('[data-h]', root).forEach(
        (b) =>
          (b.onclick = () => {
            const id = b.dataset.h!;
            const at = SLOTS.find((k) => S.party[k] === id);
            const k = pick ?? SLOTS.find((x) => !S.party[x]) ?? null;
            if (!k) return toast('자리를 먼저 고르세요');
            // 자리 바꾸기: 이미 파티에 있으면 서로 맞바꿈
            if (at) S.party[at] = S.party[k];
            S.party[k] = id;
            pick = null;
            persist();
            draw();
          }),
      );
      const g = $('[data-go]', root);
      if (g) g.onclick = () => go('battle', { stage: { ...(p.stage as StageId) } });
    };
    draw();
  },
});

// ───────── 영웅 목록 · 상세 ─────────
register('heroes', {
  enter(root) {
    root.classList.add('solid');
    root.innerHTML = `${topBar(`${icon('heroes')} 영웅 (${HEROES.filter((h) => owned(h.id)).length} / ${HEROES.length})`, () => go('lobby', {}, false))}
      <div class="body"><div class="roster grow scroll">${HEROES.map((h) => {
        const own = owned(h.id);
        return `<button class="btn hcard${own ? '' : ' lock'}" data-h="${h.id}"><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><span class="nm">${h.name}</span><span class="xs dim">${JOBS[h.job].name}${own ? ` · Lv.${S.heroes[h.id].lv}` : ''}</span><span class="xs ${own ? 'gold' : 'mute'}">${own ? fmt(heroPower(h.id)) : h.joinChapter ? `${h.joinChapter}장 클리어` : '영입소 (B)'}</span></button>`;
      }).join('')}</div></div>`;
    wireTop(root, () => go('lobby', {}, false));
    $$('[data-h]', root).forEach((b) => (b.onclick = () => go('hero', { id: b.dataset.h })));
  },
});
register('hero', {
  enter(root, p) {
    root.classList.add('solid');
    const h = heroOf(p.id as string);
    const own = owned(h.id);
    const lv = S.heroes[h.id]?.lv ?? 1;
    const st = statsOf(h.id);
    const bonds = BONDS.filter((x) => x.members.includes(h.id));
    root.innerHTML = `${topBar(`${h.name} · ${h.title}`, () => go('heroes', {}, false))}
      <div class="body">
        <div class="panel col" style="width:230px">
          <div class="row"><div class="pt l" style="background-image:url(${heroPortrait(h.id)})"></div><div class="col"><b>${h.name}</b><span class="xs dim">${JOBS[h.job].name} · ${h.gender === 'm' ? '남' : '여'} · ${{ founder: '창립 멤버', legend: '「체크인」 전설', new: '새 영웅' }[h.origin]}</span><span class="xs mute">${esc(h.concept)}</span></div></div>
          <div class="kv"><span>레벨</span><b>${lv} / ${levelCap(h.id)}${own ? ` <span class="xs dim">(${fmt(S.heroes[h.id].exp)} / ${fmt(expNeed(lv))})</span>` : ''}</b></div>
          <div class="kv"><span>전투력</span><b>${fmt(heroPower(h.id))}</b></div>
          <div class="kv"><span>체력</span><b>${fmt(st.hp)}</b></div><div class="kv"><span>공격력</span><b>${fmt(st.atk)}</b></div><div class="kv"><span>방어력</span><b>${fmt(st.def)}</b></div>
          <div class="kv"><span>치명타</span><b>${Math.round(st.crit * 100)}% · ×${st.critDmg}</b></div>
          <div class="kv"><span>무기</span><b>${JOBS[h.job].weapon}${h.exWeapon ? ` · 전용 「${h.exWeapon}」` : ''}</b></div>
          <span class="xs mute">각성·스킬 레벨·초월·장비는 B덩어리</span>
        </div>
        <div class="col grow scroll">
          <div class="panel col"><b>패시브 · ${h.passive.name}</b><span class="md dim">${descPassive(h.passive)}</span></div>
          ${h.skills.map((s, i) => `<div class="panel skl"><div class="si">${icon(s.icon)}</div><div class="col grow"><b>${i + 1}. ${s.name} <span class="xs mute">마나 ${s.cost} · ${s.cd}초</span></b><span class="dim">${descSkill(s)}</span></div></div>`).join('')}
          <div class="panel col"><b>인연</b>${bonds.map((x) => `<div class="md"><b class="gold">${x.name}</b> <span class="dim">${x.members.map((m) => heroOf(m).name).join(' · ')} (${x.need}명)</span></div>`).join('') || '<span class="xs mute">인연 조합 없음</span>'}</div>
        </div>
      </div>`;
    wireTop(root, () => go('heroes', {}, false));
  },
});
