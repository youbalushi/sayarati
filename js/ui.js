// سيارتي · My Car — shared UI kit
// Framework-free ES module. Pure helpers return HTML strings (escaped);
// imperative helpers (sheet, confirm, toast) manage focus, Esc and the
// Android back button. No business logic lives here.
import { STRINGS } from './i18n.js';

/* ---------- escaping & numbers ----------------------------------- */
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Arabic-Indic (٠-٩) and Persian (۰-۹) digits → Western, Arabic decimal separators → "."
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
// t('nav.home') → string in the current language, falls back to Arabic then the key
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
  if (meta) meta.content = dark ? '#111318' : '#F5F6F8';
}
export function setTheme(pref, persist = true) {
  themePref = ['light', 'dark'].includes(pref) ? pref : 'auto';
  if (persist) safeSet(THEME_KEY, themePref);
  applyTheme();
  document.dispatchEvent(new CustomEvent('mc:theme', { detail: themePref }));
}
mq && mq.addEventListener && mq.addEventListener('change', () => themePref === 'auto' && applyTheme());

// Call once at start-up. URL ?lang=en&theme=dark overrides (useful for previews/tests).
export function initPrefs() {
  const q = new URLSearchParams(location.search);
  setLang(q.get('lang') || safeGet(LANG_KEY) || 'ar', !q.get('lang'));
  setTheme(q.get('theme') || safeGet(THEME_KEY) || 'auto', !q.get('theme'));
}

/* ---------- component builders (HTML strings) -------------------- */
let spriteUrl = 'assets/icons/lucide-sprite.svg';
export const setSpriteUrl = u => { spriteUrl = u; };
const DIR_ICONS = new Set(['chevron-left', 'chevron-right', 'arrow-left', 'arrow-right', 'undo-2', 'log-out']);
export function icon(name, { size = '', label = '' } = {}) {
  const cls = ['mc-icon', size && `mc-icon--${size}`, DIR_ICONS.has(name) && 'mc-icon--dir'].filter(Boolean).join(' ');
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"';
  return `<svg class="${cls}" ${a11y}><use href="${spriteUrl}#i-${name}"/></svg>`;
}
export function button(text, { variant = 'secondary', size = '', icon: ic = '', iconEnd = '', block = false, attrs = '', disabled = false, busy = false, type = 'button' } = {}) {
  const cls = ['mc-btn', variant !== 'secondary' && `mc-btn--${variant}`, size && `mc-btn--${size}`, block && 'mc-btn--block'].filter(Boolean).join(' ');
  const lead = busy ? icon('loader-circle') : ic ? icon(ic) : '';
  return `<button type="${type}" class="${cls}" ${disabled ? 'disabled' : ''} ${busy ? 'aria-busy="true"' : ''} ${attrs}>${lead}<span>${esc(text)}</span>${iconEnd ? icon(iconEnd) : ''}</button>`;
}
export const iconButton = (name, label, { filled = false, attrs = '' } = {}) =>
  `<button type="button" class="mc-iconbtn${filled ? ' mc-iconbtn--filled' : ''}" aria-label="${esc(label)}" ${attrs}>${icon(name)}</button>`;
