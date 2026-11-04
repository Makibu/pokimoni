import {mkdirSync} from "node:fs";
import {join} from "node:path";
import {test} from "@playwright/test";

// Pack opening stages for visual review: `SCREENS_OUT=<dir> npx playwright test -c playwright.perf.config.ts pack-screens`.
const OUT = process.env.SCREENS_OUT;
const VIEWPORTS = [
    {width: 360, height: 640},
    {width: 390, height: 844},
    {width: 1280, height: 800},
];
const RARITIES = ["common", "rare", "ultra rare", "special illustration rare", "hyper rare"];

test("capture pack opening", async ({browser, baseURL, page}) => {
    test.skip(!OUT, "SCREENS_OUT is not set");
    test.setTimeout(300_000);
    mkdirSync(OUT!, {recursive: true});

    await page.setExtraHTTPHeaders({"x-forwarded-for": "10.77.77.79"});
    await page.goto("/login");
    const opened = await page.evaluate(async () => {
        const send = (path: string, body: unknown) =>
            fetch(path, {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
        const id = Date.now().toString(36);
        await send("/api/auth/register", {
            username: `P_${id}`,
            email: `p${id}@example.com`,
            password: "screens-password",
        });
        const shop = await (await fetch("/api/shop")).json();
        const set = shop.sets.find((entry: {tier: number}) => entry.tier === 1);
        return (await send("/api/packs/open", {setId: set.id, source: "shop"})).json();
    });
    // Real card art with a spread of rarities, so every effect shows up.
    const answer = {
        ...opened,
        earned: {achievements: [], badges: []},
        cards: opened.cards.map((card: object, index: number) => ({
            ...card,
            rarity: RARITIES[index],
            isNew: index === 0 || index === 3,
            overLimit: index === 4,
            ownedCopies: index === 4 ? 9 : 1,
        })),
    };
    const state = await page.context().storageState();

    for (const viewport of VIEWPORTS) {
        const context = await browser.newContext({baseURL, viewport, storageState: state});
        const player = await context.newPage();
        await player.route("**/api/packs/open", (route) => route.fulfill({json: answer}));
        const shot = (name: string) => player.screenshot({path: join(OUT!, `pack-${viewport.width}-${name}.png`)});

        await player.goto("/shop");
        await player.waitForLoadState("networkidle");
        await player
            .getByRole("button", {name: /za 150 monet/})
            .first()
            .click();
        await player.getByRole("button", {name: /Otwórz za 150/}).waitFor();
        await player.waitForTimeout(500);
        await shot("1-offer");

        await player.getByRole("button", {name: /Otwórz za 150/}).click();
        const pack = player.getByTestId("pack");
        await player.getByText(/Przeciągnij palcem/).waitFor();
        await player.waitForTimeout(300);

        const box = (await pack.boundingBox())!;
        const y = box.y + box.height / 2;
        await player.mouse.move(box.x + 5, y);
        await player.mouse.down();
        await player.mouse.move(box.x + box.width * 0.45, y, {steps: 5});
        await player.waitForTimeout(200);
        await shot("2-cutting");
        await player.mouse.move(box.x + box.width - 5, y, {steps: 5});
        await player.mouse.up();
        await player.waitForTimeout(260);
        await shot("3-torn");

        const counter = player.getByText(/^Karta \d z 5$/);
        const next = player.getByRole("button", {name: /Następna karta|Zobacz wszystkie/});
        const faceUp = player.locator('.reveal-flip[data-flipped="true"]');

        await counter.waitFor();
        await shot("4-face-down");
        await faceUp.waitFor();
        await player.waitForTimeout(700);
        await shot("5-common");

        for (const [index, name] of [
            [2, "6-rare"],
            [3, "7-ultra"],
            [4, "8-burst"],
            [5, "9-limit"],
        ] as const) {
            await next.click();
            await player.getByText(`Karta ${index} z 5`, {exact: true}).waitFor();
            if (name === "8-burst") {
                await faceUp.waitFor({timeout: 5000});
                await player.waitForTimeout(150);
                await shot("8a-flash");
            }
            await faceUp.waitFor();
            await player.waitForTimeout(1600);
            await shot(name);
        }

        await next.click();
        await player.getByTestId("opened-card").first().waitFor();
        await player.waitForLoadState("networkidle");
        await player.waitForTimeout(500);
        await shot("10-summary");

        await player.getByTestId("opened-card").nth(3).click();
        await player.getByText("Twoje egzemplarze").waitFor();
        await player.waitForTimeout(1200);
        await shot("11-preview");
        await context.close();
    }
});
