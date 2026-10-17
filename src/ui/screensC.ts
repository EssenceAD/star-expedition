// C덩어리 화면: 콘텐츠(포탈) — 토벌 · 상급 던전 · 도전의 탑 · 요일 던전 · 레이드 · 월드 보스 · 결투장 3리그 · 영웅 외전 · 이정표 (STAR_PLAN_v2 §3)
//  고르기 → 전투 준비(prep, run) → 전투 : 로비에서 3탭 이내 (레이드·월드 보스는 로비 오른쪽 큰 버튼에서 바로 이 탭)
import { CONFIG } from '../config';
import { HEROES, heroOf } from '../data/heroes';
import { CHAPTERS } from '../data/story';
import {
  arenaOpps, claimMiles, DAY_NAME, dayKind, gloryOpen, LEAGUE_NAME, lastParties, lockOf, MILESTONES, milesReady, MODE_NAME, tierOf, triesText, worldBoard, worldBoss, type League, type Mode, type Run,
} from '../game/content';
import { owned } from '../game/heroes';
import { cleared } from '../game/stage';
import { persist, S } from '../game/state';
import { icon } from '../theme/tokens';
import { $$, esc, fmt, go, heroPortrait, medal, register, syncBar, tabLabel, toast } from './core';

const CC = CONFIG.content;
const TABS: [string, string, string][] = [
  ['hunt', '토벌', 'menu/hunt'], ['dungeon', '상급 던전', 'menu/content'], ['tower', '도전의 탑', 'menu/tower'], ['day', '요일 던전', 'menu/daily'], ['raid', '레이드', 'menu/raid'], ['world', '월드 보스', 'menu/worldboss'], ['arena', '결투장', 'menu/arena'], ['side', '영웅 외전', 'menu/sidestory'], ['miles', '이정표', 'menu/milestone'],
];
const goRun = (r: Run) => {
  const l = lockOf(r);
  if (l) return toast(l);
  go('prep', { run: r });
};
const bar = (v: number, max: number) => `<div class="xbar big"><i style="width:${Math.max(0, Math.min(100, (v / max) * 100))}%"></i></div>`;

