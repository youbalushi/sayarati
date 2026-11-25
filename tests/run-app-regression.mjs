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

await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250); await p.click('.mc-scrim [data-entry-type=fuel]'); await p.waitForTimeout(250);
await p.fill('#en-odo', '80000'); await p.fill('#en-liters', '40');
const cost = await p.inputValue('#en-cost');
ok('fuel form auto-computes total', +cost > 0, cost);
await p.click('#en-save'); await p.waitForTimeout(300);
const n1 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('adding a fill-up saves a record', n1 === n0 + 1, `${n0} → ${n1}`);

await p.reload(); await p.waitForTimeout(400);
ok('data persists after reload', (await p.textContent('.hm-car__name')).includes('Camry'));

for (const tab of ['log', 'remind', 'reports', 'settings']) {
  await p.evaluate(h => { location.hash = h; }, tab); await p.waitForTimeout(250);
  ok(`tab #${tab} renders`, (await p.evaluate(() => document.getElementById('main').innerHTML.length)) > 200);
}
await p.evaluate(() => { location.hash = 'log'; }); await p.waitForTimeout(250);
await p.click('.lg [data-act=edit]'); await p.waitForTimeout(250);
await p.click('#en-del'); await p.waitForTimeout(250);
const n2 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
await p.click('.mc-toast__action'); await p.waitForTimeout(250);
const n3 = await p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().length);
ok('delete + undo', n2 === n1 - 1 && n3 === n1, `${n1} → ${n2} → ${n3}`);
/* ---- record forms (design system) ---- */
const recs = () => p.evaluate(() => Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat());
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250);
ok('picker: 4 record types + reminder', await p.evaluate(() => document.querySelectorAll('.mc-scrim [data-entry-type]').length === 4 && !!document.querySelector('.mc-scrim [data-entry-rem]')));
await p.click('.mc-scrim [data-entry-type=fuel]'); await p.waitForTimeout(250);
ok('fuel: last price per liter prefilled, odometer hint shown', await p.evaluate(() => +document.getElementById('en-ppl').value > 0 && /\d/.test(document.querySelector('.en-odo-hint').textContent)));
await p.click('#en-save'); await p.waitForTimeout(200);
ok('fuel: empty save → errors on liters, total, odometer', await p.evaluate(() => ['en-liters', 'en-cost', 'en-odo'].every(id => document.getElementById(id).getAttribute('aria-invalid') === 'true') && !!document.querySelector('#en-err [role=alert]')));
await p.fill('#en-ppl', '0.250'); await p.fill('#en-cost', '١٠'); await p.waitForTimeout(100);
ok('fuel: total + price → liters (Arabic digits accepted)', (await p.inputValue('#en-liters')) === '40.00');
await p.fill('#en-liters', '20'); await p.waitForTimeout(100);
ok('fuel: liters + price → total', (await p.inputValue('#en-cost')) === '5.000');
await p.fill('#en-odo', '70000'); await p.press('#en-odo', 'Tab'); await p.waitForTimeout(150);
ok('fuel: lower odometer → explained warning, not an error', await p.evaluate(() => { const m = document.querySelector('#en-odo-msg [role=status]'); return !!m && /79,072|80,000/.test(m.textContent) && document.getElementById('en-odo').getAttribute('aria-invalid') !== 'true'; }));
const n0f = (await recs()).length;
await p.click('#en-save'); await p.waitForTimeout(300);
ok('fuel: saving with a warning is still allowed (as before)', (await recs()).length === n0f + 1);
const saved = (await recs()).find(r => r.odo === 70000);
ok('fuel: record fields unchanged in shape', saved && saved.t === 'fuel' && saved.liters === 20 && saved.ppl === 0.25 && saved.cost === 5 && saved.full === true && typeof saved.fuel === 'string', JSON.stringify(saved));
// edit + delete the test record
await p.evaluate(id => { document.querySelector(`[data-act=edit][data-id="${id}"]`) || (location.hash = 'log'); }, saved.id); await p.waitForTimeout(250);
await p.click(`[data-act=edit][data-id="${saved.id}"]`); await p.waitForTimeout(250);
ok('edit: form opens with saved values', (await p.inputValue('#en-liters')) === '20' && (await p.inputValue('#en-odo')) === '70000');
await p.click('#en-del'); await p.waitForTimeout(250);
ok('edit: delete removes it', (await recs()).length === n0f);
// service resets a matching reminder
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(200);
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250); await p.click('.mc-scrim [data-entry-type=service]'); await p.waitForTimeout(250);
ok('service: category list from settings, odometer optional', await p.evaluate(() => document.querySelectorAll('#en-cat option').length > 5 && /\(/.test(document.querySelector('label[for=en-odo]').textContent)));
await p.selectOption('#en-cat', 'إطارات'); await p.fill('#en-cost', '80'); await p.fill('#en-odo', '79500'); await p.click('#en-save'); await p.waitForTimeout(300);
ok('service: matching reminder reset to this service', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const r = d.S.reminders.find(x => x.name === 'إطارات'); return r && r.lastOdo === 79500; }));
ok('service: toast says the reminder was reset', /إطارات/.test(await p.evaluate(() => document.querySelector('.mc-toast-region')?.textContent || '')));
// expense + income
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250); await p.click('.mc-scrim [data-entry-type=expense]'); await p.waitForTimeout(250);
await p.click('#en-save'); await p.waitForTimeout(150);
ok('expense: missing amount → error on amount only', await p.evaluate(() => document.getElementById('en-cost').getAttribute('aria-invalid') === 'true' && document.getElementById('en-odo').getAttribute('aria-invalid') !== 'true'));
await p.fill('#en-cost', '3'); await p.click('#en-save'); await p.waitForTimeout(300);
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250); await p.click('.mc-scrim [data-entry-type=income]'); await p.waitForTimeout(250);
await p.fill('#en-cost', '12'); await p.click('#en-save'); await p.waitForTimeout(300);
ok('expense + income saved', await p.evaluate(() => { const all = Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat(); return all.some(x => x.t === 'expense' && x.cost === 3) && all.some(x => x.t === 'income' && x.cost === 12); }));
// reminder "done" opens the new form prefilled
await p.evaluate(() => { location.hash = 'remind'; }); await p.waitForTimeout(250);
await p.click('[data-act=donerem]'); await p.waitForTimeout(300);
ok('reminder “done” opens the service form with its category', await p.evaluate(() => !!document.getElementById('en-form') && document.getElementById('en-cat').value.length > 0 && +document.getElementById('en-odo').value > 0));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(200);

await p.evaluate(() => { location.hash = 'remind'; }); await p.waitForTimeout(250);
await p.click('[data-act=ics]'); await p.waitForTimeout(200);
const [ics] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=icsfile]')]);
ok('reminder → calendar file downloads', ics && /\.ics$/.test(ics.suggestedFilename()), ics && ics.suggestedFilename());

await p.evaluate(() => { location.hash = 'settings'; }); await p.waitForTimeout(250);
const [bk] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=drvsave]')]);
ok('backup file downloads', bk && /\.json$/.test(bk.suggestedFilename()), bk && bk.suggestedFilename());
const [csv] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.click('[data-act=expcsv]')]);
ok('CSV export downloads', csv && /\.csv$/.test(csv.suggestedFilename()), csv && csv.suggestedFilename());

