# PROMPT — Xây dựng "ARMY 3D · PHÁO CHIẾN ĐỘI" (Three.js + NestJS, UI/UX chuẩn game mobile Trung Quốc)

> Tài liệu thiết kế gốc: `docs/design/army3d-design.html` (gồm 5 board: Tổng quan & 8 nhân vật · Màn chọn nhân vật · Màn chiến đấu · Kiến trúc Three.js · Bộ skin Thần Thoại).
> Cách dùng: dán **Phần A (Master prompt)** cho AI coding agent trước, sau đó lần lượt dán từng prompt ở **Phần C** theo thứ tự. **Phần B** là bộ thư viện FE đã chọn sẵn. Agent phải tuân theo đúng Phần B.

---

## PHẦN A — MASTER PROMPT

```
Bạn là Senior Game Engineer + UI/UX lead với 10 năm làm game mobile cho studio Trung Quốc
(kiểu Tencent / NetEase / miHoYo). Hãy xây dựng game "ARMY 3D · PHÁO CHIẾN ĐỘI" theo spec dưới đây.

# 1. Sản phẩm
- Thể loại: game bắn pháo theo lượt 3D (artillery, kiểu Gunny / GunBound / Worms), góc nhìn 2.5D.
- Nền tảng: Web mobile + PWA, chỉ chơi ngang (landscape). Khung thiết kế chuẩn 844×390 (iPhone 14),
  phải scale được tới 1334×750 và tablet. Có hỗ trợ safe-area (tai thỏ, thanh home).
- Chế độ: Đấu đội 2v2/4v4 · Xếp hạng 1v1 (Elo, mùa giải 6 tuần) · Săn Boss 4 người (PvE) · Luyện tập (bia di động, hiện quỹ đạo).
- Lượt 20 giây. Thứ tự lượt tính theo chỉ số "delay" (bắn chiêu mạnh thì phải chờ lâu hơn).
- Ngôn ngữ: tiếng Việt mặc định, có thêm 简体中文 và English (i18n ngay từ đầu, không hard-code chuỗi).

# 2. Vòng lặp cốt lõi
01 Chọn đội hình: chọn nhân vật, 3 ô vật phẩm và bản đồ. Mỗi nhân vật có 2 kiểu bắn và 1 tuyệt chiêu.
02 Ngắm bắn: kéo để chỉnh góc, giữ nút để nạp lực. Đọc mũi tên gió ở đầu màn hình.
03 Khai hỏa: đạn bay theo đạn đạo thật, nổ thì khoét địa hình. Rơi khỏi bản đồ là bị loại.
04 Nhận thưởng: vàng, EXP và mảnh trang bị để nâng súng và mở trang phục.

# 3. 8 nhân vật ra mắt (chỉ số 1–10: Máu / Sát thương / Tầm bắn / Gió)
| Tên | Lớp | Vũ khí | Tuyệt chiêu | Mô tả | Màu / Tối / Nền | HP ATK RNG WIND |
|---|---|---|---|---|---|---|
| Sấm | XẠ THỦ | Súng trường pháo | Loạt đôi | bắn 2 viên liên tiếp, cân bằng | #E0A23C/#8A5A16/#2A2617 | 6 6 6 6 |
| Gấu | PHÁO BINH | Bazooka | Đạn hố sâu | nổ bán kính lớn, khoét sâu địa hình | #C8643E/#6E2E18/#2B1D17 | 9 9 4 8 |
| Tắc Kè | LỰU ĐẠN | Lựu đạn nảy | Nảy ba lần | nổ ở lần chạm thứ 3 | #7DBF4E/#3D6A20/#1C2716 | 6 7 5 5 |
| Diều Hâu | BẮN TỈA | Súng tỉa | Đạn xuyên gió | gió chỉ tác động 30% | #5BA8C9/#245C75/#16232A | 4 8 9 2 |
| Ốc Vít | KỸ SƯ | Súng đinh + drone | Khiên năng lượng | tường chắn 1 lượt, drone bắn bồi | #D9C24A/#7A6914/#27261A | 7 5 6 6 |
| Phượng | HỎA TIỄN | Giàn tên lửa | Mưa tên lửa | tách 3 đầu đạn ở đỉnh quỹ đạo | #E2577A/#7E2139/#2A1820 | 5 8 7 7 |
| Chớp | ĐIỆN | Cuộn Tesla | Xích sét | sét lan sang mục tiêu thứ 2 ở gần | #8F7BE0/#43358C/#1E1B2C | 5 7 6 4 |
| Sen | QUÂN Y | Pháo dược | Mưa hồi phục | hồi máu đồng đội trong vùng nổ | #4FC4A8/#1E6A58/#152723 | 7 4 6 5 |

Mỗi nhân vật được định nghĩa bằng một file JSON trong `packages/shared/weapons/*.json`
(sát thương, bán kính nổ, hệ số gió windK, kiểu đạn, delay, tuyệt chiêu). Không hard-code trong code.

# 4. Bộ skin "Thiên Binh Thần Tướng" (Thần thoại phương Đông + Ngũ Hành)
Tề Thiên (Kim, gậy co giãn: đạn xuyên 2 lớp địa hình) · Hỏa Luân (Hỏa, 3 vòng lửa lăn, cháy 2 lượt) ·
Tam Nhãn (Thổ, thấy trọn quỹ đạo 1 lượt, đạn sau phá khiên) · Nguyệt Tiên (Thủy, mưa 5 tên trăng, thỏ ngọc hồi máu) ·
Long Tử (Thủy, sóng đẩy địch ra mép vực) · Lôi Công (Kim, sét giáng thẳng, bỏ qua vật chắn) ·
Chu Tước (Hỏa, đổi hướng gió có lợi 1 lượt) · Cửu Vĩ (Mộc, 2 phân thân, đạn thật ẩn trong 3 quả cầu).
Ngũ Hành tương khắc: Kim→Mộc→Thổ→Thủy→Hỏa→Kim. Đánh trúng hành bị mình khắc: +20% sát thương. Đánh trúng hành khắc mình: −15%.
Bảng màu skin: Son đỏ #E0573E · Vàng kim #D9A84A · Ngọc bích #3E9A80 · Thanh lam #6E9BD8 · Lụa ngà #F3E9DA.

# 5. Kiến trúc (server giữ luật chơi, client chỉ dựng hình và mô phỏng lại)
Monorepo pnpm + Turborepo:
  apps/client   Vite + React + TypeScript + three.js (@react-three/fiber)
  apps/server   NestJS (REST + WebSocket Gateway)
  packages/shared  luật chơi thuần TS dùng chung cho client và server: ballistics, terrain heightmap,
                   TurnManager, weapon defs, Ngũ Hành, kiểu message (zod schema), seeded RNG
  packages/ui      UI kit kiểu game (Phần B)

Lớp Hiển thị (three.js):
  - WebGLRenderer: DPR tối đa 2, tắt antialias, bật FXAA khi máy mạnh, tone mapping ACES.
  - PerspectiveCamera FOV 30°, nhìn ngang 2.5D, camera bám theo đạn khi bay, tự zoom khi tới lượt.
  - 1 DirectionalLight + 1 HemisphereLight. Chỉ nhân vật có bóng (blob shadow).
Lớp Thế giới:
  - TerrainMesh: heightmap 2D đùn thành khối 3D. Khi nổ thì khoét mảng độ cao và chỉ dựng lại các chunk bị ảnh hưởng.
  - CharacterRig: GLTFLoader + SkeletonUtils.clone. AnimationMixer có 7 clip: idle/walk/aim/fire/hit/die/win.
  - VFX: InstancedMesh + object pool cho mảnh vụn, khói, tia lửa. Không tạo object mới mỗi frame.
Lớp Luật chơi: TurnManager (hàng đợi delay, 20s, hết giờ tự bỏ lượt), Ballistics (bước cố định 60Hz, có seed), WeaponDefs JSON.
Lớp Mạng: client chỉ gửi {angle, power, itemId}. Server tính kết quả rồi phát cho cả phòng.
  Có matchmaking theo Elo (phòng 2–8 người). Khi mất mạng, server gửi lại snapshot của trận.

Ballistics dùng chung (phải deterministic):
  function step(p, wind, dt) {
    p.vel.x += wind * p.windK * dt;
    p.vel.y -= GRAVITY * dt;
    p.pos.addScaledVector(p.vel, dt);
    const h = terrain.heightAt(p.pos.x);
    if (p.pos.y <= h) explode(p);
  }
  // Cùng seed và cùng input thì mọi máy ra cùng một kết quả. Server trả về {seed, impact[], damage[], terrainDiff}
  // để client replay. Nếu kết quả của client lệch thì client lấy kết quả của server.

# 6. Quy chuẩn asset 3D
- Low-poly chibi ≤ 3.000 tam giác mỗi nhân vật. File .glb nén Meshopt (hoặc Draco). Texture KTX2, 1 atlas 512×512.
- 8 nhân vật dùng chung 1 skeleton nên dùng lại được mọi animation clip. Màu đội đổi bằng uniform tint.
- Skin Thần Thoại: MeshToonMaterial 3 dải sáng + viền mực (inverted hull) để có chất tranh thủy mặc.
  Thêm xương phụ cho tay áo, dải lụa, đuôi, cánh, dùng spring-bone đơn giản. Phụ kiện là mesh rời gắn vào bone.
- Giai đoạn chưa có model: dùng placeholder procedural (thân hình thang, đầu lục giác, mũ, nòng súng)
  theo đúng bảng màu nhân vật, giống SVG trong file thiết kế.

# 7. Ngân sách hiệu năng mobile (bắt buộc, đưa vào CI kiểm tra bundle)
FPS 60 (tối thiểu 30) · < 100 draw call/khung hình · < 150k tam giác toàn cảnh · ≤ 3k tam giác/nhân vật ·
texture KTX2 atlas 512–1024 · tải lần đầu < 15 MB (phần còn lại lazy-load theo màn).

# 8. Design tokens (lấy từ file thiết kế)
Nền #0F1A14 · Panel #15221A · Viền #2A3B2F · Thanh trống #24342A · Chữ chính #E9EFE6 · Chữ phụ #B9C8BC / #9FB2A3
Accent #F2A93B (hover #FFC86B), accent phụ #5CC8E0 / #E8684A / #9BD35A
Font: "Chakra Petch" 500/600/700 cho tiêu đề, số, nút (chữ HOA, letter-spacing 0.1–0.18em).
      "Be Vietnam Pro" 400–600 cho nội dung. Với 简体中文: "Noto Sans SC" / "HarmonyOS Sans SC" và "ZCOOL QingKe HuangYou" cho tiêu đề.
Bo góc: panel 14–16px, tag 6px, thiết bị 28px.

# 9. Yêu cầu chất lượng
TypeScript strict, ESLint + Prettier, Vitest cho packages/shared (bắt buộc test deterministic ballistics:
cùng seed và input thì client và server cho ra cùng hash). Có Playwright e2e cho flow Login → Lobby → Chọn tướng → Trận → Kết quả.
Docker compose gồm postgres, redis, server, client. Mỗi phase làm xong phải chạy được và có README.
Luôn hỏi lại nếu spec mâu thuẫn. Không tự thêm tính năng ngoài spec.
```

---

## PHẦN B — THƯ VIỆN FE CHO UI/UX "CHUẨN TRUNG QUỐC"

Game mobile Trung Quốc có một bộ quy ước UI/UX khá thống nhất. Bộ lib dưới đây được chọn để đạt đúng các quy ước đó trên stack React + three.js.

### B1. Những đặc trưng UI game Trung Quốc mà prompt phải đạt
| Quy ước | Ý nghĩa | Cách làm |
|---|---|---|
| 红点 Red-dot system | Chấm đỏ báo có việc mới, lan ngược từ màn con lên icon cha (cây red-dot) | Store red-dot dạng tree (zustand) với key kiểu `mail.system`, `bag.equip` |
| 九宫格 9-slice panel | Khung viền hoa văn co giãn không bị vỡ | CSS `border-image` + sprite atlas (TexturePacker) |
| Nút "đầy đặn" | Gradient 2 tầng, viền sáng trên, bóng đáy, chữ có stroke, nhún khi bấm | Tailwind + `motion` (scale 0.92 → 1.04 → 1) + âm thanh click |
| Popup nảy | Mở popup bằng scale 0.6 → 1.05 → 1, nền mờ, đóng bằng nút X góc phải trên | `motion` AnimatePresence + hàng đợi popup (popup queue) |
| Lobby đông icon | Avatar, cấp, tiền tệ ở góc trên. Hàng icon chức năng bên phải (签到, 活动, 邮件, 商城, 战令). Nút "BẮT ĐẦU" to ở góc dưới phải. Nhân vật 3D xoay ở giữa | Lobby 3D (R3F) với HUD DOM phủ lên trên |
| 跑马灯 Marquee | Dải thông báo chạy chữ ở đầu lobby | Component riêng với CSS animation |
| Số bay / combo | Số sát thương bật lên, có crit, đổi màu theo Ngũ Hành | troika-three-text trong scene, hoặc DOM + GSAP |
| Phần thưởng | Rương rung, mở rương phát sáng, đếm số tăng dần, vật phẩm bay vào túi | GSAP timeline + Lottie / Spine + three.quarks |
| Hướng dẫn tân thủ (新手引导) | Bàn tay chỉ, khoét lỗ sáng quanh nút cần bấm, các bước bắt buộc | Overlay SVG mask + step machine (xstate) |
| Thích ứng màn hình | Chiều cao cố định, chiều rộng co giãn, neo theo 4 góc, tránh tai thỏ | Hệ "design resolution" tự viết + `env(safe-area-inset-*)` |

### B2. Bộ lib đề xuất (đã chọn, agent dùng đúng các lib này)

**Lõi 3D**
| Lib | Dùng cho |
|---|---|
| `three` | Engine |
| `@react-three/fiber` + `@react-three/drei` | Scene React hóa, có sẵn loader, `useGLTF`, `Html`, `Bounds`, `PerformanceMonitor` |
| `three.quarks` | Hệ particle (lửa, sét, lông vũ, kim quang Ngũ Hành) có editor trực quan. Nhẹ hơn tự viết |
| `postprocessing` / `@react-three/postprocessing` | Bloom cho tuyệt chiêu, FXAA. Tự tắt trên máy yếu |
| `troika-three-text` | Chữ SDF trong 3D (số sát thương, tên trên đầu nhân vật), hỗ trợ tiếng Việt và chữ Hán |
| `three-stdlib` / `SkeletonUtils` | Clone nhân vật dùng chung skeleton |
| `@gltf-transform/cli` + `meshoptimizer` + `ktx2` (toktx) | Pipeline nén asset trong CI |
| `r3f-perf` / `stats-gl` | Đo draw call, FPS khi dev |

**UI 2D / HUD (DOM phủ trên canvas)**
| Lib | Dùng cho |
|---|---|
| `tailwindcss` | Áp design token, utility cho HUD |
| `@radix-ui/react-*` (headless) | Dialog, Tabs, Slider có a11y. Tự skin thành kiểu game |
| `antd-mobile` (Ant Group) | Chỉ dùng cho màn tiện ích ngoài trận: Cài đặt, Thư, Bạn bè, Bảng xếp hạng (PullToRefresh, InfiniteScroll, Swiper, Toast). Theme lại bằng CSS variables |
| `motion` (Framer Motion) | Animation nút, popup, chuyển màn |
| `gsap` | Timeline phức tạp: mở rương, đếm số, vật phẩm bay vào túi, kết quả trận |
| `@dotlottie/react-player` (Lottie) | Icon động, hiệu ứng thắng/thua, loading |
| `@esotericsoftware/spine-webgl` hoặc `spine-threejs` | Animation 2D xương cho UI nhân vật, gacha, nhân vật trong lobby (chuẩn công nghiệp ở Trung Quốc) |
| `@use-gesture/react` | Kéo ngắm, giữ để nạp lực, pinch zoom camera |
| `nipplejs` | Joystick ảo để di chuyển nhân vật trong trận |
| `howler` | Âm thanh (BGM, SFX, sprite âm thanh). Tự unlock audio trên iOS |
| `zustand` | State: profile, red-dot tree, popup queue, settings |
| `xstate` | State machine cho flow trận và hướng dẫn tân thủ |
| `@tanstack/react-query` | Gọi REST API (shop, mail, rank) |
| `socket.io-client` | Realtime trận đấu |
| `i18next` + `react-i18next` | vi / zh-CN / en |
| `vconsole` (Tencent) | Debug console trên điện thoại thật (chỉ bật ở bản dev và staging) |
| `vite-plugin-pwa` | PWA, cache asset, cài lên màn hình chính |
| `@capacitor/core` (tùy chọn) | Đóng gói lên App Store / CH Play |

**Font và asset**
- Tiêu đề: Chakra Petch. Nội dung: Be Vietnam Pro. Chữ Hán: Noto Sans SC / HarmonyOS Sans SC / MiSans.
  Tiêu đề kiểu thư pháp: ZCOOL QingKe HuangYou, Ma Shan Zheng (chỉ dùng cho chữ Hán trang trí như 天兵神将, 五行).
- Subset font Hán bằng `fonttools pyftsubset` hoặc `glyphhanger` để font nhẹ hơn 300KB.
- Sprite UI đóng bằng TexturePacker (hoặc `free-tex-packer-cli`). Icon dùng SVG sprite.

**Phương án thay thế (nếu muốn dùng Vue):** Vue 3 + TresJS (thay cho R3F) + Vant 4 / NutUI 4 (JD) hoặc TDesign Mobile (Tencent).
Nếu muốn đổi engine: Cocos Creator hoặc LayaAir (engine game 2D/3D phổ biến nhất ở Trung Quốc). Nhưng spec này giữ three.js.

---

## PHẦN C — PROMPT THEO TỪNG PHASE

### Phase 0 — Khởi tạo monorepo
```
Tạo monorepo pnpm + Turborepo gồm apps/client (Vite+React+TS), apps/server (NestJS),
packages/shared, packages/ui. Cài các lib theo Phần B. Thêm tsconfig base strict, ESLint, Prettier,
Vitest, Playwright, docker-compose (postgres 16, redis 7). Thêm script `pnpm dev` chạy song song client và server.
Client: khóa landscape. Nếu xoay dọc thì hiện màn "Xoay ngang điện thoại" có icon động.
Viết DesignResolution 844×390 theo chính sách "fixed height". Expose CSS var --ui-scale. Xử lý safe-area.
Nạp design tokens (Phần A §8) vào tailwind.config và CSS variables. Bật vConsole khi ?debug=1.
```

### Phase 1 — packages/shared: luật chơi deterministic
```
Viết bằng TS thuần, không phụ thuộc DOM hay three:
- Vec2, seeded RNG (mulberry32), FIXED_DT = 1/60, GRAVITY.
- Terrain: heightmap Float32Array, heightAt(x), carve(x, radius) trả về diff. Có serialize/deserialize.
- Ballistics.simulate(shot, wind, terrain, weaponDef) trả về {path[], impacts[], terrainDiff[], damage[]}.
  Hỗ trợ các kiểu đạn: thường, đôi (Sấm), nảy 3 lần (Tắc Kè), xuyên gió windK 0.3 (Diều Hâu),
  tách 3 đầu đạn ở đỉnh (Phượng), xích sét (Chớp), hồi máu vùng (Sen), khiên (Ốc Vít).
- TurnManager theo delay, lượt 20s. Có Ngũ Hành multiplier.
- WeaponDefs JSON cho 8 nhân vật (bảng §3) và 8 skin Thần Thoại.
- Zod schema cho mọi message WS.
Test: 1000 phát bắn ngẫu nhiên có seed, so hash kết quả để snapshot. Ngũ Hành phải có đủ ma trận 5x5.
```

### Phase 2 — Server NestJS
```
Modules: AuthModule (guest login bằng deviceId + JWT, có thể bind tài khoản sau), UserModule (profile, tiền tệ, kho đồ),
CharacterModule, MatchmakingModule (Redis sorted set theo Elo, nới rộng biên Elo sau mỗi 5s),
RoomModule + BattleGateway (@nestjs/websockets, socket.io, @socket.io/redis-adapter),
BattleService (authoritative: nhận {angle,power,itemId}, validate, chạy packages/shared, broadcast kết quả,
timeout 20s thì tự bỏ lượt, reconnect thì gửi snapshot), RankModule (mùa 6 tuần, Elo, leaderboard Redis ZSET),
RewardModule, MailModule, ShopModule, DailyCheckInModule, RedDotModule (trả về cây red-dot).
DB: PostgreSQL + Prisma. Rate limit bằng @nestjs/throttler. Validate bằng class-validator hoặc zod. Có Swagger cho REST.
Chống gian lận: server không tin bất kỳ số liệu kết quả nào do client gửi lên. Log mỗi trận gồm (seed, inputs) để replay.
Test: e2e bằng 2 socket client giả lập một trận 1v1 đến khi có kết quả.
```

### Phase 3 — Client: khung UI kiểu game Trung Quốc (packages/ui)
```
Xây UI kit theo Phần B1, skin theo design tokens (nền rừng quân sự #0F1A14, accent vàng #F2A93B, chữ Chakra Petch):
GameButton (primary vàng / secondary / danger; nhún khi bấm, có âm thanh, trạng thái disabled và cooldown dạng vòng tròn),
NinePatchPanel, Popup + PopupQueue, Toast nổi giữa màn, RedDot (gắn theo key), CurrencyBar (số tăng dần bằng GSAP),
StatBar (giống thanh chỉ số trong file thiết kế: nhãn 64px, thanh cao 6px, số bên phải), Tabs kiểu tab dọc bên trái,
AvatarFrame, Marquee, TutorialMask (khoét lỗ + bàn tay chỉ), LoadingScreen (thanh tiến độ + tip ngẫu nhiên),
RewardPopup (rương rung → mở → vật phẩm bay vào túi), CountdownRing (đếm 20s, đổi màu đỏ và rung khi còn 5s).
Có Storybook để xem toàn bộ component.
```

### Phase 4 — Các màn hình
```
1. Splash/Loading: preload asset theo nhóm và hiện %.
2. Lobby: nhân vật 3D ở giữa (R3F, xoay bằng tay). Góc trên trái: avatar, cấp, EXP. Góc trên phải: vàng, kim cương, nút "+".
   Cột icon bên phải có red-dot: Điểm danh, Sự kiện, Thư, Cửa hàng, Chiến lệnh. Hàng dưới: Nhân vật, Túi đồ, Bạn bè, Xếp hạng.
   Nút lớn "BẮT ĐẦU" ở góc dưới phải, mở bảng chọn chế độ. Marquee thông báo ở đầu màn.
3. Chọn chiến binh (theo board "Màn chọn nhân vật"): header có nút back, tiêu đề "CHỌN CHIẾN BINH", số vàng 12.450.
   Bên trái là lưới 8 avatar (avatar đang chọn có viền 2px #F2A93B), bên dưới là "VẬT PHẨM MANG THEO" (Hồi máu, x2 Đạn, + Thêm).
   Ở giữa là model 3D của nhân vật kèm tag lớp. Bên phải là tên, vũ khí, tuyệt chiêu, 4 StatBar và nút "SẴN SÀNG".
4. Trận chiến (theo board "Màn chiến đấu"): góc trên trái và phải là thanh máu của 2 đội.
   Giữa phía trên: "GIÓ" (mũi tên + độ lớn) và "LƯỢT" (đếm giây).
   Góc dưới trái: slider Góc 0–90° và Lực 10–100, đồng thời hỗ trợ kéo trực tiếp trên nhân vật.
   Giữa phía dưới: 4 nút vật phẩm (Hồi máu, Nhân đôi sát thương, Dịch chuyển, Tuyệt chiêu).
   Góc dưới phải: nút Di chuyển và nút "BẮN" lớn (giữ để nạp lực). Có đường quỹ đạo dự đoán (chỉ ở chế độ Luyện tập và kỹ năng Thiên Nhãn).
   Hiển thị "TRÚNG ĐÍCH! −320" / "SƯỢT QUA! −90" / "TRƯỢT". Camera bám theo đạn, rung khi nổ, mảnh đất văng ra.
5. Kết quả: thắng/thua có Lottie, MVP, sao, EXP/vàng đếm tăng, nút "Chơi lại" và "Về sảnh".
6. Bộ sưu tập skin Thần Thoại (theo board "Thiên Binh Thần Tướng"): thẻ nhân vật có huy hiệu hành, tên, xuất xứ thần thoại,
   vũ khí, kỹ năng và bảng Ngũ Hành tương khắc dạng vòng.
7. Cài đặt (dùng antd-mobile): âm lượng BGM/SFX, chất lượng đồ họa (Thấp/Vừa/Cao/Tự động), rung, ngôn ngữ.
```

### Phase 5 — Three.js scene trận đấu
```
Dựng scene R3F theo Phần A §5 và §6: TerrainMesh chia chunk, chỉ dựng lại chunk bị khoét. Nền parallax 3 lớp.
CharacterRig dùng placeholder procedural cho đến khi có .glb. Đạn và VFX dùng InstancedMesh, particle dùng three.quarks
(mỗi hành một preset). Skin Thần Thoại dùng MeshToonMaterial + outline inverted hull.
Có hệ chất lượng tự động: PerformanceMonitor của drei, nếu FPS < 40 trong 3 giây thì giảm DPR, tắt bloom và giảm particle.
Phải đạt ngân sách §7. Thêm overlay r3f-perf khi ?debug=1.
```

### Phase 6 — Âm thanh, haptic, hướng dẫn, polish
```
howler: BGM lobby và BGM trận, SFX click/bắn/nổ/trúng/thắng. Rung bằng navigator.vibrate khi nổ gần và khi bị trúng.
Hướng dẫn tân thủ 6 bước bằng xstate + TutorialMask (chọn tướng → kéo góc → giữ lực → đọc gió → bắn → nhận thưởng).
Điểm danh 7 ngày, red-dot đồng bộ với server. Thêm PWA manifest và icon.
Lighthouse mobile ≥ 80, tải lần đầu < 15MB.
```

---

## Ghi chú cho người dùng prompt
- Nếu có tính năng quay thưởng (gacha / 抽卡), phải hiển thị tỷ lệ rơi và có cơ chế bảo hiểm (pity). Phát hành ở Trung Quốc và nhiều nước khác bắt buộc điều này.
- Phát hành tại Trung Quốc còn cần giấy phép (版号) và hệ thống chống nghiện cho người dưới 18 tuổi (防沉迷). Nên thiết kế sẵn module giới hạn thời gian chơi để bật/tắt theo vùng.
