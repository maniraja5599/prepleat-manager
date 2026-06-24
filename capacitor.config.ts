import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.vercel.sareeprepleatmanager.twa',
  appName: 'Eyas Drapist',
  webDir: '.output/public',
  server: {
    url: 'https://prepleat-manager.vercel.app',
    cleartext: true
  }
};

export default config;
