// Denvasweb build script
//
// What this does:
//   1. Copies the whole site into dist/ (everything except this script,
//      the partials/ folder, .git, and dist/ itself).
//   2. Reads partials/footer.html once.
//   3. In every .html file copied into dist/, replaces the marker
//      <!-- INCLUDE:footer --> with the footer's real markup.
//
// Netlify runs `node build.js` automatically on every deploy (see
// netlify.toml) and publishes the dist/ folder — so editing
// partials/footer.html updates the footer on every page at once.
//
// To preview locally: run `node build.js`, then point Live Server (or
// any static server) at the dist/ folder, not the repo root — the repo
// root still has the <!-- INCLUDE:footer --> markers, not a real footer.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');
const SKIP = new Set(['.git', 'node_modules', 'dist', 'partials', 'build.js', '.gitignore', 'netlify.toml', '.gitattributes']);
const FOOTER_MARKER = '<!-- INCLUDE:footer -->';

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

function injectFooter(dir, footerHtml) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      injectFooter(full, footerHtml);
    } else if (entry.name.endsWith('.html')) {
      const original = fs.readFileSync(full, 'utf8');
      if (original.includes(FOOTER_MARKER)) {
        const updated = original.split(FOOTER_MARKER).join(footerHtml);
        fs.writeFileSync(full, updated, 'utf8');
      }
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

// 3. Inject the shared footer into every page
const footerHtml = fs.readFileSync(path.join(ROOT, 'partials', 'footer.html'), 'utf8').trim();
injectFooter(DIST, footerHtml);

console.log('Build complete → dist/');
