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

test("public images work through the image optimizer", async ({request}) => {
    const response = await request.get("/_next/image?url=%2Favatars%2Favatar-1.webp&w=48&q=75");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("image/");
});
