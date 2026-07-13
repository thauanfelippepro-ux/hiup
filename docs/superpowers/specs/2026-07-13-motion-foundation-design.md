# Motion Foundation (Phase 1 of the site-wide animation system)

## Context

The user asked for a complete entrance/exit/interaction animation system across
the whole site (hero timeline, navbar behavior, per-section text/card/icon
reveals, button microinteractions, mobile tuning, reduced-motion support, full
audit). That request is too large for one spec or one implementation pass — the
site currently has almost no general animation system (the only existing GSAP
usage is the three pinned-scroll sections — `section4`, `team`, `process` —
plus a cursor-follow spotlight and carousel caption fades).

This spec covers **Phase 1 only: the reusable motion infrastructure**. No
section's visuals change in this phase. Later phases (hero/navbar, per-section
reveals, button/icon microinteractions, mobile + audit) will consume what's
built here.

## Goals

- One place to register GSAP/ScrollTrigger and hold shared motion constants
  (durations, eases, distances, stagger) so later phases don't invent their own
  numbers.
- A declarative, attribute-driven reveal system (`data-animate`,
  `data-animate-text`, `data-animate-icon`, `data-stagger`, `data-parallax`,
  `data-reveal`, `data-section-animation`) so future sections can opt into
  animation by adding an attribute in HTML, without new JS per section.
- Correct enter/leave/enter-back/leave-back behavior on every reveal (matches
  the user's explicit requirement: elements must re-animate on scroll-back, not
  just play once).
- Full `prefers-reduced-motion` support: a separate code path, not a tweaked
  version of the animated path.
- No flash-of-invisible-content if JS fails or is slow.

## Non-goals (deferred to later phases)

- Applying any preset to any real section (Phase 2+).
- Hero intro timeline, navbar scroll behavior (Phase 2).
- Word/letter-level text splitting for `revealText` (see constraint below) —
  Phase 1 ships line-level clip-reveal only.
- Icon SVG draw-on / progressive fill, button microinteractions, card-specific
  choreography (Phase 4+).
- Mobile-specific tuning beyond a working `matchMedia` scaffold (Phase 5).

## Architecture

New folder `src/motion/`:

- **`config.js`** — calls `gsap.registerPlugin(ScrollTrigger)` exactly once.
  Exports:
  - `DURATIONS` (`fast`, `base`, `slow`)
  - `EASES` (`out`, `inOut`, `emphasized`)
  - `DISTANCES` (`sm`, `md`, `lg` — px offsets for translate-based presets)
  - `STAGGER` (`tight`, `base`, `loose`)
  - `prefersReducedMotion()` — reads the media query live (not cached at
    import time, so devtools emulation toggles work without reload)

- **`presets.js`** — one factory function per preset listed in the user's
  brief: `fadeUp`, `fadeDown`, `fadeLeft`, `fadeRight`, `scaleIn`, `blurIn`,
  `revealText`, `staggerGroup`, `imageReveal`, `cardReveal`, `iconPop`,
  `buttonReveal`, `sectionTransition`. Each function takes a target (element or
  array) and an optional overrides object, and returns a `{ from, to }` tween
  pair built from the `config.js` constants — it does not create a
  `ScrollTrigger` itself. This keeps presets testable/reusable independently of
  how they get triggered (declarative scan, or a hand-written timeline in a
  later phase).

- **`scan.js`** — the declarative engine. On init:
  1. Runs everything inside one `gsap.context(() => { ... }, document.body)`
     for a single, clean `.revert()` if ever needed (HMR, future SPA nav).
  2. Uses `gsap.matchMedia()` with two buckets:
     - `(prefers-reduced-motion: no-preference)`: queries every
       `[data-animate]`, `[data-animate-text]`, `[data-animate-icon]`,
       `[data-stagger]`, `[data-parallax]`, `[data-reveal]`,
       `[data-section-animation]` element, resolves the preset from its
       attribute value + `presets.js`, and wires a `ScrollTrigger` per element
       (or per group, for `data-stagger` containers) with
       `toggleActions: 'play reverse play reverse'` — giving onEnter (play),
       onLeave (reverse), onEnterBack (play), onLeaveBack (reverse) for free.
     - `(prefers-reduced-motion: reduce)`: `gsap.set()`s every matched element
       straight to its final visible state. No `ScrollTrigger` created at all.
  3. Returns the `gsap.context()` instance so `main.js` can call `.revert()`
     later if needed (not used yet in Phase 1, but keeps the door open).

  Note on `toggleActions`: GSAP's `'play reverse play reverse'` reverses the
  animation (back to its hidden state) when scrolling back past the trigger —
  this matches the user's explicit ask ("desaparecer ou retornar ao estado
  inicial quando saírem de foco... nova execução quando o usuário retornar").

