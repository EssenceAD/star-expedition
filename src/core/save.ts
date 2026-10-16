// 「용사님, 체크인하실게요~」 src/save/save.ts (작은 설정 · 세이브 키) 에서 복사해 온 모듈 (별의 원정대용으로 import만 고침)
const KEY = 'star-expedition-';
export function getPref<T>(key: string, d: T): T {
  try {
    const v = localStorage.getItem(KEY + key);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
export function setPref(key: string, v: unknown) {
  try {
    localStorage.setItem(KEY + key, JSON.stringify(v));
  } catch {
    /* 무시 */
  }
}
