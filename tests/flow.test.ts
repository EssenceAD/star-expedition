// 화면 흐름도 (STAR_PLAN_v2 §1-11): 각 화면이 「로비에서 몇 탭」인지 · 「첫 실행 → 첫 전투 몇 탭」
//  docs/FLOW.md 는 이 시험이 만든다: FLOW_WRITE=1 npx vitest run tests/flow.test.ts (내용이 다르면 실패 → 다시 만들기)
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../src/ui/view', () => ({ view: {} }));
const { FLOW, SCREEN_NAME } = await import('../src/ui/core');
type Id = keyof typeof FLOW;

/** 한 화면에서 각 화면까지 최소 탭 수 (BFS) */
function taps(from: Id): Record<string, number> {
  const d: Record<string, number> = { [from]: 0 };
  const q: Id[] = [from];
  while (q.length) {
    const a = q.shift()!;
    for (const [b] of FLOW[a]) if (d[b] === undefined) ((d[b] = d[a] + 1), q.push(b));
  }
  return d;
}
/** 첫 실행 → 첫 전투: 타이틀 「원정 출발」 1탭 → 1-1 필드에서 프롤로그(5줄 · 스킵 1탭) → 전투 */
const FIRST_BATTLE_TAPS = 2;

function doc() {
  const fromLobby = taps('lobby');
  const ids = Object.keys(FLOW) as Id[];
  const lines = [
    '# 화면 흐름도 (자동 생성 · tests/flow.test.ts)',
    '',
    `- 첫 실행 → 첫 전투: **${FIRST_BATTLE_TAPS}탭** (타이틀 「원정 출발」 → 1-1 필드에서 프롤로그 5줄, 스킵 1탭 또는 5탭 → 전투 시작)`,
    '- 첫 전투 승리 → 「원정대 여관으로」 1탭 → 로비',
    '- 원칙: 주요 기능 1탭 · 모든 기능 3탭 이내 (STAR_PLAN_v2 최상위 원칙)',
    '',
    '| 화면 | 로비에서 탭 수 | 이 화면에서 갈 수 있는 곳 (누르는 것) |',
    '|---|---|---|',
    ...ids.map((id) => `| ${SCREEN_NAME[id]} | ${fromLobby[id] ?? '-'} | ${FLOW[id].map(([to, how]) => `${SCREEN_NAME[to]} (${how})`).join('<br>')} |`),
    '',
    '```mermaid',
    'flowchart LR',
    ...ids.flatMap((id) => FLOW[id].map(([to, how]) => `  ${id}["${SCREEN_NAME[id]}"] -->|"${how.replace(/"/g, "'")}"| ${to}["${SCREEN_NAME[to]}"]`)),
    '```',
    '',
    '아직 없는 화면(1단계 B·C·D덩어리에서 생김): 가방 · 상점 · 미션 · 업적 · 친구 · 길드 · 랭킹 · 우편 · 채팅 창 · 월드 보스 · 레이드 — 로비에서 모두 1탭 자리(아래 줄·오른쪽 큰 버튼)는 이미 있음',
    '',
  ];
  return lines.join('\n');
}

describe('화면 흐름', () => {
  it('로비에서 모든 화면이 3탭 이내 · 모험·영웅·편성은 1탭 · 첫 전투까지 2탭', () => {
    const d = taps('lobby');
    for (const id of Object.keys(FLOW).filter((x) => x !== 'title')) expect(d[id], id).toBeLessThanOrEqual(3);
    for (const id of ['adventure', 'heroes', 'prep']) expect(d[id], id).toBe(1);
    expect(d.battle).toBe(2);
    expect(taps('title').battle).toBe(1);
  });
  it('docs/FLOW.md 가 지금 흐름과 같다', () => {
    const md = doc();
    if (process.env.FLOW_WRITE) writeFileSync('docs/FLOW.md', md);
    expect(existsSync('docs/FLOW.md') ? readFileSync('docs/FLOW.md', 'utf8') : '').toBe(md);
  });
});
