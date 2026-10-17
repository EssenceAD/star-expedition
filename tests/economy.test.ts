// 경제 시뮬 (STAR_PLAN_v2 §2): 라이트/보통/헤비 × 1·7·30일 — 실제 게임 함수(보상·행동력·반복 전투·방치·레벨)로 돌린다
//  docs/ECONOMY.md 를 만든다: ECON_WRITE=1 npx vitest run tests/economy.test.ts (내용이 다르면 실패 → 다시 만들기)
//  가정: 전투는 「파티 평균 레벨 ≥ 추천 레벨」이면 별 3개로 깬다 (장비·각성 효과는 안 넣음 = 보수적) · 행동력은 접속 때마다 쓴다
//        아직 없는 별가루 출처(미션·업적·이정표·리그·레이드 = C·D덩어리)는 안 넣음 → 그게 들어오면 더 넉넉해짐
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CONFIG } from '../src/config';
import { staMax, stageCost } from '../src/game/account';
import { claimOffline, computeOffline } from '../src/game/idle';
import { autoEquip, bulk, enhance, gearOf, summon } from '../src/game/gear';
import { claimMiles, finishRun, towerP } from '../src/game/content';
import { attend, claimAll } from '../src/game/missions';
import { guildAttend, joinGuild } from '../src/game/social';
import { awaken } from '../src/game/growth';
import { levelCap } from '../src/game/heroes';
import { buyHero, buyItem, heroPrice, heroStock } from '../src/game/shop';
import { nextStage, recLevel, recordClear, repeatBattle, starsAt, type StageId } from '../src/game/stage';
import { addCur, GEAR_SLOTS, newSave, partyIds, type Save } from '../src/game/state';
import { seeded } from './helpers';
import { HEROES } from '../src/data/heroes';

const DAY = 86400e3;
const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
interface Row { day: number; acc: number; lv: number; stage: string; dust: number; dustTotal: number; gold: number; bought: number; joined: number; enhMax: number; enhAvg: number; trans: number }

