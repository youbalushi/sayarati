// سيارتي — final pre-release check. Drives the real app in throwaway browser profiles.
// Usage: node tests/run-final-check.mjs <playwright path>
//   BASE (http, default http://localhost:8766) for the UI checks;
//   HTTPS_BASE (e.g. https://localhost:8443) for the offline/service-worker check (needs https).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8766';
const HTTPS_BASE = process.env.HTTPS_BASE || '';
const results = [], issues = [];
const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });
const b = await chromium.launch({ args: ['--ignore-certificate-errors'] });
const watch = (p, tag) => {
  p.on('pageerror', e => issues.push(`${tag} pageerror: ${e.message}`));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') issues.push(`${tag} console.${m.type()}: ${m.text()}`); });
  p.on('requestfailed', r => issues.push(`${tag} request failed: ${r.url()}`));
};
const store = p => p.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')));
const wait = (p, ms = 300) => p.waitForTimeout(ms);
const go = async (p, h) => { await p.evaluate(x => { location.hash = x; }, h); await wait(p, 350); };
const esc = async p => { await p.keyboard.press('Escape'); await wait(p, 260); };

/* ---------- 1. every screen + every sheet, AR/EN × light/dark × phone/desktop ---------- */
for (const lang of ['ar', 'en']) for (const theme of ['light', 'dark']) for (const [w, h] of [[390, 844], [1280, 900]]) {
  const tag = `${lang}/${theme}/${w}`;
  const c = await b.newContext({ viewport: { width: w, height: h } }); const p = await c.newPage(); watch(p, tag);
  await p.addInitScript(([l, t]) => { localStorage.setItem('mc-lang', l); localStorage.setItem('mc-theme', t); }, [lang, theme]);
  await p.goto(`${BASE}/index.html`); await wait(p, 400);
  await p.click('[data-act=demo]'); await wait(p, 400);
  const env = await p.evaluate(() => ({ dir: document.documentElement.dir, lang: document.documentElement.lang, theme: document.documentElement.dataset.theme }));
  ok(`${tag}: direction, language and theme applied`, env.dir === (lang === 'ar' ? 'rtl' : 'ltr') && env.lang === lang && env.theme === theme, JSON.stringify(env));
  const bad = [];
  for (const scr of ['home', 'maint', 'log', 'remind', 'reports', 'settings', 'car']) {
    await go(p, scr);
    const r = await p.evaluate(() => {
      scrollTo(0, 1e6);
      const nav = document.getElementById('nav-bottom'), navTop = getComputedStyle(nav).display === 'none' ? innerHeight : nav.getBoundingClientRect().top;
      const leaves = [...document.querySelectorAll('#main *')].filter(e => e.offsetParent && !e.children.length);
      const raw = (document.getElementById('main').innerText.match(/\b(?:home|car|log|rem|rems|rep|set|entry|catalog|nav|action|state|unit)\.[a-zA-Z]+\b/g) || []);
      return { len: document.getElementById('main').innerText.trim().length, over: document.documentElement.scrollWidth > innerWidth, covered: Math.max(...leaves.map(e => e.getBoundingClientRect().bottom)) > navTop, raw };
    });
    if (r.len < 20 || r.over || r.covered || r.raw.length) bad.push(`${scr}:${JSON.stringify(r)}`);
  }
  ok(`${tag}: all 7 screens (+ old #car link) render, no sideways scroll, nothing under the nav, no raw text keys`, !bad.length, bad.join(' | '));
  // sheets
  const sheets = [];
  const sheet = async (name, open, sel) => { await open(); await wait(p, 420); const s = await p.evaluate(q => { const e = document.querySelector('.mc-scrim.is-open .mc-sheet'); return !!e && !!document.querySelector(q) && e.scrollWidth <= e.clientWidth + 1; }, sel); if (!s) sheets.push(name); await esc(p); };
  await go(p, 'home');
  await sheet('type picker', () => p.click(w < 900 ? '#nav-bottom [data-act=fab]' : '#nav-rail [data-act=fab]'), '[data-entry-type]');
  for (const ty of ['fuel', 'service', 'expense', 'income']) await sheet(`${ty} form`, async () => { await p.click(w < 900 ? '#nav-bottom [data-act=fab]' : '#nav-rail [data-act=fab]'); await wait(p, 300); await p.click(`.mc-scrim [data-entry-type=${ty}]`); }, '#en-form');
  await go(p, 'home'); await sheet('vehicle editor', () => p.click('.hm-hero [data-car=edit]'), '#ve-form');
  await sheet('catalog', async () => { await p.click('.hm-hero [data-car=edit]'); await wait(p, 400); await p.click('#ve-cat'); }, '.mc-scrim [data-ct-color]');
  await sheet('document editor', () => p.click('.hm-docs [data-car=doc-add][data-type=insurance]'), '#de-form');
  await go(p, 'remind'); await sheet('reminder form', () => p.click('.rl [data-act=addrem]'), '#rm-form');
  await sheet('calendar', () => p.click('.rl-card [data-act=ics]'), '[data-act=icsfile]');
  await go(p, 'settings'); await sheet('category editor', () => p.click('[data-set-cat=add]'), '#cat-form');
  ok(`${tag}: all 11 sheets open and fit`, !sheets.length, sheets.join(', '));
  await go(p, 'home'); await p.click('[data-mc-menu=hm-cars]'); await wait(p, 250);
  ok(`${tag}: car menu opens inside the screen with the car + "add car"`, await p.evaluate(() => { const m = document.getElementById('hm-cars'), r = m.getBoundingClientRect(); return !m.hidden && r.left >= 0 && r.right <= innerWidth && m.querySelectorAll('[data-action=hm-car]').length === 1 && !!m.querySelector('[data-action=hm-addcar]'); }));
  await p.keyboard.press('Escape'); await wait(p, 200);
  await c.close();
}

