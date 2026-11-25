// سيارتي · My Car — vehicle identity + image catalog
// Vehicle fields (all optional, backward compatible):
//   make   catalog key ('toyota') or free text      model  'Camry' or free text
//   year   number                                   nick   optional nickname ('سيارة العائلة')
//   name   kept for legacy screens = nick || make + model (Arabic)
//   photoCat {make, model, body, color}  catalog drawing  |  photo  uploaded JPEG data URL (wins if both)
import { t, getLang, esc, icon } from './ui.js';

/* ---------- catalog: make → models (body shape decides the drawing) ---------- */
export const MAKES = [
  ['toyota', 'تويوتا', 'Toyota', [['Camry', 'sedan'], ['Corolla', 'sedan'], ['Yaris', 'hatch'], ['RAV4', 'crossover'], ['Fortuner', 'suv'], ['Prado', 'suv'], ['Land Cruiser', 'suv'], ['Hilux', 'pickup']]],
  ['nissan', 'نيسان', 'Nissan', [['Sunny', 'sedan'], ['Altima', 'sedan'], ['X-Trail', 'crossover'], ['Patrol', 'suv'], ['Navara', 'pickup']]],
  ['hyundai', 'هيونداي', 'Hyundai', [['Accent', 'sedan'], ['Elantra', 'sedan'], ['Sonata', 'sedan'], ['Tucson', 'crossover'], ['Santa Fe', 'suv']]],
  ['kia', 'كيا', 'Kia', [['Pegas', 'sedan'], ['Cerato', 'sedan'], ['K5', 'sedan'], ['Sportage', 'crossover'], ['Sorento', 'suv']]],
  ['mitsubishi', 'ميتسوبيشي', 'Mitsubishi', [['Attrage', 'sedan'], ['ASX', 'crossover'], ['Pajero', 'suv'], ['L200', 'pickup']]],
  ['honda', 'هوندا', 'Honda', [['Civic', 'sedan'], ['Accord', 'sedan'], ['CR-V', 'crossover']]],
  ['lexus', 'لكزس', 'Lexus', [['ES', 'sedan'], ['RX', 'crossover'], ['LX', 'suv']]],
  ['chevrolet', 'شيفروليه', 'Chevrolet', [['Malibu', 'sedan'], ['Tahoe', 'suv'], ['Silverado', 'pickup']]],
  ['gmc', 'جي إم سي', 'GMC', [['Yukon', 'suv'], ['Sierra', 'pickup']]],
  ['ford', 'فورد', 'Ford', [['Taurus', 'sedan'], ['Explorer', 'suv'], ['F-150', 'pickup']]],
  ['mazda', 'مازدا', 'Mazda', [['Mazda 6', 'sedan'], ['CX-5', 'crossover'], ['CX-9', 'suv']]],
  ['suzuki', 'سوزوكي', 'Suzuki', [['Swift', 'hatch'], ['Dzire', 'sedan'], ['Jimny', 'suv']]]
];
export const COLORS = [['white', '#F1F2F4'], ['silver', '#C3C8CE'], ['gray', '#6B7280'], ['black', '#25282D'], ['red', '#B3261E'], ['blue', '#1F4E8C'], ['beige', '#C9B28A'], ['green', '#2F5D50']];
export const BODIES = ['sedan', 'hatch', 'crossover', 'suv', 'pickup'];
const makeRow = k => MAKES.find(m => m[0] === k);
export const makeLabel = (k, lang = getLang()) => { const m = makeRow(k); return m ? (lang === 'ar' ? m[1] : m[2]) : (k || ''); };
export const modelsOf = k => (makeRow(k) || [, , , []])[3];
export const bodyOf = (make, model) => (modelsOf(make).find(x => x[0] === model) || [])[1] || 'sedan';
const colorHex = c => (COLORS.find(x => x[0] === c) || COLORS[1])[1];