await p.click('[data-set-cat=add]'); await p.waitForTimeout(250); await p.fill('#cat-name', 'اختبار'); await p.click('#cat-save'); await p.waitForTimeout(250);
ok('add category', await p.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')).S.cats.service.includes('اختبار')));

/* ---- home screen: car card · documents · upcoming reminders ---- */
const carMenu = async (sel) => { await p.click('[data-mc-menu=hm-cars]'); await p.waitForTimeout(150); await p.click(`#hm-cars ${sel}`); await p.waitForTimeout(400); };
const S_ = () => p.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')).S);
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(300);
ok('home: greeting, car card with photo, name, year, plate + odometer', await p.evaluate(() => !!document.querySelector('.hm-greet h1') && !!document.querySelector('.hm-hero .cd-photo') && !!document.querySelector('.hm-car__name') && /2021/.test(document.querySelector('.hm-year').textContent) && document.querySelectorAll('.hm-id__end').length === 2));
ok('home: no "change photo" button; a pencil edits the car', await p.evaluate(() => !document.querySelector('.hm [data-car=catalog]') && !!document.querySelector('.hm-hero .cd-photo [data-car=edit]')));
const odoShown = await p.evaluate(() => document.querySelectorAll('.hm-id__end')[1].querySelector('.mc-num').textContent.replace(/,/g, ''));
const odoData = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.cur; return String(Math.max(...Object.values(d.E).flat().filter(x => x.v === v).map(x => +x.odo || 0))); });
ok('home: odometer equals highest recorded reading', odoShown === odoData, `${odoShown} vs ${odoData}`);
ok('home: order is car → documents → reminders; no expense summary, no maintenance list', await p.evaluate(() => { const t = document.querySelector('.hm').innerText; return t.indexOf('مستندات السيارة') < t.indexOf('التذكيرات القادمة') && !document.querySelector('.hm .cd-sum, .hm .mc-stat, .hm [data-act=edit]'); }));
ok('home: ≤2 reminders + "see all" to the reminders page', await p.evaluate(() => document.querySelectorAll('.hm section[aria-labelledby=hm-rem] .mc-list-item').length <= 2 && !!document.querySelector('.hm a[href="#remind"]') && !document.querySelector('.hm [data-act=addrem]')));
ok('home: documents start with "Add" for ownership and insurance', await p.evaluate(() => document.querySelectorAll('.hm-docs [data-car=doc-add]').length === 2 && !document.querySelector('.hm-docs [data-car=doc-open]')));
// switch cars through the arrow menu: add a second car, then switch back
await carMenu('[data-action=hm-addcar]');
await p.selectOption('#ve-make', 'nissan'); await p.selectOption('#ve-model', 'Patrol'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('home: new car becomes current', (await p.textContent('.hm-car__name')).includes('Patrol'));
await p.click('[data-mc-menu=hm-cars]'); await p.waitForTimeout(150);
const cars = await p.$$eval('#hm-cars [data-action=hm-car]', els => els.map(e => e.getAttribute('aria-checked')));
await p.click('#hm-cars [data-action=hm-car][aria-checked=false]'); await p.waitForTimeout(400);
ok('home: arrow menu lists all cars (current checked) + add, and switches', cars.length === 2 && cars.filter(x => x === 'true').length === 1 && (await p.textContent('.hm-car__name')).includes('Camry'), JSON.stringify(cars));
// FAB → add picker
await p.click('#nav-bottom [data-act=fab]'); await p.waitForTimeout(250);
ok('home: + opens the add picker', await p.isVisible('.en-types')); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
ok('nav: right→left home · maintenance · (+) · log · reports', await p.evaluate(() => [...document.querySelectorAll('#nav-bottom .mc-bottomnav__inner>*')].map(e => e.getAttribute('href') || 'fab').join() === '#home,#maint,fab,#log,#reports'));
// language + theme via the settings menu
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-lang][data-value=en]'); await p.waitForTimeout(300);
ok('home: English switches to LTR', await p.evaluate(() => document.documentElement.dir === 'ltr' && /Car documents/.test(document.querySelector('.hm').textContent) && /Maintenance/.test(document.getElementById('nav-bottom').textContent)));
await p.evaluate(() => { location.hash = 'log'; }); await p.waitForTimeout(250);
ok('log follows the language (English, LTR)', await p.evaluate(() => !document.getElementById('main').hasAttribute('dir') && document.documentElement.dir === 'ltr' && document.querySelector('.lg h1').textContent === 'Log'));
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250);
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-theme][data-value=dark]'); await p.waitForTimeout(250);
ok('home: theme menu switches to dark', await p.evaluate(() => document.documentElement.dataset.theme === 'dark'));
await p.click('[data-mc-menu=hm-menu]'); await p.click('#hm-menu [data-action=hm-lang][data-value=ar]'); await p.waitForTimeout(250);
ok('home: no horizontal overflow', await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
await p.setViewportSize({ width: 1440, height: 900 }); await p.waitForTimeout(300);
ok('desktop: side rail replaces bottom nav', await p.evaluate(() => getComputedStyle(document.getElementById('nav-rail')).display !== 'none' && getComputedStyle(document.getElementById('nav-bottom')).display === 'none'));
ok('desktop: two-column home', await p.evaluate(() => getComputedStyle(document.querySelector('.hm-grid')).gridTemplateColumns.split(' ').length === 2));
await p.setViewportSize({ width: 390, height: 844 });
// old #car links land on Home
await p.evaluate(() => { location.hash = 'car'; }); await p.waitForTimeout(300);
ok('old #car link shows Home', await p.evaluate(() => !!document.querySelector('.hm-hero') && document.querySelector('#nav-bottom [aria-current]').getAttribute('href') === '#home'));
/* ---- maintenance screen ---- */
await p.click('#nav-bottom a[href="#maint"]'); await p.waitForTimeout(300);
const D0 = await p.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')));
const svc = Object.values(D0.E).flat().filter(x => x.v === D0.S.cur && x.t === 'service');
ok('maint: lists every service of the car, grouped by month', await p.evaluate(n => document.querySelectorAll('.mt [data-act=edit]').length === n && document.querySelectorAll('.mt .lg-month').length >= 2, svc.length));
ok('maint: total maintenance spend matches the records', await p.evaluate(tot => Math.abs(parseFloat(document.querySelector('.mt .mc-stat__value').textContent.replace(/[^\d.]/g, '')) - tot) < 0.001, svc.reduce((a, x) => a + x.cost, 0)));
await p.click('.mt [data-act=add]'); await p.waitForTimeout(350);
ok('maint: "Add service" opens the service form', await p.evaluate(() => !!document.getElementById('en-form') && !document.querySelector('.en-types')));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
await p.click('.mt [data-act=edit]'); await p.waitForTimeout(350);
ok('maint: tapping a service opens it for editing', await p.evaluate(() => !!document.getElementById('en-del')));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
/* ---- reminders page (from "see all") ---- */
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250); await p.click('.hm a[href="#remind"]'); await p.waitForTimeout(300);
ok('reminders page: back arrow, Add on top, all reminders', await p.evaluate(n => !!document.querySelector('.rl .mc-appbar a[href="#home"]') && document.querySelector('.rl-wrap').firstElementChild.dataset.act === 'addrem' && document.querySelectorAll('.rl-card').length === n, (D0.S.reminders || []).filter(r => r.v === D0.S.cur).length));
await p.click('.rl-wrap > [data-act=addrem]'); await p.waitForTimeout(450);
ok('reminders page: Add opens the reminder form', await p.evaluate(() => !!document.getElementById('rm-form')));
await p.keyboard.press('Escape'); await p.waitForTimeout(250);
/* ---- documents: ownership (one), insurance (several), viewer with pencil ---- */
const img = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP4z8DAwMDAxMDAwMDAAAANHQEDK+mmyAAAAABJRU5ErkJggg==';
const png = { name: 'doc.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') };
await p.evaluate(() => { location.hash = 'home'; }); await p.waitForTimeout(250);
await p.click('.hm-docs [data-car=doc-add][data-type=registration]'); await p.waitForTimeout(350);
ok('ownership: editor has no type picker (fixed type)', await p.evaluate(() => document.getElementById('de-type').type === 'hidden' && document.getElementById('de-type').value === 'registration'));
await p.fill('#de-num', 'R-77'); await p.fill('#de-exp', '2027-03-14'); await p.setInputFiles('#de-file', png); await p.waitForTimeout(500); await p.click('#de-save'); await p.waitForTimeout(350);
ok('ownership: saved; row shows View (no more Add)', await p.evaluate(() => !!document.querySelector('.hm-docs [data-car=doc-open]') && !document.querySelector('.hm-docs [data-type=registration]')));
ok('car card: plate sits on the name line, odometer on the expiry line; name at title size', await p.evaluate(() => { const mid = e => { const r = e.getBoundingClientRect(); return r.top + r.height / 2; };
  const [plate, odo] = document.querySelectorAll('.hm-id__end'), name = document.querySelector('.hm-car__name'), exp = document.querySelector('.hm-exp');
  const cx = e => { const r = e.getBoundingClientRect(); return r.left + r.width / 2; }, ic = document.querySelector('.hm-exp__ic'), arrow = document.querySelector('.hm-switch .mc-iconbtn'), txt = exp.querySelector('span:not(.hm-exp__ic)');
  const startEdge = e => (document.documentElement.dir === 'rtl' ? e.getBoundingClientRect().right : e.getBoundingClientRect().left);
  return Math.abs(mid(plate) - mid(name)) <= 2 && Math.abs(mid(odo) - mid(exp)) <= 2 && Math.abs(cx(ic) - cx(arrow)) <= 1 && Math.abs(startEdge(txt) - startEdge(name)) <= 1 && getComputedStyle(name).fontSize === getComputedStyle(document.documentElement).getPropertyValue('--fs-title').trim(); }));
