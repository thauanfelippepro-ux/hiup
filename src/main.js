import 'swiper/css'
import 'swiper/css/pagination'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Swiper from 'swiper'
import { Autoplay, Navigation, Pagination } from 'swiper/modules'
import './motion/config.js'
import { prefersReducedMotion } from './motion/config.js'
import { initMotion } from './motion/scan.js'

// The nav (position:fixed) and the hero (fully above the fold) both need a
// one-time load-in sequence, not the generic scroll-linked scanner used for
// every section below the fold. Two reasons this is separate from scan.js:
//  - nav never moves through the document flow, so a scroll-position-based
//    toggle reverses it to invisible whenever the user scrolls back near
//    the top -- the "navbar disappears" failure the animation spec rules
//    out.
//  - hero content sits at the very top of the page. A "top 85%" scroll
//    trigger isn't satisfied for elements anchored near the *bottom* of the
//    hero viewport (the side eyebrow, the caption) until the user scrolls
//    down some amount, even though that content is already fully visible
//    on load -- it should appear together with the headline, not later.
// Every listener that lives for as long as the page does is registered against
// this one signal, so all of them come off in a single abort() instead of each
// needing its own remembered handler reference. Listeners with a narrower life
// (the team pin's click handlers) stay with the matchMedia cleanup that already
// owns them.
const pageLifetime = new AbortController()
const untilTeardown = { signal: pageLifetime.signal }

const nav = document.querySelector('.nav')
const heroEyebrowTop = document.querySelector('.hero__eyebrow--top')
const heroLines = document.querySelectorAll('.hero__headline .hero__line')
const heroEyebrowSide = document.querySelector('.hero__eyebrow--side')
const heroCaption = document.querySelector('.hero__caption')

if (!prefersReducedMotion()) {
  const tl = gsap.timeline({ defaults: { ease: 'power2.out' } })
  if (nav) tl.fromTo(nav, { opacity: 0, y: -24 }, { opacity: 1, y: 0, duration: 0.6 })
  if (heroEyebrowTop) tl.fromTo(heroEyebrowTop, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.5 }, 0.2)
  if (heroLines.length) tl.fromTo(heroLines, { opacity: 0, y: 48 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.12 }, 0.35)
  if (heroEyebrowSide) tl.fromTo(heroEyebrowSide, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.5 }, 0.6)
  if (heroCaption) tl.fromTo(heroCaption, { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 }, 0.7)
}

// The Host Grotesk webfont can finish loading/swapping in after ScrollTrigger
// has already measured pin start/end positions from the fallback font's
// metrics. That leaves every pinned section (section4, team) with a stale
// boundary, which shows up as a jump/duplicate-render flash the first time
// the user scrolls into one. Recalculating once the real font is ready
// keeps every pin's measurements accurate for the whole session.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => ScrollTrigger.refresh())
}

// section6's <spline-viewer> loads its 3D scene from a remote URL and keeps
// resizing/shifting section6's layout well after the page's own load event --
// for an unpredictable amount of time, unlike fonts or the pin setup above
// (which settle synchronously). Each of those shifts needs a ScrollTrigger
// refresh or every pin below it is left measuring against a stale document.
//
// This used to observe document.body, which meant ANY size change anywhere on
// the page triggered a full refresh -- and a refresh is not cheap: it re-measures
// every trigger on the page and was the single largest forced-reflow contributor
// in the load trace. Worse, a refresh can itself change body's height, which
// re-entered the observer and scheduled another one.
//
// Two things make this narrower now. It watches only the element that actually
// resizes asynchronously, and it gives up once that element has stopped moving,
// so the observer is not left armed for the rest of the session. Everything the
// wide version used to incidentally cover is handled properly elsewhere:
// late-loading images no longer change layout at all (they all carry explicit
// width/height as of the image pass), fonts are covered by document.fonts.ready
// above, and window resizes are ScrollTrigger's own job.
function watchAsyncResize(target) {
  if (!('ResizeObserver' in window) || !target) return () => {}

  let refreshTimer
  let settleTimer
  let disposed = false

  const dispose = () => {
    if (disposed) return
    disposed = true
    clearTimeout(refreshTimer)
    clearTimeout(settleTimer)
    observer.disconnect()
  }

  const observer = new ResizeObserver(() => {
    clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200)

    // Stop watching once the scene has held the same size for a few seconds.
    // Spline settles well inside that window; anything still resizing after it
    // is an animation loop, not a layout change worth re-measuring for.
    clearTimeout(settleTimer)
    settleTimer = setTimeout(dispose, 4000)
  })

  observer.observe(target)
  return dispose
}

const gridOverlay = document.querySelector('.grid-overlay')
const spotlight = document.querySelector('.grid-overlay__spotlight')

