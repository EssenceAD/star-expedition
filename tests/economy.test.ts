// 경제 시뮬 (STAR_PLAN_v2 §2): 라이트/보통/헤비 × 1·7·30일 — 실제 게임 함수(보상·행동력·반복 전투·방치·레벨)로 돌린다
//  docs/ECONOMY.md 를 만든다: ECON_WRITE=1 npx vitest run tests/economy.test.ts (내용이 다르면 실패 → 다시 만들기)
//  가정: 전투는 「파티 평균 레벨 ≥ 추천 레벨」이면 별 3개로 깬다 (장비·각성 효과는 안 넣음 = 보수적) · 행동력은 접속 때마다 쓴다
//        아직 없는 별가루 출처(미션·업적·이정표·리그·레이드 = C·D덩어리)는 안 넣음 → 그게 들어오면 더 넉넉해짐
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import { staMax, stageCost } from '../src/game/account';
import { claimOffline, computeOffline } from '../src/game/idle';
import { bulk, summon } from '../src/game/gear';
import { claimMiles, finishRun, towerP } from '../src/game/content';
import { awaken } from '../src/game/growth';
import { levelCap } from '../src/game/heroes';
import { buyItem } from '../src/game/shop';
import { nextStage, recLevel, recordClear, repeatBattle, starsAt, type StageId } from '../src/game/stage';
import { newSave, partyIds, type Save } from '../src/game/state';
import { seeded } from './helpers';

const DAY = 86400e3;
const T0 = Date.UTC(2026, 9, 19, 0, 0, 0);
interface Row { day: number; acc: number; lv: number; stage: string; dust: number; dustTotal: number; gold: number; gear: number; heroes: number }

function simulate(kind: string, days: number): Row[] {
  const P = CONFIG.econ[kind];
  const s: Save = newSave(T0);
  const rnd = seeded(42);
  let dustTotal = 0;
  const rows: Row[] = [];
  let best: StageId | null = null;
  for (let d = 0; d < days; d++) {
    const dust0 = s.cur.stardust;
    for (let k = 0; k < P.sessions; k++) {
      const now = T0 + d * DAY + (k / P.sessions) * DAY * 0.6 + 8 * 3600e3;
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
        if (P.sessions >= 4) for (let w = 0; w < CONFIG.content.world.tries; w++) s.cur.stardust += CONFIG.content.world.rewardDust[2];
        for (let a = 0; a < CONFIG.content.arena.tries; a++) finishRun({ mode: 'arena', arg: 'victory', sub: 1 }, { win: a % 2 === 0, dealt: 1, heroes: [] }, s, rnd, now);
        claimMiles(s);
        // 레벨 상한이면 각성 (각성석은 금화로)
        for (const id of partyIds(s))
          for (let g = 0; g < 10 && s.heroes[id].lv >= levelCap(id, s) && s.heroes[id].awaken < 5; g++) if (awaken(id, s) === 'poor' && buyItem('awaken', s) !== 'ok') break;
        for (let b = 0; b < P.buys; b++) if (s.cur.stardust >= CONFIG.stamina.buyDust) ((s.cur.stardust -= CONFIG.stamina.buyDust), (s.sta.n += CONFIG.stamina.buyN));
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
    dustTotal += Math.max(0, s.cur.stardust - dust0) + (P.buys ? 0 : 0);
    const ns = nextStage(s);
    rows.push({ day: d + 1, acc: s.acc.lv, lv: Math.round(partyIds(s).reduce((a, id) => a + s.heroes[id].lv, 0) / partyIds(s).length), stage: `${ns.c}-${ns.s}`, dust: s.cur.stardust, dustTotal, gold: s.cur.gold, gear: Object.keys(s.items).length, heroes: Math.floor(s.cur.stardust / CONFIG.shop.hero.founder) });
  }
  return rows;
}
const KINDS: [string, string][] = [['light', '라이트 (하루 2번 · 행동력 절반)'], ['normal', '보통 (하루 4번 · 행동력 다 씀)'], ['heavy', '헤비 (하루 8번 · 별가루로 행동력 3번 삼)']];
function doc() {
  const out = ['# 경제 시뮬 표 (자동 생성 · tests/economy.test.ts)', '', '가정: 추천 레벨이면 별 3개로 깸 · 장비 효과는 안 넣음(보수적) · 레벨 상한이면 각성(각성석은 금화) · 하루 무료 장비 소환 · 매일 희귀 이하 분해 · 방치 보상 매일 · C 콘텐츠: 탑(추천 레벨 층까지) · 결투장 5판(반 승) · 월드 보스 3판(보통·헤비, 상위 30%) · 이정표 · **아직 없는 별가루 출처(미션·업적·출석 = D덩어리)는 안 넣음** · 별가루는 영웅 사는 데 안 씀(쌓이는 양)', `영웅 값: 창립 멤버 별가루 ${CONFIG.shop.hero.founder} · 전설/새 영웅 ${CONFIG.shop.hero.legend}`, ''];
  for (const [k, name] of KINDS) {
    const rows = simulate(k, 30);
    out.push(`## ${name}`, '', '| 날 | 원정대 Lv | 파티 평균 Lv | 다음 스테이지 | 별가루 보유 | 금화 보유 | 장비 수 | 살 수 있는 영웅(창립) |', '|---|---|---|---|---|---|---|---|');
    for (const r of rows.filter((x) => [1, 7, 30].includes(x.day))) out.push(`| ${r.day}일 | ${r.acc} | ${r.lv} | ${r.stage} | ${r.dust.toLocaleString('ko-KR')} | ${r.gold.toLocaleString('ko-KR')} | ${r.gear} | ${r.heroes}명 |`);
    out.push('');
  }
  out.push('## 읽는 법', `- 별가루 출처(지금): 스토리 첫 클리어 ${CONFIG.reward.firstDust}(보스 ${CONFIG.reward.firstDustBoss}) · 별 3개 처음 ${CONFIG.reward.threeStarDust} · 판마다 ${CONFIG.reward.dust.chance * 100}% 확률로 ${CONFIG.reward.dust.n}×(난이도+1) · 탑 처음 깬 층 · 월드 보스 · 이정표 ${CONFIG.content.milestoneDust} · 레이드 승리 30`, '- D덩어리(미션·업적·출석)가 들어오면 더 늘어남 → 그때 다시 만들어 「일주일에 영웅 1~2명」에 맞춤', '- 헤비는 별가루로 행동력을 사서 보유량이 줄지만 진도가 가장 빠름', '');
  return out.join('\n');
}
describe('경제 시뮬', () => {
  it('세 유형 모두 30일 동안 스토리가 앞으로 가고, 헤비가 가장 멀리 간다', () => {
    const last = (k: string) => simulate(k, 30).at(-1)!;
    const [l, n, h] = ['light', 'normal', 'heavy'].map(last);
    const idx = (x: Row) => x.stage.split('-').map(Number).reduce((a, b) => a * 10 + b, 0);
    expect(idx(l)).toBeGreaterThan(12);
    expect(idx(h)).toBeGreaterThanOrEqual(idx(n));
    expect(idx(n)).toBeGreaterThanOrEqual(idx(l));
  });
  it('docs/ECONOMY.md 가 지금 숫자와 같다', () => {
    const md = doc();
    if (process.env.ECON_WRITE) writeFileSync('docs/ECONOMY.md', md);
    expect(existsSync('docs/ECONOMY.md') ? readFileSync('docs/ECONOMY.md', 'utf8') : '').toBe(md);
  });
});
