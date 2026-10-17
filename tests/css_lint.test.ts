// CSS 장식 금지 린트 (docs/UI_KIT_1018.md §0-1): 틀·판·버튼·바는 kit2 그림 — CSS로 선·둥근 모서리·그라데이션·그림자·외곽선을 그리지 않는다
//  src/**/*.css 와 .ts(인라인 스타일 문자열) 안에서 아래 속성 개수를 세어 tests/css_lint_baseline.json 보다 많으면 실패
//  · border / border-top|right|bottom|left / border-color (값 0·none·transparent 제외 · border-image용 border-style·border-width는 셈 안 함)
//  · border-*-radius (값 0 제외) · linear/radial/conic-gradient( · box-shadow (none 제외) · outline (0·none 제외)
//  기준값은 내리기만 한다: CSS_LINT_WRITE=1 npx vitest run tests/css_lint.test.ts — 늘어난 곳이 하나라도 있으면 안 씀
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', 'src');
const BASE = join(__dirname, 'css_lint_baseline.json');
type Kind = 'border' | 'radius' | 'gradient' | 'boxShadow' | 'outline';
const KINDS: Kind[] = ['border', 'radius', 'gradient', 'boxShadow', 'outline'];
type Counts = Record<Kind, number>;

function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|css)$/.test(f)) out.push(p);
  }
  return out;
}
const rel = (p: string) => p.slice(ROOT.length + 1).replace(/\\/g, '/');
/** 주석 빼기 */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const END = `[^;}"'\`]*`;
const RE: Record<Kind, RegExp> = {
  border: new RegExp(`(?<![\\w-])border(?:-(?:top|right|bottom|left))?(?:-color)?\\s*:\\s*(${END})`, 'g'),
  radius: new RegExp(`(?<![\\w-])border(?:-(?:top|bottom)-(?:left|right))?-radius\\s*:\\s*(${END})`, 'g'),
  gradient: /(?<![\w-])(?:repeating-)?(?:linear|radial|conic)-gradient\(/g,
  boxShadow: new RegExp(`(?<![\\w-])box-shadow\\s*:\\s*(${END})`, 'g'),
  outline: new RegExp(`(?<![\\w-])outline\\s*:\\s*(${END})`, 'g'),
};
const NONE = /^\s*(?:0|0px|none|transparent|initial|unset)?\s*(?:!important)?\s*$/;
export function count(src: string): Counts {
  const s = strip(src);
  const out = {} as Counts;
  for (const k of KINDS) out[k] = [...s.matchAll(RE[k])].filter((m) => k === 'gradient' || !NONE.test(m[1] ?? '')).length;
  return out;
}
export function measure() {
  const per: Record<string, Counts> = {};
  const total = Object.fromEntries(KINDS.map((k) => [k, 0])) as Counts;
  for (const p of files(ROOT).sort()) {
    const c = count(readFileSync(p, 'utf8'));
    if (KINDS.every((k) => !c[k])) continue;
    per[rel(p)] = c;
    for (const k of KINDS) total[k] += c[k];
  }
  return { total, files: per };
}

describe('CSS 장식 린트 (UI_KIT_1018 §0-1)', () => {
  const now = measure();
  const base = JSON.parse(readFileSync(BASE, 'utf8')) as ReturnType<typeof measure>;
  it('세는 규칙: 그림 9-slice(border-image)와 0·none은 안 셈', () => {
    expect(count('.a { border-style: solid; border-width: 0; border-image: url(x.png) 25 fill / 12px / 0 stretch; }')).toEqual({ border: 0, radius: 0, gradient: 0, boxShadow: 0, outline: 0 });
    expect(count('.a { border: 0; outline: none; box-shadow: none; border-radius: 0 }')).toEqual({ border: 0, radius: 0, gradient: 0, boxShadow: 0, outline: 0 });
    expect(count('.a { border: 1px solid red; border-radius: 4px; background: linear-gradient(red, blue); box-shadow: 0 0 2px red; outline: 1px solid; }')).toEqual({ border: 1, radius: 1, gradient: 1, boxShadow: 1, outline: 1 });
    expect(count('`<i style="border-left:2px solid;border-bottom-left-radius:3px">`')).toEqual({ border: 1, radius: 1, gradient: 0, boxShadow: 0, outline: 0 });
  });
  it('파일마다 기준값보다 많지 않다 (새 파일은 0)', () => {
    const bad: string[] = [];
    for (const [f, c] of Object.entries(now.files))
      for (const k of KINDS) if (c[k] > (base.files[f]?.[k] ?? 0)) bad.push(`${f} ${k}: ${base.files[f]?.[k] ?? 0} → ${c[k]}`);
    expect(bad).toEqual([]);
  });
  it('전체 합도 기준값보다 많지 않다', () => {
    for (const k of KINDS) expect(now.total[k], k).toBeLessThanOrEqual(base.total[k]);
    if (process.env.CSS_LINT_WRITE) writeFileSync(BASE, `${JSON.stringify(now, null, 1)}\n`);
  });
});