// section4, team and process each freeze the grid for the length of their pin,
// so the background reads as locked behind the fixed cards instead of scrolling
// past them.
//
// This used to work by re-applying a compensating background-position on every
// ScrollTrigger update, offset by a running total of how much scroll the pins
// above had already consumed. That was always a frame too late to be correct:
// scrolling moves the overlay immediately -- the browser does it, and with a
// wheel it happens on the compositor thread without waiting for JavaScript at
// all -- while the compensation could only be written on GSAP's next tick. For
// that one frame the grid sat displaced by exactly the scroll delta and then
// snapped back, which is what produced elastic jitter, one wheel notch at a
// time, and a bigger lurch the faster you scrolled.
//
// No amount of tuning the value wins a race the main thread cannot win, so the
// per-frame write is gone. The layers are re-anchored to the viewport for the
// duration of a pin instead: a fixed element does not move with scroll, so the
// grid is genuinely static rather than corrected after the fact, and there is
// nothing left to keep in sync. The running total is gone with it -- each lock
// reads the phase the pattern is actually at, so the three pins no longer have
// to agree on a shared accumulator to avoid snapping at their boundaries.

// Must match the background-size the grid layers are painted at, so the phase
// can be reduced modulo one tile when the layers change coordinate space.
const GRID_TILE = 1047.696
// Every property lockGridToViewport writes, in one place, so releasing a pin
// and tearing the whole thing down cannot drift apart.
const clearGridStyles = (layers) => {
  layers.forEach((layer) => {
    layer.style.position = ''
    layer.style.top = ''
    layer.style.left = ''
    layer.style.width = ''
    layer.style.height = ''
    layer.style.backgroundPositionY = ''
    if (layer.classList.contains('grid-overlay__base')) {
      layer.style.maskImage = ''
      layer.style.webkitMaskImage = ''
    }
  })
}

const lockGridToViewport = (layers) => {
  layers.forEach((layer) => {
    const rect = layer.getBoundingClientRect()
    const current = parseFloat(layer.style.backgroundPositionY) || 0
    // Where the tile pattern sits right now in viewport coordinates. Fixed
    // positioning re-anchors the box to the viewport, so the same phase has to
    // be expressed from that origin instead -- reduced modulo one tile, since
    // the pattern repeats and only the phase is ever visible.
    const phase = (((rect.top + current) % GRID_TILE) + GRID_TILE) % GRID_TILE

    layer.style.position = 'fixed'
    layer.style.top = '0px'
    layer.style.left = `${rect.left}px`
    layer.style.width = `${rect.width}px`
    layer.style.height = '100vh'
    layer.style.backgroundPositionY = `${phase}px`

    // The base layer's fade-in is anchored to the top of the overlay, 500px
    // above section2. Re-anchored to the viewport it would fade the top of the
    // screen instead. Every pin sits thousands of pixels below that fade,
    // where the mask is already fully opaque, so dropping it for the duration
    // is visually identical.
    if (layer.classList.contains('grid-overlay__base')) {
      layer.style.maskImage = 'none'
      layer.style.webkitMaskImage = 'none'
    }
  })
}

// Hands the layer back to the document's coordinate space without moving the
// pattern. The offset is derived from where the locked layer actually left the
// pattern rather than from a running total, which is what makes it continuous
// in both directions and at any scroll position: a total only stays correct if
// every pin was entered and left exactly on its boundary, and entering one
// mid-scroll (or resizing while pinned) breaks that assumption silently.
const releaseGrid = (layers) => {
  layers.forEach((layer) => {
    const lockedPhase = parseFloat(layer.style.backgroundPositionY) || 0

    // Drop the fixed positioning first so the element reports its real
    // document-flow box. One forced layout per pin boundary, not per frame.
    clearGridStyles([layer])
    const rect = layer.getBoundingClientRect()

    const offset = (((lockedPhase - rect.top) % GRID_TILE) + GRID_TILE) % GRID_TILE
    layer.style.backgroundPositionY = `${offset}px`
  })
}

