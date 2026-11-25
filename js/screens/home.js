// سيارتي · My Car — Home screen
// Car card + documents (from car.js) and upcoming reminders. Reads the app's data through `ctx`;
// actions reuse the app's existing handlers (data-act=…, data-car=…).
import { t, getLang, getThemePref, setTheme, setLang, esc, icon, iconTile, button, menu, badge, listItem, num, fmt, openSheet, closeSheet } from '../ui.js';
import { vehTitle, vehSub } from '../vehicle.js';
import { carHero, docsSection } from './car.js';

const fill = (s, n) => String(s).replace('{n}', n);

/* ---------- formatting ---------- */
function shortDate(d) {
  if (!d) return '';
  const [y, m, dd] = d.split('-');
  return `${+dd} ${t('month')[+m - 1]}${+y !== new Date().getFullYear() ? ' ' + y : ''}`;
}
const greeting = () => { const h = new Date().getHours(); return t(h >= 4 && h < 12 ? 'home.morning' : 'home.evening'); };
const longToday = () => new Date().toLocaleDateString(getLang() === 'ar' ? 'ar-OM-u-nu-latn' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

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

function reminderItem(ctx, r, s) {
  const st = s.due ? ['danger', t('home.due')] : s.soon ? ['warning', t('home.soon')] : ['neutral', t('home.ok')];
  const parts = [];
  if (s.km != null) parts.push(s.km <= 0 ? fill(t('home.overKm'), fmt(-s.km)) : fill(t('home.inKm'), fmt(s.km)));
  else if (s.days != null) parts.push(s.days <= 0 ? fill(t('home.overDays'), fmt(-s.days)) : fill(t('home.inDays'), fmt(s.days)));
  if (s.dueDate) parts.push(shortDate(s.dueDate));
  return listItem({ tag: 'a', attrs: 'href="#remind"', title: esc(r.name), sub: parts.join(' · '), lead: 'bell', tone: st[0] === 'neutral' ? 'service' : st[0], trail: badge(st[1], st[0]), compact: true });
}

function welcome() {
  return `<div class="hm-welcome mc-card">${iconTile('car', 'primary', 'xl')}
    <h1 class="mc-h2">${t('home.welcomeTitle')}</h1><p class="mc-muted">${t('home.welcomeText')}</p>
    ${button(t('home.addCar'), { variant: 'primary', size: 'lg', icon: 'plus', block: true, attrs: 'data-act="addveh"' })}
    ${button(t('home.tryDemo'), { variant: 'ghost', attrs: 'data-act="demo"' })}</div>`;
}

/* ---------- screen ----------
   car card (from car.js) → car documents → upcoming reminders ("See all" opens the reminders page, which has Add) */
export function renderHome(ctx) {
  const { S } = ctx;
  if (!S.vehicles.length) return `<div class="hm">${appBar()}<div class="mc-container hm-empty">${welcome()}</div></div>`;
  const v = S.cur, V = ctx.veh(v), st = ctx.stats(v);
  const rems = S.reminders.filter(r => r.v === v && r.alert !== false).map(r => ({ r, s: ctx.rstat(r, st) })).filter(x => !x.s.done).sort((a, b) => b.s.pct - a.s.pct).slice(0, 2);
  return `<div class="hm">${appBar()}
  <div class="mc-container hm-grid">
    <div class="hm-col">${carHero(ctx, V)}</div>
    <div class="hm-col">
      ${docsSection(ctx, V)}
      <section aria-labelledby="hm-rem">
        <div class="mc-section-head"><h2 class="mc-title" id="hm-rem">${t('home.upcoming')}</h2><a class="mc-btn mc-btn--ghost mc-btn--sm" href="#remind">${t('home.seeAll')}${icon('chevron-right')}</a></div>
        ${rems.length ? `<div class="mc-list">${rems.map(x => reminderItem(ctx, x.r, x.s)).join('')}</div>`
          : `<a class="mc-list hm-empty-row" href="#remind">${listItem({ tag: 'span', title: t('home.noReminders'), lead: 'bell', tone: 'neutral', chevron: true, compact: true })}</a>`}
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
    if (b.dataset.home === 'switch') openSwitcher(ctx); // other screens' app bar
  });
  document.addEventListener('mc:select', e => {
    const { action, value } = e.detail || {};
    if (action === 'hm-car') ctx.selectCar(value);
    else if (action === 'hm-addcar') ctx.addCar();
    else if (action === 'hm-settings') location.hash = 'settings';
    else if (action === 'hm-theme') setTheme(value);
    else if (action === 'hm-lang') setLang(value);
  });
}
function openSwitcher(ctx) {
  const { S } = ctx;
  const body = `<div class="mc-list">${S.vehicles.map(V => listItem({
    title: esc(vehTitle(V)), sub: [esc(vehSub(V)), V.plate ? esc(V.plate) : '', `${num(ctx.curOdo(V.id))} ${t('unit.km')}`].filter(Boolean).join(' · '),
    lead: 'car', tone: V.id === S.cur ? 'primary' : 'neutral', trail: V.id === S.cur ? icon('check') : '',
    attrs: `data-car="${esc(V.id)}" ${V.id === S.cur ? 'aria-current="true"' : ''}` })).join('')}</div>`;
  const root = openSheet({ title: t('home.chooseCar'), body, footer: button(t('home.addCar'), { variant: 'outline', icon: 'plus', attrs: 'data-addcar' }) });
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-car]');
    if (c) { closeSheet(); ctx.selectCar(c.dataset.car); }
    else if (e.target.closest('[data-addcar]')) { closeSheet(); setTimeout(() => ctx.addCar(), 220); }
  });
}
