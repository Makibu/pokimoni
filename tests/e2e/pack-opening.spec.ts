import {expect, type Page, test} from "@playwright/test";
import {register, uniquePlayer} from "./helpers";

async function offerCheapestPack(page: Page, testInfo: {project: {name: string}}) {
    await register(page, uniquePlayer(testInfo.project.name));
    await page.goto("/shop");
    await page
        .getByRole("button", {name: /za 150 monet/})
        .first()
        .click();
}

const pack = (page: Page) => page.getByTestId("pack");
const cardCounter = (page: Page) => page.getByText(/^Karta \d z 5$/);

const faceUp = (page: Page) => page.locator('.reveal-flip[data-flipped="true"]');

/** Looks at every card once it has turned over, then moves on, the way a player does. */
async function revealAll(page: Page, action: () => Promise<void>) {
    for (let number = 1; number <= 5; number++) {
        await expect(cardCounter(page)).toHaveText(`Karta ${number} z 5`);
        await faceUp(page).waitFor();
        await action();
    }
    await expect(page.getByTestId("opened-card")).toHaveCount(5);
}

/** Five cards with known rarities. The server's answer decides what the player sees. */
async function answerWithKnownCards(page: Page) {
    const image = "https://images.pokemontcg.io/sv3/1.png";
    const card = (id: string, name: string, rarity: string, extra: object) => ({
        id,
        name,
        rarity,
        income: 12,
        imageSmall: image,
        imageLarge: image,
        isNew: false,
        overLimit: false,
        ownedCopies: 1,
        ...extra,
    });
    await page.route("**/api/packs/open", (route) =>
        route.fulfill({
            json: {
                openingId: 1,
                isGodPack: true,
                coins: 350,
                set: {id: "sv3", name: "Obsidian Flames", logo: image},
                earned: {achievements: [], badges: []},
                cards: [
                    card("a", "Pospolita", "common", {isNew: true}),
                    card("b", "Rzadka", "rare", {}),
                    card("c", "Ultra", "ultra rare", {}),
                    card("d", "Sekretna", "secret rare", {isNew: true}),
                    card("e", "Dziesiata", "hyper rare", {overLimit: true, ownedCopies: 9}),
                ],
            },
        }),
    );
}

/** The sealed pack floats forever, so waiting for it to hold still would never end. */
async function cutWithClick(page: Page) {
    await expect(pack(page)).toBeEnabled();
    await pack(page).click({force: true});
}

test.describe("with motion", () => {
    test("the pack is cut with a drag, cards come one by one, the summary leads to a preview", async ({
        page,
    }, testInfo) => {
        await offerCheapestPack(page, testInfo);

        // Coins move only when the player confirms, and the result is known before the cut.
        await expect(page.getByText("500", {exact: true}).first()).toBeAttached();
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await expect(page.getByText(/Przeciągnij palcem/)).toBeVisible();

        // A short drag does not cut.
        const box = (await pack(page).boundingBox())!;
        const y = box.y + box.height / 2;
        await page.mouse.move(box.x + 10, y);
        await page.mouse.down();
        await page.mouse.move(box.x + 30, y);
        await page.mouse.up();
        await expect(pack(page)).toHaveAttribute("data-state", "sealed");

        // A full drag does, even one that starts on the set logo.
        await page.mouse.move(box.x + box.width * 0.25, y);
        await page.mouse.down();
        await page.mouse.move(box.x + box.width, y, {steps: 8});
        await page.mouse.up();

        await revealAll(page, () => page.getByRole("button", {name: /Następna karta|Zobacz wszystkie/}).click());

        const first = page.getByTestId("opened-card").first();
        const name = (await first.getAttribute("aria-label"))!.replace("Podgląd karty ", "");
        await first.click();
        const preview = page.getByRole("dialog", {name});
        await expect(preview.getByText("Rzadkość")).toBeVisible();
        await expect(preview.getByText("Zestaw")).toBeVisible();
        await expect(preview.getByText("Dochód w slocie")).toBeVisible();
        await expect(preview.getByText(/\d z 9/)).toBeVisible();

        // Escape closes only the preview.
        await page.keyboard.press("Escape");
        await expect(preview).toBeHidden();
        await expect(page.getByTestId("opened-card")).toHaveCount(5);
    });

    test("cards can be swiped and tapped away", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await cutWithClick(page);

        const card = page.getByTestId("reveal-card");

        await expect(cardCounter(page)).toHaveText("Karta 1 z 5");
        await faceUp(page).waitFor();
        await card.click();
        await expect(cardCounter(page)).toHaveText("Karta 2 z 5");

        await faceUp(page).waitFor();
        const box = (await card.boundingBox())!;
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;

        // A short drag puts the card back.
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 30, y, {steps: 3});
        await page.mouse.up();
        await expect(cardCounter(page)).toHaveText("Karta 2 z 5");

        // A long one throws it away.
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x - 120, y, {steps: 6});
        await page.mouse.up();
        await expect(cardCounter(page)).toHaveText("Karta 3 z 5");
    });

    test("the first action on a face-down card turns it over instead of skipping it", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await answerWithKnownCards(page);
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await cutWithClick(page);

        // Card 4 is the rarest kind, which stays face down the longest.
        const next = page.getByRole("button", {name: "Następna karta"});
        for (let number = 1; number <= 3; number++) {
            await expect(cardCounter(page)).toHaveText(`Karta ${number} z 5`);
            await faceUp(page).waitFor();
            await next.click();
        }
        await expect(cardCounter(page)).toHaveText("Karta 4 z 5");
        await expect(faceUp(page)).toHaveCount(0);

        await next.click();
        await expect(faceUp(page)).toHaveCount(1);
        await expect(cardCounter(page)).toHaveText("Karta 4 z 5");
    });
});