// The spotlight layer spans the whole grid overlay -- measured live, that is
// 1910 x 15592px, or ~30 megapixels -- and carries both a filter
// (brightness/saturate) and mix-blend-mode: screen. A layer that size with
// those two properties is expensive to composite whether or not any of it is
// actually visible, and its mask means at most a 520px circle around the cursor
// ever is. Worse, on touch there is no pointer to follow, so the layer was being
// composited for an entire session having never once been seen.
//
// Toggling display while it is faded out costs nothing visually (opacity is
// already 0 at that point) and takes the layer out of the compositor entirely
// for every visitor who is not actively hovering the grid.
if (gridOverlay && spotlight) {
  const pos = { x: 0, y: 0 }
  const applyVars = () => {
    spotlight.style.setProperty('--mx', `${pos.x}px`)
    spotlight.style.setProperty('--my', `${pos.y}px`)
  }
  const setX = gsap.quickTo(pos, 'x', { duration: 0.5, ease: 'power3', onUpdate: applyVars })
  const setY = gsap.quickTo(pos, 'y', { duration: 0.5, ease: 'power3', onUpdate: applyVars })

  spotlight.classList.add('grid-overlay__spotlight--idle')
  let spotlightVisible = false

  // getBoundingClientRect() was being called on every single pointermove, which
  // forces a synchronous layout each time the pointer moves a pixel. The box
  // only actually moves when the page scrolls or resizes, so it is cached and
  // re-read lazily after one of those invalidates it.
  // Measured on the spotlight itself rather than on the overlay: the two share
  // a box normally, but while a pin has the layer re-anchored to the viewport
  // they do not, and --mx/--my are resolved against the spotlight's own box.
  let overlayRect = null
  const invalidateRect = () => {
    overlayRect = null
  }
  window.addEventListener('scroll', invalidateRect, { passive: true, ...untilTeardown })
  window.addEventListener('resize', invalidateRect, untilTeardown)

  gridOverlay.addEventListener('pointermove', (event) => {
    if (!overlayRect) overlayRect = spotlight.getBoundingClientRect()
    setX(event.clientX - overlayRect.left)
    setY(event.clientY - overlayRect.top)

    // Previously this fired a brand new opacity tween on every pointermove --
    // dozens of overlapping tweens per second, all animating to the same value.
    // The fade only needs to run on the transition into view.
    if (spotlightVisible) return
    spotlightVisible = true
    spotlight.classList.remove('grid-overlay__spotlight--idle')
    gsap.to(spotlight, { opacity: 1, duration: 0.4, ease: 'power1.out' })
  }, untilTeardown)

  gridOverlay.addEventListener('pointerleave', () => {
    if (!spotlightVisible) return
    spotlightVisible = false
    gsap.to(spotlight, {
      opacity: 0,
      duration: 0.6,
      ease: 'power1.out',
      onComplete: () => {
        // Guard against the pointer having come back mid-fade.
        if (!spotlightVisible) spotlight.classList.add('grid-overlay__spotlight--idle')
      },
    })
  }, untilTeardown)
}

const section4 = document.querySelector('.section4')
const section4Cards = gsap.utils.toArray('.section4__card')

if (section4 && section4Cards.length > 1) {
  const ACTIVE_NUM = 'rgba(255, 255, 255, 0.75)'
  const INACTIVE_NUM = '#e95004'
  const ACTIVE_CAT = 'rgba(255, 255, 255, 0.85)'
  const INACTIVE_CAT = '#6b6b6b'
  const ACTIVE_TEXT = '#ffffff'
  const INACTIVE_TEXT = '#6b6b6b'

  const cardParts = section4Cards.map((card) => ({
    card,
    glow: card.querySelector('.section4__card-glow'),
    num: card.querySelector('.section4__card-num'),
    cat: card.querySelector('.section4__card-cat'),
    text: card.querySelector('.section4__card-text'),
  }))

  const STEP = 320
  const pinEnd = () => `+=${(section4Cards.length - 1) * STEP}`

  // Unlike team and process below, this pin runs at EVERY width. The stacked
  // card reveal is the whole point of the section, and dropping to a plain
  // list on mobile lost it -- the cards just sat there. The layout being
  // pinned is the same at both ends; only the row's direction changes (see
  // the .section4__row rules in the mobile media query).
  ScrollTrigger.matchMedia({
    all: () => {
      // Cards wait off the right edge and a little low, then travel in
      // diagonally at full opacity -- the same entrance the process section
      // uses. Parking them near their resting spot (the original 70/110px)
      // meant a card was visible beside the active one before its turn; parking
      // them out of frame instead lets them arrive by entering the frame rather
      // than by fading up.
      //
      // xPercent is a share of the card's own width, so one value clears the
      // viewport at every size: the card needs ~95% to pass the right edge at
      // both 390px and 1920px, and 120% leaves margin. Horizontally it is the
      // same trick process plays, except .section4__pin cannot clip its own
      // overflow the way .process__pin does -- the 3D icon deliberately bleeds
      // 49px above and 222px below the pin and would be cut -- so the layers
      // rely on the page's own overflow-x for the clip.
      //
      // opacity stays as a belt-and-braces gate: it costs nothing, and it means
      // an unexpected viewport where xPercent lands short still never shows a
      // card before its turn.
      gsap.set(section4Cards.slice(1), { xPercent: 120, y: 200, opacity: 0 })

      const gridLayers = gsap.utils.toArray('.grid-overlay__base, .grid-overlay__spotlight')
      const pinDistance = (section4Cards.length - 1) * STEP

      // The grid's compensating offset is driven by this SAME ScrollTrigger
      // (via onUpdate/self.progress) instead of a second, separate instance,
      // so the two can never disagree on where "pinned" starts/ends.
      // anticipatePin is deliberately omitted: it engages the pin a little
      // before the exact scroll-progress boundary during fast scrolling,
      // which would make the pin (already fixed) and the grid offset (still
      // tied to the exact progress) briefly disagree — visible as the grid
      // snapping/bouncing on quick scroll direction changes.
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section4,
          start: 'top top',
          end: pinEnd,
          scrub: 0.35,
          pin: '.section4__pin',
          onEnter: () => lockGridToViewport(gridLayers),
          onEnterBack: () => lockGridToViewport(gridLayers),
          onLeave: () => releaseGrid(gridLayers),
          onLeaveBack: () => releaseGrid(gridLayers),
        },
      })

      cardParts.slice(1).forEach((next, i) => {
        const prev = cardParts[i]

        // Opaque from the very first frame of its own entrance -- while it is
        // still below the fold, so nothing pops into view. It then rises into
        // frame already solid instead of fading up as it goes.
        tl.set(next.card, { opacity: 1 }, i)
          .to(next.card, { xPercent: 0, y: 0, duration: 1, ease: 'power2.out' }, i)
          .to(next.glow, { opacity: 1, duration: 1, ease: 'power2.out' }, i)
          .to(next.num, { color: ACTIVE_NUM, duration: 1 }, i)
          .to(next.cat, { color: ACTIVE_CAT, duration: 1 }, i)
          .to(next.text, { color: ACTIVE_TEXT, duration: 1 }, i)
          .to(prev.glow, { opacity: 0, duration: 1, ease: 'power2.out' }, i)
          .to(prev.num, { color: INACTIVE_NUM, duration: 1 }, i)
          .to(prev.cat, { color: INACTIVE_CAT, duration: 1 }, i)
          .to(prev.text, { color: INACTIVE_TEXT, duration: 1 }, i)
      })

      return () => {
        gsap.set(section4Cards.slice(1), { clearProps: 'transform,opacity' })
        clearGridStyles(gridLayers)
        gsap.set(
          cardParts.map((p) => p.glow),
          { clearProps: 'opacity' },
        )
        gsap.set(
          cardParts.flatMap((p) => [p.num, p.cat, p.text]),
          { clearProps: 'color' },
        )
      }
    },
  })
}

