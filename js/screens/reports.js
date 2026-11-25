// سيارتي · My Car — Reports (rp-). Same figures as before, design-system UI.
import { t, getLang, esc, icon, iconButton, button, segmented, stat, num, fmt, emptyState } from '../ui.js';
import { vehTitle } from '../vehicle.js';

let period = 6, bound = false, ro = null;
const fill = (s, n) => s.replace('{n}', n);
const money = (ctx, x) => `${num(x, ctx.S.set.dec)} <span class="mc-stat__unit">${esc(ctx.S.set.cur)}</span>`;
const moneyTxt = (ctx, x) => `${fmt(x, ctx.S.set.dec)} ${ctx.S.set.cur}`;
const consUnit = ctx => (ctx.S.set.unit === 'l100' ? (getLang() === 'ar' ? 'ل/100كم' : 'L/100km') : t('unit.kmpl'));
const consVal = (ctx, k) => (ctx.S.set.unit === 'l100' ? 100 / k : k);
const cons = (ctx, k) => (k ? `${num(consVal(ctx, k), 1)} <span class="mc-stat__unit">${consUnit(ctx)}</span>` : '—');
const monthName = (m, short) => { const n = t('month')[+m.slice(5) - 1]; return short && getLang() === 'en' ? n.slice(0, 3) : n; };
const fdate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]} ${y}`; };
const fuelName = f => (getLang() === 'en' && f === 'ديزل' ? 'Diesel' : f || '');

function data(ctx) {
  const since = period ? ctx.monthStart(period - 1) : '';
  const st = ctx.stats(ctx.S.cur, since), today = ctx.today();
  const first = st.inP.length ? st.inP[st.inP.length - 1].d.slice(0, 7) : today.slice(0, 7);
  const d0 = new Date(today);
  const cnt = period || Math.min(24, Math.max(1, (d0.getFullYear() - +first.slice(0, 4)) * 12 + (d0.getMonth() + 1 - +first.slice(5)) + 1));
  const months = []; for (let k = cnt - 1; k >= 0; k--) months.push(ctx.monthStart(k).slice(0, 7));
  const mt = months.map(m => {
    const xs = st.inP.filter(x => x.d.startsWith(m)), o = { m };
    ['fuel', 'service', 'expense'].forEach(k => { o[k] = xs.filter(x => x.t === k).reduce((s, x) => s + (+x.cost || 0), 0); });
    o.tot = o.fuel + o.service + o.expense; return o;
  });
  const cats = {};
  st.inP.filter(x => x.t !== 'income').forEach(x => {
    const k = x.t === 'fuel' ? `${t('types.fuel')} ${fuelName(x.fuel)}`.trim() : (x.cat || t('types.' + x.t));
    cats[k] = cats[k] || { v: 0, t: x.t }; cats[k].v += +x.cost || 0;
  });
  const ce = Object.entries(cats).sort((a, b) => b[1].v - a[1].v).slice(0, 8);
  return { st, mt, ce };
}

/* ---------- pieces ---------- */
function monthly(ctx, mt) {
  const mx = Math.max(1, ...mt.map(o => o.tot)), top = mt.reduce((a, o, i) => (o.tot > mt[a].tot ? i : a), 0);
  const every = mt.length > 8 ? Math.ceil(mt.length / 6) : 1;
  const tip = o => [`${monthName(o.m)} ${o.m.slice(0, 4)}`, `${t('rep.total')}: ${moneyTxt(ctx, o.tot)}`,
    ...['fuel', 'service', 'expense'].filter(k => o[k]).map(k => `${t('types.' + k)}: ${moneyTxt(ctx, o[k])}`)].join('\n');
  const bars = mt.map((o, i) => `<button type="button" class="rp-col" data-rp-tip="${esc(tip(o))}" aria-label="${esc(tip(o).replace(/\n/g, '، '))}">
      ${i === top && o.tot ? `<span class="rp-col__val mc-num">${fmt(o.tot, 0)}</span>` : ''}
      <span class="rp-col__bar${o.tot ? '' : ' is-zero'}" style="block-size:${o.tot ? Math.max(2, (o.tot / mx) * 100).toFixed(1) : 0}%"></span></button>`).join('');
  const labels = mt.map((o, i) => `<span>${i % every === 0 ? esc(monthName(o.m, true)) : ''}</span>`).join('');
  const table = `<table class="mc-visually-hidden"><caption>${t('rep.monthly')}</caption><tr><th>${t('rep.period')}</th><th>${t('rep.total')}</th></tr>${mt.map(o => `<tr><td>${monthName(o.m)} ${o.m.slice(0, 4)}</td><td>${moneyTxt(ctx, o.tot)}</td></tr>`).join('')}</table>`;
  return `<div class="rp-chart" role="group" aria-label="${t('rep.chartMonthly')}"><div class="rp-cols" style="--n:${mt.length}">${bars}</div><div class="rp-xl" style="--n:${mt.length}" aria-hidden="true">${labels}</div>${table}</div>`;
}
function byType(ctx, by) {
  const total = by.fuel + by.service + by.expense, pct = x => (total ? (x / total) * 100 : 0);
  return `<div class="cd-bar" role="img" aria-label="${esc(t('rep.byType'))}">${['fuel', 'service', 'expense'].map(k => `<span class="mc-tone-${k}" style="width:${pct(by[k]).toFixed(2)}%"></span>`).join('')}</div>
    <ul class="cd-legend">${['fuel', 'service', 'expense'].map(k => `<li class="mc-tone-${k}"><i></i><span>${t('types.' + k)}</span><b>${money(ctx, by[k])}</b></li>`).join('')}</ul>`;
}
function breakdown(ctx, ce) {
  if (!ce.length) return `<p class="mc-small mc-muted rp-none">${t('rep.noData')}</p>`;
  const mx = Math.max(1, ...ce.map(e => e[1].v));
  return `<ul class="rp-hb">${ce.map(([k, o]) => `<li><span class="rp-hb__name">${esc(k)}</span><span class="rp-hb__track"><i style="inline-size:${((o.v / mx) * 100).toFixed(1)}%"></i></span><span class="rp-hb__val">${money(ctx, o.v)}</span></li>`).join('')}</ul>`;
}
const card = (id, title, body, extra = '') => `<section class="mc-card rp-card" aria-labelledby="rp-${id}"><div class="mc-card__head"><h2 class="mc-title" id="rp-${id}">${title}</h2>${extra}</div>${body}</section>`;

export function renderReports(ctx) {
  const { S } = ctx;
  const bar = `<header class="mc-appbar rp-appbar">
      <div class="rp-appbar__id"><h1 class="mc-title">${t('rep.title')}</h1>${S.vehicles.length ? (S.vehicles.length > 1
        ? button(vehTitle(ctx.veh(S.cur)), { variant: 'ghost', size: 'sm', iconEnd: 'chevron-down', attrs: 'data-home="switch" aria-haspopup="dialog"' })
        : `<span class="mc-caption mc-muted">${esc(vehTitle(ctx.veh(S.cur)))}</span>`) : ''}</div>
      <div class="mc-appbar__actions"><a class="mc-iconbtn" href="#settings" aria-label="${t('set.title')}">${icon('settings')}</a></div>
    </header>`;
  if (!S.vehicles.length) return `<div class="rp">${bar}<div class="mc-container">${emptyState({ icon: 'chart-column', title: t('home.welcomeTitle'), text: t('home.welcomeText'), action: button(t('home.addCar'), { variant: 'primary', icon: 'plus', attrs: 'data-act="addveh"' }) })}</div></div>`;
  const { st, mt, ce } = data(ctx);
  const per = [[3, t('rep.p3')], [6, t('rep.p6')], [12, t('rep.p12')], [0, t('rep.p0')]].map(([k, l]) => [String(k), l]);
  const kpis = `<div class="rp-kpis">
    ${stat(t('rep.spend'), money(ctx, st.spend))}
    ${stat(t('rep.costKm'), st.cpk ? money(ctx, st.cpk) : '—')}
    ${stat(t('rep.distance'), `${num(st.span)} <span class="mc-stat__unit">${t('unit.km')}</span>`)}
    ${stat(t('rep.avg'), cons(ctx, st.avg))}
    ${stat(t('rep.ppl'), st.ppl ? money(ctx, st.ppl) : '—')}
    ${stat(t('rep.kmDay'), st.kmDay ? `${num(st.kmDay)} <span class="mc-stat__unit">${t('unit.km')}</span>` : '—')}
  </div>`;
  const fuel = `<div class="rp-kpis">
    ${stat(t('rep.fills'), num(st.fills))}
    ${stat(t('rep.liters'), `${num(st.L, 1)} <span class="mc-stat__unit">${t('unit.liter')}</span>`)}
    ${stat(t('rep.best'), cons(ctx, st.best))}
    ${stat(t('rep.worst'), cons(ctx, st.worst))}
    ${stat(t('rep.avgFill'), st.fills ? money(ctx, st.by.fuel / st.fills) : '—')}
    ${stat(t('rep.income'), money(ctx, st.by.income))}
  </div>`;
  const trend = st.cons.length > 1
    ? `<div class="rp-fig" id="rp-trend" role="img" aria-label="${esc(t('rep.chartTrend'))}"><svg aria-hidden="true"></svg></div><p class="mc-caption mc-muted rp-avgnote"><i aria-hidden="true"></i>${t('rep.average')} ${cons(ctx, st.avg)}</p>`
    : `<p class="mc-small mc-muted rp-none">${t('rep.needFills')}</p>`;
  return `<div class="rp">${bar}
    <div class="mc-container rp-grid">
      <div class="rp-period">${segmented(per, String(period), 'data-rp-period', t('rep.period'))}</div>
      <div class="rp-full">${kpis}</div>
      ${card('m', t('rep.monthly'), monthly(ctx, mt))}
      ${card('t', t('rep.byType'), byType(ctx, st.by))}
      ${card('c', t('rep.byCat'), breakdown(ctx, ce))}
      ${card('tr', t('rep.trend'), trend)}
      <section class="rp-full" aria-labelledby="rp-f"><h2 class="mc-title rp-h" id="rp-f">${t('rep.fuelNums')}</h2>${fuel}</section>
    </div><div class="rp-tip" role="tooltip" hidden></div></div>`;
}

/** Draw the consumption line once the page is in the DOM (needs its width). */
export function afterRenderReports(ctx) {
  if (ro) { ro.disconnect(); ro = null; }
  const f = document.getElementById('rp-trend'); if (!f) return;
  const since = period ? ctx.monthStart(period - 1) : '';
  const c = ctx.stats(ctx.S.cur, since).cons, svg = f.querySelector('svg');
  const draw = () => {
    const W = f.clientWidth, H = f.clientHeight; if (!W) return;
    const rtl = getComputedStyle(f).direction === 'rtl';
    const vs = c.map(x => consVal(ctx, x.k)), mn = Math.min(...vs), mx = Math.max(...vs), pad = (mx - mn) * 0.15 || 1, lo = mn - pad, hi = mx + pad;
    const gut = 36, R = 12, Tp = 12, B = 26, iw = W - gut - R, ih = H - Tp - B;
    const x0 = rtl ? R : gut;
    const X = i => { const p = c.length < 2 ? 0.5 : i / (c.length - 1); return x0 + (rtl ? 1 - p : p) * iw; };
    const Y = v => Tp + (1 - (v - lo) / (hi - lo)) * ih;
    const avg = vs.reduce((a, b) => a + b, 0) / vs.length;
    const ticks = [lo + pad, (lo + hi) / 2, hi - pad];
    // value labels sit in the start-side gutter, anchored toward the plot (dates inherit the page direction,
    // so 'start'/'end' already put the first date at the start edge in both languages)
    const tx = rtl ? W - gut + 6 : gut - 6, ta = rtl ? 'start' : 'end';
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = `${ticks.map(v => `<line class="rp-gl" x1="${x0}" x2="${x0 + iw}" y1="${Y(v)}" y2="${Y(v)}"/><text class="rp-tick" x="${tx}" y="${Y(v) + 4}" text-anchor="${ta}" direction="ltr">${v.toFixed(1)}</text>`).join('')}
      <line class="rp-avg" x1="${x0}" x2="${x0 + iw}" y1="${Y(avg)}" y2="${Y(avg)}"/>
      <polyline class="rp-line" points="${vs.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(' ')}"/>
      ${vs.map((v, i) => `<circle class="rp-dot" cx="${X(i)}" cy="${Y(v)}" r="4"/>`).join('')}
      <text class="rp-tick" x="${X(0)}" y="${H - 6}" text-anchor="start">${esc(fdate(c[0].d))}</text>
      <text class="rp-tick" x="${X(c.length - 1)}" y="${H - 6}" text-anchor="end">${esc(fdate(c[c.length - 1].d))}</text>
      ${vs.map((v, i) => `<rect class="rp-hit" x="${X(i) - 12}" y="${Tp}" width="24" height="${ih}" data-rp-tip="${esc(`${fdate(c[i].d)}\n${v.toFixed(1)} ${consUnit(ctx)}`)}"/>`).join('')}`;
  };
  ro = new ResizeObserver(draw); ro.observe(f);
}

export function initReports(ctx) {
  if (bound) return; bound = true;
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-rp-period]'); if (!b) return;
    period = +b.dataset.rpPeriod; ctx.render();
    document.querySelector(`[data-rp-period="${period}"]`)?.focus();
  });
  // hover / focus / tap tooltip for chart marks
  const show = el => {
    const tip = document.querySelector('.rp-tip'); if (!tip) return;
    if (!el) { tip.hidden = true; return; }
    tip.textContent = el.dataset.rpTip; tip.hidden = false;
    const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight;
    const x = Math.min(innerWidth - w - 8, Math.max(8, r.left + r.width / 2 - w / 2)), y = r.top - h - 8;
    tip.style.left = x + 'px'; tip.style.top = (y < 8 ? r.bottom + 8 : y) + 'px';
  };
  document.addEventListener('pointerover', e => { if (document.querySelector('.rp')) show(e.target.closest && e.target.closest('[data-rp-tip]')); });
  document.addEventListener('focusin', e => { if (document.querySelector('.rp')) show(e.target.closest && e.target.closest('[data-rp-tip]')); });
  document.addEventListener('scroll', () => show(null), { passive: true });
}
