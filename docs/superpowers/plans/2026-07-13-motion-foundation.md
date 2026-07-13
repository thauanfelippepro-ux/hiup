# Motion Foundation (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable, centralized GSAP/ScrollTrigger motion infrastructure (config, presets, declarative `data-*` attribute scanner) that all later animation phases (hero/navbar, per-section reveals, buttons/icons, mobile+audit) will consume. No section's visuals change in this phase.

**Architecture:** Three small ES modules under `src/motion/` — `config.js` (single GSAP/ScrollTrigger registration + shared motion constants), `presets.js` (pure factory functions returning `{from, to}` tween pairs, one per preset), `scan.js` (queries `data-animate*`/`data-stagger`/`data-parallax`/`data-reveal`/`data-section-animation` elements and wires each to a `ScrollTrigger`, inside `gsap.matchMedia()` so `prefers-reduced-motion: reduce` gets a completely separate, animation-free code path). `main.js` imports `config.js` for its registration side effect and calls `initMotion()` once.

**Tech Stack:** GSAP 3 (`gsap`, `gsap/ScrollTrigger`), already a project dependency. No new dependencies. Vite dev server for manual verification (project has no test runner configured — see Global Constraints).

## Global Constraints

- Preserve all existing layout, content, visual identity, and functionality — this phase adds zero visual change to any real section.
- Do not break the three existing pinned ScrollTriggers (`section4`, `team`, `process`) or the grid-overlay offset reset added previously.
- Single, central `gsap.registerPlugin(ScrollTrigger)` call — remove the duplicate call currently in `main.js`.
- `toggleActions: 'play reverse play reverse'` on every declarative reveal (enter/leave/enter-back/leave-back, not play-once).
- `prefers-reduced-motion: reduce` must produce zero `ScrollTrigger` creation and zero animation — elements set straight to final visible state via `gsap.set`.
- No flash-of-invisible-content: animated elements must never rely on CSS `opacity: 0` as their default; the "from" state is only ever applied by `gsap.set` at runtime.
- `revealText` preset is a clip-path reveal on the whole element — no word/letter DOM splitting.
- This project has no test runner (`package.json` scripts are only `dev`/`build`/`preview`). Verification steps in this plan are manual: start the Vite dev server, drive the page with the project's existing Playwright MCP tooling (or a browser), and check `getComputedStyle`/console output — the same approach already used to verify the grid-overlay and FAQ/CTA fixes earlier in this project.

---

### Task 1: Motion config module

**Files:**
- Create: `src/motion/config.js`
- Modify: `src/main.js:5-10`

**Interfaces:**
- Produces: `DURATIONS` (`{fast, base, slow}` numbers, seconds), `EASES` (`{out, inOut, emphasized}` strings), `DISTANCES` (`{sm, md, lg}` numbers, px), `STAGGER` (`{tight, base, loose}` numbers, seconds), `prefersReducedMotion()` (function, returns boolean) — all named exports from `src/motion/config.js`, consumed by Task 2 (`presets.js`) and Task 3 (`scan.js`).

- [ ] **Step 1: Create `src/motion/config.js`**

```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export const DURATIONS = {
  fast: 0.35,
  base: 0.6,
  slow: 0.9,
}

export const EASES = {
  out: 'power2.out',
  inOut: 'power2.inOut',
  emphasized: 'power3.out',
}

export const DISTANCES = {
  sm: 24,
  md: 48,
  lg: 96,
}

export const STAGGER = {
  tight: 0.05,
  base: 0.08,
  loose: 0.14,
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

- [ ] **Step 2: Remove the duplicate plugin registration in `main.js`**

In `src/main.js`, the current lines 5-10 are:

```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Swiper from 'swiper'
import { Autoplay, Pagination } from 'swiper/modules'

gsap.registerPlugin(ScrollTrigger)
```

Replace with (keep `gsap`/`ScrollTrigger` imports — the file's existing pin code still uses them directly — but drop the now-duplicate `registerPlugin` call and add the config import for its registration side effect):

```js
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Swiper from 'swiper'
import { Autoplay, Pagination } from 'swiper/modules'
import './motion/config.js'
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev` (from `hiup-site/`), open `http://localhost:5173/` in a browser, open devtools console.

