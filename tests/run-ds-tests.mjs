// سيارتي · My Car — design-system QA suite
// Usage:  python3 -m http.server 8766   (from the repo root)
//         node tests/run-ds-tests.mjs [playwright-module-path]
// Needs Playwright (Chromium). Nothing here is shipped to users.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.argv[2] || 'playwright');

const BASE = process.env.BASE || 'http://localhost:8766';
const OUT = process.env.OUT || '/tmp/qa';
fs.mkdirSync(OUT, { recursive: true });
const results = []; const consoleIssues = [];
const ok = (area, name, pass, detail = '') => { results.push({ area, name, pass: !!pass, detail }); };
const LANGS = ['ar', 'en'], THEMES = ['light', 'dark'];
const VIEWPORTS = { phone: { width: 390, height: 844 }, tablet: { width: 820, height: 1180 }, desktop: { width: 1440, height: 900 } };

// --- color helpers (run in Node) ---
const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] ?? 1 }; };
const blend = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const lum = c => { const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const browser = await chromium.launch();
async function page(url, vp = VIEWPORTS.phone, tag = '') {
  const p = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
  p.on('pageerror', e => consoleIssues.push(`[${tag}] pageerror: ${e.message}`));
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) consoleIssues.push(`[${tag}] console.${m.type()}: ${m.text()}`); });
  p.on('requestfailed', r => consoleIssues.push(`[${tag}] request failed: ${r.url()}`));
  p.on('response', r => { if (r.status() >= 400) consoleIssues.push(`[${tag}] HTTP ${r.status()}: ${r.url()}`); });
  await p.goto(url); await p.waitForTimeout(600); await p.evaluate(() => document.fonts.ready);
  return p;
}

