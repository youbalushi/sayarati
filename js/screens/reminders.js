// سيارتي · My Car — Reminders list (rl-). Same cards, order and actions as before; design-system UI.
// Actions keep their hooks: donerem / editrem / addrem / ics / icsfile (handled in index.html).
import { t, esc, icon, button, badge, num, fmt, openSheet, emptyState } from '../ui.js';
import { vehTitle } from '../vehicle.js';
import { appBar, noCar } from './log.js';

const fill = (s, o) => Object.entries(o).reduce((a, [k, v]) => a.replace('{' + k + '}', v), String(s));
const fdate = d => { const [y, m, dd] = d.split('-'); return `${+dd} ${t('month')[+m - 1]} ${y}`; };

export function status(s) {
  return s.done ? ['success', t('rem.done')] : s.due ? ['danger', t('home.due')] : s.soon ? ['warning', t('home.soon')] : ['info', t('home.ok')];
}
function card(ctx, r, st) {
  const s = ctx.rstat(r, st), [tone, label] = status(s);
  const parts = [];
  if (s.km != null) parts.push(s.km <= 0 ? fill(t('home.overKm'), { n: num(-s.km) }) : fill(t('home.inKm'), { n: num(s.km) }));
  if (s.days != null) parts.push(s.days <= 0 ? fill(t('home.overDays'), { n: fmt(-s.days) }) : fill(t('home.inDays'), { n: fmt(s.days) }));
  if (s.eta != null && (s.days == null || s.eta < s.days)) parts.push(fill(t('rems.eta'), { n: fmt(s.eta) }));
  if (s.dueDate) parts.push(fill(t('rems.dueOn'), { d: fdate(s.dueDate) }));
  if (s.done) parts.push(fill(t('rems.doneOn'), { d: fdate(r.done) }));
  if (r.alert === false) parts.push(t('rem.alertOff'));
  const pct = Math.round(s.pct * 100), id = esc(r.id);
  return `<article class="mc-card rl-card mc-tone-${tone}" aria-labelledby="rl-${id}">
    <div class="rl-card__head"><h2 class="mc-title" id="rl-${id}">${esc(r.name)}</h2>${badge(label, tone)}</div>
    <div class="mc-progress mc-tone-${tone}" role="progressbar" aria-label="${esc(t('rems.progress'))}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
    <p class="mc-small mc-muted rl-card__meta">${parts.join(' · ')}</p>
    ${r.note ? `<p class="mc-small rl-card__note">${esc(r.note)}</p>` : ''}
    <div class="rl-card__acts">
      ${button(t('rems.markDone'), { variant: 'primary', size: 'sm', icon: 'check', attrs: `data-act="donerem" data-id="${id}"` })}
      ${button(t('action.edit'), { variant: 'outline', size: 'sm', icon: 'pencil', attrs: `data-act="editrem" data-id="${id}"` })}
      ${s.dueDate && r.alert !== false ? button(t('rems.calendar'), { variant: 'ghost', size: 'sm', icon: 'calendar-plus', attrs: `data-act="ics" data-id="${id}"` }) : ''}
    </div></article>`;
}

export function renderReminders(ctx) {
  const { S } = ctx;
  if (!S.vehicles.length) return `<div class="rl">${appBar(ctx, 'rems.title', { back: '#home' })}${noCar()}</div>`;
  const st = ctx.stats(S.cur);
  const rs = S.reminders.filter(r => r.v === S.cur).map(r => ({ r, s: ctx.rstat(r, st) })).sort((a, b) => b.s.pct - a.s.pct);
  return `<div class="rl">${appBar(ctx, 'rems.title', { back: '#home' })}
    <div class="mc-container rl-wrap">
      ${button(t('car.addReminder'), { variant: 'primary', icon: 'plus', block: true, attrs: 'data-act="addrem"' })}
      ${rs.length ? `<div class="rl-list">${rs.map(x => card(ctx, x.r, st)).join('')}</div>`
        : `<div class="mc-card">${emptyState({ icon: 'bell', title: t('rems.empty'), text: t('rems.emptyText') })}</div>`}
      <p class="mc-caption mc-muted rl-note">${icon('info')}<span>${t('rems.note')}</span></p>
    </div></div>`;
}

/** Calendar choices for one reminder (same two routes as before: .ics file or Google Calendar). */
export function openCalendarSheet(ctx, r) {
  const s = ctx.rstat(r); if (!s.dueDate) return;
  const V = ctx.veh(r.v), d = s.dueDate.replace(/-/g, ''), bd = +(r.before ?? 7) || 0;
  const ttl = (V ? vehTitle(V) + ' - ' : '') + r.name;
  const det = t('rems.calDetails') + (s.km != null ? ' — ' + fill(t('rems.calLeft'), { n: fmt(s.km) }) : '');
  const g = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(ttl) + '&dates=' + d + 'T090000/' + d + 'T093000&details=' + encodeURIComponent(det);
  const body = `<p class="mc-small mc-muted rl-cal__sum">${esc(ttl)} · ${fdate(s.dueDate)}${bd ? ` · ${fill(t('rems.calBefore'), { n: bd })}` : ''}</p>
    <div class="rl-cal">
      <div>${button(t('rems.calFile'), { variant: 'primary', icon: 'calendar-plus', block: true, attrs: `data-act="icsfile" data-id="${esc(r.id)}"` })}<p class="mc-caption mc-muted">${t('rems.calFileHint')}</p></div>
      <div><a class="mc-btn mc-btn--outline mc-btn--block" href="${esc(g)}" target="_blank" rel="noopener">${icon('calendar')}<span>${t('rems.calGoogle')}</span></a><p class="mc-caption mc-muted">${t('rems.calGoogleHint')}</p></div>
    </div>`;
  openSheet({ title: t('rems.calTitle'), body });
}
