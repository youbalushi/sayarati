// سيارتي · My Car — record forms: fuel, service, expense, income (+ the "what to log" picker)
// Same data and rules as the previous form (no schema change):
//   {id, v, t, d, odo, cost, place, note}  + fuel: {liters, ppl, full, fuel}  + others: {cat}
import { t, getLang, esc, icon, iconTile, button, field, switchControl, num, fmt, parseNum, openSheet, closeSheet, toast } from '../ui.js';

const FUELS = ['M91', 'M95', 'ديزل'];
const TYPE_ICON = { fuel: 'fuel', service: 'wrench', expense: 'receipt', income: 'wallet' };
const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k]);
const fuelLabel = f => (getLang() === 'en' && f === 'ديزل' ? 'Diesel' : f);

/* ---------- picker ---------- */
export function openTypePicker(ctx) {
  if (!ctx.S.vehicles.length) { ctx.addVehicle(); return; }
  const tile = k => `<button type="button" class="en-type mc-tone-${k}" data-entry-type="${k}">${iconTile(TYPE_ICON[k], k, 'lg')}<span class="en-type__name">${t('types.' + k)}</span><span class="en-type__desc">${t('entry.desc.' + k)}</span></button>`;
  const root = openSheet({ title: t('entry.pickTitle'),
    body: `<div class="en-types">${['fuel', 'service', 'expense', 'income'].map(tile).join('')}</div>
      ${button(t('entry.newReminder'), { variant: 'outline', icon: 'bell', block: true, attrs: 'data-entry-rem' })}` });
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-entry-type]');
    if (b) { openEntryForm(ctx, b.dataset.entryType); return; }
    if (e.target.closest('[data-entry-rem]')) { closeSheet(); setTimeout(() => ctx.addReminder(), 220); }
  });
}

