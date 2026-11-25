// سيارتي · My Car — Vehicle details (route #car) + vehicle editor + documents
// Reads/writes the existing data through ctx. New optional fields (all backward compatible):
//   vehicle: model, year, photo (JPEG data URL)      S.docs: [{id, v, type, title, number, expiry, img, added}]
import { t, getLang, esc, icon, iconTile, button, iconButton, field, badge, listItem, stat, num, fmt, parseNum, openSheet, closeSheet, confirmDialog, toast } from '../ui.js';

const fill = (s, n) => String(s).replace('{n}', n);
const DOC_TYPES = ['insurance', 'registration', 'inspection', 'license', 'other'];
const DOC_ICON = { insurance: 'circle-check', registration: 'receipt', inspection: 'gauge', license: 'wallet', other: 'inbox' };
const FUELS = ['M91', 'M95', 'ديزل'];
let tab = 'service';

/* ---------- helpers ---------- */
const safeImg = p => (typeof p === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(p) ? p : '');
function money(ctx, x) {
  let cur = ctx.S.set.cur || 'ر.ع';
  if (getLang() === 'en' && cur === 'ر.ع') cur = 'OMR';
  return `${num(x, ctx.S.set.dec)} <span class="mc-stat__unit">${esc(cur)}</span>`;
}
function shortDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${+dd} ${t('month')[+m - 1]}${+y !== new Date().getFullYear() ? ' ' + y : ''}`;
}
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const daysTo = d => Math.round((new Date(d) - new Date(today())) / 864e5);
const docs = (ctx, v) => (ctx.S.docs || []).filter(d => d.v === v).sort((a, b) => (a.expiry || '9999').localeCompare(b.expiry || '9999'));
function docStatus(d) {
  if (!d.expiry) return null;
  const n = daysTo(d.expiry);
  return n < 0 ? ['danger', t('car.expired')] : n <= 30 ? ['warning', fill(t('car.expiresIn'), n)] : ['success', t('car.valid')];
}
const fuelLabel = f => (getLang() === 'en' && f === 'ديزل' ? 'Diesel' : f);

/** Downscale an image file to a JPEG data URL (keeps storage small). */
export async function imageToDataURL(file, max, quality) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', quality);
  } finally { URL.revokeObjectURL(url); }
}

/* ---------- page ---------- */
export function renderCar(ctx) {
  const { S } = ctx, V = ctx.veh(S.cur);
  if (!V) { location.hash = 'home'; return ''; }
  const v = V.id, st = ctx.stats(v), odo = ctx.curOdo(v), photo = safeImg(V.photo);
  const cons = st.allCons, L = cons.reduce((a, c) => a + c.l, 0), avg = L ? cons.reduce((a, c) => a + c.dist, 0) / L : 0;
  const by = st.by, total = st.spend || 0, pct = x => (total ? (x / total) * 100 : 0);
  const sub = [V.model, V.year].filter(Boolean).map(esc).join(' · ');
  const L1 = getLang();

  const hero = `<section class="mc-card mc-card--flush cd-hero">
    <div class="cd-photo${photo ? '' : ' is-empty'}">${photo ? `<img src="${photo}" alt="${esc(V.name)}">` : `${icon('car')}<span class="mc-small">${t('car.noPhoto')}</span>`}
      <label class="mc-btn mc-btn--sm cd-photo__btn">${icon('upload')}<span>${t(photo ? 'car.changePhoto' : 'car.addPhoto')}</span><input type="file" accept="image/*" data-car="photo" hidden></label></div>
    <div class="cd-id">
      <h1 class="mc-h2">${esc(V.name)}</h1>
      <div class="cd-id__meta">${sub ? `<span class="mc-muted">${sub}</span>` : ''}${V.fuel ? badge(fuelLabel(V.fuel), 'neutral') : ''}</div>
    </div>
    <dl class="cd-facts">
      <div><dt>${t('car.plate')}</dt><dd>${V.plate ? `<span class="mc-num">${esc(V.plate)}</span>` : '—'}</dd></div>
      <div><dt>${t('home.odometer')}</dt><dd>${num(odo)} <span class="mc-stat__unit">${t('unit.km')}</span></dd></div>
    </dl>
  </section>`;

  const summary = `<section class="mc-card cd-sum" aria-labelledby="cd-sum-t">
    <div class="mc-card__head"><h2 class="mc-title" id="cd-sum-t">${t('car.expenses')}</h2><span class="mc-caption mc-muted">${t('car.allTime')}</span></div>
    <div class="cd-sum__total">${money(ctx, total)}</div>
    <div class="cd-bar" role="img" aria-label="${esc(t('car.expenses'))}">${['fuel', 'service', 'expense'].map(k => `<span class="mc-tone-${k}" style="width:${pct(by[k]).toFixed(2)}%"></span>`).join('')}</div>
    <ul class="cd-legend">${['fuel', 'service', 'expense'].map(k => `<li class="mc-tone-${k}"><i></i><span>${t('types.' + k)}</span><b>${money(ctx, by[k])}</b></li>`).join('')}</ul>
  </section>
  <div class="mc-grid-2">
    ${avg ? stat(t('home.avg'), ctx.S.set.unit === 'l100' ? `${num(100 / avg, 1)} <span class="mc-stat__unit">${L1 === 'ar' ? 'ل/100كم' : 'L/100km'}</span>` : `${num(avg, 1)} <span class="mc-stat__unit">${t('unit.kmpl')}</span>`, fill(t('home.fromFills'), cons.length), 'neutral') : stat(t('home.avg'), '—', t('home.needFills'), 'neutral')}
    ${stat(t('car.costKm'), st.cpk ? money(ctx, st.cpk) : '—', st.span ? `${fmt(st.span)} ${t('unit.km')}` : '', 'neutral')}
  </div>`;

  const TABS = [['service', t('car.tabService')], ['fuel', t('car.tabFuel')], ['reminders', t('car.tabReminders')], ['docs', t('car.tabDocs')]];
  const panel = tabPanel(ctx, V, st);
  const tabs = `<section class="cd-tabs-wrap">
    <div class="mc-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="mc-tab" role="tab" id="cd-tab-${k}" aria-controls="cd-panel" aria-selected="${tab === k}" tabindex="${tab === k ? 0 : -1}" data-car-tab="${k}">${l}</button>`).join('')}</div>
    <div id="cd-panel" role="tabpanel" aria-labelledby="cd-tab-${tab}" class="cd-panel">${panel}</div>
  </section>`;

  return `<div class="cd">
    <header class="mc-appbar cd-appbar">
      <a class="mc-iconbtn" href="#home" aria-label="${t('action.back')}">${icon('arrow-left')}</a>
      <div class="mc-appbar__title">${t('car.title')}</div>
      <div class="mc-appbar__actions">${button(t('action.edit'), { variant: 'tonal', size: 'sm', icon: 'pencil', attrs: 'data-car="edit"' })}</div>
    </header>
    <div class="mc-container cd-grid">
      <div class="cd-col">${hero}${summary}</div>
      <div class="cd-col">${tabs}</div>
    </div></div>`;
}

function tabPanel(ctx, V, st) {
  const v = V.id, it = st.it;
  const more = type => `<a class="mc-btn mc-btn--ghost mc-btn--sm cd-more" href="#log" data-car-log="${type}">${t('car.viewInLog')}${icon('chevron-right')}</a>`;
  const empty = (ic, title, action) => `<div class="mc-state cd-empty">${iconTile(ic, 'neutral', 'lg')}<h3 class="mc-state__title">${title}</h3>${action}</div>`;
  if (tab === 'service') {
    const xs = it.filter(x => x.t === 'service');
    if (!xs.length) return empty('wrench', t('car.noService'), button(t('car.addService'), { variant: 'primary', icon: 'plus', attrs: 'data-act="add" data-t="service"' }));
    return `<div class="mc-list">${xs.slice(0, 20).map(x => listItem({ title: esc(x.cat || t('types.service')), sub: [shortDate(x.d), x.odo ? `${num(x.odo)} ${t('unit.km')}` : '', esc(x.place || '')].filter(Boolean).join(' · '), lead: 'wrench', tone: 'service', trail: money(ctx, x.cost), attrs: `data-act="edit" data-id="${esc(x.id)}"` })).join('')}</div>
      <div class="cd-panel__foot">${button(t('car.addService'), { variant: 'tonal', size: 'sm', icon: 'plus', attrs: 'data-act="add" data-t="service"' })}${xs.length > 20 ? more('service') : ''}</div>`;
  }
  if (tab === 'fuel') {
    const xs = it.filter(x => x.t === 'fuel');
    if (!xs.length) return empty('fuel', t('car.noFuel'), button(t('car.addFuel'), { variant: 'primary', icon: 'plus', attrs: 'data-act="add" data-t="fuel"' }));
    return `<div class="mc-list">${xs.slice(0, 20).map(x => listItem({ title: `${x.fuel ? esc(fuelLabel(x.fuel)) + ' · ' : ''}${num(x.liters, 2)} ${t('home.liter')}`, sub: [shortDate(x.d), x.odo ? `${num(x.odo)} ${t('unit.km')}` : '', x.ppl ? `${num(x.ppl, 3)}/${t('home.liter')}` : '', x.full ? '' : t('car.partial')].filter(Boolean).join(' · '), lead: 'fuel', tone: 'fuel', trail: money(ctx, x.cost), attrs: `data-act="edit" data-id="${esc(x.id)}"` })).join('')}</div>
      <div class="cd-panel__foot">${button(t('car.addFuel'), { variant: 'tonal', size: 'sm', icon: 'plus', attrs: 'data-act="add" data-t="fuel"' })}${xs.length > 20 ? more('fuel') : ''}</div>`;
  }
  if (tab === 'reminders') {
    const rs = ctx.S.reminders.filter(r => r.v === v).map(r => ({ r, s: ctx.rstat(r, st) })).sort((a, b) => b.s.pct - a.s.pct);
    if (!rs.length) return empty('bell', t('home.noReminders'), button(t('car.addReminder'), { variant: 'primary', icon: 'plus', attrs: 'data-act="addrem"' }));
    return `<div class="mc-list">${rs.map(({ r, s }) => {
      const stt = s.due ? ['danger', t('home.due')] : s.soon ? ['warning', t('home.soon')] : ['neutral', t('home.ok')];
      const parts = [];
      if (s.km != null) parts.push(s.km <= 0 ? fill(t('home.overKm'), fmt(-s.km)) : fill(t('home.inKm'), fmt(s.km)));
      else if (s.days != null) parts.push(s.days <= 0 ? fill(t('home.overDays'), fmt(-s.days)) : fill(t('home.inDays'), fmt(s.days)));
      if (s.dueDate) parts.push(shortDate(s.dueDate));
      return listItem({ title: esc(r.name), sub: parts.join(' · '), lead: 'bell', tone: stt[0] === 'neutral' ? 'service' : stt[0], trail: badge(stt[1], stt[0]), attrs: `data-act="editrem" data-id="${esc(r.id)}"`, compact: true });
    }).join('')}</div>
      <div class="cd-panel__foot">${button(t('car.addReminder'), { variant: 'tonal', size: 'sm', icon: 'plus', attrs: 'data-act="addrem"' })}<a class="mc-btn mc-btn--ghost mc-btn--sm cd-more" href="#remind">${t('home.seeAll')}${icon('chevron-right')}</a></div>`;
  }
  const ds = docs(ctx, v);
  if (!ds.length) return empty('receipt', t('car.noDocs'), `<p class="mc-state__text">${t('car.noDocsText')}</p>${button(t('car.addDoc'), { variant: 'primary', icon: 'plus', attrs: 'data-car="doc-add"' })}`);
  return `<div class="mc-list">${ds.map(d => {
    const s = docStatus(d);
    return listItem({ title: esc(d.title || t('car.doc.' + d.type)), sub: [d.number ? `<span class="mc-num">${esc(d.number)}</span>` : '', d.expiry ? `${t('car.expiry')} ${shortDate(d.expiry)}` : '', d.img ? t('car.hasImage') : ''].filter(Boolean).join(' · '), lead: DOC_ICON[d.type] || 'inbox', tone: 'info', trail: s ? badge(s[1], s[0]) : '', attrs: `data-car="doc-open" data-id="${esc(d.id)}"` });
  }).join('')}</div>
    <div class="cd-panel__foot">${button(t('car.addDoc'), { variant: 'tonal', size: 'sm', icon: 'plus', attrs: 'data-car="doc-add"' })}</div>`;
}

/* ---------- vehicle editor (add + edit) ---------- */
export function openVehicleEditor(ctx, id = null) {
  const old = id ? ctx.veh(id) : null, V = old || { fuel: 'M91' };
  let photo = safeImg(V.photo);
  const yearNow = new Date().getFullYear();
  const body = `<form class="mc-stack" id="ve-form" novalidate>
    <div class="cd-edit-photo">
      <div class="cd-edit-photo__img${photo ? '' : ' is-empty'}" id="ve-photo">${photo ? `<img src="${photo}" alt="">` : icon('car')}</div>
      <div class="mc-row"><label class="mc-btn mc-btn--tonal mc-btn--sm">${icon('upload')}<span>${t('car.choosePhoto')}</span><input type="file" accept="image/*" id="ve-file" hidden></label>
        ${button(t('car.removePhoto'), { variant: 'ghost', size: 'sm', attrs: `id="ve-rm" ${photo ? '' : 'hidden'}` })}</div>
    </div>
    ${field({ id: 've-name', label: t('car.name'), value: V.name || '', placeholder: t('car.namePh') })}
    <div class="mc-grid-2">${field({ id: 've-model', label: t('car.model'), optional: t('car.optional'), value: V.model || '', placeholder: t('car.modelPh') })}${field({ id: 've-year', label: t('car.year'), optional: t('car.optional'), value: V.year || '', inputmode: 'numeric', placeholder: String(yearNow) })}</div>
    <div class="mc-grid-2">${field({ id: 've-plate', label: t('car.plate'), optional: t('car.optional'), value: V.plate || '' })}${field({ id: 've-fuel', label: t('car.fuel'), options: FUELS.map(f => [f, fuelLabel(f)]), value: V.fuel || 'M91' })}</div>
    <div class="mc-grid-2">${field({ id: 've-tank', label: t('car.tank'), optional: t('car.optional'), value: V.tank || '', inputmode: 'decimal', unit: t('home.liter') })}${field({ id: 've-odo', label: t('car.odo0'), optional: t('car.optional'), value: V.odo0 || '', inputmode: 'numeric', unit: t('unit.km') })}</div>
    <div id="ve-err"></div>
    ${old ? `<div class="mc-divider"></div>${button(t('car.deleteCar'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="ve-del"' })}` : ''}
  </form>`;
  const root = openSheet({ title: t(old ? 'car.editTitle' : 'home.addCar'), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="ve-save"' }) });
  const $ = s => root.querySelector(s);
  $('#ve-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { photo = await imageToDataURL(f, 900, 0.82); $('#ve-photo').className = 'cd-edit-photo__img'; $('#ve-photo').innerHTML = `<img src="${photo}" alt="">`; $('#ve-rm').hidden = false; }
    catch (err) { toast(t('car.imageError'), { tone: 'danger' }); }
  });
  $('#ve-rm').addEventListener('click', () => { photo = ''; $('#ve-photo').className = 'cd-edit-photo__img is-empty'; $('#ve-photo').innerHTML = icon('car'); $('#ve-rm').hidden = true; });
  $('#ve-save').addEventListener('click', () => {
    const val = s => $(s).value.trim();
    const name = val('#ve-name'), year = val('#ve-year') ? parseNum(val('#ve-year')) : '';
    const errs = [];
    if (!name) errs.push(['ve-name', t('car.errName')]);
    if (year !== '' && !(year >= 1950 && year <= yearNow + 1)) errs.push(['ve-year', fill(t('car.errYear'), yearNow + 1)]);
    root.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    if (errs.length) {
      errs.forEach(([id]) => $('#' + id).setAttribute('aria-invalid', 'true'));
      $('#ve-err').innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div>${errs.map(e => esc(e[1])).join('<br>')}</div></div>`;
      $('#' + errs[0][0]).focus(); return;
    }
    const nv = { ...(old || {}), id: old ? old.id : ctx.uid(), name, model: val('#ve-model'), year: year === '' ? '' : Math.round(year), plate: val('#ve-plate'),
      fuel: $('#ve-fuel').value, tank: parseNum(val('#ve-tank')) || 0, odo0: parseNum(val('#ve-odo')) || 0, photo };
    if (!photo) delete nv.photo;
    const before = JSON.stringify(ctx.S.vehicles), beforeCur = ctx.S.cur;
    if (old) ctx.S.vehicles = ctx.S.vehicles.map(z => (z.id === nv.id ? nv : z));
    else { ctx.S.vehicles.push(nv); ctx.S.cur = nv.id; }
    if (!ctx.save(['g'])) { ctx.S.vehicles = JSON.parse(before); ctx.S.cur = beforeCur; toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
    closeSheet(); ctx.render(); toast(t(old ? 'car.saved' : 'car.added'), { tone: 'success' });
  });
  const del = $('#ve-del');
  if (del) del.addEventListener('click', async () => {
    closeSheet();
    if (await confirmDialog({ title: fill(t('car.deleteQ'), old.name), text: t('car.deleteText'), confirmText: t('action.delete') })) { ctx.deleteVehicle(old.id); location.hash = 'home'; toast(t('car.deleted')); }
  });
}

