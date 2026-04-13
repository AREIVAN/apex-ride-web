import { expect, test } from "@playwright/test";

test.describe("mobile nav drawer", () => {
  test("opens, closes, and reopens in two full cycles", async ({ page }) => {
    await page.goto("/e2e/mobile-nav");

    const trigger = page.getByTestId("mobile-nav-trigger");
    const drawer = page.getByTestId("mobile-nav-drawer");
    const close = page.getByTestId("mobile-nav-close");
    const backdrop = page.getByTestId("mobile-nav-backdrop");

    await expect(drawer).toHaveCount(0);

    await trigger.click();
    await expect(drawer).toBeVisible();

    await close.click();
    await expect(drawer).toHaveCount(0);

    await trigger.click();
    await expect(drawer).toBeVisible();

    await backdrop.click({ position: { x: 20, y: 20 } });
    await expect(drawer).toHaveCount(0);
  });
});