/* ---------- form ---------- */
/** openEntryForm(ctx, type, existing?, preset?{cat, odo}) */
export function openEntryForm(ctx, type, existing = null, preset = {}) {
  const { S } = ctx;
  if (!S.vehicles.length) { ctx.addVehicle(); return; }
  const old = existing || null;
  const x = old ? { ...old } : { t: type, d: ctx.today(), v: S.cur, full: true, fuel: ctx.veh(S.cur)?.fuel || 'M91', ...preset };
  const T = x.t, isFuel = T === 'fuel', dec = S.set.dec;
  const odoNow = ctx.curOdo(x.v), lastFuel = ctx.stats(x.v).lastFuel;
  const cur = getLang() === 'en' && (S.set.cur || 'ر.ع') === 'ر.ع' ? 'OMR' : (S.set.cur || 'ر.ع');
  const catList = ctx.cats(T);
  const catOpts = (x.cat && !catList.includes(x.cat) ? [x.cat, ...catList] : catList).map(c => [c, c]);
  const places = [...new Set(ctx.all().map(y => y.place).filter(Boolean))];
  const v = (val, d = '') => (val === undefined || val === null || val === '' ? d : val);

  const dateOdo = `<div class="mc-grid-2">
      ${field({ id: 'en-d', label: t('entry.date'), type: 'date', value: x.d })}
      ${field({ id: 'en-odo', label: t('entry.odo'), optional: isFuel ? '' : t('car.optional'), inputmode: 'numeric', value: v(x.odo === 0 ? '' : x.odo), placeholder: odoNow ? fmt(odoNow) : '', unit: t('unit.km') })}
    </div>
    <div class="mc-field__hint en-odo-hint">${odoNow ? fill(t('entry.lastOdo'), { n: `<span class="mc-num">${fmt(odoNow)}</span>`, u: t('unit.km') }) : ''}</div>
    <div id="en-odo-msg"></div>`;
  const fuelBody = `<div class="mc-grid-2">
      ${field({ id: 'en-liters', label: t('entry.liters'), inputmode: 'decimal', value: v(x.liters), placeholder: '0.00', unit: t('home.liter') })}
      ${field({ id: 'en-ppl', label: t('entry.ppl'), inputmode: 'decimal', value: v(x.ppl, lastFuel?.ppl || ''), placeholder: '0.000', unit: cur })}
    </div>
    ${field({ id: 'en-cost', label: t('entry.total'), inputmode: 'decimal', value: v(x.cost), placeholder: t('entry.autoCalc'), unit: cur, hint: t('entry.totalHint') })}
    ${switchControl({ label: t('entry.fullTank'), desc: t('entry.fullTankDesc'), checked: !!x.full, name: 'en-full' })}`;
  const fuelMore = `<div class="mc-grid-2">
      ${field({ id: 'en-fuel', label: t('car.fuel'), options: FUELS.map(f => [f, fuelLabel(f)]), value: x.fuel || 'M91' })}
      ${field({ id: 'en-place', label: t('entry.station'), optional: t('car.optional'), value: x.place || '', lead: 'map-pin' })}
    </div>`;
  const otherBody = `${field({ id: 'en-cat', label: t(T === 'income' ? 'entry.incomeType' : 'entry.category'), options: catOpts, value: x.cat || catList[0] })}
    ${field({ id: 'en-cost', label: t('entry.amount'), inputmode: 'decimal', value: v(x.cost), placeholder: '0.000', unit: cur })}
    ${field({ id: 'en-place', label: t(T === 'service' ? 'entry.workshop' : 'entry.place'), optional: t('car.optional'), value: x.place || '', lead: 'map-pin' })}`;

  const body = `<form id="en-form" class="mc-stack en-form" novalidate data-type="${T}">
    <div class="en-group">${dateOdo}</div>
    <div class="en-group">${isFuel ? fuelBody : otherBody}</div>
    ${isFuel ? `<div class="en-group">${fuelMore}</div>` : ''}
    ${field({ id: 'en-note', label: t('entry.note'), optional: t('car.optional'), rows: 2, value: x.note || '' })}
    <datalist id="en-places">${places.map(p => `<option value="${esc(p)}">`).join('')}</datalist>
    <div id="en-err"></div>
    ${old ? `<div class="mc-divider"></div>${button(t('entry.delete'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="en-del"' })}` : ''}
  </form>`;
  const root = openSheet({ title: t(`entry.${old ? 'edit' : 'add'}.${T}`), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="en-save" form="en-form"', type: 'submit' }) });
  const $ = s => root.querySelector(s);
  $('#en-d').max = ctx.today();
  $('#en-place').setAttribute('list', 'en-places');
  $('#en-place').setAttribute('autocomplete', 'off');
  // the sheet title carries the type icon
  const title = root.querySelector('.mc-sheet__title');
  if (title) title.insertAdjacentHTML('afterbegin', `<span class="en-title-ic mc-tone-${T}">${icon(TYPE_ICON[T])}</span>`);

  /* fuel: liters × price = total, in either direction (same rule as before) */
  if (isFuel) {
    const L = $('#en-liters'), P = $('#en-ppl'), C = $('#en-cost'); let lastEd = '';
    const n = e => parseNum(e.value);
    L.addEventListener('input', () => { lastEd = 'l'; if (n(L) > 0 && n(P) > 0) C.value = (n(L) * n(P)).toFixed(dec); });
    P.addEventListener('input', () => { if (lastEd === 'c' && n(C) > 0 && n(P) > 0) L.value = (n(C) / n(P)).toFixed(2); else if (n(L) > 0 && n(P) > 0) C.value = (n(L) * n(P)).toFixed(dec); });
    C.addEventListener('input', () => { lastEd = 'c'; if (n(C) > 0 && n(P) > 0) L.value = (n(C) / n(P)).toFixed(2); });
  }

  /* a field's error clears as soon as the user edits it */
  $('#en-form').addEventListener('input', e => {
    const f = e.target.closest('.mc-field'); if (!f || !f.classList.contains('mc-field--error')) return;
    f.classList.remove('mc-field--error'); e.target.removeAttribute('aria-invalid');
    if (!root.querySelector('.mc-field--error')) $('#en-err').innerHTML = '';
  });

  /* odometer warnings (fuel only, non-blocking — as before) */
  const odoWarning = () => {
    if (!isFuel) return '';
    const odo = parseNum($('#en-odo').value), d = $('#en-d').value || ctx.today();
    if (!(odo > 0)) return '';
    const mine = ctx.items(x.v).filter(z => z.id !== x.id);
    const higher = mine.filter(z => z.t === 'fuel' && z.d < d && +z.odo > odo).sort((a, b) => b.odo - a.odo)[0];
    if (higher) return fill(t('entry.warnLower'), { odo: `<span class="mc-num">${fmt(odo)}</span>`, prev: `<span class="mc-num">${fmt(higher.odo)}</span>`, date: shortDate(higher.d), u: t('unit.km') });
    const lo = mine.filter(z => +z.odo && z.d <= d)[0];
    if (lo && odo - lo.odo > 3000) return fill(t('entry.warnJump'), { n: `<span class="mc-num">${fmt(odo - lo.odo)}</span>`, u: t('unit.km') });
    return '';
  };
  const showOdoWarning = () => {
    const w = odoWarning(), box = $('#en-odo-msg');
    box.innerHTML = w ? `<div class="mc-field__msg mc-tone-warning" role="status">${icon('triangle-alert', { size: 'sm' })}<div><strong>${t('entry.warnTitle')}</strong>${w}</div></div>` : '';
    $('#en-odo').closest('.mc-field').classList.toggle('mc-field--warning', !!w);
  };
  $('#en-odo').addEventListener('change', showOdoWarning); $('#en-odo').addEventListener('blur', showOdoWarning); $('#en-d').addEventListener('change', showOdoWarning);
  if (old) showOdoWarning();

  /* save */
  $('#en-form').addEventListener('submit', e => {
    e.preventDefault();
    const g = id => ($(id) ? $(id).value.trim() : '');
    const rec = { id: old ? old.id : ctx.uid(), v: x.v, t: T, d: g('#en-d') || ctx.today(), odo: parseNum(g('#en-odo')) || 0, cost: parseNum(g('#en-cost')) || 0, place: g('#en-place'), note: g('#en-note') };
    if (isFuel) {
      rec.liters = parseNum(g('#en-liters')) || 0; rec.ppl = parseNum(g('#en-ppl')) || 0; rec.full = root.querySelector('[name=en-full]').checked; rec.fuel = g('#en-fuel');
      if (!rec.cost && rec.liters && rec.ppl) rec.cost = +(rec.liters * rec.ppl).toFixed(dec);
      if (!rec.ppl && rec.cost && rec.liters) rec.ppl = +(rec.cost / rec.liters).toFixed(3);
    } else rec.cat = g('#en-cat');
    // blocking errors, shown on their fields
    const errs = [];
    if (isFuel && !(rec.liters > 0)) errs.push(['#en-liters', t('entry.errLiters')]);
    if (!(rec.cost > 0)) errs.push(['#en-cost', t(isFuel ? 'entry.errTotal' : 'entry.errAmount')]);
    if (isFuel && !(rec.odo > 0)) errs.push(['#en-odo', t('entry.errOdo')]);
    root.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    root.querySelectorAll('.mc-field--error').forEach(el => el.classList.remove('mc-field--error'));
    if (errs.length) {
      errs.forEach(([id]) => { $(id).setAttribute('aria-invalid', 'true'); $(id).closest('.mc-field').classList.add('mc-field--error'); });
      $('#en-err').innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div><strong class="mc-alert__title">${t('entry.errTitle')}</strong>${errs.map(e => esc(e[1])).join('<br>')}</div></div>`;
      $(errs[0][0]).focus(); return;
    }
    // write (same rules as before)
    const E = ctx.E, keys = new Set();
    if (old) { const oy = old.d.slice(0, 4); E[oy] = (E[oy] || []).filter(y => y.id !== old.id); keys.add(oy); }
    const y = rec.d.slice(0, 4); (E[y] = E[y] || []).push(rec); keys.add(y);
    let msg = t(old ? 'entry.updated' : 'entry.added');
    if (!isFuel && rec.cat) {
      S.reminders.filter(r => r.v === rec.v && r.name === rec.cat && (!r.lastDate || rec.d >= r.lastDate)).forEach(r => {
        r.lastDate = rec.d; if (rec.odo) r.lastOdo = rec.odo;
        if (r.date && (+r.months || !r.km)) { const dd = new Date(rec.d); dd.setMonth(dd.getMonth() + (+r.months || 12)); r.date = +r.months ? '' : ctx.iso(dd); }
        keys.add('g'); msg = fill(t('entry.reminderReset'), { name: rec.cat });
      });
    }
    const warn = isFuel ? odoWarning() : '';
    if (!ctx.persist([...keys])) return;
    closeSheet(); ctx.render();
    toast(warn ? `${msg} — ${t('entry.checkOdo')}` : msg, { tone: warn ? '' : 'success' });
  });

  /* delete with undo (as before) */
  const del = $('#en-del');
  if (del) del.addEventListener('click', () => {
    const yk = old.d.slice(0, 4), E = ctx.E;
    E[yk] = (E[yk] || []).filter(z => z.id !== old.id); ctx.persist([yk]); closeSheet(); ctx.render();
    toast(t('entry.deleted'), { action: t('action.undo'), onAction: () => { (ctx.E[yk] = ctx.E[yk] || []).push(old); ctx.persist([yk]); ctx.render(); } });
  });
  return root;
}

function shortDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${+dd} ${t('month')[+m - 1]}${+y !== new Date().getFullYear() ? ' ' + y : ''}`;
}
