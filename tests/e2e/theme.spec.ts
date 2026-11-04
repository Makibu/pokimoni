import {expect, test, type Page} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

async function openSettings(page: Page) {
    await page.getByRole("button", {name: "Menu użytkownika"}).click();
    await page.getByRole("menuitem", {name: "Ustawienia"}).click();
}

const html = (page: Page) => page.locator("html");

test("the game starts in the light theme", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
});

test("the dark theme applies at once, survives a reload and does not flash", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await openSettings(page);
    await page.getByRole("button", {name: "Ciemny"}).click();
    await expect(html(page)).toHaveClass(/\bdark\b/);

    // Reported by a script that runs as soon as the first element after <html> exists, before any paint.
    await page.addInitScript(() => {
        new MutationObserver((_records, observer) => {
            if (!document.body) return;
            observer.disconnect();
            requestAnimationFrame(() => {
                (window as unknown as {themeAtFirstFrame: string}).themeAtFirstFrame =
                    document.documentElement.className;
            });
        }).observe(document, {childList: true, subtree: true});
    });
    await page.reload();
    await expect(html(page)).toHaveClass(/\bdark\b/);
    const themeAtFirstFrame = await page.evaluate(
        () => (window as unknown as {themeAtFirstFrame?: string}).themeAtFirstFrame,
    );
    expect(themeAtFirstFrame).toMatch(/\bdark\b/);

    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(background).toBe("rgb(21, 17, 43)");
});

test("the system theme follows the device setting", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));

    await openSettings(page);
    await page.getByRole("button", {name: "Systemowy"}).click();

    await page.emulateMedia({colorScheme: "dark"});
    await expect(html(page)).toHaveClass(/\bdark\b/);
    await page.emulateMedia({colorScheme: "light"});
    await expect(html(page)).not.toHaveClass(/\bdark\b/);
});
