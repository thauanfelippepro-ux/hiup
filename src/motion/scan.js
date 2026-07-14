import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { DISTANCES, DURATIONS, EASES, STAGGER } from './config.js'
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
  'sharp-in': presets.sharpIn,
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
    // 'bottom top' (not 'bottom 15%'): the reveal only reverses once the
    // element has scrolled fully past the top of the viewport. A tighter
    // exit window closes faster than a real scroll (trackpad flick, fast
    // wheel) can carry the tween through its duration/delay, so onLeave
    // fires and reverses the tween before it ever visually plays -- the
    // element just never appears. This was the actual root cause behind
    // "texts sumindo" across the site, not a one-off per-section bug.
    end: 'bottom top',
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
    // A stagger container may also carry data-animate to name its children's
    // preset (e.g. data-stagger + data-animate="scale-in") — that attribute
    // describes the group, not the container itself, so the container must
    // never also be treated as its own single-reveal target here.
    if (handled.has(el) || el.hasAttribute('data-stagger')) return

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

// Recursively wraps every run of text inside `root` in `<span class="word">`,
// treating existing element children (icons, inline spans) as single atomic
// "words" rather than descending into unrelated markup like <img>. Returns
// the flat list of word elements in document order for staggered reveals.
function splitIntoWords(root) {
  const words = []

  function walk(el) {
    Array.from(el.childNodes).forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const parts = node.textContent.split(/(\s+)/).filter((part) => part.length)
        const frag = document.createDocumentFragment()
        parts.forEach((part) => {
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(part))
            return
          }
          const span = document.createElement('span')
          span.className = 'word'
          span.textContent = part
          frag.appendChild(span)
          words.push(span)
        })
        node.replaceWith(frag)
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === 'IMG') {
          node.classList.add('word')
          words.push(node)
        } else {
          walk(node)
        }
      }
    })
  }

  walk(root)
  return words
}

function bindWordsScrub(root, motionReduced) {
  root.querySelectorAll('[data-text-fx="words-scrub"]').forEach((el) => {
    const words = splitIntoWords(el)
    if (!words.length) return

    if (motionReduced) {
      gsap.set(words, { clearProps: 'all' })
      return
    }

    gsap.set(words, { opacity: 0, y: DISTANCES.sm })
    gsap.to(words, {
      opacity: 1,
      y: 0,
      stagger: STAGGER.tight,
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 90%',
        end: 'bottom 40%',
        scrub: 0.5,
      },
    })
  })
}

function bindGradientScrub(root, motionReduced) {
  root.querySelectorAll('[data-text-fx="gradient-scrub"]').forEach((el) => {
    if (motionReduced) {
      gsap.set(el, { clearProps: 'all' })
      return
    }

    gsap.set(el, { '--gs-pos': '0%' })
    gsap.to(el, {
      '--gs-pos': '100%',
      ease: 'none',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        end: 'bottom 55%',
        scrub: 0.4,
      },
    })
  })
}

function bindLineWipe(root, motionReduced) {
  root.querySelectorAll('[data-text-fx="line-wipe"]').forEach((container) => {
    const lines = Array.from(container.children).filter((child) => child.tagName !== 'BR')
    if (!lines.length) return

    if (motionReduced) {
      gsap.set(lines, { clearProps: 'all' })
      return
    }

    const bars = lines.map((line) => {
      gsap.set(line, { position: 'relative', overflow: 'hidden', clipPath: 'inset(0% 100% 0% 0%)' })
      const bar = document.createElement('i')
      bar.className = 'text-fx-bar'
      line.appendChild(bar)
      gsap.set(bar, { position: 'absolute', inset: 0 })
      return bar
    })

    const tl = gsap.timeline({ paused: true })
    tl.to(lines, { clipPath: 'inset(0% 0% 0% 0%)', ease: EASES.emphasized, duration: DURATIONS.slow, stagger: STAGGER.base }, 0)
    tl.to(bars, { left: '100%', ease: EASES.emphasized, duration: DURATIONS.slow, stagger: STAGGER.base }, DURATIONS.slow * 0.5)

    ScrollTrigger.create({ ...makeScrollTrigger(container), animation: tl })
  })
}

// Same reveal as bindLineWipe (clip-path wipe + sliding accent bar), but for
// plain flowing text (paragraphs, non-manually-line-broken headings) where
// there's no pre-existing per-line markup to key off of. Uses GSAP's
// SplitText to detect real rendered lines instead.
function bindLineWipeAuto(root, motionReduced) {
  root.querySelectorAll('[data-text-fx="line-wipe-auto"]').forEach((el) => {
    const split = new SplitText(el, { type: 'lines', linesClass: 'line-wipe-auto-line' })
    const lines = split.lines
    if (!lines.length) return

    if (motionReduced) {
      gsap.set(lines, { clearProps: 'all' })
      return
    }

    const bars = lines.map((line) => {
      gsap.set(line, { position: 'relative', overflow: 'hidden', clipPath: 'inset(0% 100% 0% 0%)' })
      const bar = document.createElement('i')
      bar.className = 'text-fx-bar'
      line.appendChild(bar)
      gsap.set(bar, { position: 'absolute', inset: 0 })
      return bar
    })

    const tl = gsap.timeline({ paused: true })
    tl.to(lines, { clipPath: 'inset(0% 0% 0% 0%)', ease: EASES.emphasized, duration: DURATIONS.slow, stagger: STAGGER.base }, 0)
    tl.to(bars, { left: '100%', ease: EASES.emphasized, duration: DURATIONS.slow, stagger: STAGGER.base }, DURATIONS.slow * 0.5)

    ScrollTrigger.create({ ...makeScrollTrigger(el), animation: tl })
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
        bindWordsScrub(root, motionReduced)
        bindGradientScrub(root, motionReduced)
        bindLineWipe(root, motionReduced)
        bindLineWipeAuto(root, motionReduced)
      },
    )
  }, root)
}
