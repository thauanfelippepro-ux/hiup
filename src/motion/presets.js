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

export function sharpIn(target, overrides) {
  return withOverrides(
    {
      from: { opacity: 0, letterSpacing: '-0.5em', filter: 'blur(12px)' },
      to: {
        opacity: 1,
        letterSpacing: '0em',
        filter: 'blur(0px)',
        duration: 1.6,
        ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
      },
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
