// سيارتي · My Car — Maintenance (route #maint): everything about servicing the current car.
// Add on top, two figures (maintenance spend, last service), then services grouped by month.
// Reads the existing records (t === 'service'); no new data.
import { t, getLang, esc, button, stat, num, emptyState } from '../ui.js';
import { appBar, noCar, row } from './log.js';

const cur = ctx => { const c = ctx.S.set.cur || 'ر.ع'; return getLang() === 'en' && c === 'ر.ع' ? 'OMR' : c; };
const money = (ctx, x) => `${num(x, ctx.S.set.dec)} <span class="mc-stat__unit">${esc(cur(ctx))}</span>`;
const longDate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]}${+y !== new Date().getFullYear() ? ' ' + y : ''}`; };

export function renderMaint(ctx) {
  const { S } = ctx;
  if (!S.vehicles.length) return `<div class="lg mt">${appBar(ctx, 'maint.title')}${noCar()}</div>`;
  const xs = ctx.items(S.cur).filter(x => x.t === 'service');
  const add = button(t('maint.add'), { variant: 'primary', icon: 'plus', block: true, attrs: 'data-act="add" data-t="service"' });
  if (!xs.length) return `<div class="lg mt">${appBar(ctx, 'maint.title')}<div class="mc-container lg-wrap">${add}
    <div class="mc-card">${emptyState({ icon: 'wrench', title: t('maint.none'), text: t('maint.noneText'), tone: 'service' })}</div></div></div>`;
  const total = xs.reduce((a, x) => a + (+x.cost || 0), 0), last = xs[0];
  const g = {}; xs.forEach(x => { (g[x.d.slice(0, 7)] = g[x.d.slice(0, 7)] || []).push(x); });
  const months = Object.entries(g).map(([m, list]) => `<section class="lg-month" aria-label="${esc(`${t('month')[+m.slice(5) - 1]} ${m.slice(0, 4)}`)}">
      <div class="lg-month__head"><h2 class="mc-small">${t('month')[+m.slice(5) - 1]} <span class="mc-num">${m.slice(0, 4)}</span></h2><span class="mc-small" aria-label="${esc(t('maint.monthSpend'))}">${money(ctx, list.reduce((a, x) => a + (+x.cost || 0), 0))}</span></div>
      <div class="mc-list">${list.map(x => row(ctx, x)).join('')}</div></section>`).join('');
  return `<div class="lg mt">${appBar(ctx, 'maint.title')}
    <div class="mc-container lg-wrap">
      ${add}
      <div class="mc-grid-2">${stat(t('maint.total'), money(ctx, total), t('maint.since'), 'neutral')}${stat(t('maint.last'), esc(longDate(last.d)), esc(last.cat || t('types.service')), 'neutral')}</div>
      <div class="lg-list">${months}</div>
    </div></div>`;
}
