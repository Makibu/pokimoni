import path from "node:path";
import {expect, type Page, test} from "@playwright/test";
import {register} from "../e2e/helpers";

/** Screenshots for the final responsive review. Run with SCREENS_OUT=<dir>. */
const OUT = process.env.SCREENS_OUT ?? "";
const VIEWPORTS = [
    {name: "360", width: 360, height: 640},
    {name: "768", width: 768, height: 1024},
    {name: "1280", width: 1280, height: 800},
    {name: "1920", width: 1920, height: 1080},
];
const ROUTES: [string, string][] = [
    ["home", "/"],
    ["shop", "/shop"],
    ["collection", "/collection"],
    ["friends", "/friends"],
    ["minigame", "/minigame"],
    ["achievements", "/achievements"],
    ["statistics", "/statistics"],
];

async function settle(page: Page) {
    await page.waitForLoadState("networkidle").catch(() => undefined);
}

/** Elements wider than the screen, ignoring those inside something that scrolls or clips on purpose. */
const overflowing = (page: Page) =>
    page.evaluate(() => {
        const width = document.documentElement.clientWidth;
        const page = document.documentElement.scrollWidth - width;
        const offenders = [...document.querySelectorAll("body *")]
            .filter((element) => {
                const box = element.getBoundingClientRect();
                if (box.width === 0 || (box.right <= width + 1 && box.left >= -1)) return false;
                for (let parent = element.parentElement; parent; parent = parent.parentElement) {
                    const {overflowX} = getComputedStyle(parent);
                    if (overflowX !== "visible") return false;
                }
                return true;
            })
            .slice(0, 5)
            .map((element) => `${element.tagName}.${String(element.className).slice(0, 60)}`);
        return {page, offenders};
    });

/** Controls smaller than the 44 px the specification asks for, on touch-sized screens. */
const smallTargets = (page: Page) =>
    page.evaluate(() =>
        [...document.querySelectorAll("a, button, input, select, [role=button], [role=tab]")]
            .filter((element) => {
                const box = element.getBoundingClientRect();
                return box.width > 0 && box.height > 0 && (box.height < 44 || box.width < 44);
            })
            .slice(0, 12)
            .map((element) => {
                const box = element.getBoundingClientRect();
                const label = element.getAttribute("aria-label") ?? element.textContent?.trim().slice(0, 30);
                return `${element.tagName} "${label}" ${Math.round(box.width)}x${Math.round(box.height)}`;
            }),
    );

for (const viewport of VIEWPORTS) {
    test(`responsive review at ${viewport.name}`, async ({browser, baseURL}) => {
        test.setTimeout(240_000);
        const context = await browser.newContext({baseURL, viewport});
        const page = await context.newPage();
        await page.emulateMedia({reducedMotion: "reduce"});

        await page.goto("/login");
        await expect(page.getByLabel("Email")).toBeVisible();
        await settle(page);
        await page.screenshot({path: path.join(OUT, `login-${viewport.name}.png`), fullPage: true});
        const report: Record<string, unknown> = {login: await overflowing(page)};

        const name = `R${viewport.name}${Date.now().toString(36)}`;
        await register(page, {username: name, email: `${name}@example.com`});

        // Opened cards fill the empty states.
        await page.goto("/shop");
        await page
            .getByRole("button", {name: /za 150 monet/})
            .first()
            .click();
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await page.getByTestId("pack").click();
        await page.getByRole("button", {name: "Pomiń"}).click();
        await expect(page.getByTestId("opened-card")).toHaveCount(5);
        await settle(page);
        await page.screenshot({path: path.join(OUT, `opened-${viewport.name}.png`)});
        report.opened = await overflowing(page);
        await page.getByTestId("opened-card").first().click();
        await expect(page.getByText("Twoje egzemplarze")).toBeVisible();
        await settle(page);
        await page.screenshot({path: path.join(OUT, `preview-${viewport.name}.png`)});
        await page.keyboard.press("Escape");
        await page.getByRole("button", {name: "Zamknij", exact: true}).first().click();

        for (const [label, route] of ROUTES) {
            await page.goto(route);
            await settle(page);
            await page.waitForTimeout(300);
            await page.screenshot({path: path.join(OUT, `${label}-${viewport.name}.png`), fullPage: true});
            report[label] = await overflowing(page);
            if (viewport.width < 768) report[`${label}-targets`] = await smallTargets(page);
        }

        await page.goto("/collection");
        await page.locator('a[href^="/collection/"]').first().click();
        await expect(page.getByRole("searchbox", {name: "Szukaj karty"})).toBeVisible();
        await settle(page);
        await page.screenshot({path: path.join(OUT, `set-${viewport.name}.png`)});
        report.set = await overflowing(page);

        await page.goto("/");
        await page.getByRole("button", {name: "Menu użytkownika"}).click();
        await page.getByRole("menuitem", {name: "Ustawienia"}).click();
        await expect(page.getByRole("button", {name: "Ciemny"})).toBeVisible();
        await page.screenshot({path: path.join(OUT, `settings-${viewport.name}.png`)});
        report.settings = await overflowing(page);

        console.log(`REPORT ${viewport.name} ${JSON.stringify(report)}`);
        await context.close();
    });
}
