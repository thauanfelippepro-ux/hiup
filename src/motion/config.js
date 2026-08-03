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

// normalizeScroll is deliberately NOT enabled.
//
// It was tried, to close the gap between compositor-thread touch scrolling and
// main-thread pinning. On iOS Safari it made things worse: it replaces the
// browser's own touch handling, which means it also replaces Safari's momentum
// and its dynamic-toolbar behaviour, and the page felt stuck from the first
// pinned section onward. It intercepts deeply enough that programmatic
// scrolling stopped updating ScrollTrigger at all, which is a fair measure of
// how much it takes over.
//
// Native scroll is the better trade. A little judder is survivable; scrolling
// that fights the finger is not.

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