function simulate(kind: string, days: number): Row[] {
  const P = CONFIG.econ[kind];
  const s: Save = newSave(T0);
  const rnd = seeded(42);
  let dustTotal = 0;
  let bought = 0;
  const start = Object.keys(s.heroes).length;
  const rows: Row[] = [];
  let best: StageId | null = null;
  for (let d = 0; d < days; d++) {
    const dust0 = s.cur.stardust;
    for (let k = 0; k < P.sessions; k++) {
      const now = T0 + d * DAY + (k / P.sessions) * DAY * 0.6 + 8 * 3600e3;
      vi.setSystemTime(now);
      // 접속 사이에 찬 행동력 (최대에서 멈춤) — 첫 접속은 밤새 찬 것
      const gap = k === 0 ? 10 * 3600 : (0.6 * 86400) / P.sessions;
      s.sta = { n: Math.min(Math.max(s.sta.n, staMax(s)), s.sta.n + Math.floor((gap / CONFIG.stamina.regenSec) * P.staUse)), at: now };
      if (k === 0) {
        s.lastSeen = now - (24 - 0.6 * 24) * 3600e3;
        const o = computeOffline(s, now);
        if (o) claimOffline(o, s, now);
        summon(1, 0, s, rnd, now);
        bulk('salvage', 1, s);
        // C덩어리 콘텐츠 (하루 한 번 정리): 탑은 추천 레벨이 되는 층까지 · 월드 보스 3판(상위 30% 가정) · 결투장 5판(반 이김) · 이정표 받기
        const avgLv = partyIds(s).reduce((a, id) => a + s.heroes[id].lv, 0) / partyIds(s).length;
        for (let f = s.tower.best + 1; 1 + towerP(f) * CONFIG.story.recLv <= avgLv && f < s.tower.best + 30; f++) finishRun({ mode: 'tower', arg: f }, { win: true, dealt: 1, heroes: [] }, s, rnd, now);
        if (P.sessions >= 4) for (let w = 0; w < CONFIG.content.world.tries; w++) addCur('stardust', CONFIG.content.world.rewardDust[2], s);
        for (let a = 0; a < CONFIG.content.arena.tries; a++) finishRun({ mode: 'arena', arg: 'victory', sub: 1 }, { win: a % 2 === 0, dealt: 1, heroes: [] }, s, rnd, now);
        claimMiles(s);
        // 레벨 상한이면 각성 (각성석은 금화로)
        for (const id of partyIds(s))
          for (let g = 0; g < 10 && s.heroes[id].lv >= levelCap(id, s) && s.heroes[id].awaken < 5; g++) if (awaken(id, s) === 'poor' && buyItem('awaken', s) !== 'ok') break;
        for (let b = 0; b < P.buys; b++) if (s.cur.stardust >= CONFIG.stamina.buyDust) ((s.cur.stardust -= CONFIG.stamina.buyDust), (s.sta.n += CONFIG.stamina.buyN));
        // 장비: 파티 자동 장착 → 남은 강화석·금화로 강화 (가장 낮은 칸부터)
        for (const id of partyIds(s)) autoEquip(id, s);
        const worn = partyIds(s).flatMap((id) => GEAR_SLOTS.map((k) => gearOf(s.heroes[id].gear[k], s))).filter((g) => !!g);
        for (let e = 0; e < 400 && worn.length; e++) {
          const g = worn.reduce((a, c) => (c.enh < a.enh ? c : a));
          const r = enhance(g, s, rnd);
          if (r === 'poor' || r === 'max') break;
        }
      }
      // 하루 마지막 접속: 출석(첫 접속) · 미션 받기 (D덩어리)
      if (k === 0) {
        attend(s, now);
        if (!s.guild.id) joinGuild('ai1', s, now);
        guildAttend(s, now);
      }
      // 행동력 다 쓸 때까지: 다음 스테이지를 깰 수 있으면 깨고, 아니면 별 3개 최고 스테이지 반복
      for (let guard = 0; guard < 500; guard++) {
        const ns = nextStage(s);
        const avg = partyIds(s).reduce((a, id) => a + s.heroes[id].lv, 0) / partyIds(s).length;
        const cost = stageCost(0);
        if (s.sta.n < cost) break;
        if (avg >= recLevel(ns) && !(ns.c === CONFIG.story.chapters && starsAt(ns, s))) {
          s.sta.n -= cost;
          recordClear(ns, { stars: 3, time: 60, dps: 1, mvp: partyIds(s)[0] }, s, rnd, now);
          best = ns;
        } else if (best) {
          if (!repeatBattle(best, 1, s, rnd, now)) break;
        } else break;
      }
    }
    vi.setSystemTime(T0 + d * DAY + 20 * 3600e3);
    for (const kind of ['d', 'w', 'r', 'ach'] as const) claimAll(kind, s, T0 + d * DAY + 20 * 3600e3);
    dustTotal += Math.max(0, s.cur.stardust - dust0) + (P.buys ? P.buys * CONFIG.stamina.buyDust : 0);
    // 영웅 상점: 살 수 있으면 진열 첫 영웅을 산다 (별가루는 영웅에만)
    for (let st = heroStock(s)[0]; st && s.cur.stardust >= heroPrice(st.id); st = heroStock(s)[0]) if (buyHero(st.id, s) === 'ok') bought++;
    const ns = nextStage(s);
    const worn = partyIds(s).flatMap((id) => GEAR_SLOTS.map((k) => gearOf(s.heroes[id].gear[k], s))).filter((g) => !!g);
    rows.push({
      day: d + 1, acc: s.acc.lv, lv: Math.round(partyIds(s).reduce((a, id) => a + s.heroes[id].lv, 0) / partyIds(s).length), stage: `${ns.c}-${ns.s}`, dust: s.cur.stardust, dustTotal, gold: s.cur.gold,
      bought, joined: Object.keys(s.heroes).length - start - bought, enhMax: Math.max(0, ...worn.map((g) => g.enh)), enhAvg: worn.length ? worn.reduce((a, g) => a + g.enh, 0) / worn.length : 0, trans: Math.max(0, ...Object.values(s.heroes).map((h) => h.trans.length)),
    });
  }
  return rows;
}
const KINDS: [string, string][] = [['light', '라이트 (하루 2번 · 행동력 절반)'], ['normal', '보통 (하루 4번 · 30~40분 · 행동력 다 씀)'], ['heavy', '헤비 (하루 8번 · 별가루로 행동력 3번 삼)']];
const sims: Record<string, Row[]> = {};
const sim = (k: string) => (sims[k] ??= simulate(k, 30));
beforeAll(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterAll(() => vi.useRealTimers());
function doc() {
  const cap = CONFIG.econ.cap;
  const out = [
    '# 경제 시뮬 표 (자동 생성 · tests/economy.test.ts)',
    '',
    '가정: 추천 레벨이면 별 3개로 깸 · 장비 옵션 효과는 안 넣음(보수적) · 레벨 상한이면 각성(각성석은 금화) · 하루 무료 장비 소환 · 매일 희귀 이하 분해 · 파티 자동 장착 후 남은 강화석·금화로 강화 · 방치 보상 매일 · C 콘텐츠: 탑(추천 레벨 층까지) · 결투장 5판(반 승) · 월드 보스 3판(보통·헤비, 상위 30%) · 이정표 · 출석·이벤트 출석·미션·업적·길드 출석 · **별가루는 영웅 사는 데만 씀**(헤비는 행동력 구매에도)',
    `영웅 값: 멤버 영웅 ${CONFIG.shop.hero.founder} · 오리지널(전설·스토리) ${CONFIG.shop.hero.legend} (상점 진열 첫 영웅부터 삼) · 주간 획득 상한: 별가루 ${cap.stardust.toLocaleString('ko-KR')} · 각성석 ${cap.awakenStone} · 초월석 ${cap.transStone} · 장 클리어 무료 합류 ${HEROES.filter((h) => h.joinChapter).length}명`,
    '',
    '## 한눈에 (7일 · 30일)',
    '',
    '| 유형 | 7일 산 영웅 | 30일 산 영웅 | 30일 무료 합류 | 30일 번 별가루 | 30일 강화 최고 / 평균 | 30일 초월 최고 | 30일 다음 스테이지 |',
    '|---|---|---|---|---|---|---|---|',
  ];
  for (const [k, name] of KINDS) {
    const r7 = sim(k)[6];
    const r = sim(k)[29];
    out.push(`| ${name.split(' (')[0]} | ${r7.bought}명 | ${r.bought}명 | ${r.joined}명 | ${r.dustTotal.toLocaleString('ko-KR')} | +${r.enhMax} / +${r.enhAvg.toFixed(1)} | ${r.trans}단계 | ${r.stage} |`);
  }
  const [n, h] = ['normal', 'heavy'].map((k) => sim(k)[29]);
  out.push('', `헤비 ÷ 보통: 산 영웅 ${(h.bought / Math.max(1, n.bought)).toFixed(2)}배 · 번 별가루 ${(h.dustTotal / Math.max(1, n.dustTotal)).toFixed(2)}배 (목표 1.5배 이하)`, '');
  for (const [k, name] of KINDS) {
    out.push(`## ${name}`, '', '| 날 | 원정대 Lv | 파티 평균 Lv | 다음 스테이지 | 별가루 보유 | 번 별가루(누적) | 산 영웅 | 무료 합류 | 강화 최고 / 평균 | 초월 최고 | 금화 보유 |', '|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of sim(k).filter((x) => [1, 7, 14, 30].includes(x.day))) out.push(`| ${r.day}일 | ${r.acc} | ${r.lv} | ${r.stage} | ${r.dust.toLocaleString('ko-KR')} | ${r.dustTotal.toLocaleString('ko-KR')} | ${r.bought}명 | ${r.joined}명 | +${r.enhMax} / +${r.enhAvg.toFixed(1)} | ${r.trans} | ${r.gold.toLocaleString('ko-KR')} |`);
    out.push('');
  }
  out.push(
    '## 읽는 법',
    `- 별가루 출처: 스토리 첫 클리어 ${CONFIG.reward.firstDust}(보스 ${CONFIG.reward.firstDustBoss}) · 별 3개 처음 ${CONFIG.reward.threeStarDust} · 판마다 ${CONFIG.reward.dust.chance * 100}% 확률로 ${CONFIG.reward.dust.n}×(난이도+1) · 탑 처음 깬 층 · 월드 보스 · 이정표 ${CONFIG.content.milestoneDust} · 레이드 · 미션·출석`,
    '- 목표 (B 보강 §4 · 형철 10/17): 보통(하루 30~40분)이 30일에 영웅 3~4명 (1~1.5주에 1명) · 헤비 ÷ 보통 최대 1.5배 · 합류는 스토리 핵심만',
    '- 주간 상한을 채우면 별가루·영웅 재료는 그 주엔 더 안 들어오고, 사냥은 계속 (금화·경험치·장비)',
    '- 초월은 5성 영웅부터라 30일 안에는 거의 안 함 (별가루를 영웅 사는 데 다 쓰는 가정) — 긴 목표',
    '',
  );
  return out.join('\n');
}
describe('경제 시뮬', () => {
  it('세 유형 모두 30일 동안 스토리가 앞으로 가고, 헤비가 가장 멀리 간다', () => {
    const last = (k: string) => sim(k).at(-1)!;
    const [l, n, h] = ['light', 'normal', 'heavy'].map(last);
    const idx = (x: Row) => x.stage.split('-').map(Number).reduce((a, b) => a * 10 + b, 0);
    expect(idx(l)).toBeGreaterThan(12);
    expect(idx(h)).toBeGreaterThanOrEqual(idx(n));
    expect(idx(n)).toBeGreaterThanOrEqual(idx(l));
  });
  it('B 보강 §4 목표: 보통 30일에 영웅 3~4명 구매 · 헤비 ÷ 보통 1.5배 이하', () => {
    const [n, h] = ['normal', 'heavy'].map((k) => sim(k).at(-1)!);
    expect(n.bought).toBeGreaterThanOrEqual(3);
    expect(n.bought).toBeLessThanOrEqual(4);
    expect(h.bought / n.bought).toBeLessThanOrEqual(1.5);
    expect(h.dustTotal / n.dustTotal).toBeLessThanOrEqual(1.5);
  });
  it('docs/ECONOMY.md 가 지금 숫자와 같다', () => {
    const md = doc();
    if (process.env.ECON_WRITE) writeFileSync('docs/ECONOMY.md', md);
    expect(existsSync('docs/ECONOMY.md') ? readFileSync('docs/ECONOMY.md', 'utf8') : '').toBe(md);
  });
});