ok('car card: "expires" line comes from the ownership document', await p.evaluate(() => /14 مارس 2027/.test(document.querySelector('.hm-exp').textContent)));
await p.click('.hm-docs [data-car=doc-open]'); await p.waitForTimeout(350);
ok('viewer: image, expiry and a pencil in the header (no delete there)', await p.evaluate(() => { const sc = document.querySelector('.mc-scrim'); return !!sc.querySelector('.cd-doc-full') && !!sc.querySelector('.mc-sheet__head #dv-edit') && !sc.querySelector('#dv-del') && /2027/.test(sc.textContent); }));
await p.click('#dv-edit'); await p.waitForTimeout(350);
ok('pencil: opens the editor with the document (replace image / change expiry / delete)', await p.evaluate(() => document.getElementById('de-num').value === 'R-77' && !!document.getElementById('de-file') && !!document.getElementById('de-del')));
await p.fill('#de-exp', '2020-01-01'); await p.click('#de-save'); await p.waitForTimeout(350);
ok('car card: expired ownership shows a danger badge', await p.evaluate(() => /danger/.test(document.querySelector('.hm-exp .mc-badge').className)));
await p.click('.hm-docs [data-car=doc-add][data-type=insurance]'); await p.waitForTimeout(350);
await p.fill('#de-title', 'وثيقة التأمين الشامل'); await p.fill('#de-exp', '2027-04-04'); await p.setInputFiles('#de-file', png); await p.waitForTimeout(500); await p.click('#de-save'); await p.waitForTimeout(350);
await p.click('.hm-docs [data-car=doc-list][data-type=insurance]'); await p.waitForTimeout(350);
await p.click('.mc-scrim [data-car=doc-add][data-type=insurance]'); await p.waitForTimeout(400);
await p.fill('#de-title', 'البطاقة البرتقالية'); await p.click('#de-save'); await p.waitForTimeout(350);
ok('insurance: several documents; row shows the count + View', await p.evaluate(() => /مستندان/.test(document.querySelector('.hm-docs').textContent) && !!document.querySelector('.hm-docs [data-car=doc-list][data-type=insurance]')));
await p.click('.hm-docs [data-car=doc-list][data-type=insurance]'); await p.waitForTimeout(350);
ok('insurance list: both documents, expiry or "no expiry", Add stays', await p.evaluate(() => { const sc = document.querySelector('.mc-scrim'); return sc.querySelectorAll('[data-car=doc-open]').length === 2 && /بدون تاريخ انتهاء/.test(sc.textContent) && !!sc.querySelector('[data-car=doc-add]'); }));
await p.click('.mc-scrim [data-car=doc-open]'); await p.waitForTimeout(400);
ok('insurance list → viewer', await p.evaluate(() => !!document.querySelector('.mc-scrim #dv-edit')));
await p.click('#dv-edit'); await p.waitForTimeout(350); await p.click('#de-del'); await p.waitForTimeout(350); await p.click('[data-mc-ok]'); await p.waitForTimeout(400);
ok('document delete (pencil → delete → confirm)', (await S_()).docs.filter(d => d.type === 'insurance').length === 1);
// an older document of another type stays reachable
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); d.S.docs.push({ id: 'oldlic', v: d.S.cur, type: 'license', title: 'رخصة', added: '2025-01-01' }); localStorage.setItem('sayarati-v1', JSON.stringify(d)); }); await p.reload(); await p.waitForTimeout(400);
ok('older documents of other types: "Other documents" row lists them', await p.evaluate(() => !!document.querySelector('.hm-docs [data-type=other]')));
await p.click('.hm-docs [data-type=other]'); await p.waitForTimeout(350);
ok('… and opens them', await p.evaluate(() => document.querySelectorAll('.mc-scrim [data-car=doc-open]').length === 1)); await p.keyboard.press('Escape'); await p.waitForTimeout(250);
/* ---- vehicle editor (pencil on the photo) ---- */
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300);
await p.click('#ve-cat'); await p.waitForTimeout(250);
ok('editor catalog: shows only the car\'s make + model', await p.evaluate(() => { const sc = document.querySelector('.mc-scrim'); return !sc.querySelector('[data-ct-make],[data-ct-model],[data-ct-q]') && /Camry/.test(sc.querySelector('.ct-locked__id').textContent) && sc.querySelectorAll('[data-ct-color]').length === 8; }));
await p.click('.mc-scrim [data-ct-color=red]'); await p.click('.mc-scrim [data-ct-use]'); await p.waitForTimeout(200); await p.click('#ve-save'); await p.waitForTimeout(350);
ok('editor catalog: stores the car\'s own model + chosen color', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.photoCat && v.photoCat.model === 'Camry' && v.photoCat.body === 'sedan' && v.photoCat.color === 'red' && !v.photo && !!document.querySelector('.hm-hero .cd-photo .mc-carart'); }));
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); v.photoCat.body = 'pickup'; v.photoCat.model = 'Hilux'; localStorage.setItem('sayarati-v1', JSON.stringify(d)); }); await p.reload(); await p.waitForTimeout(400);
ok('catalog: a mismatched saved drawing still renders the registered model (sedan)', await p.evaluate(() => !document.querySelector('.cd-photo .mc-carart path[d*="L298 74"]') && !!document.querySelector('.cd-photo .mc-carart')));
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300);
await p.setInputFiles('#ve-file', { name: 'car.png', mimeType: 'image/png', buffer: Buffer.from(img.split(',')[1], 'base64') }); await p.waitForTimeout(600); await p.click('#ve-save'); await p.waitForTimeout(350);
ok('editor: photo from the device is stored and shown on Home', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return /^data:image\/jpeg;base64,/.test(v.photo) && !!document.querySelector('.hm-hero .cd-photo img'); }));
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300);
await p.selectOption('#ve-make', ''); await p.fill('#ve-nick', ''); await p.click('#ve-save'); await p.waitForTimeout(150);
ok('editor: no make/model and no nickname is rejected', await p.evaluate(() => document.getElementById('ve-make').getAttribute('aria-invalid') === 'true' && !!document.querySelector('#ve-err [role=alert]')));
await p.selectOption('#ve-make', 'toyota'); await p.waitForTimeout(100);
ok('editor: model list follows the make', await p.evaluate(() => [...document.querySelectorAll('#ve-model option')].some(o => o.value === 'Land Cruiser')));
await p.selectOption('#ve-model', 'Land Cruiser'); await p.fill('#ve-year', '٢٠٢١'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('editor: edits saved (Arabic-digit year → 2021); name + year on the card', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.year === 2021 && v.model === 'Land Cruiser' && document.querySelector('.hm-car__name').textContent.trim() === 'تويوتا Land Cruiser' && document.querySelector('.hm-year').textContent.trim() === '2021'; }));
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300); await p.fill('#ve-nick', 'سيارة العائلة'); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('editor: nickname becomes the title', (await p.textContent('.hm-car__name')).trim() === 'سيارة العائلة');
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300); await p.selectOption('#ve-make', '__other'); await p.fill('#ve-make-t', 'Geely'); await p.fill('#ve-model-t', 'Coolray'); await p.fill('#ve-nick', ''); await p.click('#ve-save'); await p.waitForTimeout(300);
ok('editor: “Other” make/model saved as typed', await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const v = d.S.vehicles.find(x => x.id === d.S.cur); return v.make === 'Geely' && v.model === 'Coolray' && document.querySelector('.hm-car__name').textContent.trim() === 'Geely Coolray'; }));
// give the second car a catalog drawing so the backup holds all three image kinds
await carMenu('[data-action=hm-car][aria-checked=false]');
await p.click('.hm-hero [data-car=edit]'); await p.waitForTimeout(300); await p.click('#ve-cat'); await p.waitForTimeout(250); await p.click('.mc-scrim [data-ct-color=blue]'); await p.click('.mc-scrim [data-ct-use]'); await p.waitForTimeout(200); await p.click('#ve-save'); await p.waitForTimeout(300);
await carMenu('[data-action=hm-car][aria-checked=false]');
const [bk2] = await Promise.all([p.waitForEvent('download', { timeout: 4000 }).catch(() => null), p.evaluate(() => { location.hash = 'settings'; }).then(() => p.waitForTimeout(250)).then(() => p.click('[data-act=drvsave]'))]);
const bkText = bk2 ? (await import('node:fs')).readFileSync(await bk2.path(), 'utf8') : '';
ok('backup includes photos, catalog image, documents', /"photo":"data:image\/jpeg/.test(bkText) && /"photoCat":\{/.test(bkText) && /"img":"data:image\/jpeg/.test(bkText) && /"model":"Coolray"/.test(bkText));
/* ---- restore into a fresh browser profile ---- */
const before = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')).S; return JSON.stringify({ v: d.vehicles.map(x => [x.make, x.model, x.photo || '', JSON.stringify(x.photoCat || null)]), docs: d.docs.map(x => [x.type, x.number, x.img || '']) }); });
const bkFile = bk2 && await bk2.path();
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await ctx2.newPage();
q.on('pageerror', e => issues.push('restore pageerror: ' + e.message));
await q.goto(`${BASE}/index.html#settings`); await q.waitForTimeout(400);
await q.setInputFiles('#imp', bkFile); await q.waitForTimeout(300); await q.click('[data-mc-ok]'); await q.waitForTimeout(400);
const after = await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')).S; return JSON.stringify({ v: d.vehicles.map(x => [x.make, x.model, x.photo || '', JSON.stringify(x.photoCat || null)]), docs: d.docs.map(x => [x.type, x.number, x.img || '']) }); });
ok('restore: vehicles, photos, catalog images and documents identical', after === before, `${before.length} chars`);
await q.evaluate(() => { location.hash = 'home'; }); await q.waitForTimeout(300);
ok('restore: uploaded car photo renders', await q.evaluate(() => !!document.querySelector('.hm-hero .cd-photo img')));
await q.click('.hm-docs [data-car=doc-open]'); await q.waitForTimeout(350);
ok('restore: document image renders', await q.evaluate(() => { const i = document.querySelector('.cd-doc-full'); return !!i && i.naturalWidth > 0; }));
await q.keyboard.press('Escape'); await q.waitForTimeout(250);
await q.click('[data-mc-menu=hm-cars]'); await q.waitForTimeout(150); await q.click('#hm-cars [data-action=hm-car][aria-checked=false]'); await q.waitForTimeout(400);
ok('restore: catalog drawing renders for the other car', await q.evaluate(() => !!document.querySelector('.hm-hero .cd-photo .mc-carart')));
await ctx2.close();
/* ---- data saved before make/model existed (name only) ---- */
{
  const c3 = await b.newContext({ viewport: { width: 390, height: 844 } }); const r = await c3.newPage();
  r.on('pageerror', e => issues.push('legacy-data pageerror: ' + e.message));
  await r.addInitScript(() => { if (!localStorage.getItem('sayarati-v1')) localStorage.setItem('sayarati-v1', JSON.stringify({ S: { vehicles: [{ id: 'old1', name: 'لاندكروزر 2015', plate: '1234', fuel: 'M95', tank: 90, odo0: 150000 }], cur: 'old1', reminders: [], set: { cur: 'ر.ع', dec: 3, unit: 'kmpl' } }, E: { '2026': [{ id: 'e1', v: 'old1', t: 'fuel', d: '2026-11-01', odo: 151000, liters: 60, ppl: 0.239, cost: 14.34, full: true, fuel: 'M95' }] } })); });
  await r.goto(`${BASE}/index.html`); await r.waitForTimeout(400);
  ok('old data: home shows the saved name', (await r.textContent('.hm-car__name')).trim() === 'لاندكروزر 2015');
  ok('old data: card shows plate + odometer, no year, no expiry line', await r.evaluate(() => !document.querySelector('.hm-year') && !document.querySelector('.hm-exp').textContent.trim() && /1234/.test(document.querySelector('.hm-id').textContent)));
  await r.click('[data-car=edit]'); await r.waitForTimeout(300);
  ok('old data: editor keeps the name as nickname, make empty', await r.evaluate(() => document.getElementById('ve-nick').value === 'لاندكروزر 2015' && document.getElementById('ve-make').value === ''));
  await r.click('#ve-save'); await r.waitForTimeout(300);
  ok('old data: saving unchanged keeps the same title', (await r.textContent('.hm-car__name')).trim() === 'لاندكروزر 2015');
  await c3.close();
}

