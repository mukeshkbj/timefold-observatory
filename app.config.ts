import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const metaAppId = process.env.META_APP_ID?.trim();
  if (metaAppId && !/^\d+$/.test(metaAppId)) {
    throw new Error('META_APP_ID must be the public numeric ID from the Meta developer dashboard.');
  }
  return {
    ...config,
    name: 'TimeFold',
    slug: 'timefold-observatory',
    scheme: 'timefold',
    userInterfaceStyle: 'dark',
    android: { ...config.android, package: 'com.mukeshkbj.timefold' },
    ios: { ...config.ios, bundleIdentifier: 'com.mukeshkbj.timefold' },
    plugins: [
      'expo-router',
      ['@reactvision/react-viro', {
        android: { xRMode: ['AR', 'QUEST'], ...(metaAppId ? { questAppId: metaAppId } : {}) },
        ios: { cameraUsagePermission: 'TimeFold uses the camera to place its observatory on a surface in your room.' },
      }],
      ['expo-splash-screen', {
        image: './assets/splash-icon.png',
        imageWidth: 220,
        resizeMode: 'contain',
        backgroundColor: '#141817',
      }],
    ],
    extra: { ...config.extra, metaAppId: metaAppId ?? null },
    experiments: { ...config.experiments, typedRoutes: true },
  };
};