const team = document.querySelector('.team')
const teamItems = gsap.utils.toArray('.team__item[data-index]')
const teamSlides = gsap.utils.toArray('.team__slide[data-index]')
const teamStrip = document.querySelector('.team__strip')
const teamStage = document.querySelector('.team__stage')
const teamList = document.querySelector('.team__list')
const teamListViewport = document.querySelector('.team__list-viewport')

if (
  team &&
  teamStrip &&
  teamStage &&
  teamList &&
  teamListViewport &&
  teamItems.length > 1 &&
  teamItems.length === teamSlides.length
) {
  const STEP = 320
  let lastTeamIndex = -1

  // Runs at every width, like section4 and process. Below 721px this used to
  // fall back to a swipeable gallery with no active state, so the roles and the
  // photo no longer moved together -- which is the whole point of the section.
  ScrollTrigger.matchMedia({
    all: () => {
      lastTeamIndex = -1
      const slide = teamSlides[0]
      const slideHeight = slide.offsetHeight
      const slideGap = parseFloat(getComputedStyle(slide).marginBottom) || 0
      const slideStep = slideHeight + slideGap
      const slideInitialY = (teamStage.offsetHeight - slideHeight) / 2

      const item = teamItems[0]
      const itemHeight = item.offsetHeight
      const itemGap = parseFloat(getComputedStyle(item).marginBottom) || 0
      const itemStep = itemHeight + itemGap
      const itemInitialY = (teamListViewport.offsetHeight - itemHeight) / 2

      const pinDistance = (teamItems.length - 1) * STEP
      const gridLayers = gsap.utils.toArray('.grid-overlay__base, .grid-overlay__spotlight')

      gsap.set(teamStrip, { y: slideInitialY })
      gsap.set(teamList, { y: itemInitialY })

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: team,
          start: 'top top',
          end: `+=${pinDistance}`,
          scrub: 0.35,
          pin: '.team__pin',
          onUpdate(self) {
            // Guarded on the index rather than running every frame: this used to
            // touch 14 elements on every scroll update to re-assert classes that
            // had not changed, and each pass invalidated style for all of them.
            const idx = Math.round(self.progress * (teamItems.length - 1))
            if (idx === lastTeamIndex) return
            lastTeamIndex = idx
            teamSlides.forEach((s, i) => s.classList.toggle('team__slide--active', i === idx))
            teamItems.forEach((it, i) => it.classList.toggle('team__item--active', i === idx))
          },
          onEnter: () => lockGridToViewport(gridLayers),
          onEnterBack: () => lockGridToViewport(gridLayers),
          onLeave: () => releaseGrid(gridLayers),
          onLeaveBack: () => releaseGrid(gridLayers),
        },
      })

      teamItems.slice(1).forEach((nextItem, i) => {
        const prevItem = teamItems[i]

        // Only the two transforms are tweened. The active item's colour and
        // weight used to be tweened here too, which was both redundant and
        // expensive: .team__item--active already declares exactly those values
        // and onUpdate already toggles it, and animating font-weight re-lays
        // out the text on every single frame. Host Grotesk ships as discrete
        // weights, so the in-between values snapped to the nearest one anyway --
        // the animation cost a full layout per frame to render a step change.
        // CSS handles it now, with a transition for the fade the tween gave.
        tl.to(teamStrip, { y: slideInitialY - slideStep * (i + 1), duration: 1, ease: 'none' }, i).to(
          teamList,
          { y: itemInitialY - itemStep * (i + 1), duration: 1, ease: 'none' },
          i,
        )
      })

      const scrollToIndex = (index) => {
        const st = tl.scrollTrigger
        const y = st.start + (st.end - st.start) * (index / (teamItems.length - 1))
        window.scrollTo({ top: y, behavior: 'smooth' })
      }

      const onItemClick = function () {
        scrollToIndex(Number(this.dataset.index))
      }

      // These are <li> and <div> carrying a click handler -- operable with a
      // mouse and completely unreachable with a keyboard. They are made focusable
      // and given button semantics here, inside the same matchMedia branch that
      // registers the click handler, so the affordance exists exactly where the
      // behaviour does: below 721px there is no click handler, and advertising a
      // button that does nothing would be worse than not advertising one.
      const onItemKeydown = function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return
        event.preventDefault() // Space would otherwise scroll the page
        scrollToIndex(Number(this.dataset.index))
      }

      const interactive = [...teamItems, ...teamSlides]
      interactive.forEach((element) => {
        element.setAttribute('role', 'button')
        element.setAttribute('tabindex', '0')
        element.addEventListener('click', onItemClick)
        element.addEventListener('keydown', onItemKeydown)
      })

      return () => {
        interactive.forEach((element) => {
          element.removeAttribute('role')
          element.removeAttribute('tabindex')
          element.removeEventListener('click', onItemClick)
          element.removeEventListener('keydown', onItemKeydown)
        })
        gsap.set(teamStrip, { clearProps: 'transform' })
        gsap.set(teamList, { clearProps: 'transform' })
        gsap.set(teamItems, { clearProps: 'color,fontWeight' })
        teamSlides.forEach((s, i) => s.classList.toggle('team__slide--active', i === 0))
        teamItems.forEach((it, i) => it.classList.toggle('team__item--active', i === 0))
        clearGridStyles(gridLayers)
      }
    },
  })
}