/* ---------- 2. vehicles: add / edit / delete ---------- */
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); watch(p, 'vehicles');
  await p.goto(`${BASE}/index.html`); await wait(p, 400);
  await p.click('.hm [data-act=addveh]'); await wait(p, 400);
  await p.selectOption('#ve-make', 'toyota'); await wait(p, 100); await p.selectOption('#ve-model', 'Land Cruiser');
  await p.fill('#ve-year', '2020'); await p.fill('#ve-plate', '12345 أ ب'); await p.fill('#ve-tank', '90'); await p.fill('#ve-odo', '120000');
  await p.click('#ve-save'); await wait(p, 400);
  let S = (await store(p)).S;
  const v1 = S.vehicles[0];
  ok('vehicle: add saves make, model, year, plate, tank, odometer', S.vehicles.length === 1 && v1.make === 'toyota' && v1.model === 'Land Cruiser' && +v1.year === 2020 && v1.plate === '12345 أ ب' && +v1.tank === 90 && +v1.odo0 === 120000, JSON.stringify(v1));
  await go(p, 'home'); await p.click('.hm-hero [data-car=edit]'); await wait(p, 400); await p.fill('#ve-nick', 'سيارة العمل'); await p.fill('#ve-plate', '777'); await p.click('#ve-save'); await wait(p, 400);
  S = (await store(p)).S;
  ok('vehicle: edit updates the same car', S.vehicles.length === 1 && S.vehicles[0].id === v1.id && S.vehicles[0].plate === '777' && /سيارة العمل/.test(await p.textContent('.hm-car__name')));
  await go(p, 'settings'); await p.click('.st [data-act=demo]'); await wait(p, 400);
  S = (await store(p)).S; const v2 = S.vehicles.find(v => v.id !== v1.id);
  // give car 1 a record + reminder so the delete has something to remove
  await go(p, 'home');
  await p.click('[data-mc-menu=hm-cars]'); await wait(p, 200); await p.click(`#hm-cars [data-action=hm-car][data-value="${v1.id}"]`); await wait(p, 400);
  await p.click('#nav-bottom [data-act=fab]'); await wait(p, 300); await p.click('.mc-scrim [data-entry-type=fuel]'); await wait(p, 300);
  await p.fill('#en-odo', '120400'); await p.fill('#en-liters', '50'); await p.fill('#en-ppl', '0.239'); await p.click('#en-save'); await wait(p, 400);
  await p.click('#nav-bottom [data-act=fab]'); await wait(p, 300); await p.click('.mc-scrim [data-entry-rem]'); await wait(p, 500); await p.click('#rm-save'); await wait(p, 400);
  let D = await store(p);
  const v2recs = Object.values(D.E).flat().filter(x => x.v === v2.id).length, v2rems = D.S.reminders.filter(r => r.v === v2.id).length;
  ok('vehicle: second car gets its own record + reminder', Object.values(D.E).flat().some(x => x.v === v1.id) && D.S.reminders.some(r => r.v === v1.id));
  await go(p, 'home'); await p.click('.hm-hero [data-car=edit]'); await wait(p, 400); await p.click('#ve-del'); await wait(p, 300);
  await p.click('.mc-scrim [data-mc-close]'); await wait(p, 300);
  ok('vehicle: cancelling delete keeps everything', (await store(p)).S.vehicles.length === 2);
  await go(p, 'home'); await p.click('.hm-hero [data-car=edit]'); await wait(p, 400); await p.click('#ve-del'); await wait(p, 300); await p.click('[data-mc-ok]'); await wait(p, 500);
  D = await store(p);
  ok('vehicle: delete removes the car with its records, reminders and documents only', D.S.vehicles.length === 1 && D.S.vehicles[0].id === v2.id && !Object.values(D.E).flat().some(x => x.v === v1.id) && !D.S.reminders.some(r => r.v === v1.id) && !(D.S.docs || []).some(d => d.v === v1.id)
    && Object.values(D.E).flat().filter(x => x.v === v2.id).length === v2recs && D.S.reminders.filter(r => r.v === v2.id).length === v2rems);
  ok('vehicle: app switches to the remaining car', D.S.cur === v2.id);
  await c.close();
}