/* 1 + 2 — every component, both languages, both themes, three viewports */
const sprite = fs.readFileSync(new URL('../assets/icons/lucide-sprite.svg', import.meta.url), 'utf8');
const spriteIds = new Set([...sprite.matchAll(/id="([^"]+)"/g)].map(m => m[1]));
for (const [vpName, vp] of Object.entries(VIEWPORTS)) for (const lang of LANGS) for (const theme of THEMES) {
  const tag = `${vpName}/${lang}/${theme}`;
  const p = await page(`${BASE}/design-system.html?lang=${lang}&theme=${theme}`, vp, tag);
  const info = await p.evaluate(() => ({
    dir: document.documentElement.dir, theme: document.documentElement.dataset.theme,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    icons: [...document.querySelectorAll('use')].map(u => u.getAttribute('href').split('#')[1]),
    fonts: [...document.fonts].filter(f => f.status === 'loaded').length,
    sections: [...document.querySelectorAll('.ds-sec')].length,
    // elements wider than the viewport
    wide: [...document.querySelectorAll('.mc-container *')].filter(el => el.getBoundingClientRect().right > innerWidth + 1 || el.getBoundingClientRect().left < -1).slice(0, 5).map(el => el.className.toString().slice(0, 40)),
    smallTargets: [...document.querySelectorAll('.mc-btn,.mc-iconbtn,.mc-fab,.mc-chip,.mc-menu__item,.mc-navitem,.mc-seg button')].filter(el => el.offsetParent && el.getBoundingClientRect().height < 36).length
  }));
  ok('Render', `${tag}: direction`, info.dir === (lang === 'ar' ? 'rtl' : 'ltr'), info.dir);
  ok('Render', `${tag}: theme applied`, info.theme === theme, info.theme);
  ok('Render', `${tag}: all 11 sections rendered`, info.sections === 11, String(info.sections));
  ok('Responsive', `${tag}: no horizontal overflow`, info.overflow <= 0 && !info.wide.length, info.overflow + 'px ' + info.wide.join('|'));
  ok('Responsive', `${tag}: touch targets ≥ 36px`, info.smallTargets === 0, String(info.smallTargets));
  const missing = [...new Set(info.icons)].filter(i => !spriteIds.has(i));
  ok('Render', `${tag}: every icon exists in sprite`, !missing.length, missing.join(','));
  ok('Render', `${tag}: fonts loaded`, info.fonts >= 4, String(info.fonts));
  if (vpName === 'phone' || lang === 'ar') await p.screenshot({ path: `${OUT}/full-${vpName}-${lang}-${theme}.png`, fullPage: true });
  await p.close();
}

/* 2b — app shell: bottom nav on phone/tablet, side rail on desktop */
for (const [vpName, vp] of Object.entries(VIEWPORTS)) for (const lang of LANGS) {
  const tag = `layout/${vpName}/${lang}`;
  const p = await page(`${BASE}/tests/fixtures/layout.html?lang=${lang}&theme=light`, vp, tag);
  const r = await p.evaluate(() => {
    const vis = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    const rail = document.getElementById('rail').getBoundingClientRect();
    return { rail: vis('rail'), bottom: vis('bottom'), railSide: rail.left < 10 ? 'left' : rail.right > innerWidth - 10 ? 'right' : 'none', overflow: document.documentElement.scrollWidth - innerWidth };
  });
  const wantRail = vp.width >= 900;
  ok('Responsive', `${tag}: ${wantRail ? 'side rail' : 'bottom nav'} shown`, r.rail === wantRail && r.bottom === !wantRail, JSON.stringify(r));
  if (wantRail) ok('Responsive', `${tag}: rail on the reading-start side`, r.railSide === (lang === 'ar' ? 'right' : 'left'), r.railSide);
  ok('Responsive', `${tag}: no horizontal overflow`, r.overflow <= 0, r.overflow + 'px');
  await p.screenshot({ path: `${OUT}/layout-${vpName}-${lang}.png` });
  await p.close();
}

/* 3 — keyboard: menus */
for (const lang of LANGS) {
  const tag = `menu/${lang}`;
  const p = await page(`${BASE}/design-system.html?lang=${lang}&theme=light`, VIEWPORTS.phone, tag);
  await p.focus('[data-mc-menu="m-view"]');
  await p.keyboard.press('Enter'); await p.waitForTimeout(150);
  let s = await p.evaluate(() => ({ open: !document.getElementById('m-view').hidden, exp: document.querySelector('[data-mc-menu="m-view"]').getAttribute('aria-expanded'), focus: document.activeElement.getAttribute('aria-checked'), role: document.activeElement.getAttribute('role') }));
  ok('Keyboard', `${tag}: Enter opens menu, aria-expanded=true`, s.open && s.exp === 'true', JSON.stringify(s));
  ok('Keyboard', `${tag}: focus moves to the selected item`, s.focus === 'true' && s.role === 'menuitemradio', JSON.stringify(s));
  const label = () => p.evaluate(() => document.activeElement.textContent.trim());
  const first = await label(); await p.keyboard.press('ArrowDown'); const second = await label();
  ok('Keyboard', `${tag}: ArrowDown moves to next item`, first !== second, `${first} → ${second}`);
  await p.keyboard.press('End'); const last = await label(); await p.keyboard.press('ArrowDown'); const wrapped = await label();
  await p.keyboard.press('Home'); const home = await label();
  ok('Keyboard', `${tag}: End / Home / wrap-around`, last === 'English' && wrapped === home, `${last} → ${wrapped}, home=${home}`);
  await p.keyboard.press('ArrowUp'); const up = await label();
  ok('Keyboard', `${tag}: ArrowUp wraps to last`, up === last, up);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  s = await p.evaluate(() => ({ open: !document.getElementById('m-view').hidden, onTrigger: document.activeElement.dataset.mcMenu === 'm-view', exp: document.querySelector('[data-mc-menu="m-view"]').getAttribute('aria-expanded') }));
  ok('Keyboard', `${tag}: Escape closes and returns focus to trigger`, !s.open && s.onTrigger && s.exp === 'false', JSON.stringify(s));
  // choose "Dark" with keyboard
  await p.keyboard.press('Enter'); await p.waitForTimeout(100);
  await p.keyboard.press('Home'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
  s = await p.evaluate(() => ({ theme: document.documentElement.dataset.theme, open: !document.getElementById('m-view').hidden }));
  ok('Keyboard', `${tag}: Enter on item selects it and closes`, s.theme === 'dark' && !s.open, JSON.stringify(s));
  // Tab closes; outside click closes
  await p.focus('[data-mc-menu="m-view"]'); await p.keyboard.press('Enter'); await p.waitForTimeout(100); await p.keyboard.press('Tab'); await p.waitForTimeout(100);
  ok('Keyboard', `${tag}: Tab closes menu`, await p.evaluate(() => document.getElementById('m-view').hidden));
  await p.click('[data-mc-menu="m-view"]'); await p.waitForTimeout(100); await p.mouse.click(5, 600); await p.waitForTimeout(100);
  ok('Keyboard', `${tag}: click outside closes menu`, await p.evaluate(() => document.getElementById('m-view').hidden));
  // menu stays within viewport
  await p.click('[data-mc-menu="m-view"]'); await p.waitForTimeout(150);
  const box = await p.evaluate(() => { const r = document.getElementById('m-view').getBoundingClientRect(); return { l: r.left, r: r.right, w: innerWidth }; });
  ok('Keyboard', `${tag}: open menu stays inside the screen`, box.l >= 0 && box.r <= box.w, JSON.stringify(box));
  await p.keyboard.press('Escape');
  // sheet: Esc + focus trap + back
  await p.click('[data-demo="sheet"]'); await p.waitForTimeout(350);
  const inSheet = () => p.evaluate(() => !!document.activeElement.closest('.mc-scrim'));
  ok('Keyboard', `${tag}: sheet opens with focus inside`, await inSheet());
  for (let i = 0; i < 12; i++) await p.keyboard.press('Tab');
  ok('Keyboard', `${tag}: Tab stays trapped inside sheet`, await inSheet());
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  s = await p.evaluate(() => ({ open: !!document.querySelector('.mc-scrim'), back: document.activeElement.dataset.demo }));
  ok('Keyboard', `${tag}: Escape closes sheet, focus returns to opener`, !s.open && s.back === 'sheet', JSON.stringify(s));
  await p.click('[data-demo="sheet"]'); await p.waitForTimeout(300); await p.goBack(); await p.waitForTimeout(300);
  ok('Keyboard', `${tag}: browser/Android Back closes sheet`, !(await p.evaluate(() => !!document.querySelector('.mc-scrim'))));
  // confirm dialog via "More examples" menu
  await p.click('[data-mc-menu="m-demo"]'); await p.waitForTimeout(100); await p.click('#m-demo [data-action="dialog"]'); await p.waitForTimeout(350);
  s = await p.evaluate(() => ({ role: document.querySelector('.mc-scrim [role]')?.getAttribute('role'), focusOk: document.activeElement.hasAttribute('data-mc-ok') }));
  ok('Keyboard', `${tag}: confirm dialog is alertdialog with focus on confirm`, s.role === 'alertdialog' && s.focusOk, JSON.stringify(s));
  await p.keyboard.press('Enter'); await p.waitForTimeout(350);
  ok('Keyboard', `${tag}: confirming shows toast with Undo`, (await p.evaluate(() => document.querySelector('.mc-toast-region')?.textContent || '')).length > 0);
  await p.close();
}

/* 4 — button states: focus ring, disabled, loading (every variant, both themes) */
for (const theme of THEMES) {
  const tag = `buttons/${theme}`;
  const p = await page(`${BASE}/design-system.html?lang=en&theme=${theme}`, VIEWPORTS.desktop, tag);
  const r = await p.evaluate(() => {
    const host = document.createElement('div'); host.id = 'qa-btns'; document.getElementById('app').appendChild(host);
    const V = ['primary', 'tonal', 'outline', 'ghost', 'danger', ''];
    host.innerHTML = V.map(v => `<button class="mc-btn ${v && 'mc-btn--' + v}" data-v="${v || 'secondary'}" data-s="default">A</button><button class="mc-btn ${v && 'mc-btn--' + v}" data-v="${v || 'secondary'}" data-s="disabled" disabled>A</button><button class="mc-btn ${v && 'mc-btn--' + v}" data-v="${v || 'secondary'}" data-s="busy" aria-busy="true"><svg class="mc-icon"></svg>A</button>`).join('');
    window.__clicks = 0; host.addEventListener('click', e => { if (e.target.closest('button')) window.__clicks++; });
    return V.length;
  });
  const variants = await p.$$eval('#qa-btns [data-s="default"]', els => els.map(e => e.dataset.v));
  for (const v of variants) {
    const sel = `#qa-btns [data-v="${v}"]`;
    await p.focus(`${sel}[data-s="default"]`); await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Tab'); await p.waitForTimeout(250); // let the 120ms transition finish
    const f = await p.$eval(`${sel}[data-s="default"]`, el => ({ sh: getComputedStyle(el).boxShadow, focused: el.matches(':focus-visible'), bg: getComputedStyle(document.body).backgroundColor }));
    const ringColor = (f.sh.match(/rgba?\([^)]+\)/g) || [])[1];
    const ringC = ringColor ? contrast(parse(ringColor), parse(f.bg)) : 0;
    ok('Buttons', `${theme}/${v}: keyboard focus ring visible (≥3:1 vs page)`, f.focused && ringC >= 3, `ring ${ringColor} ${ringC.toFixed(2)}:1`);
    const d = await p.$eval(`${sel}[data-s="disabled"]`, el => { const cs = getComputedStyle(el); return { cursor: cs.cursor, fg: cs.color, bg: cs.backgroundColor }; });
    await p.click(`${sel}[data-s="disabled"]`, { force: true }).catch(() => {});
    ok('Buttons', `${theme}/${v}: disabled — not clickable, not-allowed cursor`, d.cursor === 'not-allowed', `${d.fg} on ${d.bg}`);
    const b = await p.$eval(`${sel}[data-s="busy"]`, el => { const cs = getComputedStyle(el); const ic = getComputedStyle(el.querySelector('.mc-icon')); return { pe: cs.pointerEvents, cursor: cs.cursor, anim: ic.animationName }; });
    await p.click(`${sel}[data-s="busy"]`, { force: true }).catch(() => {});
    ok('Buttons', `${theme}/${v}: loading — spinner animates, clicks blocked`, b.pe === 'none' && b.anim === 'mc-spin', JSON.stringify(b));
  }
  // text color of each variant comes from its token (not inherited from the page)
  const fg = await p.evaluate(() => {
    const tok = n => { const x = document.createElement('i'); x.style.color = `var(${n})`; document.body.appendChild(x); const c = getComputedStyle(x).color; x.remove(); return c; };
    const want = { primary: '--color-on-primary', tonal: '--color-primary-text', ghost: '--color-primary-text', danger: '--color-danger-text', outline: '--color-text', secondary: '--color-text' };
    return Object.entries(want).map(([v, n]) => ({ v, got: getComputedStyle(document.querySelector(`#qa-btns [data-v="${v}"][data-s="default"]`)).color, want: tok(n) }));
  });
  for (const f of fg) ok('Buttons', `${theme}/${f.v}: text uses its variant color`, f.got === f.want, `${f.got} vs ${f.want}`);
  const clicks = await p.evaluate(() => window.__clicks);
  ok('Buttons', `${theme}: disabled + loading buttons fired 0 clicks`, clicks === 0, String(clicks));
  // hover only applies on hover-capable devices
  const hoverRule = await p.evaluate(() => [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => r.media && /hover:\s*hover/.test(r.media.mediaText) && /\.mc-btn:hover/.test(r.cssText)); } catch (e) { return false; } }));
  ok('Buttons', `${theme}: hover styles gated by (hover:hover)`, hoverRule);
  await p.close();
}