export function field({ id, label, type = 'text', value = '', placeholder = '', hint = '', error = '', unit = '', lead = '', inputmode = '', options = null, rows = 0 }) {
  const desc = [hint && `${id}-hint`, error && `${id}-err`].filter(Boolean).join(' ');
  const common = `id="${esc(id)}" name="${esc(id)}" ${desc ? `aria-describedby="${desc}"` : ''} ${error ? 'aria-invalid="true"' : ''}`;
  let control;
  if (options) control = `<select class="mc-select" ${common}>${options.map(o => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(value) ? 'selected' : ''}>${esc(l)}</option>`; }).join('')}</select>`;
  else if (rows) control = `<textarea class="mc-textarea" rows="${rows}" ${common} placeholder="${esc(placeholder)}">${esc(value)}</textarea>`;
  else control = `<input class="mc-input" type="${type}" ${inputmode ? `inputmode="${inputmode}"` : ''} ${common} value="${esc(value)}" placeholder="${esc(placeholder)}">`;
  if (unit || lead) control = `<div class="mc-inputgroup">${lead ? icon(lead) : ''}${control}${unit ? `<span class="mc-inputgroup__unit">${esc(unit)}</span>` : ''}</div>`;
  return `<div class="mc-field"><label class="mc-field__label" for="${esc(id)}">${esc(label)}</label>${control}
    ${hint && !error ? `<div class="mc-field__hint" id="${id}-hint">${esc(hint)}</div>` : ''}
    ${error ? `<div class="mc-field__error" id="${id}-err">${icon('circle-alert', { size: 'sm' })}${esc(error)}</div>` : ''}</div>`;
}
export const badge = (text, tone = '') => `<span class="mc-badge${tone ? ` mc-badge--${tone}` : ''}">${esc(text)}</span>`;
export const progress = (pct, tone = '') => `<div class="mc-progress${tone ? ` mc-progress--${tone}` : ''}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}"><span style="width:${Math.max(0, Math.min(100, pct))}%"></span></div>`;
export function listItem({ title, sub = '', lead = '', tone = 'fuel', trail = '', chevron = false, tag = 'button', attrs = '' }) {
  return `<${tag} class="mc-list-item mc-tone-${tone}" ${tag === 'button' ? 'type="button"' : ''} ${attrs}>
    ${lead ? `<span class="mc-list-item__lead">${icon(lead)}</span>` : ''}
    <span class="mc-list-item__body"><span class="mc-list-item__title">${title}</span>${sub ? `<span class="mc-list-item__sub">${sub}</span>` : ''}</span>
    ${trail || chevron ? `<span class="mc-list-item__trail">${trail}${chevron ? icon('chevron-right') : ''}</span>` : ''}</${tag}>`;
}
export const stat = (label, value, delta = '', dir = '') =>
  `<div class="mc-stat"><span class="mc-stat__label">${esc(label)}</span><span class="mc-stat__value">${value}</span>${delta ? `<span class="mc-stat__delta mc-stat__delta--${dir}">${delta}</span>` : ''}</div>`;
export const emptyState = ({ icon: ic = 'inbox', title, text = '', action = '', tone = '' }) =>
  `<div class="mc-state${tone ? ` mc-state--${tone}` : ''}" role="status"><div class="mc-state__icon">${icon(ic)}</div><h3 class="mc-state__title">${esc(title)}</h3>${text ? `<p class="mc-state__text">${esc(text)}</p>` : ''}${action}</div>`;
export const alertBox = ({ tone = 'info', title = '', text = '', ic }) =>
  `<div class="mc-alert mc-alert--${tone}" role="${tone === 'danger' ? 'alert' : 'status'}">${icon(ic || { info: 'info', success: 'circle-check', warning: 'triangle-alert', danger: 'circle-alert' }[tone])}<div>${title ? `<strong class="mc-alert__title">${esc(title)}</strong>` : ''}${esc(text)}</div></div>`;
export const skeletonRow = () => `<div class="mc-list-item" aria-hidden="true"><span class="mc-skeleton mc-skeleton--tile"></span><span class="mc-list-item__body"><span class="mc-skeleton mc-skeleton--title"></span><span class="mc-skeleton mc-skeleton--text" style="width:40%"></span></span></div>`;

/* ---------- bottom sheet / dialog ---------------------------------- */
let openLayer = null;
const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function trap(e) {
  if (!openLayer) return;
  if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
  if (e.key !== 'Tab') return;
  const f = [...openLayer.el.querySelectorAll(FOCUSABLE)]; if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}
window.addEventListener('popstate', () => { if (openLayer && openLayer.pushed) { openLayer.pushed = false; closeSheet(); } });

/** openSheet({title, body, footer, dialog, onClose}) → root element. Esc, scrim tap and the back button close it. */
export function openSheet({ title = '', body = '', footer = '', dialog = false, center = false, onClose } = {}) {
  if (openLayer) closeSheet(true);
  const scrim = document.createElement('div');
  scrim.className = 'mc-scrim' + (center ? ' mc-scrim--center' : '');
  const tid = 'mc-sheet-title-' + Date.now();
  scrim.innerHTML = `<div class="mc-sheet${dialog ? ' mc-dialog' : ''}" role="dialog" aria-modal="true" ${title ? `aria-labelledby="${tid}"` : ''}>
    ${dialog ? '' : '<div class="mc-sheet__grab" aria-hidden="true"></div>'}
    ${title && !dialog ? `<div class="mc-sheet__head"><h2 class="mc-sheet__title" id="${tid}">${esc(title)}</h2>${iconButton('x', t('action.close'), { attrs: 'data-mc-close' })}</div>` : ''}
    <div class="mc-sheet__body">${body}</div>${footer ? `<div class="mc-sheet__foot">${footer}</div>` : ''}</div>`;
  document.body.appendChild(scrim);
  const prevFocus = document.activeElement;
  openLayer = { el: scrim, onClose, prevFocus, pushed: false };
  try { history.pushState({ mcSheet: true }, ''); openLayer.pushed = true; } catch (e) { /* sandboxed */ }
  scrim.addEventListener('click', e => { if (e.target === scrim || e.target.closest('[data-mc-close]')) closeSheet(); });
  document.addEventListener('keydown', trap);
  document.body.style.overflow = 'hidden';
  requestAnimationFrame(() => { scrim.classList.add('is-open'); (scrim.querySelector('[autofocus]') || scrim.querySelector(FOCUSABLE.split(',').map(x => '.mc-sheet__body ' + x).join(',')) || scrim.querySelector(FOCUSABLE))?.focus({ preventScroll: true }); });
  return scrim;
}
export function closeSheet(silent = false) {
  if (!openLayer) return;
  const { el, onClose, prevFocus, pushed } = openLayer; openLayer = null;
  document.removeEventListener('keydown', trap);
  document.body.style.overflow = '';
  if (pushed && !silent) { try { history.back(); } catch (e) {} }
  el.classList.remove('is-open'); setTimeout(() => el.remove(), 200);
  prevFocus && prevFocus.focus && prevFocus.focus({ preventScroll: true });
  onClose && onClose();
}
/** confirmDialog({title,text,confirmText,tone}) → Promise<boolean> */
export function confirmDialog({ title, text = '', confirmText = t('action.confirm'), cancelText = t('action.cancel'), tone = 'danger', ic = 'trash-2' }) {
  return new Promise(resolve => {
    let result = false;
    const root = openSheet({
      dialog: true, center: true,
      body: `<div class="mc-dialog__icon mc-tone-${tone}">${icon(ic)}</div><h2 class="mc-title">${esc(title)}</h2>${text ? `<p class="mc-small mc-muted" style="margin:0">${esc(text)}</p>` : ''}`,
      footer: button(cancelText, { variant: 'outline', attrs: 'data-mc-close' }) + button(confirmText, { variant: tone === 'danger' ? 'danger' : 'primary', attrs: 'data-mc-ok autofocus' }),
      onClose: () => resolve(result)
    });
    root.querySelector('[data-mc-ok]').addEventListener('click', () => { result = true; closeSheet(); });
  });
}

/* ---------- toast ------------------------------------------------- */
let toastTimer = 0;
export function toast(message, { tone = '', action = '', onAction, duration } = {}) {
  let region = document.querySelector('.mc-toast-region');
  if (!region) { region = document.createElement('div'); region.className = 'mc-toast-region'; region.setAttribute('aria-live', 'polite'); document.body.appendChild(region); }
  clearTimeout(toastTimer);
  const ic = tone === 'success' ? icon('circle-check') : tone === 'danger' ? icon('circle-alert') : '';
  region.innerHTML = `<div class="mc-toast${tone ? ` mc-toast--${tone}` : ''}">${ic}<span class="mc-toast__msg">${esc(message)}</span>${action ? `<button type="button" class="mc-toast__action">${esc(action)}</button>` : ''}</div>`;
  const btn = region.querySelector('.mc-toast__action');
  if (btn) btn.addEventListener('click', () => { region.innerHTML = ''; onAction && onAction(); });
  toastTimer = setTimeout(() => { region.innerHTML = ''; }, duration || (action ? 6000 : 3000));
}
