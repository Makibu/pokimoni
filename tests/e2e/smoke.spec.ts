import {expect, test} from "@playwright/test";

test("guest is redirected from the home page to login", async ({page}) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
});

test("login page renders the sign-in form", async ({page}) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email").first()).toBeVisible();
    await expect(page.locator("input[type=password]").first()).toBeVisible();
});