const process = document.querySelector('.process')
const processCards = gsap.utils.toArray('.process__card')

if (process && processCards.length > 1) {
  const STEP = 320
  const pinEnd = () => `+=${(processCards.length - 1) * STEP}`
  let lastProcessIndex = -1

  // Runs at every width, for the same reason section4's does: the cards
  // sliding over one another IS the section. Below 721px this used to fall
  // back to a plain vertical list of five cards, which lost the whole idea and
  // made the section three times taller. The layout being pinned is the same
  // at both ends -- only the row's direction changes (see .process__row in the
  // mobile media query).
  ScrollTrigger.matchMedia({
    all: () => {
      lastProcessIndex = -1
      const gridLayers = gsap.utils.toArray('.grid-overlay__base, .grid-overlay__spotlight')
      const pinDistance = (processCards.length - 1) * STEP

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: process,
          start: 'top top',
          end: pinEnd,
          scrub: 0.35,
          pin: '.process__pin',
          onUpdate(self) {
            // Ceil (not round) so a card becomes the active/sharp one the instant
            // it starts sliding in, not halfway through its entrance — otherwise
            // the still-blurred incoming card visibly "pops" to sharp + on-top
            // partway through the motion instead of arriving that way.
            const idx = Math.min(Math.ceil(self.progress * (processCards.length - 1)), processCards.length - 1)
            // Same guard as team: re-asserting unchanged classes every frame
            // invalidated style for all five cards for nothing.
            if (idx === lastProcessIndex) return
            lastProcessIndex = idx
            processCards.forEach((c, i) => c.classList.toggle('process__card--active', i === idx))
          },
          onEnter: () => lockGridToViewport(gridLayers),
          onEnterBack: () => lockGridToViewport(gridLayers),
          onLeave: () => releaseGrid(gridLayers),
          onLeaveBack: () => releaseGrid(gridLayers),
          // process is the last of the three grid-locking pins. Once scrolled
          // past, the grid KEEPS its final accumulated offset for the rest of
          // the page (FAQ, final CTA, footer) rather than resetting to 0 —
          // resetting would snap the grid up by a full section's worth of
          // pixels the instant you leave (the same boundary jump this offset
          // accumulation exists to prevent). The transform is on the child
          // grid layers only, so it never affects document height/scroll, and
          // the tile pattern repeats, so a constant phase offset is invisible.
        },
      })

      // Each incoming card is fully opaque the whole time (no fade). It starts
      // parked outside the pinned viewport (clipped by .process__pin, which
      // spans the full page width) via xPercent — a percentage of the card's
      // own width — and further below its resting spot, then moves diagonally
      // (x and y together) straight to its resting stacked position,
      // overlapping the previous card the whole way in.
      //
      // xPercent must clear BOTH the card's own width AND however far its
      // resting spot already sits from the pin's true right edge (the row's
      // content-inset gap), or a sliver stays visible inside the clipped pin
      // from the start. That gap can reach ~300px at wide viewports while the
      // card is up to 720px wide, so 130% (only 936px) fell short — 220% give
      // a comfortable margin at any card size/viewport combination.
      gsap.set(processCards.slice(1), { xPercent: 220, y: 200 })
      gsap.set(processCards, { filter: 'brightness(1)' })

      // The card being covered darkens (never blurred — text must stay
      // readable, not fade out) on the SAME timeline position/duration as the
      // incoming card's entrance, so it dims gradually in sync with how much
      // it's being covered, instead of snapping dark the instant the next
      // card's class toggles.
      processCards.slice(1).forEach((next, i) => {
        const prev = processCards[i]
        tl.to(next, { xPercent: 0, y: 0, duration: 1, ease: 'power2.out' }, i).to(
          prev,
          { filter: 'brightness(0.45)', duration: 1, ease: 'power2.out' },
          i,
        )
      })

      return () => {
        gsap.set(processCards, { clearProps: 'transform,filter' })
        processCards.forEach((c, i) => c.classList.toggle('process__card--active', i === 0))
        clearGridStyles(gridLayers)
      }
    },
  })
}

