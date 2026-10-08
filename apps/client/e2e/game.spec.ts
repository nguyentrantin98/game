import { expect, test, type Page } from '@playwright/test';

const shot = (page: Page, name: string) => page.screenshot({ path: `e2e/screenshots/${name}.png` });

async function closePopup(page: Page) {
  await page.getByRole('button', { name: 'close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}

test('luồng chính: Loading → Lobby → Chọn tướng → Trận luyện tập → Kết quả', async ({ page }) => {
  test.setTimeout(420_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/?e2e=1');
  await expect(page.getByTestId('lobby')).toBeVisible();

  // popup điểm danh tự mở khi đăng nhập (red-dot lobby.checkin)
  await expect(page.getByRole('dialog', { name: 'Điểm danh' })).toBeVisible();
  await page.waitForTimeout(600);
  await shot(page, '01-checkin');
  await page.locator('#btn-do-checkin').click();
  await expect(page.locator('#btn-do-checkin')).toHaveText('Đã nhận');
  await closePopup(page);
  await expect(page.locator('#btn-checkin [data-reddot]')).toHaveCount(0);

  await page.waitForTimeout(800);
  await shot(page, '02-lobby');

  // bộ sưu tập Thần Thoại
  await page.locator('#btn-collection').click();
  await expect(page.getByTestId('collection')).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, '03-collection');
  await closePopup(page);

  // cài đặt (antd-mobile)
  await page.locator('#btn-settings').click();
  await expect(page.getByTestId('settings')).toBeVisible();
  await page.waitForTimeout(400);
  await shot(page, '04-settings');
  await closePopup(page);

  // chọn chế độ → luyện tập
  await page.locator('#btn-start').click({ force: true }); // nút "thở" (scale lặp) không bao giờ đứng yên
  await page.waitForTimeout(400);
  await shot(page, '05-mode');
  await page.locator('[data-mode="practice"]').click();
  await expect(page.getByTestId('select')).toBeVisible();

  await page.locator('[data-char="gau"]').click();
  await expect(page.getByTestId('sel-name')).toHaveText('Gấu');
  await page.getByTestId('skin-toggle').click();
  await expect(page.getByTestId('sel-name')).toHaveText('Tam Nhãn');
  await page.waitForTimeout(700);
  await shot(page, '06-select');

  await page.locator('#btn-ready').click();
  await expect(page.getByTestId('battle-hud')).toBeVisible();
  await page.waitForTimeout(2600);
  await shot(page, '07-battle-start');

  let fired = 0;
  let sawFlight = false;
  const deadline = Date.now() + 340_000;
  while (Date.now() < deadline) {
    if (await page.getByTestId('result').isVisible()) break;
    // hướng dẫn tân thủ: bấm Tiếp tới hết
    if (await page.getByTestId('tutorial').isVisible()) {
      if (fired === 0) await shot(page, '08-tutorial');
      await page.getByRole('button', { name: 'Tiếp' }).click();
      continue;
    }
    const fireBtn = page.getByTestId('btn-fire');
    if (await fireBtn.isEnabled()) {
      await page.evaluate(() => (window as unknown as { __army3d: { autoAim(): unknown } }).__army3d.autoAim());
      if (fired === 1) {
        // lượt thứ 2 thử dùng vật phẩm x2 Đạn
        await page.getByTestId('item-double').click({ timeout: 3000 }).catch(() => {});
      }
      await page.waitForTimeout(150);
      if (fired === 0) await shot(page, '09-aim');
      // lượt có thể vừa hết giờ (20s) giữa lúc kiểm tra và bấm → thử lại vòng sau
      if (!(await fireBtn.click({ timeout: 3000 }).then(() => true, () => false))) continue;
      fired++;
      if (!sawFlight) {
        await page.waitForTimeout(700);
        await shot(page, '10-projectile');
        await page.waitForTimeout(900);
        await shot(page, '11-explosion');
        sawFlight = true;
      }
      continue;
    }
    await page.waitForTimeout(300);
  }

  await expect(page.getByTestId('result')).toBeVisible();
  await page.waitForTimeout(2000);
  await shot(page, '12-result');
  expect(fired).toBeGreaterThan(0);
  await expect(page.getByTestId('reward-gold')).not.toHaveText('+0');

  await page.getByRole('button', { name: 'Về sảnh' }).click();
  await expect(page.getByTestId('lobby')).toBeVisible();

  const fatal = errors.filter((e) => !/fonts\.g|ERR_|net::|Failed to load resource/.test(e));
  expect(fatal, fatal.join('\n')).toEqual([]);
});

test('màn dọc hiện hướng dẫn xoay ngang', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.getByText('Xoay ngang điện thoại để chơi')).toBeVisible();
  await shot(page, '00-portrait');
  await ctx.close();
});

test('đổi ngôn ngữ sang 简体中文', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('lobby')).toBeVisible();
  if (await page.getByRole('dialog').isVisible()) await closePopup(page);
  await page.locator('#btn-settings').click();
  await page.getByText('简体中文').click();
  await closePopup(page);
  await expect(page.locator('#btn-start')).toContainText('开始游戏');
  await page.waitForTimeout(500);
  await shot(page, '13-lobby-zh');
  await page.locator('#btn-settings').click();
  await page.getByText('Tiếng Việt').click();
});
