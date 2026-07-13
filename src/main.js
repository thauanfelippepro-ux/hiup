import 'swiper/css'
import 'swiper/css/pagination'
import '@splinetool/viewer'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Swiper from 'swiper'
import { Autoplay, Pagination } from 'swiper/modules'
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
// resizing/shifting section6's layout well after the page's own load event
// -- for an unpredictable amount of time, unlike fonts or the pin setup
// above (which settle synchronously). A ResizeObserver on the whole page
// catches that (and any future similar async content: late-loading images,
// embeds, etc.) generically, instead of special-casing each component.
if ('ResizeObserver' in window) {
  let resizeRefreshTimer
  const resizeObserver = new ResizeObserver(() => {
    clearTimeout(resizeRefreshTimer)
    resizeRefreshTimer = setTimeout(() => ScrollTrigger.refresh(), 200)
  })
  resizeObserver.observe(document.body)
}

const gridOverlay = document.querySelector('.grid-overlay')
const spotlight = document.querySelector('.grid-overlay__spotlight')

// While section4 is pinned, its grid layers are pushed down via a
// compensating translateY (see section4 setup below) so the background
// appears locked to the fixed icon/cards instead of scrolling normally.
// The spotlight mask math below needs to subtract that same offset, or the
// mouse-follow circle renders that many pixels away from the real cursor.
let gridPinOffset = 0

if (gridOverlay && spotlight) {
  const pos = { x: 0, y: 0 }
  const applyVars = () => {
    spotlight.style.setProperty('--mx', `${pos.x}px`)
    spotlight.style.setProperty('--my', `${pos.y}px`)
  }
  const setX = gsap.quickTo(pos, 'x', { duration: 0.5, ease: 'power3', onUpdate: applyVars })
  const setY = gsap.quickTo(pos, 'y', { duration: 0.5, ease: 'power3', onUpdate: applyVars })

  gridOverlay.addEventListener('pointermove', (event) => {
    const rect = gridOverlay.getBoundingClientRect()
    setX(event.clientX - rect.left)
    setY(event.clientY - rect.top - gridPinOffset)
    gsap.to(spotlight, { opacity: 1, duration: 0.4, ease: 'power1.out' })
  })

  gridOverlay.addEventListener('pointerleave', () => {
    gsap.to(spotlight, { opacity: 0, duration: 0.6, ease: 'power1.out' })
  })
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

  ScrollTrigger.matchMedia({
    '(min-width: 721px)': () => {
      gsap.set(section4Cards.slice(1), { x: 70, y: 110, opacity: 0 })

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
          onUpdate(self) {
            const y = self.progress * pinDistance
            gsap.set(gridLayers, { y })
            gridPinOffset = y
          },
        },
      })

      cardParts.slice(1).forEach((next, i) => {
        const prev = cardParts[i]

        tl.to(next.card, { x: 0, y: 0, opacity: 1, duration: 1, ease: 'power2.out' }, i)
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
        gridPinOffset = 0
        gsap.set(section4Cards.slice(1), { clearProps: 'transform,opacity' })
        gsap.set(gridLayers, { clearProps: 'transform' })
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

  ScrollTrigger.matchMedia({
    '(min-width: 721px)': () => {
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
            const idx = Math.round(self.progress * (teamItems.length - 1))
            teamSlides.forEach((s, i) => s.classList.toggle('team__slide--active', i === idx))
            teamItems.forEach((it, i) => it.classList.toggle('team__item--active', i === idx))

            const y = self.progress * pinDistance
            gsap.set(gridLayers, { y })
            gridPinOffset = y
          },
        },
      })

      teamItems.slice(1).forEach((nextItem, i) => {
        const prevItem = teamItems[i]

        tl.to(teamStrip, { y: slideInitialY - slideStep * (i + 1), duration: 1, ease: 'none' }, i)
          .to(teamList, { y: itemInitialY - itemStep * (i + 1), duration: 1, ease: 'none' }, i)
          .to(nextItem, { color: '#ffffff', fontWeight: 700, duration: 1, ease: 'none' }, i)
          .to(prevItem, { color: '#6b6b6b', fontWeight: 500, duration: 1, ease: 'none' }, i)
      })

      const scrollToIndex = (index) => {
        const st = tl.scrollTrigger
        const y = st.start + (st.end - st.start) * (index / (teamItems.length - 1))
        window.scrollTo({ top: y, behavior: 'smooth' })
      }

      const onItemClick = function () {
        scrollToIndex(Number(this.dataset.index))
      }
      teamItems.forEach((item) => item.addEventListener('click', onItemClick))
      teamSlides.forEach((slide) => slide.addEventListener('click', onItemClick))

      return () => {
        teamItems.forEach((item) => item.removeEventListener('click', onItemClick))
        teamSlides.forEach((slide) => slide.removeEventListener('click', onItemClick))
        gsap.set(teamStrip, { clearProps: 'transform' })
        gsap.set(teamList, { clearProps: 'transform' })
        gsap.set(teamItems, { clearProps: 'color,fontWeight' })
        teamSlides.forEach((s, i) => s.classList.toggle('team__slide--active', i === 0))
        teamItems.forEach((it, i) => it.classList.toggle('team__item--active', i === 0))
        gridPinOffset = 0
        gsap.set(gridLayers, { clearProps: 'transform' })
      }
    },
  })
}

