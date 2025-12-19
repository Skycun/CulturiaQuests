import type { Config } from 'tailwindcss'

export default {
  content: [
    './app/components/**/*.{js,vue,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/plugins/**/*.{js,ts}',
    './app/app.vue',
    './app/error.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['var(--font-pixel)'],
        onest: ['var(--font-onest)'],
        power: ['var(--font-power)'],
      },
    },
  },
  plugins: [],
} satisfies Config