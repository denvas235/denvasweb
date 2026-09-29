// Denvasweb build script
//
// What this does:
//   1. Copies the whole site into dist/ (everything except this script,
//      the partials/ folder, .git, and dist/ itself).
//   2. Reads every file in partials/ (e.g. footer.html, navbar.html).
//   3. In every .html file copied into dist/, replaces each marker
//      <!-- INCLUDE:name --> with that partial's real markup — where
//      "name" is the partial's filename without .html (footer, navbar).
//
// Netlify runs `node build.js` automatically on every deploy (see
// netlify.toml) and publishes the dist/ folder — so editing a file in
// partials/ updates that piece on every page that includes it, at once.
//
// To preview locally: run `node build.js`, then point Live Server (or
// any static server) at the dist/ folder, not the repo root — the repo
// root still has the <!-- INCLUDE:... --> markers, not the real markup.
//
// To add a new shared piece (e.g. a shared <head> block): drop a file
// in partials/, and add <!-- INCLUDE:that-filename --> wherever it
// should be inserted in the source .html pages.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const PARTIALS_DIR = path.join(ROOT, 'partials');
const SKIP = new Set(['.git', 'node_modules', 'dist', 'partials', 'build.js', '.gitignore', 'netlify.toml', '.gitattributes']);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      if (path.dirname(src) === ROOT && SKIP.has(entry)) continue;
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function loadPartials() {
  const partials = {};
  if (!fs.existsSync(PARTIALS_DIR)) return partials;
  for (const entry of fs.readdirSync(PARTIALS_DIR)) {
    if (!entry.endsWith('.html')) continue;
    const name = entry.replace(/\.html$/, '');
    partials[name] = fs.readFileSync(path.join(PARTIALS_DIR, entry), 'utf8').trim();
  }
  return partials;
}

function injectPartials(dir, partials) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      injectPartials(full, partials);
    } else if (entry.name.endsWith('.html')) {
      let content = fs.readFileSync(full, 'utf8');
      let changed = false;
      for (const [name, html] of Object.entries(partials)) {
        const marker = `<!-- INCLUDE:${name} -->`;
        if (content.includes(marker)) {
          content = content.split(marker).join(html);
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(full, content, 'utf8');
    }
  }
}

// 1. Clean dist/
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

// 2. Copy everything (except the skip list) into dist/
for (const entry of fs.readdirSync(ROOT)) {
  if (SKIP.has(entry)) continue;
  copyRecursive(path.join(ROOT, entry), path.join(DIST, entry));
}

// 3. Inject every shared partial into every page
const partials = loadPartials();
injectPartials(DIST, partials);

console.log(`Build complete → dist/ (partials: ${Object.keys(partials).join(', ') || 'none'})`);