const process = document.querySelector('.process')
const processCards = gsap.utils.toArray('.process__card')

if (process && processCards.length > 1) {
  const STEP = 320
  const pinEnd = () => `+=${(processCards.length - 1) * STEP}`

  ScrollTrigger.matchMedia({
    '(min-width: 721px)': () => {
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
            processCards.forEach((c, i) => c.classList.toggle('process__card--active', i === idx))

            const y = self.progress * pinDistance
            gsap.set(gridLayers, { y })
            gridPinOffset = y
          },
          // process is the last of the three grid-locking pins. Once it's
          // scrolled past, there's no further pin to compensate for, so the
          // grid must drop its accumulated offset here — otherwise it stays
          // translated for the rest of the page (FAQ, final CTA, footer),
          // both misaligning the tile pattern and inflating the document's
          // scrollable height with dead space past the real last section.
          onLeave() {
            gridPinOffset = 0
            gsap.set(gridLayers, { clearProps: 'transform' })
          },
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
        gridPinOffset = 0
        gsap.set(gridLayers, { clearProps: 'transform' })
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
  peek.innerHTML = '<img src="/assets/realtime-card.png" alt="" />'
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

const splineViewer = document.querySelector('spline-viewer')

if (splineViewer) {
  const hideBadge = (root) => {
    const badge = root.querySelector('#logo, a[href*="spline.design"], [class*="logo"]')
    if (badge) {
      badge.style.setProperty('display', 'none', 'important')
      return true
    }
    return false
  }

  const tryHide = () => splineViewer.shadowRoot && hideBadge(splineViewer.shadowRoot)

  if (!tryHide()) {
    const interval = setInterval(() => {
      if (tryHide()) clearInterval(interval)
    }, 300)
    setTimeout(() => clearInterval(interval), 15000)
  }
}

const testimonialCarousel = document.querySelector('[data-testimonial-carousel]')

if (testimonialCarousel) {
  new Swiper(testimonialCarousel, {
    modules: [Pagination],
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
    })
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
  })
})

// Generic modal system: any [data-modal-open="id"] opens #id, any
// [data-modal-close] inside an open modal (backdrop or close button) closes
// it, and Escape closes whichever modal is currently open.
let openModal = null

const closeModal = () => {
  if (!openModal) return
  openModal.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = ''
  openModal = null
}

document.querySelectorAll('[data-modal-open]').forEach((trigger) => {
  trigger.addEventListener('click', (event) => {
    event.preventDefault()
    const modal = document.getElementById(trigger.dataset.modalOpen)
    if (!modal) return
    modal.setAttribute('aria-hidden', 'false')
    document.body.style.overflow = 'hidden'
    openModal = modal
  })
})

document.querySelectorAll('[data-modal-close]').forEach((closer) => {
  closer.addEventListener('click', closeModal)
})

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeModal()
})

// Runs last, after section4/team/process have already created their pinned
// ScrollTriggers (and inserted their pin-spacers) and after the Swiper
// carousels have initialized. initMotion() measures every declaratively
// animated element's document position to build its own ScrollTriggers --
// if it ran earlier (as it originally did, right after this file's imports),
// elements positioned after section4 in the DOM would be measured against a
// document that was still missing section4's eventual pin-spacer height,
// permanently offsetting their trigger start/end by that missing amount.
initMotion()