/* ---------- identity: no repeated information ---------- */
export const vehTitle = V => V.nick || [makeLabel(V.make), V.model].filter(Boolean).join(' ') || V.name || '';
export function vehSub(V) {
  const mm = V.nick ? [makeLabel(V.make), V.model].filter(Boolean).join(' ') : '';
  return [mm, V.year ? String(V.year) : ''].filter(Boolean).join(' · ');
}
export const legacyName = V => V.nick || [makeLabel(V.make, 'ar'), V.model].filter(Boolean).join(' ') || V.name || '';

/* ---------- drawings ---------- */
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = s => Math.max(0, Math.min(255, Math.round(((n >> s) & 255) * f))); return '#' + [16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join(''); };
const SHAPES = {
  sedan: { body: 'M28 118 L30 96 Q34 86 50 84 L98 80 L128 56 Q136 50 150 50 L208 50 Q222 50 232 58 L262 82 Q290 86 294 98 L296 118 Q296 124 290 124 L34 124 Q28 124 28 118 Z',
    glass: 'M106 80 L132 58 Q138 54 148 54 L176 54 L176 80 Z M182 80 L182 54 L206 54 Q216 54 224 60 L248 80 Z', wheels: [82, 240], door: 179 },
  hatch: { body: 'M44 118 L46 94 Q50 84 64 82 L102 78 L126 54 Q132 48 146 48 L214 48 Q228 48 236 60 L264 92 Q272 96 274 106 L274 118 Q274 124 268 124 L50 124 Q44 124 44 118 Z',
    glass: 'M110 78 L132 56 Q138 52 148 52 L178 52 L178 78 Z M184 78 L184 52 L212 52 Q222 52 228 60 L246 80 Z', wheels: [92, 228], door: 181 },
  crossover: { body: 'M30 116 L32 90 Q36 80 52 78 L92 74 L116 48 Q124 40 138 40 L222 40 Q238 40 246 52 L270 78 Q290 82 292 94 L294 116 Q294 124 288 124 L36 124 Q30 124 30 116 Z',
    glass: 'M100 74 L122 50 Q128 44 138 44 L178 44 L178 74 Z M184 74 L184 44 L220 44 Q232 44 238 54 L256 74 Z', wheels: [84, 238], door: 181 },
  suv: { body: 'M26 116 L28 84 Q30 74 44 72 L84 70 L104 40 Q110 32 124 32 L254 32 Q268 32 272 44 L282 72 Q296 76 296 90 L296 116 Q296 124 290 124 L32 124 Q26 124 26 116 Z',
    glass: 'M92 70 L110 40 Q114 36 124 36 L170 36 L170 70 Z M176 70 L176 36 L226 36 L226 70 Z M232 70 L232 36 L254 36 Q264 36 266 46 L274 70 Z', wheels: [82, 244], door: 173 },
  pickup: { body: 'M22 116 L24 86 Q26 76 40 74 L80 72 L100 42 Q106 34 120 34 L176 34 Q186 34 188 44 L190 74 L298 74 L298 116 Q298 124 292 124 L28 124 Q22 124 22 116 Z',
    glass: 'M88 72 L106 42 Q110 38 120 38 L144 38 L144 72 Z M150 72 L150 38 L176 38 Q182 38 184 46 L184 72 Z', wheels: [78, 248], door: 147, bed: true }
};
/** Side-view drawing of a body shape in a color. Faces right in LTR and left in RTL (follows reading direction). */
export function carArt(body = 'sedan', color = 'silver', { label = '' } = {}) {
  const s = SHAPES[body] || SHAPES.sedan, c = colorHex(color), id = 'g' + body + color;
  const wheel = x => `<circle cx="${x}" cy="124" r="23" fill="#1c1e22"/><circle cx="${x}" cy="124" r="11" fill="#c7ccd2"/><circle cx="${x}" cy="124" r="4" fill="#80868f"/>`;
  return `<svg class="mc-carart" viewBox="0 0 320 160" ${label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true"'}>
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${shade(c, 1.18)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, .72)}"/></linearGradient></defs>
    <ellipse cx="160" cy="146" rx="138" ry="8" fill="#000" opacity=".18"/>
    <path d="${s.body}" fill="url(#${id})" stroke="${shade(c, .6)}" stroke-width="1"/>
    <path d="${s.glass}" fill="#2a3440" opacity=".92"/>
    <path d="M${s.door} ${body === 'pickup' ? 76 : 84} L${s.door} 116" stroke="${shade(c, .6)}" stroke-width="1.2" opacity=".6"/>
    ${s.bed ? `<path d="M194 80 L294 80" stroke="${shade(c, .55)}" stroke-width="2"/>` : ''}
    <rect x="${body === 'hatch' ? 262 : 280}" y="${body === 'suv' || body === 'pickup' ? 82 : 92}" width="14" height="7" rx="3" fill="#ffe7a8"/>
    <rect x="${body === 'hatch' ? 46 : body === 'pickup' ? 24 : 30}" y="${body === 'suv' || body === 'pickup' ? 84 : 94}" width="10" height="7" rx="3" fill="#d6463b"/>
    ${s.wheels.map(wheel).join('')}</svg>`;
}

