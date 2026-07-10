import 'swiper/css'
import 'swiper/css/pagination'
import '@splinetool/viewer'
import './style.css'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Swiper from 'swiper'
import { Autoplay, Pagination } from 'swiper/modules'

gsap.registerPlugin(ScrollTrigger)

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
