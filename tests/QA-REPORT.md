# سيارتي · My Car — Design System QA Report

**Branch:** `design-system` (not merged, not deployed)
**Date:** 2026-11-25
**Result:** Design system **224/224** · Live app regression **15/15** · Console/network issues **0**

## How to run
```bash
python3 -m http.server 8766          # from the repo root
node tests/run-ds-tests.mjs           # design system (needs Playwright + Chromium)
node tests/run-app-regression.mjs     # live app (index.html)
```

## Design system — 224/224
| Area | Result | Coverage |
|---|---|---|
| Render | 60/60 | 3 viewports × AR/EN × light/dark: direction, theme, all 11 sections, fonts, every icon present in the sprite |
| Responsive | 38/38 | Phone 390 / tablet 820 / desktop 1440: no horizontal overflow, touch targets ≥36px; bottom nav < 900px, side rail ≥ 900px on the reading-start side (right in AR, left in EN) |
| Keyboard | 32/32 | Menus: Enter opens on the selected item, arrows/Home/End with wrap-around, Esc closes and returns focus, Tab and outside click close, menu stays on screen. Sheets: focus trapped, Esc and Back close, focus returns to opener. Confirm dialog is `alertdialog` with focus on confirm |
| Buttons | 40/40 | 6 variants × 2 themes: visible focus ring ≥3:1, disabled and loading fire 0 clicks, spinner animates, hover gated by `(hover:hover)` |
| Contrast | 38/38 | Control borders (input, select, textarea, search, switch, checkbox, outline button) ≥3:1 on their real backgrounds; all text tokens ≥4.5:1 in both themes |
| Validation | 10/10 | Error: `aria-invalid` + `aria-describedby` → `role=alert`, states both readings and the fix; warning is non-blocking (`role=status`); `parseNum` reads Arabic/Persian digits |
| Code | 6/6 | No duplicate selectors or declaration blocks, no unused or undefined `mc-*` classes, no `light-dark()`, no physical left/right spacing |

## Live app regression — 15/15
Sample data, add fill-up with auto total, persistence after reload, all 5 tabs, delete + undo, reminder → `.ics`, backup `.json`, CSV export, add category; the app loads none of the design-system files.
All 9 tracked app files (`index.html`, `sw.js`, `manifest.webmanifest`, `README.md`, `.nojekyll`, 4 icons) are byte-identical to `main`.

## Changes made during QA
| Change | Before | After |
|---|---|---|
| Light secondary text `--ink-450` (approved) | `#777F8C` — 3.74:1 on bg, 4.04:1 on surface | `#6A717D` — 4.55:1 on bg, 4.92:1 on surface |
| Light focus ring `--color-focus` | `#E98230` — 2.52:1 | `#A85512` — 5.3:1 |
| Light control border `--color-border-control` | `#8B929D` — 2.90:1 on bg | `#868D98` — 3.09:1 on bg |
| Duplicate CSS | 10 repeated rule blocks, 1 unused class | merged; removed |

Dark-mode secondary text is unchanged (`#9BA3AF`: 7.30 / 6.49 / 5.59 :1 on bg / surface / elevated). No other approved color changed.

## Open items (not blocking approval)
1. `sw.js` serves same-origin CSS/JS cache-first; when screens adopt the design system, the cache name must be versioned so updates reach users.
2. On desktop the content column stays 720px wide; wide layouts are decided per screen.
3. Tested in Chromium only. Real-device checks still needed: iOS Safari, VoiceOver and TalkBack.