/* ---------- documents ---------- */
function openDocEditor(ctx, id = null) {
  const old = id ? (ctx.S.docs || []).find(d => d.id === id) : null, D = old || { type: 'insurance' };
  let img = safeImg(D.img);
  const body = `<form class="mc-stack" id="de-form" novalidate>
    ${field({ id: 'de-type', label: t('car.docType'), options: DOC_TYPES.map(k => [k, t('car.doc.' + k)]), value: D.type })}
    ${field({ id: 'de-title', label: t('car.docTitle'), optional: t('car.optional'), value: D.title || '', placeholder: t('car.docTitlePh') })}
    <div class="mc-grid-2">${field({ id: 'de-num', label: t('car.docNumber'), optional: t('car.optional'), value: D.number || '' })}${field({ id: 'de-exp', label: t('car.expiry'), optional: t('car.optional'), type: 'date', value: D.expiry || '' })}</div>
    <div class="mc-field"><span class="mc-field__label">${t('car.docImage')} <small>(${t('car.optional')})</small></span>
      <div class="cd-doc-img${img ? '' : ' is-empty'}" id="de-prev">${img ? `<img src="${img}" alt="">` : icon('receipt')}</div>
      <div class="mc-row"><label class="mc-btn mc-btn--tonal mc-btn--sm">${icon('upload')}<span>${t('car.choosePhoto')}</span><input type="file" accept="image/*" id="de-file" hidden></label>
        ${button(t('car.removePhoto'), { variant: 'ghost', size: 'sm', attrs: `id="de-rm" ${img ? '' : 'hidden'}` })}</div></div>
  </form>`;
  const root = openSheet({ title: t(old ? 'car.editDoc' : 'car.addDoc'), body,
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
    closeSheet(); tab = 'docs'; ctx.render(); toast(t('car.docSaved'), { tone: 'success' });
  });
}
function openDocViewer(ctx, id) {
  const d = (ctx.S.docs || []).find(x => x.id === id); if (!d) return;
  const s = docStatus(d), img = safeImg(d.img);
  const row = (k, v) => (v ? `<div><dt>${k}</dt><dd>${v}</dd></div>` : '');
  const root = openSheet({ title: d.title || t('car.doc.' + d.type),
    body: `${img ? `<img class="cd-doc-full" src="${img}" alt="${esc(d.title || t('car.doc.' + d.type))}">` : ''}
      <dl class="cd-facts cd-facts--list">${row(t('car.docType'), esc(t('car.doc.' + d.type)))}${row(t('car.docNumber'), d.number ? `<span class="mc-num">${esc(d.number)}</span>` : '')}${row(t('car.expiry'), d.expiry ? `${shortDate(d.expiry)} ${s ? badge(s[1], s[0]) : ''}` : '')}</dl>`,
    footer: button(t('action.delete'), { variant: 'danger', icon: 'trash-2', attrs: 'id="dv-del"' }) + button(t('action.edit'), { variant: 'primary', icon: 'pencil', attrs: 'id="dv-edit"' }) });
  root.querySelector('#dv-edit').addEventListener('click', () => { closeSheet(true); openDocEditor(ctx, id); });
  root.querySelector('#dv-del').addEventListener('click', async () => {
    closeSheet();
    if (await confirmDialog({ title: t('car.deleteDocQ'), text: t('car.deleteDocText'), confirmText: t('action.delete') })) {
      const keep = d; ctx.S.docs = ctx.S.docs.filter(x => x.id !== id); ctx.save(['g']); ctx.render();
      toast(t('car.docDeleted'), { action: t('action.undo'), onAction: () => { ctx.S.docs.push(keep); ctx.save(['g']); ctx.render(); } });
    }
  });
}