/* ---------- 3. records: add / edit / delete for each type ---------- */
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); watch(p, 'records');
  await p.goto(`${BASE}/index.html`); await wait(p, 400); await p.click('[data-act=demo]'); await wait(p, 400);
  const all = async () => Object.values((await store(p)).E).flat();
  const n0 = (await all()).length, odo = Math.max(...(await all()).map(x => +x.odo || 0));
  const fill = { fuel: async () => { await p.fill('#en-odo', String(odo + 300)); await p.fill('#en-liters', '30'); }, service: async () => { await p.fill('#en-cost', '21.5'); }, expense: async () => { await p.fill('#en-cost', '4.25'); }, income: async () => { await p.fill('#en-cost', '50'); } };
  const ids = {};
  for (const ty of ['fuel', 'service', 'expense', 'income']) {
    await p.click('#nav-bottom [data-act=fab]'); await wait(p, 300); await p.click(`.mc-scrim [data-entry-type=${ty}]`); await wait(p, 350);
    await fill[ty](); await p.fill('#en-note', 'فحص نهائي ' + ty); await p.click('#en-save'); await wait(p, 400);
    const r = (await all()).find(x => x.note === 'فحص نهائي ' + ty); ids[ty] = r && r.id;
    ok(`record: add ${ty}`, r && r.t === ty && (await all()).length === n0 + Object.keys(ids).length, JSON.stringify(r));
  }
  for (const ty of ['fuel', 'service', 'expense', 'income']) {
    await go(p, 'log'); await p.click(`.lg [data-act=edit][data-id="${ids[ty]}"]`); await wait(p, 400);
    await p.fill('#en-cost', '9.999'); await p.click('#en-save'); await wait(p, 400);
    const r = (await all()).find(x => x.id === ids[ty]);
    ok(`record: edit ${ty}`, r && +r.cost === 9.999 && r.t === ty);
  }
  for (const ty of ['fuel', 'service', 'expense', 'income']) {
    await go(p, 'log'); await p.click(`.lg [data-act=edit][data-id="${ids[ty]}"]`); await wait(p, 400); await p.click('#en-del'); await wait(p, 400);
    ok(`record: delete ${ty}`, !(await all()).some(x => x.id === ids[ty]));
  }
  ok('record: count back to the start', (await all()).length === n0);
  await c.close();
}

/* ---------- 4. reminders: add / edit / complete / delete ---------- */
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await c.newPage(); watch(p, 'reminders');
  await p.goto(`${BASE}/index.html`); await wait(p, 400); await p.click('[data-act=demo]'); await wait(p, 400);
  const rems = async () => (await store(p)).S.reminders;
  const odo = Math.max(...Object.values((await store(p)).E).flat().map(x => +x.odo || 0));
  await go(p, 'remind'); await p.click('.rl [data-act=addrem]'); await wait(p, 500);
  await p.selectOption('#rm-cat', 'فلتر هواء'); await p.fill('#rm-name', 'فلتر الهواء — نهائي'); await p.fill('#rm-odo', String(odo + 500)); await p.click('#rm-save'); await wait(p, 400);
  let r = (await rems()).find(x => x.name === 'فلتر الهواء — نهائي');
  ok('reminder: add', r && r.cat === 'فلتر هواء' && r.odoDue === odo + 500 && r.by === 'both', JSON.stringify(r));
  await go(p, 'remind'); await p.click(`.rl [data-act=editrem][data-id="${r.id}"]`); await wait(p, 500); await p.fill('#rm-note', 'من الوكالة'); await p.click('#rm-save'); await wait(p, 400);
  ok('reminder: edit', (await rems()).find(x => x.id === r.id).note === 'من الوكالة');
  await go(p, 'remind'); await p.click(`.rl [data-act=donerem][data-id="${r.id}"]`); await wait(p, 400);
  await p.fill('#en-odo', String(odo + 450)); await p.fill('#en-cost', '6'); await p.click('#en-save'); await wait(p, 400);
  r = (await rems()).find(x => x.id === r.id);
  ok('reminder: complete via service → next due rolled forward', r.lastOdo === odo + 450 && r.odoDue === odo + 450 + 10000, JSON.stringify(r));
  await go(p, 'remind'); await p.click(`.rl [data-act=editrem][data-id="${r.id}"]`); await wait(p, 500); await p.click('#rm-del'); await wait(p, 400);
  ok('reminder: delete', !(await rems()).some(x => x.id === r.id));
  await c.close();
}

