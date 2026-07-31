import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

// On phones, scrolling hides and shows the browser's address bar, which fires
// a resize. By default ScrollTrigger answers every resize with a refresh, so
// each pinned section recalculates mid-scroll -- the pin visibly jumps, and a
// scrubbed timeline can be yanked back to a stale progress. This tells it to
// ignore the resizes that are only the address bar moving; a real orientation
// change still refreshes. No effect on desktop, which has no retracting chrome.
ScrollTrigger.config({ ignoreMobileResize: true })

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
