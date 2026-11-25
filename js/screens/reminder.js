// سيارتي · My Car — reminder form (add / edit / delete)
// Stored shape (existing fields kept; new ones optional):
//   {id, v, name, cat, by:'date'|'odo'|'both', date, odoDue, months, km, lastDate, lastOdo, before, alert, note}
//   date/odoDue = when it is due; months/km = repeat after it is done (reset happens when the matching
//   service/expense is logged — see entry.js). Old reminders (no by/odoDue) are read through dueOf().
import { t, getLang, esc, icon, button, field, switchControl, segmented, fmt, parseNum, openSheet, closeSheet, toast } from '../ui.js';
import { vehTitle } from '../vehicle.js';

// sensible defaults for the built-in categories (by, repeat km, repeat months)
const DEFAULTS = {
  'تغيير زيت المحرك': ['both', 5000, 6], 'فلتر هواء': ['both', 10000, 12], 'فلتر مكيف': ['both', 15000, 12], 'إطارات': ['both', 40000, 48],
  'ترصيص وميزان': ['both', 10000, 12], 'فرامل': ['both', 30000, 24], 'بطارية': ['date', 0, 24], 'زيت القير': ['both', 40000, 24],
  'سائل التبريد': ['both', 40000, 24], 'بواجي': ['both', 30000, 24], 'فحص دوري': ['date', 0, 12], 'تأمين': ['date', 0, 12], 'تجديد الملكية': ['date', 0, 12]
};
const defaultsFor = cat => DEFAULTS[cat] || ['date', 0, 12];
const addMonths = (iso, m) => { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };

/** Due values of any reminder, old or new. */
export function dueOf(r) {
  const date = r.date || (+r.months ? addMonths(r.lastDate || new Date().toISOString().slice(0, 10), +r.months) : '');
  const odo = r.odoDue ? +r.odoDue : (+r.km ? (+r.lastOdo || 0) + (+r.km) : '');
  const by = r.by || (date && odo ? 'both' : odo ? 'odo' : 'date');
  return { by, date: by === 'odo' ? '' : date, odo: by === 'date' ? '' : odo };
}

