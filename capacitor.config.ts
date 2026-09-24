import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kidrota.app',
  appName: 'KidRota',
  webDir: 'dist',
  plugins: {
    // Dark status and navigation icons from the first frame, to match the
    // light theme KidRota starts in. src/utils/theme.ts takes over once the
    // app has loaded, following the theme chosen in Settings.
    SystemBars: {
      style: 'LIGHT',
    },
  },
};

export default config;