/* ---------- 5. backup → fresh device → restore ---------- */
{
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const p = await c.newPage(); watch(p, 'backup');
  await p.goto(`${BASE}/index.html`); await wait(p, 400); await p.click('[data-act=demo]'); await wait(p, 400);
  await go(p, 'home'); await p.click('.hm-hero [data-car=edit]'); await wait(p, 400); await p.click('#ve-cat'); await wait(p, 300); await p.click('.mc-scrim [data-ct-color=blue]'); await p.click('.mc-scrim [data-ct-use]'); await wait(p, 300); await p.click('#ve-save'); await wait(p, 400);
  await go(p, 'settings');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.click('[data-act=drvsave]')]);
  const file = dl && await dl.path(); const bk = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
  const src = await store(p);
  ok('backup: file downloads in the expected format', bk && bk.app === 'sayarati' && bk.v === 1 && bk.S && bk.E);
  const c2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c2.newPage(); watch(q, 'restore');
  await q.goto(`${BASE}/index.html#settings`); await wait(q, 400);
  await q.setInputFiles('#imp', file); await wait(q, 300); await q.click('[data-mc-ok]'); await wait(q, 500);
  const dst = await store(q);
  const strip = d => { const x = JSON.parse(JSON.stringify(d)); delete x.S.set.lastDrive; return x; };
  ok('restore: every vehicle, record, reminder, category, document and setting identical', JSON.stringify(strip(dst)) === JSON.stringify(strip({ S: bk.S, E: bk.E })) && JSON.stringify(dst.E) === JSON.stringify(src.E));
  await go(q, 'home');
  ok('restore: app shows the restored car', /Camry/.test(await q.textContent('.hm-car__name')));
  await c2.close(); await c.close();
}

/* ---------- 6. offline (service worker, https) ---------- */
if (HTTPS_BASE) {
  const c = await b.newContext({ viewport: { width: 390, height: 844 }, ignoreHTTPSErrors: true }); const p = await c.newPage(); watch(p, 'offline');
  await p.goto(`${HTTPS_BASE}/index.html`); await wait(p, 400);
  const sw = await p.evaluate(async () => { const r = await Promise.race([navigator.serviceWorker.ready, new Promise(res => setTimeout(() => res(null), 8000))]); return !!(r && r.active); });
  ok('offline: service worker installs and activates', sw);
  await p.reload(); await wait(p, 600);
  const cached = await p.evaluate(async () => { const k = await caches.keys(); const c = await caches.open(k[0]); return { name: k[0], n: (await c.keys()).length }; });
  ok('offline: all core files cached', cached.n >= 31, JSON.stringify(cached));
  await p.click('[data-act=demo]'); await wait(p, 400);
  await c.setOffline(true);
  await p.reload(); await wait(p, 800);
  ok('offline: app loads with no connection', /Camry/.test(await p.textContent('.hm-car__name').catch(() => '')));
  const off = [];
  for (const scr of ['maint', 'log', 'remind', 'reports', 'settings', 'home']) { await go(p, scr); if ((await p.evaluate(() => document.getElementById('main').innerText.trim().length)) < 20) off.push(scr); }
  ok('offline: every screen works', !off.length, off.join(','));
  ok('offline: fonts and icons come from the cache', await p.evaluate(async () => { await document.fonts.ready; const u = document.querySelector('.mc-icon use'); return document.fonts.check('16px "MyCar Sans"', 'سيارتي') && !!u; }));
  await p.click('#nav-bottom [data-act=fab]'); await wait(p, 300); await p.click('.mc-scrim [data-entry-type=expense]'); await wait(p, 300);
  await p.fill('#en-cost', '1.5'); await p.fill('#en-note', 'بدون إنترنت'); await p.click('#en-save'); await wait(p, 400);
  ok('offline: a record can be added and is saved', Object.values((await store(p)).E).flat().some(x => x.note === 'بدون إنترنت'));
  await c.setOffline(false); await c.close();
} else ok('offline check skipped (no HTTPS_BASE)', false);

await b.close();
let f = 0; for (const r of results) { if (!r.pass) f++; console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail && !r.pass ? ' — ' + r.detail : ''}`); }
// offline mode makes the browser log failed network fetches for things the page never needs (none expected)
console.log(`\nconsole/network issues: ${issues.length}`); issues.forEach(i => console.log('  ' + i));
console.log(`TOTAL: ${results.length - f}/${results.length} passed`);
process.exit(f || issues.length ? 1 : 0);