- **`main.js` change**: one import (`import { initMotion } from
  './motion/scan.js'`) and one call near the top of the existing scroll-trigger
  setup, alongside the existing `document.fonts.ready.then(() =>
  ScrollTrigger.refresh())` call (unchanged — still needed, still fires after
  Phase 1's own triggers are registered too).

## Attribute contract (Phase 1)

| Attribute | Value | Behavior |
|---|---|---|
| `data-animate` | `fade-up \| fade-down \| fade-left \| fade-right \| scale-in \| blur-in` | Single-element reveal preset |
| `data-animate-text` | `reveal-text` | Line-level clip-reveal (no word/letter DOM splitting — see constraint) |
| `data-animate-icon` | `pop \| rotate` | Icon-specific reveal (draw/fill deferred to Phase 4) |
| `data-stagger` | number (seconds, e.g. `0.08`) | Marks a container whose direct children stagger in using the container's `data-animate` preset |
| `data-parallax` | number (0–1 intensity) | Scrub-based subtle Y offset, capped intensity, decorative elements only |
| `data-reveal` | preset name | Generic alias for section-level reveal blocks |
| `data-section-animation` | preset name | Same mechanism, semantic name for whole-`<section>` treatments |

Optional per-element overrides (Phase 1 supports these, doesn't require them):
`data-animate-delay`, `data-animate-duration`.

## Text reveal constraint (deliberate, not an oversight)

The user's brief explicitly warns against splitting words/letters in ways that
hurt accessibility, SEO, text selection, or responsiveness. Word/letter
splitting is also the single riskiest part of "reveal-text" systems (broken
screen-reader output, broken find-in-page, reflow bugs on resize). Phase 1
ships `revealText` as a **line-level clip-path reveal on the whole text block**
— no DOM splitting, real text node untouched, zero accessibility risk. If a
later phase wants true per-word stagger, that's a deliberate Phase 3 decision
with its own review (likely via a library that restores original `textContent`
on cleanup), not a Phase 1 default.

## No flash-of-invisible-content

Elements that will be animated keep `opacity: 1` in the site's static CSS —
they are never invisible by default. `scan.js` only calls `gsap.set()` to
apply the hidden "from" state at runtime, after `matchMedia` has resolved. If
JS fails to load or errors before this point, every animated element is
already in its final, fully visible state.

## Testing / verification (Phase 1 scope)

Since Phase 1 adds no visual change to real content, verification is:
1. A tiny throwaway smoke element confirms `scan.js` initializes without
   console errors.
2. Manually toggle `prefers-reduced-motion` in devtools and confirm the
   reduce-motion branch sets final state with zero animation and zero
   `ScrollTrigger` instances created.
3. Confirm the existing `document.fonts.ready.then(() =>
   ScrollTrigger.refresh())` still fires correctly and doesn't conflict with
   the new `gsap.context()`.
4. Confirm no regression in the three existing pinned sections (section4,
   team, process) or the grid-offset fix from the previous change.

## Open items carried to later phases

- Phase 2: hero entrance timeline, navbar scroll behavior.
- Phase 3: apply presets to real sections (text, paragraphs, cards, images)
  via the `data-*` attributes.
- Phase 4: button/CTA microinteractions, icon-specific animations (SVG draw,
  hover-context behavior).
- Phase 5: mobile-specific `matchMedia` tuning, full audit pass (scroll up/down,
  resize, reload mid-page, `prefers-reduced-motion`, cross-section
  regression).
