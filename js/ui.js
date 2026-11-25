// سيارتي · My Car — shared UI kit
// Framework-free ES module. Builders return escaped HTML strings; imperative
// helpers (menu, sheet, confirm, toast) manage focus, Esc and the Android back
// button. No business logic lives here.
import { STRINGS } from './i18n.js';

/* ---------- escaping & numbers ----------------------------------- */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Western; Arabic decimal/comma → "."
export const normalizeDigits = s => String(s ?? '').replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x660).replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x6F0).replace(/[٫،,]/g, '.');
export const parseNum = s => { const n = parseFloat(normalizeDigits(s)); return Number.isFinite(n) ? n : NaN; };
export const fmt = (x, d = 0) => (+x || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
export const num = (x, d = 0) => `<span class="mc-num">${fmt(x, d)}</span>`;

/* ---------- language & direction --------------------------------- */
const LANG_KEY = 'mc-lang', THEME_KEY = 'mc-theme';
let lang = 'ar';
const safeGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
export const getLang = () => lang;
export function setLang(l, persist = true) {
  lang = l === 'en' ? 'en' : 'ar';
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  if (persist) safeSet(LANG_KEY, lang);
  document.dispatchEvent(new CustomEvent('mc:lang', { detail: lang }));
}
export function t(key) {
  const get = o => key.split('.').reduce((a, k) => (a && a[k] != null ? a[k] : undefined), o);
  return get(STRINGS[lang]) ?? get(STRINGS.ar) ?? key;
}

/* ---------- theme ------------------------------------------------- */
const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
let themePref = 'auto';
export const getThemePref = () => themePref;
export function applyTheme() {
  const dark = themePref === 'dark' || (themePref === 'auto' && mq && mq.matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#F28C38' : '#E98230'; // browser bar: approved primary orange (dark / light)
}
export function setTheme(pref, persist = true) {
  themePref = ['light', 'dark'].includes(pref) ? pref : 'auto';
  if (persist) safeSet(THEME_KEY, themePref);
  applyTheme();
  document.dispatchEvent(new CustomEvent('mc:theme', { detail: themePref }));
}
mq && mq.addEventListener && mq.addEventListener('change', () => themePref === 'auto' && applyTheme());
export function initPrefs() {
  const q = new URLSearchParams(location.search);
  setLang(q.get('lang') || safeGet(LANG_KEY) || 'ar', !q.get('lang'));
  setTheme(q.get('theme') || safeGet(THEME_KEY) || 'auto', !q.get('theme'));
}

/* ---------- builders (HTML strings) ------------------------------- */
let spriteUrl = 'assets/icons/lucide-sprite.svg';
export const setSpriteUrl = u => { spriteUrl = u; };
const DIR_ICONS = new Set(['chevron-left', 'chevron-right', 'arrow-left', 'arrow-right', 'undo-2', 'log-out']);
const tone = t => (t ? ` mc-tone-${t}` : '');

export function icon(name, { size = '', label = '' } = {}) {
  const cls = ['mc-icon', size && `mc-icon--${size}`, DIR_ICONS.has(name) && 'mc-icon--dir'].filter(Boolean).join(' ');
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" ${a11y}><use href="${spriteUrl}#i-${name}"/></svg>`;
}
export const iconTile = (name, t = 'primary', size = '') => `<span class="mc-icontile${size ? ` mc-icontile--${size}` : ''}${tone(t)}">${icon(name)}</span>`;

/** button(text, {variant: primary|tonal|outline|ghost|danger|secondary, size: sm|lg, icon, iconEnd, block, disabled, busy, state}) */
export function button(text, { variant = 'secondary', size = '', icon: ic = '', iconEnd = '', block = false, attrs = '', disabled = false, busy = false, type = 'button', state = '' } = {}) {
  const cls = ['mc-btn', variant !== 'secondary' && `mc-btn--${variant}`, size && `mc-btn--${size}`, block && 'mc-btn--block', state && `is-${state}`].filter(Boolean).join(' ');
  const lead = busy ? icon('loader-circle') : ic ? icon(ic) : '';
  return `<button type="${type}" class="${cls}" ${disabled ? 'disabled' : ''} ${busy ? 'aria-busy="true"' : ''} ${attrs}>${lead}<span>${esc(text)}</span>${iconEnd ? icon(iconEnd) : ''}</button>`;
}
export const iconButton = (name, label, { filled = false, attrs = '' } = {}) =>
  `<button type="button" class="mc-iconbtn${filled ? ' mc-iconbtn--filled' : ''}" aria-label="${esc(label)}" ${attrs}>${icon(name)}</button>`;

/** menu({id,label,triggerIcon,items:[{label,icon,value,checked,danger,action}|{sep:true}|{heading}]}) */
export function menu({ id, label, triggerIcon = 'ellipsis-vertical', items, up = false, filled = false }) {
  const body = items.map(it => {
    if (it.sep) return '<div class="mc-menu__sep" role="separator"></div>';
    if (it.heading) return `<div class="mc-menu__label" role="presentation">${esc(it.heading)}</div>`;
    const role = it.checked !== undefined ? 'menuitemradio' : 'menuitem';
    return `<button type="button" class="mc-menu__item${it.danger ? ' mc-menu__item--danger' : ''}" role="${role}" ${it.checked !== undefined ? `aria-checked="${!!it.checked}"` : ''} ${it.action ? `data-action="${esc(it.action)}"` : ''} ${it.value != null ? `data-value="${esc(it.value)}"` : ''} tabindex="-1">${it.icon ? icon(it.icon) : ''}<span>${esc(it.label)}${it.sub ? `<small class="mc-menu__sub">${it.sub}</small>` : ''}</span>${it.checked ? icon('check', { size: 'sm' }) : ''}</button>`;
  }).join('');
  return `<div class="mc-menu-anchor"><button type="button" class="mc-iconbtn${filled ? ' mc-iconbtn--filled' : ''}" aria-label="${esc(label)}" aria-haspopup="menu" aria-expanded="false" aria-controls="${id}" data-mc-menu="${id}">${icon(triggerIcon)}</button>
    <div class="mc-menu${up ? ' mc-menu--up' : ''}" id="${id}" role="menu" aria-label="${esc(label)}" hidden>${body}</div></div>`;
}

/** field({id,label,optional,type,value,placeholder,hint,unit,lead,inputmode,options,rows, msg:{tone:'danger'|'warning', title, text(HTML), action(HTML)}}) */
export function field({ id, label, optional = '', type = 'text', value = '', placeholder = '', hint = '', unit = '', lead = '', inputmode = '', options = null, rows = 0, msg = null }) {
  const desc = [hint && !msg && `${id}-hint`, msg && `${id}-msg`].filter(Boolean).join(' ');
  const invalid = msg && msg.tone === 'danger';
  const common = `id="${esc(id)}" name="${esc(id)}" ${desc ? `aria-describedby="${desc}"` : ''} ${invalid ? 'aria-invalid="true"' : ''}`;
  let control;
  if (options) control = `<select class="mc-select" ${common}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  else if (rows) control = `<textarea class="mc-textarea" rows="${rows}" ${common} placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  else control = `<input class="mc-input" type="${type}" ${type === 'text' && !inputmode ? 'dir="auto"' : ''} ${inputmode ? `inputmode="${inputmode}"` : ''} ${common} value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  if (unit || lead) control = `<div class="mc-inputgroup">${lead ? icon(lead) : ''}${control}${unit ? `<span class="mc-inputgroup__unit">${esc(unit)}</span>` : ''}</div>`;
  const m = msg ? `<div class="mc-field__msg${tone(msg.tone)}" id="${id}-msg" role="${msg.tone === 'danger' ? 'alert' : 'status'}">${icon(msg.tone === 'danger' ? 'circle-alert' : 'triangle-alert', { size: 'sm' })}<div>${msg.title ? `<strong>${esc(msg.title)}</strong>` : ''}${msg.text}${msg.action ? `<br>${msg.action}` : ''}</div></div>` : '';
  return `<div class="mc-field${msg ? ` mc-field--${msg.tone === 'danger' ? 'error' : 'warning'}` : ''}"><label class="mc-field__label" for="${esc(id)}">${esc(label)}${optional ? ` <small>(${esc(optional)})</small>` : ''}</label>${control}
    ${hint && !msg ? `<div class="mc-field__hint" id="${id}-hint">${esc(hint)}</div>` : ''}${m}</div>`;
}
export const switchControl = ({ label, desc = '', checked = false, name = '' }) =>
  `<label class="mc-switch"><span class="mc-switch__text"><span>${esc(label)}</span>${desc ? `<small>${esc(desc)}</small>` : ''}</span><input type="checkbox" role="switch" ${name ? `name="${esc(name)}"` : ''} ${checked ? 'checked' : ''}></label>`;
export const checkbox = ({ label, checked = false, name = '' }) =>
  `<label class="mc-check"><input type="checkbox" ${name ? `name="${esc(name)}"` : ''} ${checked ? 'checked' : ''}><span>${esc(label)}</span></label>`;
export const segmented = (items, selected, attr = 'data-value', label = '') =>
  `<div class="mc-seg" role="group" ${label ? `aria-label="${esc(label)}"` : ''}>${items.map(([v, l]) => `<button type="button" ${attr}="${esc(v)}" aria-pressed="${v === selected}">${esc(l)}</button>`).join('')}</div>`;
export const badge = (text, t = '') => `<span class="mc-badge${tone(t)}">${esc(text)}</span>`;
export const progress = (pct, t = '') => `<div class="mc-progress${tone(t)}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
export function listItem({ title, sub = '', lead = '', tone: t = 'primary', trail = '', chevron = false, tag = 'button', attrs = '', compact = false }) {
  return `<${tag} class="mc-list-item${compact ? ' mc-list-item--compact' : ''}" ${tag === 'button' ? 'type="button"' : ''} ${attrs}>
    ${lead ? iconTile(lead, t) : ''}
    <span class="mc-list-item__body"><span class="mc-list-item__title">${title}</span>${sub ? `<span class="mc-list-item__sub">${sub}</span>` : ''}</span>
    ${trail || chevron ? `<span class="mc-list-item__trail">${trail}${chevron ? icon('chevron-right') : ''}</span>` : ''}</${tag}>`;
}
export const stat = (label, value, delta = '', deltaTone = '') =>
  `<div class="mc-stat"><span class="mc-stat__label">${esc(label)}</span><span class="mc-stat__value">${value}</span>${delta ? `<span class="mc-stat__delta${tone(deltaTone)}">${delta}</span>` : ''}</div>`;
export const section = ({ title = '', desc = '', body = '', bodies = null }) =>
  `<section class="mc-section">${title ? `<div class="mc-section__head"><h3 class="mc-section__title">${esc(title)}</h3>${desc ? `<p class="mc-section__desc">${esc(desc)}</p>` : ''}</div>` : ''}${(bodies || [body]).map(b => `<div class="mc-section__body">${b}</div>`).join('')}</section>`;
export const emptyState = ({ icon: ic = 'inbox', title, text = '', action = '', tone: t = 'primary' }) =>
  `<div class="mc-state" role="status">${iconTile(ic, t, 'xl')}<h3 class="mc-state__title">${esc(title)}</h3>${text ? `<p class="mc-state__text">${esc(text)}</p>` : ''}${action}</div>`;
export const alertBox = ({ tone: t = 'info', title = '', text = '', ic }) =>
  `<div class="mc-alert${tone(t)}" role="${t === 'danger' ? 'alert' : 'status'}">${icon(ic || { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert' }[t])}<div>${title ? `<strong class="mc-alert__title">${esc(title)}</strong>` : ''}${esc(text)}</div></div>`;
export const skeletonRow = () => `<div class="mc-list-item" aria-hidden="true"><span class="mc-skeleton mc-skeleton--tile"></span><span class="mc-list-item__body"><span class="mc-skeleton mc-skeleton--title"></span><span class="mc-skeleton mc-skeleton--text" style="width:40%"></span></span></div>`;

/* ---------- menu behaviour ----------------------------------------- */
let openMenuEl = null;
function closeMenu(focusTrigger = false) {
  if (!openMenuEl) return;
  const m = openMenuEl, trg = document.querySelector(`[data-mc-menu="${m.id}"]`);
  m.hidden = true; trg && trg.setAttribute('aria-expanded', 'false'); openMenuEl = null;
  if (focusTrigger && trg) trg.focus();
}
document.addEventListener('click', e => {
  const trg = e.target.closest('[data-mc-menu]');
  if (trg) {
    const m = document.getElementById(trg.dataset.mcMenu); const was = openMenuEl === m;
    closeMenu(); if (was || !m) return;
    m.hidden = false; trg.setAttribute('aria-expanded', 'true'); openMenuEl = m;
    (m.querySelector('[aria-checked="true"]') || m.querySelector('.mc-menu__item'))?.focus();
    return;
  }
  const item = e.target.closest('.mc-menu__item');
  if (item && openMenuEl && openMenuEl.contains(item)) {
    const m = openMenuEl;
    closeMenu(true);
    m.dispatchEvent(new CustomEvent('mc:select', { bubbles: true, detail: { action: item.dataset.action, value: item.dataset.value } }));
    return;
  }
  if (openMenuEl && !openMenuEl.contains(e.target)) closeMenu();
});
document.addEventListener('keydown', e => {
  if (!openMenuEl) return;
  const items = [...openMenuEl.querySelectorAll('.mc-menu__item')], i = items.indexOf(document.activeElement);
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  else if (e.key === 'Home') { e.preventDefault(); items[0].focus(); }
  else if (e.key === 'End') { e.preventDefault(); items[items.length - 1].focus(); }
  else if (e.key === 'Tab') closeMenu();
}, true);

/* ---------- bottom sheet / dialog ---------------------------------- */
let openLayer = null;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function trap(e) {
  if (!openLayer || openMenuEl) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key !== 'Tab') return;
  const f = [...openLayer.el.querySelectorAll(FOCUSABLE)]; if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
let skipPop = 0; // history.back() we triggered ourselves must not close the next sheet
window.addEventListener('popstate', () => { if (skipPop) { skipPop--; return; } if (openLayer && openLayer.pushed) { openLayer.pushed = false; closeSheet(); } });

/** openSheet({title, body, footer, dialog, center, onClose}) → root. Esc, scrim tap and Back close it. */
export function openSheet({ title = '', body = '', footer = '', dialog = false, center = false, onClose, actions = '' } = {}) {
  if (openLayer) closeSheet(true);
  const scrim = document.createElement('div');
  scrim.className = 'mc-scrim' + (center ? ' mc-scrim--center' : '');
  const tid = 'mc-sheet-title-' + Date.now();
  scrim.innerHTML = `<div class="mc-sheet${dialog ? ' mc-dialog' : ''}" role="${dialog ? 'alertdialog' : 'dialog'}" aria-modal="true" ${title ? `aria-labelledby="${tid}"` : ''}>
    ${dialog ? '' : '<div class="mc-sheet__grab" aria-hidden="true"></div>'}
    ${title && !dialog ? `<div class="mc-sheet__head"><h2 class="mc-sheet__title" id="${tid}">${esc(title)}</h2>${actions ? `<div class="mc-sheet__actions">${actions}${iconButton('x', t('action.close'), { attrs: 'data-mc-close' })}</div>` : iconButton('x', t('action.close'), { attrs: 'data-mc-close' })}</div>` : ''}
    <div class="mc-sheet__body">${body}</div>${footer ? `<div class="mc-sheet__foot">${footer}</div>` : ''}</div>`;
  document.body.appendChild(scrim);
  openLayer = { el: scrim, onClose, prevFocus: document.activeElement, pushed: false };
  try { history.pushState({ mcSheet: true }, ''); openLayer.pushed = true; } catch (e) { /* sandboxed */ }
  scrim.addEventListener('click', e => { if (e.target === scrim || e.target.closest('[data-mc-close]')) closeSheet(); });
  document.addEventListener('keydown', trap);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => {
    scrim.classList.add('is-open');
    const inBody = FOCUSABLE.split(',').map(x => '.mc-sheet__body ' + x).join(',');
    (scrim.querySelector('[autofocus]') || scrim.querySelector(inBody) || scrim.querySelector(FOCUSABLE))?.focus({ preventScroll: true });
  });
  return scrim;
}
export function closeSheet(silent = false) {
  if (!openLayer) return;
  const { el, onClose, prevFocus, pushed } = openLayer; openLayer = null;
  document.removeEventListener('keydown', trap);
  document.body.style.overflow = '';
  if (pushed && !silent) { try { skipPop++; history.back(); } catch (e) { skipPop = Math.max(0, skipPop - 1); } }
  el.classList.remove('is-open'); setTimeout(() => el.remove(), 200);
  prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
  onClose && onClose();
}
/** confirmDialog({title,text,confirmText,tone,ic}) → Promise<boolean> */
export function confirmDialog({ title, text = '', confirmText = t('action.confirm'), cancelText = t('action.cancel'), tone: tn = 'danger', ic = 'trash-2' }) {
  return new Promise(resolve => {
    let result = false;
    const root = openSheet({
      dialog: true, center: true,
      body: `${iconTile(ic, tn, 'lg')}<h2 class="mc-title">${esc(title)}</h2>${text ? `<p class="mc-small mc-muted" style="margin:0">${esc(text)}</p>` : ''}`,
      footer: button(cancelText, { variant: 'outline', attrs: 'data-mc-close' }) + button(confirmText, { variant: tn === 'danger' ? 'danger' : 'primary', attrs: 'data-mc-ok autofocus' }),
      onClose: () => resolve(result)
    });
    root.querySelector('[data-mc-ok]').addEventListener('click', () => { result = true; closeSheet(); });
  });
}

/* ---------- toast ------------------------------------------------- */
let toastTimer = 0;
export function toastHTML(message, { tone: tn = '', action = '' } = {}) {
  const ic = tn === 'success' ? icon('circle-check') : tn === 'danger' ? icon('circle-alert') : '';
  return `<div class="mc-toast${tone(tn)}">${ic}<span class="mc-toast__msg">${esc(message)}</span>${action ? `<button type="button" class="mc-toast__action">${esc(action)}</button>` : ''}</div>`;
}
export function toast(message, { tone: tn = '', action = '', onAction, duration } = {}) {
  let region = document.querySelector('.mc-toast-region');
  if (!region) { region = document.createElement('div'); region.className = 'mc-toast-region'; region.setAttribute('aria-live', 'polite'); document.body.appendChild(region); }
  clearTimeout(toastTimer);
  region.innerHTML = toastHTML(message, { tone: tn, action });
  const btn = region.querySelector('.mc-toast__action');
  if (btn) btn.addEventListener('click', () => { region.innerHTML = ''; onAction && onAction(); });
  toastTimer = setTimeout(() => { region.innerHTML = ''; }, duration || (action ? 6000 : 3000));
}