register('portal', {
  title: `${icon('content')} 콘텐츠`,
  enter(root, p) {
    let tab = (p.tab as string) ?? 'hunt';
    let league: League = 'victory';
    const draw = () => {
      let body = '';
      const chapters = CHAPTERS.filter((c) => cleared({ c: c.n, s: 10, d: 0 }));
      if (tab === 'hunt' || tab === 'dungeon') {
        const m = tab as Mode;
        body = `<p class="sm dim">${tab === 'hunt' ? '깬 장의 보스와 다시 싸워요 · 강화석 · 장비 · 전용 무기 조각' : '장별 장비 던전 · 정예 3웨이브 · 장비 확정'} · 장마다 하루 ${tab === 'hunt' ? CC.hunt.tries : CC.dungeon.tries}번</p>
          <div class="cards">${chapters.map((c) => `<button class="btn panel col shopc" data-run='${JSON.stringify({ mode: m, arg: c.n })}'><b>${c.n}장 ${c.name}</b><span class="xs dim">남은 도전 ${triesText({ mode: m, arg: c.n })}</span></button>`).join('') || '<span class="mute">스토리 1장을 깨면 열려요</span>'}</div>`;
      } else if (tab === 'tower') {
        const f = S.tower.best + 1;
        body = `<p class="sm dim">층마다 강해져요 (×${CC.tower.grow}) · ${CC.tower.bossEvery}층마다 보스 · 처음 깬 층은 별가루 · ${CC.tower.runeEvery}층마다 룬 · 탑 코인 · 주간 최고 층은 랭킹(D)</p>
          <div class="panel col tower"><div class="tstat"><div><small>최고 층</small><b>${S.tower.best}층</b></div><div><small>이번 주</small><b>${S.tower.weekBest}층</b></div></div>
          <div class="row"><button class="btn hi big" data-run='${JSON.stringify({ mode: 'tower', arg: f })}'>${f}층 도전</button>${S.tower.best ? `<button class="btn" data-run='${JSON.stringify({ mode: 'tower', arg: S.tower.best })}'>${S.tower.best}층 다시</button>` : ''}</div></div>`;
      } else if (tab === 'day') {
        const k = dayKind();
        body = `<p class="sm dim">${(k === 'all' ? ['exp', 'gold', 'enh'] : [k]).map((x) => icon(x)).join('')} 오늘은 <b class="gold">${DAY_NAME[k]}</b> 던전 · 하루 ${CC.day.tries}번 (남은 ${triesText({ mode: 'day', arg: 1 })}) · 월·목 경험치 물약 / 화·금 금화 / 수·토 강화석 / 일 모두</p>
          <div class="cards days">${Array.from({ length: CC.day.levels }, (_, i) => `<button class="btn panel col shopc" data-run='${JSON.stringify({ mode: 'day', arg: i + 1 })}'><b class="hn">${i + 1}단계</b><span class="xs dim">추천 Lv.${Math.round(1 + (i + 1) * CC.day.step * CONFIG.story.recLv)}</span>${(k === 'all' ? ['exp', 'gold', 'enh'] : [k]).map((x) => icon(x)).join('')}</button>`).join('')}</div>`;
      } else if (tab === 'raid') {
        body = `<p class="sm dim">협동 레이드 8인 = 내 파티 4 + AI 동료 4 (길드원은 D덩어리) · 하루 ${CC.raid.tries}번 (남은 ${triesText({ mode: 'raid', arg: 0 })}) · <b class="gold">티어 재료</b> · 영웅 등급 이상 장비</p>
          <div class="panel row raidcard"><div class="thumb" style="background-image:url(${import.meta.env.BASE_URL}art/${CONFIG.raidArena.art.intact})"></div><div class="col grow"><b class="hn">심연 드래곤 「잿날개」</b><span class="xs dim">광선 · 포효(침묵) · 내려찍기 · 저격 · 제한 ${CC.raid.limit}초</span></div></div>
          <button class="btn hi big" data-run='${JSON.stringify({ mode: 'raid', arg: 0 })}'>레이드 도전</button>`;
      } else if (tab === 'world') {
        const wb = worldBoss();
        const board = worldBoard().slice(0, 8);
        body = `<p class="sm dim">전 서버 공용 체력 (1단계는 이 기기 + AI 원정대 기여) · 하루 ${CC.world.tries}번 (남은 ${triesText({ mode: 'world', arg: 0 })}) · 한 판 ${CC.world.sec}초 · 준 피해만큼 보상 · 주간 랭킹으로 랭커 칭호(D)</p>
          <div class="panel col"><b>${esc(wb.name)}</b>${bar(wb.hp, wb.max)}<span class="xs dim">남은 체력 ${fmt(wb.hp)} / ${fmt(wb.max)} · 내 이번 주 피해 ${fmt(wb.my)}</span></div>
          <button class="btn hi big" data-run='${JSON.stringify({ mode: 'world', arg: 0 })}'>월드 보스 도전</button>
          <div class="panel col board">${board.map((x, i) => `<div class="kv${x.me ? ' gold' : ''}"><span>${medal(i)} ${esc(x.name)}</span><b>${fmt(x.dmg)}</b></div>`).join('')}</div>`;
      } else if (tab === 'arena') {
        const opps = arenaOpps();
        body = `<div class="tabs">${(['victory', 'glory', 'last'] as League[]).map((l) => `<button class="tab${league === l ? ' on' : ''}" data-league="${l}">${LEAGUE_NAME[l]}</button>`).join('')}</div>
          <p class="sm dim">${league === 'victory' ? '기본 리그 · AI 덱(실유저 덱은 D)과 자동 전투' : league === 'glory' ? `서로 영웅 1명씩 금지하고 싸워요 (전투 준비에서 막을 영웅·대신할 영웅을 직접 골라요) · ${CC.arena.gloryHours.map(([a, b]) => `${a}~${b}시`).join(' · ')}만 · 지금 ${gloryOpen() ? '<b class="good">열림</b>' : '<b class="bad">닫힘</b>'}` : `파티 3개로 3판 (2판 먼저 이기면 승리 · 파티 2·3은 전투 준비에서 직접 편성) · 점수 ${CC.arena.lastUnlock} 이상 · 내 파티: ${lastParties().map((p) => p.length).join(' / ')}명`}</p>
          <div class="kv"><span>점수</span><b>${S.arena.score} · ${tierOf(S.arena.score)} 리그 · ${S.arena.win}승 ${S.arena.lose}패 · 남은 ${triesText({ mode: 'arena', arg: league })}</b></div>
          <div class="cards">${opps.map((o, i) => `<div class="panel col shopc"><b>${esc(o.name)}</b><span class="xs dim">점수 ${o.score} · 전투력 ${fmt(o.power)}</span><div class="row">${o.party.map((h) => `<div class="pt s" title="${h.def.name}" style="background-image:url(${heroPortrait(h.def.id)})"></div>`).join('')}</div><button class="btn hi" data-run='${JSON.stringify({ mode: 'arena', arg: league, sub: i })}'>도전</button></div>`).join('')}</div>
          <span class="xs mute">리그 상점(결투장 코인 ${S.cur.arenaCoin ?? 0})은 상점 「특수 재화」</span>`;
      } else if (tab === 'side') {
        const mine = HEROES.filter((h) => owned(h.id));
        body = `<p class="sm dim">영웅을 골라 외전(${CC.side.acts}막)을 봐요 · 끝까지 깨면 <b class="gold">전용 보물</b> 해금(공격력 +${CONFIG.treasure.atkPct * 100}%) + 그 영웅 전용 무기 조각 ${CC.side.shards} · 대사는 자리표시자</p>
          <div class="cards sides">${mine.map((h) => {
            const n = S.side[h.id] ?? 0;
            return `<button class="btn panel col shopc" data-run='${JSON.stringify({ mode: 'side', arg: h.id, sub: Math.min(CC.side.acts, n + 1) })}'><div class="pt" style="background-image:url(${heroPortrait(h.id)})"></div><b class="hn fit" data-min="${CONFIG.ui.fit.desc}">${h.name}</b><span class="xs ${S.treasure[h.id] ? 'gold' : 'dim'}">${S.treasure[h.id] ? '보물 해금' : `진행 ${n}/${CC.side.acts}막`}</span></button>`;
          }).join('')}</div>`;
      } else if (tab === 'miles') {
        const ready = milesReady();
        body = `<div class="row"><b class="grow">이정표 ${S.miles.length}/${MILESTONES.length}</b><button class="btn hi" data-claim ${ready.length ? '' : 'disabled'}>모두 받기 (${ready.length})</button></div>
          <div class="col">${MILESTONES.map((m) => `<div class="kv"><span>${S.miles.includes(m.id) ? icon('check') : ready.includes(m) ? icon('badge') : icon('lock')} ${m.name}</span><b>${icon('stardust')}${CC.milestoneDust}</b></div>`).join('')}</div>`;
      }
      root.innerHTML = `<div class="body"><div class="col shopcats">${TABS.map(([k, n, ic]) => `<button class="tab${tab === k ? ' on' : ''}" data-tab="${k}">${tabLabel(ic, n)}${k === 'miles' && milesReady().length ? ' <em class="badge">N</em>' : ''}</button>`).join('')}</div><div class="col grow scroll">${body}</div></div>`;
      $$('[data-tab]', root).forEach((b) => (b.onclick = () => ((tab = b.dataset.tab!), draw())));
      $$('[data-league]', root).forEach((b) => (b.onclick = () => ((league = b.dataset.league as League), draw())));
      $$('[data-run]', root).forEach((b) => (b.onclick = () => goRun(JSON.parse(b.dataset.run!) as Run)));
      const cl = root.querySelector<HTMLElement>('[data-claim]');
      if (cl)
        cl.onclick = () => {
          const n = claimMiles();
          persist();
          syncBar();
          toast(`이정표 ${n}개 · 별가루 +${n * CC.milestoneDust}`);
          draw();
        };
    };
    draw();
  },
});
export const runTitle = (r: Run) => `${MODE_NAME[r.mode]}${r.mode === 'hunt' || r.mode === 'dungeon' ? ` · ${r.arg}장` : r.mode === 'tower' ? ` · ${r.arg}층` : r.mode === 'day' ? ` · ${r.arg}단계` : r.mode === 'arena' ? ` · ${LEAGUE_NAME[r.arg as League]}` : r.mode === 'side' ? ` · ${heroOf(String(r.arg)).name} ${r.sub ?? 1}막` : ''}`;