/* 5 — contrast: control borders against their real backgrounds, and text tokens */
for (const theme of THEMES) {
  const p = await page(`${BASE}/design-system.html?lang=en&theme=${theme}`, VIEWPORTS.phone, `contrast/${theme}`);
  const ctl = await p.evaluate(() => {
    const out = [];
    const bgOf = el => { let n = el.parentElement; while (n) { const c = getComputedStyle(n).backgroundColor; if (c && !/rgba\(0, 0, 0, 0\)|transparent/.test(c)) return c; n = n.parentElement; } return getComputedStyle(document.body).backgroundColor; };
    const pick = (sel, name) => { const el = document.querySelector(sel); if (!el) return; const cs = getComputedStyle(el); out.push({ name, border: cs.borderTopColor, fill: cs.backgroundColor, around: bgOf(el) }); };
    pick('#f-l', 'text input'); pick('#f-t', 'select'); pick('#f-n', 'textarea'); pick('.mc-inputgroup input[type=search]', 'search');
    pick('.mc-switch input:not(:checked)', 'switch (off)'); pick('.mc-check input:not(:checked)', 'checkbox (off)'); pick('.mc-btn--outline', 'outline button');
    return out;
  });
  for (const c of ctl) {
    const b = parse(c.border), around = parse(c.around), fill = parse(c.fill);
    const fillSolid = fill && fill.a > 0 ? blend(fill, around) : around;
    const vsFill = contrast(blend(b, fillSolid), fillSolid), vsAround = contrast(blend(b, around), around);
    ok('Contrast', `${theme}: ${c.name} border ≥3:1 (WCAG 1.4.11)`, Math.max(vsFill, vsAround) >= 3, `vs field ${vsFill.toFixed(2)}:1 · vs surface ${vsAround.toFixed(2)}:1`);
  }
  const txt = await p.evaluate(() => {
    const v = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const toRgb = c => { const x = document.createElement('div'); x.style.color = c; document.body.appendChild(x); const r = getComputedStyle(x).color; x.remove(); return r; };
    const pairs = [['--color-text', '--color-bg'], ['--color-text', '--color-surface'], ['--color-text', '--color-surface-elevated'], ['--color-text-secondary', '--color-bg'], ['--color-text-secondary', '--color-surface'], ['--color-text-secondary', '--color-surface-elevated'],
      ['--color-primary-text', '--color-surface'], ['--color-primary-text', '--color-bg'], ['--color-on-primary', '--color-primary'], ['--color-success-text', '--color-surface'], ['--color-warning-text', '--color-surface'], ['--color-danger-text', '--color-surface'], ['--color-info-text', '--color-surface']];
    return pairs.map(([f, b]) => ({ f, b, fc: toRgb(v(f)), bc: toRgb(v(b)) }));
  });
  for (const t of txt) { const c = contrast(parse(t.fc), parse(t.bc)); ok('Contrast', `${theme}: ${t.f} on ${t.b} ≥4.5:1`, c >= 4.5, `${c.toFixed(2)}:1`); }
  await p.close();
}

