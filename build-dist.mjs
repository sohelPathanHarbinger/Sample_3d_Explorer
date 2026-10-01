/**
 * build-dist.mjs — makes a compressed copy of the site in dist/ for sharing
 * ---------------------------------------------------------------
 * Run:  node build-dist.mjs
 *
 * dist/ gets only what the page needs: index.html without its comments,
 * minified JavaScript and CSS, and every project's assets. The docs and
 * the git history are left out. Needs Node.js and, the first time, an
 * internet connection (npx downloads esbuild). dist/ is in .gitignore.
 * ---------------------------------------------------------------
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = 'dist';
const ESBUILD = 'esbuild@0.24.0';

process.chdir(path.dirname(fileURLToPath(import.meta.url))); // works when started from another folder

/** Every file below `dir`, with forward slashes. */
function listFiles(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .map((file) => path.join(dir, file).replaceAll('\\', '/'))
    .filter((file) => fs.statSync(file).isFile());
}

fs.rmSync(OUT, { recursive: true, force: true });

// 1. JavaScript and CSS: comments removed, names shortened, same folder layout
const code = [...listFiles('engine'), ...listFiles('projects'), 'css/style.css']
  .filter((file) => !file.includes('/assets/') && /\.(js|css)$/.test(file));
execSync(
  `npx --yes ${ESBUILD} ${code.map((file) => `"${file}"`).join(' ')} ` +
  `--minify --legal-comments=none --format=esm --target=es2022 --outbase=. --outdir=${OUT} --log-level=warning`,
  { stdio: 'inherit' },
);

// 2. Everything else in the projects (images, audio, video, 3D models, 360° photos) is copied as it is
for (const file of listFiles('projects').filter((file) => !code.includes(file))) {
  fs.mkdirSync(path.dirname(`${OUT}/${file}`), { recursive: true });
  fs.copyFileSync(file, `${OUT}/${file}`);
}

// 3. The page itself, without its HTML comments
const html = fs.readFileSync('index.html', 'utf8')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/\n\s*\n+/g, '\n');
fs.writeFileSync(`${OUT}/index.html`, html);

console.log(`Done: ${OUT}/ is ready. Try it with:  python -m http.server 8080 --directory ${OUT}`);
