// سيارتي · My Car — Log (lg-). Same filters, search and month groups as before; design-system UI.
// Filter/search state lives in index.html (LF) so the car page can open the log pre-filtered.
import { t, getLang, esc, icon, button, segmented, listItem, num, emptyState } from '../ui.js';
import { vehTitle } from '../vehicle.js';

const TYPE_ICON = { fuel: 'fuel', service: 'wrench', expense: 'receipt', income: 'wallet' };
const TYPES_AR = { fuel: 'وقود', service: 'صيانة', expense: 'مصروف', income: 'دخل' };
const TYPES_EN = { fuel: 'Fuel', service: 'Service', expense: 'Expense', income: 'Income' };
let bound = false;

const cur = ctx => { const c = ctx.S.set.cur || 'ر.ع'; return getLang() === 'en' && c === 'ر.ع' ? 'OMR' : c; };
const money = (ctx, x) => `${num(x, ctx.S.set.dec)} <span class="mc-stat__unit">${esc(cur(ctx))}</span>`;
const date = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]}${+y !== new Date().getFullYear() ? ' ' + y : ''}`; };
const fuelName = f => (getLang() === 'en' && f === 'ديزل' ? 'Diesel' : f || '');

function row(ctx, x) {
  const title = x.t === 'fuel' ? `${num(x.liters, 2)} ${t('home.liter')}${x.fuel ? ' · ' + esc(fuelName(x.fuel)) : ''}` : esc(x.cat || t('types.' + x.t));
  const sub = [date(x.d), x.odo ? `${num(x.odo)} ${t('unit.km')}` : '', x.t === 'fuel' && !x.full ? t('log.notFull') : '', esc(x.place || '')].filter(Boolean).join(' · ');
  const amount = x.t === 'income' ? `<span class="mc-text-tone mc-tone-income">+${money(ctx, x.cost)}</span>` : money(ctx, x.cost);
  return listItem({ title, sub, lead: TYPE_ICON[x.t], tone: x.t, trail: amount, attrs: `data-act="edit" data-id="${esc(x.id)}" aria-label="${esc(t('types.' + x.t))}"` });
}

/** The list part only — redrawn on each keystroke so the search box keeps focus. */
export function logList(ctx) {
  const { LF } = ctx, q = LF.q.trim().toLowerCase();
  // search matches category, place, note, fuel and the type name in either language (as before, plus English)
  const it = ctx.items(ctx.S.cur).filter(x => (LF.t === 'all' || x.t === LF.t) &&
    (!q || [x.cat, x.place, x.note, x.fuel, TYPES_AR[x.t], TYPES_EN[x.t]].join(' ').toLowerCase().includes(q)));
  if (!it.length) return `<div class="mc-card">${emptyState({ icon: 'search', title: t('log.noMatch'), text: t('log.noMatchText'), tone: 'neutral' })}</div>`;
  const g = {}; it.forEach(x => { (g[x.d.slice(0, 7)] = g[x.d.slice(0, 7)] || []).push(x); });
  return Object.entries(g).map(([m, xs]) => {
    const sp = xs.filter(x => x.t !== 'income').reduce((s, x) => s + (+x.cost || 0), 0);
    return `<section class="lg-month" aria-label="${esc(`${t('month')[+m.slice(5) - 1]} ${m.slice(0, 4)}`)}">
      <div class="lg-month__head"><h2 class="mc-small">${t('month')[+m.slice(5) - 1]} <span class="mc-num">${m.slice(0, 4)}</span></h2><span class="mc-small" aria-label="${esc(t('log.monthSpend'))}">${money(ctx, sp)}</span></div>
      <div class="mc-list">${xs.map(x => row(ctx, x)).join('')}</div></section>`;
  }).join('');
}

export function appBar(ctx, titleKey) {
  const { S } = ctx, V = ctx.veh(S.cur);
  return `<header class="mc-appbar lg-appbar">
    <div class="lg-appbar__id"><h1 class="mc-title">${t(titleKey)}</h1>${V ? (S.vehicles.length > 1
      ? button(vehTitle(V), { variant: 'ghost', size: 'sm', iconEnd: 'chevron-down', attrs: 'data-home="switch" aria-haspopup="dialog"' })
      : `<span class="mc-caption mc-muted">${esc(vehTitle(V))}</span>`) : ''}</div>
    <div class="mc-appbar__actions"><a class="mc-iconbtn" href="#settings" aria-label="${t('set.title')}">${icon('settings')}</a></div>
  </header>`;
}
export const noCar = () => `<div class="mc-container lg-wrap">${emptyState({ icon: 'car', title: t('home.welcomeTitle'), text: t('home.welcomeText'),
  action: button(t('home.addCar'), { variant: 'primary', icon: 'plus', attrs: 'data-act="addveh"' }) + button(t('home.tryDemo'), { variant: 'ghost', attrs: 'data-act="demo"' }) })}</div>`;

export function renderLog(ctx) {
  const { S, LF } = ctx;
  if (!S.vehicles.length) return `<div class="lg">${appBar(ctx, 'log.title')}${noCar()}</div>`;
  const f = [['all', t('log.all')], ['fuel', t('types.fuel')], ['service', t('types.service')], ['expense', t('types.expense')], ['income', t('types.income')]];
  return `<div class="lg">${appBar(ctx, 'log.title')}
    <div class="mc-container lg-wrap">
      <div class="lg-tools">
        <div class="lg-filter">${segmented(f, LF.t, 'data-log-type', t('log.filter'))}</div>
        <div class="mc-inputgroup lg-search">${icon('search')}<input class="mc-input" id="q" type="search" dir="auto" placeholder="${esc(t('log.search'))}" aria-label="${esc(t('log.searchLabel'))}" value="${esc(LF.q)}"></div>
      </div>
      <div id="loglist" class="lg-list">${logList(ctx)}</div>
    </div></div>`;
}

export function initLog(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-log-type]'); if (!b) return;
    ctx.LF.t = b.dataset.logType; ctx.render(); document.querySelector(`[data-log-type="${ctx.LF.t}"]`)?.focus();
  });
  document.addEventListener('input', e => {
    if (e.target.id !== 'q' || !e.target.closest('.lg')) return;
    ctx.LF.q = e.target.value; const l = document.getElementById('loglist'); if (l) l.innerHTML = logList(ctx);
  });
}
