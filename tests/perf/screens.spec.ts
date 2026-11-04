import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {test, type Browser, type Page} from "@playwright/test";

// Screenshots for visual review: `SCREENS_OUT=<dir> npx playwright test -c playwright.perf.config.ts screens`.
const OUT = process.env.SCREENS_OUT;
const WIDTHS = [
    {width: 360, height: 800},
    {width: 768, height: 1024},
    {width: 1280, height: 800},
    {width: 1920, height: 1080},
];
const THEMES = ["light", "dark"] as const;

async function revealWholePage(page: Page) {
    await page.waitForLoadState("networkidle");
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < height; y += 500) {
        await page.evaluate((top) => window.scrollTo(0, top), y);
        await page.waitForTimeout(60);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(250);
}

async function themedPage(
    browser: Browser,
    baseURL: string,
    state: Awaited<ReturnType<ReturnType<Page["context"]>["storageState"]>> | undefined,
    viewport: {width: number; height: number},
    theme: string,
) {
    const context = await browser.newContext({baseURL, viewport, storageState: state, reducedMotion: "reduce"});
    await context.addInitScript((value) => localStorage.setItem("theme", value), theme);
    return context.newPage();
}

test("capture screens", async ({page, browser, baseURL}) => {
    test.skip(!OUT, "SCREENS_OUT is not set");
    test.setTimeout(1_200_000);
    mkdirSync(OUT!, {recursive: true});

    await page.setExtraHTTPHeaders({"x-forwarded-for": "10.77.77.77"});
    await page.goto("/login");
    const {setId, setName, opened} = await page.evaluate(async () => {
        const send = (path: string, method: string, body: unknown) =>
            fetch(path, {method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
        const id = Date.now().toString(36);
        await send("/api/auth/register", "POST", {
            username: `Ash_${id}`,
            email: `a${id}@example.com`,
            password: "screens-password",
        });
        await send("/api/daily/claim", "POST", undefined);
        const shop = await (await fetch("/api/shop")).json();
        const cheapest = shop.sets.find((set: {tier: number}) => set.tier === 1);
        let opened: unknown;
        for (let i = 0; i < 3; i++) {
            opened = await (await send("/api/packs/open", "POST", {setId: cheapest.id, source: "shop"})).json();
        }
        const owned = (await (await fetch("/api/collection/owned")).json()) as {id: string; income: number}[];
        const best = owned.sort((a, b) => b.income - a.income)[0];
        await send("/api/slots/1", "PUT", {cardId: best.id});
        return {setId: cheapest.id as string, setName: cheapest.name as string, opened};
    });
    const state = await page.context().storageState();

    const routes: [string, string][] = [
        ["home", "/"],
        ["shop", "/shop"],
        ["collection", "/collection"],
        ["set", `/collection/${setId}`],
        ["achievements", "/achievements"],
        ["statistics", "/statistics"],
    ];

    for (const viewport of WIDTHS) {
        for (const theme of THEMES) {
            const guest = await themedPage(browser, baseURL!, undefined, viewport, theme);
            await guest.goto("/login");
            await revealWholePage(guest);
            await guest.screenshot({path: join(OUT!, `${viewport.width}-${theme}-login.png`), fullPage: true});
            await guest.context().close();

            const player = await themedPage(browser, baseURL!, state, viewport, theme);
            for (const [name, route] of routes) {
                await player.goto(route);
                await revealWholePage(player);
                await player.screenshot({path: join(OUT!, `${viewport.width}-${theme}-${name}.png`), fullPage: true});
            }

            const shot = (name: string) =>
                player.screenshot({path: join(OUT!, `${viewport.width}-${theme}-dialog-${name}.png`)});
            const settle = () => player.waitForTimeout(400);

            await player.goto("/");
            await revealWholePage(player);
            await player.getByRole("button", {name: "Menu użytkownika"}).click();
            await settle();
            await shot("menu");
            await player.getByRole("menuitem", {name: "Profil"}).click();
            await player.getByRole("dialog").waitFor();
            await settle();
            await shot("profile");
            await player.getByRole("tab", {name: "Ustawienia"}).click();
            await settle();
            await shot("settings");
            await player.keyboard.press("Escape");

            await player.getByRole("button", {name: /^Slot na kartę 2/}).click();
            await player.getByRole("dialog").waitFor();
            await player.waitForLoadState("networkidle");
            await settle();
            await shot("slot-picker");
            await player.getByRole("button", {name: "Anuluj"}).click();
            await settle();

            await player.getByRole("button", {name: "Zgłoś błąd lub pomysł"}).click();
            await player.getByRole("dialog").waitFor();
            await settle();
            await shot("feedback");
            await player.keyboard.press("Escape");
            await settle();
            await player.getByRole("button", {name: "Informacje o aplikacji"}).click();
            await player.getByRole("dialog").waitFor();
            await settle();
            await shot("info");
            await player.keyboard.press("Escape");

            await player.route("**/api/packs/open", (route) => route.fulfill({json: opened}));
            await player.goto("/shop");
            await revealWholePage(player);
            await player.getByRole("button", {name: `Kup paczkę ${setName}`}).click();
            await player.getByRole("dialog").waitFor();
            await player.waitForLoadState("networkidle");
            await settle();
            await shot("pack-before");
            await player.getByRole("button", {name: /^Otwórz za/}).click();
            await player.getByTestId("opened-card").first().waitFor();
            await player.waitForLoadState("networkidle");
            await settle();
            await shot("pack-after");

            // Loading placeholders: the API stays unanswered while the shot is taken.
            await player.route("**/api/**", () => undefined);
            for (const [name, route] of routes) {
                await player.goto(route);
                await player.waitForTimeout(400);
                await player.screenshot({path: join(OUT!, `${viewport.width}-${theme}-${name}-loading.png`)});
            }
            await player.context().close();
        }
    }
});
