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
    // KidRota never encrypts its database, so the plugin's encryption support
    // stays off. Left on (the plugin's default), it opens an encrypted
    // preferences file at start-up with a key from the Android Keystore; after
    // an uninstall and reinstall, Android's auto-backup restores that file but
    // not the key, the file cannot be opened, and the plugin fails to load —
    // the app then shows "could not open its database: CapacitorSQLitePlugin:
    // null" on every launch.
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
