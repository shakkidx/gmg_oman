// Where the store keeps data that must survive redeploys: the SQLite database and uploaded photos.
//
// On Hostinger Node.js hosting the app runs from  /home/<user>/domains/<domain>/hbuilds/versions/<build>/...
// and every deployment creates a fresh build folder (old ones are removed). Anything written inside the
// app folder is therefore lost on redeploy, so we keep data next to hbuilds instead:
//     /home/<user>/domains/<domain>/gmg-data/store.db
//     /home/<user>/domains/<domain>/gmg-data/uploads/products/*
// Locally (or anywhere else) the old ./data folder is used. DATA_DIR in the environment overrides both.

const path = require('path');
const fs = require('fs');

const APP_ROOT = path.resolve(__dirname, '../..');

function resolveDataDir() {
  if (process.env.DATA_DIR) return path.resolve(process.env.DATA_DIR);
  const real = (() => { try { return fs.realpathSync(APP_ROOT); } catch (e) { return APP_ROOT; } })();
  const i = real.indexOf(`${path.sep}hbuilds${path.sep}`);
  if (i > 0) return path.join(real.slice(0, i), 'gmg-data');
  return path.join(APP_ROOT, 'data');
}

const DATA_DIR = resolveDataDir();
const HOSTINGER_BUILDS = (() => {
  const real = (() => { try { return fs.realpathSync(APP_ROOT); } catch (e) { return APP_ROOT; } })();
  const i = real.indexOf(`${path.sep}hbuilds${path.sep}`);
  return i > 0 ? real.slice(0, i) + `${path.sep}hbuilds` : null;
})();
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

fs.mkdirSync(path.join(UPLOADS_DIR, 'products'), { recursive: true });

/** Newest file with this relative path inside any earlier Hostinger build (used once, to rescue old data). */
function findInOldBuilds(relPath) {
  if (!HOSTINGER_BUILDS) return null;
  const found = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      const candidate = path.join(full, relPath);
      try { const st = fs.statSync(candidate); if (st.isFile() && !candidate.startsWith(APP_ROOT + path.sep)) found.push({ p: candidate, t: st.mtimeMs }); } catch (err) { /* none */ }
      walk(full, depth + 1);
    }
  };
  walk(HOSTINGER_BUILDS, 0);
  found.sort((a, b) => b.t - a.t);
  return found.length ? found[0].p : null;
}

/** Every earlier Hostinger build folder that contains this relative directory. */
function dirsInOldBuilds(relDir) {
  if (!HOSTINGER_BUILDS) return [];
  const out = [];
  const walk = (dir, depth) => {
    if (depth > 4) return;
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const e of entries) {
      if (!e.isDirectory() || e.name === 'node_modules') continue;
      const full = path.join(dir, e.name);
      const cand = path.join(full, relDir);
      try { if (fs.statSync(cand).isDirectory() && !cand.startsWith(APP_ROOT + path.sep)) out.push(cand); } catch (err) { /* none */ }
      walk(full, depth + 1);
    }
  };
  walk(HOSTINGER_BUILDS, 0);
  return out;
}

module.exports = { APP_ROOT, DATA_DIR, UPLOADS_DIR, findInOldBuilds, dirsInOldBuilds };
