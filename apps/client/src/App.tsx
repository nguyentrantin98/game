import { useGame } from './store/game';
import { GameCanvas } from './three/GameCanvas';
import { BattleHud } from './screens/BattleHud';
import { Loading } from './screens/Loading';
import { Lobby } from './screens/Lobby';
import { PopupHost } from './screens/Popups';
import { Result } from './screens/Result';
import { Select } from './screens/Select';
import { ToastHost } from './ui/kit';
import { Stage } from './ui/Stage';

/** Canvas 3D phủ toàn màn (không scale) + lớp HUD DOM theo độ phân giải thiết kế 844×390. */
export function App() {
  const screen = useGame((s) => s.screen);
  return (
    <>
      <GameCanvas />
      <Stage>
        {screen === 'loading' && <Loading />}
        {screen === 'lobby' && <Lobby />}
        {screen === 'select' && <Select />}
        {screen === 'battle' && <BattleHud />}
        {screen === 'result' && <Result />}
        <PopupHost />
        <ToastHost />
      </Stage>
    </>
  );
}
