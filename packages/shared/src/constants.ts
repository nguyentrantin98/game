/** Bước mô phỏng cố định 60Hz — dùng chung client + server. */
export const FIXED_DT = 1 / 60;
export const GRAVITY = 32;
export const WORLD_WIDTH = 160;
export const TERRAIN_STEP = 0.5;
export const TURN_SECONDS = 20;
/** power 100 × speedK 1 → 62 đơn vị/giây. */
export const POWER_TO_SPEED = 0.62;
/** Gia tốc gió cho mỗi nấc gió (-10..10). */
export const WIND_ACCEL = 0.9;
export const BODY_RADIUS = 1.3;
export const BODY_CENTER_Y = 1.1;
export const MUZZLE_OFFSET = { x: 1.3, y: 1.7 };
export const MOVE_PER_TURN = 8;
export const MAX_SIM_STEPS = 60 * 14;
export const FALL_Y = -6;
export const RAGE_PER_TURN = 35;
export const RAGE_MAX = 100;
export const SKIP_DELAY = 500;
