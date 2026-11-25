// سيارتي · My Car — Vehicle details (route #car) + vehicle editor + documents
// Reads/writes the existing data through ctx. New optional fields (all backward compatible):
//   vehicle: model, year, photo (JPEG data URL)      S.docs: [{id, v, type, title, number, expiry, img, added}]
import { t, getLang, esc, icon, iconTile, button, iconButton, field, badge, listItem, stat, num, fmt, parseNum, openSheet, closeSheet, confirmDialog, toast } from '../ui.js';
import { MAKES, makeLabel, modelsOf, bodyOf, inCatalog, vehTitle, vehSub, legacyName, vehImage, carArt, mountCatalog } from '../vehicle.js';

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
  const v = V.id, st = ctx.stats(v), odo = ctx.curOdo(v), img = vehImage(V), isArt = !safeImg(V.photo) && !!img;
  const cons = st.allCons, L = cons.reduce((a, c) => a + c.l, 0), avg = L ? cons.reduce((a, c) => a + c.dist, 0) / L : 0;
  const by = st.by, total = st.spend || 0, pct = x => (total ? (x / total) * 100 : 0);
  const sub = esc(vehSub(V)), title = esc(vehTitle(V));
  const L1 = getLang();

  const hero = `<section class="mc-card mc-card--flush cd-hero">
    <div class="cd-photo${img ? (isArt ? ' is-art' : '') : ' is-empty'}" role="img" aria-label="${title}">${img || `${icon('car')}<span class="mc-small">${t('car.noPhoto')}</span>`}
      <div class="cd-photo__actions">${button(t(img ? 'car.changePhoto' : 'car.addPhoto'), { size: 'sm', icon: 'car', attrs: 'data-car="catalog"' })}</div></div>
    <div class="cd-id">
      <h1 class="mc-h2">${title}</h1>
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
  const preview = () => { if (photo) return `<img src="${photo}" alt="">`; const [mk, md] = formModel(); return photoCat && inCatalog(mk, md) ? carArt(bodyOf(mk, md), photoCat.color) : icon('car'); };
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
    <div class="mc-grid-2">${field({ id: 've-plate', label: t('car.plate'), optional: t('car.optional'), value: V.plate || '' })}${field({ id: 've-fuel', label: t('car.fuel'), options: FUELS.map(f => [f, fuelLabel(f)]), value: V.fuel || 'M91' })}</div>
    <div class="mc-grid-2">${field({ id: 've-tank', label: t('car.tank'), optional: t('car.optional'), value: V.tank || '', inputmode: 'decimal', unit: t('home.liter') })}${field({ id: 've-odo', label: t('car.odo0'), optional: t('car.optional'), value: V.odo0 || '', inputmode: 'numeric', unit: t('unit.km') })}</div>
    <div id="ve-err"></div>
    ${old ? `<div class="mc-divider"></div>${button(t('car.deleteCar'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="ve-del"' })}` : ''}
  </form></div>
  <div id="ve-catview" class="mc-stack" hidden><button type="button" class="mc-btn mc-btn--ghost mc-btn--sm" id="ve-catback" style="justify-self:start">${icon('arrow-left')}<span>${t('action.back')}</span></button><div id="ve-ct" class="mc-stack"></div><p class="mc-caption mc-muted" style="margin:0">${t('catalog.note')}</p></div>`;
  root = openSheet({ title: t(old ? 'car.editTitle' : 'home.addCar'), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="ve-save"' }) });
  const $ = s => root.querySelector(s);
  const showPhoto = () => { const html = preview(), has = !!photo || (photoCat && inCatalog(...formModel())); $('#ve-photo').className = 'cd-edit-photo__img' + (has ? '' : ' is-empty'); $('#ve-photo').innerHTML = html; $('#ve-rm').hidden = !(photo || photoCat); };
  $('#ve-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    try { photo = await imageToDataURL(f, 900, 0.82); photoCat = null; showPhoto(); }
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
    const nick = val('#ve-nick'), year = val('#ve-year') ? parseNum(val('#ve-year')) : '';
    const errs = [];
    if (!(make && model) && !nick) errs.push([make ? (mkSel === '__other' || mdSel === '__other' ? 've-model-t' : 've-model') : 've-make', t('car.errName')]);
    if (year !== '' && !(year >= 1950 && year <= yearNow + 1)) errs.push(['ve-year', fill(t('car.errYear'), yearNow + 1)]);
    root.querySelectorAll('[aria-invalid]').forEach(x => x.removeAttribute('aria-invalid'));
    if (errs.length) {
      errs.forEach(([id]) => $('#' + id).setAttribute('aria-invalid', 'true'));
      $('#ve-err').innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div>${errs.map(e => esc(e[1])).join('<br>')}</div></div>`;
      $('#' + errs[0][0]).focus(); return;
    }
    const nv = { ...(old || {}), id: old ? old.id : ctx.uid(), make, model, nick, year: year === '' ? '' : Math.round(year), plate: val('#ve-plate'),
      fuel: $('#ve-fuel').value, tank: parseNum(val('#ve-tank')) || 0, odo0: parseNum(val('#ve-odo')) || 0, photo, photoCat };
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
function openCatalogSheet(ctx) {
  const V = ctx.veh(ctx.S.cur);
  const root = openSheet({ title: t('catalog.title'), body: `<div id="ct-root" class="mc-stack"></div><p class="mc-caption mc-muted" style="margin:0">${t('catalog.note')}</p>`,
    footer: `<label class="mc-btn mc-btn--outline">${icon('upload')}<span>${t('catalog.fromDevice')}</span><input type="file" accept="image/*" data-car="photo" hidden></label>` });
  const ok = mountCatalog(root.querySelector('#ct-root'), { make: V.make, model: V.model, color: V.photoCat ? V.photoCat.color : 'silver' }, pick => {
    const prev = { photo: V.photo, photoCat: V.photoCat };
    V.photoCat = pick; delete V.photo;
    if (!ctx.save(['g'])) { Object.assign(V, prev); if (!prev.photo) delete V.photo; toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
    closeSheet(); ctx.render(); toast(t('car.photoSaved'), { tone: 'success' });
  });
  if (!ok) {
    const b = document.createElement('div'); b.innerHTML = button(t('catalog.setModel'), { variant: 'primary', block: true, icon: 'pencil', attrs: 'data-ct-setmodel' });
    root.querySelector('#ct-root').appendChild(b.firstElementChild);
    root.querySelector('[data-ct-setmodel]').addEventListener('click', () => { closeSheet(true); openVehicleEditor(ctx, V.id); });
  }
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
    else if (a === 'catalog') openCatalogSheet(ctx);
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
      const V = ctx.veh(ctx.S.cur), prev = { photo: V.photo, photoCat: V.photoCat };
      try { V.photo = await imageToDataURL(e.target.files[0], 900, 0.82); delete V.photoCat; } catch (err) { toast(t('car.imageError'), { tone: 'danger' }); return; }
      if (!ctx.save(['g'])) { if (prev.photo) V.photo = prev.photo; else delete V.photo; if (prev.photoCat) V.photoCat = prev.photoCat; toast(t('car.storageFull'), { tone: 'danger', duration: 6000 }); return; }
      closeSheet(); ctx.render(); toast(t('car.photoSaved'), { tone: 'success' });
    }
  });
}
