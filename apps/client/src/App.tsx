import { ChessApp } from './chess/ChessApp';
import { ToastHost } from './ui/kit';
import { Stage } from './ui/Stage';

/** Vua Cờ — lớp DOM theo độ phân giải thiết kế 844×390 (màn ngang). */
export function App() {
  return (
    <Stage>
      <ChessApp />
      <ToastHost />
    </Stage>
  );
}