/* 6 — validation messages + number parsing */
for (const lang of LANGS) {
  const p = await page(`${BASE}/design-system.html?lang=${lang}&theme=light`, VIEWPORTS.phone, `validation/${lang}`);
  const e = await p.evaluate(() => {
    const err = document.getElementById('v-e'), warn = document.getElementById('v-w');
    const msg = el => document.getElementById(el.getAttribute('aria-describedby'));
    return { errInvalid: err.getAttribute('aria-invalid'), errRole: msg(err)?.getAttribute('role'), errText: msg(err)?.textContent.trim(), errAction: !!msg(err)?.querySelector('button.mc-link'),
      errBorder: getComputedStyle(err).borderTopColor, warnInvalid: warn.getAttribute('aria-invalid'), warnRole: msg(warn)?.getAttribute('role'), warnText: msg(warn)?.textContent.trim() };
  });
  ok('Validation', `${lang}: error field aria-invalid + aria-describedby → role=alert`, e.errInvalid === 'true' && e.errRole === 'alert');
  ok('Validation', `${lang}: error message states cause, values and fix`, /78,450/.test(e.errText) && /79,072/.test(e.errText) && e.errAction, e.errText);
  ok('Validation', `${lang}: error border uses danger color`, /239, 98, 98/.test(e.errBorder), e.errBorder);
  ok('Validation', `${lang}: warning is non-blocking (no aria-invalid, role=status)`, e.warnInvalid === null && e.warnRole === 'status', e.warnText);
  const parsed = await p.evaluate(() => [['١٢٫٥', 12.5], ['۳۵.۴۷', 35.47], ['٧٩٠٧٢', 79072], ['0.233', 0.233], ['12,5', 12.5], ['abc', NaN], ['', NaN]].map(([i, want]) => { const got = window.__mcParse(i); return { i, got, pass: Number.isNaN(want) ? Number.isNaN(got) : got === want }; }));
  ok('Validation', `${lang}: parseNum accepts Arabic/Persian digits`, parsed.every(x => x.pass), JSON.stringify(parsed.filter(x => !x.pass)));
  await p.close();
}