test.describe("reduced motion", () => {
    test.use({reducedMotion: "reduce"});

    test("the whole ritual works from the keyboard", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await page.getByRole("button", {name: /Otwórz za 150/}).focus();
        await page.keyboard.press("Enter");

        // Focus lands on the pack, so Enter cuts it.
        await expect(pack(page)).toBeFocused();
        await page.keyboard.press("Enter");

        await expect(cardCounter(page)).toHaveText("Karta 1 z 5");
        await expect(page.getByRole("button", {name: "Następna karta"})).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(cardCounter(page)).toHaveText("Karta 2 z 5");
        await page.keyboard.press("ArrowRight");
        await expect(cardCounter(page)).toHaveText("Karta 3 z 5");
        await page.keyboard.press("Space");
        await expect(cardCounter(page)).toHaveText("Karta 4 z 5");
        await page.keyboard.press("Enter");
        await expect(cardCounter(page)).toHaveText("Karta 5 z 5");
        await page.keyboard.press("Enter");

        await expect(page.getByTestId("opened-card")).toHaveCount(5);
    });

    test("skipping goes straight to the summary, and closing early keeps the cards", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await page.getByRole("button", {name: "Pomiń"}).click();
        await expect(page.getByTestId("opened-card")).toHaveCount(5);

        await page.getByRole("button", {name: /Otwórz kolejną za 150/}).click();
        await expect(pack(page)).toBeVisible();
        await page.getByRole("button", {name: "Zamknij"}).click();
        await expect(pack(page)).toBeHidden();

        // Two packs were paid for even though the second one was never opened on screen.
        await page.reload();
        await expect(page.getByText("200", {exact: true}).first()).toBeVisible();
        const packs = (await (await page.request.get("/api/statistics")).json()).packsOpened;
        expect(packs).toBe(2);
    });

    test("another pack is not offered without coins", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await page.getByRole("button", {name: "Pomiń"}).click();
        for (let bought = 0; bought < 2; bought++) {
            await page.getByRole("button", {name: /Otwórz kolejną za 150/}).click();
            await page.getByRole("button", {name: "Pomiń"}).click();
        }
        await expect(page.getByText("Brakuje monet na kolejną paczkę.")).toBeVisible();
        await expect(page.getByRole("button", {name: /Otwórz kolejną/})).toBeHidden();
    });

    test("rare effects, NOWA, LIMIT and the god pack title follow the server's answer", async ({page}, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await answerWithKnownCards(page);
        await page.getByRole("button", {name: /Otwórz za 150/}).click();
        await cutWithClick(page);

        const effects: string[] = [];
        for (let index = 0; index < 5; index++) {
            await expect(cardCounter(page)).toHaveText(`Karta ${index + 1} z 5`);
            effects.push((await page.locator(".reveal-aura").getAttribute("data-effect"))!);
            await page.getByRole("button", {name: /Następna karta|Zobacz wszystkie/}).click();
        }
        expect(effects).toEqual(["none", "glow", "shine", "burst", "burst"]);

        await expect(page.getByRole("heading", {name: "God pack!"})).toBeVisible();
        await expect(page.getByText("NOWA", {exact: true})).toHaveCount(2);
        await expect(page.getByText("LIMIT", {exact: true})).toHaveCount(1);
        await expect(page.getByText(/LIMIT: masz już 9/)).toBeVisible();

        await page.getByRole("button", {name: "Podgląd karty Dziesiata"}).click();
        await expect(page.getByRole("dialog", {name: "Dziesiata"}).getByText("9 z 9")).toBeVisible();
        await expect(page.getByText(/więc ten nie trafił do kolekcji/).first()).toBeVisible();
    });
});

