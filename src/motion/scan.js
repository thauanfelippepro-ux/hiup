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