Expected: no console errors, and `window.gsap.core.globals().ScrollTrigger` is defined (confirms the plugin is still registered exactly once, just from the new location). The three existing pinned sections (scroll through section4's cards, team, process) still animate exactly as before — this is a pure relocation of one line, no behavior change.

- [ ] **Step 4: Commit**

```bash
git add src/motion/config.js src/main.js
git commit -m "feat(motion): add central GSAP/ScrollTrigger config module"
```

---

### Task 2: Motion presets module

**Files:**
- Create: `src/motion/presets.js`

**Interfaces:**
- Consumes: `DURATIONS`, `EASES`, `DISTANCES`, `STAGGER` from `./config.js` (Task 1).
- Produces: named exports `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`, `scaleIn`, `blurIn`, `revealText`, `staggerGroup`, `imageReveal`, `cardReveal`, `iconPop`, `iconRotate`, `buttonReveal`, `sectionTransition` — each a function `(target, overrides = {}) => { from: object, to: object }`, consumed by Task 3 (`scan.js`).

- [ ] **Step 1: Create `src/motion/presets.js`**

```js
import { DURATIONS, EASES, DISTANCES, STAGGER } from './config.js'

function withOverrides(base, overrides = {}) {
  return {
    from: { ...base.from },
    to: {
      ...base.to,
      duration: overrides.duration ?? base.to.duration,
      delay: overrides.delay ?? base.to.delay ?? 0,
    },
  }
}

export function fadeUp(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, y: DISTANCES.md },
      to: { opacity: 1, y: 0, duration: DURATIONS.base, ease: EASES.out },
    },
    overrides,
  )
}

export function fadeDown(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, y: -DISTANCES.md },
      to: { opacity: 1, y: 0, duration: DURATIONS.base, ease: EASES.out },
    },
    overrides,
  )
}

export function fadeLeft(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, x: DISTANCES.md },
      to: { opacity: 1, x: 0, duration: DURATIONS.base, ease: EASES.out },
    },
    overrides,
  )
}

export function fadeRight(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, x: -DISTANCES.md },
      to: { opacity: 1, x: 0, duration: DURATIONS.base, ease: EASES.out },
    },
    overrides,
  )
}

export function scaleIn(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, scale: 0.85 },
      to: { opacity: 1, scale: 1, duration: DURATIONS.base, ease: EASES.emphasized },
    },
    overrides,
  )
}

export function blurIn(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, filter: 'blur(12px)' },
      to: { opacity: 1, filter: 'blur(0px)', duration: DURATIONS.slow, ease: EASES.out },
    },
    overrides,
  )
}

export function revealText(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, clipPath: 'inset(0 0 100% 0)', y: DISTANCES.sm },
      to: {
        opacity: 1,
        clipPath: 'inset(0 0 0% 0)',
        y: 0,
        duration: DURATIONS.slow,
        ease: EASES.emphasized,
      },
    },
    overrides,
  )
}

export function staggerGroup(targets, overrides = {}) {
  const base = fadeUp(targets, overrides)
  base.to.stagger = overrides.stagger ?? STAGGER.base
  return base
}

export function imageReveal(target, overrides) {
  return withOverrides(
    {
      from: { clipPath: 'inset(0 100% 0 0)' },
      to: { clipPath: 'inset(0 0% 0 0)', duration: DURATIONS.slow, ease: EASES.emphasized },
    },
    overrides,
  )
}

export function cardReveal(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, y: DISTANCES.md, scale: 0.96 },
      to: { opacity: 1, y: 0, scale: 1, duration: DURATIONS.base, ease: EASES.out },
    },
    overrides,
  )
}

export function iconPop(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, scale: 0.5, rotate: -8 },
      to: { opacity: 1, scale: 1, rotate: 0, duration: DURATIONS.fast, ease: 'back.out(2)' },
    },
    overrides,
  )
}

export function iconRotate(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, rotate: -20 },
      to: { opacity: 1, rotate: 0, duration: DURATIONS.fast, ease: EASES.out },
    },
    overrides,
  )
}

export function buttonReveal(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, y: DISTANCES.sm },
      to: { opacity: 1, y: 0, duration: DURATIONS.fast, ease: EASES.out },
    },
    overrides,
  )
}

export function sectionTransition(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, scale: 0.98 },
      to: { opacity: 1, scale: 1, duration: DURATIONS.slow, ease: EASES.inOut },
    },
    overrides,
  )
}
```

- [ ] **Step 2: Verify manually**

Run: `node -e "import('./src/motion/presets.js').then(m => console.log(Object.keys(m)))"` from `hiup-site/` (Node 18+ supports top-level dynamic `import()` in `-e` scripts; this project's `package.json` has `"type": "module"` so this resolves without extra flags).

Expected output: `[ 'fadeUp', 'fadeDown', 'fadeLeft', 'fadeRight', 'scaleIn', 'blurIn', 'revealText', 'staggerGroup', 'imageReveal', 'cardReveal', 'iconPop', 'iconRotate', 'buttonReveal', 'sectionTransition' ]` — confirms the module has no syntax errors and exports exactly the expected preset names.

- [ ] **Step 3: Commit**

```bash
git add src/motion/presets.js
git commit -m "feat(motion): add reusable animation preset factories"
```

---

### Task 3: Declarative attribute scanner

**Files:**
- Create: `src/motion/scan.js`
- Modify: `src/main.js` (add init call)

**Interfaces:**
- Consumes: all preset functions from `./presets.js` (Task 2), `DISTANCES` from `./config.js` (Task 1).
- Produces: `initMotion(root = document.body)` (function, returns the `gsap.context()` instance so callers can `.revert()` it later if needed) — the single entry point `main.js` calls.

- [ ] **Step 1: Create `src/motion/scan.js`**

```js
import gsap from 'gsap'
import { DISTANCES } from './config.js'
import * as presets from './presets.js'

const PRESET_LOOKUP = {
  'fade-up': presets.fadeUp,
  'fade-down': presets.fadeDown,
  'fade-left': presets.fadeLeft,
  'fade-right': presets.fadeRight,
  'scale-in': presets.scaleIn,
  'blur-in': presets.blurIn,
  'reveal-text': presets.revealText,
  'image-reveal': presets.imageReveal,
  'card-reveal': presets.cardReveal,
  'icon-pop': presets.iconPop,
  pop: presets.iconPop,
  rotate: presets.iconRotate,
  'button-reveal': presets.buttonReveal,
  'section-transition': presets.sectionTransition,
}

function presetNameFor(el) {
  return (
    el.dataset.animate ||
    el.dataset.animateText ||
    el.dataset.animateIcon ||
    el.dataset.reveal ||
    el.dataset.sectionAnimation
  )
}

function overridesFor(el) {
  return {
    duration: el.dataset.animateDuration ? Number(el.dataset.animateDuration) : undefined,
    delay: el.dataset.animateDelay ? Number(el.dataset.animateDelay) : undefined,
  }
}

function makeScrollTrigger(trigger) {
  return {
    trigger,
    start: 'top 85%',
    end: 'bottom 15%',
    toggleActions: 'play reverse play reverse',
  }
}

function bindStaggerContainers(root, motionReduced, handled) {
  root.querySelectorAll('[data-stagger]').forEach((container) => {
    const presetName = container.dataset.animate || 'fade-up'
    const preset = PRESET_LOOKUP[presetName]
    if (!preset) {
      console.warn(`[motion] Unknown stagger preset "${presetName}" on`, container)
      return
    }

    const children = Array.from(container.children)
    if (!children.length) return
    children.forEach((child) => handled.add(child))

    if (motionReduced) {
      gsap.set(children, { clearProps: 'all' })
      return
    }

    const stagger = container.dataset.stagger ? Number(container.dataset.stagger) : undefined
    const { from, to } = preset(children, { stagger })
    gsap.set(children, from)
    gsap.to(children, { ...to, scrollTrigger: makeScrollTrigger(container) })
  })
}

function bindSingleReveals(root, motionReduced, handled) {
  const selector = [
    '[data-animate]',
    '[data-animate-text]',
    '[data-animate-icon]',
    '[data-reveal]',
    '[data-section-animation]',
  ].join(',')

  root.querySelectorAll(selector).forEach((el) => {
    if (handled.has(el)) return

    const presetName = presetNameFor(el)
    const preset = PRESET_LOOKUP[presetName]
    if (!preset) {
      console.warn(`[motion] Unknown preset "${presetName}" on`, el)
      return
    }

    if (motionReduced) {
      gsap.set(el, { clearProps: 'all' })
      return
    }

    const { from, to } = preset(el, overridesFor(el))
    gsap.set(el, from)
    gsap.to(el, { ...to, scrollTrigger: makeScrollTrigger(el) })
  })
}

function bindParallax(root, motionReduced) {
  if (motionReduced) return // parallax is fully disabled under reduced motion

  root.querySelectorAll('[data-parallax]').forEach((el) => {
    const intensity = el.dataset.parallax ? Number(el.dataset.parallax) : 0.2
    const clamped = Math.min(Math.max(intensity, 0), 1)
    const distance = DISTANCES.lg * clamped

    gsap.fromTo(
      el,
      { y: -distance },
      {
        y: distance,
        ease: 'none',
        scrollTrigger: {
          trigger: el,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.5,
        },
      },
    )
  })
}

export function initMotion(root = document.body) {
  // Wrapping in gsap.context gives callers a single .revert() that tears
  // down every ScrollTrigger and tween this module created — not used yet
  // in Phase 1 (the page never unmounts), but required so later phases
  // (or a future SPA-style route change) can clean up without leaks.
  return gsap.context(() => {
    const mm = gsap.matchMedia()

    mm.add(
      {
        motionOK: '(prefers-reduced-motion: no-preference)',
        motionReduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { motionReduced } = context.conditions
        const handled = new Set()

        bindStaggerContainers(root, motionReduced, handled)
        bindSingleReveals(root, motionReduced, handled)
        bindParallax(root, motionReduced)
      },
    )
  }, root)
}
```

- [ ] **Step 2: Wire into `main.js`**

In `src/main.js`, after the `import './motion/config.js'` line added in Task 1 Step 2, add:

```js
import { initMotion } from './motion/scan.js'
```

Then, immediately after the existing font-refresh block (the `if (document.fonts && document.fonts.ready) { ... }` block), add:

```js
initMotion()
```

- [ ] **Step 3: Verify manually — reduced motion produces zero ScrollTriggers**

Run: `npm run dev`, open the page, then in devtools console with `prefers-reduced-motion: reduce` emulated (devtools → Rendering tab → "Emulate CSS media feature prefers-reduced-motion" → reduce), run:

```js
document.body.setAttribute('data-animate', 'fade-up')
```

then reload the page with the emulation still active, and run:

```js
ScrollTrigger.getAll().length
```

Expected: `3` (only the pre-existing `section4`/`team`/`process` pins — confirms `initMotion` created zero additional `ScrollTrigger`s under reduced motion, and `document.body`'s computed `opacity` is `1`, not `0`).

- [ ] **Step 4: Verify manually — normal motion creates and reverses correctly**

With reduced-motion emulation turned back off, reload, then in console:

```js
const el = document.querySelector('.faq__label')
el.setAttribute('data-animate', 'fade-up')
location.reload()
```

After reload, run:

```js
ScrollTrigger.getAll().length
```

Expected: `4` (the 3 existing pins + 1 new reveal trigger for `.faq__label`). Then scroll the FAQ label out of view and back into view (e.g. `window.scrollTo(0, 0)` then scroll down to it) and confirm via a screenshot or `getComputedStyle(el).opacity` that it fades out near `0` when scrolled past, and back to `1` when scrolled back into view — confirming `toggleActions: 'play reverse play reverse'` fires all four states.

Remove the temporary `data-animate="fade-up"` test attribute from `.faq__label` before moving on (it was only added via the console for this check, not committed to any file).

- [ ] **Step 5: Commit**

```bash
git add src/motion/scan.js src/main.js
git commit -m "feat(motion): add declarative data-attribute animation scanner"
```

---

### Task 4: Final Phase 1 regression check

**Files:** none (verification only)

**Interfaces:** none (this task consumes Tasks 1-3's finished code as a whole; produces nothing new)

- [ ] **Step 1: Build check**

Run: `npm run build` (from `hiup-site/`)

Expected: build completes with no errors (confirms no syntax mistakes across the three new modules and the `main.js` edits).

- [ ] **Step 2: Full-page scroll regression**

Run: `npm run dev`, open the page, and scroll from top to bottom in small increments (matches the verification approach already used earlier in this project for the grid-overlay fix). Confirm:
- The three pinned sections (section4 cards, team, process cards) still animate exactly as before.
- The grid-overlay background pattern still resets to `transform: none` after the last pin (`process`), with no stray offset or extra empty scroll space at the end of the page.
- No console errors or warnings (aside from any intentional `[motion] Unknown preset` warnings, which should be zero since Phase 1 adds no `data-*` attributes to any real markup).

- [ ] **Step 3: Commit (if Step 2 required any fixes)**

Only run this if Step 2 uncovered a regression that needed a code fix:

```bash
git add -A
git commit -m "fix(motion): resolve regression found in Phase 1 verification"
```
