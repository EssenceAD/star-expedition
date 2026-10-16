import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

// 「용사님 체크인」 vite.config 에서 가져온 버전 번호 붙이기 (version.json · 화면 버전 글자)
const ROOT = dirname(fileURLToPath(import.meta.url));
const at = (p: string) => join(ROOT, p);
const pkg = JSON.parse(readFileSync(at('package.json'), 'utf8'));
let rev = 'dev';
try {
  rev = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch {
  /* git 없음 */
}
const BUILD = `${pkg.version}+${rev}.${Date.now().toString(36)}`;
let out = 'dist';
function versionFiles(): Plugin {
  return {
    name: 'star-version',
    apply: 'build',
    configResolved(c) {
      out = c.build.outDir;
    },
    closeBundle() {
      const notes = existsSync(at('public/patchnotes.json')) ? JSON.parse(readFileSync(at('public/patchnotes.json'), 'utf8')) : [];
      const top = notes[0] ?? {};
      writeFileSync(at(join(out, 'version.json')), JSON.stringify({ version: pkg.version, build: BUILD, at: new Date().toISOString(), title: top.version === pkg.version ? (top.title ?? '') : '' }));
    },
  };
}
export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(pkg.version), __BUILD__: JSON.stringify(BUILD) },
  plugins: [versionFiles()],
  build: { target: 'es2022', rollupOptions: { input: { main: at('index.html'), lab: at('lab.html') } } },
});
