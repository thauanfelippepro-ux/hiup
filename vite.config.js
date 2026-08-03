import { defineConfig } from 'vite'

// Inlines the emitted stylesheet into index.html instead of linking it.
//
// A <link rel="stylesheet"> blocks the first paint until it has been fetched
// AND parsed, and it can only start being fetched after the HTML naming it has
// arrived. Lighthouse measured that round trip at 440ms inside a 664ms critical
// chain, and attributed 1.2s of potential FCP/LCP saving to it.
//
// The stylesheet is ~55 kB raw, ~10 kB over the wire. Inlining moves those
// bytes into a document the browser is already reading, so the render-blocking
// request disappears rather than being deferred. The usual cost of inlining --
// the CSS can no longer be cached across pages -- does not apply here: this is
// a single page.
const inlineStylesheet = () => ({
  name: 'inline-stylesheet',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    const html = Object.values(bundle).find((file) => file.fileName.endsWith('.html'))
    const sheets = Object.values(bundle).filter((file) => file.fileName.endsWith('.css'))
    if (!html || !sheets.length) return

    let source = html.source
    for (const sheet of sheets) {
      const name = sheet.fileName.split('/').pop()
      const link = new RegExp(`\\s*<link[^>]+href="[^"]*${name}"[^>]*>`, 'g')
      if (!link.test(source)) continue
      link.lastIndex = 0
      source = source.replace(link, `\n    <style>${sheet.source}</style>`)
      delete bundle[sheet.fileName]
    }
    html.source = source
  },
})

export default defineConfig({
  plugins: [inlineStylesheet()],
  build: {
    // The one chunk over the default 500 kB threshold is @splinetool/viewer
    // (~2.27 MB), and that is deliberate: it is imported dynamically from
    // main.js and only fetched once section6 is two viewport heights away, so
    // it never touches the initial load. Splitting it further is not possible
    // from here -- it ships as a single prebuilt bundle. Leaving the warning on
    // would train us to scroll past a genuinely useful signal, so the threshold
    // sits just above the known chunk: anything larger still gets flagged.
    chunkSizeWarningLimit: 2400,
  },
})