const carousel = document.querySelector('[data-carousel]')

if (carousel) {
  const caption = document.querySelector('[data-caption]')

  const captions = [
    'Registramos os melhores momentos e já iniciamos a seleção das imagens durante o evento.',
    'Nossa equipe edita enquanto a cobertura acontece. Nada fica esperando o fim do evento.',
    'Os primeiros vídeos e fotos vão ao ar quando o público ainda está vivendo a experiência.',
    'Publicar durante o evento aumenta o engajamento e mantém sua marca no centro da conversa.',
    'Reels, Stories, Shorts e posts entregues no formato ideal para cada rede social.',
  ]

  const updateCaption = (realIndex) => {
    if (!caption) return
    gsap.to(caption, {
      opacity: 0,
      duration: 0.2,
      onComplete: () => {
        caption.textContent = captions[realIndex]
        gsap.to(caption, { opacity: 1, duration: 0.3 })
      },
    })
  }

  // Matches the nav's centered container (width: min(92vw, 1360px)) so the
  // active slide's left edge lines up with the site's grid. Applied as a
  // plain margin on the wrapper (not Swiper's slidesOffsetBefore param)
  // because that param forces Swiper's "bothDirections" loop math, which
  // this 5-slide set is too small to satisfy cleanly.
  const wrapper = carousel.querySelector('.swiper-wrapper')
  const calcGridOffset = () => {
    const containerWidth = Math.min(window.innerWidth * 0.92, 1360)
    return Math.max(24, (window.innerWidth - containerWidth) / 2)
  }
  const applyGridOffset = () => {
    wrapper.style.marginLeft = `${calcGridOffset()}px`
  }
  applyGridOffset()

  // Decorative sliver of a "previous" card peeking in at the left edge,
  // matching the reference design. Swiper's own loop only prepares slides
  // ahead of the active one, so this is a static element outside Swiper's
  // slide management rather than a real (interactive) slide.
  const peek = document.createElement('div')
  peek.className = 'section5__peek'
  peek.setAttribute('aria-hidden', 'true')
  peek.innerHTML =
    '<img src="/assets/realtime-card.webp" alt="" width="563" height="493" decoding="async" loading="lazy" />'
  wrapper.insertAdjacentElement('beforebegin', peek)

  const positionPeek = () => {
    const sampleSlide = carousel.querySelector('.section5__slide')
    if (!sampleSlide) return
    const width = sampleSlide.offsetWidth
    const height = sampleSlide.offsetHeight
    peek.style.width = `${width}px`
    peek.style.height = `${height}px`
    peek.style.left = `${calcGridOffset() - width}px`
  }

  const swiper = new Swiper(carousel, {
    modules: [Autoplay, Pagination],
    slidesPerView: 'auto',
    centeredSlides: false,
    spaceBetween: 24,
    loop: true,
    grabCursor: true,
    slideToClickedSlide: true,
    autoplay: {
      delay: 4500,
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    },
    pagination: {
      el: '.section5__dots',
      clickable: true,
    },
    on: {
      slideChange(sw) {
        updateCaption(sw.realIndex)
      },
      resize() {
        applyGridOffset()
        positionPeek()
      },
    },
  })

  positionPeek()
  updateCaption(swiper.realIndex)
}