// ---------- reminders: add / edit / delete / complete ----------
{
  const c4 = await b.newContext({ viewport: { width: 390, height: 844 } }); const q = await c4.newPage();
  q.on('pageerror', e => issues.push('rem pageerror: ' + e.message)); q.on('console', m => { if (m.type() === 'error') issues.push('rem console.error: ' + m.text()); });
  await q.goto(`${BASE}/index.html`); await q.waitForTimeout(400); await q.click('[data-act=demo]'); await q.waitForTimeout(300);
  const st = () => q.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')).S);
  const odoNow = await q.evaluate(() => Math.max(...Object.values(JSON.parse(localStorage.getItem('sayarati-v1')).E).flat().map(x => +x.odo || 0)));
  const nR0 = (await st()).reminders.length;
  // add from the + picker
  await q.click('#nav-bottom [data-act=fab]'); await q.waitForTimeout(250); await q.click('.mc-scrim [data-entry-rem]'); await q.waitForTimeout(450);
  ok('rem: form opens from + picker with all fields', await q.evaluate(() => ['rm-cat', 'rm-name', 'rm-v', 'rm-date', 'rm-odo', 'rm-note', 'rm-before'].every(i => document.getElementById(i)) && !!document.querySelector('[name=rm-alert]') && document.querySelectorAll('[data-rm-by]').length === 3));
  await q.selectOption('#rm-cat', 'تأمين'); await q.waitForTimeout(100);
  ok('rem: type "insurance" → date only, odometer hidden, title follows type', await q.evaluate(() => document.querySelector('[data-rm-by=date]').getAttribute('aria-pressed') === 'true' && document.getElementById('rm-odo').closest('[data-for]').hidden && !document.getElementById('rm-date').closest('[data-for]').hidden && document.getElementById('rm-name').value === 'تأمين'));
  await q.selectOption('#rm-cat', 'تغيير زيت المحرك'); await q.waitForTimeout(100);
  ok('rem: type "oil" → date + odometer, odometer marked optional', await q.evaluate(() => document.querySelector('[data-rm-by=both]').getAttribute('aria-pressed') === 'true' && !document.getElementById('rm-odo').closest('[data-for]').hidden && /\(/.test(document.querySelector('label[for=rm-odo]').textContent) && +document.getElementById('rm-odo').value > 0));
  // validation: odometer-only needs a reading
  await q.click('[data-rm-by=odo]'); await q.fill('#rm-odo', ''); await q.click('#rm-save'); await q.waitForTimeout(150);
  ok('rem: odometer-only without a reading → error on that field', await q.evaluate(() => document.getElementById('rm-odo').getAttribute('aria-invalid') === 'true' && !!document.querySelector('#rm-err [role=alert]') && !/\(/.test(document.querySelector('label[for=rm-odo]').textContent)));
  await q.fill('#rm-odo', String(odoNow + 300)); await q.waitForTimeout(80);
  ok('rem: error clears while typing', await q.evaluate(() => !document.querySelector('#rm-form [aria-invalid]') && !document.querySelector('#rm-err [role=alert]')));
  await q.click('[data-rm-by=both]'); await q.fill('#rm-name', 'زيت المحرك — اختبار'); await q.fill('#rm-note', 'زيت 5W-30');
  await q.click('#rm-save'); await q.waitForTimeout(350);
  let S1 = await st(); const added = S1.reminders.find(r => r.name === 'زيت المحرك — اختبار');
  ok('rem: add saves title, vehicle, type, both triggers, alert, note', S1.reminders.length === nR0 + 1 && added && added.v === S1.cur && added.cat === 'تغيير زيت المحرك' && added.by === 'both' && added.odoDue === odoNow + 300 && /^\d{4}-\d\d-\d\d$/.test(added.date) && added.alert === true && added.note === 'زيت 5W-30' && added.km === 5000 && added.months === 6, JSON.stringify(added));
  ok('rem: soon (300 km left) shows first on Home', await q.evaluate(n => document.querySelector('.hm section[aria-labelledby=hm-rem] .mc-list').textContent.includes(n), 'زيت المحرك — اختبار'));
  // edit from the car page: alert off → leaves Home, calendar button hidden
  await q.evaluate(() => { location.hash = 'remind'; }); await q.waitForTimeout(300);
  await q.click(`[data-act=editrem][data-id="${added.id}"]`); await q.waitForTimeout(400);
  ok('rem: edit opens with saved values', await q.evaluate(() => document.getElementById('rm-name').value === 'زيت المحرك — اختبار' && document.getElementById('rm-note').value === 'زيت 5W-30' && document.querySelector('[data-rm-by=both]').getAttribute('aria-pressed') === 'true' && !!document.getElementById('rm-del')));
  await q.fill('#rm-name', 'زيت المحرك'); await q.click('.mc-scrim .mc-switch'); await q.waitForTimeout(80);
  ok('rem: alert off hides the "days before" field', await q.isHidden('#rm-before-w'));
  await q.click('#rm-save'); await q.waitForTimeout(350);
  S1 = await st(); let e1 = S1.reminders.find(r => r.id === added.id);
  ok('rem: edit updates the same reminder', S1.reminders.length === nR0 + 1 && e1.name === 'زيت المحرك' && e1.alert === false && e1.odoDue === odoNow + 300, JSON.stringify(e1));
  await q.evaluate(() => { location.hash = 'home'; }); await q.waitForTimeout(250);
  ok('rem: alert off → not on Home', !(await q.evaluate(id => [...document.querySelectorAll('.hm [data-id]')].some(x => x.dataset.id === id), added.id)));
  await q.evaluate(() => { location.hash = 'remind'; }); await q.waitForTimeout(250);
  ok('rem: alert off → no calendar button, still listed', await q.evaluate(id => { const c = document.querySelector(`[data-act=donerem][data-id="${id}"]`)?.closest('.rl-card'); return c && !c.querySelector('[data-act=ics]') && /التنبيه متوقف/.test(c.textContent); }, added.id));
  // complete: "done" → service form → reminder rolls forward by its repeat
  await q.click(`[data-act=donerem][data-id="${added.id}"]`); await q.waitForTimeout(350);
  ok('rem: done opens the service form with the reminder type', await q.evaluate(() => document.getElementById('en-cat').value === 'تغيير زيت المحرك'));
  await q.fill('#en-odo', String(odoNow + 250)); await q.fill('#en-cost', '15'); await q.click('#en-save'); await q.waitForTimeout(350);
  e1 = (await st()).reminders.find(r => r.id === added.id);
  const today = await q.evaluate(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); });
  ok('rem: complete → next due = reading + 5000 km and +6 months, history updated', e1.odoDue === odoNow + 250 + 5000 && e1.lastOdo === odoNow + 250 && e1.lastDate === today && e1.date === '' && e1.months === 6, JSON.stringify(e1));
  // custom title still resets because it matches by TYPE
  ok('rem: reset matches by type even with a custom title', e1.name === 'زيت المحرك');
  // one-off odometer reminder (no repeat) → marked done
  await q.evaluate(() => { location.hash = 'home'; }); await q.waitForTimeout(200);
  await q.click('#nav-bottom [data-act=fab]'); await q.waitForTimeout(250); await q.click('.mc-scrim [data-entry-rem]'); await q.waitForTimeout(450);
  await q.selectOption('#rm-cat', 'فرامل'); await q.click('[data-rm-by=odo]'); await q.fill('#rm-odo', String(odoNow + 900)); await q.fill('#rm-km', '');
  await q.click('#rm-save'); await q.waitForTimeout(350);
  let one = (await st()).reminders.find(r => r.cat === 'فرامل' && r.by === 'odo');
  ok('rem: odometer-only reminder saved without a date', one && one.odoDue === odoNow + 900 && one.date === '' && one.km === 0, JSON.stringify(one));
  await q.click('#nav-bottom [data-act=fab]'); await q.waitForTimeout(250); await q.click('.mc-scrim [data-entry-type=service]'); await q.waitForTimeout(250);
  await q.selectOption('#en-cat', 'فرامل'); await q.fill('#en-odo', String(odoNow + 880)); await q.fill('#en-cost', '40'); await q.click('#en-save'); await q.waitForTimeout(350);
  one = (await st()).reminders.find(r => r.id === one.id);
  ok('rem: one-off reminder completed → marked done, no due left', one.done === today && !one.odoDue, JSON.stringify(one));
  await q.evaluate(() => { location.hash = 'remind'; }); await q.waitForTimeout(300);
  ok('rem: done reminder shows "تمّ" on the reminders page', await q.evaluate(id => /تمّ/.test(document.querySelector(`[data-act=editrem][data-id="${id}"]`).closest('.rl-card').querySelector('.mc-badge').textContent), one.id));
  // delete with undo, then delete
  await q.click(`[data-act=editrem][data-id="${one.id}"]`); await q.waitForTimeout(400); await q.click('#rm-del'); await q.waitForTimeout(300);
  ok('rem: delete removes it', !(await st()).reminders.some(r => r.id === one.id));
  await q.click('.mc-toast-region button'); await q.waitForTimeout(300);
  ok('rem: undo restores it', (await st()).reminders.some(r => r.id === one.id));
  await q.click(`[data-act=editrem][data-id="${one.id}"]`); await q.waitForTimeout(400); await q.click('#rm-del'); await q.waitForTimeout(300);
  ok('rem: delete again (kept deleted)', !(await st()).reminders.some(r => r.id === one.id));
  // legacy reminder (interval only, no due fields) opens with derived due values and still works
  const leg = await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const r = d.S.reminders.find(x => !x.by && +x.km && +x.months); return r && { id: r.id, due: (+r.lastOdo || 0) + (+r.km) }; });
  if (leg) {
    await q.click(`[data-act=editrem][data-id="${leg.id}"]`); await q.waitForTimeout(400);
    ok('rem: old reminder opens with due odometer = last + interval', +(await q.inputValue('#rm-odo')) === leg.due && /^\d{4}-/.test(await q.inputValue('#rm-date')));
    await q.keyboard.press('Escape'); await q.waitForTimeout(250);
  }
  // English + dark
  await q.evaluate(() => { localStorage.setItem('mc-lang', 'en'); localStorage.setItem('mc-theme', 'dark'); }); await q.reload(); await q.waitForTimeout(400);
  await q.click('#nav-bottom [data-act=fab]'); await q.waitForTimeout(250); await q.click('.mc-scrim [data-entry-rem]'); await q.waitForTimeout(450);
  ok('rem: English form is LTR with English labels', await q.evaluate(() => document.querySelector('.mc-scrim').closest('[dir]').dir === 'ltr' && /New reminder/.test(document.querySelector('.mc-sheet__title').textContent) && /Odometer when due/.test(document.querySelector('label[for=rm-odo]').textContent)));
  ok('rem: no horizontal overflow in the sheet', await q.evaluate(() => { const s = document.querySelector('.mc-sheet'); return s.scrollWidth <= s.clientWidth + 1; }));
  await c4.close();
}

