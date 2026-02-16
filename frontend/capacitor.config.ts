import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'fr.briceledanois.culturiaquests',
  appName: 'CulturiaQuests',
  webDir: '.output/public',
  server: {
    androidScheme: 'https',
    cleartext: false,
    // Permet le hot-reload en dev (optionnel)
    // url: 'http://192.168.x.x:3000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1a1a',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;
