import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Empaquetage mobile (ADR-0001).
 *
 * Le même build web sert la PWA et l'application native : `webDir` pointe sur la
 * sortie d'`ng build`. Le projet natif Android n'est pas versionné — il se
 * régénère avec `npm run mobile:add:android`, qui demande le SDK Android.
 */
const config: CapacitorConfig = {
  appId: 'app.cucina.foyer',
  appName: 'Cucina',
  webDir: 'dist/cucina/browser',
  android: {
    backgroundColor: '#fbf8f5',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DEFAULT',
      backgroundColor: '#fbf8f5',
    },
  },
};

export default config;
