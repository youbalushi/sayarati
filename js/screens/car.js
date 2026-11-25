// سيارتي · My Car — Home car card + documents section, vehicle editor, document editor/viewer
// Reads/writes the existing data through ctx. New optional fields (all backward compatible):
//   vehicle: model, year, photo (JPEG data URL)      S.docs: [{id, v, type, title, number, expiry, img, added}]
import { t, getLang, esc, icon, button, iconButton, field, badge, listItem, menu, num, fmt, parseNum, openSheet, closeSheet, confirmDialog, toast } from '../ui.js';
import { MAKES, makeLabel, modelsOf, bodyOf, inCatalog, vehTitle, vehSub, legacyName, vehImage, photoFit, tintPhotos, carArt, mountCatalog } from '../vehicle.js';

const fill = (s, n) => String(s).replace('{n}', n);
const DOC_TYPES = ['insurance', 'registration', 'inspection', 'license', 'other'];

/* ---------- helpers ---------- */
const safeImg = p => (typeof p === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(p) ? p : '');
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const daysTo = d => Math.round((new Date(d) - new Date(today())) / 864e5);
const docs = (ctx, v) => (ctx.S.docs || []).filter(d => d.v === v).sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
function docStatus(d) {
  if (!d.expiry) return null;
  const n = daysTo(d.expiry);
  return n < 0 ? ['danger', t('car.expired')] : n <= 30 ? ['warning', fill(t('car.expiresIn'), n)] : ['success', t('car.valid')];
}
const curLabel = ctx => { const c = ctx.S.set.cur || 'ر.ع'; return getLang() === 'en' && c === 'ر.ع' ? 'OMR' : c; };
const fill2 = (s, o) => Object.entries(o).reduce((a, [k, v]) => a.replace('{' + k + '}', v), String(s));
const longDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]} ${y}`; };

/** Where the subject is inside a photo with plain margins (white / grey / transparent studio-style background).
    Returns {x,y,w,h} in the photo's own pixels, or null to keep the photo as it is:
    - the margin colour is read from the outer edge; if the edge is not one uniform colour (a normal photo with a
      street or garage behind the car) nothing is cut;
    - the box holds everything that differs from that colour (car + its shadow), ignoring isolated specks;
    - a small breathing margin is kept so the car never touches the frame; nothing is cut when the gain is tiny. */
export function subjectBox(img) {
  const W0 = img.naturalWidth, H0 = img.naturalHeight, k = Math.min(1, 480 / Math.max(W0, H0));
  const W = Math.max(1, Math.round(W0 * k)), H = Math.max(1, Math.round(H0 * k));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data, at = (x, y) => (y * W + x) * 4;
  // edge ring (2 px)
  const ring = [];
  for (let x = 0; x < W; x++) for (const y of [0, 1, H - 2, H - 1]) if (y >= 0 && y < H) ring.push(at(x, y));
  for (let y = 2; y < H - 2; y++) for (const x of [0, 1, W - 2, W - 1]) if (x >= 0 && x < W) ring.push(at(x, y));
  const clear = ring.filter(o => d[o + 3] < 24).length / ring.length > 0.5;
  const solid = ring.filter(o => d[o + 3] >= 24), med = ch => { const v = solid.map(o => d[o + ch]).sort((a, b) => a - b); return v[v.length >> 1] || 0; };
  const bg = clear ? null : [med(0), med(1), med(2)], TH = 28;
  const isBg = o => d[o + 3] < 24 || (bg && Math.max(Math.abs(d[o] - bg[0]), Math.abs(d[o + 1] - bg[1]), Math.abs(d[o + 2] - bg[2])) <= TH);
  if (!clear && solid.filter(isBg).length / solid.length < 0.85) return null; // edge isn't one plain colour → a real scene
  const rows = new Uint32Array(H), cols = new Uint32Array(W);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (!isBg(at(x, y))) { rows[y]++; cols[x]++; }
  const rMin = Math.max(2, W * 0.006), cMin = Math.max(2, H * 0.006);
  let top = 0, bot = H - 1, lef = 0, rig = W - 1;
  while (top < H && rows[top] < rMin) top++; while (bot > top && rows[bot] < rMin) bot--;
  while (lef < W && cols[lef] < cMin) lef++; while (rig > lef && cols[rig] < cMin) rig--;
  if (top >= bot || lef >= rig) return null; // nothing found
  const pad = Math.round(Math.max(rig - lef, bot - top) * 0.04);
  top = Math.max(0, top - pad); lef = Math.max(0, lef - pad); bot = Math.min(H - 1, bot + pad); rig = Math.min(W - 1, rig + pad);
  const box = { x: Math.floor(lef / k), y: Math.floor(top / k), w: Math.ceil((rig - lef + 1) / k), h: Math.ceil((bot - top + 1) / k) };
  box.w = Math.min(box.w, W0 - box.x); box.h = Math.min(box.h, H0 - box.y);
  return box.w * box.h > W0 * H0 * 0.92 ? null : box; // margins too small to matter
}

/** Downscale an image file to a JPEG data URL (keeps storage small).
    { trim: true } first cuts plain margins around the subject (see subjectBox); proportions are never changed. */
export async function imageToDataURL(file, max, quality, { trim = false } = {}) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const box = (trim && subjectBox(img)) || { x: 0, y: 0, w: img.naturalWidth, h: img.naturalHeight };
    const s = Math.min(1, max / Math.max(box.w, box.h));
    const c = document.createElement('canvas'); c.width = Math.round(box.w * s); c.height = Math.round(box.h * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, box.x, box.y, box.w, box.h, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- Home: car card ----------
   photo (editing lives in Settings → Vehicles), then name + year with a small arrow to switch car, registration expiry
   (from the ownership document) on the start side; plate + odometer, small and grey, on the end side. */
export function carHero(ctx, V) {
  const { S } = ctx, img = vehImage(V), isArt = !safeImg(V.photo) && !!img, title = esc(vehTitle(V)), odo = ctx.curOdo(V.id);
  const own = docs(ctx, V.id).find(d => d.type === 'registration'), st = own && own.expiry ? docStatus(own) : null;
  const cars = S.vehicles.map(c => ({ label: vehTitle(c), sub: [c.year, c.plate ? `<span class="mc-num">${esc(c.plate)}</span>` : ''].filter(Boolean).join(' · '), icon: 'car', action: 'hm-car', value: c.id, checked: c.id === S.cur }));
  return `<section class="mc-card mc-card--flush hm-hero" aria-label="${title}">
    <div class="cd-photo${img ? (isArt ? ' is-art' : '') : ' is-empty'}" role="img" aria-label="${title}">${img || `${icon('car')}<span class="mc-small">${t('car.noPhoto')}</span>`}</div>
    <div class="hm-id">
      <div class="hm-id__name">
        <div class="hm-switch">${menu({ id: 'hm-cars', label: t('home.switchCarLabel'), triggerIcon: 'chevron-down', items: [...cars, { sep: true }, { label: t('home.addCar'), icon: 'plus', action: 'hm-addcar' }] })}</div>
        <h1 class="hm-car__name">${title}</h1>${V.year ? `<span class="hm-year mc-num">${esc(V.year)}</span>` : ''}
      </div>
      <span class="hm-id__end">${V.plate ? `<span class="mc-num" dir="auto">${esc(V.plate)}</span>` : ''}</span>
      <div class="hm-exp">${own && own.expiry ? `<span class="hm-exp__ic">${icon('calendar')}</span><span>${fill2(t('home.expiresOn'), { d: `<b>${longDate(own.expiry)}</b>` })}</span>${st && st[0] !== 'success' ? badge(st[1], st[0]) : ''}` : ''}</div>
      <span class="hm-id__end"><span class="mc-num">${fmt(odo)}</span> ${t('unit.km')}</span>
    </div>
  </section>`;
}

/* ---------- Home: documents ----------
   Ownership: one document (View when there is one, Add when not). Insurance: several (count + View, or Add).
   Older documents of other types stay reachable under "Other documents" (shown only when there are some). */
const docCount = n => (getLang() === 'ar' ? (n === 1 ? t('home.docs1') : n === 2 ? t('home.docs2') : n <= 10 ? fill(t('home.docsFew'), n) : fill(t('home.docsMany'), n)) : n === 1 ? t('home.docs1') : fill(t('home.docsFew'), n));
export function docsSection(ctx, V) {
  const ds = docs(ctx, V.id), own = ds.find(d => d.type === 'registration'), ins = ds.filter(d => d.type === 'insurance');
  const other = ds.filter(d => d.type !== 'insurance' && (d.type !== 'registration' || d !== own));
  const viewBtn = attrs => button(t('home.view'), { variant: 'outline', size: 'sm', icon: 'eye', attrs });
  const addBtn = attrs => button(t('home.add'), { variant: 'tonal', size: 'sm', icon: 'plus', attrs });
  const row = (title, sub, tone, trail) => listItem({ tag: 'div', compact: true, title, sub, lead: 'receipt', tone, trail });
  return `<section aria-labelledby="hm-docs">
    <div class="mc-section-head"><h2 class="mc-title" id="hm-docs">${t('home.docs')}</h2></div>
    <div class="mc-list hm-docs">
      ${row(t('home.ownership'), '', 'primary', own ? viewBtn(`data-car="doc-open" data-id="${esc(own.id)}"`) : addBtn('data-car="doc-add" data-type="registration"'))}
      ${row(t('home.insurance'), ins.length ? docCount(ins.length) : '', 'warning', ins.length ? viewBtn('data-car="doc-list" data-type="insurance"') : addBtn('data-car="doc-add" data-type="insurance"'))}
      ${other.length ? row(t('home.otherDocs'), docCount(other.length), 'neutral', viewBtn('data-car="doc-list" data-type="other"')) : ''}
    </div></section>`;
}

/* ---------- vehicle editor (add + edit) ---------- */
export function openVehicleEditor(ctx, id = null) {
  const old = id ? ctx.veh(id) : null, V = old || { fuel: 'M91' };
  let photo = safeImg(V.photo), photoCat = V.photoCat || null;
  const known = !!MAKES.find(m => m[0] === V.make);
  const nick0 = V.nick || (!V.make && !V.model ? V.name || '' : '');
  const yearNow = new Date().getFullYear();
  const makeOpts = [['', t('car.choose')], ...MAKES.map(m => [m[0], makeLabel(m[0])]), ['__other', t('car.other')]];
  const modelOpts = mk => [['', t('car.choose')], ...modelsOf(mk).map(x => [x[0], x[0]]), ['__other', t('car.other')]];
  const make0 = V.make ? (known ? V.make : '__other') : '';
  const model0 = V.model ? (known && modelsOf(V.make).some(x => x[0] === V.model) ? V.model : '__other') : '';
  const formModel = () => { const r = s => root && root.querySelector(s); const mk = r('#ve-make') ? r('#ve-make').value : V.make, md = r('#ve-model') ? r('#ve-model').value : V.model; return [mk, md]; };
  let root = null;
  const preview = () => { if (photo) return photoFit(photo); const [mk, md] = formModel(); return photoCat && inCatalog(mk, md) ? carArt(bodyOf(mk, md), photoCat.color) : icon('car'); };
  const body = `<div id="ve-formview"><form class="mc-stack" id="ve-form" novalidate>
    <div class="cd-edit-photo">
      <div class="cd-edit-photo__img${photo || photoCat ? '' : ' is-empty'}" id="ve-photo">${preview()}</div>
      <div class="mc-row">${button(t('catalog.fromCatalog'), { variant: 'tonal', size: 'sm', icon: 'car', attrs: 'id="ve-cat"' })}
        <label class="mc-btn mc-btn--ghost mc-btn--sm">${icon('upload')}<span>${t('catalog.fromDevice')}</span><input type="file" accept="image/*" id="ve-file" hidden></label>
        ${button(t('car.removePhoto'), { variant: 'ghost', size: 'sm', attrs: `id="ve-rm" ${photo || photoCat ? '' : 'hidden'}` })}</div>
    </div>
    <div class="mc-grid-2">
      <div class="mc-stack" style="gap:var(--space-2)">${field({ id: 've-make', label: t('car.make'), options: makeOpts, value: make0 })}
        <div id="ve-make-o" ${make0 === '__other' ? '' : 'hidden'}>${field({ id: 've-make-t', label: t('car.otherMake'), value: known ? '' : V.make || '' })}</div></div>
      <div class="mc-stack" style="gap:var(--space-2)"><div id="ve-model-w">${field({ id: 've-model', label: t('car.model'), options: modelOpts(known ? V.make : ''), value: model0 })}</div>
        <div id="ve-model-o" ${model0 === '__other' || make0 === '__other' ? '' : 'hidden'}>${field({ id: 've-model-t', label: t('car.otherModel'), value: model0 === '__other' || make0 === '__other' ? V.model || '' : '', placeholder: t('car.modelPh') })}</div></div>
    </div>
    <div class="mc-grid-2">${field({ id: 've-year', label: t('car.year'), optional: t('car.optional'), value: V.year || '', inputmode: 'numeric', placeholder: String(yearNow) })}${field({ id: 've-nick', label: t('car.nick'), optional: t('car.optional'), value: nick0, placeholder: t('car.namePh') })}</div>
    <div class="mc-field__hint" style="margin-top:-6px">${t('car.nickHint')}</div>
    <div class="mc-grid-2">${field({ id: 've-plate', label: t('car.plate'), optional: t('car.optional'), value: V.plate || '' })}${field({ id: 've-odo', label: t('car.odo0'), optional: t('car.optional'), value: V.odo0 || '', inputmode: 'numeric', unit: t('unit.km') })}</div>
    <div class="mc-grid-2">${field({ id: 've-bought', label: t('car.bought'), optional: t('car.optional'), type: 'date', value: V.bought || '' })}${field({ id: 've-price', label: t('car.price'), optional: t('car.optional'), value: V.price || '', inputmode: 'decimal', unit: curLabel(ctx) })}</div>
    <div id="ve-err"></div>
    ${old ? `<div class="mc-divider"></div>${button(t('car.deleteCar'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="ve-del"' })}` : ''}
  </form></div>
  <div id="ve-catview" class="mc-stack" hidden><button type="button" class="mc-btn mc-btn--ghost mc-btn--sm" id="ve-catback" style="justify-self:start">${icon('arrow-left')}<span>${t('action.back')}</span></button><div id="ve-ct" class="mc-stack"></div><p class="mc-caption mc-muted" style="margin:0">${t('catalog.note')}</p></div>`;
  root = openSheet({ title: t(old ? 'car.editTitle' : 'home.addCar'), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="ve-save"' }) });
  const $ = s => root.querySelector(s);
  const showPhoto = () => { const html = preview(), has = !!photo || (photoCat && inCatalog(...formModel())); $('#ve-photo').className = 'cd-edit-photo__img' + (has ? '' : ' is-empty'); $('#ve-photo').innerHTML = html; $('#ve-rm').hidden = !(photo || photoCat);  tintPhotos($('#ve-photo')); };
  $('#ve-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { photo = await imageToDataURL(f, 900, 0.82, { trim: true }); photoCat = null; showPhoto(); } // new car photos: plain margins trimmed
    catch (err) { toast(t('car.imageError'), { tone: 'danger' }); }
  });
  $('#ve-rm').addEventListener('click', () => { photo = ''; photoCat = null; showPhoto(); });
  // make → model options; "Other…" reveals a text field
  const syncMake = () => {
    const mk = $('#ve-make').value;
    $('#ve-make-o').hidden = mk !== '__other';
    if (mk === '__other' || !mk) { $('#ve-model-w').hidden = mk === '__other'; $('#ve-model-o').hidden = mk !== '__other'; if (!mk) $('#ve-model').innerHTML = modelOpts('').map(([v, l]) => `<option value="${esc(v)}">${esc(l)}</option>`).join(''); return; }
    $('#ve-model-w').hidden = false;
    const cur = $('#ve-model').value;
    $('#ve-model').innerHTML = modelOpts(mk).map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('');
    $('#ve-model-o').hidden = $('#ve-model').value !== '__other';
  };
  $('#ve-make').addEventListener('change', syncMake);
  $('#ve-model').addEventListener('change', () => { $('#ve-model-o').hidden = $('#ve-model').value !== '__other'; });
  if (make0 === '__other') { $('#ve-model-w').hidden = true; }
  // catalog view inside the same sheet (form state is kept)
  const foot = root.querySelector('.mc-sheet__foot'), head = root.querySelector('.mc-sheet__title');
  const backToForm = () => { $('#ve-catview').hidden = true; $('#ve-formview').hidden = false; foot.hidden = false; head.textContent = t(old ? 'car.editTitle' : 'home.addCar'); $('#ve-cat').focus(); };
  $('#ve-catback').addEventListener('click', backToForm);
  // a catalog drawing belongs to one make+model: if the user changes them, the drawing follows (same color)
  const followModel = () => { if (photoCat) showPhoto(); };
  $('#ve-make').addEventListener('change', followModel); $('#ve-model').addEventListener('change', followModel);
  $('#ve-cat').addEventListener('click', () => {
    $('#ve-formview').hidden = true; $('#ve-catview').hidden = false; foot.hidden = true; head.textContent = t('catalog.title');
    const mk = $('#ve-make').value;
    mountCatalog($('#ve-ct'), { make: mk, model: $('#ve-model').value, color: photoCat ? photoCat.color : 'silver' }, pick => {
      photoCat = pick; photo = '';
      $('#ve-catview').hidden = true; $('#ve-formview').hidden = false; foot.hidden = false; head.textContent = t(old ? 'car.editTitle' : 'home.addCar'); showPhoto(); $('#ve-cat').focus();
    });
    $('#ve-ct').querySelector('input,button')?.focus();
  });
  $('#ve-save').addEventListener('click', () => {
    const val = s => $(s).value.trim();
    const mkSel = $('#ve-make').value, make = mkSel === '__other' ? val('#ve-make-t') : mkSel;
    const mdSel = $('#ve-model').value, model = mkSel === '__other' || mdSel === '__other' ? val('#ve-model-t') : mdSel;
    const nick = val('#ve-nick'), year = val('#ve-year') ? parseNum(val('#ve-year')) : '', price = val('#ve-price') ? parseNum(val('#ve-price')) : '';
    const errs = [];
    if (!(make && model) && !nick) errs.push([make ? (mkSel === '__other' || mdSel === '__other' ? 've-model-t' : 've-model') : 've-make', t('car.errName')]);
    if (year !== '' && !(year >= 1950 && year <= yearNow + 1)) errs.push(['ve-year', fill(t('car.errYear'), yearNow + 1)]);
    if (price !== '' && !(price >= 0)) errs.push(['ve-price', t('car.errPrice')]);
    root.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    if (errs.length) {
      errs.forEach(([id]) => $('#' + id).setAttribute('aria-invalid', 'true'));
      $('#ve-err').innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div>${errs.map(e => esc(e[1])).join('<br>')}</div></div>`;
      $('#' + errs[0][0]).focus(); return;
    }
    const nv = { ...(old || {}), id: old ? old.id : ctx.uid(), make, model, nick, year: year === '' ? '' : Math.round(year), plate: val('#ve-plate'),
      odo0: parseNum(val('#ve-odo')) || 0, bought: $('#ve-bought').value, price: price === '' ? '' : price, photo, photoCat };
    // fuel type and tank capacity are no longer edited here; values saved earlier are kept as they are
    if (!nv.bought) delete nv.bought; if (nv.price === '') delete nv.price;
    if (photoCat) nv.photoCat = inCatalog(make, model) ? { make, model, body: bodyOf(make, model), color: photoCat.color } : null;
    if (!photo) delete nv.photo; if (!nv.photoCat) delete nv.photoCat; if (!nick) delete nv.nick;
    nv.name = legacyName(nv);
    const before = JSON.stringify(ctx.S.vehicles), beforeCur = ctx.S.cur;
    if (old) ctx.S.vehicles = ctx.S.vehicles.map(z => (z.id === nv.id ? nv : z));
    else { ctx.S.vehicles.push(nv); ctx.S.cur = nv.id; }
    if (!ctx.save(['g'])) { ctx.S.vehicles = JSON.parse(before); ctx.S.cur = beforeCur; toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
    closeSheet(); ctx.render(); toast(t(old ? 'car.saved' : 'car.added'), { tone: 'success' });
  });
  const del = $('#ve-del');
  if (del) del.addEventListener('click', async () => {
    closeSheet();
    if (await confirmDialog({ title: fill(t('car.deleteQ'), vehTitle(old)), text: t('car.deleteText'), confirmText: t('action.delete') })) { ctx.deleteVehicle(old.id); location.hash = 'home'; toast(t('car.deleted')); }
  });
}

