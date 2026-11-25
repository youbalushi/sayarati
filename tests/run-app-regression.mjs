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

await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250); await p.click('.types [data-t=fuel]'); await p.waitForTimeout(250);
await p.fill('#ef input[name=odo]', '80000'); await p.fill('#ef input[name=liters]', '40');
const cost = await p.inputValue('#ef input[name=cost]');
ok('fuel form auto-computes total', +cost > 0, cost);
await p.click('#ef button[type=submit]'); await p.waitForTimeout(300);
const n1 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('adding a fill-up saves a record', n1 === n0 + 1, `${n0} → ${n1}`);

await p.reload(); await p.waitForTimeout(400);
ok('data persists after reload', (await p.textContent('.hm-car__name')).includes('كامري'));

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

/* ---- home screen (design system) ---- */
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(300);
ok('home: greeting, car card, odometer, 2 stats', await p.evaluate(() => !!document.querySelector('.hm-greet h1') && !!document.querySelector('.hm-car .mc-display') && document.querySelectorAll('.hm .mc-stat').length === 2));
const odoShown = await p.evaluate(() => document.querySelector('.hm-car .mc-display').textContent.replace(/,/g, ''));
const odoData = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.cur; return String(Math.max(...Object.values(d.E).flat().filter(x => x.v === v).map(x => +x.odo || 0))); });
ok('home: odometer equals highest recorded reading', odoShown === odoData, `${odoShown} vs ${odoData}`);
ok('home: ≤2 reminders and ≤5 recent items', await p.evaluate(() => { const l = document.querySelectorAll('.hm .mc-list'); return l[0].children.length <= 2 && l[1].children.length <= 5; }));
await p.click('.hm .mc-list [data-act=edit]'); await p.waitForTimeout(250);
ok('home: tapping an activity opens its edit form', await p.isVisible('#ef'));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
// switch cars: add a second car, then switch back through the sheet
await p.click('[data-home=switch]'); await p.waitForTimeout(300); await p.click('[data-addcar]'); await p.waitForTimeout(500);
await p.fill('#ve-name', 'Second car'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('home: new car becomes current', (await p.textContent('.hm-car__name')).includes('Second car'));
await p.click('[data-home=switch]'); await p.waitForTimeout(300);
const cars = await p.$$eval('.mc-scrim [data-car]', els => els.length);
await p.click('.mc-scrim [data-car]:not([aria-current])'); await p.waitForTimeout(300);
ok('home: switcher lists all cars and switches', cars === 2 && (await p.textContent('.hm-car__name')).includes('كامري'), `${cars} cars`);
// FAB → add picker
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250);
ok('home: + opens the add picker', await p.isVisible('.types')); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelector('#ov') && (document.querySelector('#ov').hidden = true));
// language + theme via the settings menu
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-lang][data-value=en]'); await p.waitForTimeout(300);
ok('home: English switches to LTR', await p.evaluate(() => document.documentElement.dir === 'ltr' && /Odometer/.test(document.querySelector('.hm-odo').textContent)));
await p.evaluate(() => { location.hash = 'log'; }); await p.waitForTimeout(250);
ok('legacy screen stays Arabic RTL while in English', await p.evaluate(() => document.getElementById('main').dir === 'rtl'));
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250);
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-theme][data-value=dark]'); await p.waitForTimeout(250);
ok('home: theme menu switches to dark', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-lang][data-value=ar]'); await p.waitForTimeout(250);
ok('home: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
ok('desktop: side rail replaces bottom nav', await p.evaluate(() => getComputedStyle(document.getElementById('nav-rail')).display !== 'none' && getComputedStyle(document.getElementById('nav-bottom')).display === 'none'));
ok('desktop: two-column home', await p.evaluate(() => getComputedStyle(document.querySelector('.hm-grid')).gridTemplateColumns.split(' ').length === 2));
/* ---- vehicle details (#car) ---- */
await p.setViewportSize({ width: 390, height: 844 });
await p.click('.hm-car__link'); await p.waitForTimeout(300);
ok('car: home card opens #car', await p.evaluate(() => location.hash === '#car' && !!document.querySelector('.cd h1')));
ok('car: plate + odometer facts, expense summary, 4 tabs', await p.evaluate(() => document.querySelectorAll('.cd-facts>div').length === 2 && !!document.querySelector('.cd-sum__total') && document.querySelectorAll('[data-car-tab]').length === 4));
const sumOk = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.cur; const tot = Object.values(d.E).flat().filter(x => x.v === v && x.t !== 'income').reduce((a, x) => a + (+x.cost || 0), 0); return Math.abs(parseFloat(document.querySelector('.cd-sum__total').textContent.replace(/[^\d.]/g, '')) - tot) < 0.01; });
ok('car: expense total equals stored records', sumOk);
const nService = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); return Object.values(d.E).flat().filter(x => x.v === d.S.cur && x.t === 'service').length; });
ok('car: service tab lists the car\'s service records', (await p.$$eval('#cd-panel .mc-list-item', e => e.length)) === Math.min(20, nService), String(nService));
await p.click('[data-car-tab=fuel]'); await p.waitForTimeout(200);
ok('car: fuel tab shows fill-ups', (await p.$$eval('#cd-panel .mc-list-item', e => e.length)) > 0);
await p.focus('[data-car-tab=fuel]'); await p.keyboard.press(await p.evaluate(() => document.documentElement.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')); await p.waitForTimeout(200);
ok('car: arrow keys move between tabs', await p.evaluate(() => document.activeElement.dataset.carTab === 'reminders' && document.querySelector('[data-car-tab=reminders]').getAttribute('aria-selected') === 'true'));
// photo from gallery
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==';
await p.setInputFiles('[data-car=photo]', { name: 'car.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') }); await p.waitForTimeout(500);
ok('car: photo from gallery is stored and shown', await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('sayarati-v1')).S.vehicles.find(x => x.id === JSON.parse(localStorage.getItem('sayarati-v1')).S.cur); return /^data:image\/jpeg;base64,/.test(v.photo) && !!document.querySelector('.cd-photo img'); }));
// edit: Arabic digits, validation
await p.click('[data-car=edit]'); await p.waitForTimeout(300);
await p.fill('#ve-name', ''); await p.click('#ve-save'); await p.waitForTimeout(150);
ok('car: empty name is rejected with a message', await p.evaluate(() => document.getElementById('ve-name').getAttribute('aria-invalid') === 'true' && !!document.querySelector('#ve-err [role=alert]')));
await p.fill('#ve-name', 'تويوتا كامري 2021'); await p.fill('#ve-year', '٢٠٢١'); await p.fill('#ve-model', 'Camry'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('car: edits saved (Arabic-digit year → 2021)', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.year === 2021 && v.model === 'Camry' && v.odo0 === 62000; }));
// documents
await p.click('[data-car-tab=docs]'); await p.waitForTimeout(200); await p.click('#cd-panel [data-car=doc-add]'); await p.waitForTimeout(300);
await p.fill('#de-exp', '2020-01-01'); await p.click('#de-save'); await p.waitForTimeout(300);
ok('car: document saved, expired badge shown', await p.evaluate(() => (JSON.parse(localStorage.getItem('sayarati-v1')).S.docs || []).length === 1 && /danger/.test(document.querySelector('#cd-panel .mc-badge').className)));
await p.click('#cd-panel [data-car=doc-open]'); await p.waitForTimeout(300); await p.click('#dv-del'); await p.waitForTimeout(350); await p.click('[data-mc-ok]'); await p.waitForTimeout(300);
ok('car: document delete (with confirm)', await p.evaluate(() => (JSON.parse(localStorage.getItem('sayarati-v1')).S.docs || []).length === 0));
const [bk2] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.evaluate(() => { location.hash = 'settings'; }).then(() => p.waitForTimeout(250)).then(() => p.click('[data-act=drvsave]'))]);
const bkText = bk2 ? (await import('node:fs')).readFileSync(await bk2.path(), 'utf8') : '';
ok('backup includes the new vehicle fields', /"model":"Camry"/.test(bkText) && /"photo":"data:image/.test(bkText));
ok('car: no horizontal overflow', await p.evaluate(() => { location.hash = 'car'; return true; }) && await p.waitForTimeout(200).then(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
await b.close();

let f = 0; for (const r of results) { if (!r.pass) f++; console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`); }
console.log(`\nconsole/network issues: ${issues.length}`); issues.forEach(i => console.log('  ' + i));
console.log(`TOTAL: ${results.length - f}/${results.length} passed`);
process.exit(f || issues.length ? 1 : 0);