export function openReminderForm(ctx, id = null, preset = {}) {
  const { S } = ctx;
  if (!S.vehicles.length) { ctx.addVehicle(); return; }
  const old = id ? S.reminders.find(r => r.id === id) : null;
  const catList = [...new Set([...ctx.cats('service'), ...ctx.cats('expense')])];
  let r, due;
  if (old) { r = { ...old }; due = dueOf(old); }
  else {
    const cat = preset.cat || catList[0] || '';
    const [by, km, months] = defaultsFor(cat), v = preset.v || S.cur, odo = ctx.curOdo(v);
    r = { v, cat, name: cat, km, months, before: 7, alert: true };
    due = { by, date: months ? addMonths(ctx.today(), months) : '', odo: km ? odo + km : '' };
  }
  const cat0 = r.cat || r.name;
  const catOpts = (catList.includes(cat0) ? catList : [cat0, ...catList]).filter(Boolean).map(c => [c, c]);
  const BY = [['date', t('rem.byDate')], ['odo', t('rem.byOdo')], ['both', t('rem.byBoth')]];

  const body = `<form id="rm-form" class="mc-stack en-form" novalidate>
    <div class="en-group">
      ${field({ id: 'rm-cat', label: t('rem.type'), options: catOpts, value: cat0 })}
      ${field({ id: 'rm-name', label: t('rem.title'), value: r.name || cat0, placeholder: t('rem.titlePh') })}
      ${S.vehicles.length > 1 ? field({ id: 'rm-v', label: t('rem.vehicle'), options: S.vehicles.map(V => [V.id, vehTitle(V)]), value: r.v }) : `<input type="hidden" id="rm-v" value="${esc(r.v)}">`}
    </div>
    <div class="en-group">
      <div class="mc-field"><span class="mc-field__label" id="rm-by-l">${t('rem.basedOn')}</span><div aria-labelledby="rm-by-l">${segmented(BY, due.by, 'data-rm-by')}</div></div>
      <div class="mc-stack">
        <div data-for="date">${field({ id: 'rm-date', label: t('rem.dueDate'), type: 'date', value: due.date || '' })}</div>
        <div data-for="odo">${field({ id: 'rm-odo', label: t('rem.dueOdo'), optional: '', inputmode: 'numeric', value: due.odo === '' ? '' : due.odo, unit: t('unit.km') })}</div>
      </div>
      <div class="mc-field__hint" id="rm-odo-hint"></div>
      <div class="mc-field"><span class="mc-field__label">${t('rem.repeat')} <small>(${t('car.optional')})</small></span>
        <div class="mc-grid-2">
          <div data-for="date">${field({ id: 'rm-months', label: t('rem.everyMonths'), inputmode: 'numeric', value: +r.months || '', unit: t('rem.monthsUnit') })}</div>
          <div data-for="odo">${field({ id: 'rm-km', label: t('rem.everyKm'), inputmode: 'numeric', value: +r.km || '', unit: t('unit.km') })}</div>
        </div>
        <div class="mc-field__hint">${t('rem.repeatHint')}</div>
      </div>
    </div>
    <div class="en-group">
      ${switchControl({ label: t('rem.alert'), desc: t('rem.alertDesc'), checked: r.alert !== false, name: 'rm-alert' })}
      <div id="rm-before-w">${field({ id: 'rm-before', label: t('rem.before'), inputmode: 'numeric', value: r.before ?? 7, unit: t('unit.days') })}</div>
    </div>
    ${field({ id: 'rm-note', label: t('entry.note'), optional: t('car.optional'), rows: 2, value: r.note || '' })}
    <div id="rm-err"></div>
    ${old ? `<div class="mc-divider"></div>${button(t('rem.delete'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'id="rm-del"' })}` : ''}
  </form>`;
  const root = openSheet({ title: t(old ? 'rem.editTitle' : 'rem.addTitle'), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', attrs: 'id="rm-save" form="rm-form"', type: 'submit' }) });
  const $ = s => root.querySelector(s);
  const title = root.querySelector('.mc-sheet__title');
  if (title) title.insertAdjacentHTML('afterbegin', `<span class="en-title-ic mc-tone-service">${icon('bell')}</span>`);

  let by = due.by, nameTouched = !!old && (old.name !== (old.cat || old.name));
  const odoLabel = () => root.querySelector('label[for=rm-odo]');
  const sync = () => {
    root.querySelectorAll('[data-rm-by]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.rmBy === by)));
    root.querySelectorAll('[data-for]').forEach(el => { el.hidden = by !== 'both' && el.dataset.for !== by; });
    // odometer is required when it is the only trigger, optional otherwise
    const l = odoLabel(); if (l) l.innerHTML = `${esc(t('rem.dueOdo'))}${by === 'both' ? ` <small>(${esc(t('car.optional'))})</small>` : ''}`;
    const v = $('#rm-v').value, odo = ctx.curOdo(v);
    $('#rm-odo-hint').innerHTML = by !== 'date' && odo ? `${t('entry.lastOdo').replace('{n}', `<span class="mc-num">${fmt(odo)}</span>`).replace('{u}', t('unit.km'))}` : '';
    $('#rm-before-w').hidden = !root.querySelector('[name=rm-alert]').checked;
  };
  root.querySelectorAll('[data-rm-by]').forEach(b => b.addEventListener('click', () => { by = b.dataset.rmBy; sync(); }));
  root.querySelector('[name=rm-alert]').addEventListener('change', sync);
  $('#rm-v').addEventListener('change', sync);
  $('#rm-name').addEventListener('input', () => { nameTouched = true; });
  // choosing a type fills sensible defaults (new reminders only) and the title if untouched
  $('#rm-cat').addEventListener('change', () => {
    const cat = $('#rm-cat').value;
    if (!nameTouched) $('#rm-name').value = cat;
    if (!old) {
      const [b, km, months] = defaultsFor(cat), odo = ctx.curOdo($('#rm-v').value);
      by = b; $('#rm-km').value = km || ''; $('#rm-months').value = months || '';
      $('#rm-odo').value = km ? odo + km : ''; $('#rm-date').value = months ? addMonths(ctx.today(), months) : '';
    }
    sync();
  });
  // errors clear while editing
  $('#rm-form').addEventListener('input', e => { const f = e.target.closest('.mc-field'); if (f && f.classList.contains('mc-field--error')) { f.classList.remove('mc-field--error'); e.target.removeAttribute('aria-invalid'); if (!root.querySelector('.mc-field--error')) $('#rm-err').innerHTML = ''; } });
  sync();

  $('#rm-form').addEventListener('submit', e => {
    e.preventDefault();
    const g = s => $(s).value.trim();
    const name = g('#rm-name'), date = by !== 'odo' ? g('#rm-date') : '', odoDue = by !== 'date' ? parseNum(g('#rm-odo')) : NaN;
    const months = by !== 'odo' ? Math.max(0, Math.round(parseNum(g('#rm-months')) || 0)) : 0, km = by !== 'date' ? Math.max(0, Math.round(parseNum(g('#rm-km')) || 0)) : 0;
    const errs = [];
    if (!name) errs.push(['#rm-name', t('rem.errTitle')]);
    if (by === 'date' && !date) errs.push(['#rm-date', t('rem.errDate')]);
    if (by === 'odo' && !(odoDue > 0)) errs.push(['#rm-odo', t('rem.errOdo')]);
    if (by === 'both' && !date && !(odoDue > 0)) errs.push(['#rm-date', t('rem.errBoth')]);
    root.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    root.querySelectorAll('.mc-field--error').forEach(el => el.classList.remove('mc-field--error'));
    if (errs.length) {
      errs.forEach(([s]) => { $(s).setAttribute('aria-invalid', 'true'); $(s).closest('.mc-field').classList.add('mc-field--error'); });
      $('#rm-err').innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div><strong class="mc-alert__title">${t('entry.errTitle')}</strong>${errs.map(x => esc(x[1])).join('<br>')}</div></div>`;
      $(errs[0][0]).focus(); return;
    }
    const v = $('#rm-v').value, alert = root.querySelector('[name=rm-alert]').checked;
    const nr = { ...(old || {}), id: old ? old.id : ctx.uid(), v, name, cat: g('#rm-cat'), by, date: date || '', months, km,
      lastDate: old?.lastDate || ctx.today(), lastOdo: old?.lastOdo ?? ctx.curOdo(v), before: Math.max(0, Math.round(parseNum(g('#rm-before')) || 0)), alert, note: g('#rm-note') };
    if (odoDue > 0) nr.odoDue = Math.round(odoDue); else delete nr.odoDue;
    if (!nr.note) delete nr.note;
    delete nr.done;
    const before = JSON.stringify(S.reminders);
    S.reminders = old ? S.reminders.map(z => (z.id === nr.id ? nr : z)) : [...S.reminders, nr];
    if (!ctx.persist(['g'])) { S.reminders = JSON.parse(before); return; }
    closeSheet(); ctx.render(); toast(t(old ? 'rem.updated' : 'rem.added'), { tone: 'success' });
  });

  const del = $('#rm-del');
  if (del) del.addEventListener('click', () => {
    const keep = old; S.reminders = S.reminders.filter(z => z.id !== old.id); ctx.persist(['g']); closeSheet(); ctx.render();
    toast(t('rem.deleted'), { action: t('action.undo'), onAction: () => { S.reminders.push(keep); ctx.persist(['g']); ctx.render(); } });
  });
  return root;
}
