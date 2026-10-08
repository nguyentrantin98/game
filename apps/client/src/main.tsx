import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import './i18n';
import { App } from './App';

if (location.search.includes('debug=1')) {
  // vConsole (Tencent): console trên điện thoại thật — chỉ bật khi ?debug=1
  import('vconsole').then(({ default: VConsole }) => new VConsole());
}

// khóa hướng ngang khi chạy PWA / fullscreen (trình duyệt không hỗ trợ thì bỏ qua)
const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
orientation?.lock?.('landscape').catch(() => {});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (location.search.includes('e2e=1')) {
  // hook cho Playwright: tự ngắm bằng AI để test chơi trọn trận
  Promise.all([import('./store/battle'), import('@army3d/shared')]).then(([{ useBattle }, shared]) => {
    (window as unknown as Record<string, unknown>).__army3d = {
      useBattle,
      autoAim() {
        const b = useBattle.getState();
        if (!b.state || !b.myId) return null;
        const shot = shared.chooseBotShot(b.state, b.myId, 1, () => 0.5);
        b.set({ angle: shot.angle, power: shot.power, facing: shot.dir });
        return shot;
      },
    };
  });
}
