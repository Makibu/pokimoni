import {expect, type Page, test} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

/**
 * Dialogs load their code on first use. While it downloads, what is already on screen has to stay there: without
 * a Suspense boundary of their own, React hides the page and shows the route's loading screen for that moment.
 */
async function slowDownNewCode(page: Page) {
    await page.route("**/_next/static/chunks/**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 600));
        await route.continue();
    });
}

/** Checks every frame, because the flash is too short for an ordinary assertion to see. */
async function watchForFlash(page: Page, selector: string) {
    await page.evaluate((watched) => {
        const isOnScreen = (element: Element) => element.isConnected && element.getClientRects().length > 0;
        const elements = [...document.querySelectorAll(watched)].filter(isOnScreen);
        if (elements.length === 0) throw new Error(`Nothing to watch: ${watched}`);
        const state = {flashed: false};
        (window as unknown as {flashState: typeof state}).flashState = state;
        const check = () => {
            if (!elements.every(isOnScreen)) state.flashed = true;
            requestAnimationFrame(check);
        };
        check();
    }, selector);
}

const flashed = (page: Page) =>
    page.evaluate(() => (window as unknown as {flashState: {flashed: boolean}}).flashState.flashed);

test("the first preview after opening a pack keeps the pack window on screen", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    await page.goto("/shop");
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
    await page.getByRole("button", {name: /Otwórz za 150/}).click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await expect(page.getByTestId("opened-card")).toHaveCount(5);

    await slowDownNewCode(page);
    await watchForFlash(page, ".pack-table");
    await page.getByTestId("opened-card").first().click();
    await expect(page.getByText("Twoje egzemplarze")).toBeVisible();

    expect(await flashed(page)).toBe(false);
});

test("the first pack window keeps the shop on screen", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    await page.goto("/shop");
    await expect(page.getByRole("button", {name: /za 150 monet/}).first()).toBeVisible();

    await slowDownNewCode(page);
    await watchForFlash(page, "main > *");
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
    await expect(page.getByRole("button", {name: /Otwórz za 150/})).toBeVisible();

    expect(await flashed(page)).toBe(false);
});

test("the first card preview keeps the collection on screen", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    const {setId, cardName} = await page.evaluate(async () => {
        const shop = await (await fetch("/api/shop")).json();
        const set = shop.sets.find((entry: {tier: number}) => entry.tier === 1);
        const opened = await (
            await fetch("/api/packs/open", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({setId: set.id, source: "shop"}),
            })
        ).json();
        return {setId: set.id as string, cardName: opened.cards[0].name as string};
    });
    await page.goto(`/collection/${setId}`);
    const tile = page.getByRole("button", {name: `Podgląd karty ${cardName}`}).first();
    await expect(tile).toBeVisible();

    await slowDownNewCode(page);
    await watchForFlash(page, "main > *");
    await tile.click();
    await expect(page.getByText("Twoje egzemplarze")).toBeVisible();

    expect(await flashed(page)).toBe(false);
});

test("the dialogs on the home page keep the page on screen", async ({page}, testInfo) => {
    await register(page, uniquePlayer(testInfo.project.name));
    await page.goto("/");
    const openers: (() => Promise<void>)[] = [
        () => page.getByRole("button", {name: /Slot na kartę 1/}).click(),
        () => page.getByRole("button", {name: "Informacje o aplikacji"}).click(),
        () => page.getByRole("button", {name: "Zgłoś błąd lub pomysł"}).click(),
        async () => {
            await page.getByRole("button", {name: "Menu użytkownika"}).click();
            await page.getByRole("menuitem", {name: "Ustawienia"}).click();
        },
    ];
    await expect(page.getByRole("button", {name: /Slot na kartę 1/})).toBeVisible();

    await slowDownNewCode(page);
    await watchForFlash(page, "header, main > *");
    for (const open of openers) {
        await open();
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeHidden();
    }

    expect(await flashed(page)).toBe(false);
});
