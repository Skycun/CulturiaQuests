// tailwind.config.js
export default {
  theme: {
    extend: {
      fontFamily: {
        // Ici, on fait le lien. Nuxt Fonts verra "Jersey 10" et la chargera auto.
        'pixel': ['"Jersey 10"', 'sans-serif'], 
        'onest': ['"Onest"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}