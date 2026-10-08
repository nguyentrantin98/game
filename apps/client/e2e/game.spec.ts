import { expect, test } from '@playwright/test';

test('Vua Cờ: chọn từng loại cờ và đi một nước', async ({ page }) => {
  await page.goto('/');
  for (const v of ['xiangqi', 'jieqi', 'chess', 'gomoku']) {
    await page.click(`#variant-${v}`);
    await page.click('#btn-play');
    const sq = page.locator('[data-sq]');
    if (v === 'gomoku') await sq.nth(112).click();
    else if (v === 'chess') {
      await sq.nth(52).click();
      await sq.nth(36).click();
    } else {
      await sq.nth(64).click();
      await sq.nth(67).click();
    }
    await expect(page.locator('#turn')).toContainText('Lượt');
    await page.getByText('VỀ SẢNH').click();
  }
});
