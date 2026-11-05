import path from "node:path";
import {type Browser, expect, type Page, test} from "@playwright/test";
import {register} from "../e2e/helpers";

/** Screenshots of the social views for the owner's acceptance. Run with SCREENS_OUT=<dir>. */
const OUT = process.env.SCREENS_OUT ?? "";
const VIEWPORTS = [
    {name: "360", width: 360, height: 640},
    {name: "1280", width: 1280, height: 800},
];

async function player(
    browser: Browser,
    baseURL: string | undefined,
    username: string,
    viewport: {width: number; height: number},
    dark: boolean,
) {
    const context = await browser.newContext({baseURL, viewport, colorScheme: dark ? "dark" : "light"});
    const page = await context.newPage();
    await page.addInitScript((theme) => localStorage.setItem("theme", theme), dark ? "dark" : "light");
    await page.emulateMedia({reducedMotion: "reduce"});
    await register(page, {username, email: `${username}@example.com`});
    return page;
}

async function openPacks(page: Page, setIndex: number) {
    await page.evaluate(async (index) => {
        const shop = await (await fetch("/api/shop")).json();
        const set = shop.sets.filter((entry: {tier: number}) => entry.tier === 1)[index];
        for (let i = 0; i < 2; i++) {
            await fetch("/api/packs/open", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({setId: set.id, source: "shop"}),
            });
        }
    }, setIndex);
}

const shot = async (page: Page, name: string) => {
    await page.waitForLoadState("networkidle").catch(() => undefined);
    await page.screenshot({path: path.join(OUT, `${name}.png`)});
};

for (const viewport of VIEWPORTS) {
    for (const dark of [false, true]) {
        const label = `${viewport.name}-${dark ? "dark" : "light"}`;

        test(`social screens ${label}`, async ({browser, baseURL}) => {
            test.skip(!OUT, "SCREENS_OUT is not set");
            test.setTimeout(240_000);
            const suffix = Math.floor(Math.random() * 100000);
            const a = await player(browser, baseURL, `Misty_${suffix}`, viewport, dark);
            const b = await player(browser, baseURL, `Brock_${suffix}`, viewport, dark);
            await openPacks(a, 0);
            await openPacks(b, 1);

            await a.goto("/friends");
            await a.getByLabel("Nick gracza").fill(`brock_${suffix}`);
            await a.getByRole("button", {name: "Szukaj"}).click();
            await a.getByRole("button", {name: "Zaproś", exact: true}).click();
            await expect(a.getByRole("button", {name: "Wycofaj", exact: true})).toBeVisible();
            await shot(a, `friends-invited-${label}`);

            await b.goto("/");
            await expect(b.getByTestId("inbox-dot")).toBeVisible();
            await shot(b, `header-dot-${label}`);
            await b.getByRole("button", {name: /^Skrzynka/}).click();
            await expect(b.getByText("zaprasza Cię do znajomych")).toBeVisible();
            await shot(b, `inbox-invitation-${label}`);
            await b.getByRole("button", {name: "Przyjmij"}).click();
            await expect(b.getByRole("button", {name: "Przyjmij"})).toBeHidden();
            await b.keyboard.press("Escape");

            await a.goto("/friends");
            await a.getByRole("button", {name: "Wymień się"}).click();
            const cards = a.getByRole("dialog").getByTestId("trade-cards").getByRole("button");
            await cards.first().click();
            await shot(a, `trade-picking-${label}`);
            await cards.first().click();
            await a.waitForTimeout(600);
            await shot(a, `trade-chosen-${label}`);
            await a.getByRole("button", {name: "Wyślij ofertę"}).click();
            await expect(a.getByRole("button", {name: "Wycofaj ofertę"})).toBeVisible();
            await a.waitForTimeout(600);
            await shot(a, `friends-offer-sent-${label}`);

            const held = await a.evaluate(async () => {
                const owned = await (await fetch("/api/collection/owned")).json();
                return owned.find((card: {escrowed: number}) => card.escrowed > 0).id as string;
            });
            await a.goto(`/collection/${held.split("-")[0]}`);
            await a.getByText("W ofercie").scrollIntoViewIfNeeded();
            await shot(a, `collection-held-${label}`);

            await b.goto("/");
            await b.getByRole("button", {name: /^Skrzynka/}).click();
            await expect(b.getByText("proponuje wymianę")).toBeVisible();
            await shot(b, `inbox-offer-${label}`);
            await b.keyboard.press("Escape");

            // The limit needs 9 copies of one card, so only this view gets its answer adjusted.
            await b.route("**/api/trades", async (route) => {
                const response = await route.fetch();
                const body = await response.json();
                body.incoming[0].receivedOverLimit = true;
                await route.fulfill({response, json: body});
            });
            await b.goto("/friends");
            await expect(b.getByText("LIMIT:")).toBeVisible();
            await b.getByText("LIMIT:").scrollIntoViewIfNeeded();
            await shot(b, `friends-limit-${label}`);
            await b.unroute("**/api/trades");
            await b.goto("/");

            await b.getByRole("button", {name: "Menu użytkownika"}).click();
            await b.getByRole("menuitem", {name: "Mój profil"}).click();
            await b.getByRole("button", {name: "Edytuj profil"}).click();
            await expect(b.getByTestId("showcase-picker")).toBeVisible();
            for (const index of [0, 1, 2]) {
                await b.getByTestId("showcase-picker").getByRole("button").nth(index).click();
            }
            await shot(b, `profile-editor-${label}`);
            await b.getByRole("button", {name: "Zapisz profil"}).click();
            await expect(b.getByTestId("showcase")).toBeVisible();
            await shot(b, `profile-own-${label}`);
            await b.keyboard.press("Escape");

            await a.goto("/friends");
            await a
                .getByRole("button", {name: `Brock_${suffix}`})
                .first()
                .click();
            await expect(a.getByTestId("showcase")).toBeVisible();
            await shot(a, `profile-friend-${label}`);

            await a.context().close();
            await b.context().close();
        });
    }
}

test("the header fits six links on the narrowest desktop", async ({browser, baseURL}) => {
    test.skip(!OUT, "SCREENS_OUT is not set");
    test.setTimeout(120_000);
    const page = await player(
        browser,
        baseURL,
        `Tracey_${Math.floor(Math.random() * 100000)}`,
        {width: 1024, height: 700},
        false,
    );
    await page.goto("/friends");
    await expect(page.getByRole("heading", {name: "Znajomi"})).toBeVisible();
    await shot(page, "friends-empty-1024-light");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