const safeImg = p => (typeof p === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(p) ? p : '');
/** An uploaded photo fitted to any frame: shown whole, in its own proportions (never cropped or stretched);
    the frame's own background (follows light/dark) fills any spare space. */
export const photoFit = src => `<img class="ph" src="${src}" alt="">`;
/** The vehicle's image: uploaded photo, else catalog drawing, else '' (caller shows a placeholder). */
export function vehImage(V) {
  const p = safeImg(V.photo);
  if (p) return photoFit(p);
  // drawing always follows the car's registered make + model (only the color is chosen)
  if (V.photoCat && inCatalog(V.make, V.model)) return carArt(bodyOf(V.make, V.model), V.photoCat.color);
  return '';
}
export const inCatalog = (make, model) => !!makeRow(make) && modelsOf(make).some(x => x[0] === model);

/* ---------- catalog picker: locked to one make + model; the user picks a color ---------- */
/** mountCatalog(el, {make, model, color}, onPick({make, model, body, color})) — returns false when the model isn't in the catalog. */
export function mountCatalog(el, init, onPick) {
  if (!inCatalog(init.make, init.model)) {
    el.innerHTML = `<div class="mc-alert mc-tone-info" role="status">${icon('info')}<div><strong class="mc-alert__title">${t('catalog.needModel')}</strong>${t('catalog.needModelText')}</div></div>`;
    return false;
  }
  const body = bodyOf(init.make, init.model);
  let color = COLORS.some(c => c[0] === init.color) ? init.color : 'silver';
  const draw = () => {
    el.innerHTML = `<div class="ct-locked">
      <div class="ct-locked__art">${carArt(body, color, { label: `${makeLabel(init.make)} ${init.model}` })}</div>
      <div class="ct-locked__id"><strong class="mc-title">${esc(makeLabel(init.make))} ${esc(init.model)}</strong><span class="mc-small mc-muted">${t('catalog.bodies.' + body)}</span></div>
    </div>
    <div class="mc-field"><span class="mc-field__label" id="ct-color-l">${t('catalog.color')}</span><div class="ct-colors" role="radiogroup" aria-labelledby="ct-color-l">${COLORS.map(([k, h]) =>
      `<button type="button" class="ct-color" role="radio" aria-checked="${color === k}" aria-label="${esc(t('catalog.colors.' + k))}" title="${esc(t('catalog.colors.' + k))}" data-ct-color="${k}" style="--c:${h}">${color === k ? icon('check', { size: 'sm' }) : ''}</button>`).join('')}</div></div>
    <button type="button" class="mc-btn mc-btn--primary mc-btn--block" data-ct-use>${icon('check')}<span>${t('catalog.use')}</span></button>`;
  };
  el.addEventListener('click', e => {
    const c = e.target.closest('[data-ct-color]');
    if (c) { color = c.dataset.ctColor; draw(); el.querySelector(`[data-ct-color="${color}"]`)?.focus(); return; }
    if (e.target.closest('[data-ct-use]')) onPick({ make: init.make, model: init.model, body, color });
  });
  draw();
  return true;
}
