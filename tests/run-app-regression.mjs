// سيارتي — regression check for the live app (index.html). Read-only: it only
// drives the UI in a throwaway browser profile. Usage as run-ds-tests.mjs.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');
const BASE = process.env.BASE || 'http://localhost:8766';
const results = [], issues = [];
const ok = (name, pass, detail = '') => results.push({ name, pass: !!pass, detail });

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, acceptDownloads: true });
p.on('pageerror', e => issues.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') issues.push('console.error: ' + m.text()); });
p.on('requestfailed', r => { if (!/fonts\.g/.test(r.url())) issues.push('request failed: ' + r.url()); });
await p.goto(`${BASE}/index.html`); await p.waitForTimeout(500);
ok('empty state shows "add first car"', await p.isVisible('[data-act=addveh]'));

await p.click('[data-act=demo]'); await p.waitForTimeout(300);
const n0 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('sample data loads', n0 > 20, n0 + ' records');

await p.click('.fab'); await p.waitForTimeout(250); await p.click('.types [data-t=fuel]'); await p.waitForTimeout(250);
await p.fill('#ef input[name=odo]', '80000'); await p.fill('#ef input[name=liters]', '40');
const cost = await p.inputValue('#ef input[name=cost]');
ok('fuel form auto-computes total', +cost > 0, cost);
await p.click('#ef button[type=submit]'); await p.waitForTimeout(300);
const n1 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('adding a fill-up saves a record', n1 === n0 + 1, `${n0} → ${n1}`);

await p.reload(); await p.waitForTimeout(400);
ok('data persists after reload', (await p.textContent('.chip b')).includes('كامري'));

for (const tab of ['log', 'remind', 'reports', 'settings']) {
  await p.evaluate(h => { location.hash = h; }, tab); await p.waitForTimeout(250);
  ok(`tab #${tab} renders`, (await p.evaluate(() => document.getElementById('main').innerHTML.length)) > 200);
}
await p.evaluate(() => { location.hash = 'log'; }); await p.waitForTimeout(250);
await p.click('.row[data-act=edit]'); await p.waitForTimeout(250);
await p.click('[data-act=delentry]'); await p.waitForTimeout(250);
const n2 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
await p.click('[data-act=undo]'); await p.waitForTimeout(250);
const n3 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('delete + undo', n2 === n1 - 1 && n3 === n1, `${n1} → ${n2} → ${n3}`);

await p.evaluate(() => { location.hash = 'remind'; }); await p.waitForTimeout(250);
await p.click('[data-act=ics]'); await p.waitForTimeout(200);
const [ics] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=icsfile]')]);
ok('reminder → calendar file downloads', ics && /\.ics$/.test(ics.suggestedFilename()), ics && ics.suggestedFilename());

await p.evaluate(() => { location.hash = 'settings'; }); await p.waitForTimeout(250);
const [bk] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=drvsave]')]);
ok('backup file downloads', bk && /\.json$/.test(bk.suggestedFilename()), bk && bk.suggestedFilename());
const [csv] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=expcsv]')]);
ok('CSV export downloads', csv && /\.csv$/.test(csv.suggestedFilename()), csv && csv.suggestedFilename());

await p.click('[data-act=catadd]'); await p.waitForTimeout(250); await p.fill('#cf input[name=nm]', 'اختبار'); await p.click('#cf button[type=submit]'); await p.waitForTimeout(250);
ok('add category', await p.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')).S.cats.service.includes('اختبار')));

const sheets = await p.evaluate(() => [...document.styleSheets].map(s => s.href || 'inline'));
ok('app loads none of the new design-system files', !sheets.some(h => /css\/(tokens|components)\.css/.test(h)), sheets.join(','));
await b.close();

let f = 0; for (const r of results) { if (!r.pass) f++; console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`); }
console.log(`\nconsole/network issues: ${issues.length}`); issues.forEach(i => console.log('  ' + i));
console.log(`TOTAL: ${results.length - f}/${results.length} passed`);
process.exit(f || issues.length ? 1 : 0);
