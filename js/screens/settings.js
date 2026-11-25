// سيارتي · My Car — Settings (st-). Same options as before, design-system UI.
// Backup/restore/CSV/demo/wipe keep their data-act hooks and data format (handled in index.html).
import { t, getLang, getThemePref, setTheme, setLang, esc, icon, iconTile, iconButton, button, field, segmented, listItem, openSheet, closeSheet, confirmDialog, toast } from '../ui.js';
import { vehTitle, vehSub } from '../vehicle.js';

let CT = 'service', bound = false;
const fill = (s, o) => Object.entries(o).reduce((a, [k, v]) => a.replace('{' + k + '}', v), s);
const fdate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]} ${y}`; };
const card = (id, ic, tone, title, body, desc = '') => `<section class="mc-card st-card" aria-labelledby="st-${id}">
  <div class="st-card__head">${iconTile(ic, tone)}<div><h2 class="mc-title" id="st-${id}">${title}</h2>${desc ? `<p class="mc-small mc-muted">${desc}</p>` : ''}</div></div>${body}</section>`;

function backupStatus(ctx) {
  const l = ctx.S.set.lastDrive, any = ctx.all().length;
  if (!l) return any ? ['warning', t('set.noBackup')] : ['neutral', t('set.noBackup')];
  const d = Math.floor((Date.now() - new Date(l)) / 864e5);
  return d > 14 ? ['warning', fill(t('set.oldBackup'), { n: d })] : ['success', fill(t('set.lastBackup'), { d: fdate(l.slice(0, 10)) })];
}

export function renderSettings(ctx) {
  const { S } = ctx;
  const vehicles = S.vehicles.length
    ? `<div class="mc-list">${S.vehicles.map(V => listItem({ title: esc(vehTitle(V)), sub: [esc(vehSub(V)), V.plate ? `<span class="mc-num">${esc(V.plate)}</span>` : ''].filter(Boolean).join(' · '),
        lead: 'car', tone: V.id === S.cur ? 'primary' : 'neutral', chevron: true, attrs: `data-act="editveh" data-id="${esc(V.id)}"` })).join('')}</div>`
    : `<p class="mc-small mc-muted">${t('set.noVehicles')}</p>`;
  const look = `<div class="st-rows">
    <div class="st-row"><span class="st-row__label" id="st-th">${t('set.theme')}</span>${segmented(['light', 'dark', 'auto'].map(k => [k, t('theme.' + k)]), getThemePref(), 'data-set-theme', t('set.theme'))}</div>
    <div class="st-row"><span class="st-row__label">${t('set.language')}</span>${segmented([['ar', t('lang.ar')], ['en', t('lang.en')]], getLang(), 'data-set-lang', t('set.language'))}</div></div>`;
  const prefs = `<div class="st-prefs">
    ${field({ id: 's-cur', label: t('set.currency'), value: S.set.cur }).replace('id="s-cur"', 'id="s-cur" maxlength="6"')}
    ${field({ id: 's-dec', label: t('set.decimals'), options: [['3', t('set.dec3')], ['2', t('set.dec2')], ['0', t('set.dec0')]], value: String(S.set.dec) })}
    ${field({ id: 's-unit', label: t('set.unit'), options: [['kmpl', t('set.kmpl')], ['l100', t('set.l100')]], value: S.set.unit })}</div>`;
  const list = ctx.cats(CT);
  const cats = `${segmented([['service', t('types.service')], ['expense', t('types.expense')], ['income', t('types.income')]], CT, 'data-set-ct', t('set.cats'))}
    ${list.length ? `<div class="mc-list st-cats">${list.map((c, i) => listItem({ tag: 'div', compact: true, title: esc(c),
      trail: iconButton('pencil', `${t('action.edit')} ${c}`, { attrs: `data-set-cat="edit" data-i="${i}"` }) + iconButton('trash-2', `${t('action.delete')} ${c}`, { attrs: `data-set-cat="del" data-i="${i}"` }) })).join('')}</div>`
      : `<p class="mc-small mc-muted">${t('set.noCats')}</p>`}
    ${button(t('set.addCat'), { variant: 'tonal', icon: 'plus', block: true, attrs: 'data-set-cat="add"' })}`;
  const [bt, bmsg] = backupStatus(ctx);
  const backup = `<div class="mc-alert mc-tone-${bt}" role="status">${icon(bt === 'success' ? 'circle-check' : bt === 'warning' ? 'triangle-alert' : 'info')}<div>${esc(bmsg)}</div></div>
    <div class="st-actions">
      <div>${button(t('set.saveDrive'), { variant: 'primary', icon: 'cloud-upload', block: true, attrs: 'data-act="drvsave"' })}<p class="mc-caption mc-muted">${t('set.saveDriveHint')}</p></div>
      <div><label class="mc-btn mc-btn--outline mc-btn--block st-file">${icon('upload')}<span>${t('set.restore')}</span><input type="file" id="imp" accept=".json,application/json"></label><p class="mc-caption mc-muted">${t('set.restoreHint')}</p></div>
      <div class="mc-grid-2">${button(t('set.exportCsv'), { variant: 'outline', icon: 'download', attrs: 'data-act="expcsv"' })}${button(t('set.demo'), { variant: 'outline', icon: 'car', attrs: 'data-act="demo"' })}</div>
      ${button(t('set.wipe'), { variant: 'danger', icon: 'trash-2', block: true, attrs: 'data-set="wipe"' })}
    </div>`;
  const ins = ctx.install();
  const install = ins.standalone ? '' : card('i', 'download', 'neutral', t('set.install'),
    ins.canPrompt ? button(t('set.installBtn'), { variant: 'primary', icon: 'download', block: true, attrs: 'data-act="install"' }) : `<p class="mc-small mc-muted">${t(ins.ios ? 'set.installIos' : 'set.installOther')}</p>`);
  return `<div class="st">
    <header class="mc-appbar st-appbar">
      <a class="mc-iconbtn" href="#home" aria-label="${t('action.back')}">${icon('arrow-left')}</a>
      <h1 class="mc-appbar__title">${t('set.title')}</h1>
    </header>
    <div class="mc-container st-grid">
      <div class="st-col">
        ${card('v', 'car', 'primary', t('set.vehicles'), `${vehicles}${button(t('set.addVehicle'), { variant: 'tonal', icon: 'plus', block: true, attrs: 'data-act="addveh"' })}`)}
        ${card('l', 'languages', 'info', t('set.look'), look)}
        ${card('p', 'sliders-horizontal', 'neutral', t('set.prefs'), prefs)}
        ${card('b', 'cloud-upload', 'success', t('set.backup'), backup)}
      </div>
      <div class="st-col">
        ${card('c', 'list', 'service', t('set.cats'), cats, t('set.catsDesc'))}
        ${install}
        <p class="mc-caption mc-muted st-note">${t('set.privacy')}</p>
      </div>
    </div></div>`;
}

/* ---------- categories (rename keeps records + reminders in step, as before) ---------- */
function openCatEditor(ctx, i) {
  const { S } = ctx, old = i == null ? null : ctx.cats(CT)[i];
  const body = `<form id="cat-form" class="mc-stack" novalidate>
    ${field({ id: 'cat-name', label: t('set.catName'), value: old || '', hint: old ? t('set.catRenameHint') : '' })}
    <div id="cat-err"></div></form>`;
  const root = openSheet({ title: t(old ? 'set.editCat' : 'set.addCat'), body,
    footer: button(t('action.cancel'), { variant: 'outline', attrs: 'data-mc-close' }) + button(t('action.save'), { variant: 'primary', type: 'submit', attrs: 'id="cat-save" form="cat-form"' }) });
  const inp = root.querySelector('#cat-name'), err = root.querySelector('#cat-err');
  const fail = m => { inp.setAttribute('aria-invalid', 'true'); inp.closest('.mc-field').classList.add('mc-field--error'); err.innerHTML = `<div class="mc-alert mc-tone-danger" role="alert">${icon('circle-alert')}<div>${esc(m)}</div></div>`; inp.focus(); };
  inp.addEventListener('input', () => { inp.removeAttribute('aria-invalid'); inp.closest('.mc-field').classList.remove('mc-field--error'); err.innerHTML = ''; });
  root.querySelector('#cat-form').addEventListener('submit', e => {
    e.preventDefault();
    const nm = inp.value.trim();
    if (!nm) return fail(t('set.catErrName'));
    if (ctx.cats(CT).some((c, j) => c === nm && j !== i)) return fail(t('set.catErrDup'));
    S.cats = S.cats || JSON.parse(JSON.stringify(ctx.CATS)); S.cats[CT] = [...ctx.cats(CT)];
    const keys = new Set(['g']);
    if (old) {
      S.cats[CT][i] = nm;
      Object.keys(ctx.E).forEach(k => ctx.E[k].forEach(x => { if (x.t === CT && x.cat === old) { x.cat = nm; keys.add(k); } }));
      S.reminders.forEach(r => { if (r.name === old) r.name = nm; if (r.cat === old) r.cat = nm; });
    } else S.cats[CT].push(nm);
    ctx.persist([...keys]); closeSheet(); ctx.render(); toast(t(old ? 'set.catSaved' : 'set.catAdded'), { tone: 'success' });
  });
}
async function deleteCat(ctx, i) {
  const { S } = ctx, c = ctx.cats(CT)[i], type = CT;
  if (!(await confirmDialog({ title: fill(t('set.catDelQ'), { n: c }), text: t('set.catDelText'), confirmText: t('action.delete') }))) return;
  S.cats = S.cats || JSON.parse(JSON.stringify(ctx.CATS)); S.cats[type] = ctx.cats(type).filter((_, j) => j !== i);
  ctx.persist(['g']); ctx.render();
  toast(t('set.catDeleted'), { action: t('action.undo'), onAction: () => { S.cats[type].splice(i, 0, c); ctx.persist(['g']); ctx.render(); } });
}

export function initSettings(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', async e => {
    const th = e.target.closest('[data-set-theme]'); if (th) { setTheme(th.dataset.setTheme); return; }
    const lg = e.target.closest('[data-set-lang]'); if (lg) { setLang(lg.dataset.setLang); return; }
    const ct = e.target.closest('[data-set-ct]'); if (ct) { CT = ct.dataset.setCt; ctx.render(); document.querySelector(`[data-set-ct="${CT}"]`)?.focus(); return; }
    const cb = e.target.closest('[data-set-cat]');
    if (cb) { const a = cb.dataset.setCat; if (a === 'add') openCatEditor(ctx, null); else if (a === 'edit') openCatEditor(ctx, +cb.dataset.i); else deleteCat(ctx, +cb.dataset.i); return; }
    const w = e.target.closest('[data-set="wipe"]');
    if (w && await confirmDialog({ title: t('set.wipeQ'), text: t('set.wipeText'), confirmText: t('set.wipeOk') })) ctx.wipe();
  });
}
