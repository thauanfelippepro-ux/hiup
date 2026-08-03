import { defineConfig } from 'vite'

export default defineConfig({
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
