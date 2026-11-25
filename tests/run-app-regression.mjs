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
ok('data persists after reload', (await p.textContent('.hm-car__name')).includes('Camry'));

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
await p.selectOption('#ve-make', 'nissan'); await p.selectOption('#ve-model', 'Patrol'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('home: new car becomes current', (await p.textContent('.hm-car__name')).includes('Patrol'));
await p.click('[data-home=switch]'); await p.waitForTimeout(300);
const cars = await p.$$eval('.mc-scrim [data-car]', els => els.length);
await p.click('.mc-scrim [data-car]:not([aria-current])'); await p.waitForTimeout(300);
ok('home: switcher lists all cars and switches', cars === 2 && (await p.textContent('.hm-car__name')).includes('Camry'), `${cars} cars`);
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
// catalog: locked to the registered make + model; only the color is chosen
await p.click('[data-car=catalog]'); await p.waitForTimeout(300);
ok('catalog: shows only the car\'s make + model', await p.evaluate(() => { const sc = document.querySelector('.mc-scrim'); return !sc.querySelector('[data-ct-make],[data-ct-model],[data-ct-q]') && /Camry/.test(sc.querySelector('.ct-locked__id').textContent) && sc.querySelectorAll('[data-ct-color]').length === 8; }));
await p.click('.mc-scrim [data-ct-color=red]'); await p.waitForTimeout(100); await p.click('.mc-scrim [data-ct-use]'); await p.waitForTimeout(400);
ok('catalog: stores the car\'s own model + chosen color', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.photoCat && v.photoCat.model === 'Camry' && v.photoCat.body === 'sedan' && v.photoCat.color === 'red' && !v.photo && !!document.querySelector('.cd-photo .mc-carart'); }));
ok('catalog: a mismatched saved drawing still renders the registered model', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); v.photoCat.body = 'pickup'; v.photoCat.model = 'Hilux'; localStorage.setItem('sayarati-v1', JSON.stringify(d)); return true; }));
await p.reload(); await p.waitForTimeout(400);
ok('catalog: … drawn as the car\'s sedan, not the stored pickup', await p.evaluate(() => !document.querySelector('.cd-photo .mc-carart path[d*="L298 74"]') && !!document.querySelector('.cd-photo .mc-carart')));
await p.click('[data-car=catalog]'); await p.waitForTimeout(300);
await p.setInputFiles('.mc-scrim [data-car=photo]', { name: 'car.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') }); await p.waitForTimeout(600);
ok('car: photo from gallery is stored and shown', await p.evaluate(() => { const v = JSON.parse(localStorage.getItem('sayarati-v1')).S.vehicles.find(x => x.id === JSON.parse(localStorage.getItem('sayarati-v1')).S.cur); return /^data:image\/jpeg;base64,/.test(v.photo) && !v.photoCat && !!document.querySelector('.cd-photo img'); }));
// edit: Arabic digits, validation
await p.click('[data-car=edit]'); await p.waitForTimeout(300);
await p.selectOption('#ve-make', ''); await p.fill('#ve-nick', ''); await p.click('#ve-save'); await p.waitForTimeout(150);
ok('car: no make/model and no nickname is rejected', await p.evaluate(() => document.getElementById('ve-make').getAttribute('aria-invalid') === 'true' && !!document.querySelector('#ve-err [role=alert]')));
await p.selectOption('#ve-make', 'toyota'); await p.waitForTimeout(100);
ok('car: model list follows the make', await p.evaluate(() => [...document.querySelectorAll('#ve-model option')].some(o => o.value === 'Land Cruiser')));
await p.selectOption('#ve-model', 'Land Cruiser'); await p.fill('#ve-year', '٢٠٢١'); await p.click('#ve-save'); await p.waitForTimeout(300);
await p.click('[data-car=edit]'); await p.waitForTimeout(300); await p.click('#ve-rm'); await p.click('#ve-cat'); await p.waitForTimeout(200);
ok('editor catalog: locked to the selected model', await p.evaluate(() => /Land Cruiser/.test(document.querySelector('.mc-scrim .ct-locked__id').textContent)));
await p.click('.mc-scrim [data-ct-use]'); await p.waitForTimeout(200);
await p.selectOption('#ve-model', 'Hilux'); await p.waitForTimeout(150);
ok('editor: changing the model redraws the picture for the new model', await p.evaluate(() => !!document.querySelector('#ve-photo .mc-carart path[d*="L298 74"]')));
await p.selectOption('#ve-model', 'Land Cruiser'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('editor: saved drawing belongs to the saved model', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.photoCat && v.photoCat.model === 'Land Cruiser' && v.photoCat.body === 'suv' && !v.photo; }));
ok('car: edits saved (Arabic-digit year → 2021)', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.year === 2021 && v.make === 'toyota' && v.model === 'Land Cruiser' && v.odo0 === 62000; }));
ok('car: title and subtitle do not repeat', await p.evaluate(() => { const h = document.querySelector('.cd h1').textContent.trim(), sub = document.querySelector('.cd-id__meta').textContent; return h === 'تويوتا Land Cruiser' && !sub.includes('Land Cruiser') && sub.includes('2021'); }));
await p.click('[data-car=edit]'); await p.waitForTimeout(300); await p.fill('#ve-nick', 'سيارة العائلة'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('car: nickname becomes the title, make/model move to the subtitle', await p.evaluate(() => document.querySelector('.cd h1').textContent.trim() === 'سيارة العائلة' && /Land Cruiser · 2021/.test(document.querySelector('.cd-id__meta').textContent)));
await p.click('[data-car=edit]'); await p.waitForTimeout(300); await p.selectOption('#ve-make', '__other'); await p.fill('#ve-make-t', 'Geely'); await p.fill('#ve-model-t', 'Coolray'); await p.fill('#ve-nick', ''); await p.click('#ve-save'); await p.waitForTimeout(300);
await p.click('[data-car=catalog]'); await p.waitForTimeout(300);
ok('catalog: model outside the catalog → guidance + set model button, nothing to pick', await p.evaluate(() => { const sc = document.querySelector('.mc-scrim'); return !!sc.querySelector('.mc-alert') && !!sc.querySelector('[data-ct-setmodel]') && !sc.querySelector('[data-ct-use]'); }));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
ok('car: “Other” make/model saved as typed', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.make === 'Geely' && v.model === 'Coolray' && document.querySelector('.cd h1').textContent.trim() === 'Geely Coolray'; }));
// documents
await p.click('[data-car-tab=docs]'); await p.waitForTimeout(200); await p.click('#cd-panel [data-car=doc-add]'); await p.waitForTimeout(300);
await p.fill('#de-exp', '2020-01-01'); await p.click('#de-save'); await p.waitForTimeout(300);
await p.click('#cd-panel [data-car=doc-add]'); await p.waitForTimeout(300); await p.selectOption('#de-type', 'registration'); await p.fill('#de-num', 'R-77');
await p.setInputFiles('#de-file', { name: 'doc.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') }); await p.waitForTimeout(500); await p.click('#de-save'); await p.waitForTimeout(300);
ok('car: documents saved, expired one first with danger badge', await p.evaluate(() => (JSON.parse(localStorage.getItem('sayarati-v1')).S.docs || []).length === 2 && /danger/.test(document.querySelector('#cd-panel .mc-badge').className)));
await p.click('#cd-panel [data-car=doc-open]'); await p.waitForTimeout(300); await p.click('#dv-del'); await p.waitForTimeout(350); await p.click('[data-mc-ok]'); await p.waitForTimeout(300);
ok('car: document delete (with confirm)', await p.evaluate(() => (JSON.parse(localStorage.getItem('sayarati-v1')).S.docs || []).length === 1));
// first car: real photo from the device again (the editor tests above replaced it with a drawing)
await p.evaluate(() => { location.hash = 'car'; }); await p.waitForTimeout(250); await p.click('[data-car=catalog]'); await p.waitForTimeout(300);
await p.setInputFiles('.mc-scrim [data-car=photo]', { name: 'car.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') }); await p.waitForTimeout(600);
// give the second car a catalog drawing so the backup holds all three image kinds
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250); await p.click('[data-home=switch]'); await p.waitForTimeout(300); await p.click('.mc-scrim [data-car]:not([aria-current])'); await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = 'car'; }); await p.waitForTimeout(250); await p.click('[data-car=catalog]'); await p.waitForTimeout(300); await p.click('.mc-scrim [data-ct-color=blue]'); await p.click('.mc-scrim [data-ct-use]'); await p.waitForTimeout(300);
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250); await p.click('[data-home=switch]'); await p.waitForTimeout(300); await p.click('.mc-scrim [data-car]:not([aria-current])'); await p.waitForTimeout(300);
const [bk2] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.evaluate(() => { location.hash = 'settings'; }).then(() => p.waitForTimeout(250)).then(() => p.click('[data-act=drvsave]'))]);
const bkText = bk2 ? (await import('node:fs')).readFileSync(await bk2.path(), 'utf8') : '';
ok('backup includes photos, catalog image, documents', /"photo":"data:image\/jpeg/.test(bkText) && /"photoCat":\{/.test(bkText) && /"img":"data:image\/jpeg/.test(bkText) && /"model":"Coolray"/.test(bkText));
/* ---- restore into a fresh browser profile ---- */
const before = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')).S; return JSON.stringify({ v: d.vehicles.map(x => [x.make, x.model, x.photo || '', JSON.stringify(x.photoCat || null)]), docs: d.docs.map(x => [x.type, x.number, x.img || '']) }); });
const bkFile = bk2 && await bk2.path();
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await ctx2.newPage();
q.on('pageerror', e => issues.push('restore pageerror: ' + e.message));
await q.goto(`${BASE}/index.html#settings`); await q.waitForTimeout(400);
await q.setInputFiles('#imp', bkFile); await q.waitForTimeout(300); await q.click('#cyes'); await q.waitForTimeout(400);
const after = await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')).S; return JSON.stringify({ v: d.vehicles.map(x => [x.make, x.model, x.photo || '', JSON.stringify(x.photoCat || null)]), docs: d.docs.map(x => [x.type, x.number, x.img || '']) }); });
ok('restore: vehicles, photos, catalog images and documents identical', after === before, `${before.length} chars`);
await q.evaluate(() => { location.hash = 'car'; }); await q.waitForTimeout(300);
ok('restore: uploaded car photo renders', await q.evaluate(() => !!document.querySelector('.cd-photo img')));
await q.click('[data-car-tab=docs]'); await q.waitForTimeout(200); await q.click('#cd-panel [data-car=doc-open]'); await q.waitForTimeout(300);
ok('restore: document image renders', await q.evaluate(() => { const i = document.querySelector('.cd-doc-full'); return !!i && i.naturalWidth > 0; }));
await q.keyboard.press('Escape'); await q.waitForTimeout(250);
await q.evaluate(() => { location.hash = 'home'; }); await q.waitForTimeout(250); await q.click('[data-home=switch]'); await q.waitForTimeout(300); await q.click('.mc-scrim [data-car]:not([aria-current])'); await q.waitForTimeout(300);
ok('restore: catalog drawing renders for the other car', await q.evaluate(() => !!document.querySelector('.hm-car__photo .mc-carart') || !!document.querySelector('.hm-car__photo img')));
await ctx2.close();
ok('car: no horizontal overflow', await p.evaluate(() => { location.hash = 'car'; return true; }) && await p.waitForTimeout(200).then(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)));
/* ---- data saved before make/model existed (name only) ---- */
{
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 } }); const r = await c3.newPage();
  r.on('pageerror', e => issues.push('legacy-data pageerror: ' + e.message));
  await r.addInitScript(() => { if (!localStorage.getItem('sayarati-v1')) localStorage.setItem('sayarati-v1', JSON.stringify({ S: { vehicles: [{ id: 'old1', name: 'لاندكروزر 2015', plate: '1234', fuel: 'M95', tank: 90, odo0: 150000 }], cur: 'old1', reminders: [], set: { cur: 'ر.ع', dec: 3, unit: 'kmpl' } }, E: { '2026': [{ id: 'e1', v: 'old1', t: 'fuel', d: '2026-11-01', odo: 151000, liters: 60, ppl: 0.239, cost: 14.34, full: true, fuel: 'M95' }] } })); });
  await r.goto(`${BASE}/index.html`); await r.waitForTimeout(400);
  ok('old data: home shows the saved name', (await r.textContent('.hm-car__name')).trim() === 'لاندكروزر 2015');
  await r.evaluate(() => { location.hash = 'car'; }); await r.waitForTimeout(300);
  ok('old data: details page shows the name, no empty subtitle', await r.evaluate(() => document.querySelector('.cd h1').textContent.trim() === 'لاندكروزر 2015' && !/·\s*$/.test(document.querySelector('.cd-id__meta').textContent)));
  await r.click('[data-car=edit]'); await r.waitForTimeout(300);
  ok('old data: editor keeps the name as nickname, make empty', await r.evaluate(() => document.getElementById('ve-nick').value === 'لاندكروزر 2015' && document.getElementById('ve-make').value === ''));
  await r.click('#ve-save'); await r.waitForTimeout(300);
  ok('old data: saving unchanged keeps the same title', (await r.textContent('.cd h1')).trim() === 'لاندكروزر 2015');
  await c3.close();
}
await b.close();

let f = 0; for (const r of results) { if (!r.pass) f++; console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`); }
console.log(`\nconsole/network issues: ${issues.length}`); issues.forEach(i => console.log('  ' + i));
console.log(`TOTAL: ${results.length - f}/${results.length} passed`);
process.exit(f || issues.length ? 1 : 0);
