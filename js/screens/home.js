// سيارتي · My Car — Home screen
// Pure view: reads the app's existing data through `ctx` (no storage of its own,
// no new data fields). Actions reuse the app's existing handlers (data-act=…).
import { t, getLang, getThemePref, setTheme, setLang, esc, icon, iconTile, button, menu, badge, listItem, stat, num, fmt, openSheet, closeSheet } from '../ui.js';

const fill = (s, n) => String(s).replace('{n}', n);
const TYPE_ICON = { fuel: 'fuel', service: 'wrench', expense: 'receipt', income: 'wallet' };

/* ---------- formatting ---------- */
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
function consumption(ctx, kmpl) {
  if (!kmpl) return '';
  return ctx.S.set.unit === 'l100'
    ? `${num(100 / kmpl, 1)} <span class="mc-stat__unit">${getLang() === 'ar' ? 'ل/100كم' : 'L/100km'}</span>`
    : `${num(kmpl, 1)} <span class="mc-stat__unit">${t('unit.kmpl')}</span>`;
}
const greeting = () => { const h = new Date().getHours(); return t(h >= 4 && h < 12 ? 'home.morning' : 'home.evening'); };
const longToday = () => new Date().toLocaleDateString(getLang() === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
const safePhoto = p => (typeof p === 'string' && /^data:image\/(png|jpe?g|webp);base64,/.test(p) ? p : '');

/* ---------- pieces ---------- */
function appBar() {
  const pref = getThemePref(), L = getLang();
  return `<header class="mc-appbar hm-bar">
    <div class="hm-greet"><h1 class="mc-title">${esc(greeting())}</h1><span class="mc-caption mc-muted">${esc(longToday())}</span></div>
    <div class="mc-appbar__actions">${menu({ id: 'hm-menu', label: t('home.viewOptions'), triggerIcon: 'settings', items: [
      { label: t('home.settings'), icon: 'sliders-horizontal', action: 'hm-settings' }, { sep: true },
      ...['light', 'dark', 'auto'].map(k => ({ label: t('theme.' + k), icon: { light: 'sun', dark: 'moon', auto: 'refresh-cw' }[k], action: 'hm-theme', value: k, checked: pref === k })),
      { sep: true }, ...['ar', 'en'].map(k => ({ label: t('lang.' + k), icon: 'languages', action: 'hm-lang', value: k, checked: L === k }))] })}</div>
  </header>`;
}

function carCard(ctx, V, odo, odoDate) {
  const photo = safePhoto(V.photo);
  return `<section class="mc-card hm-car" aria-label="${esc(V.name)}">
    <div class="hm-car__top">
      <div class="hm-car__photo${photo ? '' : ' is-empty'}">${photo ? `<img src="${photo}" alt="${esc(V.name)}">` : `${icon('car')}<span class="mc-visually-hidden">${esc(t('home.noPhoto'))}</span>`}</div>
      <div class="hm-car__id">
        <h2 class="mc-title hm-car__name">${esc(V.name)}</h2>
        <div class="hm-car__meta">${V.plate ? `<span class="mc-small mc-muted">${esc(V.plate)}</span>` : ''}${V.fuel ? badge(V.fuel, 'neutral') : ''}</div>
      </div>
      ${button(t('home.switchCar'), { variant: 'tonal', size: 'sm', iconEnd: 'chevron-down', attrs: 'data-home="switch" aria-haspopup="dialog"' })}
    </div>
    <div class="hm-odo">
      <span class="mc-small mc-muted">${t('home.odometer')}</span>
      <div class="hm-odo__value"><span class="mc-display mc-num">${fmt(odo)}</span><span class="mc-title mc-muted">${t('unit.km')}</span></div>
      ${odoDate ? `<span class="mc-caption mc-muted">${t('home.updated')} ${shortDate(odoDate)}</span>` : ''}
    </div>
  </section>`;
}

function reminderItem(ctx, r, s) {
  const st = s.due ? ['danger', t('home.due')] : s.soon ? ['warning', t('home.soon')] : ['neutral', t('home.ok')];
  const parts = [];
  if (s.km != null) parts.push(s.km <= 0 ? fill(t('home.overKm'), fmt(-s.km)) : fill(t('home.inKm'), fmt(s.km)));
  else if (s.days != null) parts.push(s.days <= 0 ? fill(t('home.overDays'), fmt(-s.days)) : fill(t('home.inDays'), fmt(s.days)));
  if (s.dueDate) parts.push(shortDate(s.dueDate));
  return listItem({ tag: 'a', attrs: 'href="#remind"', title: esc(r.name), sub: parts.join(' · '), lead: 'bell', tone: st[0] === 'neutral' ? 'service' : st[0], trail: badge(st[1], st[0]), compact: true });
}

function activityItem(ctx, x) {
  const L = getLang();
  const title = x.t === 'fuel' ? `${x.fuel ? esc(x.fuel) + ' · ' : ''}${num(x.liters, 2)} ${t('home.liter')}` : esc(x.cat || t('types.' + x.t));
  const sub = [shortDate(x.d), x.odo ? `${num(x.odo)} ${t('unit.km')}` : '', esc(x.place || '')].filter(Boolean).join(' · ');
  const amount = x.t === 'income' ? `<span class="mc-text-tone mc-tone-income">+${money(ctx, x.cost)}</span>` : money(ctx, x.cost);
  return listItem({ title, sub, lead: TYPE_ICON[x.t], tone: x.t, trail: amount, attrs: `data-act="edit" data-id="${esc(x.id)}" aria-label="${esc(t('types.' + x.t))}"` });
}

function welcome() {
  return `<div class="hm-welcome mc-card">${iconTile('car', 'primary', 'xl')}
    <h1 class="mc-h2">${t('home.welcomeTitle')}</h1><p class="mc-muted">${t('home.welcomeText')}</p>
    ${button(t('home.addCar'), { variant: 'primary', size: 'lg', icon: 'plus', block: true, attrs: 'data-act="addveh"' })}
    ${button(t('home.tryDemo'), { variant: 'ghost', attrs: 'data-act="demo"' })}</div>`;
}

/* ---------- screen ---------- */
export function renderHome(ctx) {
  const { S } = ctx;
  if (!S.vehicles.length) return `<div class="hm">${appBar()}<div class="mc-container hm-empty">${welcome()}</div></div>`;
  const v = S.cur, V = ctx.veh(v), st = ctx.stats(v), odo = ctx.curOdo(v);
  const m0 = ctx.monthStart(0), m1 = ctx.monthStart(1);
  const spend = (from, to) => ctx.items(v).filter(x => x.t !== 'income' && x.d >= from && (!to || x.d < to)).reduce((a, x) => a + (+x.cost || 0), 0);
  const thisMonth = spend(m0), lastMonth = spend(m1, m0);
  const cons = st.allCons.slice(-12), L = cons.reduce((a, c) => a + c.l, 0), avg = L ? cons.reduce((a, c) => a + c.dist, 0) / L : 0;
  const rems = S.reminders.filter(r => r.v === v).map(r => ({ r, s: ctx.rstat(r, st) })).sort((a, b) => b.s.pct - a.s.pct).slice(0, 2);
  const recent = st.it.slice(0, 5);

  return `<div class="hm">${appBar()}
  <div class="mc-container hm-grid">
    <div class="hm-col">
      ${carCard(ctx, V, odo, st.odoDate)}
      <div class="mc-grid-2">
        ${stat(t('home.thisMonth'), money(ctx, thisMonth), `${t('home.lastMonth')} ${num(lastMonth, S.set.dec)}`, 'neutral')}
        ${avg ? stat(t('home.avg'), consumption(ctx, avg), fill(t('home.fromFills'), cons.length), 'neutral') : stat(t('home.avg'), '—', t('home.needFills'), 'neutral')}
      </div>
    </div>
    <div class="hm-col">
      <section aria-labelledby="hm-rem">
        <div class="mc-section-head"><h2 class="mc-title" id="hm-rem">${t('home.upcoming')}</h2>${rems.length ? `<a class="mc-btn mc-btn--ghost mc-btn--sm" href="#remind">${t('home.seeAll')}${icon('chevron-right')}</a>` : ''}</div>
        ${rems.length ? `<div class="mc-list">${rems.map(x => reminderItem(ctx, x.r, x.s)).join('')}</div>`
          : `<a class="mc-list hm-empty-row" href="#remind">${listItem({ tag: 'span', title: t('home.noReminders'), lead: 'bell', tone: 'neutral', chevron: true, compact: true })}</a>`}
      </section>
      <section aria-labelledby="hm-recent">
        <div class="mc-section-head"><h2 class="mc-title" id="hm-recent">${t('home.recent')}</h2>${recent.length ? `<a class="mc-btn mc-btn--ghost mc-btn--sm" href="#log">${t('home.seeAll')}${icon('chevron-right')}</a>` : ''}</div>
        ${recent.length ? `<div class="mc-list">${recent.map(x => activityItem(ctx, x)).join('')}</div>`
          : `<div class="mc-card"><div class="mc-state" style="padding-block:var(--space-5)"><h3 class="mc-state__title">${t('home.noRecords')}</h3><p class="mc-state__text">${t('home.noRecordsText')}</p></div></div>`}
      </section>
    </div>
  </div></div>`;
}

/* ---------- behaviour (registered once) ---------- */
let bound = false;
export function initHome(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-home]'); if (!b) return;
    if (b.dataset.home === 'switch') openSwitcher(ctx);
  });
  document.addEventListener('mc:select', e => {
    const { action, value } = e.detail || {};
    if (action === 'hm-settings') location.hash = 'settings';
    else if (action === 'hm-theme') setTheme(value);
    else if (action === 'hm-lang') setLang(value);
  });
}
function openSwitcher(ctx) {
  const { S } = ctx;
  const body = `<div class="mc-list">${S.vehicles.map(V => listItem({
    title: esc(V.name), sub: [V.plate ? esc(V.plate) : '', `${num(ctx.curOdo(V.id))} ${t('unit.km')}`].filter(Boolean).join(' · '),
    lead: 'car', tone: V.id === S.cur ? 'primary' : 'neutral', trail: V.id === S.cur ? icon('check') : '',
    attrs: `data-car="${esc(V.id)}" ${V.id === S.cur ? 'aria-current="true"' : ''}` })).join('')}</div>`;
  const root = openSheet({ title: t('home.chooseCar'), body, footer: button(t('home.addCar'), { variant: 'outline', icon: 'plus', attrs: 'data-addcar' }) });
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-car]');
    if (c) { closeSheet(); ctx.selectCar(c.dataset.car); }
    else if (e.target.closest('[data-addcar]')) { closeSheet(); setTimeout(() => ctx.addCar(), 220); }
  });
}