test.describe("on a 360 px touch screen", () => {
    test.use({viewport: {width: 360, height: 640}, hasTouch: true});

    /** A real touch drag: mouse events would not show whether the browser keeps the gesture for scrolling. */
    async function touchDrag(page: Page, from: {x: number; y: number}, to: {x: number; y: number}) {
        const touch = await page.context().newCDPSession(page);
        await touch.send("Input.dispatchTouchEvent", {type: "touchStart", touchPoints: [from]});
        for (let step = 1; step <= 8; step++) {
            const x = from.x + ((to.x - from.x) * step) / 8;
            const y = from.y + ((to.y - from.y) * step) / 8;
            await touch.send("Input.dispatchTouchEvent", {type: "touchMove", touchPoints: [{x, y}]});
        }
        await touch.send("Input.dispatchTouchEvent", {type: "touchEnd", touchPoints: []});
    }

    test("the pack is cut and the cards are thrown away by touch, with every control on screen", async ({
        page,
    }, testInfo) => {
        await offerCheapestPack(page, testInfo);
        await expect(page.getByRole("button", {name: /Otwórz za 150/})).toBeInViewport({ratio: 1});
        await page.getByRole("button", {name: /Otwórz za 150/}).click();

        await expect(pack(page)).toBeEnabled();
        await expect(pack(page)).toBeInViewport({ratio: 0.9});
        await expect(page.getByText(/Przeciągnij palcem/)).toBeInViewport({ratio: 1});
        const packBox = (await pack(page).boundingBox())!;
        const packY = packBox.y + packBox.height / 2;
        await touchDrag(page, {x: packBox.x + 5, y: packY}, {x: packBox.x + packBox.width - 5, y: packY});

        const card = page.getByTestId("reveal-card");
        for (let number = 1; number <= 5; number++) {
            await expect(cardCounter(page)).toHaveText(`Karta ${number} z 5`);
            await faceUp(page).waitFor();
            await expect(card).toBeInViewport({ratio: 1});
            await expect(page.getByRole("button", {name: /Następna karta|Zobacz wszystkie/})).toBeInViewport({
                ratio: 1,
            });
            const box = (await card.boundingBox())!;
            const x = box.x + box.width / 2;
            const y = box.y + box.height / 2;
            await touchDrag(page, {x, y}, {x: x - 120, y});
        }

        await expect(page.getByTestId("opened-card")).toHaveCount(5);
        await expect(page.getByRole("button", {name: /Otwórz kolejną za 150/})).toBeInViewport({ratio: 1});
        await expect(page.getByRole("button", {name: "Zamknij"}).last()).toBeInViewport({ratio: 1});

        // The summary scrolls, so the last card can be reached and previewed in full.
        await page.getByTestId("opened-card").last().scrollIntoViewIfNeeded();
        await page.getByTestId("opened-card").last().click();
        await expect(page.getByText("Twoje egzemplarze")).toBeInViewport({ratio: 1});
    });
});

test("an owned card in the collection opens the same preview", async ({page}, testInfo) => {
    await offerCheapestPack(page, testInfo);
    await page.getByRole("button", {name: /Otwórz za 150/}).click();
    await page.getByRole("button", {name: "Pomiń"}).click();
    await page.getByRole("button", {name: "Zamknij"}).first().click();

    const owned = (await (await page.request.get("/api/collection/owned")).json()) as {name: string}[];
    const shop = await (await page.request.get("/api/shop")).json();
    const setId = shop.sets.find((set: {tier: number}) => set.tier === 1).id;
    await page.goto(`/collection/${setId}`);

    await page
        .getByRole("button", {name: `Podgląd karty ${owned[0].name}`})
        .first()
        .click();
    await expect(page.getByRole("dialog", {name: owned[0].name}).getByText("Twoje egzemplarze")).toBeVisible();
});