// @splinetool/viewer is 2.18 MB of JavaScript on its own -- roughly 88% of what
// used to be the entry bundle, parsed and executed before anything on the page
// could paint, all to drive a decorative (aria-hidden) 3D background five
// screens below the fold. Importing it on demand takes it off the critical path
// entirely, and visitors who bounce before section6 never download it at all.
//
// <spline-viewer> is inert until the custom element definition lands, so the
// only thing that decides whether this looks identical to the old eager import
// is WHEN the download starts. A 200% rootMargin begins it two full viewport
// heights before section6 scrolls into view -- far enough ahead that the scene
// has upgraded by the time the section is actually on screen, while still
// skipping the work for anyone who never gets there.
const splineViewer = document.querySelector('spline-viewer')

if (splineViewer) {
  // The viewer injects its badge as <a id="logo"> into its own shadow root once
  // the remote scene finishes loading, and it carries an inline style of its
  // own. Setting `badge.style.display = 'none'` from here therefore only held
  // until the viewer wrote that inline style again -- which is why the badge
  // was showing on the live page despite the old polling loop. Two things fix
  // it for good:
  //  - a <style> injected INTO the shadow root, because an author rule marked
  //    !important outranks a normal inline declaration, so a later inline
  //    write by the viewer can no longer win;
  //  - installing that rule as soon as the shadow root exists, rather than
  //    waiting for the badge element, so it is already in force whenever the
  //    badge eventually arrives (no race, no fixed time budget to expire).
  const BADGE_HIDE_CSS = '#logo, a[href*="spline.design"] { display: none !important; }'

  const installBadgeRule = (root) => {
    if (root.querySelector('style[data-hiup-badge]')) return
    const style = document.createElement('style')
    style.setAttribute('data-hiup-badge', '')
    style.textContent = BADGE_HIDE_CSS
    root.appendChild(style)
  }

  // Attaching a shadow root fires no event and is not a light-DOM mutation, so
  // there is nothing to observe -- waiting for the root has to be a poll. It is
  // a short one: the upgrade lands within a few frames of the chunk evaluating,
  // and it stops the moment the rule is installed.
  const startBadgeWatch = () => {
    if (splineViewer.shadowRoot) {
      installBadgeRule(splineViewer.shadowRoot)
      return
    }

    const upgradePoll = setInterval(() => {
      if (!splineViewer.shadowRoot) return
      clearInterval(upgradePoll)
      installBadgeRule(splineViewer.shadowRoot)
    }, 100)
    setTimeout(() => clearInterval(upgradePoll), 10000)
  }

  const loadSpline = () =>
    import('@splinetool/viewer').then(() => {
      startBadgeWatch()
      // Armed only now, rather than at page load: the scene is what resizes,
      // and it does not exist until this point. Arming it earlier meant the
      // observer either fired for unrelated reasons or had already given up by
      // the time the scene actually arrived.
      watchAsyncResize(splineViewer.closest('section') || splineViewer)
    }, (error) => {
      // The scene is decorative, so a failed chunk (offline, blocked CDN) must
      // stay silent for the visitor -- section6 keeps its gradient background
      // and every other section is unaffected.
      console.warn('[spline] viewer failed to load', error)
    })

  const splineSection = splineViewer.closest('section') || splineViewer
  const splineObserver = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return
      splineObserver.disconnect()
      loadSpline()
    },
    { rootMargin: '200% 0px' },
  )
  splineObserver.observe(splineSection)
}

const testimonialCarousel = document.querySelector('[data-testimonial-carousel]')

if (testimonialCarousel) {
  new Swiper(testimonialCarousel, {
    modules: [Navigation, Pagination],
    slidesPerView: 'auto',
    centeredSlides: true,
    spaceBetween: 24,
    loop: true,
    grabCursor: true,
    slideToClickedSlide: true,
    pagination: {
      el: '.clients__dots',
      clickable: true,
    },
    // Dragging works, but it is not discoverable and it is awkward one-handed
    // on a phone. Explicit controls sit either side of the dots.
    navigation: {
      prevEl: '.clients__nav--prev',
      nextEl: '.clients__nav--next',
    },
  })
}

const faqItems = gsap.utils.toArray('[data-faq-item]')

if (faqItems.length) {
  faqItems.forEach((item) => {
    const question = item.querySelector('.faq__question')

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('faq__item--active')

      faqItems.forEach((other) => {
        other.classList.remove('faq__item--active')
        other.querySelector('.faq__question').setAttribute('aria-expanded', 'false')
      })

      if (!isActive) {
        item.classList.add('faq__item--active')
        question.setAttribute('aria-expanded', 'true')
      }
    }, untilTeardown)
  })
}

