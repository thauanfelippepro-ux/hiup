// Generates WebP versions of every raster asset the page actually references.
//
// Originals live in assets-src/ and are never touched; only the generated .webp
// lands in public/assets/, which is what Vite copies into the build. Keeping the
// two apart is what stops ~15 MB of superseded PNG/JPG from being deployed
// alongside the versions the page actually requests. Reverting an asset is a
// matter of copying it back and pointing index.html at the original filename.
//
// Sizing rule: an asset is only downscaled when its natural size is more than
// twice the size it is actually displayed at (measured in the browser at a
// 1920px viewport), and never below 2x that displayed size, so retina screens
// still get a full-density image. Everything else keeps its natural dimensions
// and gains purely from the format change -- that keeps framing, aspect ratio
// and crop identical to what the design already defines.
//
// Usage: npm run images
import { readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join, parse } from 'node:path'
import sharp from 'sharp'

const SOURCE_DIR = fileURLToPath(new URL('../assets-src/', import.meta.url))
const OUTPUT_DIR = fileURLToPath(new URL('../public/assets/', import.meta.url))

// width: null keeps the natural width. Quality is tuned per asset type --
// photographic content tolerates more compression than flat graphics with
// large soft gradients, where banding shows up first.
const TARGETS = [
  { file: 'bg-hero.jpg', width: null, quality: 80 },
  { file: 'secao-3.png', width: null, quality: 82 },
  { file: 'secao-4.png', width: null, quality: 82 },
  // 1303x493 natural for a tile that renders at 420x200 -- the only assets
  // genuinely oversized rather than just badly compressed.
  { file: 'work-1.jpg', width: 840, quality: 82 },
  { file: 'work-2.jpg', width: 840, quality: 82 },
  { file: 'team-member.jpg', width: null, quality: 82 },
  { file: 'hiup-wordmark-glow.png', width: null, quality: 85 },
  { file: 'process-1.png', width: null, quality: 85 },
  { file: 'process-2.png', width: null, quality: 85 },
  { file: 'process-3.png', width: null, quality: 85 },
  { file: 'process-4.png', width: null, quality: 85 },
  { file: 'process-5.png', width: null, quality: 85 },
  { file: 'finalcta-wordmark-bg.png', width: null, quality: 82 },
  { file: 'finalcta-logo-left.png', width: null, quality: 85 },
  { file: 'finalcta-logo-right.png', width: null, quality: 85 },
  { file: 'realtime-card.png', width: null, quality: 85 },
  { file: 'client-avatar.png', width: null, quality: 88 },
]

// Assets whose natural size dwarfs the box a phone paints them into. The rest
// are already small enough that a second file would cost more in requests than
// it saves in decode.
const MOBILE_VARIANTS = new Set([
  'bg-hero.jpg',
  'secao-3.png',
  'secao-4.png',
  'hiup-wordmark-glow.png',
  'finalcta-wordmark-bg.png',
  'finalcta-logo-left.png',
  'finalcta-logo-right.png',
])

const kb = (bytes) => Math.round(bytes / 1024)

async function main() {
  const present = new Set(await readdir(SOURCE_DIR))
  let before = 0
  let after = 0
  const rows = []

  for (const target of TARGETS) {
    if (!present.has(target.file)) {
      console.warn(`skip (missing): ${target.file}`)
      continue
    }

    const source = join(SOURCE_DIR, target.file)
    const output = join(OUTPUT_DIR, `${parse(target.file).name}.webp`)

    const pipeline = sharp(source)
    const { width: naturalWidth, height: naturalHeight } = await pipeline.metadata()

    if (target.width && target.width < naturalWidth) {
      pipeline.resize({ width: target.width, withoutEnlargement: true })
    }

    // effort:6 buys a few extra percent of compression for build-time cost the
    // visitor never pays.
    await pipeline.webp({ quality: target.quality, effort: 6 }).toFile(output)

    const sourceSize = (await stat(source)).size
    const outputSize = (await stat(output)).size
    before += sourceSize
    after += outputSize

    const outMeta = await sharp(output).metadata()
    rows.push({
      file: target.file,
      from: `${naturalWidth}x${naturalHeight}`,
      to: `${outMeta.width}x${outMeta.height}`,
      beforeKb: kb(sourceSize),
      afterKb: kb(outputSize),
      saved: `${Math.round((1 - outputSize / sourceSize) * 100)}%`,
    })
  }

  // Phone-sized variants of the assets still far larger than any phone shows
  // them at. WebP fixed transfer size, not decode cost: a browser decodes at
  // the file's full pixel dimensions regardless of the box it paints into, so
  // secao-4 at 1920x2357 costs ~18 MB of bitmap on a device showing it 590px
  // wide. index.html chooses between these with srcset/sizes; desktop keeps
  // the full-size file.
  const MOBILE_WIDTH = 800
  const mobileRows = []
  for (const target of TARGETS) {
    if (!MOBILE_VARIANTS.has(target.file)) continue
    const name = parse(target.file).name
    const source = join(SOURCE_DIR, target.file)
    const { width: naturalWidth } = await sharp(source).metadata()
    if (naturalWidth <= MOBILE_WIDTH) continue

    const output = join(OUTPUT_DIR, `${name}-mobile.webp`)
    await sharp(source)
      .resize({ width: MOBILE_WIDTH, withoutEnlargement: true })
      .webp({ quality: target.quality, effort: 6 })
      .toFile(output)

    const full = (await stat(join(OUTPUT_DIR, `${name}.webp`))).size
    const small = (await stat(output)).size
    mobileRows.push({
      file: `${name}-mobile.webp`,
      desktopKb: kb(full),
      mobileKb: kb(small),
      saved: `${Math.round((1 - small / full) * 100)}%`,
    })
  }
  if (mobileRows.length) {
    console.log('\nmobile variants (max 800px wide):')
    console.table(mobileRows)
  }

  // Social preview image. Derived from the hero background rather than being a
  // new piece of art, and emitted as JPEG at the 1200x630 the scrapers expect --
  // several of them still handle WebP inconsistently, and this file is fetched
  // by crawlers, never by the page itself.
  const ogSource = join(SOURCE_DIR, 'bg-hero.jpg')
  const ogOutput = join(OUTPUT_DIR, 'og-image.jpg')
  await sharp(ogSource)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true })
    .toFile(ogOutput)
  console.log(`og-image.jpg: 1200x630, ${kb((await stat(ogOutput)).size)} KB`)

  console.table(rows)
  console.log(`total: ${kb(before)} KB -> ${kb(after)} KB (${Math.round((1 - after / before) * 100)}% smaller)`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
