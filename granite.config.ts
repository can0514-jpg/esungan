import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  // ⚠️ 콘솔에서 등록한 앱 이름으로 교체하세요
  appName: 'nahmban',
  brand: {
    displayName: '오늘의 나침반',
    primaryColor: '#191F28',
    // ⚠️ 콘솔에서 업로드한 로고 URL로 교체하세요
    icon: '',
  },
  web: {
    host: 'localhost',
    port: 5173,
    commands: {
      dev: 'vite',
      build: 'tsc -b && vite build',
    },
  },
  permissions: [],
});