// Click-to-load YouTube facade: keeps the lightweight thumbnail on screen
// until the visitor actually clicks play, instead of loading (or playing)
// every testimonial's embed up front.
document.querySelectorAll('.clients__video[data-youtube-id]').forEach((video) => {
  video.querySelector('.clients__video-play').addEventListener('click', () => {
    const id = video.dataset.youtubeId
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.youtube.com/embed/${id}`
    iframe.title = 'Depoimento em vídeo'
    iframe.allow = 'encrypted-media; picture-in-picture'
    iframe.allowFullscreen = true
    video.replaceChildren(iframe)
  }, untilTeardown)
})

// Generic modal system: any [data-modal-open="id"] opens #id, any
// [data-modal-close] inside an open modal (backdrop or close button) closes
// it, and Escape closes whichever modal is currently open.
let openModal = null
// Where focus was before the modal took it, so it can be handed back on close
// rather than dumping the user at the top of the document.
let focusBeforeModal = null

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

const closeModal = () => {
  if (!openModal) return
  openModal.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
  openModal = null

  if (focusBeforeModal && document.contains(focusBeforeModal)) focusBeforeModal.focus()
  focusBeforeModal = null
}

document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault()
    const modal = document.getElementById(trigger.dataset.modalOpen)
    if (!modal) return
    modal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    openModal = modal
    focusBeforeModal = trigger

    // Move focus into the dialog. Without this, focus stays on the trigger
    // behind the backdrop and a screen reader never enters the dialog at all.
    const closeButton = modal.querySelector('[data-modal-close]:not(.modal__backdrop)')
    ;(closeButton || modal.querySelector(FOCUSABLE) || modal).focus()
  }, untilTeardown)
})

document.querySelectorAll('[data-modal-close]').forEach((closer) => {
  closer.addEventListener('click', closeModal, untilTeardown)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal()
    return
  }

  // Focus trap: while a dialog is open, Tab must cycle within it instead of
  // walking off into the page behind the backdrop.
  if (event.key !== 'Tab' || !openModal) return

  const focusable = [...openModal.querySelectorAll(FOCUSABLE)].filter(
    (element) => element.offsetParent !== null,
  )
  if (!focusable.length) return

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}, untilTeardown)

// An infinite CSS animation keeps the compositor working every frame no matter
// where the element sits relative to the viewport, and will-change keeps its
// layer promoted the whole time on top of that. Two run on this page and both
// used to run for the entire session: the three works marquee tracks (4380px
// wide each, 34s loop, permanently promoted) and the final CTA's fill sweep,
// which repaints text on every frame of a 6s loop.
//
// The rootMargin keeps them running slightly beyond the viewport edge so an
// element is never caught mid-resume as it scrolls in.
const loopingAnimations = document.querySelectorAll('.works__track, [data-text-fx="fill-loop"]')

if (loopingAnimations.length && 'IntersectionObserver' in window) {
  const animationObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        entry.target.classList.toggle('anim-paused', !entry.isIntersecting)
      })
    },
    { rootMargin: '15% 0px' },
  )
  loopingAnimations.forEach((element) => animationObserver.observe(element))
}

// Runs last, after section4/team/process have already created their pinned
// ScrollTriggers (and inserted their pin-spacers) and after the Swiper
// carousels have initialized. initMotion() measures every declaratively
// animated element's document position to build its own ScrollTriggers --
// if it ran earlier (as it originally did, right after this file's imports),
// elements positioned after section4 in the DOM would be measured against a
// document that was still missing section4's eventual pin-spacer height,
// permanently offsetting their trigger start/end by that missing amount.
//
// The returned gsap.context() exists specifically so everything scan.js created
// can be torn down in one call. It used to be thrown away at the call site,
// which made that impossible -- the tweens and ScrollTriggers were reachable
// only from GSAP's own internals.
const motionContext = initMotion()

// Single teardown for everything this file owns: every page-lifetime listener
// (via the shared abort signal) plus every tween and ScrollTrigger scan.js
// built. Nothing calls this while the site is a single static page that never
// unmounts -- it exists so that if this ever moves behind a router, or a
// section is re-rendered, the cleanup path is already correct rather than
// something to reconstruct later. Exposed under a namespaced key so it can be
// driven from the console when debugging a suspected leak.
window.__hiup = {
  teardown() {
    pageLifetime.abort()
    // motionContext only owns what scan.js built. The three pinned sections
    // (section4, team, process) are set up through ScrollTrigger.matchMedia in
    // this file instead, so reverting the context alone left all three
    // pin-spacers behind. clearMatchMedia() is not enough either: section4
    // registers under matchMedia's "all" key, which it does not treat as a
    // query and so does not clear. Killing the triggers directly with
    // revert=true covers every one of them regardless of how it was registered.
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill(true))
    motionContext.revert()
  },
}
