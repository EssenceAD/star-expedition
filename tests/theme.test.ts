// 1단계 원칙: 색·폰트·여백·테두리·아이콘은 테마 토큰 파일 하나에서만 (ROADMAP §0)
//  src/ 안 다른 파일(tokens.ts 빼고 · 그림 실험실 lab.ts는 개발 도구라 뺌)에 색 리터럴·폰트 이름·아이콘 글자가 있으면 실패
//  CSS는 꾸밈 속성(색·배경·테두리·반경·여백·간격·글자 크기·그림자·폰트)에 px/색 값을 직접 쓰면 실패 → var(--…) 만
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '..', 'src');
const SKIP = new Set(['theme/tokens.ts', 'lab.ts']);
function files(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) files(p, out);
    else if (/\.(ts|css)$/.test(f)) out.push(p);
  }
  return out;
}
const rel = (p: string) => p.slice(ROOT.length + 1).replace(/\\/g, '/');
/** 주석 빼기 (설명에는 화살표·기호를 써도 됨) */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const all = files(ROOT).filter((p) => !SKIP.has(rel(p))).map((p) => ({ p: rel(p), src: strip(readFileSync(p, 'utf8')) }));
const lines = (src: string, re: RegExp) => src.split('\n').map((l, i) => [i + 1, l] as const).filter(([, l]) => re.test(l));

describe('테마 토큰 밖 리터럴 금지', () => {
  it('색: #hex · rgb() · hsl()', () => {
    const re = /#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})(?![\w-])|\b(?:rgba?|hsla?)\(/i;
    const bad = all.flatMap(({ p, src }) => lines(src, re).map(([n, l]) => `${p}:${n} ${l.trim()}`));
    expect(bad).toEqual([]);
  });
  it('폰트 이름', () => {
    const re = /Segoe|Malgun|Gothic|system-ui|sans-serif|serif"|monospace/;
    const bad = all.flatMap(({ p, src }) => lines(src, re).map(([n, l]) => `${p}:${n} ${l.trim()}`));
    expect(bad).toEqual([]);
  });
  it('아이콘 글자 (이모지·기호) → icon(키)', () => {
    const re = /[←-⇿⌀-⏿①-⓿■-➿⬀-⯿\u{1f000}-\u{1faff}]/u;
    const bad = all.flatMap(({ p, src }) => lines(src, re).map(([n, l]) => `${p}:${n} ${l.trim()}`));
    expect(bad).toEqual([]);
  });
  it('CSS 꾸밈 값은 var(--…)만', () => {
    const css = all.filter((f) => f.p.endsWith('.css'));
    const prop = /(?:^|[;{]\s*)((?:-webkit-text-stroke|border(?:-(?:top|bottom|left|right))?(?:-(?:width|color|radius))?|outline|padding(?:-\w+)?|margin(?:-\w+)?|gap|row-gap|column-gap|font-size|font-weight|font-family|box-shadow|text-shadow|color|background(?:-color)?))\s*:\s*([^;}]*)/g;
    const bad: string[] = [];
    for (const { p, src } of css)
      for (const [n, l] of lines(src, /:/)) {
        for (const m of l.matchAll(prop)) {
          const v = m[2].replace(/var\([^)]*\)/g, '');
          if (/\d+px|#[0-9a-f]{3}|\b[1-9]00\b/i.test(v)) bad.push(`${p}:${n} ${m[1]}: ${m[2].trim()}`);
        }
      }
    expect(bad).toEqual([]);
  });
});

// MASTER_1018 T2: 글꼴 하나 (UI = Gothic A1 · 예외 전투 피해 숫자 Luckiest Guy) — 다른 글꼴이 나오면 실패
describe('T2 글꼴 하나', () => {
  const ALLOWED = ['Gothic A1', 'Luckiest Guy', 'Apple SD Gothic Neo', 'Malgun Gothic'];
  it('tokens.ts 글꼴 이름은 허용 목록뿐 · 글꼴 값은 ui·dmg 둘', () => {
    const src = strip(readFileSync(join(ROOT, 'theme/tokens.ts'), 'utf8'));
    const font = src.slice(src.indexOf('font: {'), src.indexOf('size: {', src.indexOf('font: {')));
    const names = [...font.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    expect(names.filter((n) => !ALLOWED.includes(n))).toEqual([]);
    expect([...font.matchAll(/^\s*(\w+): '"/gm)].map((m) => m[1])).toEqual(['ui', 'dmg']);
  });
  it('CSS 글꼴은 var(--f-ui) 또는 inherit만 · 다른 --f- 변수 없음', () => {
    const bad = all.filter((f) => f.p.endsWith('.css')).flatMap(({ p, src }) =>
      lines(src, /font-family|var\(--f-/).filter(([, l]) => /var\(--f-(?!ui\))/.test(l) || [...l.matchAll(/font-family\s*:\s*([^;}]*)/g)].some((m) => !/^(var\(--f-ui\)|inherit)$/.test(m[1].trim()))).map(([n, l]) => `${p}:${n} ${l.trim()}`),
    );
    expect(bad).toEqual([]);
  });
  it('캔버스 ctx.font 는 canvasFont/canvasFace 로만', () => {
    const bad = all.filter((f) => f.p.endsWith('.ts')).flatMap(({ p, src }) => lines(src, /\.font\s*=/).filter(([, l]) => !/\.font\s*=\s*canvas(Font|Face)\(/.test(l)).map(([n, l]) => `${p}:${n} ${l.trim()}`));
    expect(bad).toEqual([]);
  });
  it('index.html 은 Gothic A1 · Luckiest Guy 만 받음', () => {
    const html = readFileSync(join(ROOT, '..', 'index.html'), 'utf8');
    const fams = [...html.matchAll(/family=([^&"]+)/g)].map((m) => decodeURIComponent(m[1].split(':')[0]).replace(/\+/g, ' '));
    expect(fams.filter((f) => !ALLOWED.includes(f))).toEqual([]);
  });
});