/* ---------- catalog sheet (from the photo on the details page) ---------- */
/* ---------- documents ---------- */
// type is fixed when adding from Home (ownership / insurance); the type picker stays for older documents of other types.
function openDocEditor(ctx, id = null, presetType = null) {
  const old = id ? (ctx.S.docs || []).find(d => d.id === id) : null, D = old || { type: presetType || 'insurance' };
  const fixed = !old && presetType || (old && ['registration', 'insurance'].includes(old.type));
  let img = safeImg(D.img);
  const body = `<form class="mc-stack" id="de-form" novalidate>
    ${fixed ? `<input type="hidden" id="de-type" value="${esc(D.type)}">` : field({ id: 'de-type', label: t('car.docType'), options: DOC_TYPES.map(k => [k, t('car.doc.' + k)]), value: D.type })}
    ${D.type === 'registration' && fixed ? `<input type="hidden" id="de-title" value="${esc(D.title || '')}">` : field({ id: 'de-title', label: t('car.docTitle'), optional: t('car.optional'), value: D.title || '', placeholder: t(D.type === 'insurance' ? 'car.insTitlePh' : 'car.docTitlePh') })}
    <div class="mc-grid-2">${field({ id: 'de-num', label: t('car.docNumber'), optional: t('car.optional'), value: D.number || '' })}${field({ id: 'de-exp', label: t('car.expiry'), optional: t('car.optional'), type: 'date', value: D.expiry || '' })}</div>
    <div class="mc-field"><span class="mc-field__label">${t('car.docImage')} <small>(${t('car.optional')})</small></span>
      <div class="cd-doc-img${img ? '' : ' is-empty'}" id="de-prev">${img ? `<img src="${img}" alt="">` : icon('receipt')}</div>
      <div class="mc-row"><label class="mc-btn mc-btn--tonal mc-btn--sm">${icon('upload')}<span>${t('car.choosePhoto')}</span><input type="file" accept="image/*" id="de-file" hidden></label>
        ${button(t('car.removePhoto'), { variant: 'ghost', size: 'sm', attrs: `id="de-rm" ${img ? '' : 'hidden'}` })}</div></div>
    ${old ? `<div class="mc-divider"></div>${button(t('car.deleteDoc'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="de-del"' })}` : ''}
  </form>`;
  const head = old ? (old.title || docName(old.type)) : docName(D.type);
  const root = openSheet({ title: old ? head : `${t('car.addDoc')} · ${head}`, body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="de-save"' }) });
  const $ = s => root.querySelector(s);
  $('#de-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { img = await imageToDataURL(f, 1600, 0.72); $('#de-prev').className = 'cd-doc-img'; $('#de-prev').innerHTML = `<img src="${img}" alt="">`; $('#de-rm').hidden = false; }
    catch (err) { toast(t('car.imageError'), { tone: 'danger' }); }
  });
  $('#de-rm').addEventListener('click', () => { img = ''; $('#de-prev').className = 'cd-doc-img is-empty'; $('#de-prev').innerHTML = icon('receipt'); $('#de-rm').hidden = true; });
  $('#de-save').addEventListener('click', () => {
    const nd = { ...(old || {}), id: old ? old.id : ctx.uid(), v: old ? old.v : ctx.S.cur, type: $('#de-type').value, title: $('#de-title').value.trim(), number: $('#de-num').value.trim(), expiry: $('#de-exp').value, added: old ? old.added : today() };
    if (img) nd.img = img; else delete nd.img;
    const before = JSON.stringify(ctx.S.docs || []);
    ctx.S.docs = old ? ctx.S.docs.map(d => (d.id === nd.id ? nd : d)) : [...(ctx.S.docs || []), nd];
    if (!ctx.save(['g'])) { ctx.S.docs = JSON.parse(before); toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
    closeSheet(); ctx.render(); toast(t('car.docSaved'), { tone: 'success' });
  });
  const del = $('#de-del');
  if (del) del.addEventListener('click', async () => {
    closeSheet(true);
    if (await confirmDialog({ title: t('car.deleteDocQ'), text: t('car.deleteDocText'), confirmText: t('action.delete') })) {
      const keep = old; ctx.S.docs = ctx.S.docs.filter(x => x.id !== old.id); ctx.save(['g']); ctx.render();
      toast(t('car.docDeleted'), { action: t('action.undo'), onAction: () => { ctx.S.docs.push(keep); ctx.save(['g']); ctx.render(); } });
    }
  });
}
const docName = type => (type === 'registration' ? t('home.ownership') : type === 'insurance' ? t('home.insurance') : t('car.doc.' + type));
// viewer: the document large, its expiry; the pencil edits or replaces it (delete lives in the editor)
function openDocViewer(ctx, id) {
  const d = (ctx.S.docs || []).find(x => x.id === id); if (!d) return;
  const s = docStatus(d), img = safeImg(d.img);
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  const root = openSheet({ title: d.title || docName(d.type),
    actions: iconButton('pencil', t('car.editReplace'), { attrs: 'id="dv-edit"' }),
    body: `${img ? `<img class="cd-doc-full" src="${img}" alt="${esc(d.title || docName(d.type))}">` : `<div class="cd-doc-img is-empty">${icon('receipt')}</div>`}
      <dl class="cd-facts cd-facts--list">${['registration', 'insurance'].includes(d.type) ? '' : row(t('car.docType'), esc(t('car.doc.' + d.type)))}${row(t('car.docNumber'), d.number ? `<span class="mc-num">${esc(d.number)}</span>` : '')}${row(t('car.expiry'), d.expiry ? `${longDate(d.expiry)} ${s ? badge(s[1], s[0]) : ''}` : '')}</dl>` });
  root.querySelector('#dv-edit').addEventListener('click', () => { closeSheet(true); openDocEditor(ctx, id); });
}
// a folder of documents (insurance, or older types): each opens the viewer; insurance can always take more
function openDocList(ctx, kind) {
  const V = ctx.veh(ctx.S.cur), ds = docs(ctx, V.id), own = ds.find(d => d.type === 'registration');
  const list = kind === 'insurance' ? ds.filter(d => d.type === 'insurance') : ds.filter(d => d.type !== 'insurance' && d !== own);
  const body = `<div class="mc-list">${list.map(d => { const s = docStatus(d);
    return listItem({ title: esc(d.title || docName(d.type)), sub: d.expiry ? `${fill2(t('home.expiresOn'), { d: longDate(d.expiry) })}${s ? ' ' + badge(s[1], s[0]) : ''}` : t('car.noExpiry'),
      lead: 'receipt', tone: kind === 'insurance' ? 'warning' : 'neutral', chevron: true, attrs: `data-car="doc-open" data-id="${esc(d.id)}"` }); }).join('')}</div>`;
  openSheet({ title: kind === 'insurance' ? t('home.insurance') : t('home.otherDocs'), body,
    footer: kind === 'insurance' ? button(t('car.addDoc'), { variant: 'primary', icon: 'plus', block: true, attrs: 'data-car="doc-add" data-type="insurance"' }) : '' });
}

/* ---------- behaviour (registered once) ---------- */
let bound = false;
export function initCar(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-car]'); if (!b) return;
    const a = b.dataset.car, inSheet = !!b.closest('.mc-scrim');
    const go = fn => { if (inSheet) { closeSheet(true); } fn(); };
    if (a === 'doc-add') go(() => openDocEditor(ctx, null, b.dataset.type || null));
    else if (a === 'doc-open') go(() => openDocViewer(ctx, b.dataset.id));
    else if (a === 'doc-list') openDocList(ctx, b.dataset.type);
  });
}