// ---------- reports + settings (design system) ----------
{
  const c5 = await b.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true }); const q = await c5.newPage();
  q.on('pageerror', e => issues.push('rs pageerror: ' + e.message)); q.on('console', m => { if (m.type() === 'error') issues.push('rs console.error: ' + m.text()); });
  await q.goto(`${BASE}/index.html`); await q.waitForTimeout(400);
  await q.evaluate(() => { location.hash = 'reports'; }); await q.waitForTimeout(250);
  ok('reports: empty state when there is no car', await q.isVisible('.rp [data-act=addveh]'));
  await q.evaluate(() => { location.hash = 'home'; }); await q.waitForTimeout(200); await q.click('[data-act=demo]'); await q.waitForTimeout(300);
  await q.evaluate(() => { location.hash = 'reports'; }); await q.waitForTimeout(400);
  const D = await q.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')));
  const today = new Date(); const ms = k => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 8) + '01'; };
  const sum = since => Object.values(D.E).flat().filter(x => x.v === D.S.cur && x.d >= since && x.t !== 'income').reduce((s, x) => s + (+x.cost || 0), 0);
  const shown = () => q.evaluate(() => parseFloat(document.querySelector('.rp-kpis .mc-stat__value').textContent.replace(/[^\d.]/g, '')));
  ok('reports: default 6 months, total matches the records', Math.abs((await shown()) - sum(ms(5))) < 0.001 && await q.evaluate(() => document.querySelector('[data-rp-period="6"]').getAttribute('aria-pressed') === 'true'), `${await shown()} vs ${sum(ms(5)).toFixed(3)}`);
  ok('reports: 6 monthly columns, one value label, hidden data table', await q.evaluate(() => document.querySelectorAll('.rp-col').length === 6 && document.querySelectorAll('.rp-col__val').length === 1 && document.querySelectorAll('.rp-chart table tr').length === 7));
  await q.click('[data-rp-period="0"]'); await q.waitForTimeout(400);
  ok('reports: "All" period sums every record', Math.abs((await shown()) - sum('')) < 0.001);
  await q.click('[data-rp-period="3"]'); await q.waitForTimeout(400);
  ok('reports: 3 months → 3 columns', await q.evaluate(() => document.querySelectorAll('.rp-col').length === 3));
  ok('reports: consumption line drawn with points', await q.evaluate(() => document.querySelectorAll('#rp-trend .rp-dot').length > 1 && !!document.querySelector('#rp-trend .rp-line')));
  await q.hover('.rp-col'); await q.waitForTimeout(100);
  ok('reports: hovering a column shows its tooltip', await q.evaluate(() => { const t = document.querySelector('.rp-tip'); return !t.hidden && /\d/.test(t.textContent); }));
  ok('reports: breakdown lists categories with amounts', await q.evaluate(() => document.querySelectorAll('.rp-hb li').length >= 2));
  ok('reports: no horizontal overflow', await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // settings
  await q.evaluate(() => { location.hash = 'settings'; }); await q.waitForTimeout(300);
  ok('settings: vehicles, look, prefs, categories, backup sections', await q.evaluate(() => ['st-v', 'st-l', 'st-p', 'st-c', 'st-b'].every(i => document.getElementById(i))));
  await q.fill('#s-cur', 'OMR'); await q.press('#s-cur', 'Tab'); await q.selectOption('#s-dec', '2'); await q.selectOption('#s-unit', 'l100'); await q.waitForTimeout(150);
  ok('settings: currency, decimals and unit saved', await q.evaluate(() => { const s = JSON.parse(localStorage.getItem('sayarati-v1')).S.set; return s.cur === 'OMR' && s.dec === 2 && s.unit === 'l100'; }));
  await q.evaluate(() => { location.hash = 'reports'; }); await q.waitForTimeout(300);
  ok('settings → reports use the new unit and currency', await q.evaluate(() => /L\/100km|ل\/100كم/.test(document.querySelector('.rp').textContent) && /OMR/.test(document.querySelector('.rp-kpis').textContent)));
  await q.evaluate(() => { location.hash = 'settings'; }); await q.waitForTimeout(300);
  // categories: rename updates records + reminders, delete with undo
  await q.click('[data-set-ct=service]'); await q.waitForTimeout(100);
  const oilI = await q.evaluate(() => [...document.querySelectorAll('.st-cats .mc-list-item__title')].findIndex(e => e.textContent === 'تغيير زيت المحرك'));
  await q.click(`[data-set-cat=edit][data-i="${oilI}"]`); await q.waitForTimeout(300);
  await q.fill('#cat-name', 'فلتر هواء'); await q.click('#cat-save'); await q.waitForTimeout(150);
  ok('category: duplicate name refused with an inline error', await q.evaluate(() => document.getElementById('cat-name').getAttribute('aria-invalid') === 'true' && !!document.querySelector('#cat-err [role=alert]')));
  await q.fill('#cat-name', 'زيت المحرك'); await q.click('#cat-save'); await q.waitForTimeout(300);
  ok('category: rename updates records and reminders', await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); const all = Object.values(d.E).flat(); return d.S.cats.service.includes('زيت المحرك') && !all.some(x => x.cat === 'تغيير زيت المحرك') && all.some(x => x.cat === 'زيت المحرك') && d.S.reminders.some(r => r.name === 'زيت المحرك'); }));
  await q.click('[data-set-ct=expense]'); await q.waitForTimeout(100);
  const nE = await q.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')).S.cats.expense.length);
  await q.click('[data-set-cat=del][data-i="0"]'); await q.waitForTimeout(250); await q.click('[data-mc-ok]'); await q.waitForTimeout(300);
  ok('category: delete (after confirm)', await q.evaluate(n => JSON.parse(localStorage.getItem('sayarati-v1')).S.cats.expense.length === n - 1, nE));
  await q.click('.mc-toast__action'); await q.waitForTimeout(250);
  ok('category: undo restores it', await q.evaluate(n => JSON.parse(localStorage.getItem('sayarati-v1')).S.cats.expense.length === n, nE));
  // theme + language from settings
  await q.click('[data-set-theme=dark]'); await q.click('[data-set-lang=en]'); await q.waitForTimeout(300);
  ok('settings: theme + language switch (EN/LTR, dark)', await q.evaluate(() => document.documentElement.dataset.theme === 'dark' && document.documentElement.dir === 'ltr' && document.querySelector('.st h1').textContent === 'Settings'));
  ok('settings: no horizontal overflow', await q.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // backup → invalid file → valid restore → wipe
  const [bk] = await Promise.all([q.waitForEvent('download', { timeout: 4000 }).catch(() => null), q.click('[data-act=drvsave]')]);
  const bkPath = bk && await bk.path(); const bkJson = bkPath ? JSON.parse((await import('node:fs')).readFileSync(bkPath, 'utf8')) : null;
  const snap = await q.evaluate(() => localStorage.getItem('sayarati-v1'));
  ok('backup: same format {app,v,S,E} and identical to stored data', bkJson && bkJson.app === 'sayarati' && bkJson.v === 1 && (() => { const st = JSON.parse(snap); delete st.S.set.lastDrive; const bj = JSON.parse(JSON.stringify({ S: bkJson.S, E: bkJson.E })); delete bj.S.set.lastDrive; return JSON.stringify(bj) === JSON.stringify(st); })());
  ok('backup: last-backup date shown', await q.evaluate(() => /Last backup/.test(document.getElementById('st-b').closest('section').textContent)));
  await q.setInputFiles('#imp', { name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"nope":1}') }); await q.waitForTimeout(300);
  ok('restore: invalid file rejected, data untouched', /valid backup/.test(await q.evaluate(() => document.querySelector('.mc-toast-region')?.textContent || '')) && (await q.evaluate(() => localStorage.getItem('sayarati-v1'))) === (await q.evaluate(() => localStorage.getItem('sayarati-v1'))));
  await q.click('[data-set=wipe]'); await q.waitForTimeout(250); await q.click('[data-mc-ok]'); await q.waitForTimeout(400);
  ok('wipe: everything removed after confirm', await q.evaluate(() => { const d = JSON.parse(localStorage.getItem('sayarati-v1')); return !d.S.vehicles.length && !Object.values(d.E).flat().length; }));
  await q.evaluate(() => { location.hash = 'settings'; }); await q.waitForTimeout(300);
  await q.setInputFiles('#imp', bkPath); await q.waitForTimeout(300);
  await q.click('.mc-scrim [data-mc-close]'); await q.waitForTimeout(250);
  ok('restore: cancelling the confirm changes nothing', await q.evaluate(() => !JSON.parse(localStorage.getItem('sayarati-v1')).S.vehicles.length));
  await q.setInputFiles('#imp', bkPath); await q.waitForTimeout(300); await q.click('[data-mc-ok]'); await q.waitForTimeout(400);
  const back = await q.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1')));
  ok('restore: data identical to the backup (records, reminders, categories, settings)', JSON.stringify(back.E) === JSON.stringify(bkJson.E) && JSON.stringify(back.S.reminders) === JSON.stringify(bkJson.S.reminders) && JSON.stringify(back.S.cats) === JSON.stringify(bkJson.S.cats) && back.S.set.cur === 'OMR');
  const [csvD] = await Promise.all([q.waitForEvent('download', { timeout: 4000 }).catch(() => null), q.click('[data-act=expcsv]')]);
  const csvT = csvD ? (await import('node:fs')).readFileSync(await csvD.path(), 'utf8') : '';
  ok('CSV: one row per record + header', csvT.trim().split('\n').length === Object.values(back.E).flat().length + 1);
  await c5.close();
}

// ---------- log + reminders list (design system) ----------
{
  const c6 = await b.newContext({ viewport: { width: 390, height: 700 }, acceptDownloads: true }); const q = await c6.newPage();
  q.on('pageerror', e => issues.push('lr pageerror: ' + e.message)); q.on('console', m => { if (m.type() === 'error') issues.push('lr console.error: ' + m.text()); });
  await q.goto(`${BASE}/index.html#log`); await q.waitForTimeout(400);
  ok('log: empty state without a car', await q.isVisible('.lg [data-act=addveh]'));
  await q.click('.lg [data-act=demo]'); await q.waitForTimeout(300); await q.evaluate(() => { location.hash = 'log'; }); await q.waitForTimeout(300);
  const D = await q.evaluate(() => JSON.parse(localStorage.getItem('sayarati-v1'))); const recs = Object.values(D.E).flat().filter(x => x.v === D.S.cur);
  ok('log: every record listed, grouped by month', await q.evaluate(n => document.querySelectorAll('.lg [data-act=edit]').length === n && document.querySelectorAll('.lg-month').length > 3, recs.length));
  const m0 = recs.map(x => x.d.slice(0, 7)).sort().pop(); const sp = recs.filter(x => x.d.startsWith(m0) && x.t !== 'income').reduce((s, x) => s + x.cost, 0);
  ok('log: month total = that month’s spending', await q.evaluate(() => parseFloat(document.querySelector('.lg-month__head > span .mc-num').textContent.replace(/,/g, ''))) === +sp.toFixed(3));
  await q.click('[data-log-type=service]'); await q.waitForTimeout(250);
  ok('log: type filter', await q.evaluate(n => document.querySelectorAll('.lg [data-act=edit]').length === n && document.querySelector('[data-log-type=service]').getAttribute('aria-pressed') === 'true', recs.filter(x => x.t === 'service').length));
  await q.click('[data-log-type=all]'); await q.waitForTimeout(250);
  await q.fill('#q', 'غسيل'); await q.waitForTimeout(150);
  ok('log: search filters as you type and keeps focus', await q.evaluate(n => document.querySelectorAll('.lg [data-act=edit]').length === n && document.activeElement.id === 'q', recs.filter(x => x.cat === 'غسيل').length));
  await q.fill('#q', 'zzzz'); await q.waitForTimeout(150);
  ok('log: no-match state', await q.evaluate(() => /لا توجد سجلات مطابقة/.test(document.getElementById('loglist').textContent)));
  await q.fill('#q', ''); await q.waitForTimeout(150);
  const partial = recs.find(x => x.t === 'fuel' && !x.full);
  ok('log: partial fill is labelled', !partial || await q.evaluate(id => /خزان غير ممتلئ/.test(document.querySelector(`.lg [data-act=edit][data-id="${id}"]`).textContent), partial.id));
  await q.click('.lg [data-act=edit]'); await q.waitForTimeout(350);
  ok('log: tapping a record opens its edit form', await q.evaluate(() => !!document.getElementById('en-del')));
  await q.keyboard.press('Escape'); await q.waitForTimeout(250);
  // the car page "see all" for a tab opens the log filtered
  await q.evaluate(() => { location.hash = 'car'; }); await q.waitForTimeout(300);
  const carLog = await q.$('[data-car-log]');
  if (carLog) { await carLog.click(); await q.waitForTimeout(350); ok('log: opened pre-filtered from the car page', await q.evaluate(() => location.hash === '#log' && document.querySelector('.lg-filter [aria-pressed=true]').dataset.logType !== 'all')); await q.click('[data-log-type=all]'); await q.waitForTimeout(200); }
  // reminders list
  await q.evaluate(() => { location.hash = 'remind'; }); await q.waitForTimeout(300);
  const nR = D.S.reminders.filter(r => r.v === D.S.cur).length;
  ok('reminders: one card per reminder with status, progress and actions', await q.evaluate(n => document.querySelectorAll('.rl-card').length === n && [...document.querySelectorAll('.rl-card')].every(c => c.querySelector('.mc-badge') && c.querySelector('[role=progressbar]') && c.querySelector('[data-act=donerem]') && c.querySelector('[data-act=editrem]')), nR));
  ok('reminders: sorted most urgent first', await q.evaluate(() => { const v = [...document.querySelectorAll('.rl-card [role=progressbar]')].map(e => +e.getAttribute('aria-valuenow')); return v.every((x, i) => !i || v[i - 1] >= x); }));
  await q.click('.rl [data-act=addrem]'); await q.waitForTimeout(400);
  ok('reminders: add opens the reminder form', await q.evaluate(() => !!document.getElementById('rm-form')));
  await q.keyboard.press('Escape'); await q.waitForTimeout(250);
  await q.click('.rl-card [data-act=editrem]'); await q.waitForTimeout(400);
  ok('reminders: edit opens the reminder form with its data', await q.evaluate(() => !!document.getElementById('rm-del') && document.getElementById('rm-name').value.length > 0));
  await q.keyboard.press('Escape'); await q.waitForTimeout(250);
  await q.click('.rl-card [data-act=ics]'); await q.waitForTimeout(350);
  ok('reminders: calendar sheet offers file + Google Calendar', await q.evaluate(() => !!document.querySelector('.mc-scrim [data-act=icsfile]') && /calendar\.google\.com/.test(document.querySelector('.mc-scrim a[href*=google]').href)));
  const [ics] = await Promise.all([q.waitForEvent('download', { timeout: 4000 }).catch(() => null), q.click('.mc-scrim [data-act=icsfile]')]);
  const icsT = ics ? (await import('node:fs')).readFileSync(await ics.path(), 'utf8') : '';
  ok('reminders: .ics has the event + alarms and the sheet closes', /BEGIN:VEVENT/.test(icsT) && /BEGIN:VALARM/.test(icsT) && /Camry/.test(icsT) && await q.evaluate(() => !document.querySelector('.mc-scrim.is-open')));
  await q.click('.rl-card [data-act=donerem]'); await q.waitForTimeout(350);
  ok('reminders: done opens the service form with its type', await q.evaluate(() => !!document.getElementById('en-form') && document.getElementById('en-cat').value.length > 0));
  await q.keyboard.press('Escape'); await q.waitForTimeout(250);
  // English + dark, and nothing hidden under the bottom bar
  await q.evaluate(() => { localStorage.setItem('mc-lang', 'en'); localStorage.setItem('mc-theme', 'dark'); }); await q.reload(); await q.waitForTimeout(400);
  ok('reminders: English labels', await q.evaluate(() => document.querySelector('.rl h1').textContent === 'Reminders' && /Done/.test(document.querySelector('.rl-card [data-act=donerem]').textContent)));
  for (const h of ['home', 'car', 'log', 'remind', 'reports', 'settings']) {
    await q.evaluate(x => { location.hash = x; }, h); await q.waitForTimeout(350);
    ok(`#${h}: last content clears the bottom bar; no sideways scroll`, await q.evaluate(() => { scrollTo(0, 1e6); const nav = document.getElementById('nav-bottom').getBoundingClientRect().top;
      const els = [...document.querySelectorAll('#main *')].filter(e => e.offsetParent && !e.children.length); return Math.max(...els.map(e => e.getBoundingClientRect().bottom)) <= nav && document.documentElement.scrollWidth <= innerWidth; }));
  }
  await c6.close();
}
await b.close();

let f = 0; for (const r of results) { if (!r.pass) f++; console.log(`${r.pass ? '✓' : '✗'} ${r.name}${r.detail ? ' — ' + r.detail : ''}`); }
console.log(`\nconsole/network issues: ${issues.length}`); issues.forEach(i => console.log('  ' + i));
console.log(`TOTAL: ${results.length - f}/${results.length} passed`);
process.exit(f || issues.length ? 1 : 0);