/* 7 — duplicate / dead CSS */
{
  const css = ['tokens', 'components'].map(f => fs.readFileSync(new URL(`../css/${f}.css`, import.meta.url), 'utf8')).join('\n').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; const re = /([^{}@]+)\{([^{}]*)\}/g; let m;
  // strip @font-face and @keyframes bodies, then collect top-level + media rules with their media context
  const flat = css.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/@keyframes[^{]+\{([^{}]*\{[^}]*\})+\s*\}/g, '');
  let media = '';
  const blocks = flat.split(/(@media[^{]+\{)/);
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].startsWith('@media')) { media = blocks[i]; continue; }
    while ((m = re.exec(blocks[i]))) rules.push({ sel: m[1].trim().replace(/\s+/g, ' '), body: m[2].trim(), media });
    media = '';
  }
  const seen = new Map(), dupSel = [];
  for (const r of rules) { const k = r.media + '|' + r.sel; if (seen.has(k)) dupSel.push(r.sel); else seen.set(k, r); }
  ok('Code', 'no selector defined twice in the same context', !dupSel.length, dupSel.join(' · '));
  const bodies = new Map(), dupBody = [];
  for (const r of rules) { const b = r.body.split(';').map(s => s.trim()).filter(Boolean).sort().join(';'); if (b.length < 40) continue; if (bodies.has(b) && bodies.get(b) !== r.sel) dupBody.push(`${bodies.get(b)} = ${r.sel}`); else bodies.set(b, r.sel); }
  ok('Code', 'no identical declaration blocks under different selectors', !dupBody.length, dupBody.join(' · '));
  // classes defined vs used
  const defined = new Set([...css.matchAll(/\.(mc-[a-z0-9_-]+)/g)].map(x => x[1]));
  const src = ['design-system.html', 'js/ui.js', 'tests/fixtures/layout.html'].map(f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8')).join('\n');
  const used = new Set([...src.replace(/data-mc-[a-z-]+/g, '').matchAll(/mc-[a-z0-9_-]+/g)].map(x => x[0]));
  const dynamic = [...src.matchAll(/mc-([a-z]+)--\$\{|mc-tone-\$\{|mc-icon--\$\{|mc-icontile--\$\{|mc-btn--\$\{|mc-field--\$\{/g)].length;
  const prefixUsed = c => [...used].some(u => c.startsWith(u) || u.startsWith(c)) || /--(sm|lg|xl|primary|tonal|outline|ghost|danger|block|error|warning|filled|up|dir|compact|elevated|flush)$/.test(c) || /^mc-tone-/.test(c);
  const unused = [...defined].filter(c => !used.has(c) && !prefixUsed(c));
  ok('Code', 'every mc-* class in CSS is used by the kit or showcase', !unused.length, unused.join(', ') + (dynamic ? ` (dynamic builders: ${dynamic})` : ''));
  const undef = [...used].filter(c => !defined.has(c) && !/^mc-(tone|sheet-title|lang|theme|menu)$/.test(c) && !/^mc-sheet-title/.test(c) && !c.endsWith('-'));
  ok('Code', 'every mc-* class used is defined in CSS', !undef.length, undef.join(', '));
  ok('Code', 'no light-dark() (unsupported before iOS 17.5)', !/light-dark\(/.test(css));
  ok('Code', 'no physical left/right margins or paddings in components', !/(margin|padding)-(left|right)\s*:|(?<![-\w])(left|right)\s*:/.test(fs.readFileSync(new URL('../css/components.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/background-position:[^;]+;/g, '')));
}

await browser.close();

/* report */
const byArea = {};
for (const r of results) (byArea[r.area] ||= []).push(r);
let failed = 0;
for (const [a, rs] of Object.entries(byArea)) {
  const f = rs.filter(r => !r.pass); failed += f.length;
  console.log(`\n## ${a}: ${rs.length - f.length}/${rs.length} passed`);
  for (const r of f) console.log(`  ✗ ${r.name} — ${r.detail}`);
}
const uniqConsole = [...new Set(consoleIssues)];
console.log(`\n## Console / network: ${uniqConsole.length} issue(s)`); uniqConsole.forEach(c => console.log('  ' + c));
console.log(`\nTOTAL: ${results.length - failed}/${results.length} passed`);
fs.writeFileSync(`${OUT}/results.json`, JSON.stringify({ results, console: uniqConsole }, null, 2));
process.exit(failed || uniqConsole.length ? 1 : 0);
