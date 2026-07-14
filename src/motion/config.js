import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, SplitText)

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
