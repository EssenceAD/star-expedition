// D덩어리: 미션(일일·주간·레이드)·업적·출석·이벤트 · 길드(출석·기여·상점·길드 레이드) · 친구 · 랭킹·칭호 · 우편 · 채팅 · 클라우드(서버 없음) · 저장 v6
import { describe, expect, it } from 'vitest';
import { CONFIG } from '../src/config';
import * as cloud from '../src/core/net/cloud';
import { buildRun, finishRun, lockOf } from '../src/game/content';
import { attend, attendToday, claim, claimAll, DAILY, eventLeft, isDone, readyOf } from '../src/game/missions';
import { addFriend, addMail, board, buyGuild, checkTitles, claimMail, donate, gift, guildAttend, guildBoss, joinGuild, mailUnread, sendChat } from '../src/game/social';
import { recordClear, repeatBattle } from '../src/game/stage';
import { migrate, newSave, SAVE_VERSION, track } from '../src/game/state';
import { seeded } from './helpers';

const NOW = Date.UTC(2026, 9, 20, 3, 0, 0);
const DAY = 86400e3;

describe('미션 · 업적 · 출석', () => {
  it('한 일을 세고 · 다 되면 받기 · 다음 날 새로', () => {
    const s = newSave(0);
    const m = DAILY.find((x) => x.id === 'd_stage')!;
    for (let i = 0; i < 5; i++) recordClear({ c: 1, s: 1, d: 0 }, { stars: 3, time: 60, dps: 1, mvp: 'woongs' }, s, seeded(1), NOW);
    expect(isDone('d', m, s)).toBe(true);
    const g = s.cur.gold;
    expect(claim('d', m.id, s, NOW)).toBe(true);
    expect(s.cur.gold).toBe(g + m.give.gold);
    expect(claim('d', m.id, s, NOW)).toBe(false);
    expect(isDone('d', m, s)).toBe(true);
    track('x', 1, s, NOW + DAY);
    expect(isDone('d', m, s)).toBe(false);
    expect(s.claimed.d).toEqual([]);
    // 업적은 계속 셈
    expect(s.track.all.stage).toBe(5);
  });
  it('반복 전투·행동력도 셈 · 모두 받기', () => {
    const s = newSave(0);
    recordClear({ c: 1, s: 1, d: 0 }, { stars: 3, time: 60, dps: 1, mvp: 'woongs' }, s, seeded(1), NOW);
    s.sta = { n: 200, at: NOW };
    repeatBattle({ c: 1, s: 1, d: 0 }, 10, s, seeded(2), NOW);
    expect(s.track.d.repeat).toBe(10);
    expect(s.track.d.sta).toBe(60);
    expect(readyOf('d', s, NOW).length).toBeGreaterThanOrEqual(2);
    expect(claimAll('d', s, NOW)).toBeGreaterThanOrEqual(2);
  });
  it('출석: 하루 한 번 · 7일 돌림 · 이벤트 기간이면 별가루 더', () => {
    const s = newSave(0);
    expect(attendToday(s, NOW)).toBe(true);
    const d0 = s.cur.stardust;
    expect(attend(s, NOW)!.day).toBe(1);
    expect(attend(s, NOW)).toBeNull();
    expect(attend(s, NOW + DAY)!.day).toBe(2);
    expect(eventLeft(NOW)).toBeGreaterThan(0);
    expect(s.attend.ev).toBe(2);
    expect(s.cur.stardust).toBe(d0 + CONFIG.social.attend[1].stardust + 2 * CONFIG.social.event.dust);
  });
});

describe('길드 · 친구 · 랭킹 · 우편 · 채팅', () => {
  it('길드: 가입(우편) · 출석 · 기여(하루 한 번) · 상점 · 길드 레이드', () => {
    const s = newSave(0);
    expect(lockOf({ mode: 'graid', arg: 0 }, s, NOW)).toMatch(/길드/);
    joinGuild('ai1', s, NOW);
    expect(mailUnread(s)).toBe(2);
    expect(guildAttend(s, NOW)).toBe(true);
    expect(guildAttend(s, NOW)).toBe(false);
    s.cur.gold = 1e6;
    expect(donate(1, s, NOW)).toBe('ok');
    expect(donate(1, s, NOW)).toBe('done');
    expect(s.guild.weekContrib).toBe(CONFIG.social.guild.donate[1][1]);
    s.cur.guildCoin = 1000;
    expect(buyGuild('g_book', s)).toBe('ok');
    expect(buildRun({ mode: 'graid', arg: 0 }, s, NOW).timeUp).toBe('win');
    const hp = guildBoss(s, NOW).hp;
    finishRun({ mode: 'graid', arg: 0 }, { win: true, dealt: 5e7, heroes: [] }, s, seeded(3), NOW);
    expect(s.guild.raid).toBe(5e7);
    expect(guildBoss(s, NOW).hp).toBeLessThan(hp);
  });
  it('친구: 추가 · 선물 하루 한 번 · 답례 행동력', () => {
    const s = newSave(0);
    expect(addFriend('새벽등불', s)).toBe(true);
    const n = s.sta.n;
    expect(gift('새벽등불', s, NOW)).toBe('ok');
    expect(gift('새벽등불', s, NOW)).toBe('done');
    expect(s.sta.n).toBe(n + CONFIG.social.friends.gift);
    expect(gift('새벽등불', s, NOW + DAY)).toBe('ok');
  });
  it('랭킹: 결투장 점수가 높으면 랭커 칭호', () => {
    const s = newSave(0);
    s.arena.score = 99999;
    expect(board('arena', s, NOW)[0].me).toBe(true);
    expect(checkTitles(s, NOW)).toContain('결투의 별');
    expect(checkTitles(s, NOW)).toEqual([]);
  });
  it('우편 받기 · 채팅(내 글 · 칭호)', () => {
    const s = newSave(0);
    const m = addMail(s, '시험', '선물', '', { stardust: 5 }, NOW);
    const d = s.cur.stardust;
    expect(claimMail(m.id, s)).toBe(true);
    expect(s.cur.stardust).toBe(d + 5);
    s.titles.on = '탑 정복자';
    const l = sendChat('  안녕하세요  ', 'world', s, NOW)!;
    expect(l.text).toBe('안녕하세요');
    expect(l.title).toBe('탑 정복자');
    expect(sendChat('길드', 'guild', s, NOW)).toBeNull();
  });
  it('클라우드: 서버 설정이 없으면 이 기기만 (오류 없이)', async () => {
    expect(await cloud.who()).toBeNull();
    expect(await cloud.push(newSave(0))).toMatch(/서버|시험/);
    expect(await cloud.recentChat(0)).toEqual([]);
  });
  it('저장 v5 → v6: 소셜 칸이 생김', () => {
    const v5 = { ...newSave(0), version: 5 } as Record<string, unknown>;
    for (const k of ['track', 'claimed', 'attend', 'guild', 'friends', 'titles', 'mail', 'chat', 'cloud']) delete v5[k];
    const s = migrate(v5, 1);
    expect(s.version).toBe(SAVE_VERSION);
    expect(s.guild.id).toBeNull();
    expect(s.mail.list.length).toBe(1);
  });
});