/* ---------- behaviour (registered once) ---------- */
let bound = false;
export function initCar(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', e => {
    const tb = e.target.closest('[data-car-tab]');
    if (tb) { tab = tb.dataset.carTab; ctx.render(); document.getElementById('cd-tab-' + tab)?.focus(); return; }
    const lg = e.target.closest('[data-car-log]');
    if (lg) { ctx.setLogFilter(lg.dataset.carLog); return; }
    const b = e.target.closest('[data-car]'); if (!b) return;
    const a = b.dataset.car;
    if (a === 'edit') openVehicleEditor(ctx, ctx.S.cur);
    else if (a === 'doc-add') openDocEditor(ctx);
    else if (a === 'doc-open') openDocViewer(ctx, b.dataset.id);
  });
  document.addEventListener('keydown', e => {
    const tb = e.target.closest && e.target.closest('[data-car-tab]'); if (!tb || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
    const all = [...document.querySelectorAll('[data-car-tab]')], i = all.indexOf(tb), rtl = document.documentElement.dir === 'rtl';
    const step = (e.key === 'ArrowRight') !== rtl ? 1 : -1;
    const n = e.key === 'Home' ? 0 : e.key === 'End' ? all.length - 1 : (i + step + all.length) % all.length;
    e.preventDefault(); all[n].click();
  });
  document.addEventListener('change', async e => {
    if (e.target.dataset && e.target.dataset.car === 'photo' && e.target.files[0]) {
      const V = ctx.veh(ctx.S.cur), prev = V.photo;
      try { V.photo = await imageToDataURL(e.target.files[0], 900, 0.82); } catch (err) { toast(t('car.imageError'), { tone: 'danger' }); return; }
      if (!ctx.save(['g'])) { if (prev) V.photo = prev; else delete V.photo; toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
      ctx.render(); toast(t('car.photoSaved'), { tone: 'success' });
    }
  });
}
